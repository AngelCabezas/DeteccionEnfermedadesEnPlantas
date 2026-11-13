"""
Pruebas de la API que no requieren los modelos reales.

Ejecutar desde la carpeta backend:
    python -m pytest tests -q
"""

import io
import sys
import os

import numpy as np
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import app as api  # noqa: E402


@pytest.fixture
def client():
    api.app.config["TESTING"] = True
    with api.app.test_client() as c:
        yield c


def _png_bytes() -> bytes:
    import cv2

    img = np.zeros((64, 64, 3), dtype=np.uint8)
    ok, buf = cv2.imencode(".png", img)
    assert ok
    return buf.tobytes()


def test_home_and_health(client):
    assert client.get("/").status_code == 200
    r = client.get("/health")
    assert r.status_code == 200
    assert r.get_json()["status"] == "ok"


def test_missing_file_returns_400(client):
    r = client.post("/banana-disease", data={})
    assert r.status_code == 400
    assert "error" in r.get_json()


def test_wrong_extension_returns_400(client):
    data = {"file": (io.BytesIO(b"hola"), "doc.txt")}
    r = client.post("/rice-disease", data=data, content_type="multipart/form-data")
    assert r.status_code == 400


def test_corrupt_image_returns_400(client):
    data = {"file": (io.BytesIO(b"no soy una imagen"), "foto.png")}
    r = client.post("/rice-disease", data=data, content_type="multipart/form-data")
    assert r.status_code == 400
    assert "leer la imagen" in r.get_json()["error"]


def test_too_large_returns_413(client):
    big = io.BytesIO(b"0" * (api.MAX_UPLOAD_MB * 1024 * 1024 + 1))
    r = client.post("/banana-disease", data={"file": (big, "foto.png")}, content_type="multipart/form-data")
    assert r.status_code == 413


def test_unknown_route_is_json(client):
    r = client.get("/no-existe")
    assert r.status_code == 404
    assert "error" in r.get_json()


def test_rice_prediction_with_fake_model(client, monkeypatch):
    class FakeModel:
        def predict_proba(self, x):
            return np.array([[0.1, 0.2, 0.7]])

    monkeypatch.setitem(api._models, "rice", FakeModel())
    r = client.post("/rice-disease", data={"file": (io.BytesIO(_png_bytes()), "hoja.png")},
                    content_type="multipart/form-data")
    assert r.status_code == 200
    body = r.get_json()
    assert body["prediction"] == "Tizon"
    assert body["label"] == "Tizón del arroz"
    assert body["confidence"] == pytest.approx(0.7)
    assert body["severity"] == "disease"


def test_missing_model_returns_503(client, monkeypatch):
    monkeypatch.setattr(api, "COFFEE_MODEL_TFLITE", "/no/existe.tflite")
    monkeypatch.setattr(api, "COFFEE_MODEL_H5", "/no/existe.h5")
    api._models.pop("coffee", None)
    r = client.post("/coffee-disease", data={"file": (io.BytesIO(_png_bytes()), "hoja.png")},
                    content_type="multipart/form-data")
    assert r.status_code == 503

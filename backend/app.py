"""
API de detección de enfermedades en plantas (banano, arroz y café).

Expone un endpoint por cultivo que recibe una imagen (multipart/form-data, campo
`file`) y devuelve la clase predicha con etiqueta legible, descripción, severidad
y confianza. Los modelos se cargan bajo demanda una sola vez y se mantienen en
memoria; la entrada se valida (formato, tamaño, decodificación) y los errores se
devuelven siempre en JSON.

Configuración por variables de entorno: ver .env.example.
"""

import io
import logging
import os
import threading
from collections.abc import Callable
from typing import Any

import cv2
import joblib
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from PIL import Image, UnidentifiedImageError
from werkzeug.exceptions import HTTPException, RequestEntityTooLarge, TooManyRequests
from werkzeug.middleware.proxy_fix import ProxyFix

# ---------------------------------------------------------------------------
# 1. CONFIGURACIÓN
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("plantas-api")

API_VERSION = "1.0.0"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "modelos")

MAX_UPLOAD_MB = int(os.environ.get("MAX_UPLOAD_MB", "10"))
# Límite de píxeles decodificados: evita "bombas de descompresión" (un PNG de pocos KB
# que al abrirse ocupa gigabytes). 25 MP cubre cualquier foto de móvil actual.
MAX_IMAGE_PIXELS = int(os.environ.get("MAX_IMAGE_PIXELS", str(25_000_000)))
ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp"}
# Formatos reales (por contenido, no por extensión) que se pasan al decodificador.
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
# Peticiones por IP a los endpoints de predicción (la inferencia es costosa).
RATE_LIMIT = os.environ.get("RATE_LIMIT", "30 per minute")

Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_MB * 1024 * 1024
# Solo esperamos un archivo por petición: acota el trabajo del parser multipart.
app.config["MAX_FORM_PARTS"] = 10

# Detrás de un proxy inverso (Render, Nginx) la IP real llega en X-Forwarded-For.
# Sin esto el límite de peticiones se aplicaría a la IP del proxy, es decir, a todos.
if os.environ.get("TRUST_PROXY", "1") == "1":
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)  # type: ignore[method-assign]

# En producción conviene restringir los orígenes:
#   ALLOWED_ORIGINS="https://mi-frontend.web.app,https://otro-dominio.com"
allowed_origins = os.environ.get("ALLOWED_ORIGINS", "*")
CORS(
    app,
    origins=[o.strip() for o in allowed_origins.split(",")] if allowed_origins != "*" else "*",
    methods=["GET", "POST", "OPTIONS"],
    max_age=600,
)

limiter = Limiter(
    get_remote_address,
    app=app,
    storage_uri="memory://",
    headers_enabled=True,
    enabled=os.environ.get("RATE_LIMIT_ENABLED", "1") == "1",
)


@app.after_request
def security_headers(response):
    """Cabeceras defensivas para una API JSON: nada se cachea ni se interpreta como HTML."""
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Cache-Control", "no-store")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
    return response


# ---------------------------------------------------------------------------
# 2. CATÁLOGO DE CULTIVOS Y CLASES
#    Cada clase tiene una etiqueta legible y una descripción breve que el
#    frontend muestra al usuario (heurística de Nielsen: lenguaje del usuario).
# ---------------------------------------------------------------------------
CLASS_INFO: dict[str, dict[str, dict[str, str]]] = {
    "banana": {
        "cordana": {
            "label": "Mancha de Cordana",
            "description": "Hongo Cordana musae. Produce manchas ovaladas pardas con halo amarillo en las hojas.",
            "severity": "disease",
        },
        "healthy": {
            "label": "Hoja saludable",
            "description": "No se detectan signos de enfermedad en la hoja analizada.",
            "severity": "healthy",
        },
        "pestalotiopsis": {
            "label": "Pestalotiopsis",
            "description": "Hongo que causa manchas necróticas irregulares, normalmente desde los bordes de la hoja.",
            "severity": "disease",
        },
        "sigatoka": {
            "label": "Sigatoka",
            "description": "Enfermedad fúngica grave que forma estrías y manchas oscuras que reducen la fotosíntesis.",
            "severity": "disease",
        },
    },
    "rice": {
        "Saludable": {
            "label": "Hoja saludable",
            "description": "No se detectan signos de enfermedad en la hoja analizada.",
            "severity": "healthy",
        },
        "ManchaMarron": {
            "label": "Mancha marrón",
            "description": "Hongo Bipolaris oryzae. Manchas ovaladas de color marrón con centro gris.",
            "severity": "disease",
        },
        "Tizon": {
            "label": "Tizón del arroz",
            "description": "Hongo Magnaporthe oryzae. Lesiones en forma de rombo con centro claro y borde oscuro.",
            "severity": "disease",
        },
    },
    "coffee": {
        "healthy": {
            "label": "Hoja saludable",
            "description": "No se detectan signos de enfermedad en la hoja analizada.",
            "severity": "healthy",
        },
        "miner": {
            "label": "Minador de la hoja",
            "description": "Larva de Leucoptera coffeella. Galerías y manchas secas de forma irregular.",
            "severity": "pest",
        },
        "rust": {
            "label": "Roya del café",
            "description": "Hongo Hemileia vastatrix. Manchas amarillo-anaranjadas pulverulentas en el envés.",
            "severity": "disease",
        },
    },
}

BANANA_CLASSES = ["cordana", "healthy", "pestalotiopsis", "sigatoka"]
RICE_CLASSES = ["Saludable", "ManchaMarron", "Tizon"]
COFFEE_CLASSES = ["healthy", "miner", "rust"]

BANANA_MODEL = os.path.join(MODELS_DIR, "banana_leaf_disease_model.tflite")
RICE_MODEL = os.path.join(MODELS_DIR, "arroz_modelo.pkl")
# Se prefiere el .tflite (más ligero y rápido). Si no existe, se usa el .h5.
# Para generar el .tflite: python scripts/convert_to_tflite.py
COFFEE_MODEL_TFLITE = os.path.join(MODELS_DIR, "coffee_leaf_disease_model.tflite")
COFFEE_MODEL_H5 = os.path.join(MODELS_DIR, "coffee_leaf_disease_model.h5")

RICE_INPUT_SIZE = (100, 100)
CNN_INPUT_SIZE = (224, 224)

# ---------------------------------------------------------------------------
# 3. CARGA PEREZOSA CON CACHÉ (thread-safe)
# ---------------------------------------------------------------------------
_models: dict[str, Any] = {}
_models_lock = threading.Lock()


def _get_model(key: str, loader: Callable[[], Any]) -> Any:
    """Devuelve el modelo `key`, cargándolo una única vez."""
    model = _models.get(key)
    if model is not None:
        return model
    with _models_lock:
        model = _models.get(key)
        if model is None:
            log.info("Cargando modelo '%s'...", key)
            model = loader()
            _models[key] = model
            log.info("Modelo '%s' listo.", key)
    return model


def _tflite_interpreter_class():
    """Prefiere el runtime ligero (ai-edge-litert, ~50 MB) sobre TensorFlow completo (~500 MB)."""
    try:
        from ai_edge_litert.interpreter import Interpreter  # type: ignore

        return Interpreter
    except ImportError:
        import tensorflow as tf  # import diferido: TF tarda varios segundos en importarse

        return tf.lite.Interpreter


def _load_tflite(path: str):
    if not os.path.exists(path):
        raise FileNotFoundError(path)
    interpreter = _tflite_interpreter_class()(model_path=path)
    interpreter.allocate_tensors()
    return interpreter


def _load_coffee():
    if os.path.exists(COFFEE_MODEL_TFLITE):
        return ("tflite", _load_tflite(COFFEE_MODEL_TFLITE))
    if not os.path.exists(COFFEE_MODEL_H5):
        raise FileNotFoundError(COFFEE_MODEL_H5)
    import tensorflow as tf

    return ("keras", tf.keras.models.load_model(COFFEE_MODEL_H5, compile=False))


def _tflite_predict(interpreter, img_array: np.ndarray) -> np.ndarray:
    # El intérprete no es thread-safe: serializamos las inferencias.
    with _models_lock:
        inp = interpreter.get_input_details()[0]
        out = interpreter.get_output_details()[0]
        interpreter.set_tensor(inp["index"], img_array)
        interpreter.invoke()
        return interpreter.get_tensor(out["index"])


# ---------------------------------------------------------------------------
# 4. VALIDACIÓN Y PREPROCESAMIENTO
# ---------------------------------------------------------------------------
class InvalidImage(ValueError):
    """La petición no contiene una imagen válida."""


def _read_upload() -> bytes:
    if "file" not in request.files:
        raise InvalidImage("No se envió ningún archivo. Usa el campo 'file'.")
    file = request.files["file"]
    if not file.filename:
        raise InvalidImage("No se seleccionó ningún archivo.")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXT and (file.mimetype or "") not in ALLOWED_MIME:
        raise InvalidImage("Formato no admitido. Sube una imagen JPG, PNG o WEBP.")

    data = file.read()
    if not data:
        raise InvalidImage("El archivo está vacío.")
    _check_image(data)
    return data


def _check_image(data: bytes) -> None:
    """
    Inspecciona la cabecera (sin decodificar los píxeles) para comprobar que el
    contenido es realmente JPEG/PNG/WEBP y que su tamaño en píxeles es razonable.
    Así el decodificador completo solo recibe formatos esperados y acotados.
    """
    try:
        with Image.open(io.BytesIO(data)) as im:
            fmt, (width, height) = im.format, im.size
    except Image.DecompressionBombError as exc:
        raise InvalidImage("La imagen tiene demasiados píxeles. Usa una foto de menor resolución.") from exc
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise InvalidImage("No se pudo leer la imagen. Verifica que el archivo no esté dañado.") from exc
    if fmt not in ALLOWED_FORMATS:
        raise InvalidImage("Formato no admitido. Sube una imagen JPG, PNG o WEBP.")
    if width * height > MAX_IMAGE_PIXELS:
        raise InvalidImage(f"La imagen es demasiado grande ({width}×{height} px). Usa una foto de menor resolución.")


def _decode(img_bytes: bytes) -> np.ndarray:
    img = cv2.imdecode(np.frombuffer(img_bytes, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise InvalidImage("No se pudo leer la imagen. Verifica que el archivo no esté dañado.")
    return img


def preprocess_cnn(img_bytes: bytes) -> np.ndarray:
    """224x224, normalizado a [0,1], batch de 1 (banano y café)."""
    img = cv2.resize(_decode(img_bytes), CNN_INPUT_SIZE)
    img = img.astype(np.float32) / 255.0
    return np.expand_dims(img, axis=0)


def preprocess_rice(img_bytes: bytes) -> np.ndarray:
    """100x100, normalizado, desenfoque gaussiano y aplanado (modelo sklearn)."""
    img = cv2.resize(_decode(img_bytes), RICE_INPUT_SIZE)
    img = img / 255.0
    img = cv2.GaussianBlur(img, (5, 5), 0)
    return img.flatten()


def _build_response(crop: str, class_key: str, confidence: float | None) -> dict[str, Any]:
    info = CLASS_INFO[crop][class_key]
    return {
        "prediction": class_key,  # compatibilidad con el frontend anterior
        "crop": crop,
        "label": info["label"],
        "description": info["description"],
        "severity": info["severity"],
        "confidence": round(float(confidence), 4) if confidence is not None else None,
    }


# ---------------------------------------------------------------------------
# 5. RUTAS
# ---------------------------------------------------------------------------
@app.get("/")
def home():
    return jsonify(
        {
            "name": "Plant Disease Detector API",
            "version": API_VERSION,
            "endpoints": ["/banana-disease", "/rice-disease", "/coffee-disease", "/health"],
        }
    )


@app.get("/health")
def health():
    return jsonify(
        {
            "status": "ok",
            "version": API_VERSION,
            "models_loaded": sorted(_models.keys()),
            "models_available": {
                "banana": os.path.exists(BANANA_MODEL),
                "rice": os.path.exists(RICE_MODEL),
                "coffee": os.path.exists(COFFEE_MODEL_TFLITE) or os.path.exists(COFFEE_MODEL_H5),
            },
        }
    )


@app.post("/banana-disease")
@limiter.limit(RATE_LIMIT)
def banana_disease():
    img_array = preprocess_cnn(_read_upload())
    interpreter = _get_model("banana", lambda: _load_tflite(BANANA_MODEL))
    probs = _tflite_predict(interpreter, img_array)[0]
    idx = int(np.argmax(probs))
    return jsonify(_build_response("banana", BANANA_CLASSES[idx], probs[idx]))


@app.post("/rice-disease")
@limiter.limit(RATE_LIMIT)
def rice_disease():
    img_array = preprocess_rice(_read_upload())
    model = _get_model("rice", lambda: joblib.load(RICE_MODEL))
    confidence = None
    if hasattr(model, "predict_proba"):
        probs = model.predict_proba([img_array])[0]
        idx = int(np.argmax(probs))
        confidence = probs[idx]
    else:
        idx = int(model.predict([img_array])[0])
    return jsonify(_build_response("rice", RICE_CLASSES[idx], confidence))


@app.post("/coffee-disease")
@limiter.limit(RATE_LIMIT)
def coffee_disease():
    img_array = preprocess_cnn(_read_upload())
    kind, model = _get_model("coffee", _load_coffee)
    if kind == "tflite":
        probs = _tflite_predict(model, img_array)[0]
    else:
        probs = model.predict(img_array, verbose=0)[0]
    idx = int(np.argmax(probs))
    return jsonify(_build_response("coffee", COFFEE_CLASSES[idx], probs[idx]))


# ---------------------------------------------------------------------------
# 6. MANEJO DE ERRORES (siempre JSON)
# ---------------------------------------------------------------------------
@app.errorhandler(InvalidImage)
def handle_invalid_image(err: InvalidImage):
    return jsonify({"error": str(err)}), 400


@app.errorhandler(RequestEntityTooLarge)
def handle_too_large(_err):
    return jsonify({"error": f"La imagen supera el tamaño máximo de {MAX_UPLOAD_MB} MB."}), 413


@app.errorhandler(TooManyRequests)
def handle_rate_limit(_err):
    return jsonify({"error": "Has hecho demasiadas peticiones seguidas. Espera un minuto e inténtalo de nuevo."}), 429


@app.errorhandler(FileNotFoundError)
def handle_missing_model(err: FileNotFoundError):
    log.error("Modelo no encontrado: %s", err)
    return jsonify({"error": "El modelo para este cultivo no está disponible en el servidor."}), 503


@app.errorhandler(HTTPException)
def handle_http(err: HTTPException):
    return jsonify({"error": err.description}), err.code


@app.errorhandler(Exception)
def handle_unexpected(err: Exception):
    log.exception("Error inesperado")
    return jsonify({"error": "Ocurrió un error interno al procesar la imagen."}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_DEBUG") == "1")

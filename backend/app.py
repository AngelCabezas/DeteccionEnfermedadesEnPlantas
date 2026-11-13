"""
API de detección de enfermedades en plantas (banano, arroz y café).

Mejoras respecto a la versión anterior:
- Los modelos se cargan una sola vez (bajo demanda) y se mantienen en memoria.
  Antes se cargaban y destruían en cada petición, lo que hacía cada diagnóstico
  varios segundos más lento sin reducir realmente la memoria del proceso.
- Validación de entrada: tipo de archivo, tamaño máximo e imagen decodificable.
  Un archivo inválido devuelve 400 con un mensaje claro en vez de un 500.
- La ruta de café está habilitada. Si el modelo no puede cargarse, la API
  responde 503 con una explicación en lugar de 404.
- Respuesta enriquecida: etiqueta legible en español, confianza y descripción,
  manteniendo la clave `prediction` por compatibilidad con el frontend antiguo.
- Errores siempre en JSON, CORS configurable por variable de entorno,
  endpoint /health para monitoreo y debug desactivado por defecto.
"""

import logging
import os
import threading
from typing import Any, Callable

import cv2
import joblib
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.exceptions import HTTPException, RequestEntityTooLarge

# ---------------------------------------------------------------------------
# 1. CONFIGURACIÓN
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("plantas-api")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "modelos")

MAX_UPLOAD_MB = int(os.environ.get("MAX_UPLOAD_MB", "10"))
ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp"}

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_MB * 1024 * 1024

# En producción conviene restringir los orígenes:
#   ALLOWED_ORIGINS="https://mi-frontend.web.app,https://otro-dominio.com"
allowed_origins = os.environ.get("ALLOWED_ORIGINS", "*")
CORS(app, origins=[o.strip() for o in allowed_origins.split(",")] if allowed_origins != "*" else "*")

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
    return data


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
            "mensaje": "API de detección de enfermedades en plantas funcionando.",
            "endpoints": ["/banana-disease", "/rice-disease", "/coffee-disease", "/health"],
        }
    )


@app.get("/health")
def health():
    return jsonify(
        {
            "status": "ok",
            "models_loaded": sorted(_models.keys()),
            "coffee_model_available": os.path.exists(COFFEE_MODEL_TFLITE) or os.path.exists(COFFEE_MODEL_H5),
        }
    )


@app.post("/banana-disease")
def banana_disease():
    img_array = preprocess_cnn(_read_upload())
    interpreter = _get_model("banana", lambda: _load_tflite(BANANA_MODEL))
    probs = _tflite_predict(interpreter, img_array)[0]
    idx = int(np.argmax(probs))
    return jsonify(_build_response("banana", BANANA_CLASSES[idx], probs[idx]))


@app.post("/rice-disease")
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

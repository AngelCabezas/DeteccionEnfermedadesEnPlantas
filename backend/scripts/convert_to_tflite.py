"""
Convierte un modelo Keras (.h5) a TensorFlow Lite (.tflite).

Los modelos CNN se sirven en formato TFLite: ocupan menos en disco y en RAM, arrancan
más rápido y permiten usar el runtime ligero `ai-edge-litert` en lugar de TensorFlow
completo. Este script hace la conversión y comprueba que el modelo convertido devuelve
las mismas predicciones que el original.

Uso (desde la carpeta backend, con tensorflow instalado: requirements-dev.txt):
    python scripts/convert_to_tflite.py coffee
    python scripts/convert_to_tflite.py banana
    python scripts/convert_to_tflite.py ruta/a/modelo.h5 [ruta/salida.tflite]

Opciones:
    --no-quantize   Desactiva la cuantización dinámica (archivo ~4x más grande).
"""

import argparse
import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "modelos")

KNOWN_MODELS = {
    "banana": "banana_leaf_disease_model",
    "coffee": "coffee_leaf_disease_model",
}


def resolve_paths(target: str, output: str | None) -> tuple[str, str]:
    if target in KNOWN_MODELS:
        stem = os.path.join(MODELS_DIR, KNOWN_MODELS[target])
        return f"{stem}.h5", output or f"{stem}.tflite"
    src = os.path.abspath(target)
    return src, output or os.path.splitext(src)[0] + ".tflite"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("model", help="'banana', 'coffee' o ruta a un archivo .h5")
    parser.add_argument("output", nargs="?", help="ruta del .tflite resultante (opcional)")
    parser.add_argument("--no-quantize", action="store_true", help="no aplicar cuantización dinámica")
    args = parser.parse_args()

    src, dst = resolve_paths(args.model, args.output)
    if not os.path.exists(src):
        print(f"No se encontró {src}. ¿Descargaste los archivos de Git LFS? (git lfs pull)")
        return 1

    import numpy as np
    import tensorflow as tf

    print(f"Cargando {src} ...")
    model = tf.keras.models.load_model(src, compile=False)

    print("Convirtiendo a TFLite ...")
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    if not args.no_quantize:
        # Cuantización dinámica: reduce el tamaño ~4x con pérdida de precisión mínima.
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
    tflite_model = converter.convert()

    with open(dst, "wb") as f:
        f.write(tflite_model)
    print(f"Guardado: {dst} ({os.path.getsize(dst) / 1e6:.1f} MB)")

    # Verificación: mismas clases predichas que el modelo original sobre entradas aleatorias.
    interpreter = tf.lite.Interpreter(model_path=dst)
    interpreter.allocate_tensors()
    inp = interpreter.get_input_details()[0]
    out = interpreter.get_output_details()[0]
    rng = np.random.default_rng(0)
    mismatches = 0
    for _ in range(5):
        x = rng.random(inp["shape"], dtype=np.float32)
        interpreter.set_tensor(inp["index"], x)
        interpreter.invoke()
        a = model.predict(x, verbose=0)[0]
        b = interpreter.get_tensor(out["index"])[0]
        mismatches += int(np.argmax(a) != np.argmax(b))
    print("Verificación:", "OK, mismas predicciones." if mismatches == 0 else f"{mismatches}/5 discrepancias.")
    return 0 if mismatches == 0 else 2


if __name__ == "__main__":
    sys.exit(main())

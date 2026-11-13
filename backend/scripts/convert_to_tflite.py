"""
Convierte el modelo Keras de café (.h5) a TensorFlow Lite (.tflite).

El modelo de banano ya se sirve en formato TFLite: es más ligero en disco y en
RAM, y arranca más rápido en Render. Este script hace lo mismo para el café.

Uso (desde la carpeta backend, con el entorno virtual activado):
    python scripts/convert_to_tflite.py

Resultado: modelos/coffee_leaf_disease_model.tflite
La API usará el .tflite automáticamente si existe.
"""

import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(BASE_DIR, "modelos", "coffee_leaf_disease_model.h5")
DST = os.path.join(BASE_DIR, "modelos", "coffee_leaf_disease_model.tflite")


def main() -> int:
    if not os.path.exists(SRC):
        print(f"No se encontró {SRC}. ¿Descargaste los archivos de Git LFS? (git lfs pull)")
        return 1

    import tensorflow as tf

    print("Cargando modelo Keras...")
    model = tf.keras.models.load_model(SRC, compile=False)
    model.summary()

    print("Convirtiendo a TFLite...")
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    # Cuantización dinámica: reduce el tamaño ~4x con pérdida mínima de precisión.
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    tflite_model = converter.convert()

    with open(DST, "wb") as f:
        f.write(tflite_model)

    print(f"Listo: {DST} ({os.path.getsize(DST) / 1e6:.1f} MB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

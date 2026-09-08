import os
import gc
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import cv2
import numpy as np
from keras.models import load_model

app = Flask(__name__)
CORS(app) # Habilitamos CORS para Angular

# --- 1. CONFIGURACIÓN DE RUTAS SEGURAS ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
banana_model_path = os.path.join(BASE_DIR, 'modelos', 'banana_leaf_disease_model.h5')
rice_model_path = os.path.join(BASE_DIR, 'modelos', 'arroz_modelo.pkl')
# coffee_model_path = os.path.join(BASE_DIR, 'modelos', 'coffee_leaf_disease_model.h5')

banana_classes = ['cordana', 'healthy', 'pestalotiopsis', 'sigatoka']
rice_fixed_size = (100, 100)
rice_classes = ['Saludable', 'ManchaMarron', 'Tizon']
# coffee_classes = ['healthy', 'miner', 'rust']

# --- 2. FUNCIONES DE PREPROCESAMIENTO ---
def preprocess_image_banana(img_bytes, target_size=(224, 224)):
    img = cv2.imdecode(np.frombuffer(img_bytes, np.uint8), cv2.IMREAD_COLOR)
    img = cv2.resize(img, target_size)
    img = img / 255.0
    img = np.expand_dims(img, axis=0)
    return img

def preprocess_image(img_bytes, target_size=rice_fixed_size):
    img = cv2.imdecode(np.frombuffer(img_bytes, np.uint8), cv2.IMREAD_COLOR)
    if img is not None:
        img = cv2.resize(img, target_size)
        img = img / 255.0
        img = cv2.GaussianBlur(img, (5, 5), 0)
        img_array = img.flatten()
        return img_array
    else:
        raise ValueError('No se pudo procesar la imagen.')

# def preprocess_image_coffee(img_bytes, target_size=(224, 224)):
#     img = cv2.imdecode(np.frombuffer(img_bytes, np.uint8), cv2.IMREAD_COLOR)
#     img = cv2.resize(img, target_size)
#     img = img / 255.0
#     img = np.expand_dims(img, axis=0)
#     return img


# --- 3. RUTAS DE LA API ---
@app.route('/', methods=['GET'])
def routeHome():
    return jsonify({"mensaje": "¡API de Inteligencia Artificial conectada y funcionando!"})

@app.route('/banana-disease', methods=['POST'])
def Banana():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file:
        img_bytes = file.read()
        img_array = preprocess_image_banana(img_bytes)
        
        # LAZY LOADING: Cargamos el modelo solo aquí
        banana_model = load_model(banana_model_path)
        
        prediction = banana_model.predict(img_array)
        predicted_class = np.argmax(prediction, axis=1)[0]
        result = banana_classes[predicted_class]
        
        # LIMPIEZA DE MEMORIA RAM
        del banana_model
        gc.collect()
        
        return jsonify({'prediction': result})

@app.route('/rice-disease', methods=['POST'])
def Arroz():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file:
        img_bytes = file.read()
        try:
            img_array = preprocess_image(img_bytes)
        except ValueError as e:
            return jsonify({'error': str(e)}), 400

        # LAZY LOADING: Cargamos el modelo solo aquí
        rice_model = joblib.load(rice_model_path)
        
        prediction = rice_model.predict([img_array])
        result = rice_classes[prediction[0]]
        
        # LIMPIEZA DE MEMORIA RAM
        del rice_model
        gc.collect()
        
        return jsonify({'prediction': result})

# @app.route('/coffee-disease', methods=['POST'])
# def Cafe():
#     if 'file' not in request.files:
#         return jsonify({'error': 'No file part'}), 400
#
#     file = request.files['file']
#     if file.filename == '':
#         return jsonify({'error': 'No selected file'}), 400
#
#     if file:
#         img_bytes = file.read()
#         img_array = preprocess_image_coffee(img_bytes)
#         
#         # LAZY LOADING: Cargamos el modelo solo aquí
#         coffee_model = load_model(coffee_model_path)
#         
#         prediction = coffee_model.predict(img_array)
#         predicted_class = np.argmax(prediction, axis=1)[0]
#         result = coffee_classes[predicted_class]
#         
#         # LIMPIEZA DE MEMORIA RAM
#         del coffee_model
#         gc.collect()
#         
#         return jsonify({'prediction': result})

if __name__ == '__main__':
    app.run(debug=True)
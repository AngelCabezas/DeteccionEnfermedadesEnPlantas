from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import joblib
import cv2
import numpy as np
from keras.models import load_model

# Cargar el modelo de banano al inicio
banana_model_path = 'C:/Cursos/Angular/PlantDiseaseDetector/backend/modelos/banana_leaf_disease_model.h5'
banana_model = load_model(banana_model_path)
banana_classes = ['cordana', 'healthy', 'pestalotiopsis', 'sigatoka']

# Cargar y preprocesar la imagen
def preprocess_image_banana(img_bytes, target_size=(224, 224)):
    img = cv2.imdecode(np.frombuffer(img_bytes, np.uint8), cv2.IMREAD_COLOR)
    img = cv2.resize(img, target_size)  # Redimensionar la imagen
    img = img / 255.0  # Normalizar los pixeles (escala 0 - 1)
    img = np.expand_dims(img, axis=0)  # Añadir la dimensión del batch
    return img

# Cargar el modelo de arroz al inicio
rice_model_path = 'C:/Cursos/Angular/PlantDiseaseDetector/backend/modelos/arroz_modelo.pkl'
rice_model = joblib.load(rice_model_path)
rice_fixed_size = (100, 100)
rice_classes = ['Saludable', 'ManchaMarron', 'Tizon']

# Función para preprocesar la imagen para el modelo de arroz
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

# Cargar el modelo del café al inicio
coffee_model_path = 'C:/Cursos/Angular/PlantDiseaseDetector/backend/modelos/coffee_leaf_disease_model.h5'
coffee_model = load_model(coffee_model_path)
coffee_classes = ['healthy', 'miner', 'rust']

# Cargar y preprocesar la imagen del café
def preprocess_image_coffee(img_bytes, target_size=(224, 224)):
    img = cv2.imdecode(np.frombuffer(img_bytes, np.uint8), cv2.IMREAD_COLOR)
    img = cv2.resize(img, target_size)  # Redimensionar la imagen
    img = img / 255.0  # Normalizar los pixeles (escala 0 - 1)
    img = np.expand_dims(img, axis=0)  # Añadir la dimensión del batch
    return img

app = Flask(__name__)
CORS(app) # Habilitamos CORS para Angular

# 1. Ruta de prueba para saber si el servidor está vivo
@app.route('/', methods=['GET'])
def routeHome():
    return jsonify({"mensaje": "¡API de Inteligencia Artificial conectada y funcionando!"})

# 2. Ruta de la Banana (Solo POST)
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
        prediction = banana_model.predict(img_array)
        predicted_class = np.argmax(prediction, axis=1)[0]
        result = banana_classes[predicted_class]
        return jsonify({'prediction': result})

# 3. Ruta del Arroz (Solo POST)
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

        prediction = rice_model.predict([img_array])
        result = rice_classes[prediction[0]]
        return jsonify({'prediction': result})

# 4. Ruta del Café (Solo POST)
@app.route('/coffee-disease', methods=['POST'])
def Cafe():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file:
        img_bytes = file.read()
        img_array = preprocess_image_coffee(img_bytes)
        prediction = coffee_model.predict(img_array)
        predicted_class = np.argmax(prediction, axis=1)[0]
        result = coffee_classes[predicted_class]
        return jsonify({'prediction': result})

if __name__ == '__main__':
    app.run(debug=True)
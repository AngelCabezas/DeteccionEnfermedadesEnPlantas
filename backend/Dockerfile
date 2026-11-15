# Imagen de producción de la API.
#   docker build -t plant-disease-api .
#   docker run -p 5000:5000 -e ALLOWED_ORIGINS=https://tu-frontend.web.app plant-disease-api
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=5000

WORKDIR /app

# Dependencias primero para aprovechar la caché de capas.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Código y modelos (.tflite / .pkl). Los .h5 se excluyen en .dockerignore.
COPY app.py .
COPY modelos/ modelos/

# La API no necesita privilegios: se ejecuta con un usuario sin permisos de escritura.
RUN addgroup --system app && adduser --system --ingroup app --no-create-home app \
    && chown -R app:app /app
USER app

EXPOSE 5000

# 1 worker: los modelos se cargan una vez en memoria y las inferencias se serializan.
CMD ["sh", "-c", "gunicorn app:app --bind 0.0.0.0:${PORT} --workers 1 --threads 4 --timeout 120"]

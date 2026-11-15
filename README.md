<div align="center">
  <img src="frontend/public/img/logo-horizontal.svg" alt="Plant Disease Detector IA" width="640">

  <br>

  **Diagnóstico de enfermedades foliares en banano, arroz y café a partir de una fotografía.**

  [![CI](https://github.com/AngelCabezas/DeteccionEnfermedadesEnPlantas/actions/workflows/ci.yml/badge.svg)](https://github.com/AngelCabezas/DeteccionEnfermedadesEnPlantas/actions/workflows/ci.yml)
  ![Angular 21](https://img.shields.io/badge/Angular-21-dd0031?logo=angular&logoColor=white)
  ![Python 3.12](https://img.shields.io/badge/Python-3.12-3776ab?logo=python&logoColor=white)
  ![Flask](https://img.shields.io/badge/Flask-3-000000?logo=flask&logoColor=white)
  ![TensorFlow Lite](https://img.shields.io/badge/TensorFlow%20Lite-runtime-ff6f00?logo=tensorflow&logoColor=white)
  [![Licencia MIT](https://img.shields.io/badge/Licencia-MIT-green.svg)](LICENSE)

  [API en producción](https://api-plantas-ia.onrender.com/health) · [Historial de cambios](CHANGELOG.md)
</div>

---

## Índice

1. [Qué hace](#qué-hace)
2. [Arquitectura](#arquitectura)
3. [Puesta en marcha](#puesta-en-marcha)
4. [API](#api)
5. [Pruebas y calidad](#pruebas-y-calidad)
6. [Despliegue](#despliegue)
7. [Estructura del repositorio](#estructura-del-repositorio)
8. [Diseño y accesibilidad](#diseño-y-accesibilidad)
9. [Hoja de ruta](#hoja-de-ruta)
10. [Licencia](#licencia)

## Qué hace

El usuario elige un cultivo, sube una foto de la hoja y recibe en segundos el nombre de la
enfermedad (o «hoja saludable»), una descripción breve y la confianza del modelo.

| Cultivo | Clases que reconoce | Modelo |
|---------|---------------------|--------|
| Banano  | Sigatoka, mancha de Cordana, Pestalotiopsis, hoja saludable | CNN 224×224 · TFLite |
| Arroz   | Tizón del arroz, mancha marrón, hoja saludable | SVM (scikit-learn) 100×100 |
| Café    | Roya del café, minador de la hoja, hoja saludable | CNN 224×224 · TFLite |

> El resultado es una ayuda para la observación en campo; no sustituye la evaluación de un
> profesional agrónomo ni un análisis de laboratorio.

## Arquitectura

```
┌──────────────────────┐   multipart/form-data   ┌──────────────────────────┐
│  Frontend (Angular)  │ ──────────────────────▶ │  API (Flask + gunicorn)  │
│  Firebase Hosting    │ ◀────────────────────── │  Render                  │
│  Firebase Auth       │        JSON             │  TFLite · scikit-learn   │
└──────────────────────┘                         └──────────────────────────┘
```

- **Frontend:** Angular 21 *zoneless* con signals, rutas con carga perezosa, un único componente
  `Detector` configurado desde el catálogo `core/crops.ts`, y un sistema de diseño propio en
  `styles.css` (sin frameworks CSS externos). Autenticación con Firebase.
- **Backend:** Flask. Los modelos se cargan bajo demanda una sola vez y se mantienen en memoria.
  Los modelos CNN se sirven en formato TensorFlow Lite con el runtime ligero `ai-edge-litert`
  (~50 MB frente a ~500 MB de TensorFlow completo), lo que permite correr en el plan gratuito de Render.
- **Modelos:** los archivos originales `.h5` y `.pkl` se versionan con Git LFS; los `.tflite`
  (más pequeños) van directamente en el repositorio.

## Puesta en marcha

### Requisitos

- Node.js 22+ y npm 11+
- Python 3.12
- Git LFS (`git lfs install`) para descargar el modelo de arroz

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt                     # + requirements-dev.txt para pruebas/lint
git lfs pull                                        # descarga arroz_modelo.pkl
python app.py                                       # http://localhost:5000
```

| Variable          | Por defecto | Descripción                                               |
|-------------------|-------------|-----------------------------------------------------------|
| `PORT`            | `5000`      | Puerto HTTP (Render lo inyecta).                          |
| `ALLOWED_ORIGINS` | `*`         | Orígenes CORS separados por coma. Restríngelo en producción. |
| `MAX_UPLOAD_MB`   | `10`        | Tamaño máximo de imagen. Debe coincidir con el frontend.  |
| `MAX_IMAGE_PIXELS` | `25000000` | Máximo de píxeles (ancho × alto) aceptados al decodificar. |
| `RATE_LIMIT`      | `30 per minute` | Peticiones de predicción por IP (Flask-Limiter).      |
| `RATE_LIMIT_ENABLED` | `1`      | `0` desactiva el límite (solo para desarrollo).           |
| `TRUST_PROXY`     | `1`         | Lee la IP real de `X-Forwarded-For` detrás de Render/Nginx. |
| `FLASK_DEBUG`     | `0`         | `1` activa el modo debug. Nunca en producción.            |

Plantilla en [`backend/.env.example`](backend/.env.example).

### Frontend

```bash
cd frontend
npm install
npm start            # http://localhost:4200 → backend local (environment.development.ts)
npm run build        # producción → API en Render (environment.ts)
```

## API

| Método | Ruta              | Cuerpo                        | Respuesta                                   |
|--------|-------------------|-------------------------------|---------------------------------------------|
| GET    | `/health`         | –                             | Estado, versión y modelos disponibles/cargados. |
| POST   | `/banana-disease` | `multipart/form-data`, `file` | Predicción (ver abajo).                     |
| POST   | `/rice-disease`   | ídem                          |                                             |
| POST   | `/coffee-disease` | ídem                          |                                             |

```json
{
  "prediction": "sigatoka",
  "crop": "banana",
  "label": "Sigatoka",
  "description": "Enfermedad fúngica grave que forma estrías y manchas oscuras…",
  "severity": "disease",
  "confidence": 0.93
}
```

Formatos admitidos: JPG, PNG y WEBP. Errores siempre en JSON:

| Código | Motivo |
|--------|--------|
| `400`  | Falta el archivo, formato no admitido o imagen ilegible. |
| `413`  | La imagen supera `MAX_UPLOAD_MB`. |
| `503`  | El modelo del cultivo no está disponible en el servidor. |

Ejemplo:

```bash
curl -F "file=@hoja.jpg" https://api-plantas-ia.onrender.com/banana-disease
```

## Pruebas y calidad

| Qué | Comando | Notas |
|-----|---------|-------|
| Backend: pruebas | `cd backend && python -m pytest` | No necesitan los modelos reales. |
| Backend: lint y formato | `ruff check . && ruff format --check .` | Configuración en `pyproject.toml`. |
| Frontend: pruebas | `cd frontend && npm run test:ci` | Vitest + jsdom. |
| Frontend: formato | `npm run format:check` | Prettier. |
| Frontend: build | `npm run build` | Presupuesto inicial < 500 kB. |
| Backend: auditoría de dependencias | `pip-audit -r requirements.txt` | Falla si hay CVE conocidas. |
| Frontend: auditoría de dependencias | `npm audit --omit=dev --audit-level=high` | Solo dependencias que llegan al navegador. |

La integración continua ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) ejecuta todo lo
anterior en cada *push* a `main` y en cada *pull request*.

### Convertir un modelo Keras a TFLite

```bash
cd backend
pip install -r requirements-dev.txt
python scripts/convert_to_tflite.py coffee     # o banana, o la ruta a un .h5
```

El script aplica cuantización dinámica (≈4× menos tamaño) y verifica que el modelo convertido
devuelve las mismas clases que el original.

## Despliegue

**Backend en Render** (servicio web, directorio raíz `backend`):

```
Build:  pip install -r requirements.txt
Start:  gunicorn app:app --workers 1 --threads 4 --timeout 120
```

Define `ALLOWED_ORIGINS` con el dominio real del frontend. También hay un
[`Dockerfile`](backend/Dockerfile) listo para cualquier proveedor que acepte contenedores.

**Frontend en Firebase Hosting:** `npm run build` y despliega `dist/frontend/browser`.
Restringe la clave de Firebase por dominio en Google Cloud Console → Credenciales.

### Seguridad

Medidas incluidas y qué cubre cada una:

| Riesgo | Medida |
|--------|--------|
| Archivos disfrazados de imagen | Se inspecciona la cabecera con Pillow: solo JPEG, PNG y WEBP reales llegan al decodificador, sin importar la extensión. |
| Bombas de descompresión (imágenes de pocos KB con miles de millones de píxeles) | `MAX_IMAGE_PIXELS` rechaza la imagen antes de decodificarla; `MAX_CONTENT_LENGTH` limita el cuerpo. |
| Abuso de la inferencia (costosa en CPU) | Límite de peticiones por IP con Flask-Limiter (`RATE_LIMIT`), respuesta 429 en JSON. |
| Respuestas cacheadas o interpretadas como HTML | Cabeceras `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, CSP `default-src 'none'`. |
| Redirección abierta tras el login | `returnUrl` solo acepta rutas internas. |
| Enlaces externos | `rel="noopener"` en todos los `target="_blank"`; `referrer` limitado a `strict-origin-when-cross-origin`. |
| Contenedor con privilegios | El `Dockerfile` ejecuta gunicorn con un usuario sin privilegios. |
| Dependencias vulnerables | `pip-audit` y `npm audit` en CI; token del workflow con permiso de solo lectura. |

Pendiente del lado de la consola de Firebase (no se puede hacer desde el código): restringir la
clave web por dominio y, si se desea, activar App Check. La clave de Firebase en el frontend es
pública por diseño; lo que protege los datos son las reglas y esas restricciones.

## Estructura del repositorio

```
.
├── backend/
│   ├── app.py                   # API Flask: rutas, validación, carga de modelos
│   ├── modelos/                 # .tflite / .pkl (los .h5 originales van por Git LFS)
│   ├── scripts/convert_to_tflite.py
│   ├── tests/test_api.py
│   ├── requirements.txt         # ejecución
│   ├── requirements-dev.txt     # pytest, ruff, tensorflow (conversión)
│   ├── pyproject.toml           # configuración de pytest y ruff
│   └── Dockerfile
├── frontend/
│   ├── public/                  # favicon, manifest e imágenes optimizadas (WebP)
│   └── src/app/
│       ├── core/                # crops.ts (catálogo), prediction.service.ts, guards/
│       └── components/
│           ├── home/ · login/ · dashboard/ · detector/ · informacion/ · not-found/
│           └── shared/app-header · shared/app-footer
├── .github/workflows/ci.yml
├── CHANGELOG.md
└── LICENSE
```

## Diseño y accesibilidad

La interfaz se diseñó siguiendo las **heurísticas de Nielsen** y la norma **ISO 9241**
(partes 110, 112, 210 y 410) y cumple **WCAG 2.1 AA**: contraste ≥ 4,5:1 en todo el texto,
objetivos táctiles ≥ 44 px, navegación completa por teclado, regiones `aria-live` para los
cambios de estado, enlace «saltar al contenido» y respeto a `prefers-reduced-motion`.
El detalle de cada principio y cómo se aplicó está en el [CHANGELOG](CHANGELOG.md#frontend-ux--heurísticas-de-nielsen-e-iso-9241).

## Hoja de ruta

- [ ] Historial de diagnósticos por usuario (Firestore).
- [ ] Reentrenar el modelo de arroz y exportarlo a un formato sin dependencia de versión de scikit-learn.
- [ ] Modo sin conexión (PWA con caché del *shell* de la aplicación).
- [ ] Pruebas de extremo a extremo (Playwright) del flujo de diagnóstico.

## Licencia

Publicado bajo la licencia [MIT](LICENSE). Proyecto académico desarrollado en la
Escuela Politécnica Nacional (Quito, Ecuador).

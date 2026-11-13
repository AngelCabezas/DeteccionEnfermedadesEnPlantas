# Plant Disease Detector IA

Aplicación web para detectar enfermedades en hojas de **banano, arroz y café** a partir de una fotografía, usando modelos de aprendizaje automático.

- **Frontend:** Angular 21 (zoneless, signals) + Firebase Authentication.
- **Backend:** Flask + TensorFlow Lite / scikit-learn, desplegado en Render.

---

## Puesta en marcha

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
git lfs pull                                       # descarga los modelos (.h5 / .pkl)
python app.py                                      # http://localhost:5000
```

Variables de entorno opcionales:

| Variable          | Por defecto | Descripción                                              |
|-------------------|-------------|----------------------------------------------------------|
| `PORT`            | `5000`      | Puerto HTTP.                                             |
| `ALLOWED_ORIGINS` | `*`         | Orígenes CORS separados por coma (restríngelo en prod.). |
| `MAX_UPLOAD_MB`   | `10`        | Tamaño máximo de imagen.                                 |
| `FLASK_DEBUG`     | –           | `1` para modo debug (nunca en producción).               |

Pruebas: `python -m pytest tests -q` (no necesitan los modelos reales).

Convertir el modelo de café a TFLite (recomendado, más ligero): `python scripts/convert_to_tflite.py`.

### Frontend

```bash
cd frontend
npm install        # requiere npm 11 (npx npm@11 install si tienes npm 10)
npm start          # http://localhost:4200, apunta al backend local
npm run build      # producción, apunta a Render (src/environments/environment.ts)
```

---

## API

| Método | Ruta               | Cuerpo                          | Respuesta                                     |
|--------|--------------------|---------------------------------|-----------------------------------------------|
| GET    | `/health`          | –                               | Estado y modelos cargados.                    |
| POST   | `/banana-disease`  | `multipart/form-data`, `file`   | Ver abajo.                                    |
| POST   | `/rice-disease`    | ídem                            |                                               |
| POST   | `/coffee-disease`  | ídem                            |                                               |

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

Errores siempre en JSON: `400` imagen inválida, `413` demasiado grande, `503` modelo no disponible.

---

## Cambios de esta versión

### Backend

| Antes | Ahora | Por qué |
|-------|-------|---------|
| El modelo se cargaba y destruía en **cada petición** (`del` + `gc.collect()`). | Se carga una vez y se reutiliza (caché con `threading.Lock`). | Cargar el modelo de banano tarda ~4,3 s; la inferencia 0,01 s. Antes cada diagnóstico pagaba los 4 s. |
| Ruta `/coffee-disease` comentada → el frontend recibía 404. | Ruta activa; usa `.tflite` si existe, si no `.h5`. Si falta el modelo responde `503` con mensaje. | El café estaba roto de punta a punta. |
| Un archivo que no era imagen producía un `500`. | Validación de extensión/MIME, tamaño máximo y decodificación → `400`/`413` con texto claro. | Errores comprensibles y sin caídas del servidor. |
| Respuesta: solo `{"prediction": "cordana"}`. | Etiqueta en español, descripción, severidad y confianza. | El usuario no tiene que saber qué es "cordana". |
| `requirements.txt` en UTF-16. | UTF-8. | Compatibilidad con herramientas. |
| `debug=True`, CORS abierto, nombres `Banana()/Arroz()`. | Debug por variable de entorno, CORS configurable, `snake_case`. | Seguridad y convenciones de Python. |
| TensorFlow completo obligatorio. | Si está `ai-edge-litert` se usa (≈10× más ligero). | Menos RAM/arranque en Render. |

### Frontend (estructura)

- `@angular/fire` 20 era incompatible con Angular 21: **`npm install` fallaba** (por eso se borraba el `package-lock.json`). Actualizado a `@angular/fire` 21.
- Los tres componentes `banana`, `arroz` y `cafe` eran copias casi idénticas → un solo componente **`Detector`** configurado desde `core/crops.ts`. Añadir un cultivo es añadir una entrada y una ruta.
- URL de la API centralizada en `environments/` (desarrollo → `localhost:5000`, producción → Render). Corregida la doble barra `//rice-disease`.
- Eliminados Bootstrap y animate.css por CDN (≈230 kB) a favor de un sistema de diseño propio en `styles.css`. Bundle inicial: 466 kB.
- Migración a signals y control de flujo `@if/@for` (la app es zoneless; el `cdr.detectChanges()` manual ya no es necesario).
- `alert()` sustituido por mensajes en la propia interfaz.

### Frontend (UX) — heurísticas de Nielsen e ISO 9241

| Principio | Qué se aplicó |
|-----------|---------------|
| **H1 Visibilidad del estado del sistema** | Indicador de 3 pasos (Elige → Analiza → Resultado), spinner y texto "Analizando…", región `aria-live` que anuncia cambios, enlace activo resaltado en la barra de navegación, botón con estado "Entrando…" al iniciar sesión. |
| **H2 Relación con el mundo real** | Nombres de enfermedades en español con descripción ("Tizón del arroz", no `Tizon`); textos en lenguaje del agricultor; iconografía de "subir imagen". |
| **H3 Control y libertad del usuario** | "Cambiar imagen", "Quitar", "Analizar otra hoja", "Elegir otro cultivo"; migas de pan; botón "Reintentar" tras un error; nada ocurre sin pulsar "Analizar". |
| **H4 Consistencia y estándares** | Una barra de navegación común en todas las páginas; tokens de color, tipografía, espaciado y componentes (`.btn`, `.card`, `.alert`, `.field`) definidos una sola vez; mismas pestañas en Login y Panel. |
| **H5 Prevención de errores** | Validación de tipo y tamaño de imagen **antes** de enviar; botón "Analizar" deshabilitado sin foto; aviso "usa el detector correcto"; validaciones de formulario antes de llamar a Firebase. |
| **H6 Reconocer antes que recordar** | Cada tarjeta lista las enfermedades que detecta; formatos y tamaño máximo visibles en la zona de carga; consejos de foto junto al formulario; vista previa de la imagen seleccionada. |
| **H7 Flexibilidad y eficiencia** | Arrastrar y soltar además del selector de archivo; "Analizar de nuevo" sin volver a elegir; si hay sesión, el inicio lleva directo al panel; navegación completa por teclado. |
| **H8 Diseño estético y minimalista** | Una acción principal por pantalla, jerarquía tipográfica clara, sin fondos con texto encima de imágenes sin capa de contraste, sin `100vh + overflow:hidden` que cortaba contenido. |
| **H9 Ayudar a reconocer y recuperarse de errores** | Mensajes específicos: "La imagen pesa 12,4 MB y el máximo es 10 MB", códigos de Firebase traducidos ("Ya existe una cuenta con ese correo. Inicia sesión."), diferencia entre error de red (reintentable) y error de imagen. |
| **H10 Ayuda y documentación** | Guía de uso en el panel, consejos por cultivo en la página de diagnóstico, nota de alcance de la herramienta junto al resultado. |
| **ISO 9241-110 (principios de diálogo)** | *Adecuación a la tarea*: el flujo es de 3 pasos. *Autodescriptividad*: cada paso explica qué hacer y qué esperar. *Conformidad con expectativas*: pestañas, botones y enlaces se comportan como es habitual. *Tolerancia a errores*: validación previa y recuperación sin perder la foto. *Controlabilidad*: el usuario decide cuándo analizar y puede deshacer. |
| **ISO 9241-112 / WCAG 2.1 AA (presentación)** | Todos los pares texto/fondo ≥ 4,5:1 (verificado por script); tamaño base 16 px; foco visible en claro y oscuro; `prefers-reduced-motion`. |
| **ISO 9241-410 / WCAG 2.5.8 (objetivos táctiles)** | Todos los controles ≥ 44 × 44 px. |
| **ISO 9241-210 (diseño centrado en el usuario)** | Diseño partiendo del contexto de uso real (campo, móvil, conexión irregular): mensajes sobre el "despertar" del servidor gratuito, diseño responsive con menú colapsable, `timeout` de 90 s. |
| **Accesibilidad (WCAG 2.1)** | `lang="es"`, enlace "saltar al contenido", `label` asociado a cada campo, `role="tab/tabpanel"`, `aria-live`, `aria-invalid`, `alt` descriptivos, barra de progreso con `role="progressbar"`, contraste verificado. |

---

## Pendientes sugeridos

- Convertir el modelo de café a TFLite y quitar `tensorflow` de `requirements.txt` (usar `ai-edge-litert`) para reducir el consumo de RAM en Render.
- Restringir la clave de Firebase por dominio (Google Cloud Console → Credenciales).
- Fijar `ALLOWED_ORIGINS` en Render con el dominio real del frontend.
- Volver a generar y versionar `package-lock.json` (con npm 11) para instalaciones reproducibles.

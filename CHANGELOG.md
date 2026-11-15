# Historial de cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [1.0.0] - 2026-11-14

### Añadido

- Logotipo rediseñado en vector (`logo.svg`, `logo-flat.svg`, `logo-horizontal.svg`): hoja con
  nervios en forma de pistas de circuito y arco de «escaneo», en la paleta de la aplicación.
  Favicon, iconos PWA, icono de iOS e imagen social (`og-image.jpg`, 1200×630) generados desde él.
- Pie de página compartido (`app-footer`) con marca, enlaces y atribución institucional.
- Página 404 propia en lugar de redirigir silenciosamente al inicio.
- Carga perezosa de todas las rutas (`loadComponent`): bundle inicial de 466 kB a 390 kB.
- Guard `guestGuard`: quien ya tiene sesión no vuelve a ver la pantalla de acceso.
- `returnUrl`: tras iniciar sesión se vuelve a la página protegida que se intentó abrir.
- Transiciones entre páginas (`withViewTransitions`) que respetan `prefers-reduced-motion`.
- Pantalla de carga inicial, favicon e iconos generados desde el logotipo, `manifest.webmanifest`
  y metadatos Open Graph para compartir enlaces.
- Pruebas unitarias del frontend (Vitest): validación de archivos, llamadas HTTP y catálogo de cultivos.
- Backend: `requirements-dev.txt`, `pyproject.toml` (pytest + ruff), `Dockerfile`, `.env.example`,
  `.python-version` y versión de la API en `/` y `/health`.
- Modelo de café convertido a TFLite (224 MB a 18,7 MB, mismas predicciones que el original).
- Integración continua con GitHub Actions: lint, pruebas y build de ambos proyectos.
- `LICENSE` (MIT), `.editorconfig` y `.gitignore` en la raíz.

### Seguridad

- Flask 3.0.3 → 3.1.3 y Werkzeug 3.0.3 → 3.1.9 (CVE de `safe_join` y agotamiento de recursos en
  multipart). Dependencia transitiva `@grpc/grpc-js` forzada a ≥ 1.14.7 mediante `overrides`.
- Validación de imágenes por contenido (Pillow): solo JPEG/PNG/WEBP reales y con un máximo de
  píxeles (`MAX_IMAGE_PIXELS`), para evitar bombas de descompresión.
- Límite de peticiones por IP en los endpoints de predicción (Flask-Limiter, `RATE_LIMIT`), con
  `ProxyFix` para leer la IP real detrás de Render.
- Cabeceras defensivas en todas las respuestas de la API; `MAX_FORM_PARTS` acotado.
- El contenedor ejecuta la API con un usuario sin privilegios. El workflow de CI usa un token de
  solo lectura y audita dependencias (`pip-audit`, `npm audit`).
- `<meta name="referrer">` en el frontend.

### Cambiado

- Panel de diagnóstico rediseñado como página de un solo recorrido: saludo personalizado con el
  nombre del usuario, cifras resumen, tarjetas con el número de
  enfermedades que reconoce cada modelo, guía de cuatro pasos con consejos de foto y tarjeta
  del desarrollador con pestañas (Perfil, Tecnologías, Contacto), botón «Copiar correo» y
  avatar que gira al pasar el ratón. Las tarjetas de cultivo se superponen a la cabecera y son
  pulsables en toda su superficie. Se retiraron las pestañas «Acerca» y «Desarrollador»
  (contenido duplicado) y la imagen `header-panel.webp`.
- Revisión UI/UX: cifras de «Sobre el proyecto» calculadas desde el catálogo (7 enfermedades,
  no 8) y tiempo coherente con el panel; el pie muestra «Diagnóstico» en vez de «Acceder» con
  sesión iniciada; la cabecera oculta «Iniciar sesión» en la propia página de acceso; hover de
  los botones fantasma visible también sobre fondo claro; objetivos táctiles de 36–44 px en
  «Mostrar» contraseña, «¿La olvidaste?», pestañas y «Copiar»; token `--color-track` para las
  barras de confianza; etiqueta «Hoja saludable» en verde también en la portada.
- Pestañas de acceso con estado activo en verde sólido y etiqueta del modo sobre el título
  («Iniciar sesión», «Nueva cuenta», «Recuperar contraseña»).
- Pantalla de acceso rediseñada en dos paneles: marca con beneficios y ejemplo de resultado a la
  izquierda, formulario a la derecha. Nueva opción «¿La olvidaste?» que envía el correo de
  recuperación de contraseña de Firebase. Se retiró el fondo azul `fondoLogin.png`.
- Portada rediseñada: hero en dos columnas con una demostración animada del diagnóstico
  (línea de escaneo y barra de confianza), tarjetas grandes por cultivo que enlazan directamente
  al detector, pasos con iconos y sección de ventajas. Se retiró el fondo generado `fondoInicio.png`.
- Página «Sobre el proyecto» rediseñada: hero con collage de cultivos y cifras clave, sección
  «El reto», misión y enfoque con una maqueta del resultado, flujo técnico y pila tecnológica,
  línea de tiempo, preguntas frecuentes, tarjeta del desarrollador y llamada a la acción.
- Marca visible como «Plant Disease Detector IA» en cabecera, pestañas y títulos (antes «PD-IA»).
- Imágenes optimizadas a WebP con nombres descriptivos: de 9,1 MB a 1,4 MB en total.
- Página de inicio: datos clave en el hero, sección de ventajas y llamada a la acción final.
- `requirements.txt` ya no depende de TensorFlow: usa `ai-edge-litert` (runtime ligero).
- `scripts/convert_to_tflite.py` acepta cualquier modelo (`banana`, `coffee` o una ruta) y verifica la conversión.

### Eliminado

- Siete imágenes sin uso en `frontend/public/img`, el fondo `fonndoNature.jpg` (tenía marca de agua
  de un banco de imágenes) y el script duplicado `backend/convertir.py`.

## [0.9.0] - 2026-11-12

### Backend

| Antes | Ahora | Por qué |
|-------|-------|---------|
| El modelo se cargaba y destruía en **cada petición** (`del` + `gc.collect()`). | Se carga una vez y se reutiliza (caché con `threading.Lock`). | Cargar el modelo de banano tarda ~4,3 s; la inferencia 0,01 s. Antes cada diagnóstico pagaba los 4 s. |
| Ruta `/coffee-disease` comentada → el frontend recibía 404. | Ruta activa; usa `.tflite` si existe, si no `.h5`. Si falta el modelo responde `503` con mensaje. | El café estaba roto de punta a punta. |
| Un archivo que no era imagen producía un `500`. | Validación de extensión/MIME, tamaño máximo y decodificación → `400`/`413` con texto claro. | Errores comprensibles y sin caídas del servidor. |
| Respuesta: solo `{"prediction": "cordana"}`. | Etiqueta en español, descripción, severidad y confianza. | El usuario no tiene que saber qué es "cordana". |
| `requirements.txt` en UTF-16. | UTF-8. | Compatibilidad con herramientas. |
| `debug=True`, CORS abierto, nombres `Banana()/Arroz()`. | Debug por variable de entorno, CORS configurable, `snake_case`. | Seguridad y convenciones de Python. |

### Frontend (estructura)

- `@angular/fire` 20 era incompatible con Angular 21: **`npm install` fallaba**. Actualizado a `@angular/fire` 21.
- Los tres componentes `banana`, `arroz` y `cafe` eran copias casi idénticas → un solo componente **`Detector`** configurado desde `core/crops.ts`.
- URL de la API centralizada en `environments/`. Corregida la doble barra `//rice-disease`.
- Eliminados Bootstrap y animate.css por CDN (≈230 kB) a favor de un sistema de diseño propio en `styles.css`.
- Migración a signals y control de flujo `@if/@for` (la app es zoneless).
- `alert()` sustituido por mensajes en la propia interfaz.

### Frontend (UX) — heurísticas de Nielsen e ISO 9241

| Principio | Qué se aplicó |
|-----------|---------------|
| **H1 Visibilidad del estado del sistema** | Indicador de 3 pasos (Elige → Analiza → Resultado), spinner y texto "Analizando…", región `aria-live`, enlace activo resaltado, botón con estado "Entrando…". |
| **H2 Relación con el mundo real** | Nombres de enfermedades en español con descripción; textos en lenguaje del agricultor. |
| **H3 Control y libertad del usuario** | "Cambiar imagen", "Quitar", "Analizar otra hoja", "Elegir otro cultivo"; migas de pan; botón "Reintentar". |
| **H4 Consistencia y estándares** | Barra de navegación común; tokens de color, tipografía, espaciado y componentes definidos una sola vez. |
| **H5 Prevención de errores** | Validación de tipo y tamaño de imagen **antes** de enviar; botón "Analizar" deshabilitado sin foto. |
| **H6 Reconocer antes que recordar** | Cada tarjeta lista las enfermedades que detecta; formatos y tamaño máximo visibles; vista previa. |
| **H7 Flexibilidad y eficiencia** | Arrastrar y soltar; "Analizar de nuevo"; si hay sesión, el inicio lleva directo al panel; navegación por teclado. |
| **H8 Diseño estético y minimalista** | Una acción principal por pantalla, jerarquía tipográfica clara. |
| **H9 Ayudar a recuperarse de errores** | Mensajes específicos; códigos de Firebase traducidos; diferencia entre error de red y error de imagen. |
| **H10 Ayuda y documentación** | Guía de uso en el panel, consejos por cultivo, nota de alcance junto al resultado. |
| **ISO 9241-110 / 112 / 410 / 210** | Flujo de 3 pasos, contraste ≥ 4,5:1, objetivos táctiles ≥ 44 px, diseño centrado en el contexto de uso (campo, móvil). |
| **Accesibilidad (WCAG 2.1 AA)** | `lang="es"`, enlace "saltar al contenido", `label` por campo, `role="tab/tabpanel"`, `aria-live`, `prefers-reduced-motion`. |

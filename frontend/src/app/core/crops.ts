/**
 * Catálogo de cultivos soportados.
 *
 * Antes había tres componentes casi idénticos (banana, arroz, cafe). Ahora un
 * único componente `Detector` se configura con uno de estos objetos, así que
 * añadir un cultivo nuevo es agregar una entrada aquí y una ruta.
 */
export type CropId = 'banana' | 'arroz' | 'cafe';

export interface Crop {
  id: CropId;
  /** Nombre que ve el usuario. */
  name: string;
  /** Ruta de la API en el backend Flask. */
  endpoint: string;
  /** Imagen de fondo / tarjeta. */
  image: string;
  /** Descripción corta para la tarjeta del dashboard. */
  summary: string;
  /** Enfermedades que el modelo puede reconocer (ayuda al usuario a saber qué esperar). */
  detects: string[];
  /** Consejos para tomar una buena foto de este cultivo. */
  photoTips: string[];
  /** Si está en false la tarjeta aparece como "próximamente". */
  available: boolean;
}

export const CROPS: Record<CropId, Crop> = {
  banana: {
    id: 'banana',
    name: 'Banano',
    endpoint: '/banana-disease',
    image: '/img/bananaPlants.webp',
    summary: 'Identifica sigatoka, cordana y pestalotiopsis en hojas de banano o plátano.',
    detects: ['Sigatoka', 'Mancha de Cordana', 'Pestalotiopsis', 'Hoja saludable'],
    photoTips: [
      'Fotografía una sola hoja, de frente y bien iluminada.',
      'Acércate para que las manchas se vean con claridad.',
      'Evita sombras fuertes y reflejos de agua.',
    ],
    available: true,
  },
  arroz: {
    id: 'arroz',
    name: 'Arroz',
    endpoint: '/rice-disease',
    image: '/img/ricePlants.webp',
    summary: 'Detecta tizón y mancha marrón en hojas de arroz.',
    detects: ['Tizón del arroz', 'Mancha marrón', 'Hoja saludable'],
    photoTips: [
      'Coloca la hoja sobre un fondo liso si es posible.',
      'Incluye la zona con lesiones en el centro de la foto.',
      'Usa luz natural, sin flash.',
    ],
    available: true,
  },
  cafe: {
    id: 'cafe',
    name: 'Café',
    endpoint: '/coffee-disease',
    image: '/img/coffeePlants.webp',
    summary: 'Reconoce roya del café y minador de la hoja.',
    detects: ['Roya del café', 'Minador de la hoja', 'Hoja saludable'],
    photoTips: [
      'La roya se ve mejor en el envés (parte de abajo) de la hoja.',
      'Enfoca bien: las manchas pulverulentas son pequeñas.',
      'Evita hojas mojadas.',
    ],
    available: true,
  },
};

export const CROP_LIST: Crop[] = Object.values(CROPS);

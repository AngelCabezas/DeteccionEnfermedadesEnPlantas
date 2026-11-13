import { firebaseConfig } from './firebase.config';

/** Configuración de producción. La URL de la API ya no se repite en cada componente. */
export const environment = {
  production: true,
  apiUrl: 'https://api-plantas-ia.onrender.com',
  /** Tamaño máximo de imagen aceptado por el backend (MAX_UPLOAD_MB). */
  maxUploadMb: 10,
  firebase: firebaseConfig,
};

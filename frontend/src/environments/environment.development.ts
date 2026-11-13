import { firebaseConfig } from './firebase.config';

/** Configuración de desarrollo (`ng serve`): backend local con `python app.py`. */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000',
  maxUploadMb: 10,
  firebase: firebaseConfig,
};

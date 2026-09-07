import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';

// Importaciones de Firebase
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';

// Tus credenciales exactas
const firebaseConfig = {
  apiKey: "AIzaSyDyBQDxtPzVDACbPSHsz0wDnf9y2RCxpKI",
  authDomain: "plantdiseasedetector-e353b.firebaseapp.com",
  projectId: "plantdiseasedetector-e353b",
  storageBucket: "plantdiseasedetector-e353b.firebasestorage.app",
  messagingSenderId: "682230475566",
  appId: "1:682230475566:web:4b41686144a698236d28bf",
  measurementId: "G-196K3BWWRC"
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(), // Para tu API de Python
    // Encendemos Firebase y la Autenticación en toda la app
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => getAuth())
  ]
};
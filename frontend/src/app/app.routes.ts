import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { Login } from './components/login/login';
import { Dashboard } from './components/dashboard/dashboard';
import { Informacion } from './components/informacion/informacion';
import { Detector } from './components/detector/detector';
import { authGuard } from './auth.guard';
import { CROPS } from './core/crops';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: Home, title: 'Plant Disease Detector IA' },
  { path: 'login', component: Login, title: 'Iniciar sesión · PD-IA' },
  { path: 'informacion', component: Informacion, title: 'Sobre nosotros · PD-IA' },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard], title: 'Panel · PD-IA' },

  // Un solo componente para los tres cultivos; se configura con `data.crop`.
  { path: 'banana', component: Detector, canActivate: [authGuard], data: { crop: CROPS.banana }, title: 'Banano · PD-IA' },
  { path: 'arroz', component: Detector, canActivate: [authGuard], data: { crop: CROPS.arroz }, title: 'Arroz · PD-IA' },
  { path: 'cafe', component: Detector, canActivate: [authGuard], data: { crop: CROPS.cafe }, title: 'Café · PD-IA' },

  { path: '**', redirectTo: 'home' },
];

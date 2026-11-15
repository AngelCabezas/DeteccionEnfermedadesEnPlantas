import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { CROPS } from './core/crops';

const APP = 'Plant Disease Detector IA';

/**
 * Todas las páginas se cargan bajo demanda (`loadComponent`): el bundle inicial
 * solo contiene lo necesario para pintar la primera pantalla.
 */
export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  {
    path: 'home',
    loadComponent: () => import('./components/home/home').then((m) => m.Home),
    title: APP,
  },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login').then((m) => m.Login),
    canActivate: [guestGuard],
    title: `Acceder · ${APP}`,
  },
  {
    path: 'informacion',
    loadComponent: () => import('./components/informacion/informacion').then((m) => m.Informacion),
    title: `Sobre el proyecto · ${APP}`,
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard/dashboard').then((m) => m.Dashboard),
    canActivate: [authGuard],
    title: `Panel de diagnóstico · ${APP}`,
  },

  // Un solo componente para los tres cultivos; se configura con `data.crop`.
  ...Object.values(CROPS).map((crop) => ({
    path: crop.id,
    loadComponent: () => import('./components/detector/detector').then((m) => m.Detector),
    canActivate: [authGuard],
    data: { crop },
    title: `Diagnóstico de ${crop.name.toLowerCase()} · ${APP}`,
  })),

  {
    path: '**',
    loadComponent: () => import('./components/not-found/not-found').then((m) => m.NotFound),
    title: `Página no encontrada · ${APP}`,
  },
];

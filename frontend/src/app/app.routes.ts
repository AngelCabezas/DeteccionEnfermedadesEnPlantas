import { Routes } from '@angular/router';

// Usamos los nombres de clase que Angular probablemente generó
import { Home } from './components/home/home';
import { Login } from './components/login/login';
import { Dashboard } from './components/dashboard/dashboard';
import { Informacion } from './components/informacion/informacion';
import { Banana } from './components/banana/banana';
import { Arroz } from './components/arroz/arroz';
import { Cafe } from './components/cafe/cafe';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' }, 
  { path: 'home', component: Home },
  { path: 'login', component: Login },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'informacion', component: Informacion},
  { path: 'banana', component: Banana, canActivate: [authGuard]  },
  { path: 'arroz', component: Arroz, canActivate: [authGuard]  },
  { path: 'cafe', component: Cafe, canActivate: [authGuard]  },
  { path: '**', redirectTo: 'home' } 
];
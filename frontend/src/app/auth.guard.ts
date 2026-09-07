import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { map } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  // Inyectamos las herramientas que necesitamos
  const auth = inject(Auth);
  const router = inject(Router);

  // authState vigila constantemente si hay un usuario conectado o no
  return authState(auth).pipe(
    map(user => {
      if (user) {
        return true; // El guardia abre la puerta, puedes pasar al Dashboard
      } else {
        router.navigate(['/login']); // El guardia te rechaza y te manda al Login
        return false; 
      }
    })
  );
};
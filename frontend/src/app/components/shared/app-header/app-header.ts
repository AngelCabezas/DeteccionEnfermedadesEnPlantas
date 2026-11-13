import { Component, inject, input, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Auth, authState, signOut } from '@angular/fire/auth';
import { toSignal } from '@angular/core/rxjs-interop';

/**
 * Barra de navegación común a todas las páginas.
 * - Siempre muestra dónde está el usuario (enlace activo) y cómo volver.
 * - Cambia "Iniciar sesión" por "Cerrar sesión" según el estado real de Firebase.
 */
@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './app-header.html',
  styleUrl: './app-header.css',
})
export class AppHeader {
  /** 'dark' sobre fondos de imagen, 'light' sobre fondos claros. */
  readonly variant = input<'dark' | 'light'>('light');

  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  readonly user = toSignal(authState(this.auth), { initialValue: null });
  readonly menuOpen = signal(false);
  readonly signingOut = signal(false);

  toggleMenu() {
    this.menuOpen.update((v) => !v);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  async logout() {
    this.signingOut.set(true);
    try {
      await signOut(this.auth);
      await this.router.navigate(['/home']);
    } finally {
      this.signingOut.set(false);
      this.closeMenu();
    }
  }
}

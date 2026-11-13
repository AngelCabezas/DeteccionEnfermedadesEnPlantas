import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from '@angular/fire/auth';
import { AppHeader } from '../shared/app-header/app-header';

type Mode = 'login' | 'register';

/**
 * Traduce los códigos de error de Firebase a mensajes accionables en español
 * (heurística 9: ayudar a reconocer, diagnosticar y recuperarse de errores).
 */
const FIREBASE_ERRORS: Record<string, string> = {
  'auth/invalid-email': 'El correo no tiene un formato válido.',
  'auth/user-not-found': 'No existe una cuenta con ese correo. ¿Quieres registrarte?',
  'auth/wrong-password': 'La contraseña no es correcta.',
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese correo. Inicia sesión.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/network-request-failed': 'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
};

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule, AppHeader],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  readonly mode = signal<Mode>('login');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly showPassword = signal(false);

  // Campos del formulario
  email = '';
  password = '';
  name = '';

  setMode(mode: Mode) {
    this.mode.set(mode);
    this.error.set(null);
    this.success.set(null);
  }

  togglePassword() {
    this.showPassword.update((v) => !v);
  }

  async submit(event: Event) {
    event.preventDefault();
    if (this.loading()) return;

    this.error.set(null);
    this.success.set(null);

    // Validación previa (H5: prevención de errores) con mensajes concretos.
    const email = this.email.trim();
    if (!email) return this.error.set('Escribe tu correo electrónico.');
    if (!this.password) return this.error.set('Escribe tu contraseña.');
    if (this.mode() === 'register' && this.password.length < 6) {
      return this.error.set('La contraseña debe tener al menos 6 caracteres.');
    }

    this.loading.set(true);
    try {
      if (this.mode() === 'login') {
        await signInWithEmailAndPassword(this.auth, email, this.password);
        await this.router.navigate(['/dashboard']);
      } else {
        const cred = await createUserWithEmailAndPassword(this.auth, email, this.password);
        if (this.name.trim()) {
          await updateProfile(cred.user, { displayName: this.name.trim() });
        }
        // Firebase deja la sesión iniciada tras registrarse: vamos directo al panel.
        await this.router.navigate(['/dashboard']);
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      this.error.set(FIREBASE_ERRORS[code] ?? 'No se pudo completar la operación. Inténtalo de nuevo.');
      console.error('Auth error:', code, err);
    } finally {
      this.loading.set(false);
    }
  }
}

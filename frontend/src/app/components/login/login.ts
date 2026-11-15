import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  Auth,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
} from '@angular/fire/auth';
import { AppHeader } from '../shared/app-header/app-header';

type Mode = 'login' | 'register' | 'reset';

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
  'auth/missing-email': 'Escribe tu correo electrónico.',
};

const COPY: Record<
  Mode,
  { kicker: string; title: string; subtitle: string; submit: string; busy: string }
> = {
  login: {
    kicker: 'Iniciar sesión',
    title: 'Bienvenido de nuevo',
    subtitle: 'Accede para diagnosticar tus cultivos.',
    submit: 'Entrar',
    busy: 'Entrando…',
  },
  register: {
    kicker: 'Nueva cuenta',
    title: 'Crea tu cuenta',
    subtitle: 'Solo necesitas un correo y una contraseña.',
    submit: 'Crear cuenta',
    busy: 'Creando cuenta…',
  },
  reset: {
    kicker: 'Recuperar contraseña',
    title: 'Recupera tu contraseña',
    subtitle: 'Te enviaremos un enlace para crear una nueva.',
    submit: 'Enviar enlace',
    busy: 'Enviando…',
  },
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
  private readonly route = inject(ActivatedRoute);

  readonly mode = signal<Mode>('login');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly showPassword = signal(false);

  readonly copy = computed(() => COPY[this.mode()]);

  readonly benefits = [
    'Diagnóstico de banano, arroz y café en segundos.',
    'Resultados explicados en español, con nivel de confianza.',
    'Tus fotos se analizan en memoria y no se guardan.',
  ];

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

  /**
   * Página a la que volver tras autenticarse (la fija el guard en `returnUrl`).
   * Solo se aceptan rutas internas para evitar redirecciones a sitios externos.
   */
  private returnUrl(): string {
    const url = this.route.snapshot.queryParamMap.get('returnUrl') ?? '';
    return url.startsWith('/') && !url.startsWith('//') ? url : '/dashboard';
  }

  async submit(event: Event) {
    event.preventDefault();
    if (this.loading()) return;

    this.error.set(null);
    this.success.set(null);

    // Validación previa (H5: prevención de errores) con mensajes concretos.
    const email = this.email.trim();
    const mode = this.mode();
    if (!email) return this.error.set('Escribe tu correo electrónico.');
    if (mode !== 'reset' && !this.password) return this.error.set('Escribe tu contraseña.');
    if (mode === 'register' && this.password.length < 6) {
      return this.error.set('La contraseña debe tener al menos 6 caracteres.');
    }

    this.loading.set(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(this.auth, email, this.password);
        await this.router.navigateByUrl(this.returnUrl());
      } else if (mode === 'register') {
        const cred = await createUserWithEmailAndPassword(this.auth, email, this.password);
        if (this.name.trim()) {
          await updateProfile(cred.user, { displayName: this.name.trim() });
        }
        // Firebase deja la sesión iniciada tras registrarse: vamos directo al panel.
        await this.router.navigateByUrl(this.returnUrl());
      } else {
        await sendPasswordResetEmail(this.auth, email);
        this.success.set(
          `Si existe una cuenta con ${email}, recibirás un correo con el enlace en unos minutos. Revisa también la carpeta de spam.`,
        );
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      // Al recuperar contraseña no revelamos si el correo existe o no.
      if (mode === 'reset' && code === 'auth/user-not-found') {
        this.success.set(
          `Si existe una cuenta con ${email}, recibirás un correo con el enlace en unos minutos.`,
        );
      } else {
        this.error.set(
          FIREBASE_ERRORS[code] ?? 'No se pudo completar la operación. Inténtalo de nuevo.',
        );
        console.error('Auth error:', code, err);
      }
    } finally {
      this.loading.set(false);
    }
  }
}

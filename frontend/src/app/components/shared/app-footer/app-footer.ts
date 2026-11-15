import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { toSignal } from '@angular/core/rxjs-interop';

/**
 * Pie de página común a todas las pantallas (H4: consistencia).
 * Reúne la marca, los enlaces principales y la atribución institucional.
 */
@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './app-footer.html',
  styleUrl: './app-footer.css',
})
export class AppFooter {
  /** 'dark' sobre fondos oscuros, 'light' sobre fondos claros. */
  readonly variant = input<'dark' | 'light'>('light');
  readonly year = new Date().getFullYear();
  /** Con sesión iniciada el enlace «Acceder» se sustituye por «Diagnóstico». */
  readonly user = toSignal(authState(inject(Auth)), { initialValue: null });
}

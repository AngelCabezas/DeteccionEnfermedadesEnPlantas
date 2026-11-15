import { LowerCasePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { toSignal } from '@angular/core/rxjs-interop';
import { CROP_LIST } from '../../core/crops';
import { AppHeader } from '../shared/app-header/app-header';
import { AppFooter } from '../shared/app-footer/app-footer';

interface Step {
  title: string;
  text: string;
  /** Trazado SVG (Material Icons, viewBox 0 0 24 24). */
  icon: string;
}

type DevTab = 'perfil' | 'stack' | 'contacto';

const DEV_EMAIL = 'angelcabezas1999@gmail.com';

/**
 * Panel principal tras iniciar sesión.
 *
 * La acción principal (elegir cultivo) ocupa el primer plano: las tarjetas se
 * superponen a la cabecera para que sean lo primero que se ve. La información
 * institucional completa vive en «Sobre el proyecto»; aquí solo se enlaza.
 */
@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, LowerCasePipe, AppHeader, AppFooter],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  readonly crops = CROP_LIST;
  readonly user = toSignal(authState(inject(Auth)), { initialValue: null });

  /** Nombre de pila para el saludo; si no hay, la parte local del correo. */
  readonly firstName = computed(() => {
    const u = this.user();
    const name = u?.displayName?.trim().split(/\s+/)[0];
    if (name) return name;
    const local = u?.email?.split('@')[0];
    return local || null;
  });

  readonly greeting = computed(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  });

  /** Enfermedades distintas que reconocen los modelos (sin contar «hoja saludable»). */
  readonly diseaseCount = this.crops.reduce((n, c) => n + this.diseasesOf(c.detects), 0);

  readonly steps: Step[] = [
    {
      title: 'Elige el cultivo',
      text: 'Pulsa la tarjeta del cultivo que vas a fotografiar. Cada modelo está entrenado solo para sus hojas.',
      icon: 'M12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12q0-2.075.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788 3.175 2.137T21.213 8.1 22 12t-.788 3.9-2.137 3.175-3.175 2.138T12 22m0-2q3.35 0 5.675-2.325T20 12q0-3.35-2.325-5.675T12 4Q8.65 4 6.325 6.325T4 12q0 3.35 2.325 5.675T12 20m0-3q2.075 0 3.538-1.463T17 12t-1.463-3.537T12 7 8.463 8.463 7 12t1.463 3.538T12 17',
    },
    {
      title: 'Sube la foto de la hoja',
      text: 'Arrastra la imagen o pulsa para elegirla. Se aceptan JPG, PNG y WEBP de hasta 10 MB; verás una vista previa.',
      icon: 'M12 15.5q1.875 0 3.188-1.312T16.5 11t-1.312-3.187T12 6.5 8.813 7.813 7.5 11t1.313 3.188T12 15.5M3 21q-.825 0-1.412-.587T1 19V7q0-.825.588-1.412T3 5h3.15L8 3h8l1.85 2H21q.825 0 1.413.588T23 7v12q0 .825-.587 1.413T21 21z',
    },
    {
      title: 'Pulsa «Analizar hoja»',
      text: 'Tarda unos segundos. Si el servidor estaba inactivo, la primera vez puede demorar hasta un minuto.',
      icon: 'M13 2 3 14h7v8l10-12h-7z',
    },
    {
      title: 'Lee el resultado',
      text: 'Nombre de la enfermedad o «hoja saludable», una descripción breve y la confianza del modelo.',
      icon: 'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z',
    },
  ];

  readonly photoTips = [
    'Una sola hoja, enfocada y con luz natural.',
    'Las lesiones deben verse con claridad; acércate si hace falta.',
    'Evita sombras duras, reflejos y hojas mojadas.',
    'Si puedes, usa un fondo liso para que la hoja destaque.',
  ];

  // ---------- Tarjeta del desarrollador ----------
  readonly devEmail = DEV_EMAIL;
  readonly devTab = signal<DevTab>('perfil');
  readonly copied = signal(false);
  private copiedTimer: ReturnType<typeof setTimeout> | null = null;

  readonly devTabs: { id: DevTab; label: string }[] = [
    { id: 'perfil', label: 'Perfil' },
    { id: 'stack', label: 'Tecnologías' },
    { id: 'contacto', label: 'Contacto' },
  ];

  readonly devFacts = [
    { label: 'Rol', value: 'Ingeniero de Software' },
    { label: 'Institución', value: 'Escuela Politécnica Nacional' },
    { label: 'Enfoque', value: 'Web moderna e IA aplicada' },
    { label: 'Código', value: 'Abierto, en GitHub' },
  ];

  readonly stack: { group: string; items: string[] }[] = [
    { group: 'Frontend', items: ['Angular 21', 'TypeScript', 'Signals', 'Vitest'] },
    { group: 'Backend', items: ['Python', 'Flask', 'TensorFlow Lite', 'scikit-learn', 'OpenCV'] },
    { group: 'Plataforma', items: ['Firebase Auth', 'Render', 'Docker', 'GitHub Actions'] },
  ];

  selectDevTab(tab: DevTab) {
    this.devTab.set(tab);
  }

  /** Navegación con flechas entre pestañas (patrón WAI-ARIA de tabs). */
  onDevTabKeydown(event: KeyboardEvent, index: number) {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, Home: 0, End: 0 };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const n = this.devTabs.length;
    const next =
      event.key === 'Home' ? 0 : event.key === 'End' ? n - 1 : (index + keys[event.key] + n) % n;
    this.devTab.set(this.devTabs[next].id);
    const el = (event.currentTarget as HTMLElement).parentElement?.children[next] as
      HTMLElement | undefined;
    el?.focus();
  }

  async copyEmail() {
    try {
      await navigator.clipboard.writeText(DEV_EMAIL);
      this.copied.set(true);
      if (this.copiedTimer) clearTimeout(this.copiedTimer);
      this.copiedTimer = setTimeout(() => this.copied.set(false), 2200);
    } catch {
      // Sin permiso de portapapeles: el enlace mailto sigue disponible.
      window.location.href = `mailto:${DEV_EMAIL}`;
    }
  }

  /** Cuenta enfermedades reales dentro de la lista de clases de un cultivo. */
  diseasesOf(detects: string[]): number {
    return detects.filter((d) => !/saludable/i.test(d)).length;
  }
}

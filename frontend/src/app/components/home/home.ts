import { Component, inject } from '@angular/core';
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

@Component({
  selector: 'app-home',
  imports: [RouterLink, AppHeader, AppFooter],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  readonly crops = CROP_LIST;
  /** Si ya hay sesión, los botones principales llevan directo al panel. */
  readonly user = toSignal(authState(inject(Auth)), { initialValue: null });

  readonly steps: Step[] = [
    {
      title: 'Elige el cultivo',
      text: 'Banano, arroz o café. Cada uno tiene un modelo entrenado solo para sus hojas.',
      icon: 'M12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12q0-2.075.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788 3.175 2.137T21.213 8.1 22 12t-.788 3.9-2.137 3.175-3.175 2.138T12 22m0-2q3.35 0 5.675-2.325T20 12q0-3.35-2.325-5.675T12 4Q8.65 4 6.325 6.325T4 12q0 3.35 2.325 5.675T12 20m0-3q2.075 0 3.538-1.463T17 12t-1.463-3.537T12 7 8.463 8.463 7 12t1.463 3.538T12 17',
    },
    {
      title: 'Sube una foto de la hoja',
      text: 'Desde el teléfono o el computador, arrastrando o eligiendo el archivo. JPG, PNG o WEBP.',
      icon: 'M12 15.5q1.875 0 3.188-1.312T16.5 11t-1.312-3.187T12 6.5 8.813 7.813 7.5 11t1.313 3.188T12 15.5M3 21q-.825 0-1.412-.587T1 19V7q0-.825.588-1.412T3 5h3.15L8 3h8l1.85 2H21q.825 0 1.413.588T23 7v12q0 .825-.587 1.413T21 21z',
    },
    {
      title: 'Recibe el diagnóstico',
      text: 'Nombre de la enfermedad, descripción, nivel de confianza y consejos para la siguiente foto.',
      icon: 'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z',
    },
  ];

  readonly features: Step[] = [
    {
      title: 'Resultado en segundos',
      text: 'La inferencia tarda milisegundos; el tiempo lo marca tu conexión.',
      icon: 'M13 2 3 14h7v8l10-12h-7z',
    },
    {
      title: 'Funciona en el móvil',
      text: 'Toma la foto con el teléfono y súbela sin instalar nada.',
      icon: 'M17 1H7a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2m0 18H7V5h10z',
    },
    {
      title: 'Tus fotos no se guardan',
      text: 'La imagen se analiza en memoria y se descarta al responder.',
      icon: 'M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5zm-2 16-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9z',
    },
    {
      title: 'Proyecto académico abierto',
      text: 'Desarrollado en la Escuela Politécnica Nacional con código abierto.',
      icon: 'M12 3 1 9l11 6 9-4.91V17h2V9zm-7 9.99V16l7 3.82 7-3.82v-3.01L12 17z',
    },
  ];
}

import { LowerCasePipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CROP_LIST } from '../../core/crops';
import { AppHeader } from '../shared/app-header/app-header';

type Section = 'cultivos' | 'guia' | 'acerca' | 'desarrollador';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, LowerCasePipe, AppHeader],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  readonly crops = CROP_LIST;
  readonly section = signal<Section>('cultivos');

  readonly sections: { id: Section; label: string }[] = [
    { id: 'cultivos', label: 'Cultivos' },
    { id: 'guia', label: 'Guía de uso' },
    { id: 'acerca', label: 'Acerca del proyecto' },
    { id: 'desarrollador', label: 'Desarrollador' },
  ];

  show(section: Section) {
    this.section.set(section);
  }
}

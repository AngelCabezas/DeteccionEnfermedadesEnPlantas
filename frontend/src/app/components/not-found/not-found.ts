import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppHeader } from '../shared/app-header/app-header';
import { AppFooter } from '../shared/app-footer/app-footer';

/** Página para rutas inexistentes: explica qué pasó y ofrece una salida (H9). */
@Component({
  selector: 'app-not-found',
  imports: [RouterLink, AppHeader, AppFooter],
  templateUrl: './not-found.html',
  styleUrl: './not-found.css',
})
export class NotFound {}

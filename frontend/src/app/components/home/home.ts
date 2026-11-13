import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { toSignal } from '@angular/core/rxjs-interop';
import { CROP_LIST } from '../../core/crops';
import { AppHeader } from '../shared/app-header/app-header';

@Component({
  selector: 'app-home',
  imports: [RouterLink, AppHeader],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  readonly crops = CROP_LIST;
  /** Si ya hay sesión, el botón principal lleva directo al panel. */
  readonly user = toSignal(authState(inject(Auth)), { initialValue: null });
}

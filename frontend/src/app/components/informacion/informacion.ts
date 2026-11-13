import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppHeader } from '../shared/app-header/app-header';

@Component({
  selector: 'app-informacion',
  imports: [RouterLink, AppHeader],
  templateUrl: './informacion.html',
  styleUrl: './informacion.css',
})
export class Informacion {}

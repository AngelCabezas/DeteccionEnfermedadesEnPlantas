import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Auth, signOut } from '@angular/fire/auth';

@Component({
  selector: 'app-dashboard',
  imports: [RouterModule, CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {

  // Inyectamos la autenticación y el enrutador
  constructor(private auth: Auth, private router: Router) {}

  cafeDisponible = false;
  // Función para cerrar sesión
  async logout() {
    try {
      await signOut(this.auth); // Le dice a Firebase que cierre la sesión
      this.router.navigate(['/login']); // Te expulsa de vuelta al Login
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  }

  seccionActiva: string = 'home';

  cambiarSeccion(seccion: string) {
    this.seccionActiva = seccion;
  }

}

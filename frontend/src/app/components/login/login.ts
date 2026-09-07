import { Component } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <-- Para leer las cajas de texto
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from '@angular/fire/auth'; // <-- Firebase Auth

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule], // <-- Agregamos FormsModule aquí
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  isLoginMode: boolean = true; 

  // Variables para guardar lo que el usuario escribe
  loginEmail = '';
  loginPassword = '';
  
  regUsuario = ''; // Firebase usa correo/contraseña, pero guardamos esto por diseño
  regEmail = '';
  regPassword = '';

  // Inyectamos Firebase y el Router en el constructor
  constructor(private auth: Auth, private router: Router) {}

  toggleMode() {
    this.isLoginMode = !this.isLoginMode; 
  }

  // --- LÓGICA DE INICIO DE SESIÓN ---
  async onLogin(event: Event) {
    event.preventDefault();
    try {
      // Firebase verifica si el correo y la contraseña existen
      await signInWithEmailAndPassword(this.auth, this.loginEmail, this.loginPassword);
      alert("¡Bienvenido a Plant Disease Detector!");
      this.router.navigate(['/dashboard']); // ¡Nos vamos al dashboard!
      
    } catch (error: any) {
      console.error("Error al iniciar sesión:", error);
      alert("Error: Correo o contraseña incorrectos.");
    }
  }

  // --- LÓGICA DE REGISTRO ---
  async onRegister(event: Event) {
    event.preventDefault();
    try {
      // Firebase crea un nuevo usuario en tu base de datos
      await createUserWithEmailAndPassword(this.auth, this.regEmail, this.regPassword);
      alert("¡Registro exitoso! Ya puedes iniciar sesión.");
      
      // Limpiamos el formulario y regresamos a la pantalla de Login
      this.regEmail = '';
      this.regPassword = '';
      this.regUsuario = '';
      this.toggleMode(); 
      
    } catch (error: any) {
      console.error("Error al registrar:", error);
      // Firebase tiene validaciones automáticas (ej. contraseñas de menos de 6 letras)
      alert("No se pudo registrar. Verifica que el correo sea válido y la contraseña tenga mínimo 6 caracteres.");
    }
  }
}
import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http'; // <-- Importamos HttpClient

@Component({
  selector: 'app-cafe',
  standalone: true, // <-- Nos aseguramos de que sea standalone
  imports: [RouterModule, CommonModule],
  templateUrl: './cafe.html',
  styleUrl: './cafe.css',
})
export class Cafe {
  imagePreviewUrl: string | ArrayBuffer | null = null;
  archivoSeleccionado: File | null = null; // Guardará el archivo real

  resultadoIA: string = '';
  cargando: boolean = false;

  // Inyectamos el HttpClient junto con el detector de cambios
  constructor(private cdr: ChangeDetectorRef, private http: HttpClient) {}

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.archivoSeleccionado = file;

      const reader = new FileReader();
      
      reader.onload = () => {
        this.imagePreviewUrl = reader.result;
        this.resultadoIA = ''; // Limpiamos el resultado anterior al subir nueva imagen
        this.cdr.detectChanges(); 
      };
      
      reader.readAsDataURL(file);
    }
  }

  onSubmit() {
    if (!this.archivoSeleccionado) {
      alert("Por favor, selecciona una imagen primero.");
      return;
    }

    this.cargando = true;
    this.resultadoIA = ''; // Borramos el texto mientras carga
    
    // Empaquetamos la imagen para Flask
    const formData = new FormData();
    formData.append('file', this.archivoSeleccionado);

    // ¡Apuntamos a la ruta del CAFÉ!
    this.http.post<any>('http://127.0.0.1:5000/coffee-disease', formData)
      .subscribe({
        next: (respuesta) => {
          this.resultadoIA = respuesta.prediction; 
          this.cargando = false;
          this.cdr.detectChanges(); // Refrescamos la pantalla
        },
        error: (error) => {
          console.error("Error del servidor:", error);
          this.resultadoIA = "Error al conectar con la IA";
          this.cargando = false;
          this.cdr.detectChanges();
        }
      });
  }
}
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http'; // <-- Importamos HttpClient
import { ChangeDetectorRef, Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-arroz',
  standalone: true, // <-- Asegúrate de que esté como standalone
  imports: [RouterModule, CommonModule],
  templateUrl: './arroz.html',
  styleUrl: './arroz.css',
})
export class Arroz {
  imagePreviewUrl: string | ArrayBuffer | null = null;
  archivoSeleccionado: File | null = null; // Guardará el archivo real

  resultadoIA: string = '';
  cargando: boolean = false;

  // Inyectamos HttpClient al igual que en banana
  constructor(private cdr: ChangeDetectorRef, private http: HttpClient) {}

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.archivoSeleccionado = file;

      const reader = new FileReader();
      
      reader.onload = () => {
        this.imagePreviewUrl = reader.result;
        this.resultadoIA = ''; // Limpiamos si había un resultado anterior
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

    // ¡Apuntamos a la ruta del ARROZ!
    this.http.post<any>('https://api-plantas-ia.onrender.com//rice-disease', formData)
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
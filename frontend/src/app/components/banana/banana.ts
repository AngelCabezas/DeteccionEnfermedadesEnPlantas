import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-banana',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './banana.html',
  styleUrl: './banana.css',
})

export class Banana {
imagePreviewUrl: string | ArrayBuffer | null = null;
archivoSeleccionado: File | null = null;

resultadoIA: string = '';
cargando: boolean = false;

  // Inyectamos el detector de cambios de Angular en el constructor
  constructor(private cdr: ChangeDetectorRef, private http: HttpClient) {}

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.archivoSeleccionado = file;

      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreviewUrl = reader.result;
        this.resultadoIA = ''; // Limpiamos el resultado anterior
        // ¡La magia está aquí! Le decimos a Angular que redibuje la pantalla
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

    this.cargando = true; // Mostramos el mensaje de cargando
    
    // Empaquetamos la imagen tal como la espera tu API de Flask
    const formData = new FormData();
    formData.append('file', this.archivoSeleccionado);

    // Hacemos el envío POST a tu servidor de Python
    this.http.post<any>('https://api-plantas-ia.onrender.com/banana-disease', formData)
      .subscribe({
        next: (respuesta) => {
          // 'prediction' es la clave que envías desde tu return jsonify({'prediction': result})
          this.resultadoIA = respuesta.prediction; 
          this.cargando = false;
          this.cdr.detectChanges(); // Actualizamos la pantalla con el resultado
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

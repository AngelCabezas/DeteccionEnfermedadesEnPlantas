import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError, timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import { Crop } from './crops';

/** Respuesta del backend (ver backend/app.py → _build_response). */
export interface Prediction {
  prediction: string;
  crop: string;
  label: string;
  description: string;
  severity: 'healthy' | 'disease' | 'pest';
  confidence: number | null;
}

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Mensaje de error entendible por el usuario (heurística 9: ayudar a reconocer y recuperarse de errores). */
export class PredictionError extends Error {
  constructor(
    message: string,
    public readonly retryable = true,
  ) {
    super(message);
  }
}

@Injectable({ providedIn: 'root' })
export class PredictionService {
  private readonly http = inject(HttpClient);

  /**
   * Valida el archivo ANTES de enviarlo (heurística 5: prevención de errores).
   * Devuelve un mensaje de error o null si es válido.
   */
  validateFile(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Formato no admitido. Sube una imagen JPG, PNG o WEBP.';
    }
    const maxBytes = environment.maxUploadMb * 1024 * 1024;
    if (file.size > maxBytes) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      return `La imagen pesa ${mb} MB y el máximo es ${environment.maxUploadMb} MB. Prueba con una foto más pequeña.`;
    }
    return null;
  }

  predict(crop: Crop, file: File): Observable<Prediction> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<Prediction>(`${environment.apiUrl}${crop.endpoint}`, formData).pipe(
      // Render (plan gratuito) puede tardar ~1 min en "despertar": damos margen.
      timeout(90_000),
      catchError((err) => throwError(() => this.toUserError(err))),
    );
  }

  private toUserError(err: unknown): PredictionError {
    if (err instanceof HttpErrorResponse) {
      const serverMsg = (err.error && typeof err.error === 'object' && err.error.error) as
        string | undefined;
      if (err.status === 0) {
        return new PredictionError(
          'No se pudo conectar con el servidor. Revisa tu conexión a internet; si el servidor estaba inactivo puede tardar un minuto en responder.',
        );
      }
      if (err.status === 400 || err.status === 413) {
        return new PredictionError(serverMsg ?? 'La imagen no es válida.', false);
      }
      if (err.status === 503) {
        return new PredictionError(
          serverMsg ?? 'El modelo de este cultivo no está disponible por ahora.',
          false,
        );
      }
      return new PredictionError(
        serverMsg ?? 'El servidor devolvió un error inesperado. Inténtalo de nuevo.',
      );
    }
    if (err instanceof Error && err.name === 'TimeoutError') {
      return new PredictionError(
        'El análisis tardó demasiado. Inténtalo de nuevo en unos segundos.',
      );
    }
    return new PredictionError('Ocurrió un error inesperado. Inténtalo de nuevo.');
  }
}

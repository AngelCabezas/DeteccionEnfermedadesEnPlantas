import { Component, DestroyRef, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { LowerCasePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { Crop } from '../../core/crops';
import { ACCEPTED_TYPES, Prediction, PredictionError, PredictionService } from '../../core/prediction.service';
import { AppHeader } from '../shared/app-header/app-header';

type Status = 'idle' | 'ready' | 'loading' | 'done' | 'error';

/**
 * Página de diagnóstico, común a todos los cultivos.
 *
 * Flujo en 3 pasos siempre visible (heurística 1: visibilidad del estado):
 *   1. Elegir foto  →  2. Analizar  →  3. Resultado
 */
@Component({
  selector: 'app-detector',
  imports: [RouterLink, LowerCasePipe, AppHeader],
  templateUrl: './detector.html',
  styleUrl: './detector.css',
})
export class Detector {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(PredictionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  /** El cultivo llega por la configuración de la ruta (app.routes.ts). */
  readonly crop = toSignal(this.route.data.pipe(map((d) => d['crop'] as Crop)), { requireSync: true });

  readonly accept = ACCEPTED_TYPES.join(',');

  readonly status = signal<Status>('idle');
  readonly file = signal<File | null>(null);
  readonly previewUrl = signal<string | null>(null);
  readonly fileError = signal<string | null>(null);
  readonly result = signal<Prediction | null>(null);
  readonly requestError = signal<PredictionError | null>(null);
  readonly dragging = signal(false);

  readonly fileSizeLabel = computed(() => {
    const f = this.file();
    if (!f) return '';
    const kb = f.size / 1024;
    return kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`;
  });

  readonly confidencePct = computed(() => {
    const c = this.result()?.confidence;
    return c == null ? null : Math.round(c * 100);
  });

  /** Paso actual del flujo (1 a 3) para el indicador de progreso. */
  readonly step = computed(() => {
    const s = this.status();
    if (s === 'done') return 3;
    if (s === 'ready' || s === 'loading' || s === 'error') return 2;
    return 1;
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.revokePreview());
  }

  // ---------- Selección de archivo ----------
  onInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.setFile(file);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.dragging.set(true);
  }

  onDragLeave() {
    this.dragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.setFile(file);
  }

  private setFile(file: File) {
    this.revokePreview();
    this.result.set(null);
    this.requestError.set(null);

    const error = this.api.validateFile(file);
    if (error) {
      // Prevención de errores: no dejamos pasar un archivo que el servidor rechazaría.
      this.file.set(null);
      this.fileError.set(error);
      this.status.set('idle');
      this.resetInput();
      return;
    }

    this.fileError.set(null);
    this.file.set(file);
    this.previewUrl.set(URL.createObjectURL(file));
    this.status.set('ready');
  }

  /** Control y libertad del usuario: siempre se puede deshacer la selección. */
  clearFile() {
    this.revokePreview();
    this.file.set(null);
    this.fileError.set(null);
    this.result.set(null);
    this.requestError.set(null);
    this.status.set('idle');
    this.resetInput();
    this.fileInput()?.nativeElement.focus();
  }

  // ---------- Envío ----------
  analyze() {
    const file = this.file();
    if (!file || this.status() === 'loading') return;

    this.status.set('loading');
    this.requestError.set(null);
    this.result.set(null);

    this.api.predict(this.crop(), file).subscribe({
      next: (res) => {
        this.result.set(res);
        this.status.set('done');
      },
      error: (err: PredictionError) => {
        this.requestError.set(err);
        this.status.set('error');
      },
    });
  }

  severityLabel(sev: Prediction['severity']): string {
    return { healthy: 'Saludable', disease: 'Enfermedad detectada', pest: 'Plaga detectada' }[sev];
  }

  // ---------- Utilidades ----------
  private resetInput() {
    const el = this.fileInput()?.nativeElement;
    if (el) el.value = '';
  }

  private revokePreview() {
    const url = this.previewUrl();
    if (url) URL.revokeObjectURL(url);
    this.previewUrl.set(null);
  }
}

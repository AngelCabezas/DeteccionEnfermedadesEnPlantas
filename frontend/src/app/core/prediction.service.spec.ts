import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PredictionError, PredictionService } from './prediction.service';
import { CROPS } from './crops';
import { environment } from '../../environments/environment';

function fakeFile(type: string, sizeBytes: number, name = 'hoja.jpg'): File {
  const file = new File([new Uint8Array(1)], name, { type });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

describe('PredictionService', () => {
  let service: PredictionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PredictionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('validateFile', () => {
    it('acepta imágenes JPG, PNG y WEBP dentro del límite', () => {
      for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
        expect(service.validateFile(fakeFile(type, 1024))).toBeNull();
      }
    });

    it('rechaza formatos no admitidos con un mensaje claro', () => {
      expect(service.validateFile(fakeFile('application/pdf', 1024))).toContain(
        'Formato no admitido',
      );
    });

    it('rechaza archivos que superan el tamaño máximo e indica el peso', () => {
      const tooBig = (environment.maxUploadMb + 2.4) * 1024 * 1024;
      const msg = service.validateFile(fakeFile('image/jpeg', tooBig));
      expect(msg).toContain('12.4 MB');
      expect(msg).toContain(`${environment.maxUploadMb} MB`);
    });
  });

  describe('predict', () => {
    it('envía la imagen al endpoint del cultivo y devuelve la predicción', () => {
      const file = fakeFile('image/jpeg', 1024);
      let result: unknown;

      service.predict(CROPS.banana, file).subscribe((r) => (result = r));

      const req = http.expectOne(`${environment.apiUrl}/banana-disease`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBeInstanceOf(FormData);
      expect((req.request.body as FormData).get('file')).toBe(file);

      req.flush({
        prediction: 'sigatoka',
        crop: 'banana',
        label: 'Sigatoka',
        description: '…',
        severity: 'disease',
        confidence: 0.93,
      });

      expect(result).toMatchObject({ label: 'Sigatoka', confidence: 0.93 });
    });

    it('convierte un 400 del servidor en un error no reintentable con su mensaje', () => {
      let error: PredictionError | undefined;
      service
        .predict(CROPS.arroz, fakeFile('image/png', 10))
        .subscribe({ error: (e) => (error = e) });

      http
        .expectOne(`${environment.apiUrl}/rice-disease`)
        .flush({ error: 'El archivo está vacío.' }, { status: 400, statusText: 'Bad Request' });

      expect(error).toBeInstanceOf(PredictionError);
      expect(error?.message).toBe('El archivo está vacío.');
      expect(error?.retryable).toBe(false);
    });

    it('trata un fallo de red (status 0) como reintentable', () => {
      let error: PredictionError | undefined;
      service
        .predict(CROPS.cafe, fakeFile('image/png', 10))
        .subscribe({ error: (e) => (error = e) });

      http.expectOne(`${environment.apiUrl}/coffee-disease`).error(new ProgressEvent('error'));

      expect(error?.retryable).toBe(true);
      expect(error?.message).toContain('No se pudo conectar');
    });
  });
});

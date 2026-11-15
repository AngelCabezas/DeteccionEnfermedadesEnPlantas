import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CROP_LIST } from '../../core/crops';
import { AppHeader } from '../shared/app-header/app-header';
import { AppFooter } from '../shared/app-footer/app-footer';

interface Item {
  title: string;
  text: string;
}

@Component({
  selector: 'app-informacion',
  imports: [RouterLink, AppHeader, AppFooter],
  templateUrl: './informacion.html',
  styleUrl: './informacion.css',
})
export class Informacion {
  readonly crops = CROP_LIST;

  // Las cifras salen del catálogo para no desincronizarse con el panel ni con la API.
  readonly stats = [
    { value: String(CROP_LIST.length), label: 'cultivos' },
    {
      value: String(
        CROP_LIST.reduce((n, c) => n + c.detects.filter((d) => !/saludable/i.test(d)).length, 0),
      ),
      label: 'enfermedades y plagas',
    },
    { value: '< 10 s', label: 'por diagnóstico' },
    { value: '0', label: 'fotos almacenadas' },
  ];

  readonly challenges: Item[] = [
    {
      title: 'Síntomas que se confunden',
      text: 'Roya, tizón o sigatoka empiezan como manchas parecidas. Distinguirlas a simple vista requiere experiencia.',
    },
    {
      title: 'Técnicos lejos del cultivo',
      text: 'En muchas zonas rurales la visita de un agrónomo tarda días; la enfermedad no espera.',
    },
    {
      title: 'Tratar tarde o de más',
      text: 'Sin un diagnóstico temprano se pierden plantas o se aplican productos que no hacían falta.',
    },
  ];

  readonly principles: Item[] = [
    {
      title: 'Sostenibilidad',
      text: 'Detectar a tiempo evita tratamientos innecesarios y reduce pérdidas de cosecha.',
    },
    {
      title: 'Innovación',
      text: 'Un modelo especializado por cultivo, servido en formato ligero para responder rápido.',
    },
    {
      title: 'Accesibilidad',
      text: 'Interfaz en español, pensada para el móvil y conforme a WCAG 2.1 AA.',
    },
  ];

  readonly pipeline = ['Fotografía', 'Validación', 'Preprocesado', 'Modelo de IA', 'Resultado'];

  readonly stack: Item[] = [
    {
      title: 'Angular 21',
      text: 'Interfaz web reactiva, sin zona, con carga perezosa por página.',
    },
    {
      title: 'Flask',
      text: 'API en Python que recibe la imagen y devuelve el diagnóstico en JSON.',
    },
    { title: 'TensorFlow Lite', text: 'Redes neuronales de banano y café en formato ligero.' },
    { title: 'scikit-learn', text: 'Clasificador SVM para las hojas de arroz.' },
    { title: 'Firebase', text: 'Autenticación de usuarios y alojamiento del frontend.' },
  ];

  readonly timeline: Item[] = [
    {
      title: 'Investigación académica',
      text: 'Recopilación de imágenes de hojas sanas y enfermas y entrenamiento de un modelo por cultivo.',
    },
    {
      title: 'Primera plataforma',
      text: 'Una API que sirve los modelos y una web que permite subir una foto y ver la clase predicha.',
    },
    {
      title: 'Versión actual',
      text: 'Modelos optimizados, resultados explicados en lenguaje claro y una interfaz rediseñada con criterios de usabilidad (Nielsen, ISO 9241).',
    },
  ];

  readonly faqs: Item[] = [
    {
      title: '¿Qué tan fiable es el resultado?',
      text: 'Cada resultado incluye la confianza del modelo. Es una ayuda a la observación, no un diagnóstico definitivo: ante dudas consulta con un técnico agrícola.',
    },
    {
      title: '¿Se guardan mis fotografías?',
      text: 'No. La imagen se analiza en memoria en el servidor y se descarta al devolver la respuesta.',
    },
    {
      title: '¿Funciona con otros cultivos?',
      text: 'Por ahora solo con banano, arroz y café. Cada modelo se entrenó para un cultivo concreto; una foto de otra planta dará un resultado sin sentido.',
    },
    {
      title: '¿Necesito crear una cuenta?',
      text: 'Sí, solo correo y contraseña. Sirve para proteger el servicio y preparar funciones como el historial de diagnósticos.',
    },
    {
      title: '¿Por qué a veces tarda un minuto?',
      text: 'La API se aloja en un plan gratuito que se suspende tras un rato sin uso. La primera petición lo despierta; las siguientes responden en segundos.',
    },
  ];
}

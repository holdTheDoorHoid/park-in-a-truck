// Español (latinoamericano, como se habla en Filadelfia). Trato de "usted". Glosario: docs/i18n/glossary.md
import type en from '../en/site.ts';
import type { Translation } from '../../define.ts';

export default {
  'meta.description': 'Planee, construya y cuide un parque de barrio con la guía Park in a Truck.',
  'skip': 'Ir al contenido',

  'header.home': 'Park in a Truck — inicio',
  'header.menu': 'Menú',
  'nav.label': 'Principal',
  'nav.steps': 'Pasos',
  'nav.lot': 'Buscar un lote',
  'nav.planner': 'Diseñar en 3D',
  'nav.build': 'Guías de construcción',
  'nav.plants': 'Plantas',
  'nav.parks': 'Parques',
  'nav.myPark': 'Mi parque:',

  'lang.label': 'Idioma',
  'lang.choose': 'Elija un idioma',

  'notice.machine': 'Esta página se tradujo del inglés de forma automática, así que algunas palabras pueden no ser exactas.',
  'notice.readEnglish': 'Leerla en inglés',
  'notice.notReady': 'El {language} llegará pronto; por ahora esta página está en inglés.',

  'offer.question': '¿Ver este sitio en español?',
  'offer.yes': 'Sí',
  'offer.no': 'No, gracias',

  'footer.about':
    'Una guía para crear parques de barrio usted mismo, del Programa de Arquitectura del Paisaje y el Laboratorio de Innovación Social y Urbana de Thomas Jefferson University, en Filadelfia. El contenido de la guía y de los cuadernos de trabajo es de ellos y se usa con su permiso.',
  'footer.questions': '¿Preguntas?',
  'footer.aboutSite': 'Sobre este sitio',
  'footer.saved':
    'Sus respuestas y diseños se guardan solamente en este navegador. Use <a href="{href}">Mi parque</a> para guardar una copia o compartirla con su comité.',
  'footer.resources': 'Recursos, socios y prensa',
  'footer.legal': 'Aviso legal',

  'welcome.eyebrow': 'Bienvenido de nuevo',
  'welcome.lot': 'Siga con su lote en {address}.',
  'welcome.project': 'Siga con su proyecto.',
  'welcome.continue': 'Seguir: {title} →',
  'welcome.myPark': 'Ver Mi parque →',

  'path.subDone': 'subpasos hechos',
} satisfies Translation<typeof en>;

// Español — páginas de las guías de construcción. El texto de cada guía está en
// src/i18n/data/es/guides/<slug>.json. Glosario: docs/i18n/glossary.md
import type en from '../en/guides.ts';
import type { Translation } from '../../define.ts';

export default {
  'cat.seating': 'Asientos',
  'cat.tables': 'Mesas y superficies de trabajo',
  'cat.planters': 'Jardineras',
  'cat.structures': 'Estructuras',

  'crumb': 'Guías de construcción',
  'heroAlt': 'Así se ve una vez armado: {title}',
  'dims': '{length} de largo × {width} de ancho × {height} de alto',
  'glance.size': 'Tamaño',
  'glance.time': 'Tiempo',
  'glance.people': 'Personas',
  'glance.skill': 'Habilidad',
  'glance.cost': 'Costo',
  'asBuilt': 'Armada con estas piezas, mide {size}.',
  'pdf': 'PDF original',
  'print': '🖨 Imprimir',

  'need': 'Lo que necesita',
  'materials': 'Materiales y herrajes',
  'tools': 'Herramientas',
  'cut': 'Lista de cortes',
  'cut.part': 'Pieza',
  'cut.qty': 'Cant.',
  'cut.stock': 'Madera',
  'cut.length': 'Largo',
  'cut.notes': 'Notas',
  'siteNote': 'Nota de este sitio, no de Park in a Truck:',
  'steps': 'Pasos',
  'step': 'Paso {n}',
  'model': 'Modelo 3D de: {title}',
  'finishing': 'Acabado',
  'safety': 'Antes de empezar',
  'links': 'Proveedores y enlaces útiles',
  'source': 'Fuente: {pages}',
  'download': 'Descargar el PDF de {title}',
  'pager': 'Guías',
  'close': 'Cerrar',
  'notTranslated': 'Esta guía todavía no está traducida, así que se muestra en inglés.',

  'index.description':
    'Instrucciones de armado paso a paso, al estilo de Ikea, para las bancas, mesas, jardineras, asientos de gavión, una estructura de sombra y un escenario de Park in a Truck.',
  'index.lede':
    'Ahora es momento de ver cómo se construyen los elementos del parque. Algunos elementos tienen instrucciones propias, o ensamblajes: guías paso a paso para ayudarle a construirlos. Una banca, por ejemplo, viene con un juego de instrucciones al estilo de Ikea. Otros elementos vienen con un diseño o una forma sugerida de construirlos a partir de instrucciones ya probadas. Y otros son simplemente productos que se compran hechos.',
  'index.prose':
    'Abajo están los trece elementos para los que Park in a Truck publica instrucciones de armado propias. Elija uno para ver su lista completa de materiales, la lista de cortes y los pasos numerados con los diagramas originales, o descargue el PDF original. Marque los materiales y las herramientas a medida que los consiga; sus marcas se guardan en este navegador.',
} satisfies Translation<typeof en>;

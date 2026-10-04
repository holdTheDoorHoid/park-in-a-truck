// Español — volante de la reunión. Frases cortas: se imprimen en letra grande.
import type en from '../en/flyer.ts';
import type { Translation } from '../../define.ts';

export default {
  'eyebrow': 'Está invitado',
  'headline': 'Reunión de la comunidad: un parque nuevo para nuestro barrio',
  'when': 'Cuándo',
  'where': 'Dónde',
  'lot': 'El lote',
  'contact': '¿Preguntas? Comuníquese con',
  'committee': 'Nuestro comité del parque',
  'credit': 'Hecho con la guía Park in a Truck · Thomas Jefferson University',

  'ui.empty':
    'Llene arriba la fecha, la hora, el lugar y el propósito de la reunión (y agregue a alguien del comité) para ver cómo queda su volante.',
  'ui.noContact': 'Agregue arriba a alguien del comité para poner aquí un contacto.',
  'ui.print': '🖨 Imprimir volante',
  'ui.language': 'Idioma del volante',
  'ui.second': 'Segundo idioma, lado a lado',
  'ui.none': 'Ninguno',
  'ui.notReady': '{language} (todavía sin traducir)',
  'ui.purpose2': 'Propósito, en {language} (opcional)',
  'ui.purpose2Hint': 'Lo que escribió arriba se imprime tal cual; agregue aquí una traducción para la segunda columna.',
} satisfies Translation<typeof en>;

// Español — mapa de parques y página /parks/. Los nombres de los parques y las direcciones no cambian.
import type en from '../en/parks.ts';
import type { Translation } from '../../define.ts';

export default {
  'page.title': 'Parques ya construidos',
  'page.description': 'Parques de barrio de verdad, ya construidos con la guía Park in a Truck en distintas partes de Filadelfia.',
  'page.eyebrow': 'Hechos con Park in a Truck',
  'page.lede':
    'Los vecinos ya usaron esta guía para construir parques de verdad en distintas partes de Filadelfia. Aquí está dónde, con lo que se sabe de cada uno: haga clic en un marcador o en una tarjeta para ver la historia, las fotos y lo que dijo la prensa.',
  'park.opened': 'inaugurado en {year}',
  'photo.credit': '{caption} — {credit}',
  'video.alt': 'Video: {title}',
  'link.english': '(en inglés)',
  'park.source': 'Fuente: {source}',

  'map.label': 'Mapa de los parques construidos con Park in a Truck',
  'map.details': 'Ver detalles',
  'map.close': 'Cerrar',
  'map.print': 'Vea el mapa interactivo en internet, o la lista de parques de abajo.',
} satisfies Translation<typeof en>;

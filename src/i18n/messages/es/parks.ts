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
  'source.toolkitPage': 'guía Park in a Truck, pág. {page}',
  'source.toolkitPages': 'guía Park in a Truck, págs. {pages}',
  'source.toolkitAck': 'guía Park in a Truck, pág. {page}, agradecimientos',
  'source.linktree': 'Linktree de Park in a Truck',
  'source.linktreeOnly': 'solo el Linktree de Park in a Truck',
  'source.unconfirmedElsewhere': 'no confirmado en otras fuentes',
  'source.unconfirmedBeyond': 'sin otra confirmación',
  'source.jeffersonNews': 'noticias de Jefferson',
  'source.sep': '; ',
  'photo.via': '{name}, vía la guía Park in a Truck',
  'photo.toolkit': 'guía Park in a Truck',

  'map.label': 'Mapa de los parques construidos con Park in a Truck',
  'map.details': 'Ver detalles',
  'map.close': 'Cerrar',
  'map.print': 'Vea el mapa interactivo en internet, o la lista de parques de abajo.',
} satisfies Translation<typeof en>;

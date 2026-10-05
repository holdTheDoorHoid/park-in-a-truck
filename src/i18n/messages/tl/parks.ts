// Tagalog — the parks map and the /parks/ page. Park names and addresses never change.
// Glossary: docs/i18n/glossary.md (tl section)
import type en from '../en/parks.ts';
import type { Translation } from '../../define.ts';

export default {
  'page.title': 'Mga parkeng naitayo na',
  'page.description': 'Mga totoong parke sa kapitbahayan sa paligid ng Philadelphia na naitayo na gamit ang Toolkit ng Park in a Truck.',
  'page.eyebrow': 'Itinayo gamit ang Park in a Truck',
  'page.lede':
    'Nagamit na ng mga kapitbahay ang toolkit na ito para magtayo ng mga totoong parke sa paligid ng Philadelphia. Narito kung saan, kasama ang nalalaman tungkol sa bawat isa — i-click ang isang pin o card para sa kuwento, mga larawan at balita.',
  'park.opened': 'binuksan noong {year}',
  'photo.credit': '{caption} — {credit}',
  'video.alt': 'Video: {title}',
  'link.english': '(sa Ingles)',
  'park.source': 'Pinagmulan: {source}',

  'source.toolkitPage': 'Toolkit ng Park in a Truck, pahina {page}',
  'source.toolkitPages': 'Toolkit ng Park in a Truck, mga pahina {pages}',
  'source.toolkitAck': 'Toolkit ng Park in a Truck, pahina {page}, mga pasasalamat',
  'source.linktree': 'Linktree ng Park in a Truck',
  'source.linktreeOnly': 'Linktree lang ng Park in a Truck',
  'source.unconfirmedElsewhere': 'hindi kumpirmado sa ibang pinagmulan',
  'source.unconfirmedBeyond': 'wala nang ibang kumpirmasyon',
  'source.jeffersonNews': 'balita ng Jefferson',
  'photo.via': '{name}, mula sa Toolkit ng Park in a Truck',
  'photo.toolkit': 'Toolkit ng Park in a Truck',

  'map.label': 'Mapa ng mga parkeng itinayo gamit ang Park in a Truck',
  'map.details': 'Tingnan ang detalye',
  'map.close': 'Isara',
  'map.print': 'Tingnan online ang interactive na mapa, o ang listahan ng mga parke sa ibaba.',
} satisfies Translation<typeof en>;

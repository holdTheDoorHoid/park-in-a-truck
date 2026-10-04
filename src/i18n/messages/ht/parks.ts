// Kreyòl ayisyen — kat pak yo ak paj /parks/. Non pak ak adrès pa chanje. Glosè: docs/i18n/glossary.md
import type en from '../en/parks.ts';
import type { Translation } from '../../define.ts';

export default {
  'page.title': 'Pak ki deja fèt',
  'page.description': 'Vrè pak nan katye ki deja bati ak gid Park in a Truck la toupatou nan Filadèlfi.',
  'page.eyebrow': 'Bati ak Park in a Truck',
  'page.lede':
    'Vwazen deja sèvi ak gid sa a pou bati vrè pak toupatou nan Filadèlfi. Men ki kote, ak sa nou konnen sou chak — klike sou yon pwen oswa yon kat pou istwa a, foto yo ak sa laprès ekri.',
  'park.opened': 'louvri an {year}',
  'photo.credit': '{caption} — {credit}',
  'video.alt': 'Videyo: {title}',
  'link.english': '(an anglè)',
  'park.source': 'Sous: {source}',

  'map.label': 'Kat pak ki bati ak Park in a Truck',
  'map.details': 'Gade detay yo',
  'map.close': 'Fèmen',
  'map.print': 'Gade kat entèaktif la sou entènèt, oswa lis pak ki anba a.',
} satisfies Translation<typeof en>;

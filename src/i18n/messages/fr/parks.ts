// Français. « vous ». Les noms des parcs et les adresses ne changent pas.
import type en from '../en/parks.ts';
import type { Translation } from '../../define.ts';

export default {
  'page.title': 'Les parcs déjà construits',
  'page.description': 'De vrais parcs de quartier déjà construits avec la boîte à outils Park in a Truck, un peu partout à Philadelphie.',
  'page.eyebrow': 'Construits avec Park in a Truck',
  'page.lede':
    'Des voisins ont déjà utilisé cette boîte à outils pour construire de vrais parcs un peu partout à Philadelphie. Voici où, avec ce que l’on sait de chacun : cliquez sur un repère ou sur une fiche pour l’histoire, les photos et les articles de presse.',
  'park.opened': 'ouvert en {year}',
  'photo.credit': '{caption} — {credit}',
  'video.alt': 'Vidéo : {title}',
  'link.english': '(en anglais)',
  'park.source': 'Source : {source}',

  'map.label': 'Carte des parcs construits avec Park in a Truck',
  'map.details': 'Voir les détails',
  'map.close': 'Fermer',
  'map.print': 'Consultez la carte interactive en ligne, ou la liste des parcs ci-dessous.',
} satisfies Translation<typeof en>;

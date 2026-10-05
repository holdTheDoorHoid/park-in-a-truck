// Français. « vous ». Les noms des parcs et les adresses ne changent pas.
import type en from '../en/parks.ts';
import type { Translation } from '../../define.ts';

export default {
  'page.title': 'Les parcs déjà construits',
  'page.description': 'De vrais parcs de quartier déjà construits avec la boîte à outils Park in a Truck, un peu partout à Philadelphie.',
  'page.eyebrow': 'Construits avec Park in a Truck',
  'page.lede':
    'Des voisins ont déjà utilisé cette boîte à outils pour construire de vrais parcs un peu partout à Philadelphie. Voici où, avec ce que l’on sait de chacun : cliquez sur un repère ou sur une fiche pour l’histoire, les photos et les articles de presse.',
  'park.opened': 'ouvert en {year}',
  'photo.credit': '{caption} — {credit}',
  'video.alt': 'Vidéo : {title}',
  'link.english': '(en anglais)',
  'park.source': 'Source : {source}',
  'source.toolkitPage': 'boîte à outils Park in a Truck, p. {page}',
  'source.toolkitPages': 'boîte à outils Park in a Truck, p. {pages}',
  'source.toolkitAck': 'boîte à outils Park in a Truck, p. {page}, remerciements',
  'source.linktree': 'Linktree de Park in a Truck',
  'source.linktreeOnly': 'Linktree de Park in a Truck uniquement',
  'source.unconfirmedElsewhere': 'non confirmé ailleurs',
  'source.unconfirmedBeyond': 'aucune autre confirmation',
  'source.jeffersonNews': 'actualités de Jefferson',
  'source.sep': ' ; ',
  'photo.via': '{name}, via la boîte à outils Park in a Truck',
  'photo.toolkit': 'boîte à outils Park in a Truck',

  'map.label': 'Carte des parcs construits avec Park in a Truck',
  'map.details': 'Voir les détails',
  'map.close': 'Fermer',
  'map.print': 'Consultez la carte interactive en ligne, ou la liste des parcs ci-dessous.',
} satisfies Translation<typeof en>;

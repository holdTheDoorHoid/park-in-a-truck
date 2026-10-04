// Français. « vous ». Textes courts : ils s'impriment en gros caractères sur une demi-page.
import type en from '../en/flyer.ts';
import type { Translation } from '../../define.ts';

export default {
  'eyebrow': 'Vous êtes invités',
  'headline': 'Réunion de quartier : un nouveau parc pour notre quartier',
  'when': 'Quand',
  'where': 'Où',
  'lot': 'Le terrain',
  'contact': 'Des questions ? Contactez',
  'committee': 'Notre comité du parc',
  'credit': 'Réalisé avec la boîte à outils Park in a Truck · Thomas Jefferson University',

  'ui.empty': 'Remplissez ci-dessus la date, l’heure, le lieu et le but de la réunion (et ajoutez un membre du comité) pour voir votre affiche prendre forme.',
  'ui.noContact': 'Ajoutez un membre du comité ci-dessus pour mettre un contact ici.',
  'ui.print': '🖨 Imprimer l’affiche',
  'ui.language': 'Langue de l’affiche',
  'ui.second': 'Deuxième langue, côte à côte',
  'ui.none': 'Aucune',
  'ui.notReady': '{language} (pas encore traduit)',
  'ui.purpose2': 'But, en {language} (facultatif)',
  'ui.purpose2Hint': 'Ce que vous avez écrit ci-dessus s’imprime tel quel ; ajoutez ici une traduction pour la deuxième colonne.',
} satisfies Translation<typeof en>;

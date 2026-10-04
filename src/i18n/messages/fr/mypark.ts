// Français. « vous ». Glossaire : docs/i18n/glossary.md
import type en from '../en/mypark.ts';
import type { Translation } from '../../define.ts';

export default {
  'project.newDefault': 'Nouveau parc',
  'list.openNow': '(ouvert)',
  'list.open': 'Ouvrir',
  'list.delete': 'Supprimer',
  'list.deleteLabel': 'Supprimer {name}',
  'delete.confirm': 'Supprimer « {name} » de ce navigateur ? Ce sera définitif, sauf si vous avez enregistré un fichier du projet.',
  'delete.done': '{name} : supprimé.',
  'import.opened': '« {name} » est ouvert. C’est maintenant votre projet actif.',
  'import.notProject': 'Ce n’est pas un fichier de projet Park in a Truck.',

  'lot.address': 'Adresse',
  'lot.owner': 'Propriétaire',
  'lot.size': 'Taille du terrain',
  'lot.zoning': 'Zonage',
  'lot.ownerLine': '{owner} — {kind}',
  'lot.measured': '{width} × {length} · {area} (mesuré d’après le contour de la parcelle de la Ville)',
  'lot.record': '{frontage} × {depth} pi · {area} (registre foncier de la Ville)',
  'lot.recordNoArea': '{frontage} × {depth} pi (registre foncier de la Ville)',
  'lot.none': 'Aucun terrain choisi pour l’instant. Cherchez-en un à l’<a href="{href}">étape 1 : Acquérir</a>.',
  'answers.none': 'Rien n’a encore été rempli.',
} satisfies Translation<typeof en>;

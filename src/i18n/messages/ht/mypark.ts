// Kreyòl ayisyen — script paj Pak mwen an (lis pwojè, rezime teren an ak repons yo). Glosè: docs/i18n/glossary.md
import type en from '../en/mypark.ts';
import type { Translation } from '../../define.ts';

export default {
  'project.newDefault': 'Nouvo pak',
  'list.openNow': '(louvri)',
  'list.open': 'Louvri',
  'list.delete': 'Efase',
  'list.deleteLabel': 'Efase {name}',
  'delete.confirm': 'Efase “{name}” nan navigatè sa a? Ou p ap ka fè l tounen, sof si ou te sere yon fichye pwojè.',
  'delete.done': '{name} efase.',
  'import.opened': 'Nou louvri “{name}”. Se pwojè aktif ou a kounye a.',
  'import.notProject': 'Sa a se pa yon fichye pwojè Park in a Truck.',

  'lot.address': 'Adrès',
  'lot.owner': 'Mèt',
  'lot.size': 'Gwosè teren an',
  'lot.zoning': 'Zonaj',
  'lot.ownerLine': '{owner} — {kind}',
  'lot.measured': '{width} × {length} · {area} (mezire sou limit pasèl Vil la)',
  'lot.record': '{frontage} × {depth} pye · {area} (dosye pwopriyete Vil la)',
  'lot.recordNoArea': '{frontage} × {depth} pye (dosye pwopriyete Vil la)',
  'lot.none': 'Ou poko chwazi yon teren. Chèche youn nan <a href="{href}">Etap 1: Jwenn teren</a>.',
  'answers.none': 'Ou poko ranpli anyen.',
} satisfies Translation<typeof en>;

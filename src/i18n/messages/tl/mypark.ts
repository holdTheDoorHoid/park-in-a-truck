// Tagalog — the My park page's script: project list, opening a file, lot and answers summary.
// Glossary: docs/i18n/glossary.md (tl section)
import type en from '../en/mypark.ts';
import type { Translation } from '../../define.ts';

export default {
  'project.newDefault': 'Bagong parke',
  'list.openNow': '(nakabukas)',
  'list.open': 'Buksan',
  'list.delete': 'Burahin',
  'list.deleteLabel': 'Burahin ang {name}',
  'delete.confirm': 'Burahin ang “{name}” sa browser na ito? Hindi na ito maibabalik maliban kung nag-save kayo ng file ng proyekto.',
  'delete.done': 'Nabura ang {name}.',
  'import.opened': 'Nabuksan ang “{name}”. Ito na ang inyong aktibong proyekto.',
  'import.notProject': 'Hindi ito file ng proyekto ng Park in a Truck.',

  'lot.address': 'Address',
  'lot.owner': 'May-ari',
  'lot.size': 'Laki ng lote',
  'lot.zoning': 'Zoning',
  'lot.ownerLine': '{owner} — {kind}',
  'lot.measured': '{width} × {length} · {area} (sinukat mula sa hugis ng parsela sa mapa ng Lungsod)',
  'lot.record': '{frontage} × {depth} ft · {area} (rekord ng ari-arian sa Lungsod)',
  'lot.recordNoArea': '{frontage} × {depth} ft (rekord ng ari-arian sa Lungsod)',
  'lot.none': 'Wala pang napiling lote. Maghanap sa <a href="{href}">Hakbang 1: Kumuha ng lote</a>.',
  'answers.none': 'Wala pang nasasagutan.',
} satisfies Translation<typeof en>;

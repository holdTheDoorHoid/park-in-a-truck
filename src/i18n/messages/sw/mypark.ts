// Kiswahili. Msomaji ni "wewe". Glossary: docs/i18n/glossary.md (### sw).
import type en from '../en/mypark.ts';
import type { Translation } from '../../define.ts';

export default {
  'project.newDefault': 'Bustani mpya',
  'list.openNow': '(imefunguliwa)',
  'list.open': 'Fungua',
  'list.delete': 'Futa',
  'list.deleteLabel': 'Futa {name}',
  'delete.confirm': 'Ungependa kufuta “{name}” kutoka kwenye kivinjari hiki? Hili haliwezi kutenduliwa isipokuwa kama ulihifadhi faili la mradi.',
  'delete.done': 'Umefuta {name}.',
  'import.opened': 'Umefungua “{name}”. Sasa ndio mradi wako unaotumika.',
  'import.notProject': 'Hili si faili la mradi wa Park in a Truck.',

  'lot.address': 'Anwani',
  'lot.owner': 'Mmiliki',
  'lot.size': 'Ukubwa wa kiwanja',
  'lot.zoning': 'Zoning',
  'lot.ownerLine': '{owner} — {kind}',
  'lot.measured': '{width} × {length} · {area} (kimepimwa kutoka kwenye mpaka wa kipande cha ardhi kwenye ramani ya Jiji)',
  'lot.record': 'futi {frontage} × {depth} · {area} (kumbukumbu ya mali ya Jiji)',
  'lot.recordNoArea': 'futi {frontage} × {depth} (kumbukumbu ya mali ya Jiji)',
  'lot.none': 'Bado hujachagua kiwanja. Tafuta kimoja katika <a href="{href}">Hatua ya 1: Pata kiwanja</a>.',
  'answers.none': 'Bado hakuna kilichojazwa.',
} satisfies Translation<typeof en>;

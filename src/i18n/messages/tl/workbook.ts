// Tagalog — workbook components, chapter page, "mark done" toggles and progress, City-record words.
// Glossary: docs/i18n/glossary.md (tl section)
import type en from '../en/workbook.ts';
import type { Translation } from '../../define.ts';

export default {
  'project.default': 'Aking parke',

  'callout.tip': 'Payo',
  'callout.note': 'Tandaan',
  'callout.warning': 'Mag-ingat',
  'callout.contact': 'Humingi ng tulong',
  'callout.auto': 'Ginawa na para sa inyo',
  'callout.site': 'Paalala mula sa site na ito, hindi mula sa Park in a Truck',

  'field.choose': 'Pumili…',
  'field.auto': '✓ Kinuha mula sa mga rekord ng Lungsod — mag-type para baguhin',
  'list.noscript': 'I-on ang JavaScript para masagutan ang talahanayang ito, o i-print ang orihinal na pahina ng workbook.',
  'list.row': 'hilera',
  'list.add': '+ Magdagdag ng {row}',
  'list.fillFirst': 'Sagutan muna ang {row} sa itaas, o lagyan ito ng kahit ano.',
  'list.remove': 'Alisin',
  'list.removeRow': 'Alisin ang hilera {n}',
  'list.removed': 'Inalis ang {row}.',
  'list.cell': '{label}, hilera {n}',

  'done.mark': 'Markahang tapos na ang hakbang na ito',
  'done.done': 'Tapos na — magaling!',
  'done.badge': '✓ tapos na',
  'progress.of': '{done} sa {total}',
  'progress.done': '{done} sa {total} ang tapos na',
  'progress.total': '{done} sa {total} hakbang ang tapos na',

  'pdf.label': 'Orihinal na pahina ng workbook',
  'pdf.page': '(pahina {page} ng PDF)',
  'file.english': 'sa Ingles',
  'figure.credit': 'Larawan: {credit}',

  'chapter.pdf': '📄 Orihinal na workbook (PDF)',
  'chapter.print': '🖨 I-print ang aking mga sagot',
  'chapter.toc': 'Sa hakbang na ito',
  'chapter.pager': 'Mga hakbang',
  'chapter.prev': '← {title}',
  'chapter.prevStep': '← Hakbang {n}: {title}',
  'chapter.next': 'Susunod: Hakbang {n} — {title} →',
  'chapter.notTranslated':
    'Hindi pa naisasalin ang kabanatang ito, kaya nasa Ingles ito. Pareho ang pag-save ng inyong mga sagot sa bawat wika.',

  'notice.title': 'Paalala ng site',
  'notice.lot':
    'Hindi pa ninyo naitatala ang pahintulot para sa inyong lote — kailangan ninyo ito bago magsimula ang anumang paghuhukay o paggawa. <a href="{href}">Pumunta sa Kumuha ng lote → Siguruhin ang inyong lote</a>.',
  'notice.dismiss': 'Isara',

  'auto.owner.city': 'Lungsod ng Philadelphia (pampubliko)',
  'auto.owner.landbank': 'Philadelphia Land Bank (pampubliko)',
  'auto.owner.pha': 'Philadelphia Housing Authority (pampubliko)',
  'auto.owner.redevelopment': 'Philadelphia Redevelopment Authority (pampubliko)',
  'auto.owner.other-public': 'Ibang ahensiya ng pamahalaan',
  'auto.owner.private': 'Pribadong may-ari (tao, organisasyon o negosyo)',
  'auto.owner.unknown': 'Hindi alam',
  'auto.lot.mid-block': 'Lote sa gitna ng block',
  'auto.lot.corner': 'Lote sa kanto',
  'auto.lot.alley': 'Breezeway / eskinita / easement',
  'auto.lot.unknown': 'Hindi sigurado',
  'auto.sun.full-sun': 'Buong araw, maghapon',
  'auto.sun.mostly-sun': 'Halos buong araw',
  'auto.sun.mostly-shade': 'Halos lilim',
  'auto.sun.deep-shade': 'Malalim na lilim, maghapon',
  'auto.kind.interior': 'Lote sa gitna ng block',
  'auto.kind.corner-right': 'Lote sa kanto (kalye sa kanan)',
  'auto.kind.corner-left': 'Lote sa kanto (kalye sa kaliwa)',
  'auto.trees.none': 'Walang puno',
  'auto.trees.few': 'Isa o dalawang puno',
  'auto.trees.several': 'Ilang puno',
  'auto.yes': 'Oo',
  'auto.no': 'Hindi',
  'auto.sqft': '{n} sq ft',
  'auto.ft': '{n} ft',
  'auto.size': 'Laki {size}',
} satisfies Translation<typeof en>;

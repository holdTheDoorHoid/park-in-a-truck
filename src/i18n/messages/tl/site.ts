// Tagalog — header, language box, notices, footer, step path. "kayo/ninyo", "po" only when speaking to the reader.
// Glossary: docs/i18n/glossary.md (tl section)
import type en from '../en/site.ts';
import type { Translation } from '../../define.ts';

export default {
  'meta.description': 'Magplano, magtayo at mag-alaga ng parke sa inyong kapitbahayan gamit ang Toolkit ng Park in a Truck.',
  'skip': 'Lumaktaw sa nilalaman',

  'header.home': 'Park in a Truck — home',
  'header.menu': 'Menu',
  'nav.label': 'Pangunahin',
  'nav.steps': 'Hakbang',
  'nav.lot': 'Maghanap ng lote',
  'nav.planner': 'Plano sa 3D',
  'nav.build': 'Gabay sa pagbuo',
  'nav.plants': 'Halaman',
  'nav.parks': 'Parke',
  'nav.myPark': 'Aking parke:',

  'lang.label': 'Wika',
  'lang.choose': 'Pumili ng wika',

  'notice.machine': 'Isinalin ng makina mula sa Ingles ang pahinang ito, kaya maaaring may ilang salitang hindi tama.',
  'notice.readEnglish': 'Basahin sa Ingles',
  'notice.notReady': 'Malapit nang dumating ang {language} — nasa Ingles pa ang pahinang ito.',

  'offer.question': 'Gusto po ba ninyong makita ang site na ito sa Tagalog?',
  'offer.yes': 'Oo',
  'offer.no': 'Hindi, salamat po',

  'footer.about':
    'Isang toolkit para kayo mismo ang gumawa ng parke sa inyong kapitbahayan, mula sa Landscape Architecture Program at sa Lab for Social and Urban Innovation ng Thomas Jefferson University, Philadelphia. Sa kanila ang nilalaman ng Toolkit at ng mga workbook, at ginagamit ito nang may pahintulot nila.',
  'footer.questions': 'May tanong?',
  'footer.aboutSite': 'Tungkol sa site na ito',
  'footer.saved':
    'Sa browser na ito lang naka-save ang inyong mga sagot at disenyo. Gamitin ang <a href="{href}">Aking parke</a> para mag-save ng kopya o ibahagi ito sa inyong komite.',
  'footer.resources': 'Mga mapagkukunan, katuwang at balita',
  'footer.legal': 'Paunawang legal',

  'welcome.eyebrow': 'Maligayang pagbabalik po',
  'welcome.lot': 'Ituloy ang inyong lote sa {address}.',
  'welcome.project': 'Ituloy ang inyong proyekto.',
  'welcome.continue': 'Ituloy: {title} →',
  'welcome.myPark': 'Tingnan ang Aking parke →',

  'path.subDone': 'maliliit na hakbang na tapos na',
} satisfies Translation<typeof en>;

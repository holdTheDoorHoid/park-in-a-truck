// Tagalog — the printable meeting flyer. Speaks to the whole street, so it uses "po" and "kayo".
// Glossary: docs/i18n/glossary.md (tl section)
import type en from '../en/flyer.ts';
import type { Translation } from '../../define.ts';

export default {
  'eyebrow': 'Inaanyayahan po namin kayo',
  'headline': 'Pulong ng komunidad: isang bagong parke para sa ating kapitbahayan',
  'when': 'Kailan',
  'where': 'Saan',
  'lot': 'Ang lote',
  'contact': 'May tanong? Makipag-ugnayan sa:',
  'committee': 'Ang aming komite ng parke',
  'credit': 'Ginawa gamit ang Toolkit ng Park in a Truck · Thomas Jefferson University',

  'ui.empty': 'Ilagay sa itaas ang petsa, oras, lugar at layunin ng pulong (at magdagdag ng kasapi ng komite) para makita ang inyong flyer.',
  'ui.noContact': 'Magdagdag ng kasapi ng komite sa itaas para may makontak dito.',
  'ui.print': '🖨 I-print ang flyer',
  'ui.language': 'Wika ng flyer',
  'ui.second': 'Ikalawang wika, magkatabi',
  'ui.none': 'Wala',
  'ui.notReady': '{language} (hindi pa naisasalin)',
  'ui.purpose2': 'Layunin, sa {language} (hindi kailangan)',
  'ui.purpose2Hint': 'Ipi-print nang gaya ng pagkakasulat ang itinype ninyo sa itaas; maglagay rito ng salin para sa ikalawang hanay.',
} satisfies Translation<typeof en>;

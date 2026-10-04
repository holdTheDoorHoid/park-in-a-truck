// Kreyòl ayisyen — fèy envitasyon pou reyinyon an. Fraz kout: yo enprime an gwo lèt.
import type en from '../en/flyer.ts';
import type { Translation } from '../../define.ts';

export default {
  'eyebrow': 'Ou envite',
  'headline': 'Reyinyon kominote: yon nouvo pak pou katye nou',
  'when': 'Kilè',
  'where': 'Ki kote',
  'lot': 'Teren an',
  'contact': 'Kesyon? Kontakte',
  'committee': 'Komite pak nou an',
  'credit': 'Fèt ak gid Park in a Truck la · Thomas Jefferson University',

  'ui.empty':
    'Ranpli dat, lè, kote ak rezon reyinyon an anwo a (epi ajoute yon manm komite a) pou w wè fèy ou a ap pran fòm.',
  'ui.noContact': 'Ajoute yon manm komite a anwo a pou mete yon moun pou kontakte isit la.',
  'ui.print': '🖨 Enprime fèy la',
  'ui.language': 'Lang fèy la',
  'ui.second': 'Yon dezyèm lang, bò kote premye a',
  'ui.none': 'Okenn',
  'ui.notReady': '{language} (poko tradui)',
  'ui.purpose2': 'Rezon reyinyon an, an {language} (si ou vle)',
  'ui.purpose2Hint': 'Sa w ekri anwo a ap enprime jan li ye a; ajoute yon tradiksyon isit la pou dezyèm kolòn nan.',
} satisfies Translation<typeof en>;

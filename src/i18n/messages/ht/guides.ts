// Kreyòl ayisyen — paj gid konstriksyon yo. Tèks chak gid la nan
// src/i18n/data/ht/guides/<slug>.json. Glosè: docs/i18n/glossary.md
import type en from '../en/guides.ts';
import type { Translation } from '../../define.ts';

export default {
  'cat.seating': 'Pou chita',
  'cat.tables': 'Tab ak sifas travay',
  'cat.planters': 'Bwat plant',
  'cat.structures': 'Estrikti',

  'crumb': 'Gid konstriksyon',
  'heroAlt': '{title}, fin monte',
  'dims': '{length} longè × {width} lajè × {height} wotè',
  'glance.size': 'Gwosè',
  'glance.time': 'Tan',
  'glance.people': 'Moun',
  'glance.skill': 'Konpetans',
  'glance.cost': 'Pri',
  'asBuilt': 'Lè w bati l ak pyès sa yo, li mezire {size}.',
  'pdf': 'PDF orijinal la',
  'print': '🖨 Enprime',

  'need': 'Sa w bezwen',
  'materials': 'Materyèl ak pyès metal',
  'tools': 'Zouti',
  'cut': 'Lis koupe',
  'cut.part': 'Pyès',
  'cut.qty': 'Kantite',
  'cut.stock': 'Bwa',
  'cut.length': 'Longè',
  'cut.notes': 'Nòt',
  'siteNote': 'Nòt sit sa a, se pa nòt Park in a Truck:',
  'steps': 'Etap yo',
  'step': 'Etap {n}',
  'model': 'Modèl 3D: {title}',
  'finishing': 'Fini travay la',
  'safety': 'Anvan ou kòmanse',
  'links': 'Lyen pou founisè ak resous',
  'source': 'Sous: {pages}',
  'download': 'Telechaje PDF la: {title}',
  'pager': 'Gid yo',
  'close': 'Fèmen',
  'notTranslated': 'Gid sa a poko tradui, se pou sa li parèt an anglè.',

  'index.description':
    'Enstriksyon etap pa etap, tankou pou mèb Ikea, pou ban, tab, bwat plant, ban gabyon, yon abri lonbraj ak yon sèn Park in a Truck.',
  'index.lede':
    'Kounye a se lè pou w wè kijan pou bati eleman pak yo. Gen kèk eleman ki gen pwòp enstriksyon pa yo, oswa "montaj" — gid etap pa etap pou ede w bati yo. Yon ban, pa egzanp, vini ak yon seri enstriksyon tankou pou mèb Ikea. Lòt eleman vini ak yon desen oswa yon fason yo konseye pou bati yo, ki soti nan enstriksyon moun deja teste. Gen lòt ankò ki se jis pwodui ou achte tou fèt nan magazen.',
  'index.prose':
    'Anba a, w ap jwenn trèz eleman Park in a Truck pibliye pwòp enstriksyon montaj pou yo. Chwazi youn pou w wè tout lis materyèl li, lis koupe li ak etap nimewote yo ak desen orijinal yo — oswa telechaje PDF orijinal la. Make materyèl ak zouti yo pandan w ap ranmase yo; mak ou yo anrejistre nan navigatè sa a.',
} satisfies Translation<typeof en>;

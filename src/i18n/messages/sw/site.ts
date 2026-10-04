// Kiswahili (sanifu, kwa wasomaji kutoka Kenya, Tanzania, Uganda na DRC wanaoishi Philadelphia).
// Msomaji ni "wewe". Glossary: docs/i18n/glossary.md (### sw).
import type en from '../en/site.ts';
import type { Translation } from '../../define.ts';

export default {
  'meta.description': 'Panga, jenga na tunza bustani ya mtaa wako ukitumia mwongozo wa Park in a Truck.',
  'skip': 'Ruka hadi maudhui',

  'header.home': 'Park in a Truck — mwanzo',
  'header.menu': 'Menyu',
  'nav.label': 'Menyu kuu',
  'nav.steps': 'Hatua',
  'nav.lot': 'Tafuta kiwanja',
  'nav.planner': 'Panga kwa 3D',
  'nav.build': 'Ujenzi',
  'nav.plants': 'Mimea',
  'nav.parks': 'Bustani',
  'nav.myPark': 'Bustani yangu:',

  'lang.label': 'Lugha',
  'lang.choose': 'Chagua lugha',

  'notice.machine': 'Ukurasa huu ulitafsiriwa kutoka Kiingereza kwa mashine, kwa hiyo baadhi ya maneno huenda yasiwe sahihi.',
  'notice.readEnglish': 'Soma kwa Kiingereza',
  'notice.notReady': '{language}: tafsiri inakuja hivi karibuni — kwa sasa ukurasa huu uko kwa Kiingereza.',

  'offer.question': 'Ungependa kuona tovuti hii kwa Kiswahili?',
  'offer.yes': 'Ndiyo',
  'offer.no': 'Hapana, asante',

  'footer.about':
    'Mwongozo wa kujifanyia mwenyewe wa kujenga bustani za mtaa, kutoka Programu ya Usanifu wa Mandhari (Landscape Architecture) na Maabara ya Ubunifu wa Kijamii na Mijini (LUSI) ya Thomas Jefferson University, Philadelphia. Maudhui ya mwongozo na ya vitabu vya kazi ni yao, na yanatumiwa hapa kwa ruhusa yao.',
  'footer.questions': 'Una maswali?',
  'footer.aboutSite': 'Kuhusu tovuti hii',
  'footer.saved': 'Majibu yako na miundo yako huhifadhiwa kwenye kivinjari hiki tu. Tumia <a href="{href}">Bustani yangu</a> kuhifadhi nakala au kuishiriki na kamati yako.',
  'footer.resources': 'Rasilimali, washirika na habari',
  'footer.legal': 'Taarifa ya kisheria',

  'welcome.eyebrow': 'Karibu tena',
  'welcome.lot': 'Endelea na kiwanja chako kilichopo {address}.',
  'welcome.project': 'Endelea na mradi wako.',
  'welcome.continue': 'Endelea: {title} →',
  'welcome.myPark': 'Tazama Bustani yangu →',

  'path.subDone': 'hatua ndogo zimekamilika',
} satisfies Translation<typeof en>;

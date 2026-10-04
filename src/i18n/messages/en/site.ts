// Area "site": the frame around every page — header, language box, notices, the
// first-visit language offer, footer, the step path. English is the source.
import { defineMessages } from '../../define.ts';

export default defineMessages('site', {
  'meta.description': 'Plan, build and care for a neighborhood park with the Park in a Truck toolkit.',
  'skip': 'Skip to content',

  'header.home': 'Park in a Truck — home',
  'header.menu': 'Menu',
  'nav.label': 'Main',
  'nav.steps': 'Steps',
  'nav.lot': 'Find a lot',
  'nav.planner': 'Plan in 3D',
  'nav.build': 'Build guides',
  'nav.plants': 'Plants',
  'nav.parks': 'Parks',
  /** Screen-reader prefix before the active project's name in the header button */
  'nav.myPark': 'My park:',

  /** The language box in the header */
  'lang.label': 'Language',
  'lang.choose': 'Choose a language',

  /** Thin bar under the header on every translated page */
  'notice.machine': 'This page was translated from English by machine, so some words may be off.',
  'notice.readEnglish': 'Read it in English',
  /** Shown on a page whose language is not ready yet (English text, in the English catalog only) */
  'notice.notReady': '{language} is coming soon — this page is still in English.',

  /** The one-line offer on a first visit. In each language it asks about THAT language. */
  'offer.question': 'View this site in English?',
  'offer.yes': 'Yes',
  'offer.no': 'No thanks',

  'footer.about':
    'A do-it-yourself toolkit for neighborhood parks from the Landscape Architecture Program and the Lab for Social and Urban Innovation at Thomas Jefferson University, Philadelphia. Toolkit and workbook content is theirs, used with permission.',
  'footer.questions': 'Questions?',
  'footer.aboutSite': 'About this site',
  'footer.saved': 'Your answers and designs are saved only in this browser. Use <a href="{href}">My park</a> to save a copy or share it with your committee.',
  'footer.resources': 'Resources, partners & press',
  'footer.legal': 'Legal notice',

  /** Home page, for someone who has already started (the script under src/pages/index.astro) */
  'welcome.eyebrow': 'Welcome back',
  'welcome.lot': 'Continue with your lot at {address}.',
  'welcome.project': 'Continue with your project.',
  'welcome.continue': 'Continue: {title} →',
  'welcome.myPark': 'See My park →',

  /** After "3 of 7" on each step card, read by screen readers only */
  'path.subDone': 'sub-steps done',
});

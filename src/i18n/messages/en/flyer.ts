// Area "flyer": the printable meeting flyer (Organize, src/components/flyer/).
// The flyer can print in ANY site language, or two side by side, whatever language
// the page is in — so the flyer island bundles this area for every language.
// Keep these short: they print in big type on half a page.
import { defineMessages } from '../../define.ts';

export default defineMessages('flyer', {
  'eyebrow': "You're invited",
  'headline': 'Community meeting: a new park for our neighborhood',
  'when': 'When',
  'where': 'Where',
  'lot': 'The lot',
  'contact': 'Questions? Contact',
  'committee': 'Our park committee',
  'credit': 'Made with the Park in a Truck toolkit · Thomas Jefferson University',

  // On-screen controls (shown in the page's language)
  'ui.empty': 'Fill in the meeting date, time, place and purpose above (and add a committee member) to see your flyer take shape.',
  'ui.noContact': 'Add a committee member above to put a contact here.',
  'ui.print': '🖨 Print flyer',
  'ui.language': 'Flyer language',
  'ui.second': 'Second language, side by side',
  'ui.none': 'None',
  'ui.notReady': '{language} (not translated yet)',
  'ui.purpose2': 'Purpose, in {language} (optional)',
  'ui.purpose2Hint': 'What you typed above prints as it is; add a translation here for the second column.',
});

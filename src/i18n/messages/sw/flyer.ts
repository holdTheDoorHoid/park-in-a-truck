// Kiswahili. The flyer speaks to the whole neighbourhood (plural "mna-"). Keep lines short: they print in big type.
import type en from '../en/flyer.ts';
import type { Translation } from '../../define.ts';

export default {
  'eyebrow': 'Mnaalikwa',
  'headline': 'Mkutano wa jamii: bustani mpya kwa mtaa wetu',
  'when': 'Lini',
  'where': 'Wapi',
  'lot': 'Kiwanja',
  'contact': 'Maswali? Wasiliana na',
  'committee': 'Kamati yetu ya bustani',
  'credit': 'Kimetengenezwa kwa mwongozo wa Park in a Truck · Thomas Jefferson University',

  'ui.empty': 'Jaza tarehe, saa, mahali na lengo la mkutano hapo juu (na uongeze mwanakamati) ili uone kipeperushi chako kikichukua umbo.',
  'ui.noContact': 'Ongeza mwanakamati hapo juu ili mtu wa kuwasiliana naye aonekane hapa.',
  'ui.print': '🖨 Chapisha kipeperushi',
  'ui.language': 'Lugha ya kipeperushi',
  'ui.second': 'Lugha ya pili, kando kwa kando',
  'ui.none': 'Hakuna',
  'ui.notReady': '{language} (bado haijatafsiriwa)',
  'ui.purpose2': 'Lengo, kwa {language} (si lazima)',
  'ui.purpose2Hint': 'Ulichoandika hapo juu kitachapishwa kama kilivyo; ongeza tafsiri hapa kwa ajili ya safu ya pili.',
} satisfies Translation<typeof en>;

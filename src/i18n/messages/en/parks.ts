// Area "parks": the parks map (src/components/parks/, src/components/widgets/ParksMap.astro) and
// the /parks/ page (src/pages/parks/). Park names and addresses never change; descriptions,
// neighborhoods, link labels and photo descriptions come from the parks data overlay
// (src/i18n/data/<code>/parks.json).
import { defineMessages } from '../../define.ts';

export default defineMessages('parks', {
  /** Browser tab title and page heading */
  'page.title': 'Parks built so far',
  'page.description': 'Real neighborhood parks already built with the Park in a Truck toolkit around Philadelphia.',
  'page.eyebrow': 'Built with Park in a Truck',
  'page.lede':
    "Neighbors have already used this toolkit to build real parks around Philadelphia. Here's where, with what's known about each — click a pin or a card for the story, photos and press.",
  /** After the address: "· opened 2019" */
  'park.opened': 'opened {year}',
  /** Under a photo: "{caption} — {credit}" (the credit is a name) */
  'photo.credit': '{caption} — {credit}',
  /** Description of a video's thumbnail; {title} is the video's own (English) title */
  'video.alt': 'Video: {title}',
  /** After links to articles and pages that are only in English (not shown on English pages) */
  'link.english': '(in English)',
  /** Where the facts about a park came from (names of sources follow) */
  'park.source': 'Source: {source}',
  // The pieces of a park's "Source:" line and photo credits (src/pages/parks/index.astro reads the
  // English data and puts these words around the names; names of papers and people stay as they are).
  /** {page}: a page number of PiaT's toolkit PDF, e.g. "69" */
  'source.toolkitPage': 'Park in a Truck toolkit p.{page}',
  /** {pages}: page numbers of PiaT's toolkit PDF, e.g. "7-13, 39, 66-69" */
  'source.toolkitPages': 'Park in a Truck toolkit pp.{pages}',
  /** The toolkit's list of thanks on page {page}, which names the park */
  'source.toolkitAck': 'Park in a Truck toolkit p.{page} acknowledgments',
  /** PiaT's page of links (linktr.ee/parkinatruck) */
  'source.linktree': 'Park in a Truck Linktree',
  'source.linktreeOnly': 'Park in a Truck Linktree only',
  /** Nothing but the sources before it says the park exists */
  'source.unconfirmedElsewhere': 'unconfirmed elsewhere',
  'source.unconfirmedBeyond': 'unconfirmed beyond that',
  /** News articles on Jefferson University's site */
  'source.jeffersonNews': 'Jefferson news',
  /** Between the pieces of a "Source:" line ("toolkit p.69; Grid Magazine"): the language's semicolon, with its own spacing */
  'source.sep': '; ',
  /** Photo credit: {name} took the photo, which was published in PiaT's toolkit */
  'photo.via': '{name}, via the Park in a Truck toolkit',
  /** Photo credit for a photo from PiaT's toolkit */
  'photo.toolkit': 'Park in a Truck toolkit',

  // ---- The map ----
  /** Screen-reader name of the map */
  'map.label': 'Map of parks built with Park in a Truck',
  'map.details': 'View details',
  /** The × button that closes a park's card on the map */
  'map.close': 'Close',
  /** Printed instead of the map */
  'map.print': 'See the interactive map online, or the list of parks below.',
});

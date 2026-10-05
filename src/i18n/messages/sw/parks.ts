// Kiswahili. Msomaji ni "wewe". Glossary: docs/i18n/glossary.md (### sw).
import type en from '../en/parks.ts';
import type { Translation } from '../../define.ts';

export default {
  'page.title': 'Bustani zilizojengwa hadi sasa',
  'page.description': 'Bustani halisi za mtaa ambazo tayari zimejengwa kwa mwongozo wa Park in a Truck kote Philadelphia.',
  'page.eyebrow': 'Zimejengwa kwa Park in a Truck',
  'page.lede':
    'Majirani tayari wametumia mwongozo huu kujenga bustani halisi kote Philadelphia. Hizi hapa ndizo zilipo, pamoja na kinachojulikana kuhusu kila moja — bofya alama kwenye ramani au kadi upate hadithi, picha na habari zake.',
  'park.opened': 'ilifunguliwa {year}',
  'photo.credit': '{caption} — {credit}',
  'video.alt': 'Video: {title}',
  'link.english': '(kwa Kiingereza)',
  'park.source': 'Chanzo: {source}',

  'source.toolkitPage': 'mwongozo wa Park in a Truck, ukurasa wa {page}',
  'source.toolkitPages': 'mwongozo wa Park in a Truck, kurasa {pages}',
  'source.toolkitAck': 'mwongozo wa Park in a Truck, ukurasa wa {page}, shukrani',
  'source.linktree': 'Linktree ya Park in a Truck',
  'source.linktreeOnly': 'Linktree ya Park in a Truck pekee',
  'source.unconfirmedElsewhere': 'haijathibitishwa kwingineko',
  'source.unconfirmedBeyond': 'haijathibitishwa zaidi ya hapo',
  'source.jeffersonNews': 'habari za Jefferson',
  'photo.via': '{name}, kupitia mwongozo wa Park in a Truck',
  'photo.toolkit': 'mwongozo wa Park in a Truck',

  'map.label': 'Ramani ya bustani zilizojengwa kwa Park in a Truck',
  'map.details': 'Tazama maelezo',
  'map.close': 'Funga',
  'map.print': 'Tazama ramani shirikishi mtandaoni, au orodha ya bustani hapa chini.',
} satisfies Translation<typeof en>;

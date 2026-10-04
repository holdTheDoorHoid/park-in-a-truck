import type { ThemeId } from '../lib/types';

// Theme colours. frame / front / back are the exact vector fills of the Dream
// workbook "Play with the pieces" page (p.25 of the printed workbook):
// frame = darkest (border), front = brightest, back = lightest.
// `plan` holds the flat fills of the printed park pieces themselves (sampled
// from the piece art), used by the plan renderer so a plan looks like the paper.
export interface ThemePlanPalette {
  /** gravel ground of the interior pieces */
  ground: string;
  /** planting beds (the "green squares") */
  planting: string;
  /** tree canopies drawn over planting */
  canopy: string;
  /** café / communal tables */
  table: string;
  /** stools and chairs */
  seat: string;
  /** shade canopy slats */
  canopySlat: string;
  /** the shed */
  shed: string;
}

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  blurb: string;
  frame: string;
  front: string;
  back: string;
  plan: ThemePlanPalette;
}

export const THEMES: Record<ThemeId, ThemeMeta> = {
  edible: {
    id: 'edible',
    name: 'Edible',
    blurb: 'Share food and connect with neighbors — fruit, vegetables, and a communal table.',
    frame: '#F15622',
    front: '#FF8961',
    back: '#F1AE98',
    plan: { ground: '#FFF1E6', planting: '#83CD62', canopy: '#4F9734', table: '#F15725', seat: '#F58965', canopySlat: '#FFAF00', shed: '#F15725' },
  },
  sanctuary: {
    id: 'sanctuary',
    name: 'Sanctuary',
    blurb: 'A calm refuge for solitude, reading, and small gatherings.',
    frame: '#084D6F',
    front: '#A1CDE3',
    back: '#91B5C7',
    plan: { ground: '#E0EBEF', planting: '#4CBD91', canopy: '#2F9A64', table: '#074D6F', seat: '#4997BD', canopySlat: '#DE7935', shed: '#D0C0C8' },
  },
  nature: {
    id: 'nature',
    name: 'Nature',
    blurb: 'Native plants, habitat, and play for kids and pollinators.',
    frame: '#006735',
    front: '#00DB72',
    back: '#B8CFC4',
    plan: { ground: '#F0F9F6', planting: '#84CBA8', canopy: '#45A877', table: '#DE7935', seat: '#08B259', canopySlat: '#DE7935', shed: '#006735' },
  },
  event: {
    id: 'event',
    name: 'Event',
    blurb: 'Space for performances, markets, and neighborhood celebrations.',
    frame: '#92276E',
    front: '#FF44C0',
    back: '#FF91DA',
    plan: { ground: '#F2E7EF', planting: '#67C57B', canopy: '#3FA35E', table: '#92276F', seat: '#C98FB5', canopySlat: '#DE7935', shed: '#92276F' },
  },
};

export const THEME_ORDER: ThemeId[] = ['edible', 'sanctuary', 'nature', 'event'];

/** Fills shared by every theme on the printed pieces. */
export const PLAN_COMMON = {
  gabion: '#A49D97',
  natureplay: '#F1AA7E',
  wood: '#DE7935',
  woodMid: '#EB974E',
  woodLight: '#F5A96B',
  tableSlat: '#E8B088',
  shrub: '#E4D45B',
  compost: '#A64B4B',
  rainBarrel: '#40C068',
  outline: '#7A7A7A',
};

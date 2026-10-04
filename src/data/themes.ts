import type { ThemeId } from '../lib/types';

// Theme colours sampled from the Dream workbook "Play with the pieces" page.
// frame = darkest (border), front = brightest, back = lightest.
// The pieces-extraction workstream may refine these from the vector fills.
export interface ThemeMeta {
  id: ThemeId;
  name: string;
  blurb: string;
  frame: string;
  front: string;
  back: string;
}

export const THEMES: Record<ThemeId, ThemeMeta> = {
  edible: {
    id: 'edible',
    name: 'Edible',
    blurb: 'Share food and connect with neighbors — fruit, vegetables, and a communal table.',
    frame: '#F05A28',
    front: '#FF8A5B',
    back: '#F2A88E',
  },
  sanctuary: {
    id: 'sanctuary',
    name: 'Sanctuary',
    blurb: 'A calm refuge for solitude, reading, and small gatherings.',
    frame: '#0B4A6B',
    front: '#9FCCE3',
    back: '#8FA9BC',
  },
  nature: {
    id: 'nature',
    name: 'Nature',
    blurb: 'Native plants, habitat, and play for kids and pollinators.',
    frame: '#006B35',
    front: '#00D26A',
    back: '#A8C9B6',
  },
  event: {
    id: 'event',
    name: 'Event',
    blurb: 'Space for performances, markets, and neighborhood celebrations.',
    frame: '#8E1F6B',
    front: '#FF4FC3',
    back: '#FF9BDA',
  },
};

export const THEME_ORDER: ThemeId[] = ['edible', 'sanctuary', 'nature', 'event'];

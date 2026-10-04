// Partners, press, suppliers, the Toolkit Library, contact info, credits and
// the toolkit's legal notice, for /resources. See src/data/resources.json for
// the data itself and where each section came from.
//
// Owner: resources workstream.

import raw from './resources.json';

export type LinkStatus = 'live' | 'dead' | 'unverified' | 'unconfirmed';

export interface Partner {
  name: string;
  url: string | null;
  status: LinkStatus;
  description: string;
}

export interface PressItem {
  type: 'article' | 'video';
  title: string;
  url: string;
  outlet?: string;
  byline?: string;
  date?: string;
  note?: string;
  youtubeId?: string;
}

export interface SupplierItem {
  title: string;
  url: string | null;
  status: LinkStatus;
  note?: string | null;
}

export interface SupplierGroup {
  id: string;
  label: string;
  items: SupplierItem[];
}

export interface ToolkitLibraryEntry {
  title: string;
  url?: string | null;
  description?: string | null;
  note?: string | null;
}

export interface ToolkitLibrarySection {
  title: string;
  entries: ToolkitLibraryEntry[];
}

export interface ResourcesData {
  partners: Partner[];
  press: PressItem[];
  supplierGroups: SupplierGroup[];
  toolkitLibrary: { intro: string; sourceDoc: string; sections: ToolkitLibrarySection[] };
  contact: {
    email: string;
    founderEmail: string;
    phone: string;
    instagram: { handle: string; url: string };
    facebook: { url: string };
  };
  acknowledgments: { lead: string; contributors: string[]; note: string };
  legal: { title: string; source: string; text: string };
}

export const RESOURCES = raw as ResourcesData;

export function deadLinkCount(): number {
  const suppliers = RESOURCES.supplierGroups.flatMap((g) => g.items);
  return [...RESOURCES.partners, ...suppliers].filter((x) => x.status === 'dead').length;
}

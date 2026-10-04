// Resolves `data-auto="lot.owners|join"` style references against the active
// project, so a workbook blank can show what the site already looked up
// ("Filled from City records") until the person types their own answer.
//
// Path: dotted path from the project root (lot.*, design.*, extra.*, fields.*).
// Format (optional, after |): join, sqft, ft, money, date, yesno, ownerType, lotType.

import type { Project } from './types';

const OWNER_TYPES: Record<string, string> = {
  city: 'City of Philadelphia (public)',
  landbank: 'Philadelphia Land Bank (public)',
  pha: 'Philadelphia Housing Authority (public)',
  redevelopment: 'Philadelphia Redevelopment Authority (public)',
  'other-public': 'Another public agency',
  private: 'Private owner (person, organization or business)',
  unknown: 'Unknown',
};

const LOT_TYPES: Record<string, string> = {
  'mid-block': 'Mid-block lot',
  corner: 'Corner lot',
  alley: 'Breezeway / alley / easement',
  unknown: 'Not sure',
};

function get(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), obj);
}

export function formatAuto(v: unknown, fmt?: string): string | null {
  if (v === undefined || v === null || v === '') return null;
  switch (fmt) {
    case 'join':
      return Array.isArray(v) ? v.filter(Boolean).join(' & ') : String(v);
    case 'sqft':
      return `${Math.round(Number(v)).toLocaleString('en-US')} sq ft`;
    case 'ft':
      return `${Math.round(Number(v) * 10) / 10} ft`;
    case 'money':
      return Number(v).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    case 'date':
      return new Date(String(v)).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    case 'yesno':
      return v ? 'Yes' : 'No';
    case 'ownerType':
      return OWNER_TYPES[String(v)] ?? String(v);
    case 'lotType':
      return LOT_TYPES[String(v)] ?? String(v);
    default:
      return Array.isArray(v) ? v.join(', ') : String(v);
  }
}

export function resolveAuto(p: Project, spec: string): string | null {
  const [path, fmt] = spec.split('|');
  return formatAuto(get(p, path!.trim()), fmt?.trim());
}

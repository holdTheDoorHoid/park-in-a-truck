// What the estimator shows for each question, and where the number came from.
// Saved answers live in project.extra.costInputs (this workstream's key); the
// design's counts come from project.extra.tally (written by the planner) and
// the lot's size from project.extra.site (written by philly-data).

import type { DesignTally, SiteFacts } from '../types';
import { inputsFromTally, type FromTally } from './fromTally';
import { INPUT_KEYS, defaultInputs, type CostInputKey, type CostInputs } from './model';

/** project.extra.costInputs */
export interface SavedCostInputs {
  v: 1;
  /** Numbers the person typed; they win over the design and the example */
  overrides: Partial<CostInputs>;
  /** Without a design, unanswered questions start from the spreadsheet's example or from zero */
  base?: 'example' | 'zero';
}

export const COST_INPUTS_KEY = 'costInputs';

export type ValueSource = 'you' | 'design' | 'lot' | 'example' | 'blank';

export interface ResolvedInputs {
  values: CostInputs;
  source: Record<CostInputKey, ValueSource>;
  /** What the value would be without the person's own number (for "reset") */
  fallback: CostInputs;
  fallbackSource: Record<CostInputKey, Exclude<ValueSource, 'you'>>;
  fromTally: FromTally;
  hasDesign: boolean;
  base: 'example' | 'zero';
}

export function readSaved(raw: unknown): SavedCostInputs {
  const s = raw as Partial<SavedCostInputs> | undefined;
  const overrides: Partial<CostInputs> = {};
  if (s && typeof s === 'object' && s.overrides && typeof s.overrides === 'object') {
    for (const k of INPUT_KEYS) {
      const v = (s.overrides as Record<string, unknown>)[k];
      if (typeof v === 'number' && Number.isFinite(v)) overrides[k] = v;
    }
  }
  return { v: 1, overrides, base: s?.base === 'zero' ? 'zero' : s?.base === 'example' ? 'example' : undefined };
}

export function resolveInputs(saved: SavedCostInputs, tally: DesignTally | null | undefined, site?: SiteFacts | null): ResolvedInputs {
  const fromTally = inputsFromTally(tally ?? null, site ?? null);
  const hasDesign = Boolean(tally);
  const base = hasDesign ? 'zero' : (saved.base ?? 'example');
  const derived = new Set(fromTally.derived);
  const values = {} as CostInputs;
  const fallback = {} as CostInputs;
  const source = {} as Record<CostInputKey, ValueSource>;
  const fallbackSource = {} as Record<CostInputKey, Exclude<ValueSource, 'you'>>;
  for (const k of INPUT_KEYS) {
    let fb: number;
    let fs: Exclude<ValueSource, 'you'>;
    if (derived.has(k)) {
      fb = fromTally.inputs[k] ?? 0;
      fs = fromTally.sizeFrom === 'lot' && (k === 'longSideFt' || k === 'shortSideFt') ? 'lot' : 'design';
    } else if (base === 'example') {
      fb = defaultInputs[k];
      fs = 'example';
    } else {
      fb = 0;
      fs = 'blank';
    }
    fallback[k] = fb;
    fallbackSource[k] = fs;
    const o = saved.overrides[k];
    if (o !== undefined) {
      values[k] = o;
      source[k] = 'you';
    } else {
      values[k] = fb;
      source[k] = fs;
    }
  }
  return { values, source, fallback, fallbackSource, fromTally, hasDesign, base };
}

/** A copy of `saved` with one answer set (or cleared with `undefined`). */
export function withOverride(saved: SavedCostInputs, key: CostInputKey, value: number | undefined): SavedCostInputs {
  const overrides = { ...saved.overrides };
  if (value === undefined) delete overrides[key];
  else overrides[key] = value;
  return { ...saved, overrides };
}

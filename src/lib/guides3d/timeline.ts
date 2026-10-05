// The assembly animation as pure data: which parts are where at each step, and
// how to get from one step to another (who moves, in what order, for how long).
// The three.js viewer only samples these tracks; tests check them directly.
//
// Views:
//   complete      the whole piece, nothing highlighted (before the steps, and after)
//   step n        parts of earlier steps in place, step n's parts highlighted;
//                 if step n is the "mark, label and cut" step: every board laid
//                 out flat in the cut pile instead
//   empty         nothing (the start of "play all")

import type { GuideModel, ModelPart } from './schema';
import { cutPileLayout, explodedOffsets, flyOffset, isPileable, partsBounds, type PileLayout, type V3 } from './layout';

export type Placement = 'hidden' | 'pile' | 'placed';
export interface Target {
  placement: Placement;
  highlight: boolean;
}
export type View = { kind: 'empty' } | { kind: 'complete' } | { kind: 'step'; n: number };

export interface GuideStepLike {
  n: number;
  title?: string;
  text?: string;
}

export interface PreparedModel {
  model: GuideModel;
  parts: ModelPart[];
  /** guide step numbers in order */
  steps: number[];
  /** the step shown as the cut pile, or null */
  pileStep: number | null;
  pile: PileLayout | null;
  pileable: boolean[];
  /** fly-in offset per part */
  fly: V3[];
  /** exploded-view offset per part */
  explode: V3[];
}

const CUT_STEP = /\b(mark|label)\b.*\bcut\b|\bcut\b.*\b(lumber|wood|boards?|pieces|parts|mesh)\b|\bcut list\b/i;

/**
 * Which guide step to show as the cut pile: the model's `cutPileStep` when set
 * (0 = none); otherwise the first of the first two steps whose title reads like
 * "Mark, label and cut the lumber" and that adds no parts to the model.
 */
export function detectPileStep(model: GuideModel, steps: GuideStepLike[], pileableCount: number): number | null {
  if (model.cutPileStep !== undefined) return model.cutPileStep > 0 ? model.cutPileStep : null;
  if (!pileableCount) return null;
  const used = new Set(model.parts.map((p) => p.step));
  for (const s of steps.slice(0, 2)) {
    if (used.has(s.n)) continue;
    if (CUT_STEP.test(s.title ?? '')) return s.n;
  }
  return null;
}

export function prepare(model: GuideModel, steps: GuideStepLike[], cutOrder: string[] = []): PreparedModel {
  const parts = model.parts;
  const cutRefs = new Set(cutOrder);
  const pileable = parts.map((p) => isPileable(p, cutRefs));
  const pileStep = detectPileStep(model, steps, pileable.filter(Boolean).length);
  const pile = pileStep !== null ? cutPileLayout(parts.filter((_, i) => pileable[i]), cutOrder) : null;
  const solid = parts.filter((p) => p.kind !== 'fastener');
  const b = partsBounds(solid.length ? solid : parts);
  const centre: V3 = [(b.min[0] + b.max[0]) / 2, 0, (b.min[2] + b.max[2]) / 2];
  return {
    model,
    parts,
    steps: steps.map((s) => s.n),
    pileStep,
    pile,
    pileable,
    fly: parts.map((p) => flyOffset(p, model, centre)),
    explode: explodedOffsets(parts),
  };
}

export function targetsFor(m: PreparedModel, view: View): Target[] {
  return m.parts.map((p, i): Target => {
    if (view.kind === 'empty') return { placement: 'hidden', highlight: false };
    if (view.kind === 'complete') return { placement: 'placed', highlight: false };
    if (view.n === m.pileStep) return { placement: m.pileable[i] ? 'pile' : 'hidden', highlight: false };
    if (p.step < view.n) return { placement: 'placed', highlight: false };
    if (p.step === view.n) return { placement: 'placed', highlight: true };
    return { placement: 'hidden', highlight: false };
  });
}

/**
 * Where "replay this step" starts from: the same view with this step's own
 * parts taken away (so they fly in again from their usual direction, and the
 * camera needn't move); the cut pile starts empty and its boards drop in.
 * Views without a step of their own (the finished piece) rebuild from nothing.
 */
export function replayFrom(m: PreparedModel, view: View): Target[] {
  if (view.kind !== 'step' || view.n === m.pileStep) return targetsFor(m, { kind: 'empty' });
  const t = targetsFor(m, view);
  if (!m.parts.some((p) => p.step === view.n)) return targetsFor(m, { kind: 'empty' });
  return t.map((x, i) => (m.parts[i]!.step === view.n ? { placement: 'hidden', highlight: false } : x));
}

/** The sequence "play all" walks through. */
export function playSequence(m: PreparedModel): View[] {
  const seq: View[] = [{ kind: 'empty' }];
  const used = new Set(m.parts.map((p) => p.step));
  for (const n of m.steps) if (n === m.pileStep || used.has(n)) seq.push({ kind: 'step', n });
  seq.push({ kind: 'complete' });
  return seq;
}

export type Motion =
  | 'fly-in' // hidden -> placed: from the fly offset, fading in
  | 'fly-out' // placed -> hidden: back out along the fly offset, fading out
  | 'drop-in' // hidden -> pile: drops onto the pile
  | 'fade-out' // pile -> hidden
  | 'from-pile' // pile -> placed
  | 'to-pile' // placed -> pile
  | 'shift'; // same placement; highlight or exploded position changes

export interface Track {
  /** part index */
  i: number;
  motion: Motion;
  /** ms after the transition starts */
  delay: number;
  /** ms; 0 = jump */
  duration: number;
  /** reduced motion: jump to the end pose, only fade */
  snapPose: boolean;
}

export interface TransitionOptions {
  reducedMotion?: boolean;
  /** exploded positions changed (toggle) — every placed part shifts */
  reposition?: boolean;
}

function motionFor(a: Placement, b: Placement): Motion | null {
  if (a === b) return null;
  if (a === 'hidden') return b === 'placed' ? 'fly-in' : 'drop-in';
  if (b === 'hidden') return a === 'placed' ? 'fly-out' : 'fade-out';
  return b === 'pile' ? 'to-pile' : 'from-pile';
}

const stagger = (n: number, each: number, cap: number) => (n > 1 ? Math.min(each, cap / (n - 1)) : 0);

/**
 * Plan the move from one set of targets to another. Parts of the new current
 * step fly in one after another; parts leaving fly out in reverse order (so
 * scrolling back up undoes the step); parts that only change highlight fade
 * their colour. Under reduced motion nothing travels: parts jump and fade.
 */
export function planTransition(m: PreparedModel, prev: Target[], next: Target[], opts: TransitionOptions = {}): { tracks: Track[]; duration: number } {
  const tracks: Track[] = [];
  const idx = (pred: (i: number) => boolean) => m.parts.map((_, i) => i).filter(pred);
  const mot = (i: number) => motionFor(prev[i]!.placement, next[i]!.placement);

  const leaving = idx((i) => mot(i) === 'fly-out' || mot(i) === 'fade-out');
  const toPile = idx((i) => mot(i) === 'to-pile' || mot(i) === 'drop-in');
  const arrivingStar = idx((i) => (mot(i) === 'fly-in' || mot(i) === 'from-pile') && next[i]!.highlight);
  const arrivingOther = idx((i) => (mot(i) === 'fly-in' || mot(i) === 'from-pile') && !next[i]!.highlight);
  const shifting = idx((i) => mot(i) === null && next[i]!.placement !== 'hidden' && (prev[i]!.highlight !== next[i]!.highlight || (!!opts.reposition && next[i]!.placement === 'placed')));

  if (opts.reducedMotion) {
    for (const list of [leaving, toPile, arrivingStar, arrivingOther])
      for (const i of list) tracks.push({ i, motion: mot(i)!, delay: 0, duration: 220, snapPose: true });
    for (const i of shifting) tracks.push({ i, motion: 'shift', delay: 0, duration: 220, snapPose: true });
    return { tracks, duration: tracks.length ? 220 : 0 };
  }

  // 1. leaving: reverse order, quick
  const sOut = stagger(leaving.length, 60, 420);
  [...leaving].reverse().forEach((i, k) => tracks.push({ i, motion: mot(i)!, delay: k * sOut, duration: mot(i) === 'fade-out' ? 350 : 480, snapPose: false }));
  const outEnd = leaving.length ? (leaving.length - 1) * sOut + 300 : 0;

  // 2. into the pile: by pile order (the order the layout lists them)
  const pileOrder = m.pile ? Object.keys(m.pile.poses) : [];
  const rank = (i: number) => pileOrder.indexOf(m.parts[i]!.id);
  const sorted = [...toPile].sort((a, b) => rank(a) - rank(b));
  const sPile = stagger(sorted.length, 45, 900);
  sorted.forEach((i, k) => tracks.push({ i, motion: mot(i)!, delay: Math.min(outEnd, 250) + k * sPile, duration: mot(i) === 'drop-in' ? 520 : 900, snapPose: false }));

  // 3. catching up (a jump over several steps, or rebuilding the whole piece):
  //    quick, one step's parts after another
  const catchUpDelay = Math.min(outEnd, 250);
  const otherSteps = [...new Set(arrivingOther.map((i) => m.parts[i]!.step))].sort((a, b) => a - b);
  const gap = otherSteps.length > 1 ? Math.min(220, 900 / (otherSteps.length - 1)) : 0;
  for (const i of arrivingOther)
    tracks.push({ i, motion: mot(i)!, delay: catchUpDelay + otherSteps.indexOf(m.parts[i]!.step) * gap, duration: 460, snapPose: false });
  const catchUpEnd = arrivingOther.length ? catchUpDelay + (otherSteps.length - 1) * gap + 250 : 0;

  // 4. the step's own parts: one after another
  const starStart = Math.max(catchUpEnd, Math.min(outEnd, 350));
  const sIn = stagger(arrivingStar.length, 110, 1000);
  arrivingStar.forEach((i, k) => tracks.push({ i, motion: mot(i)!, delay: starStart + k * sIn, duration: mot(i) === 'from-pile' ? 900 : 760, snapPose: false }));

  // 5. colour / exploded shifts
  for (const i of shifting) tracks.push({ i, motion: 'shift', delay: 0, duration: opts.reposition ? 650 : 380, snapPose: false });

  const duration = tracks.reduce((d, t) => Math.max(d, t.delay + t.duration), 0);
  return { tracks, duration };
}

/** easeOutCubic for arrivals, easeInCubic for departures, easeInOut otherwise. */
export function ease(motion: Motion, t: number): number {
  const x = Math.max(0, Math.min(1, t));
  if (motion === 'fly-in' || motion === 'drop-in') return 1 - Math.pow(1 - x, 3);
  if (motion === 'fly-out' || motion === 'fade-out') return x * x * x;
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/** Progress (0..1, eased) of a track at `ms` after the transition started. */
export function trackProgress(t: Track, ms: number): number {
  if (t.duration <= 0) return ms >= t.delay ? 1 : 0;
  return ease(t.motion, (ms - t.delay) / t.duration);
}

/**
 * Human summary of the parts added in a step, e.g. "2 × B-3, 8 × B-6". `words` puts it in the
 * page's language: each part's name, and the list with the language's comma.
 */
export function stepPartsSummary(
  m: PreparedModel,
  n: number,
  words: { name?: (p: ModelPart) => string; join?: (items: string[]) => string } = {},
): string {
  const name = words.name ?? ((p: ModelPart) => p.ref ?? p.kind);
  const counts = new Map<string, { label: string; c: number }>();
  for (const p of m.parts) {
    if (p.step !== n) continue;
    const k = p.ref ?? p.kind;
    const e = counts.get(k);
    if (e) e.c++;
    else counts.set(k, { label: name(p), c: 1 });
  }
  const list = [...counts.values()];
  if (list.length === 1 && list[0]!.c === 1) return list[0]!.label;
  const items = list.map(({ label, c }) => `${c} × ${label}`);
  return words.join ? words.join(items) : items.join(', ');
}

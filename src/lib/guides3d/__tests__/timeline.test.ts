import { describe, expect, it } from 'vitest';
import { detectPileStep, ease, planTransition, playSequence, prepare, replayFrom, stepPartsSummary, targetsFor, trackProgress, type View } from '../timeline';
import { fitBox, viewDirection } from '../framing';
import { partLabel, partTooltip } from '../labels';
import type { GuideModel } from '../schema';
import bench4 from '../../../data/guides/models/bench-4.json';
import guide from '../../../data/guides/bench-4.json';

const bench = bench4 as GuideModel;
const m = prepare(bench, guide.steps, guide.cutList.map((c) => c.part));
const step = (n: number): View => ({ kind: 'step', n });
const idsWhere = (pred: (i: number) => boolean) => m.parts.filter((_, i) => pred(i)).map((p) => p.id);

describe('prepare', () => {
  it('finds the cut-pile step (step 1, "Mark, label and cut the lumber")', () => {
    expect(m.pileStep).toBe(1);
    expect(m.pile?.groups.length).toBe(6);
  });
  it('does not treat a step that adds parts as the cut pile', () => {
    const odd: GuideModel = { ...bench, parts: bench.parts.map((p, i) => (i === 0 ? { ...p, step: 1 } : p)) };
    expect(detectPileStep(odd, guide.steps, 24)).toBe(null);
  });
  it('respects cutPileStep from the model', () => {
    expect(detectPileStep({ ...bench, cutPileStep: 0 }, guide.steps, 24)).toBe(null);
    expect(detectPileStep({ ...bench, cutPileStep: 2 }, guide.steps, 24)).toBe(2);
  });
});

describe('targetsFor', () => {
  it('step 1 shows every board in the pile', () => {
    const t = targetsFor(m, step(1));
    expect(t.every((x) => x.placement === 'pile' && !x.highlight)).toBe(true);
  });
  it('step k: earlier steps placed, step k highlighted, later steps hidden', () => {
    for (const k of [2, 3, 4, 5, 6]) {
      const t = targetsFor(m, step(k));
      m.parts.forEach((p, i) => {
        if (p.step < k) expect(t[i]).toEqual({ placement: 'placed', highlight: false });
        else if (p.step === k) expect(t[i]).toEqual({ placement: 'placed', highlight: true });
        else expect(t[i]).toEqual({ placement: 'hidden', highlight: false });
      });
    }
  });
  it('a step with no parts (the drilling template) shows the whole piece, nothing highlighted', () => {
    const t = targetsFor(m, step(7));
    expect(t.every((x) => x.placement === 'placed' && !x.highlight)).toBe(true);
    expect(targetsFor(m, { kind: 'complete' })).toEqual(t);
  });
  it('empty shows nothing', () => {
    expect(targetsFor(m, { kind: 'empty' }).every((x) => x.placement === 'hidden')).toBe(true);
  });
});

describe('planTransition', () => {
  it('forward a step: only that step’s parts fly in, one after another', () => {
    const { tracks } = planTransition(m, targetsFor(m, step(2)), targetsFor(m, step(3)));
    const flying = tracks.filter((t) => t.motion === 'fly-in');
    expect(flying.map((t) => m.parts[t.i]!.id).sort()).toEqual(idsWhere((i) => m.parts[i]!.step === 3).sort());
    const delays = flying.map((t) => t.delay);
    for (let k = 1; k < delays.length; k++) expect(delays[k]!).toBeGreaterThan(delays[k - 1]!);
    // step 2's parts stay put and only lose their highlight
    const shifts = tracks.filter((t) => t.motion === 'shift');
    expect(shifts.map((t) => m.parts[t.i]!.step)).toEqual(Array(shifts.length).fill(2));
    expect(shifts.length).toBe(8);
  });

  it('back a step reverses it: those parts fly out, last in first out', () => {
    const fwd = planTransition(m, targetsFor(m, step(2)), targetsFor(m, step(3))).tracks.filter((t) => t.motion === 'fly-in');
    const back = planTransition(m, targetsFor(m, step(3)), targetsFor(m, step(2))).tracks;
    const out = back.filter((t) => t.motion === 'fly-out');
    expect(out.map((t) => t.i).sort()).toEqual(fwd.map((t) => t.i).sort());
    const lastIn = fwd[fwd.length - 1]!.i;
    expect(out.find((t) => t.i === lastIn)!.delay).toBe(Math.min(...out.map((t) => t.delay)));
    // step 2's parts light up again
    expect(back.filter((t) => t.motion === 'shift').length).toBe(8);
  });

  it('pile to step 2: step 2’s boards leave the pile for their places, the rest fade', () => {
    const { tracks } = planTransition(m, targetsFor(m, step(1)), targetsFor(m, step(2)));
    const from = tracks.filter((t) => t.motion === 'from-pile').map((t) => m.parts[t.i]!.step);
    expect(from.length).toBe(8);
    expect(new Set(from)).toEqual(new Set([2]));
    expect(tracks.filter((t) => t.motion === 'fade-out').length).toBe(m.parts.length - 8);
  });

  it('the finished piece breaks down into the pile, every board moving', () => {
    const { tracks } = planTransition(m, targetsFor(m, { kind: 'complete' }), targetsFor(m, step(1)));
    expect(tracks.filter((t) => t.motion === 'to-pile').length).toBe(m.parts.length);
  });

  it('jumping ahead catches earlier steps up quickly and still flies in the current step', () => {
    const { tracks } = planTransition(m, targetsFor(m, step(2)), targetsFor(m, step(5)));
    const quick = tracks.filter((t) => t.motion === 'fly-in' && m.parts[t.i]!.step < 5);
    const star = tracks.filter((t) => t.motion === 'fly-in' && m.parts[t.i]!.step === 5);
    expect(quick.length).toBe(11); // steps 3 and 4
    expect(star.length).toBe(2);
    expect(Math.min(...star.map((t) => t.delay))).toBeGreaterThan(Math.max(...quick.map((t) => t.delay)));
  });

  it('nothing changes, nothing moves', () => {
    expect(planTransition(m, targetsFor(m, step(4)), targetsFor(m, step(4))).tracks).toEqual([]);
  });

  it('exploded toggle shifts every placed part', () => {
    const t = targetsFor(m, step(4));
    const { tracks } = planTransition(m, t, t, { reposition: true });
    expect(tracks.length).toBe(t.filter((x) => x.placement === 'placed').length);
  });

  it('reduced motion: nothing travels, parts jump into place and fade', () => {
    const { tracks, duration } = planTransition(m, targetsFor(m, step(2)), targetsFor(m, step(3)), { reducedMotion: true });
    expect(tracks.length).toBeGreaterThan(0);
    expect(tracks.every((t) => t.snapPose && t.delay === 0)).toBe(true);
    expect(duration).toBeLessThan(300);
  });
});

describe('sequences and easing', () => {
  it('replaying a step takes only that step’s parts away, so they fly in again', () => {
    const from = replayFrom(m, step(4));
    const plan = planTransition(m, from, targetsFor(m, step(4)));
    expect(plan.tracks.filter((t) => t.motion === 'fly-in').map((t) => m.parts[t.i]!.ref)).toEqual(['B-2']);
    expect(plan.tracks.every((t) => m.parts[t.i]!.step === 4)).toBe(true);
    // step 2 is replayed from its fly-in offsets, not from the pile
    expect(planTransition(m, replayFrom(m, step(2)), targetsFor(m, step(2))).tracks.every((t) => t.motion === 'fly-in')).toBe(true);
    // the pile starts empty: boards drop in
    expect(planTransition(m, replayFrom(m, step(1)), targetsFor(m, step(1))).tracks.every((t) => t.motion === 'drop-in')).toBe(true);
    // the finished piece rebuilds from nothing
    expect(replayFrom(m, { kind: 'complete' }).every((t) => t.placement === 'hidden')).toBe(true);
  });
  it('play all goes through the pile and every step that adds parts, then the finished piece', () => {
    expect(playSequence(m)).toEqual([{ kind: 'empty' }, step(1), step(2), step(3), step(4), step(5), step(6), { kind: 'complete' }]);
  });
  it('eases from 0 to 1 and respects delay', () => {
    for (const mo of ['fly-in', 'fly-out', 'shift'] as const) {
      expect(ease(mo, 0)).toBe(0);
      expect(ease(mo, 1)).toBe(1);
    }
    const t = { i: 0, motion: 'fly-in' as const, delay: 100, duration: 200, snapPose: false };
    expect(trackProgress(t, 50)).toBe(0);
    expect(trackProgress(t, 200)).toBeGreaterThan(0.5);
    expect(trackProgress(t, 400)).toBe(1);
  });
  it('summarises a step’s parts', () => {
    expect(stepPartsSummary(m, 3)).toBe('2 × B-3, 8 × B-6');
    expect(stepPartsSummary(m, 4)).toBe('B-2');
    const mixed = prepare({ ...bench, parts: bench.parts.map((p) => (p.ref === 'B-2' ? { ...p, step: 3 } : p)) }, guide.steps);
    expect(stepPartsSummary(mixed, 3)).toBe('2 × B-3, 8 × B-6, 1 × B-2');
  });
});

describe('labels and framing', () => {
  it('names parts the way the cut list does', () => {
    const p = bench.parts.find((x) => x.ref === 'B-3')!;
    expect(partTooltip(p, guide.cutList)).toBe('B-3 · 2x4 × 18.5″');
    expect(partLabel(p, guide.cutList).note).toBe('Bench side');
    expect(partTooltip({ id: 'x', kind: 'lumber', size: [1.5, 3.5, 25], position: [0, 0, 0], step: 1 })).toBe('Board · 2x4 × 25″');
  });
  it('names parts and sizes in the page\'s words (labels like B-3 stay)', () => {
    const fr = { kind: () => 'Grillage', ref: (r: string) => (r === 'B-3' ? r : `«${r}»`), pair: (a: string, b: string) => `${a}\u00a0; ${b}` };
    const mesh = { id: 'm', ref: 'Bracing material (spare 2x2 mesh)', kind: 'mesh' as const, size: [18, 1, 12] as [number, number, number], position: [0, 0, 0] as [number, number, number], step: 3 };
    expect(partTooltip(mesh, [], fr)).toBe('«Bracing material (spare 2x2 mesh)» · Grillage\u00a0; 18 × 1 × 12″');
    expect(partTooltip(bench.parts.find((x) => x.ref === 'B-3')!, guide.cutList, fr)).toBe('B-3 · 2x4 × 18.5″');
    expect(stepPartsSummary(m, 3, { name: (p) => `<${p.ref}>`, join: (xs) => xs.join(' | ') })).toBe('2 × <B-3> | 8 × <B-6>');
  });
  it('fits a box: every corner on screen, and a wider view needs less distance', () => {
    const dir = viewDirection(-35, 26);
    const narrow = fitBox([-24, 0, -9], [24, 17, 9], dir, 30, 0.8);
    const wide = fitBox([-24, 0, -9], [24, 17, 9], dir, 30, 1.8);
    expect(wide.distance).toBeLessThan(narrow.distance);
    expect(narrow.target).toEqual([0, 8.5, 0]);
    const az0 = viewDirection(0, 0);
    expect(az0.map((v) => Math.round(v * 1e6) / 1e6)).toEqual([0, 0, 1]);
  });
});

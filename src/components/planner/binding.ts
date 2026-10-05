// Keeps a PlannerScene in step with a planner store: one batched update per tick that
// only pushes what changed.

import type { PlannerMode, PlannerStore } from '../../lib/planner/store';
import type { PlannerScene, ParkState } from '../../lib/planner/scene';
import type { ExistingRender } from '../../lib/planner/scene/existing';
import { localToPark, parkDirToLocal, parkToLocal } from '../../lib/planner/placement';
import { phillyTime } from '../../lib/planner/sun';
import type { Vec2 } from '../../lib/planner/geo';
import type { LocalSite } from '../../lib/planner/localsite';
import type { ExistingItem } from '../../lib/types';
import { existingTreeLook } from '../../lib/planner/treemodel';

/** Snapping lives with the other drag helpers (src/lib/planner/interact.ts). */
export { snapItem } from '../../lib/planner/interact';

/** angle (deg, counter-clockwise from east) of the lot's long axis */
export function frameAngle(site: LocalSite): number {
  return (Math.atan2(site.frame.u[1], site.frame.u[0]) * 180) / Math.PI;
}

export function existingRenders(site: LocalSite, items: ExistingItem[] | undefined): ExistingRender[] {
  const fa = frameAngle(site);
  const out: ExistingRender[] = [];
  for (const e of items ?? []) {
    if (!e.lngLat) continue;
    const [x, y] = site.lf.toLocal(e.lngLat);
    const city = e.cityKey ? site.trees.find((t) => t.key === e.cityKey) : undefined;
    const look = e.element === 'existing-tree' ? existingTreeLook({ leafHabit: e.leafHabit, species: e.species ?? city?.species }) : null;
    out.push({
      id: e.id,
      element: e.element,
      x,
      y,
      rotationDeg: (e.rotationDeg ?? 0) + fa,
      ownRotationDeg: e.rotationDeg ?? 0,
      radiusFt: e.radiusFt,
      lengthFt: e.lengthFt,
      widthFt: e.widthFt,
      keep: e.keep,
      heightFt: city?.heightFt,
      ...(look?.evergreen ? { evergreen: true } : {}),
      ...(look?.conifer ? { conifer: true } : {}),
      // terrain: a wet area drawn as an outline (absent on older saves = a circle)
      ...(e.outline && e.outline.length >= 3 ? { outline: e.outline } : {}),
    });
  }
  return out;
}

/** Whether a step draws the markers for things already on the lot (rings, and trees marked to come down). */
export function showsMarkers(mode: PlannerMode, step: string): boolean {
  return mode === 'site' || step === 'existing' || step === 'lot';
}

export function bindScene(scene: PlannerScene, store: PlannerStore, mode: PlannerMode): () => void {
  const last: Record<string, unknown> = {};
  let queued = false;
  const changed = (key: string, ...vals: unknown[]) => {
    const prev = last[key] as unknown[] | undefined;
    if (prev && prev.length === vals.length && prev.every((v, i) => v === vals[i])) return false;
    last[key] = vals;
    return true;
  };

  const update = () => {
    queued = false;
    const site = store.$site.get();
    if (!site) return;
    if (changed('site', site)) {
      for (const k of Object.keys(last)) if (k !== 'site') delete last[k];
      scene.setSite(site);
    }
    const step = store.$step.get();
    const view = store.$view.get();
    const show = store.$show.get();
    const design = store.$design.get();
    const layout = store.$layout.get();
    const pl = store.$placement.get();
    const overhang = store.$overhang.get();
    const parkVisible = mode === 'full' || mode === 'design';

    if (changed('view', view)) scene.setView(view);
    if (changed('show', show.aerial, show.cityTrees)) scene.setShow(show);

    if (changed('park', layout, pl, overhang, design?.frame, design?.front, design?.back, show.grid, parkVisible)) {
      if (parkVisible && layout && pl && design) {
        const map = {
          toLocal: (p: Vec2) => parkToLocal(pl, site.frame, p),
          dirToLocal: (d: Vec2) => parkDirToLocal(pl, site.frame, d),
          toPark: (p: Vec2) => localToPark(pl, site.frame, p),
        };
        const state: ParkState = {
          layout,
          map,
          themes: { frame: design.frame, front: design.front, back: design.back },
          overhang: overhang ? { mask: overhang.mask, nx: overhang.nx, ny: overhang.ny, items: overhang.items } : null,
          grid: show.grid,
          axes: { origin: map.toLocal([0, 0]), x: map.dirToLocal([1, 0]), y: map.dirToLocal([0, 1]) },
        };
        scene.setPark(state);
      } else scene.setPark(null);
    }

    const showMarkers = showsMarkers(mode, step);
    if (changed('existing', design?.existing, showMarkers)) scene.setExisting(existingRenders(site, design?.existing), showMarkers);

    const sel = store.$selection.get();
    if (changed('sel', sel?.id)) scene.setSelection(sel?.id ?? null);

    const t = store.$sunTime.get();
    if (changed('sun', t)) scene.setSun(phillyTime(2026, t.month, t.day, t.minutes));

    // the sun-hours map for the chosen period (the growing season unless another is picked)
    const sunData = store.sun.$heat.get();
    if (changed('heat', sunData, show.heat)) scene.setHeat(sunData, show.heat);

    // the pin on the spot whose year is charted (sun step only)
    const spot = step === 'sun' ? store.sun.$spotAt.get() : null;
    if (changed('spot', spot?.[0], spot?.[1])) scene.setSpot(spot);
    // terrain: the slope overlay, and drawing a wet area's outline
    if (changed('slope', show.slope)) scene.setSlope(show.slope);
    const drawing = store.$drawing.get();
    if (changed('drawing', drawing)) {
      if (drawing) scene.startDrawing();
      else scene.cancelDrawing();
    }
  };

  const schedule = () => {
    if (queued) return;
    queued = true;
    queueMicrotask(update);
  };
  const atoms = [store.$site, store.$step, store.$view, store.$show, store.$design, store.$layout, store.$placement, store.$overhang, store.$selection, store.$sunTime, store.$sunData, store.sun.$heat, store.sun.$spotAt, store.$drawing];
  const unsubs = atoms.map((a) => (a as { subscribe: (cb: () => void) => () => void }).subscribe(schedule));
  return () => unsubs.forEach((u) => u());
}

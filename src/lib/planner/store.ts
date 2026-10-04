// One planner instance's state (nanostores). The Preact panels and the Three.js scene
// both subscribe to it. The person's design is saved through ../project.ts (debounced);
// demo lots are never saved.

import { atom, computed, type ReadableAtom } from 'nanostores';
import type { DesignState, DesignTally, LotRecord, ParkLayout, SiteFacts } from '../types';
import { $project, getExtra, setDesign, setExtra } from '../project';
import { loadDemo, loadSiteContext, loadTerrain, type DemoSlug, type SiteContext } from './site';
import { slopeFacts } from './terrain';
import { buildLocalSite, type LocalSite } from './localsite';
import { buildLayout, getPieceSet, nominalOf, tallyLayout, type PieceSet } from './park';
import { baseFootprint, computeOverhang, makePlacement, parkToLocal, placementSummary, type Overhang, type ParkPlacement } from './placement';
import { adaptToSite, lotRef, newDesign, normaliseDesign, parkDims, syncExistingXY, treesKept } from './design';
import { makeSunAt, runSunStudy } from './sunstudy';
import { decodeHours, gridSpecFromSaved, type GridSpec, type SunGrid } from './sunhours';
import { phillyMinutes } from './sun';
import { measureEdges } from './edges';
import { bbox, type Vec2 } from './geo';
import type { SnapStep } from './interact';
import { createSunView } from './sunview';

export type PlannerMode = 'full' | 'design' | 'site' | 'sun';
export type Selection = { kind: 'item' | 'existing'; id: string } | null;
export type View = '3d' | 'plan';

export interface ShowFlags {
  aerial: boolean;
  heat: boolean;
  cityTrees: boolean;
  grid: boolean;
  /** terrain: contour lines, arrows downhill, high and low points */
  slope: boolean;
}

/** terrain: where the lot's ground heights are (they arrive after the lot; until then it's flat) */
export interface TerrainStatus {
  status: 'none' | 'loading' | 'ready' | 'failed';
}

/** terrain: drawing a wet area's outline on the view (replaceId = redraw that one) */
export type Drawing = { replaceId?: string } | null;

export interface SunTime {
  month: number;
  day: number;
  minutes: number;
}

function todaySunTime(): SunTime {
  const d = new Date();
  const m = phillyMinutes(d);
  return { month: d.getMonth() + 1, day: d.getDate(), minutes: m < 7 * 60 || m > 19 * 60 ? 15 * 60 : Math.round(m / 15) * 15 };
}

/**
 * What the 3D view offers the side panel while it is on screen: dropping a palette
 * item onto the park at a screen point (the palette drag).
 */
export interface ViewportBridge {
  /** show where `element` would land at this screen point; false = not over the view */
  dropPreview(element: string, clientX: number, clientY: number): boolean;
  /** add it there; false = not over the view (nothing added) */
  drop(element: string, clientX: number, clientY: number): boolean;
  clearDrop(): void;
}

/** A promise's value if it settles within `ms`, else null (errors count as null). */
function within<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p.catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), ms))]);
}

export function createPlannerStore(mode: PlannerMode, demo: DemoSlug | null = null) {
  const $status = atom<'no-lot' | 'loading' | 'ready' | 'error'>('loading');
  const $note = atom<string | null>(null);
  const $demo = atom<DemoSlug | null>(demo);
  const $site = atom<LocalSite | null>(null);
  const $design = atom<DesignState | null>(null);
  const $set = atom<PieceSet | null>(null);
  const $selection = atom<Selection>(null);
  const $view = atom<View>('3d');
  const $show = atom<ShowFlags>({ aerial: true, heat: mode === 'sun', cityTrees: true, grid: true, slope: false });
  const $terrain = atom<TerrainStatus>({ status: 'none' });
  const $drawing = atom<Drawing>(null);
  /** grid snap for dragging and the arrow keys (0 = off) */
  const $snap = atom<SnapStep>(1);
  const $sunTime = atom<SunTime>(todaySunTime());
  const $sunGrid = atom<SunGrid | null>(null);
  const $sunJob = atom<{ progress: number } | null>(null);
  const $history = atom({ canUndo: false, canRedo: false });
  /** the panel step the person is on (decides what can be dragged and what's shown) */
  const $step = atom<string>('');

  const past: DesignState[] = [];
  const future: DesignState[] = [];
  const persist = () => !$demo.get();

  // ---- derived ----
  const $layout: ReadableAtom<ParkLayout | null> = computed([$design, $set], (d, set) => (d && set ? buildLayout(set, d) : null));
  const $placement: ReadableAtom<ParkPlacement | null> = computed([$site, $design, $layout], (site, d, layout) =>
    site && d && layout ? makePlacement(site.frame, layout.lengthFt, layout.widthFt, d.turn ?? 0, d.flipped ?? false, d.shiftFt ?? [0, 0]) : null,
  );
  const $overhang: ReadableAtom<Overhang | null> = computed([$site, $placement, $layout], (site, pl, layout) =>
    site && pl && layout ? computeOverhang(pl, site.frame, site.parcel, layout.items.map(baseFootprint)) : null,
  );
  const $sunData: ReadableAtom<{ spec: GridSpec; hours: Float32Array } | null> = computed([$site, $sunGrid], (site, g) =>
    site && g ? { spec: gridSpecFromSaved(g, site.lf), hours: decodeHours(g.hoursX10) } : null,
  );
  // shadows workstream: sun hours for any period, the charted spot, play state (sunview.ts)
  const sun = createSunView({ $site, $design, $sunTime, $sunData });
  // neighbours close enough to touch the park's edges
  const $near: ReadableAtom<{ buildings: Vec2[][]; parcels: Vec2[][] } | null> = computed($site, (site) => {
    if (!site) return null;
    const lb = bbox(site.parcel);
    const pad = Math.max(site.frame.lengthFt, site.frame.widthFt) * 0.5 + 20;
    const near = (r: Vec2[]) => {
      const b = bbox(r);
      return b.maxX > lb.minX - pad && b.minX < lb.maxX + pad && b.maxY > lb.minY - pad && b.minY < lb.maxY + pad;
    };
    return { buildings: site.buildings.map((b) => b.ring).filter(near), parcels: [site.parcel, ...site.parcels.filter(near)] };
  });
  const $tally: ReadableAtom<DesignTally | null> = computed([$site, $layout, $placement, $sunGrid, $near], (site, layout, pl, g, near) => {
    if (!site || !layout || !pl || !near) return null;
    const toLocal = (p: Vec2) => parkToLocal(pl, site.frame, p);
    const t = tallyLayout(layout, makeSunAt(g, site, toLocal));
    const edges = measureEdges(layout, { toLocal, ...near });
    const hasGravel = t.gravelEdgeFt && t.gravelEdgeFt.hardscape + t.gravelEdgeFt.softscape > 0;
    return { ...t, outerEdgeFt: edges.outerEdgeFt, gravelEdgeFt: hasGravel ? t.gravelEdgeFt : edges.gravelEdgeFt };
  });

  // ---- piece set follows size & lot kind ----
  let setKey = '';
  $design.subscribe((d) => {
    if (!d) return;
    const key = `${d.size}-${d.lotKind}`;
    if (key === setKey) return;
    setKey = key;
    getPieceSet(d.size, d.lotKind).then((set) => {
      if (setKey !== key) return;
      $set.set(set);
      const cur = $design.get();
      if (cur) $design.set(withDims(cur));
    });
  });

  function withDims(d: DesignState): DesignState {
    const site = $site.get();
    const set = $set.get();
    if (!site || !set || `${d.size}-${d.lotKind}` !== `${set.size}-${set.lotKind}`) return d;
    const dims = parkDims(d.fitToLot !== false, nominalOf(set), site.frame);
    return dims.lengthFt === d.lengthFt && dims.widthFt === d.widthFt ? d : { ...d, ...dims };
  }

  // ---- saving ----
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let lastSaved: string | null = null;
  function scheduleSave() {
    if (!persist()) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 400);
  }
  function flush() {
    clearTimeout(saveTimer);
    const site = $site.get();
    let d = $design.get();
    const pl = $placement.get();
    if (!persist() || !site || !d) return;
    if (pl) {
      d = syncExistingXY(d, site, pl);
      d = { ...d, placement: placementSummary(pl, site.frame, site.lf) };
    }
    lastSaved = d.updatedAt;
    setDesign(d);
    const facts = (getExtra<SiteFacts>('site') ?? {}) as SiteFacts;
    const kept = treesKept(d);
    if (facts.treesKept !== kept) setExtra('site', { ...facts, treesKept: kept });
    const t = $tally.get();
    if (t && JSON.stringify(t) !== JSON.stringify(getExtra('tally'))) setExtra('tally', t);
  }
  $design.listen(scheduleSave);
  $tally.listen(scheduleSave);

  // ---- edits with undo ----
  let lastCoalesce: string | undefined;
  /** Apply an edit. Edits with the same `coalesce` key in a row (slider drags) undo as one. */
  function commit(next: DesignState | null | undefined, coalesce?: string) {
    const cur = $design.get();
    if (!next || !cur || next === cur) return;
    if (!coalesce || coalesce !== lastCoalesce || !past.length) {
      past.push(cur);
      if (past.length > 80) past.shift();
    }
    lastCoalesce = coalesce;
    future.length = 0;
    $design.set(withDims(next));
    $history.set({ canUndo: true, canRedo: false });
  }
  function undo() {
    const cur = $design.get();
    const prev = past.pop();
    if (!cur || !prev) return;
    future.push(cur);
    $design.set(withDims({ ...prev, updatedAt: new Date().toISOString() }));
    $history.set({ canUndo: past.length > 0, canRedo: true });
  }
  function redo() {
    const cur = $design.get();
    const next = future.pop();
    if (!cur || !next) return;
    past.push(cur);
    $design.set(withDims({ ...next, updatedAt: new Date().toISOString() }));
    $history.set({ canUndo: true, canRedo: future.length > 0 });
  }

  // ---- loading a site ----
  let loadToken = 0;
  async function load() {
    const token = ++loadToken;
    const p = $project.get();
    const slug = $demo.get();
    let lot: LotRecord | null = slug ? null : p.lot;
    if (!slug && !lot) {
      $status.set('no-lot');
      $site.set(null);
      $design.set(null);
      return;
    }
    $status.set('loading');
    $note.set(null);
    $drawing.set(null);
    // terrain: ground heights load alongside the lot (slow the first time for a new lot);
    // the lot shows flat until they arrive, then the scene fills them in
    const terrainP = loadTerrain(slug ? null : lot, slug);
    $terrain.set({ status: terrainP ? 'loading' : 'none' });
    try {
      const ctx: SiteContext = slug ? await loadDemo(slug) : await loadSiteContext(lot!);
      if (token !== loadToken) return;
      // a cached answer is instant: give it a moment before showing the lot without it
      const early = terrainP ? await within(terrainP, slug ? 4000 : 500) : null;
      if (token !== loadToken) return;
      lot = ctx.lot;
      if (!ctx.lot.polygon || ctx.lot.polygon.length < 3) {
        $note.set(ctx.note ?? 'This lot has no outline in City records.');
        $status.set('error');
        return;
      }
      const facts = slug ? undefined : getExtra<SiteFacts>('site');
      const site = buildLocalSite(early ? { ...ctx, terrain: early } : ctx, facts);
      $note.set(ctx.note ?? null);
      past.length = 0;
      future.length = 0;
      $history.set({ canUndo: false, canRedo: false });
      $site.set(site);
      const saved = slug ? null : p.design;
      const d = saved ? adaptToSite(saved, site, facts) : newDesign(site, facts);
      lastSaved = saved?.updatedAt ?? null;
      $design.set(withDims(d));
      const g = slug ? null : getExtra<SunGrid>('sunGrid');
      $sunGrid.set(g && g.v === 1 && (!g.lotRef || g.lotRef === lotRef(lot)) ? g : null);
      $status.set('ready');
      if (!saved && persist()) scheduleSave();
      if (early) terrainReady(site);
      else if (terrainP) {
        terrainP
          .then((t) => {
            if (token !== loadToken || $site.get()?.ctx.lot !== ctx.lot) return;
            const next = buildLocalSite({ ...ctx, terrain: t }, facts);
            $site.set(next);
            terrainReady(next);
          })
          .catch((e) => {
            if (token !== loadToken) return;
            console.warn('ground heights', e);
            $terrain.set({ status: 'failed' });
          });
      }
    } catch (e) {
      if (token !== loadToken) return;
      console.error(e);
      $note.set('Something went wrong loading this lot. Try reloading the page.');
      $status.set('error');
    }
  }

  /** terrain: ground heights arrived — say so, and keep the slope facts for other pages */
  function terrainReady(site: LocalSite) {
    $terrain.set({ status: site.terrain ? 'ready' : 'failed' });
    if (!site.terrain || !persist()) return;
    const f = (getExtra<SiteFacts>('site') ?? {}) as SiteFacts;
    const sf = slopeFacts(site.terrain, site.lf, lotRef(site.ctx.lot));
    if (JSON.stringify(f.slope) !== JSON.stringify(sf)) setExtra('site', { ...f, slope: sf });
  }

  // Follow the project: a new lot chosen elsewhere, or the design changed by another
  // planner on the page / another tab.
  let lastLot = $project.get().lot ? lotRef($project.get().lot!) : null;
  const unProject = $project.listen((p) => {
    if ($demo.get()) return;
    const ref = p.lot ? lotRef(p.lot) : null;
    if (ref !== lastLot) {
      lastLot = ref;
      load();
      return;
    }
    const d = p.design;
    const cur = $design.get();
    if (d && cur && d.updatedAt !== lastSaved && d.updatedAt > cur.updatedAt) {
      lastSaved = d.updatedAt;
      $design.set(withDims(normaliseDesign(d)));
    }
    const g = p.extra.sunGrid as SunGrid | undefined;
    if (g && g !== $sunGrid.get() && g.computedAt !== $sunGrid.get()?.computedAt) $sunGrid.set(g);
  });

  // ---- sun study ----
  let job: { cancel: () => void } | null = null;
  function computeSun() {
    const site = $site.get();
    const d = $design.get();
    if (!site || $sunJob.get()) return;
    $sunJob.set({ progress: 0 });
    const run = runSunStudy(site, d?.existing, (f) => $sunJob.set({ progress: f }));
    job = run;
    run.promise
      .then(({ grid }) => {
        const g = { ...grid, lotRef: lotRef(site.ctx.lot) };
        $sunGrid.set(g);
        $show.set({ ...$show.get(), heat: true });
        if (persist()) {
          setExtra('sunGrid', g);
          const facts = (getExtra<SiteFacts>('site') ?? {}) as SiteFacts;
          setExtra('site', { ...facts, sunClass: g.sunClass });
        }
      })
      .catch((e) => {
        if (String(e?.message) !== 'cancelled') {
          console.error(e);
          $note.set('The sun study could not finish. Try again.');
        }
      })
      .finally(() => {
        job = null;
        $sunJob.set(null);
      });
  }

  function setDemo(slug: DemoSlug | null) {
    flush();
    $demo.set(slug);
    load();
  }

  load();

  return {
    mode,
    /** can things be picked up and moved? (everywhere but the sun-only widget) */
    editable: mode !== 'sun',
    /** set by the Viewport while it is mounted */
    bridge: { viewport: null as ViewportBridge | null },
    $status,
    $note,
    $demo,
    $site,
    $design,
    $set,
    $layout,
    $placement,
    $overhang,
    $tally,
    $selection,
    $view,
    $show,
    $snap,
    $sunTime,
    $sunGrid,
    $sunData,
    $sunJob,
    $history,
    $step,
    $terrain,
    $drawing,
    commit,
    undo,
    redo,
    computeSun,
    /** shadows workstream: periods, the charted spot, play state */
    sun,
    setDemo,
    reload: load,
    flush,
    destroy() {
      flush();
      unProject();
      job?.cancel();
      sun.destroy();
    },
  };
}

export type PlannerStore = ReturnType<typeof createPlannerStore>;

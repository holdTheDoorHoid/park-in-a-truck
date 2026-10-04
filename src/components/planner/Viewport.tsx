/** @jsxImportSource preact */
// Hosts the Three.js scene (loaded lazily) and keeps it in step with the planner store.
// Also the things drawn over the view: the toolbar, the hint line (which says what the
// mouse does, and what a drag is doing right now), the bar for the picked thing, and the
// right-click / long-press menu.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import type { PlannerMode, PlannerStore } from '../../lib/planner/store';
import type { GestureInfo, PlannerScene, PickKind, Picked } from '../../lib/planner/scene';
import type { LayoutItem } from '../../lib/types';
import { bindScene, snapItem } from './binding';
import { itemSticksOut, localToPark } from '../../lib/planner/placement';
import { addExisting, addItem, moveItem, updateExisting } from '../../lib/planner/design';
import { dropPlacement, isTurnable, outlineFromPoints, polygonArea } from '../../lib/planner/interact';
import { catalogEntry, existingMeta } from '../../lib/planner/catalog';
import { ELEMENTS } from '../../data/elements';
import { deleteSelected, duplicateSelected, rotateSelected } from './keyboard';
import { downloadDataUrl, printPlan } from './exporting';
import { PlayChip } from './PlayChip';

interface Props {
  store: PlannerStore;
  mode: PlannerMode;
}

type Vec2 = [number, number];

/** What the picked thing is called and what can be done to it. */
function describe(store: PlannerStore, sel: Picked | null): { name: string; kind: PickKind; turn: boolean; copy: boolean } | null {
  if (!sel) return null;
  if (sel.kind === 'item') {
    const it = store.$layout.get()?.items.find((x) => x.id === sel.id);
    return it ? { name: catalogEntry(it.element).name, kind: 'item', turn: true, copy: true } : null;
  }
  const e = store.$design.get()?.existing?.find((x) => x.id === sel.id);
  if (!e) return null;
  const name = e.element === 'existing-tree' && e.species ? e.species : existingMeta(e.element).name;
  return { name, kind: 'existing', turn: isTurnable('existing', e.element), copy: false };
}

export function Viewport({ store, mode }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<PlannerScene | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [north, setNorth] = useState(0);
  const [gesture, setGesture] = useState<GestureInfo | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; sel: Picked } | null>(null);
  /** terrain: points so far while drawing a wet area's outline (null = not drawing) */
  const [drawCount, setDrawCount] = useState<number | null>(null);
  /** what a click on the ground landed on, when that is worth saying (the gabion wall) */
  const [info, setInfo] = useState<string | null>(null);
  const infoTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(infoTimer.current), []);
  const view = useStore(store.$view);
  const show = useStore(store.$show);
  const status = useStore(store.$status);
  const site = useStore(store.$site);
  const sel = useStore(store.$selection);
  useStore(store.$design);
  const coarse = useMemo(() => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches, []);

  useEffect(() => {
    let alive = true;
    let unbind: (() => void) | undefined;
    import('../../lib/planner/scene')
      .then(({ PlannerScene, GHOST_ID }) => {
        if (!alive || !host.current) return;
        let scene: PlannerScene;
        const itemOf = (id: string) => store.$layout.get()?.items.find((x) => x.id === id);
        const overAt = (it: Pick<LayoutItem, 'element' | 'w' | 'h'> & { x: number; y: number; rotationDeg: number }) => {
          const s = store.$site.get();
          const pl = store.$placement.get();
          return s && pl ? itemSticksOut(pl, s.frame, s.parcel, it) : false;
        };
        try {
          scene = new PlannerScene(host.current, {
            onSelect: (sel) => store.$selection.set(sel),
            canDrag: () => store.editable,
            dragTransform: (kind, id, g, grab, free) => {
              const p: Vec2 = [g[0] - grab[0], g[1] - grab[1]];
              if (kind === 'existing') return p;
              const s = store.$site.get();
              const pl = store.$placement.get();
              const it = itemOf(id);
              if (!s || !pl || !it) return null;
              return snapItem(it, localToPark(pl, s.frame, p), free ? 0 : store.$snap.get(), pl.parkL, pl.parkW);
            },
            sticksOut: (id, pose) => {
              const it = itemOf(id);
              return it ? overAt({ ...it, ...pose }) : false;
            },
            onDragEnd: (kind, id, p) => {
              const d = store.$design.get();
              const s = store.$site.get();
              if (!d || !s) return;
              if (kind === 'item') {
                const it = itemOf(id);
                if (it) store.commit(moveItem(d, id, p[0], p[1], it.rotationDeg));
              } else {
                const ll = s.lf.toLngLat(p);
                store.commit(updateExisting(d, id, { lngLat: [Number(ll[0].toFixed(7)), Number(ll[1].toFixed(7))] }));
              }
            },
            onTurnEnd: (kind, id, deg) => {
              const d = store.$design.get();
              if (!d) return;
              if (kind === 'item') {
                const it = itemOf(id);
                if (it) store.commit(moveItem(d, id, it.x, it.y, deg));
              } else store.commit(updateExisting(d, id, { rotationDeg: deg }));
            },
            onMenu: (sel, at) => {
              const r = root.current?.getBoundingClientRect();
              if (!r) return;
              setMenu({ x: at.clientX - r.left, y: at.clientY - r.top, sel });
            },
            onGesture: (g) => setGesture(g),
            onCamera: (deg) => setNorth(deg),
            // terrain: wet areas drawn as outlines
            onDraw: (n) => {
              setDrawCount(n);
              // Esc on the map ends the drawing too
              if (n === null && store.$drawing.get()) store.$drawing.set(null);
            },
            onDrawDone: (points) => {
              const d = store.$design.get();
              const s = store.$site.get();
              const replaceId = store.$drawing.get()?.replaceId;
              store.$drawing.set(null);
              if (!d || !s) return;
              const { center, outline, radiusFt } = outlineFromPoints(points);
              const ll = s.lf.toLngLat(center);
              const lngLat: [number, number] = [Number(ll[0].toFixed(7)), Number(ll[1].toFixed(7))];
              if (replaceId && d.existing?.some((e) => e.id === replaceId)) {
                store.commit(updateExisting(d, replaceId, { lngLat, outline, radiusFt }));
                store.$selection.set({ kind: 'existing', id: replaceId });
              } else {
                const r = addExisting(d, 'wet-area', lngLat);
                store.commit(updateExisting(r.design, r.id, { outline, radiusFt }));
                store.$selection.set({ kind: 'existing', id: r.id });
              }
            },
            onOutlineEdit: (id, outline) => {
              const d = store.$design.get();
              if (!d) return;
              const radiusFt = Math.max(0.5, Math.round(Math.sqrt(polygonArea(outline) / Math.PI) * 10) / 10);
              store.commit(updateExisting(d, id, { outline, radiusFt }));
            },
            // sun step: a click on the ground charts that spot's sun through the year
            onGroundClick: (p) => {
              if (store.$step.get() === 'sun') {
                store.sun.$spot.set(p);
                return;
              }
              // build-lead A4: the grey band along the street edges is the gabion wall — say so
              const s = store.$site.get();
              const pl = store.$placement.get();
              const layout = store.$layout.get();
              clearTimeout(infoTimer.current);
              if (!s || !pl || !layout) return setInfo(null);
              const [x, y] = localToPark(pl, s.frame, p);
              const onWall = layout.surfaces.some((sf) => {
                if (sf.material !== 'gabion') return false;
                const xs = sf.polygon.map((q) => q[0]);
                const ys = sf.polygon.map((q) => q[1]);
                return x >= Math.min(...xs) - 0.3 && x <= Math.max(...xs) + 0.3 && y >= Math.min(...ys) - 0.3 && y <= Math.max(...ys) + 0.3;
              });
              if (!onWall) return setInfo(null);
              const ft = store.$tally.get()?.gabionWallFt;
              setInfo(`Gabion wall: one row of 12″ × 12″ × 48″ stone baskets along the street edge${ft ? ` — ${ft} ft in all (see Counts)` : ''}.`);
              infoTimer.current = setTimeout(() => setInfo(null), 8000);
            },
          });
        } catch (e) {
          console.error(e);
          setFailed('Your browser could not start the 3D view (WebGL is off or not supported). The steps and counts still work.');
          return;
        }
        sceneRef.current = scene;
        unbind = bindScene(scene, store, mode);

        // dragging a palette item onto the view (ArrangePanel drives this)
        const dropAt = (element: string, clientX: number, clientY: number) => {
          const g = scene.groundAtClient(clientX, clientY);
          const s = store.$site.get();
          const pl = store.$placement.get();
          const layout = store.$layout.get();
          const d = store.$design.get();
          if (!g || !s || !pl || !layout || !d) return null;
          return dropPlacement(layout, element, localToPark(pl, s.frame, g), store.$snap.get(), d.front);
        };
        store.bridge.viewport = {
          dropPreview(element, clientX, clientY) {
            const r = dropAt(element, clientX, clientY);
            if (!r) {
              scene.setGhost(null);
              return false;
            }
            const heightFt = ELEMENTS[element]?.heightFt;
            const item: LayoutItem = { id: GHOST_ID, element, x: r.x, y: r.y, rotationDeg: 0, w: r.w, h: r.h, theme: r.theme, source: 'added', ...(heightFt !== undefined ? { heightFt } : {}) };
            scene.setGhost(item, overAt(item));
            return true;
          },
          drop(element, clientX, clientY) {
            const r = dropAt(element, clientX, clientY);
            scene.setGhost(null);
            const d = store.$design.get();
            if (!r || !d) return false;
            const res = addItem(d, element, r.x, r.y, r.theme);
            store.commit(res.design);
            store.$selection.set({ kind: 'item', id: res.id });
            return true;
          },
          clearDrop() {
            scene.setGhost(null);
          },
        };
        setReady(true);
      })
      .catch((e) => {
        console.error(e);
        setFailed('The 3D view could not load. Check your connection and reload the page.');
      });
    return () => {
      alive = false;
      store.bridge.viewport = null;
      unbind?.();
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [store]);

  // the menu closes when you click elsewhere, press Esc, or pick something else
  useEffect(() => {
    if (!menu) return;
    menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    const away = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(null);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setMenu(null);
      }
    };
    document.addEventListener('pointerdown', away, true);
    document.addEventListener('keydown', key, true);
    return () => {
      document.removeEventListener('pointerdown', away, true);
      document.removeEventListener('keydown', key, true);
    };
  }, [menu]);
  useEffect(() => {
    if (menu && sel?.id !== menu.sel.id) setMenu(null);
  }, [sel]);

  const scene = sceneRef.current;
  const toggle = (k: 'aerial' | 'heat' | 'cityTrees' | 'grid' | 'slope') => store.$show.set({ ...show, [k]: !show[k] });
  const picked = store.editable ? describe(store, sel) : null;
  const act = (f: () => void) => () => {
    setMenu(null);
    f();
  };
  const menuInfo = menu ? describe(store, menu.sel) : null;

  let hint: string;
  if (info && !gesture && drawCount === null) {
    hint = info;
  } else if (drawCount !== null) {
    hint =
      drawCount < 3
        ? `${coarse ? 'Tap' : 'Click'} around the wet area, point by point${drawCount ? ` (${drawCount} so far)` : ''}${coarse ? '' : ' · Esc cancels'}`
        : coarse
          ? 'Tap the first point (or Finish) to close the outline'
          : 'Click the first point, double-click or press Enter to finish · Backspace takes back a point · Esc cancels';
  } else if (gesture?.mode === 'move') {
    hint = gesture.over
      ? 'This would stick out past the lot line (red)' + (coarse ? '' : ' · Esc puts it back')
      : coarse
        ? 'Lift your finger to put it here'
        : 'Let go to put it here · hold Alt to skip the grid · Esc puts it back';
  } else if (gesture?.mode === 'turn') {
    hint = `Turned to ${Math.round(gesture.deg ?? 0)}°` + (coarse ? '' : ' · hold Shift to turn freely · Esc puts it back');
  } else if (!store.editable) {
    hint = view === 'plan' ? 'Drag to move around · pinch or scroll to zoom' : 'Drag to turn · right-drag or two fingers to move · scroll or pinch to zoom';
  } else if (coarse) {
    hint = `Drag things to move them · hold one for more · drag empty ground to ${view === 'plan' ? 'move the map' : 'look around'}`;
  } else {
    hint = `Drag things to move them · drag the round handle to turn · drag empty ground to ${view === 'plan' ? 'move the map' : 'look around'} · scroll to zoom`;
  }

  return (
    <div class="pl-viewport" ref={root}>
      <div class="pl-canvas-host" ref={host} />
      {(!ready || status === 'loading') && !failed && <div class="pl-loading">Loading the 3D view…</div>}
      {failed && <div class="pl-loading pl-failed">{failed}</div>}
      {ready && site && (
        <>
          <div class="pl-toolbar" role="toolbar" aria-label="View">
            <div class="pl-seg" role="group" aria-label="View">
              <button type="button" aria-pressed={view === '3d'} onClick={() => store.$view.set('3d')}>
                3D
              </button>
              <button type="button" aria-pressed={view === 'plan'} onClick={() => store.$view.set('plan')}>
                Plan
              </button>
            </div>
            <button type="button" class="pl-tool" aria-label="Zoom in" title="Zoom in" onClick={() => scene?.zoomBy(1.25)}>
              +
            </button>
            <button type="button" class="pl-tool" aria-label="Zoom out" title="Zoom out" onClick={() => scene?.zoomBy(0.8)}>
              −
            </button>
            <button type="button" class="pl-tool" title="Back to the starting view" onClick={() => scene?.resetCamera()}>
              ⟲<span class="visually-hidden">Reset view</span>
            </button>
            <details class="pl-more">
              <summary class="pl-tool" title="More">⋯<span class="visually-hidden">More options</span></summary>
              <div class="pl-menu">
                <label>
                  <input type="checkbox" checked={show.aerial} onChange={() => toggle('aerial')} /> Aerial photo
                </label>
                <label>
                  <input type="checkbox" checked={show.cityTrees} onChange={() => toggle('cityTrees')} /> Street trees
                </label>
                {mode !== 'site' && mode !== 'sun' && (
                  <label>
                    <input type="checkbox" checked={show.grid} onChange={() => toggle('grid')} /> 1-ft grid
                  </label>
                )}
                <label>
                  <input type="checkbox" checked={show.heat} onChange={() => toggle('heat')} /> Sun-hours map
                </label>
                {site.terrain && !site.terrain.slope.flat && (
                  <label>
                    <input type="checkbox" checked={show.slope} onChange={() => toggle('slope')} /> Slope lines
                  </label>
                )}
                <button type="button" class="btn btn-small" onClick={() => scene && downloadDataUrl(scene.snapshot(view), `park-${view}.png`)}>
                  Save picture
                </button>
                {mode !== 'site' && mode !== 'sun' && (
                  <button type="button" class="btn btn-small" onClick={() => scene && printPlan(scene, store)}>
                    Print plan
                  </button>
                )}
              </div>
            </details>
          </div>
          <PlayChip store={store} />
          <div class="pl-north" style={{ transform: `rotate(${north}deg)` }} aria-hidden="true" title="North">
            <span>N</span>
          </div>
          <div class="pl-bottom">
            {drawCount !== null && (
              <div class="pl-selbar pl-drawbar" role="toolbar" aria-label="Drawing a wet area">
                <span class="pl-selbar-name">Wet area · {drawCount} point{drawCount === 1 ? '' : 's'}</span>
                <button type="button" disabled={drawCount === 0} onClick={() => scene?.undoDrawPoint()} title="Take back the last point (Backspace)">
                  ↶ Undo point
                </button>
                <button type="button" class="pl-drawbar-done" disabled={drawCount < 3} onClick={() => scene?.finishDrawing()} title="Close the outline (Enter)">
                  ✓ Finish
                </button>
                <button type="button" class="pl-selbar-danger" onClick={() => store.$drawing.set(null)} title="Stop drawing (Esc)">
                  ✕ Cancel
                </button>
              </div>
            )}
            {picked && !gesture && drawCount === null && (
              <div class="pl-selbar" role="toolbar" aria-label={`${picked.name} (picked)`}>
                <span class="pl-selbar-name">{picked.name}</span>
                {picked.turn && (
                  <button type="button" onClick={() => rotateSelected(store, 90)} title="Turn a quarter turn (R)">
                    ↻ Turn
                  </button>
                )}
                {picked.copy && (
                  <button type="button" onClick={() => duplicateSelected(store)} title="Put a copy right next to it (Ctrl+D)">
                    ⧉ Duplicate
                  </button>
                )}
                <button type="button" class="pl-selbar-danger" onClick={() => deleteSelected(store)} title="Remove it (Delete)">
                  ✕ Remove
                </button>
              </div>
            )}
            <p class={`pl-hint${gesture?.over ? ' is-over' : ''}${gesture ? ' is-live' : ''}`} aria-live="polite">
              {hint}
            </p>
          </div>
          {menu && menuInfo && (
            <div
              class="pl-ctx"
              role="menu"
              aria-label={menuInfo.name}
              ref={menuRef}
              style={{
                left: `${Math.max(4, Math.min(menu.x, (root.current?.clientWidth ?? 400) - 184))}px`,
                top: `${Math.max(4, Math.min(menu.y, (root.current?.clientHeight ?? 400) - 150))}px`,
              }}
            >
              <p class="pl-ctx-title">{menuInfo.name}</p>
              {menuInfo.turn && (
                <button type="button" role="menuitem" onClick={act(() => rotateSelected(store, 90))}>
                  ↻ Turn <kbd>R</kbd>
                </button>
              )}
              {menuInfo.copy && (
                <button type="button" role="menuitem" onClick={act(() => duplicateSelected(store))}>
                  ⧉ Duplicate <kbd>Ctrl+D</kbd>
                </button>
              )}
              <button type="button" role="menuitem" class="pl-ctx-danger" onClick={act(() => deleteSelected(store))}>
                ✕ Remove <kbd>Del</kbd>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

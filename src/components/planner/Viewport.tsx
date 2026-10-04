/** @jsxImportSource preact */
// Hosts the Three.js scene (loaded lazily) and keeps it in step with the planner store.
import { useEffect, useRef, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import type { PlannerMode, PlannerStore } from '../../lib/planner/store';
import type { PlannerScene, PickKind } from '../../lib/planner/scene';
import { bindScene, snapItem } from './binding';
import { localToPark } from '../../lib/planner/placement';
import { moveItem, updateExisting } from '../../lib/planner/design';
import { downloadDataUrl, printPlan } from './exporting';

interface Props {
  store: PlannerStore;
  mode: PlannerMode;
}

export function Viewport({ store, mode }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<PlannerScene | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [north, setNorth] = useState(0);
  const view = useStore(store.$view);
  const show = useStore(store.$show);
  const status = useStore(store.$status);
  const site = useStore(store.$site);

  useEffect(() => {
    let alive = true;
    let unbind: (() => void) | undefined;
    import('../../lib/planner/scene')
      .then(({ PlannerScene }) => {
        if (!alive || !host.current) return;
        let scene: PlannerScene;
        try {
          scene = new PlannerScene(host.current, {
            onSelect: (sel) => store.$selection.set(sel),
            canDrag: (kind: PickKind) => {
              const s = store.$step.get();
              if (kind === 'item') return s === 'arrange' || s === 'size';
              return s === 'existing' || s === 'lot';
            },
            dragTransform: (kind, id, g, grab) => {
              const site = store.$site.get();
              const pl = store.$placement.get();
              const p: [number, number] = [g[0] - grab[0], g[1] - grab[1]];
              if (kind === 'existing') return { p, preview: p };
              if (!site || !pl) return null;
              const layout = store.$layout.get();
              const it = layout?.items.find((x) => x.id === id);
              if (!it) return null;
              const pp = localToPark(pl, site.frame, p);
              const snapped = snapItem(it, pp, store.$snap.get(), pl.parkL, pl.parkW);
              return { p: snapped, preview: snapped };
            },
            onDragEnd: (kind, id, p) => {
              const d = store.$design.get();
              const site = store.$site.get();
              if (!d || !site) return;
              if (kind === 'item') {
                const it = store.$layout.get()?.items.find((x) => x.id === id);
                if (it) store.commit(moveItem(d, id, p[0], p[1], it.rotationDeg));
              } else {
                const ll = site.lf.toLngLat(p);
                store.commit(updateExisting(d, id, { lngLat: [Number(ll[0].toFixed(7)), Number(ll[1].toFixed(7))] }));
              }
            },
            onCamera: (deg) => setNorth(deg),
          });
        } catch (e) {
          console.error(e);
          setFailed('Your browser could not start the 3D view (WebGL is off or not supported). The steps and counts still work.');
          return;
        }
        sceneRef.current = scene;
        unbind = bindScene(scene, store, mode);
        setReady(true);
      })
      .catch((e) => {
        console.error(e);
        setFailed('The 3D view could not load. Check your connection and reload the page.');
      });
    return () => {
      alive = false;
      unbind?.();
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [store]);

  const scene = sceneRef.current;
  const toggle = (k: 'aerial' | 'heat' | 'cityTrees' | 'grid') => store.$show.set({ ...show, [k]: !show[k] });

  return (
    <div class="pl-viewport">
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
          <div class="pl-north" style={{ transform: `rotate(${north}deg)` }} aria-hidden="true" title="North">
            <span>N</span>
          </div>
          <p class="pl-hint" aria-hidden="true">
            {view === 'plan' ? 'Drag to move around · pinch or scroll to zoom' : 'Drag to turn · right-drag or two fingers to move · scroll or pinch to zoom'}
          </p>
        </>
      )}
    </div>
  );
}

/** @jsxImportSource preact */
// How the lot's ground slopes, in plain words (terrain, 2026-10-04): facts from USGS lidar,
// a switch for the slope lines on the map, and how far to trust the numbers. No advice.
import { useStore } from '@nanostores/preact';
import type { PlannerStore } from '../../lib/planner/store';
import { accuracyNote } from '../../lib/planner/terrain';
import { contourInterval } from '../../lib/planner/terrain/slope';
import { links } from '../../lib/philly/endpoints';

export function SlopeCard({ store, compact = false }: { store: PlannerStore; compact?: boolean }) {
  const site = useStore(store.$site);
  const terrain = useStore(store.$terrain);
  const show = useStore(store.$show);
  if (!site || terrain.status === 'none') return null;
  const t = site.terrain;
  const toggle = () => {
    const on = !show.slope;
    store.$show.set({ ...show, slope: on });
    if (on) store.$view.set('plan');
  };
  return (
    <div class="pl-card pl-slope" aria-live="polite">
      <h4 class="pl-h4">Ground &amp; slope</h4>
      {terrain.status === 'loading' && !t && <p class="pl-small muted">Getting the ground heights for your lot (U.S. Geological Survey lidar)… The lot is shown flat until they arrive.</p>}
      {terrain.status === 'failed' && !t && (
        <p class="pl-small">Couldn't get ground heights for this lot right now, so the planner shows it as flat. Everything else works.</p>
      )}
      {t && (
        <>
          <p class="pl-small">{t.words.headline}</p>
          {!compact && t.words.more.map((m) => <p class="pl-small">{m}</p>)}
          {t.steepSlope && (
            <p class="pl-small">
              City zoning maps this lot in the <strong>Steep Slope Protection Area</strong> (Zoning Code 14-704(2): earth moving on steep slopes).{' '}
              <a href={links.atlasZoning(site.ctx.lot.address)} target="_blank" rel="noopener">
                Zoning on atlas.phila.gov
              </a>
            </p>
          )}
          {!t.slope.flat && (
            <div class="pl-row">
              <button type="button" class="btn btn-small" aria-pressed={show.slope} onClick={toggle}>
                {show.slope ? 'Hide the slope lines' : 'Show the slope on the map'}
              </button>
            </div>
          )}
          {show.slope && !t.slope.flat && !compact && (
            <p class="pl-small muted">
              Brown lines join ground of equal height{slopeInterval(t.slope.fallFt)}; arrows point downhill, the way rain runs off. ▲ and ▼ mark the
              highest and lowest ground on the lot.
            </p>
          )}
          {!compact && (
            <p class="pl-small muted">
              Front is the entrance edge on the street; left and right are as you stand there looking in. {accuracyNote(t.source)}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function slopeInterval(fallFt: number): string {
  const i = contourInterval(fallFt);
  if (!i) return '';
  return i < 1 ? `, every ${Math.round(i * 12)} inches of height` : `, every ${i} ft of height`;
}

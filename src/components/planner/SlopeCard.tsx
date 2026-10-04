/** @jsxImportSource preact */
// How the lot's ground slopes, in plain words (terrain, 2026-10-04): facts from USGS lidar,
// a switch for the slope lines on the map, and how far to trust the numbers. No advice.
import { useStore } from '@nanostores/preact';
import type { PlannerStore } from '../../lib/planner/store';
import { accuracyNote } from '../../lib/planner/terrain';
import { contourInterval } from '../../lib/planner/terrain/slope';
import { links } from '../../lib/philly/endpoints';
import { pt, type PlannerT } from '../../lib/planner/words';

export function SlopeCard({ store, compact = false }: { store: PlannerStore; compact?: boolean }) {
  const site = useStore(store.$site);
  const terrain = useStore(store.$terrain);
  const show = useStore(store.$show);
  if (!site || terrain.status === 'none') return null;
  const w = pt();
  const t = site.terrain;
  const toggle = () => {
    const on = !show.slope;
    store.$show.set({ ...show, slope: on });
    if (on) store.$view.set('plan');
  };
  return (
    <div class="pl-card pl-slope" aria-live="polite">
      <h4 class="pl-h4">{w('slope.title')}</h4>
      {terrain.status === 'loading' && !t && <p class="pl-small muted">{w('slope.loading')}</p>}
      {terrain.status === 'failed' && !t && <p class="pl-small">{w('slope.failed')}</p>}
      {t && (
        <>
          <p class="pl-small">{t.words.headline}</p>
          {!compact && t.words.more.map((m) => <p class="pl-small">{m}</p>)}
          {t.steepSlope && (
            <p class="pl-small">
              <span dangerouslySetInnerHTML={{ __html: w.html('slope.steepArea') }} />{' '}
              <a href={links.atlasZoning(site.ctx.lot.address)} target="_blank" rel="noopener">
                {w('slope.atlasLink')}
              </a>
            </p>
          )}
          {!t.slope.flat && (
            <div class="pl-row">
              <button type="button" class="btn btn-small" aria-pressed={show.slope} onClick={toggle}>
                {w(show.slope ? 'slope.hide' : 'slope.show')}
              </button>
            </div>
          )}
          {show.slope && !t.slope.flat && !compact && (
            <p class="pl-small muted">{slopeLegend(t.slope.fallFt, w)}</p>
          )}
          {!compact && (
            <p class="pl-small muted">
              {w('slope.directions')} {accuracyNote(t.source, w)}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function slopeLegend(fallFt: number, w: PlannerT): string {
  const i = contourInterval(fallFt);
  if (!i) return w('slope.legend');
  return i < 1 ? w('slope.legendInches', { inches: Math.round(i * 12) }) : w('slope.legendFeet', { ft: i });
}

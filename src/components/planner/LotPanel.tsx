/** @jsxImportSource preact */
import { useStore } from '@nanostores/preact';
import type { PlannerStore } from '../../lib/planner/store';
import type { DesignState } from '../../lib/types';
import { u } from '../../lib/url';
import { streetKey } from '../../lib/planner/rect';
import { distanceToPolyline } from '../../lib/planner/geo';
import { siteToLocal } from '../../lib/planner/rect';

const KIND_LABEL = {
  interior: 'Mid-block (buildings on both sides)',
  'corner-left': 'Corner — side street on your left as you walk in',
  'corner-right': 'Corner — side street on your right as you walk in',
} as const;

const title = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export function LotPanel({ store }: { store: PlannerStore }) {
  const site = useStore(store.$site);
  const d = useStore(store.$design);
  const overhang = useStore(store.$overhang);
  const layout = useStore(store.$layout);
  if (!site || !d) return null;
  const f = site.frame;
  // the street in front of the entrance
  const mid = siteToLocal(f, [-4, f.widthFt / 2]);
  let entranceStreet = '';
  let best = Infinity;
  for (const s of site.streets) {
    const dd = distanceToPolyline(mid, s.line);
    if (dd < best) {
      best = dd;
      entranceStreet = s.name ?? '';
    }
  }
  const set = (patch: Partial<DesignState>) => store.commit({ ...d, ...patch, updatedAt: new Date().toISOString() });
  const turn = d.turn ?? 0;
  const shift = d.shiftFt ?? [0, 0];
  const nudge = (dx: number, dy: number) => set({ shiftFt: [shift[0] + dx, shift[1] + dy] });

  return (
    <section class="pl-section">
      <h3 class="pl-h">{title(site.ctx.lot.address)}</h3>
      <dl class="pl-facts">
        <div>
          <dt>Size of the lot</dt>
          <dd>
            about {Math.round(f.lengthFt)} ft long × {Math.round(f.widthFt)} ft wide ({Math.round(site.areaSqFt).toLocaleString()} sq ft)
          </dd>
        </div>
        <div>
          <dt>Kind of lot</dt>
          <dd>{KIND_LABEL[f.lotKind]}</dd>
        </div>
        {entranceStreet && best < 80 && (
          <div>
            <dt>Entrance</dt>
            <dd>
              from {title(entranceStreet)}
              {streetKey(site.ctx.lot.address) && streetKey(entranceStreet) !== streetKey(site.ctx.lot.address) ? ' (not the street in the address — turn the park if this is wrong)' : ''}
            </dd>
          </div>
        )}
      </dl>
      <p class="pl-small muted">
        Outline from the City's parcel map; neighbors' buildings drawn at their City-recorded heights; street trees from the
        City's tree inventory.
      </p>

      <h4 class="pl-h4">Fit the park on the lot</h4>
      <p class="pl-small">
        The park's entrance faces the street. If it's on the wrong end or the wrong way round, turn or flip it here.
      </p>
      <div class="pl-row">
        <button type="button" class="btn btn-small" onClick={() => set({ turn: ((turn + 2) % 4) as 0 | 1 | 2 | 3 })}>
          ⇄ Entrance at the other end
        </button>
        <button type="button" class="btn btn-small" onClick={() => set({ flipped: !d.flipped })}>
          ⇅ Flip left–right
        </button>
        <button type="button" class="btn btn-small" onClick={() => set({ turn: ((turn + 1) % 4) as 0 | 1 | 2 | 3 })}>
          ↻ Turn 90°
        </button>
      </div>
      <div class="pl-nudge" role="group" aria-label="Slide the park on the lot, 1 foot at a time">
        <span class="pl-small">Slide the park:</span>
        <button type="button" class="pl-tool" aria-label="Slide toward the entrance" onClick={() => nudge(-1, 0)}>
          ←
        </button>
        <button type="button" class="pl-tool" aria-label="Slide toward the back" onClick={() => nudge(1, 0)}>
          →
        </button>
        <button type="button" class="pl-tool" aria-label="Slide to the left" onClick={() => nudge(0, 1)}>
          ↑
        </button>
        <button type="button" class="pl-tool" aria-label="Slide to the right" onClick={() => nudge(0, -1)}>
          ↓
        </button>
        {(shift[0] !== 0 || shift[1] !== 0 || turn !== 0 || d.flipped) && (
          <button type="button" class="btn btn-small" onClick={() => set({ shiftFt: [0, 0], turn: 0, flipped: false })}>
            Put it back
          </button>
        )}
      </div>
      {overhang && overhang.outsideSqFt > 0 && (
        <p class="pl-warn">
          About {overhang.outsideSqFt} sq ft of the park hangs over the lot line (shown in red)
          {overhang.items.length ? `, and ${overhang.items.length} thing${overhang.items.length > 1 ? 's' : ''} stick out` : ''}.{' '}
          {turn % 2 === 1
            ? 'Turned this way the park does not fit — turn it back, or pick a smaller size.'
            : d.fitToLot === false
              ? 'The printed pieces are bigger than your lot — try “Stretch the pieces to fill my lot” in Size & themes.'
              : layout && (layout.lengthFt > f.lengthFt + 0.5 || layout.widthFt > f.widthFt + 0.5)
                ? d.size === 'A'
                  ? 'Even the smallest pieces (size A) are bigger than your lot — the Park Patch workbook may suit it better.'
                  : `Size ${d.size} is bigger than your lot — try a smaller size in Size & themes.`
                : "Your lot isn't a perfect rectangle — move or remove what sticks out in “Arrange”, or slide the park."}
        </p>
      )}
      <p class="pl-small">
        <a href={u('lot/')}>Choose a different lot</a>
      </p>
    </section>
  );
}

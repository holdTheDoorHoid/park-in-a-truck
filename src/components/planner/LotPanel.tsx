/** @jsxImportSource preact */
import { useStore } from '@nanostores/preact';
import type { PlannerStore } from '../../lib/planner/store';
import type { DesignState } from '../../lib/types';
import { u } from '../../lib/url';
import { streetKey } from '../../lib/planner/rect';
import { distanceToPolyline } from '../../lib/planner/geo';
import { siteToLocal } from '../../lib/planner/rect';
import { computeOverhang, makePlacement } from '../../lib/planner/placement';
import { bestSlide, fitFeet, slideRoom, type SlideDir } from '../../lib/planner/lotfit';
import { setSize } from '../../lib/planner/design';
import { SIZES } from '../../lib/sizing';
import { getExtra } from '../../lib/project';
import type { SiteFacts, SizeId } from '../../lib/types';
import { midBlockWords, sideNeighbours } from '../../lib/planner/neighbours';
import type { Vec2 } from '../../lib/planner/geo';

const KIND_LABEL = {
  // (mid-block: worded from the buildings actually there — veteran S6)
  interior: 'Mid-block',
  'corner-left': 'Corner — side street on your left as you walk in',
  'corner-right': 'Corner — side street on your right as you walk in',
} as const;

const title = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export function LotPanel({ store }: { store: PlannerStore }) {
  const site = useStore(store.$site);
  const d = useStore(store.$design);
  const overhang = useStore(store.$overhang);
  const layout = useStore(store.$layout);
  const fit = useStore(store.$fit);
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
  // build-lead A6: slides only where there's room, and a slide to the best fit when it hangs over
  const outsideAt = (s: Vec2) =>
    layout ? computeOverhang(makePlacement(f, layout.lengthFt, layout.widthFt, turn, d.flipped ?? false, s, fit ?? undefined), f, site.parcel).outsideSqFt : 0;
  const room = layout ? slideRoom(outsideAt, shift) : null;
  const blocked = (k: SlideDir) => Boolean(room?.blocked[k]);
  const full = room && Object.values(room.blocked).every(Boolean);
  const noRoom = 'No room to slide it this way: the park already reaches the lot line';
  // what fits inside the lot lines (the largest rectangle) vs this size's printed pieces
  const fitL = fitFeet(fit?.lengthFt ?? f.lengthFt);
  const fitW = fitFeet(fit?.widthFt ?? f.widthFt);
  const tooBig = Boolean(layout && (layout.lengthFt > fitL + 0.01 || layout.widthFt > fitW + 0.01));
  const order = SIZES.map((s) => s.id);
  const printed = SIZES.find((s) => s.id === d.size)!;
  // the biggest smaller size whose printed pieces fit inside the lot lines
  const fitsSize = [...SIZES].reverse().find((s) => order.indexOf(s.id) < order.indexOf(d.size) && s.long[0] <= fitL && s.short[0] <= fitW)?.id as SizeId | undefined;
  const useSize = (s: SizeId) => store.commit(setSize(d, s, site, store.$demo.get() ? undefined : getExtra<SiteFacts>('site')));

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
          <dd>{f.lotKind === 'interior' ? midBlockWords(sideNeighbours(f, site.buildings.map((b) => b.ring))) : KIND_LABEL[f.lotKind]}</dd>
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
        <button type="button" class="pl-tool" aria-label="Slide toward the entrance" disabled={blocked('front')} title={blocked('front') ? noRoom : undefined} onClick={() => nudge(-1, 0)}>
          ←
        </button>
        <button type="button" class="pl-tool" aria-label="Slide toward the back" disabled={blocked('back')} title={blocked('back') ? noRoom : undefined} onClick={() => nudge(1, 0)}>
          →
        </button>
        <button type="button" class="pl-tool" aria-label="Slide to the left" disabled={blocked('left')} title={blocked('left') ? noRoom : undefined} onClick={() => nudge(0, 1)}>
          ↑
        </button>
        <button type="button" class="pl-tool" aria-label="Slide to the right" disabled={blocked('right')} title={blocked('right') ? noRoom : undefined} onClick={() => nudge(0, -1)}>
          ↓
        </button>
        {(shift[0] !== 0 || shift[1] !== 0 || turn !== 0 || d.flipped) && (
          <button type="button" class="btn btn-small" onClick={() => set({ shiftFt: [0, 0], turn: 0, flipped: false })}>
            Put it back
          </button>
        )}
      </div>
      {full && <p class="pl-small muted">The park fills the lot, so there's no room to slide it.</p>}
      {overhang && overhang.outsideSqFt > 0 && layout && (
        <p class="pl-row">
          <button type="button" class="btn btn-small" onClick={() => set({ shiftFt: bestSlide(outsideAt) })}>
            Slide it to fit the lot as well as it can
          </button>
        </p>
      )}
      {overhang && overhang.outsideSqFt > 0 && (
        <p class="pl-warn">
          About {overhang.outsideSqFt} sq ft of the park hangs over the lot line (shown in red)
          {overhang.items.length ? `, and ${overhang.items.length} thing${overhang.items.length > 1 ? 's' : ''} stick out` : ''}.{' '}
          {turn % 2 === 1
            ? 'Turned this way the park does not fit — turn it back, or pick a smaller size.'
            : d.fitToLot === false
              ? 'The printed pieces are bigger than your lot — try “Stretch the pieces to fill my lot” in Size & themes.'
              : tooBig && layout
                ? d.size === 'A'
                  ? 'Even the smallest pieces (size A) are bigger than your lot — the Park Patch workbook may suit it better.'
                  : `Inside its lot lines your lot is only about ${fitL} × ${fitW} ft, and size ${d.size}'s pieces are at least ${printed.long[0]} × ${printed.short[0]} ft, so the park hangs over.${fitsSize ? '' : ' Try a smaller size in Size & themes.'}`
                : "Your lot isn't a perfect rectangle — move or remove what sticks out in “Arrange”, or slide the park."}
        </p>
      )}
      {overhang && overhang.outsideSqFt > 0 && turn % 2 === 0 && d.fitToLot !== false && tooBig && fitsSize && (
        <p class="pl-row">
          <button type="button" class="btn btn-small btn-primary" onClick={() => useSize(fitsSize)}>
            Use size {fitsSize} — it fits inside your lot
          </button>
        </p>
      )}
      <p class="pl-small">
        <a href={u('lot/')}>Choose a different lot</a>
      </p>
    </section>
  );
}

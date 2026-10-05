/** @jsxImportSource preact */
import { useStore } from '@nanostores/preact';
import type { PlannerStore } from '../../lib/planner/store';
import type { DesignState } from '../../lib/types';
import { urlFor } from '../../i18n/url';
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
import { isolate, pt, type PlannerKey } from '../../lib/planner/words';
import { homeTurn, partOf, stretchTo, turnedAgainst } from '../../lib/planner/area';

// (mid-block: worded from the buildings actually there — veteran S6)
const KIND_LABEL: Record<'corner-left' | 'corner-right', PlannerKey> = {
  'corner-left': 'lot.kindCornerLeft',
  'corner-right': 'lot.kindCornerRight',
};

const title = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export function LotPanel({ store }: { store: PlannerStore }) {
  const site = useStore(store.$site);
  const d = useStore(store.$design);
  const overhang = useStore(store.$overhang);
  const layout = useStore(store.$layout);
  const fit = useStore(store.$fit);
  if (!site || !d) return null;
  const t = pt();
  const u = urlFor(t.locale);
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
  const noRoom = t('lot.noRoom');
  // what fits inside the lot lines (the largest rectangle) — or the part of the lot the park
  // uses, along the park's own length and width — vs this size's printed pieces
  const part = partOf(d);
  const room0 = stretchTo(d, fit ?? f);
  const fitL = fitFeet(room0.lengthFt);
  const fitW = fitFeet(room0.widthFt);
  const against = turnedAgainst(d);
  const home = homeTurn(d);
  const tooBig = Boolean(layout && (layout.lengthFt > fitL + 0.01 || layout.widthFt > fitW + 0.01));
  const order = SIZES.map((s) => s.id);
  const printed = SIZES.find((s) => s.id === d.size)!;
  // the biggest smaller size whose printed pieces fit inside the lot lines
  const fitsSize = [...SIZES].reverse().find((s) => order.indexOf(s.id) < order.indexOf(d.size) && s.long[0] <= fitL && s.short[0] <= fitW)?.id as SizeId | undefined;
  const useSize = (s: SizeId) => store.commit(setSize(d, s, site, store.$demo.get() ? undefined : getExtra<SiteFacts>('site')));
  const otherStreet = Boolean(streetKey(site.ctx.lot.address) && streetKey(entranceStreet) !== streetKey(site.ctx.lot.address));
  const overhangReason = () =>
    against
      ? t('lot.overhangTurned')
      : d.fitToLot === false
        ? t('lot.overhangPrinted')
        : tooBig && layout && part
          ? t('lot.overhangPart')
          : tooBig && layout
          ? d.size === 'A'
            ? t('lot.overhangSizeA')
            : t('lot.overhangTooBig', { length: fitL, width: fitW, size: d.size, minLength: printed.long[0], minWidth: printed.short[0] }) +
              (fitsSize ? '' : ' ' + t('lot.trySmaller'))
          : t('lot.overhangShape');

  return (
    <section class="pl-section">
      <h3 class="pl-h">{isolate(title(site.ctx.lot.address))}</h3>
      <dl class="pl-facts">
        <div>
          <dt>{t('lot.size')}</dt>
          <dd>{t('lot.sizeValue', { length: Math.round(f.lengthFt), width: Math.round(f.widthFt), area: Math.round(site.areaSqFt) })}</dd>
        </div>
        <div>
          <dt>{t('lot.kind')}</dt>
          <dd>{f.lotKind === 'interior' ? midBlockWords(sideNeighbours(f, site.buildings.map((b) => b.ring))) : t(KIND_LABEL[f.lotKind])}</dd>
        </div>
        {entranceStreet && best < 80 && (
          <div>
            <dt>{t('lot.entrance')}</dt>
            <dd>{t(otherStreet ? 'lot.entranceFromOther' : 'lot.entranceFrom', { street: isolate(title(entranceStreet)) })}</dd>
          </div>
        )}
      </dl>
      <p class="pl-small muted">{t('lot.sources')}</p>

      <h4 class="pl-h4">{t('lot.fitTitle')}</h4>
      <p class="pl-small">{t('lot.fitHelp')}</p>
      {part && (
        <p class="pl-small">
          {t('lot.partNote', { length: Math.round(Math.max(part.lengthFt, part.widthFt)), width: Math.round(Math.min(part.lengthFt, part.widthFt)) })}
        </p>
      )}
      <div class="pl-row">
        <button type="button" class="btn btn-small" onClick={() => set({ turn: ((turn + 2) % 4) as 0 | 1 | 2 | 3 })}>
          {t('lot.otherEnd')}
        </button>
        <button type="button" class="btn btn-small" onClick={() => set({ flipped: !d.flipped })}>
          {t('lot.flip')}
        </button>
        <button type="button" class="btn btn-small" onClick={() => set({ turn: ((turn + 1) % 4) as 0 | 1 | 2 | 3 })}>
          {t('lot.turn')}
        </button>
      </div>
      <div class="pl-nudge" role="group" aria-label={t('lot.slideGroup')}>
        <span class="pl-small">{t('lot.slideLabel')}</span>
        {/* the arrows point the way the park moves on a plan with its entrance on the left: they stay left to right in every language */}
        <span class="pl-pad" dir="ltr">
          <button type="button" class="pl-tool" aria-label={t('lot.slideFront')} disabled={blocked('front')} title={blocked('front') ? noRoom : undefined} onClick={() => nudge(-1, 0)}>
            ←
          </button>
          <button type="button" class="pl-tool" aria-label={t('lot.slideBack')} disabled={blocked('back')} title={blocked('back') ? noRoom : undefined} onClick={() => nudge(1, 0)}>
            →
          </button>
          <button type="button" class="pl-tool" aria-label={t('lot.slideLeft')} disabled={blocked('left')} title={blocked('left') ? noRoom : undefined} onClick={() => nudge(0, 1)}>
            ↑
          </button>
          <button type="button" class="pl-tool" aria-label={t('lot.slideRight')} disabled={blocked('right')} title={blocked('right') ? noRoom : undefined} onClick={() => nudge(0, -1)}>
            ↓
          </button>
        </span>
        {(shift[0] !== 0 || shift[1] !== 0 || turn !== home || d.flipped) && (
          <button type="button" class="btn btn-small" onClick={() => set({ shiftFt: [0, 0], turn: home, flipped: false })}>
            {t('lot.putBack')}
          </button>
        )}
      </div>
      {full && <p class="pl-small muted">{t('lot.full')}</p>}
      {overhang && overhang.outsideSqFt > 0 && layout && (
        <p class="pl-row">
          <button type="button" class="btn btn-small" onClick={() => set({ shiftFt: bestSlide(outsideAt) })}>
            {t('lot.bestSlide')}
          </button>
        </p>
      )}
      {overhang && overhang.outsideSqFt > 0 && (
        <p class="pl-warn">
          {overhang.items.length
            ? t('lot.overhangItems', { area: overhang.outsideSqFt, count: overhang.items.length })
            : t('lot.overhang', { area: overhang.outsideSqFt })}{t.space}
          {overhangReason()}
        </p>
      )}
      {overhang && overhang.outsideSqFt > 0 && !against && !part && d.fitToLot !== false && tooBig && fitsSize && (
        <p class="pl-row">
          <button type="button" class="btn btn-small btn-primary" onClick={() => useSize(fitsSize)}>
            {t('lot.useSize', { size: fitsSize })}
          </button>
        </p>
      )}
      <p class="pl-small">
        <a href={u('lot/')}>{t('lot.choose')}</a>
      </p>
    </section>
  );
}

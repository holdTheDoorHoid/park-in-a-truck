/** @jsxImportSource preact */
// The shade calendar (2026-10-04), under "Sun through the year at one spot" in the Sun and
// shade step: for the same spot, WHEN in the day it gets direct sun, month by month — a grid of
// 12 months × half-hours (Philadelphia clock time), a plain-words summary above it, a legend,
// and a table below. A click/tap (or Enter) on a square sets the planner's date (the 15th) and
// time so the 3D view shows that moment; the moment it shows is ringed. "Whole lot" swaps the
// spot for the share of the lot in direct sun. Words: area "shade" (shadewords.ts).
//
// Right to left (Arabic): the grid is laid out like a table, so it follows the page — months
// start on the right and the morning is on the right, as the Sun panel's own time slider runs
// in a right-to-left page; arrow keys move the way they point.
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'preact/hooks';
import type { TargetedKeyboardEvent } from 'preact';
import { useStore } from '@nanostores/preact';
import type { PlannerStore } from '../../lib/planner/store';
import { CAL_LOT, CAL_SPOT, CAL_YEAR, cellShares, shownColumns, summarise, sunShare, type CalCell, type ShadeCal } from '../../lib/planner/shadecal';
import { ShadeCalRunner, cachedShadeCal, keepShadeCal, shadeCalJob, shadeCalKey, type CalKind } from '../../lib/planner/shadecalrun';
import {
  cellWords,
  clockTime,
  groupSentences,
  lotRow,
  monthName,
  monthsLabel,
  pct,
  shadeLang,
  shadeT,
  stateSpans,
  sunUpSpan,
  type ShadeT,
} from '../../lib/planner/shadewords';
import './shadecal.css';

/** Whole lot: the share of the lot in direct sun, from shade-navy to sun-amber (OKLab steps, lightness rises with the share). */
export const LOT_RAMP = ['#1d3570', '#324470', '#47516f', '#5d5e6e', '#726a6a', '#897666', '#a08260', '#b78e57', '#ce994a', '#e7a536', '#ffb000'];
export const lotColor = (share: number) => LOT_RAMP[Math.max(0, Math.min(10, Math.round(share * 10)))]!;

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
type Cell = [month: number, col: number];
const same = (a: Cell | null, b: Cell | null) => Boolean(a && b && a[0] === b[0] && a[1] === b[1]);

/** the drawn square: each kind's share stacked (sun, dappled, building, sun down) */
function spotFill(c: CalCell) {
  const s = cellShares(c);
  return (['sun', 'tree', 'building', 'night'] as const)
    .filter((k) => s[k] >= 0.04)
    .map((k) => <span class={`sc-part sc-${k}`} style={{ flexGrow: s[k] }} />);
}

function lotFill(c: CalCell) {
  const night = c.night / c.n;
  const day = 1 - night;
  return [
    day >= 0.04 && <span class="sc-part" style={{ flexGrow: day, background: lotColor(sunShare(c, 'lot')) }} />,
    night >= 0.04 && <span class="sc-part sc-night" style={{ flexGrow: night }} />,
  ];
}

interface GridProps {
  t: ShadeT;
  /** id of the "how to use it" line */
  howId: string;
  cal: ShadeCal;
  cols: number[];
  now: Cell | null;
  active: Cell;
  dir: 'ltr' | 'rtl';
  onApply: (c: Cell) => void;
  onActive: (c: Cell) => void;
  onHover: (c: Cell | null) => void;
}

function Grid({ t, howId, cal, cols, now, active, dir, onApply, onActive, onHover }: GridProps) {
  const ref = useRef<HTMLDivElement>(null);
  const cellOf = (el: EventTarget | null): Cell | null => {
    const e = (el as HTMLElement | null)?.closest?.('[data-c]') as HTMLElement | null;
    return e ? [Number(e.dataset.m), Number(e.dataset.c)] : null;
  };
  // keyboard focus follows the active square (after the render that moved tabindex to it)
  useEffect(() => {
    const g = ref.current;
    if (g && g.contains(document.activeElement) && document.activeElement !== g) {
      g.querySelector<HTMLElement>(`[data-m="${active[0]}"][data-c="${active[1]}"]`)?.focus();
    }
  }, [active[0], active[1]]);
  const onKeyDown = (e: TargetedKeyboardEvent<HTMLDivElement>) => {
    const [m, c] = active;
    const first = cols[0]!;
    const last = cols[cols.length - 1]!;
    // arrows move the way they point: in a right-to-left page the morning is on the right
    const fwd = dir === 'rtl' ? -1 : 1;
    let next: Cell | null = null;
    if (e.key === 'ArrowRight') next = [m, c + fwd];
    else if (e.key === 'ArrowLeft') next = [m, c - fwd];
    else if (e.key === 'ArrowUp') next = [m - 1, c];
    else if (e.key === 'ArrowDown') next = [m + 1, c];
    else if (e.key === 'Home') next = e.ctrlKey ? [1, first] : [m, first];
    else if (e.key === 'End') next = e.ctrlKey ? [12, last] : [m, last];
    else if (e.key === 'PageUp') next = [1, c];
    else if (e.key === 'PageDown') next = [12, c];
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onApply(active);
      return;
    }
    if (!next) return;
    e.preventDefault();
    onActive([Math.max(1, Math.min(12, next[0])), Math.max(first, Math.min(last, next[1]))]);
  };

  return (
    <div
      ref={ref}
      class="sc-grid"
      role="grid"
      aria-label={t(cal.kind === 'lot' ? 'grid.labelLot' : 'grid.label')}
      aria-describedby={howId}
      style={{ '--sc-cols': cols.length }}
      onKeyDown={onKeyDown}
      onClick={(e) => {
        const c = cellOf(e.target);
        if (c) onApply(c);
      }}
      onPointerMove={(e) => onHover(cellOf(e.target))}
      onPointerLeave={() => onHover(null)}
      onFocusIn={(e) => {
        const c = cellOf(e.target);
        if (c) onActive(c);
      }}
    >
      {/* clock-time ticks: a mark at each hour, a label every three hours */}
      <div class="sc-head" aria-hidden="true">
        <span class="sc-corner" />
        {cols.map((c) => {
          const min = cal.startMin + c * cal.stepMin;
          const hour = min % 60 === 0;
          return <span class={`sc-tick${hour ? ' is-hour' : ''}`}>{hour && min % 180 === 0 && <span class="sc-tick-label">{clockTime(t, min, true)}</span>}</span>;
        })}
      </div>
      {MONTHS.map((m) => (
        <div role="row" class={`sc-row${now?.[0] === m ? ' is-now' : ''}`}>
          <span role="rowheader" class="sc-month" title={monthName(t, m)}>
            {monthName(t, m, 'short')}
          </span>
          {cols.map((c) => {
            const cell = cal.cells[m - 1]![c]!;
            const isNow = same(now, [m, c]);
            const isActive = same(active, [m, c]);
            return (
              <span
                role="gridcell"
                class={`sc-cell${isNow ? ' is-now' : ''}`}
                data-m={m}
                data-c={c}
                tabIndex={isActive ? 0 : -1}
                aria-current={isNow ? 'time' : undefined}
                aria-label={isNow ? `${cellWords(t, cal, m, c)} ${t('cell.now')}` : cellWords(t, cal, m, c)}
              >
                <span class="sc-fill">{cal.kind === 'lot' ? lotFill(cell) : spotFill(cell)}</span>
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function ShadeCalendar({ store }: { store: PlannerStore }) {
  const t = useMemo(() => shadeT(), []);
  const lang = shadeLang(t);
  const site = useStore(store.$site);
  const design = useStore(store.$design);
  const spotAt = useStore(store.sun.$spotAt);
  const time = useStore(store.$sunTime);
  const [kind, setKind] = useState<CalKind>('spot');
  /** the calendar on show (the previous one stays, dimmed, while the next is worked out) */
  const [cal, setCal] = useState<ShadeCal | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState<Cell | null>(null);
  const [hover, setHover] = useState<Cell | null>(null);
  const [applied, setApplied] = useState('');
  const [retry, setRetry] = useState(0);
  // pointer moves within one square don't re-render anything
  const hoverTo = useCallback((c: Cell | null) => setHover((h) => (c && same(h, c)) || (!c && !h) ? h : c), []);
  const activeTo = useCallback((c: Cell) => setActive((a) => (same(a, c) ? a : c)), []);
  const runner = useRef<ShadeCalRunner | null>(null);
  const uid = useId();
  const howId = `${uid}-how`;
  const modeId = `${uid}-mode`;
  useEffect(() => () => runner.current?.destroy(), []);

  // ---- work it out (cached per spot and trees; a new spot cancels the old job) ----
  const sx = kind === 'spot' ? (spotAt?.[0] ?? 0) : 0;
  const sy = kind === 'spot' ? (spotAt?.[1] ?? 0) : 0;
  useEffect(() => {
    if (!site || !spotAt) return;
    const existing = design?.existing;
    const key = shadeCalKey(site, existing, kind, spotAt);
    const hit = cachedShadeCal(site, key);
    if (hit) {
      setCal(hit);
      setBusy(null);
      setFailed(false);
      return;
    }
    setBusy(0);
    setFailed(false);
    let live = true;
    // a moment later: the click that picked the spot is answered first, and a quick run of changes works out once
    const id = setTimeout(() => {
      const r = (runner.current ??= new ShadeCalRunner());
      r.run(shadeCalJob(site, existing, kind, spotAt), (f) => live && setBusy(f))
        .then((c) => {
          keepShadeCal(site, key, c);
          if (!live) return;
          setCal(c);
          setBusy(null);
        })
        .catch((e: Error) => {
          if (!live || e.message === 'cancelled') return;
          console.error(e);
          setBusy(null);
          setFailed(true);
        });
    }, 60);
    return () => {
      live = false;
      clearTimeout(id);
      runner.current?.cancel();
    };
  }, [site, design?.existing, kind, sx, sy, retry]);

  const shown = cal && cal.kind === kind ? cal : null;
  const cols = useMemo(() => {
    if (!shown) return [];
    const [a, z] = shownColumns(shown);
    return Array.from({ length: z - a + 1 }, (_, i) => a + i);
  }, [shown]);
  const now: Cell | null = useMemo(() => {
    if (!shown || !cols.length) return null;
    const c = Math.floor((time.minutes - shown.startMin) / shown.stepMin);
    return c >= cols[0]! && c <= cols[cols.length - 1]! ? [time.month, c] : null;
  }, [shown, cols, time.month, time.minutes]);
  const focus: Cell | null = shown && cols.length ? (active ?? now ?? [time.month, cols[Math.floor(cols.length / 2)]!]) : null;

  const apply = (c: Cell) => {
    if (!shown) return;
    const minutes = shown.startMin + c[1] * shown.stepMin + shown.stepMin / 2;
    const play = store.sun.$play.get();
    if (play.mode !== 'off') store.sun.$play.set({ ...play, mode: 'off' });
    store.$sunTime.set({ month: c[0], day: 15, minutes });
    setActive(c);
    setApplied(t('applied', { date: t.date(new Date(CAL_YEAR, c[0] - 1, 15), 'month-day'), time: clockTime(t, minutes) }));
  };

  const grid = useMemo(
    () =>
      shown && focus ? (
        <Grid t={t} howId={howId} cal={shown} cols={cols} now={now} active={focus} dir={lang.dir} onApply={apply} onActive={activeTo} onHover={hoverTo} />
      ) : null,
    // apply only reads `shown` and the stores
    [shown, cols, now?.[0], now?.[1], focus?.[0], focus?.[1], lang.dir],
  );

  const groups = useMemo(() => (shown && shown.kind === 'spot' ? summarise(shown) : []), [shown]);
  const readCell = hover ?? active ?? now;
  const readout = shown && readCell ? cellWords(t, shown, readCell[0], readCell[1]) : '';

  if (!site || !spotAt) return null;
  return (
    <section class="sc" lang={lang.lang} dir={lang.dir} aria-live="off" aria-busy={busy != null}>
      <h4 class="pl-h4">{t('title')}</h4>
      <div class="pl-row sc-modes">
        <span class="pl-small sc-modes-label" id={modeId}>
          {t('mode.label')}
        </span>
        <span class="pl-seg pl-seg-small" role="group" aria-labelledby={modeId}>
          {(['spot', 'lot'] as const).map((k) => (
            <button type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>
              <span class="pl-small">{t(k === 'spot' ? 'mode.spot' : 'mode.lot')}</span>
            </button>
          ))}
        </span>
      </div>
      <p class="pl-small">{t(kind === 'spot' ? 'intro.spot' : 'intro.lot')}</p>

      {/* while the next calendar is worked out, the last one stays (dimmed) with this on top: nothing jumps */}
      {busy != null && (
        <p class={`pl-small sc-busy${shown ? ' is-over' : ''}`} role="status">
          {kind === 'lot' ? t('working.lot', { pct: pct(t, busy) }) : t('working')}
        </p>
      )}
      {failed && (
        <p class="pl-small pl-warn">
          {t('failed')}{' '}
          <button type="button" class="pl-link" onClick={() => setRetry((n) => n + 1)}>
            {t('retry')}
          </button>
        </p>
      )}

      {shown && (
        <div class={busy != null ? 'sc-body is-stale' : 'sc-body'}>
          {groups.length > 0 && (
            <ul class="sc-summary">
              {groups.map((g) => (
                <li>
                  <strong class="sc-summary-when">{monthsLabel(t, g.months)}</strong> {groupSentences(t, g)}
                </li>
              ))}
            </ul>
          )}
          {groups.length > 0 && <p class="pl-small muted">{t('sum.note')}</p>}

          <div class="sc-scroll">{grid}</div>
          <p class="sc-readout pl-small" aria-hidden="true">
            {readout}
          </p>
          <p class="visually-hidden" role="status">
            {applied}
          </p>

          <ul class="sc-legend pl-small">
            {shown.kind === 'spot' ? (
              <>
                <li>
                  <span class="sc-key sc-sun" aria-hidden="true" /> {t('legend.sun')}
                </li>
                <li>
                  <span class="sc-key sc-tree" aria-hidden="true" /> {t('legend.tree')}
                </li>
                <li>
                  <span class="sc-key sc-building" aria-hidden="true" /> {t('legend.building')}
                </li>
              </>
            ) : (
              <li class="sc-legend-ramp">
                {t('legend.lot')} <span class="sc-ramp-end">{t('legend.lotNone')}</span>
                <span class="sc-ramp" aria-hidden="true" style={{ background: `linear-gradient(to right, ${LOT_RAMP.join(', ')})` }} />
                <span class="sc-ramp-end">{t('legend.lotAll')}</span>
              </li>
            )}
            <li>
              <span class="sc-key sc-night" aria-hidden="true" /> {t('legend.night')}
            </li>
            <li>
              <span class="sc-key sc-key-now" aria-hidden="true" /> {t('legend.now')}
            </li>
          </ul>
          {shown.kind === 'spot' && <p class="pl-small muted">{t('legend.split')}</p>}
          <p class="pl-small muted" id={howId}>
            {t('grid.how')}
          </p>

          <details class="pl-spot-table sc-table">
            <summary>{t('table.show')}</summary>
            <div class="sc-table-scroll">
              <table class="pl-table">
                <thead>
                  <tr>
                    <th scope="col">{t('table.month')}</th>
                    <th scope="col">{t('table.up')}</th>
                    {shown.kind === 'spot' ? (
                      <>
                        <th scope="col">{t('table.sun')}</th>
                        <th scope="col">{t('table.tree')}</th>
                        <th scope="col">{t('table.building')}</th>
                      </>
                    ) : (
                      <>
                        <th scope="col">{t('table.half')}</th>
                        <th scope="col">{t('table.best')}</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {MONTHS.map((m) => {
                    const lot = shown.kind === 'lot' ? lotRow(t, shown, m) : null;
                    return (
                      <tr>
                        <th scope="row">{monthName(t, m)}</th>
                        <td>{sunUpSpan(t, shown, m)}</td>
                        {lot ? (
                          <>
                            <td>{lot.half}</td>
                            <td>{lot.best}</td>
                          </>
                        ) : (
                          <>
                            <td>{stateSpans(t, shown, m, 'sun')}</td>
                            <td>{stateSpans(t, shown, m, 'tree')}</td>
                            <td>{stateSpans(t, shown, m, 'building')}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>
          <p class="pl-small muted">{t('assume', { days: CAL_SPOT.daysPerMonth, lotDays: CAL_LOT.daysPerMonth })}</p>
        </div>
      )}
    </section>
  );
}

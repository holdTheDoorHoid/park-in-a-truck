/** @jsxImportSource preact */
// SiteReport (Assess) — "Measure your lot" done from City records: each side's
// length, area, long/short edge, the park size table with this lot highlighted,
// lot type and street edges, zoning, flood zone, City trees and the neighboring
// buildings' heights, and a small aerial photo.

import { useEffect, useState } from 'preact/hooks';
import type { LotRecord } from '../../lib/types';
import type { LotExtra, Surroundings } from '../../lib/philly/types';
import { fetchSurroundings } from '../../lib/philly/surroundings';
import { distToRing, makeProjector } from '../../lib/philly/geo';
import { SIZES } from '../../lib/sizing';
import { titleCase, zoningPlain, sqft } from '../../lib/philly/plain';
import { u } from '../../lib/url';
import AerialThumb from './AerialThumb';
import { lotDrawing, fmtFt } from './drawing';
import { useProject } from './hooks';

const LOT_TYPE: Record<string, string> = { 'mid-block': 'Mid-block lot', corner: 'Corner lot', alley: 'Breezeway / alley', unknown: 'Not sure' };
const SIDE_NAME: Record<string, string> = {
  x0: 'entrance side',
  x1: 'back',
  y0: 'right side as you stand at the entrance',
  y1: 'left side as you stand at the entrance',
};

/** Numbered sketch of the lot (edge numbers match the list). */
function Sketch({ lot }: { lot: LotRecord }) {
  const d = lotDrawing(lot);
  if (!d) return null;
  const { maxX, maxY } = d.bounds;
  let pad = Math.max(maxX, maxY) * 0.18 + 4;
  const fs = Math.max(maxX, maxY) / 16 + 1.5;
  // Number badges just outside each side; nudge outward until they don't overlap (short jogs).
  const badges: { e: (typeof d.edges)[number]; at: [number, number] }[] = [];
  for (const e of d.edges) {
    let k = 1.1;
    let at: [number, number] = [e.mid[0] + e.out[0] * fs * k, e.mid[1] + e.out[1] * fs * k];
    for (let i = 0; i < 8 && badges.some((b) => Math.hypot(b.at[0] - at[0], b.at[1] - at[1]) < fs * 1.6); i++) {
      k += 1.4;
      at = [e.mid[0] + e.out[0] * fs * k, e.mid[1] + e.out[1] * fs * k];
    }
    badges.push({ e, at });
  }
  const reach = Math.max(0, ...badges.map((b) => Math.max(-b.at[0], -b.at[1], b.at[0] - maxX, b.at[1] - maxY))) + fs;
  pad = Math.max(pad, reach);
  const vb = `${-pad} ${-pad} ${maxX + 2 * pad} ${maxY + 2 * pad}`;
  return (
    <svg class="ph-outline" viewBox={vb} role="img" aria-label="Sketch of the lot with its sides numbered to match the list of measurements" style="max-height:260px">
      <polygon points={d.polygon.map((p) => p.join(',')).join(' ')} fill="#e3f5fc" stroke="#111" stroke-width={fs / 6} stroke-linejoin="round" />
      {d.edges
        .filter((e) => e.street)
        .map((e) => (
          <line x1={e.a[0]} y1={e.a[1]} x2={e.b[0]} y2={e.b[1]} stroke="#00709c" stroke-width={fs / 2.2} stroke-linecap="round" />
        ))}
      {badges.map(({ e, at }) => (
        <g transform={`translate(${at[0]},${at[1]})`}>
          <circle r={fs * 0.75} fill="#111" />
          <text text-anchor="middle" dy={fs * 0.35} font-size={fs} font-weight="700" fill="#fff">
            {e.n}
          </text>
        </g>
      ))}
      <circle cx={d.start[0]} cy={d.start[1]} r={fs * 0.45} fill="#00A8E8" stroke="#111" stroke-width={fs / 10} />
      <g transform={`translate(${maxX + pad * 0.55},${-pad * 0.45}) rotate(${d.northDeg})`} aria-hidden="true">
        <path d={`M0,${-fs * 1.2} L${fs * 0.5},${fs * 0.5} L0,${fs * 0.15} L${-fs * 0.5},${fs * 0.5}Z`} fill="#111" />
      </g>
    </svg>
  );
}

export default function SiteReport() {
  const project = useProject();
  const lot = project.lot;
  const [around, setAround] = useState<Surroundings | null>(null);
  const [aroundErr, setAroundErr] = useState<string | null>(null);

  useEffect(() => {
    setAround(null);
    setAroundErr(null);
    if (!lot) return;
    const ctrl = new AbortController();
    fetchSurroundings(lot, 150, { signal: ctrl.signal })
      .then(setAround)
      .catch((e) => e?.code !== 'aborted' && setAroundErr(e?.message ?? "Couldn't load nearby buildings and trees."));
    return () => ctrl.abort();
  }, [lot?.address]);

  if (!lot)
    return (
      <div class="ph ph-fallback">
        Choose your lot first — look it up in <a href={u('steps/acquire/#who-owns-that-lot')}>Step 1: Acquire</a> or on the{' '}
        <a href={u('lot/')}>Find a lot</a> page. This report then fills itself in from City records.
      </div>
    );

  const x = (lot.extra ?? {}) as LotExtra;
  const g = x.geometry;

  // neighbours and trees from the surroundings
  let nextDoor: number[] = [];
  let tallest: number | null = null;
  let estimated = false;
  let treesOn = 0;
  let treesNear: string[] = [];
  if (around && lot.polygon.length >= 3) {
    const pr = makeProjector([lot.lng, lot.lat]);
    const ring = lot.polygon.map(pr.toXY);
    for (const b of around.buildings) {
      const d = Math.min(...b.polygon.map((p) => distToRing(pr.toXY(p), ring)));
      if (d < 4) {
        nextDoor.push(Math.round(b.heightFt));
        estimated ||= Boolean(b.heightEstimated);
      }
      tallest = Math.max(tallest ?? 0, b.heightFt);
    }
    nextDoor.sort((a, b) => a - b);
    for (const t of around.trees) {
      const d = distToRing(pr.toXY(t.lngLat), ring);
      if (d === 0) treesOn++;
      else if (d <= 30) treesNear.push(t.species ? titleCase(t.species.split(' - ')[1] ?? t.species) : 'tree');
    }
  }
  const storeys = (h: number) => Math.max(1, Math.round(h / 11));

  return (
    <div class="ph ph-site-report">
      <p class="ph-small">
        From City of Philadelphia records for <strong>{titleCase(lot.address)}</strong> (looked up{' '}
        {new Date(lot.fetchedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}). Measurements
        come from the City's parcel outline — check them with a tape measure on site; field measurements win.
      </p>
      <div class="ph-report">
        <div>
          <h3>Measured edges</h3>
          {g ? (
            <>
              <ol class="ph-edges">
                {g.edges.map((e, i) => (
                  <li>
                    <strong>{fmtFt(e.lengthFt)}</strong>
                    {e.side ? ` — ${SIDE_NAME[e.side]}` : ''}
                    {e.street ? `, along ${titleCase(e.street)}` : ''}
                    {i === 0 ? ' (from the starting point, blue dot)' : ''}
                  </li>
                ))}
              </ol>
              <dl class="ph-facts" style="margin-top:12px">
                <dt>Long edge</dt>
                <dd>{fmtFt(g.lengthFt)}</dd>
                <dt>Short edge</dt>
                <dd>{fmtFt(g.widthFt)}</dd>
                <dt>Area</dt>
                <dd>
                  {sqft(g.areaSqFt)}
                  {lot.areaSqFt && Math.abs(lot.areaSqFt - g.areaSqFt) > 50 ? <small> (City assessment says {sqft(lot.areaSqFt)})</small> : null}
                </dd>
                {g.irregular && (
                  <>
                    <dt>Shape</dt>
                    <dd>Irregular — long and short edge are the rectangle around it.</dd>
                  </>
                )}
              </dl>
            </>
          ) : (
            <p>
              The City has no outline for this lot. Its property record says {lot.frontageFt ?? '?'} × {lot.depthFt ?? '?'} ft — measure it
              on site.
            </p>
          )}

          <h3>Park size</h3>
          <table class="ph-sizes">
            <caption class="visually-hidden">Park in a Truck sizes A to E</caption>
            <thead>
              <tr>
                <th scope="col">Size</th>
                <th scope="col">Long edge</th>
                <th scope="col">Short edge</th>
              </tr>
            </thead>
            <tbody>
              {SIZES.map((s) => (
                <tr data-this={g && g.size.id === s.id && !g.size.tooSmall && !g.size.tooBig ? '' : undefined}>
                  <th scope="row">{s.id}</th>
                  <td>
                    {s.long[0]}–{s.long[1]} ft
                  </td>
                  <td>
                    {s.short[0]}–{s.short[1]} ft
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {g && (
            <p class="ph-small">
              {g.size.tooSmall
                ? `Your lot (${fmtFt(g.lengthFt)} × ${fmtFt(g.widthFt)}) is smaller than size A — the Park Patch workbook is made for spaces like this.`
                : g.size.tooBig
                  ? `Your lot (${fmtFt(g.lengthFt)} × ${fmtFt(g.widthFt)}) is bigger than size E — start from E and expand.`
                  : `Your lot (${fmtFt(g.lengthFt)} × ${fmtFt(g.widthFt)}) is size ${g.size.id}${g.size.exact ? '' : ' (closest fit)'}.`}
            </p>
          )}

          <h3>Lot location</h3>
          <dl class="ph-facts">
            <dt>Lot type</dt>
            <dd>
              {LOT_TYPE[lot.lotType ?? 'unknown']}
              {g && (
                <>
                  <br />
                  <small>{g.lotTypeReason}</small>
                </>
              )}
            </dd>
            <dt>Street sides</dt>
            <dd>{g && g.streets.length ? g.streets.map((s) => `${titleCase(s.name)} — ${SIDE_NAME[s.side]}`).join('; ') : '—'}</dd>
            <dt>Zoning</dt>
            <dd>{zoningPlain(lot.zoning) ?? '—'}</dd>
            <dt>Flooding</dt>
            <dd>{x.floodZoneLabel ?? '—'}</dd>
            {x.historicDistrict && (
              <>
                <dt>Historic district</dt>
                <dd>{x.historicDistrict}</dd>
              </>
            )}
          </dl>
        </div>

        <div>
          <Sketch lot={lot} />
          <div style="margin-top:12px">
            <AerialThumb polygon={lot.polygon} label={`Aerial photo of ${titleCase(lot.address)} with the lot outlined`} />
          </div>
          <h3>Around the lot</h3>
          {aroundErr && <p class="ph-small">{aroundErr}</p>}
          {!around && !aroundErr && (
            <p class="ph-status">
              <span class="ph-spinner" aria-hidden="true" />
              Loading buildings and trees…
            </p>
          )}
          {around && (
            <dl class="ph-facts">
              <dt>Buildings next door</dt>
              <dd>
                {nextDoor.length
                  ? `${nextDoor.length} touching your lot — ${nextDoor[0] !== nextDoor[nextDoor.length - 1] ? `${nextDoor[0]}–${nextDoor[nextDoor.length - 1]}` : nextDoor[0]} ft tall (about ${storeys(nextDoor[nextDoor.length - 1]!)} ${storeys(nextDoor[nextDoor.length - 1]!) === 1 ? 'storey' : 'storeys'})`
                  : 'None touching the lot'}
                {estimated ? <small> (some heights estimated)</small> : null}
              </dd>
              <dt>Tallest nearby</dt>
              <dd>{tallest ? `${Math.round(tallest)} ft (within 150 ft)` : '—'}</dd>
              <dt>City trees</dt>
              <dd>
                {treesOn} on the lot · {treesNear.length} within 30 ft
                {treesNear.length ? <small> ({[...new Set(treesNear)].slice(0, 4).join(', ')})</small> : null}
              </dd>
            </dl>
          )}
          <p class="ph-small">Building heights: City LiDAR (LI building footprints). Trees: Parks &amp; Recreation tree inventory 2025.</p>
        </div>
      </div>
    </div>
  );
}


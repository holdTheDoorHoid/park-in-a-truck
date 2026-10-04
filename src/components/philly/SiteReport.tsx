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
import { sizeOf } from '../../lib/philly/choose';
import { floodText, titleCase, zoningPlain, sqft } from '../../lib/philly/plain';
import { lotTypeReasonText } from '../../lib/philly/saved';
import { isolate, words, type PhillyKey } from '../../lib/philly/words';
import { urlFor } from '../../i18n/url.ts';
import AerialThumb from './AerialThumb';
import { lotDrawing, fmtFt, textAngle } from './drawing';
import { useProject } from './hooks';
import { LOT_TYPE_KEY } from './LotCard';

const SIDE_NAME: Record<string, PhillyKey> = {
  x0: 'side.x0',
  x1: 'side.x1',
  y0: 'side.y0',
  y1: 'side.y1',
};

/** Numbered sketch of the lot (edge numbers match the list). */
function Sketch({ lot }: { lot: LotRecord }) {
  const t = words();
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
    <svg
      class="ph-outline"
      viewBox={vb}
      role="img"
      aria-label={d.g.streets[0] ? t('report.sketchStreet', { street: titleCase(d.g.streets[0].name) }) : t('report.sketch')}
      style="max-height:260px;direction:ltr"
    >
      <polygon points={d.polygon.map((p) => p.join(',')).join(' ')} fill="#e3f5fc" stroke="#111" stroke-width={fs / 6} stroke-linejoin="round" />
      {d.edges
        .filter((e) => e.street)
        .map((e) => (
          <line x1={e.a[0]} y1={e.a[1]} x2={e.b[0]} y2={e.b[1]} stroke="#00709c" stroke-width={fs / 2.2} stroke-linecap="round" />
        ))}
      {/* the street's name along each street side, inside the lot, so the sketch can be matched to the photo */}
      {d.edges
        .filter((e) => e.street && e.lengthFt >= 8)
        .map((e) => {
          const at: [number, number] = [e.mid[0] - e.out[0] * fs * 1.1, e.mid[1] - e.out[1] * fs * 1.1];
          return (
            <text
              x={at[0]}
              y={at[1]}
              transform={`rotate(${textAngle(e.a, e.b)},${at[0]},${at[1]})`}
              text-anchor="middle"
              dominant-baseline="middle"
              font-size={fs * 0.8}
              font-weight="700"
              fill="#00709c"
            >
              {titleCase(e.street!)}
            </text>
          );
        })}
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
        <text y={-fs * 1.45} text-anchor="middle" font-size={fs * 0.85} font-weight="700" fill="#111" transform={`rotate(${-d.northDeg},0,${-fs * 1.75})`}>
          {t('map.north')}
        </text>
      </g>
    </svg>
  );
}

export default function SiteReport() {
  const t = words();
  const u = urlFor(t.locale);
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
      .catch((e) => e?.code !== 'aborted' && setAroundErr(e?.message ?? t('report.aroundFailed')));
    return () => ctrl.abort();
  }, [lot?.address]);

  if (!lot)
    return (
      <div
        class="ph ph-fallback"
        dangerouslySetInnerHTML={{ __html: t.html('report.noLot', { acquire: u('steps/acquire/#who-owns-that-lot'), lot: u('lot/') }) }}
      />
    );

  const x = (lot.extra ?? {}) as LotExtra;
  const g = x.geometry;
  const size = g ? sizeOf(g) : null;
  // lots saved before 2026-10-04 kept the assessment's area in lot.areaSqFt
  const assessed = x.assessedAreaSqFt !== undefined ? x.assessedAreaSqFt : lot.areaSqFt;

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
    for (const tree of around.trees) {
      const d = distToRing(pr.toXY(tree.lngLat), ring);
      if (d === 0) treesOn++;
      else if (d <= 30) treesNear.push(tree.species ? titleCase(tree.species.split(' - ')[1] ?? tree.species) : t('report.tree'));
    }
  }
  const storeys = (h: number) => Math.max(1, Math.round(h / 11));
  const drawing = lotDrawing(lot);

  return (
    <div class="ph ph-site-report">
      <p
        class="ph-small"
        dangerouslySetInnerHTML={{ __html: t.html('report.from', { address: isolate(titleCase(lot.address), t), date: t.date(new Date(lot.fetchedAt), 'long') }) }}
      />
      <div class="ph-report">
        <div>
          <h3>{t('report.edges')}</h3>
          {g ? (
            <>
              <ol class="ph-edges">
                {g.edges.map((e, i) => {
                  const side = e.side ? t(SIDE_NAME[e.side]!) : null;
                  const street = e.street ? isolate(titleCase(e.street), t) : null;
                  return (
                    <li>
                      <strong>{fmtFt(e.lengthFt)}</strong>
                      {side && street
                        ? ` ${t('report.edgeSideStreet', { side, street })}`
                        : side
                          ? ` ${t('report.edgeSide', { side })}`
                          : street
                            ? t('report.edgeStreet', { street })
                            : ''}
                      {i === 0 ? ` ${t('report.edgeStart')}` : ''}
                    </li>
                  );
                })}
              </ol>
              <dl class="ph-facts" style="margin-top:12px">
                <dt>{t('report.longShort')}</dt>
                <dd>
                  {t('report.longShortValue', { long: fmtFt(g.lengthFt), short: fmtFt(g.widthFt) })}
                  <br />
                  <small>{t('report.rectNote')}</small>
                </dd>
                <dt>{t('report.area')}</dt>
                <dd>
                  {sqft(g.areaSqFt)} <small>{t('report.fromOutline')}</small>
                  {assessed && Math.abs(assessed - g.areaSqFt) > 50 ? <small> · {t('report.assessed', { area: sqft(assessed) })}</small> : null}
                </dd>
                {g.irregular && (
                  <>
                    <dt>{t('report.shape')}</dt>
                    <dd>{t('report.irregular')}</dd>
                  </>
                )}
              </dl>
            </>
          ) : (
            <p>{t('report.noOutline', { frontage: String(lot.frontageFt ?? '?'), depth: String(lot.depthFt ?? '?') })}</p>
          )}

          <h3>{t('card.parkSize')}</h3>
          <table class="ph-sizes">
            <caption class="visually-hidden">{t('sizes.caption')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('sizes.size')}</th>
                <th scope="col">{t('sizes.long')}</th>
                <th scope="col">{t('sizes.short')}</th>
              </tr>
            </thead>
            <tbody>
              {SIZES.map((s) => (
                <tr data-this={size && size.id === s.id && !size.tooSmall && !size.tooBig ? '' : undefined}>
                  <th scope="row">{s.id}</th>
                  <td>{t('sizes.range', { min: s.long[0], max: s.long[1] })}</td>
                  <td>{t('sizes.range', { min: s.short[0], max: s.short[1] })}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {g && size && (
            <p
              class="ph-small"
              dangerouslySetInnerHTML={{
                __html: size.tooSmall
                  ? t.html('report.tooSmall', { long: fmtFt(g.lengthFt), short: fmtFt(g.widthFt), href: u('park-patch/') })
                  : t.html(size.tooBig ? 'report.tooBig' : size.exact ? 'report.fits' : 'report.fitsClosest', {
                      long: fmtFt(g.lengthFt),
                      short: fmtFt(g.widthFt),
                      size: size.id,
                    }),
              }}
            />
          )}

          <h3>{t('report.location')}</h3>
          <dl class="ph-facts">
            <dt>{t('card.lotType')}</dt>
            <dd>
              {t(LOT_TYPE_KEY[lot.lotType ?? 'unknown'] ?? 'lotType.unknown')}
              {g && (
                <>
                  <br />
                  <small>{lotTypeReasonText(g)}</small>
                </>
              )}
            </dd>
            <dt>{t('report.streetSides')}</dt>
            <dd>
              {g && g.streets.length
                ? g.streets.map((s) => t('report.streetSide', { street: isolate(titleCase(s.name), t), side: t(SIDE_NAME[s.side]!) })).join('; ')
                : '—'}
            </dd>
            <dt>{t('card.zoning')}</dt>
            <dd>{zoningPlain(lot.zoning) ?? '—'}</dd>
            <dt>{t('report.flooding')}</dt>
            <dd>{x.floodZoneLabel ? floodText(x.floodZoneLabel) : '—'}</dd>
            {x.historicDistrict && (
              <>
                <dt>{t('report.historic')}</dt>
                <dd>{isolate(x.historicDistrict, t)}</dd>
              </>
            )}
          </dl>
        </div>

        <div>
          <Sketch lot={lot} />
          <div style="margin-top:12px">
            <AerialThumb
              polygon={lot.polygon}
              rotateDeg={drawing?.northDeg}
              label={t('report.aerial', { address: titleCase(lot.address) })}
            />
          </div>
          {drawing && <p class="ph-small">{t('report.photoNote')}</p>}
          <h3>{t('report.around')}</h3>
          {aroundErr && <p class="ph-small">{aroundErr}</p>}
          {!around && !aroundErr && (
            <p class="ph-status">
              <span class="ph-spinner" aria-hidden="true" />
              {t('report.loadingAround')}
            </p>
          )}
          {around && (
            <dl class="ph-facts">
              <dt>{t('report.nextDoor')}</dt>
              <dd>
                {nextDoor.length
                  ? t('report.nextDoorValue', {
                      count: nextDoor.length,
                      // a range of heights reads left to right inside any sentence
                      height:
                        nextDoor[0] !== nextDoor[nextDoor.length - 1]
                          ? isolate(`${t.num(nextDoor[0]!)}–${t.num(nextDoor[nextDoor.length - 1]!)}`, t)
                          : t.num(nextDoor[0]!),
                      storeys: t('report.storeys', { count: storeys(nextDoor[nextDoor.length - 1]!) }),
                    })
                  : t('report.noneTouching')}
                {estimated ? <small> {t('report.estimated')}</small> : null}
              </dd>
              <dt>{t('report.tallest')}</dt>
              <dd>{tallest ? t('report.tallestValue', { height: String(Math.round(tallest)) }) : '—'}</dd>
              <dt>{t('report.trees')}</dt>
              <dd>
                {t('report.treesValue', { on: treesOn, near: treesNear.length })}
                {treesNear.length ? <small> ({[...new Set(treesNear)].slice(0, 4).map((n) => isolate(n, t)).join(', ')})</small> : null}
              </dd>
            </dl>
          )}
          <p class="ph-small">{t('report.sources')}</p>
        </div>
      </div>
    </div>
  );
}


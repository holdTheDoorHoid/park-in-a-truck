/** @jsxImportSource preact */
// BaseMap (Assess: "Diagram your lot") — the lot on grid paper the way the
// workbook draws it: 1-ft squares with heavier lines every 4 ft, the long side
// across the page, each side labelled in feet, the project starting point at a
// street corner, north arrow, scale bar, neighbours' outlines faintly, and any
// existing conditions marked in the planner. "Print base map" prints it on
// Letter landscape at a true architectural scale.

import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { render, type JSX } from 'preact';
import type { LngLat, LotRecord, PlacedItem } from '../../lib/types';
import { fetchNeighbourRings } from '../../lib/philly/lookup';
import { titleCase } from '../../lib/philly/plain';
import { isolate, words } from '../../lib/philly/words';
import { ELEMENTS } from '../../data/elements';
import { localizeRecord } from '../../i18n/data.ts';
import { escapeHtml } from '../../i18n/format.ts';
import { urlFor } from '../../i18n/url.ts';
import type { Locale } from '../../i18n/locales.ts';
import { lotDrawing, textAngle, type P } from './drawing';
import { useProject } from './hooks';

/** Architectural scales, inches per foot. */
const SCALES: [number, string][] = [
  [1 / 2, '1/2″ = 1′-0″'],
  [3 / 8, '3/8″ = 1′-0″'],
  [1 / 4, '1/4″ = 1′-0″'],
  [3 / 16, '3/16″ = 1′-0″'],
  [1 / 8, '1/8″ = 1′-0″'],
  [3 / 32, '3/32″ = 1′-0″'],
  [1 / 16, '1/16″ = 1′-0″'],
  [1 / 32, '1/32″ = 1′-0″'],
];
/** Letter landscape, 0.4in margins, minus a 0.9in title block */
const PAGE_W = 10.2;
const PAGE_H = 6.8;

export function pickScale(wFt: number, hFt: number, locale?: Locale | string): { inPerFt: number; label: string } {
  for (const [s, label] of SCALES) if (wFt * s <= PAGE_W && hFt * s <= PAGE_H) return { inPerFt: s, label };
  const s = Math.min(PAGE_W / wFt, PAGE_H / hFt);
  return { inPerFt: s, label: words(locale)('basemap.fitScale', { feet: Math.round(1 / s) }) };
}

/** Planner's existing-conditions items → lng/lat (park-local feet from the park origin). */
function placeExisting(lot: LotRecord, item: PlacedItem, placement?: { originLngLat: LngLat; bearingDeg: number; flip?: boolean }): LngLat | null {
  const g = (lot.extra as { geometry?: { rectCorners: LngLat[]; rect: { bearingDeg: number } } } | undefined)?.geometry;
  const origin = placement?.originLngLat ?? g?.rectCorners[0];
  const bearing = placement?.bearingDeg ?? g?.rect.bearingDeg;
  if (!origin || bearing == null) return null;
  const b = (bearing * Math.PI) / 180;
  const ux: P = [Math.sin(b), Math.cos(b)];
  const left: P = [-ux[1], ux[0]];
  const y = placement?.flip ? -item.y : item.y;
  const east = item.x * ux[0] + y * left[0];
  const north = item.x * ux[1] + y * left[1];
  const phi = (origin[1] * Math.PI) / 180;
  return [origin[0] + east / (364000 * Math.cos(phi)), origin[1] + north / 364000];
}

export default function BaseMap() {
  const t = words();
  const u = urlFor(t.locale);
  const elements = localizeRecord(ELEMENTS, 'elements', t.locale);
  const project = useProject();
  const lot = project.lot;
  const d = useMemo(() => lotDrawing(lot), [lot?.address, lot?.fetchedAt]);
  const [neighbours, setNeighbours] = useState<LngLat[][]>([]);
  const [showNeighbours, setShowNeighbours] = useState(true);
  const [showExisting, setShowExisting] = useState(true);
  const boxRef = useRef<HTMLDivElement>(null);
  const [boxW, setBoxW] = useState(0);

  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((es) => setBoxW(es[0]?.contentRect.width ?? 0));
    ro.observe(el);
    return () => ro.disconnect();
  }, [lot?.address, Boolean(d)]);

  useEffect(() => {
    setNeighbours([]);
    if (!lot || lot.polygon.length < 3) return;
    const ctrl = new AbortController();
    fetchNeighbourRings(lot.polygon, { signal: ctrl.signal })
      .then((n) => setNeighbours(n.filter((x) => !(x.opa && x.opa === lot.opa)).map((x) => x.ring)))
      .catch(() => undefined);
    return () => ctrl.abort();
  }, [lot?.address]);

  if (!lot)
    return (
      <div class="ph ph-fallback" dangerouslySetInnerHTML={{ __html: t.html('basemap.noLot', { href: u('lot/') }) }} />
    );
  if (!d)
    return (
      <div class="ph ph-fallback">{t('basemap.noOutline', { address: isolate(titleCase(lot.address), t) })}</div>
    );

  const { maxX, maxY } = d.bounds;
  const margin = Math.max(10, 0.16 * Math.max(maxX, maxY));
  const W = maxX + 2 * margin;
  const H = maxY + 2 * margin;
  const scale = pickScale(W, H, t.locale);
  const printFont = 0.11 / scale.inPerFt; // ≈ 8pt on paper, in feet
  // On screen, keep labels about 12px tall whatever the width (phones!).
  // (capped so street names and the start label still fit in the margin)
  const screenFont = boxW > 0 ? Math.min(Math.max(printFont, (12 * W) / boxW), margin / 4) : printFont;
  const ox = margin;
  const oy = margin;
  const tp = (p: P): P => [p[0] + ox, p[1] + oy];
  const start = tp(d.start);

  const gridLines = (font: number) => {
    // grid aligned to the starting point
    const lines: JSX.Element[] = [];
    const minorOk = scale.inPerFt >= 1 / 20; // 1-ft squares at least ~1.3 mm on paper
    const gx0 = start[0] - Math.floor(start[0]);
    const gy0 = start[1] - Math.floor(start[1]);
    for (let x = gx0; x <= W; x += 1) {
      const heavy = Math.round(x - start[0]) % 4 === 0;
      if (!heavy && !minorOk) continue;
      lines.push(<line x1={x} y1={0} x2={x} y2={H} stroke={heavy ? '#7fcbea' : '#cfeaf6'} stroke-width={heavy ? font * 0.09 : font * 0.045} />);
    }
    for (let y = gy0; y <= H; y += 1) {
      const heavy = Math.round(y - start[1]) % 4 === 0;
      if (!heavy && !minorOk) continue;
      lines.push(<line x1={0} y1={y} x2={W} y2={y} stroke={heavy ? '#7fcbea' : '#cfeaf6'} stroke-width={heavy ? font * 0.09 : font * 0.045} />);
    }
    return lines;
  };

  const poly = d.polygon.map(tp);
  const existing = (project.design?.existing ?? [])
    .map((it) => ({ it, ll: placeExisting(lot, it, project.design?.placement) }))
    .filter((x): x is { it: PlacedItem; ll: LngLat } => Boolean(x.ll));

  // scale bar: 0 4 8 16 ft (or longer for big lots)
  const unit = Math.max(4, 4 * Math.round(Math.max(maxX, maxY) / 40));
  // top-left corner: the starting point and street names live along the bottom
  const bar: P = [margin * 0.25, margin * 0.4];

  const title = t('basemap.title', { address: isolate(titleCase(lot.address), t) });
  const printDate = t.date(new Date(), 'long');
  const note = t((lot.extra as { parcelSource?: string })?.parcelSource === 'dor' ? 'basemap.noteDor' : 'basemap.notePwd');
  const oneDecimal = (n: number) => t.num(n, { minimumFractionDigits: 1, maximumFractionDigits: 1, useGrouping: false });
  // "1/8″ = 1′-0″" reads left to right inside any sentence
  const scaleText = isolate(scale.label, t);

  const drawSvg = (font: number) => (
    <svg
      viewBox={`0 0 ${W.toFixed(2)} ${H.toFixed(2)}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`${title}. ${d.edges
        .map((e) =>
          e.street
            ? t('basemap.sideStreet', { n: e.n, length: oneDecimal(e.lengthFt), street: titleCase(e.street) })
            : t('basemap.side', { n: e.n, length: oneDecimal(e.lengthFt) }),
        )
        .join('. ')}.`}
      font-family="Work Sans, Arial, sans-serif"
      // a drawing: its labels sit where they sit on paper, on right-to-left pages too
      style="direction:ltr"
    >
      <defs>
        <clipPath id="ph-bm-clip">
          <rect x="0" y="0" width={W} height={H} />
        </clipPath>
      </defs>
      <rect x="0" y="0" width={W} height={H} fill="#fff" />
      <g>{gridLines(font)}</g>
      {showNeighbours && (
        <g clip-path="url(#ph-bm-clip)" fill="none" stroke="#9a9a9a" stroke-width={font * 0.08} stroke-dasharray={`${font * 0.5} ${font * 0.3}`}>
          {neighbours.map((r) => (
            <polygon points={r.map((p) => tp(d.toDraw(p)).join(',')).join(' ')} />
          ))}
        </g>
      )}
      <polygon points={poly.map((p) => p.join(',')).join(' ')} fill="rgb(0 168 232 / 0.08)" stroke="#111" stroke-width={font * 0.22} stroke-linejoin="round" />

      {d.edges.map((e) => {
        const a = tp(e.a);
        const b = tp(e.b);
        const m = tp(e.mid);
        const ang = textAngle(a, b);
        const off = font * 1.15;
        const sOff = font * 2.6;
        return (
          <g>
            <text
              transform={`translate(${m[0] + e.out[0] * off},${m[1] + e.out[1] * off}) rotate(${ang})`}
              text-anchor="middle"
              dominant-baseline="middle"
              font-size={font}
              font-weight="700"
              fill="#111"
            >
              {t('unit.ft', { n: oneDecimal(e.lengthFt) })}
            </text>
            {e.street && (
              <text
                transform={`translate(${m[0] + e.out[0] * sOff},${m[1] + e.out[1] * sOff}) rotate(${ang})`}
                text-anchor="middle"
                dominant-baseline="middle"
                font-size={font * 0.95}
                font-style="italic"
                letter-spacing={font * 0.08}
                fill="#00709c"
              >
                {e.street.toUpperCase()}
              </text>
            )}
          </g>
        );
      })}

      {showExisting &&
        existing.map(({ it, ll }) => {
          const p = tp(d.toDraw(ll));
          return (
            <g>
              <circle cx={p[0]} cy={p[1]} r={font * 0.45} fill="#F05A28" stroke="#111" stroke-width={font * 0.06} />
              <text x={p[0] + font * 0.7} y={p[1]} dominant-baseline="middle" font-size={font * 0.8} fill="#111">
                {elements[it.element]?.name ?? it.element}
              </text>
            </g>
          );
        })}

      <g>
        <circle cx={start[0]} cy={start[1]} r={font * 0.45} fill="#00A8E8" stroke="#111" stroke-width={font * 0.08} />
        {/* below the corner, running into the drawing so it never falls off the page */}
        <text
          x={start[0]}
          y={start[1] + (start[1] > H / 2 ? font * 3.7 : -font * 2.9)}
          text-anchor={start[0] > W / 2 ? 'end' : 'start'}
          font-size={font * 0.8}
          font-weight="800"
          fill="#111"
        >
          {t('basemap.start')}
        </text>
      </g>

      <g transform={`translate(${W - margin * 0.45},${margin * 0.55})`}>
        <g transform={`rotate(${d.northDeg})`}>
          <path d={`M0,${-font * 1.6} L${font * 0.6},${font * 0.6} L0,${font * 0.2} L${-font * 0.6},${font * 0.6}Z`} fill="#111" />
        </g>
        <text y={font * 2.1} text-anchor="middle" font-size={font * 0.9} font-weight="800">
          {t('map.north')}
        </text>
      </g>

      <g transform={`translate(${bar[0]},${bar[1]})`} font-size={font * 0.75}>
        {[0, 1, 2, 4].map((k, i, arr) =>
          i < arr.length - 1 ? (
            <rect x={k * unit} y={-font * 0.35} width={(arr[i + 1]! - k) * unit} height={font * 0.35} fill={i % 2 ? '#fff' : '#111'} stroke="#111" stroke-width={font * 0.05} />
          ) : null,
        )}
        {[0, 1, 2, 4].map((k) => (
          <text x={k * unit} y={font * 0.9} text-anchor="middle">
            {k * unit}
          </text>
        ))}
        <text x={4 * unit + font * 0.6} y={-font * 0.05}>
          {t('basemap.feet')}
        </text>
      </g>
    </svg>
  );

  const print = () => {
    const holder = document.createElement('div');
    render(drawSvg(printFont), holder);
    const svg = holder.querySelector('svg');
    if (!svg) return;
    svg.setAttribute('width', `${(W * scale.inPerFt).toFixed(3)}in`);
    svg.setAttribute('height', `${(H * scale.inPerFt).toFixed(3)}in`);
    const html = `<!doctype html><html lang="${t.lang}" dir="${t.dir}"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
      @page { size: letter landscape; margin: 0.4in; }
      html, body { margin: 0; font-family: 'Work Sans', Arial, sans-serif; color: #111; }
      .tb { display: flex; justify-content: space-between; gap: 0.3in; border-top: 3px solid #111; margin-top: 0.08in; padding-top: 0.06in; font-size: 9pt; width: 10.2in; }
      .tb h1 { font-size: 13pt; margin: 0; text-transform: uppercase; }
      .tb p { margin: 0.03in 0 0; }
      svg { display: block; }
    </style></head><body>${svg.outerHTML}
      <div class="tb"><div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(note)}</p></div>
      <div style="text-align:end;white-space:nowrap"><strong>${escapeHtml(t('basemap.scale', { scale: scaleText }))}</strong><p>${escapeHtml(t('basemap.printActual'))}</p><p>${escapeHtml(t('basemap.printFooter', { date: printDate }))}</p></div></div>
    </body></html>`;
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.append(frame);
    const doc = frame.contentDocument!;
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => frame.remove(), 60_000);
    }, 300);
  };

  return (
    <div class="ph ph-basemap">
      <div class="ph-basemap-controls">
        <button class="btn btn-primary" type="button" onClick={print}>
          {t('basemap.print')}
        </button>
        <label>
          <input type="checkbox" checked={showNeighbours} onChange={(e) => setShowNeighbours((e.target as HTMLInputElement).checked)} />{' '}
          {t('basemap.neighbours')}
        </label>
        {existing.length > 0 && (
          <label>
            <input type="checkbox" checked={showExisting} onChange={(e) => setShowExisting((e.target as HTMLInputElement).checked)} />{' '}
            {t('basemap.existing', { count: existing.length })}
          </label>
        )}
        <span class="ph-small">{t('basemap.prints', { scale: scaleText })}</span>
      </div>
      <div ref={boxRef}>{drawSvg(screenFont)}</div>
      <p class="ph-small">
        {note} {t('basemap.rounded', { scale: scaleText })}
      </p>
    </div>
  );
}

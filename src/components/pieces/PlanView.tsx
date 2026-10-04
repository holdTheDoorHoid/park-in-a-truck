/** @jsxImportSource preact */
// Plan view of an assembled park in the style of PiaT's printed park pieces:
// theme-coloured gravel and planting, the 4-ft grid, plant symbols and
// furniture glyphs. Pure SVG, no state — usable for print, in the dev gallery
// and by the planner's plan mode. Owner: pieces workstream.
//
// Coordinates: park-local feet (x along the length, y along the width, y up).
// Item rotationDeg is counter-clockwise in park coordinates.

import type { JSX } from 'preact';
import type { LayoutItem, LayoutSurface, Material, ParkLayout, SunClass, ThemeId } from '../../lib/types';
import { ELEMENTS } from '../../data/elements';
import { PLAN_COMMON, THEMES } from '../../data/themes';

export interface PlanViewProps {
  layout: ParkLayout;
  /** shade the 4-ft squares by sun class (part sun light, shade darker) */
  sunAt?: (x: number, y: number) => SunClass;
  selectedId?: string;
  onSelect?: (id: string) => void;
  /** the pieces' 4-ft grid (default true) */
  showGrid?: boolean;
  /** pixels per foot; when omitted the SVG fills its container's width */
  scale?: number;
  /** FRAME / FRONT / BACK and STREET labels (default false) */
  labels?: boolean;
  /** outline each piece (default true) */
  showPieces?: boolean;
  /** accessible name; defaults to a description of the layout */
  title?: string;
  class?: string;
}

const M = 2.5; // margin around the park for street labels, feet
const FALLBACK: ThemeId = 'sanctuary';

function pal(theme?: ThemeId) {
  return THEMES[theme ?? FALLBACK].plan;
}

function surfaceFill(s: LayoutSurface): string {
  const p = pal(s.theme);
  const fills: Record<Material, string> = {
    planting: p.planting,
    gravel: p.ground,
    'wood-deck': PLAN_COMMON.wood,
    paver: '#D9D4CC',
    mulch: '#B9875A',
    'nature-play': PLAN_COMMON.natureplay,
    lawn: '#9ED37E',
    gabion: PLAN_COMMON.gabion,
    edge: '#8C8C8C',
    'existing-pavement': '#C9C9C9',
    other: '#EEEEEE',
  };
  return fills[s.material] ?? '#EEEEEE';
}

/** A tree canopy: a circle with a scalloped edge, like the pieces draw it. */
function canopyPath(r: number): string {
  const n = Math.max(10, Math.round(r * 5));
  const pts: string[] = [];
  for (let k = 0; k < n * 2; k++) {
    const a = (Math.PI * k) / n;
    const rr = k % 2 === 0 ? r : r * 0.9;
    pts.push(`${(Math.cos(a) * rr).toFixed(3)},${(Math.sin(a) * rr).toFixed(3)}`);
  }
  return `M${pts.join('L')}Z`;
}

function lines(n: number, make: (k: number) => JSX.Element): JSX.Element[] {
  const out: JSX.Element[] = [];
  for (let k = 1; k < n; k++) out.push(make(k));
  return out;
}

/** Glyph for one item, drawn centred on 0,0 with x along w (svg y down). */
function Glyph({ it }: { it: LayoutItem }): JSX.Element {
  const { w, h } = it;
  const p = pal(it.theme);
  const x0 = -w / 2;
  const y0 = -h / 2;
  const sw = 0.08;
  switch (it.element) {
    case 'small-tree':
    case 'large-tree':
    case 'existing-tree': {
      const r = Math.max(w, h) / 2;
      return (
        <g>
          <path d={canopyPath(r)} fill={it.element === 'existing-tree' ? '#5F8F6A' : p.canopy} fill-opacity={0.82} />
          <circle r={Math.min(0.18, r / 6)} fill="#2E5E2E" fill-opacity={0.6} />
        </g>
      );
    }
    case 'shrub':
      return <circle r={Math.max(0.35, Math.min(w, h) / 2)} fill={PLAN_COMMON.shrub} stroke="#C2B048" stroke-width={0.05} />;
    case 'gabion-bench':
    case 'gabion-bench-8':
    case 'stage': {
      const n = it.element === 'stage' ? Math.max(2, Math.round(h / 0.6)) : 3;
      return (
        <g>
          <rect x={x0} y={y0} width={w} height={h} fill={PLAN_COMMON.wood} />
          {lines(n, (k) => (
            <line x1={x0} x2={x0 + w} y1={y0 + (h * k) / n} y2={y0 + (h * k) / n} stroke="#fff" stroke-width={0.06} />
          ))}
        </g>
      );
    }
    case 'gabion-table':
      return (
        <g>
          <rect x={x0} y={y0} width={w} height={h} fill={PLAN_COMMON.wood} />
          <path d={`M${x0} ${y0}L${-x0} ${-y0}M${x0} ${-y0}L${-x0} ${y0}`} stroke="#fff" stroke-width={0.06} />
        </g>
      );
    case 'bench-back':
      return (
        <g>
          <rect x={x0} y={y0} width={w} height={h} fill={PLAN_COMMON.woodMid} />
          <line x1={x0} x2={x0 + w} y1={y0 + h * 0.2} y2={y0 + h * 0.2} stroke="#B9692A" stroke-width={0.12} />
          <line x1={x0} x2={x0 + w} y1={y0 + h * 0.6} y2={y0 + h * 0.6} stroke="#fff" stroke-width={0.05} />
        </g>
      );
    case 'bench-4':
    case 'workbench':
      return (
        <g>
          <rect x={x0} y={y0} width={w} height={h} fill={it.element === 'workbench' ? PLAN_COMMON.woodLight : PLAN_COMMON.woodMid} />
          <line x1={x0} x2={x0 + w} y1={0} y2={0} stroke="#fff" stroke-width={0.05} />
        </g>
      );
    case 'stool':
      return <rect x={x0} y={y0} width={w} height={h} rx={0.12} fill={p.seat} />;
    case 'table-2':
    case 'table-4':
    case 'table-6':
      return (
        <g>
          <rect x={x0} y={y0} width={w} height={h} fill={PLAN_COMMON.tableSlat} />
          {lines(4, (k) => (
            <line x1={x0} x2={x0 + w} y1={y0 + (h * k) / 4} y2={y0 + (h * k) / 4} stroke="#8C9AA0" stroke-width={0.05} />
          ))}
        </g>
      );
    case 'cafe-table': {
      const long = Math.max(w, h);
      const short = Math.min(w, h);
      const t = Math.min(short, long * 0.55);
      const horiz = w >= h;
      const chair = (dx: number) =>
        horiz ? (
          <rect x={dx - short * 0.2} y={-short * 0.35} width={short * 0.4} height={short * 0.7} rx={0.1} fill={p.seat} />
        ) : (
          <rect x={-short * 0.35} y={dx - short * 0.2} width={short * 0.7} height={short * 0.4} rx={0.1} fill={p.seat} />
        );
      return (
        <g>
          {chair(-long / 2 + short * 0.2)}
          {chair(long / 2 - short * 0.2)}
          <rect x={-t / 2} y={-t / 2} width={t} height={t} rx={0.2} fill={p.table} />
        </g>
      );
    }
    case 'communal-table': {
      const horiz = w >= h;
      const L = horiz ? w : h;
      const S = horiz ? h : w;
      const tl = L - 1.6;
      const ts = Math.max(1, S - 2);
      const seats = Math.max(2, Math.round(tl / 1.8));
      const chairs: JSX.Element[] = [];
      for (let k = 0; k < seats; k++) {
        const c = -tl / 2 + (tl * (k + 0.5)) / seats;
        for (const side of [-1, 1]) {
          const cx = c;
          const cy = side * (ts / 2 + 0.45);
          chairs.push(
            horiz ? (
              <rect x={cx - 0.35} y={cy - 0.45} width={0.7} height={0.9} rx={0.1} fill={p.seat} />
            ) : (
              <rect x={cy - 0.45} y={cx - 0.35} width={0.9} height={0.7} rx={0.1} fill={p.seat} />
            ),
          );
        }
      }
      return (
        <g>
          {chairs}
          {horiz ? (
            <rect x={-tl / 2} y={-ts / 2} width={tl} height={ts} fill={p.table} />
          ) : (
            <rect x={-ts / 2} y={-tl / 2} width={ts} height={tl} fill={p.table} />
          )}
        </g>
      );
    }
    case 'shade-canopy': {
      const posts: JSX.Element[] = [];
      for (let x = x0; x <= x0 + w + 1e-6; x += 4) posts.push(<line x1={x} x2={x} y1={y0} y2={y0 + h} stroke={p.canopySlat} stroke-width={0.25} />);
      const slats = Math.max(2, Math.round(h / 0.85));
      return (
        <g>
          {lines(slats, (k) => (
            <line x1={x0} x2={x0 + w} y1={y0 + (h * k) / slats} y2={y0 + (h * k) / slats} stroke={p.canopySlat} stroke-width={0.12} stroke-opacity={0.85} />
          ))}
          {posts}
          <rect x={x0} y={y0} width={w} height={h} fill="none" stroke={p.canopySlat} stroke-width={0.15} />
        </g>
      );
    }
    case 'shed':
      return <rect x={x0} y={y0} width={w} height={h} fill={p.shed} />;
    case 'compost-bin':
      return <rect x={x0 + 0.1} y={y0 + 0.1} width={w - 0.2} height={h - 0.2} fill="none" stroke={PLAN_COMMON.compost} stroke-width={0.18} />;
    case 'cold-frame':
      return (
        <g>
          <rect x={x0 + 0.08} y={y0 + 0.08} width={w - 0.16} height={h - 0.16} fill="#FFFFFF" fill-opacity={0.55} stroke={PLAN_COMMON.woodMid} stroke-width={0.16} />
          <line x1={x0} x2={x0 + w} y1={y0 + 0.25} y2={y0 + 0.25} stroke={PLAN_COMMON.woodMid} stroke-width={0.4} />
        </g>
      );
    case 'raised-bed':
    case 'keyhole-garden': {
      const round = it.element === 'keyhole-garden' || it.variant === 'round';
      const stripes = Math.max(2, Math.round(h / 0.35));
      // stripes clipped to the bed's outline (no clipPath, so ids never clash)
      const half = (y: number) => (round ? (w / 2) * Math.sqrt(Math.max(0, 1 - (y / (h / 2)) ** 2)) : w / 2);
      return (
        <g>
          {round ? <ellipse rx={w / 2} ry={h / 2} fill="#8CCB6E" /> : <rect x={x0} y={y0} width={w} height={h} fill="#8CCB6E" />}
          {lines(stripes, (k) => {
            const y = y0 + (h * k) / stripes;
            return <line x1={-half(y)} x2={half(y)} y1={y} y2={y} stroke="#A7D98C" stroke-width={0.12} />;
          })}
          {round ? (
            <ellipse rx={w / 2} ry={h / 2} fill="none" stroke={it.element === 'keyhole-garden' ? PLAN_COMMON.outline : '#D07B2C'} stroke-width={0.1} />
          ) : (
            <rect x={x0} y={y0} width={w} height={h} fill="none" stroke="#D07B2C" stroke-width={0.14} />
          )}
          {it.element === 'keyhole-garden' && (
            <ellipse rx={w * 0.2} ry={h * 0.2} fill={pal(it.theme).ground} stroke={PLAN_COMMON.outline} stroke-width={0.08} />
          )}
        </g>
      );
    }
    case 'rain-barrel':
      return <circle r={Math.min(w, h) / 2} fill={PLAN_COMMON.rainBarrel} stroke="#F15622" stroke-width={0.12} />;
    case 'birdbath':
    case 'solar-fountain':
      return <circle r={Math.min(w, h) / 2} fill="#BFE6F5" stroke={PLAN_COMMON.outline} stroke-width={sw} />;
    default: {
      const label = (ELEMENTS[it.element]?.name ?? it.element).slice(0, 1).toUpperCase();
      return (
        <g>
          <rect x={x0} y={y0} width={w} height={h} rx={0.2} fill="#FFFFFF" fill-opacity={0.9} stroke="#333" stroke-width={sw} />
          <text x={0} y={0} font-size={Math.min(w, h) * 0.6} text-anchor="middle" dominant-baseline="central" fill="#333">
            {label}
          </text>
        </g>
      );
    }
  }
}

const PIECE_NAME = { frame: 'FRAME', front: 'FRONT', back: 'BACK' } as const;

export default function PlanView(props: PlanViewProps) {
  const { layout, sunAt, selectedId, onSelect, showGrid = true, scale, labels = false, showPieces = true } = props;
  const L = layout.lengthFt;
  const W = layout.widthFt;
  const Y = (y: number) => W - y; // park y-up -> svg y-down
  const title =
    props.title ??
    `Plan of the park, ${L} by ${W} feet` +
      (layout.pieces?.length
        ? ` — ${layout.pieces.map((p) => `${THEMES[p.theme].name} ${p.kind}`).join(', ')}`
        : '');

  const surfaces = layout.surfaces.map((s) => {
    const fill = surfaceFill(s);
    return (
      <polygon
        points={s.polygon.map(([x, y]) => `${x},${Y(y)}`).join(' ')}
        fill={fill}
        stroke={fill}
        stroke-width={0.04}
      />
    );
  });

  // gabion walls get the stone stipple of the pieces
  const stones: JSX.Element[] = [];
  for (const s of layout.surfaces) {
    if (s.material !== 'gabion') continue;
    const xs = s.polygon.map((p) => p[0]);
    const ys = s.polygon.map((p) => p[1]);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    const horiz = x1 - x0 >= y1 - y0;
    const len = horiz ? x1 - x0 : y1 - y0;
    for (let k = 4; k < len - 0.5; k += 4) {
      stones.push(
        horiz ? (
          <line x1={x0 + k} x2={x0 + k} y1={Y(y0)} y2={Y(y1)} stroke="#7E7771" stroke-width={0.06} />
        ) : (
          <line x1={x0} x2={x1} y1={Y(y0 + k)} y2={Y(y0 + k)} stroke="#7E7771" stroke-width={0.06} />
        ),
      );
    }
  }

  const xs = layout.countGrid?.xs ?? Array.from({ length: Math.floor(L / 4) + 1 }, (_, k) => k * 4);
  const ys = layout.countGrid?.ys ?? Array.from({ length: Math.floor(W / 4) + 1 }, (_, k) => k * 4);
  const grid = showGrid ? (
    <g stroke="#6E6E6E" stroke-opacity={0.28} stroke-width={0.06}>
      {xs.map((x) => (
        <line x1={x} x2={x} y1={0} y2={W} />
      ))}
      {ys.map((y) => (
        <line x1={0} x2={L} y1={Y(y)} y2={Y(y)} />
      ))}
    </g>
  ) : null;

  let sun: JSX.Element | null = null;
  if (sunAt) {
    const cells: JSX.Element[] = [];
    for (let b = 0; b + 1 < ys.length; b++) {
      for (let a = 0; a + 1 < xs.length; a++) {
        const cx = (xs[a]! + xs[a + 1]!) / 2;
        const cy = (ys[b]! + ys[b + 1]!) / 2;
        const cls = sunAt(cx, cy);
        if (cls === 'sun') continue;
        cells.push(
          <rect
            x={xs[a]}
            y={Y(ys[b + 1]!)}
            width={xs[a + 1]! - xs[a]!}
            height={ys[b + 1]! - ys[b]!}
            fill="#1B2A3A"
            fill-opacity={cls === 'shade' ? 0.22 : 0.1}
          />,
        );
      }
    }
    sun = <g aria-hidden="true">{cells}</g>;
  }

  const pieceOutlines =
    showPieces && layout.pieces ? (
      <g fill="none" stroke="#FFFFFF" stroke-width={0.18} stroke-opacity={0.9}>
        {layout.pieces
          .filter((p) => p.kind !== 'frame')
          .flatMap((p) => p.rects.map((r) => <rect x={r[0]} y={Y(r[3])} width={r[2] - r[0]} height={r[3] - r[1]} />))}
      </g>
    ) : null;

  // where the seam strips went in (a dashed cyan line either side, like the cut lines on the paper)
  const seamLines: JSX.Element[] = [];
  const sl = layout.seams;
  if (sl?.length.deltaFt && sl.length.deltaFt > 0) {
    for (const x of [sl.length.at, sl.length.at + sl.length.deltaFt])
      seamLines.push(<line x1={x} x2={x} y1={0} y2={W} stroke="#00A8E8" stroke-width={0.12} stroke-dasharray="0.6 0.4" />);
  }
  if (sl?.width.deltaFt && sl.width.deltaFt > 0) {
    for (const y of [sl.width.at, sl.width.at + sl.width.deltaFt])
      seamLines.push(<line x1={0} x2={L} y1={Y(y)} y2={Y(y)} stroke="#00A8E8" stroke-width={0.12} stroke-dasharray="0.6 0.4" />);
  }

  // draw large things first so small ones stay visible
  const order = (it: LayoutItem) =>
    it.element === 'shade-canopy' ? 3 : it.element.endsWith('tree') ? 2 : it.element === 'shrub' ? 1 : 0;
  const items = [...layout.items].sort((a, b) => order(a) - order(b) || b.w * b.h - a.w * a.h);

  const glyphs = items.map((it) => {
    const sel = it.id === selectedId;
    const t = `translate(${it.x} ${Y(it.y)}) rotate(${-it.rotationDeg})`;
    const name = ELEMENTS[it.element]?.name ?? it.element;
    const interactive = !!onSelect;
    return (
      <g
        transform={t}
        data-id={it.id}
        data-element={it.element}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={interactive ? name : undefined}
        style={interactive ? { cursor: 'pointer' } : undefined}
        onClick={interactive ? () => onSelect!(it.id) : undefined}
        onKeyDown={
          interactive
            ? (e: JSX.TargetedKeyboardEvent<SVGGElement>) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect!(it.id);
                }
              }
            : undefined
        }
      >
        <Glyph it={it} />
        {sel && (
          <rect
            x={-it.w / 2 - 0.3}
            y={-it.h / 2 - 0.3}
            width={it.w + 0.6}
            height={it.h + 0.6}
            fill="none"
            stroke="#00A8E8"
            stroke-width={0.25}
          />
        )}
      </g>
    );
  });

  const street = layout.streetEdges.map((e) => {
    const off = 1.1;
    const geo = {
      x0: { x1: -off, y1: 0, x2: -off, y2: W, tx: -off - 0.6, ty: W / 2, rot: -90 },
      x1: { x1: L + off, y1: 0, x2: L + off, y2: W, tx: L + off + 0.6, ty: W / 2, rot: 90 },
      y0: { x1: 0, y1: W + off, x2: L, y2: W + off, tx: L / 2, ty: W + off + 0.6, rot: 0 },
      y1: { x1: 0, y1: -off, x2: L, y2: -off, tx: L / 2, ty: -off - 0.6, rot: 0 },
    }[e];
    return (
      <g>
        <line x1={geo.x1} y1={geo.y1} x2={geo.x2} y2={geo.y2} stroke="#9A9A9A" stroke-width={0.35} stroke-dasharray="1.2 0.8" />
        {labels && (
          <text
            x={geo.tx}
            y={geo.ty}
            transform={`rotate(${geo.rot} ${geo.tx} ${geo.ty})`}
            font-size={1}
            font-weight={800}
            letter-spacing={0.1}
            text-anchor="middle"
            dominant-baseline="central"
            fill="#555"
          >
            {e === 'x0' ? 'STREET · ENTRANCE' : 'STREET'}
          </text>
        )}
      </g>
    );
  });

  const pieceLabels =
    labels && layout.pieces
      ? layout.pieces.filter((p) => p.rects.length > 0).map((p) => {
          const r = p.rects.reduce((a, b) => ((b[2] - b[0]) * (b[3] - b[1]) > (a[2] - a[0]) * (a[3] - a[1]) ? b : a));
          const x = p.kind === 'frame' ? r[0] + 0.4 : r[0] + 0.5;
          const y = p.kind === 'frame' ? Y(r[3]) + 0.9 : Y(r[3]) + 1.2;
          return (
            <text x={x} y={y} font-size={p.kind === 'frame' ? 0.75 : 1} font-weight={800} fill="#222" fill-opacity={0.75}>
              {`${THEMES[p.theme].name.toUpperCase()} ${PIECE_NAME[p.kind]}`}
            </text>
          );
        })
      : null;

  const vb = `${-M} ${-M} ${L + 2 * M} ${W + 2 * M}`;
  const size = scale ? { width: (L + 2 * M) * scale, height: (W + 2 * M) * scale } : { width: '100%' };
  return (
    <svg
      viewBox={vb}
      {...size}
      class={props.class}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
      font-family="'Work Sans Variable','Work Sans',system-ui,sans-serif"
    >
      <title>{title}</title>
      <rect x={-M} y={-M} width={L + 2 * M} height={W + 2 * M} fill="#FFFFFF" />
      <g shape-rendering="crispEdges">{surfaces}</g>
      <g>{stones}</g>
      {sun}
      {grid}
      {pieceOutlines}
      <g aria-hidden="true">{seamLines}</g>
      <g>{glyphs}</g>
      <rect x={0} y={0} width={L} height={W} fill="none" stroke="#333" stroke-width={0.12} />
      {street}
      {pieceLabels}
    </svg>
  );
}

/** @jsxImportSource preact */
// A small aerial photo of the lot with its outline: City of Philadelphia 2025
// 3-inch imagery tiles composed in an SVG (no map library needed). It can be
// turned (rotateDeg = where north points, clockwise from up) to match a sketch
// drawn as you stand at the entrance; a north arrow then shows which way is north.

import type { LngLat } from '../../lib/types';
import { aerialTileUrl } from '../../lib/mapstyle';
import { words } from '../../lib/philly/words';

const TILE = 256;
const SIZE = 512;

function project(ll: LngLat, z: number): [number, number] {
  const n = TILE * 2 ** z;
  const x = ((ll[0] + 180) / 360) * n;
  const s = Math.sin((ll[1] * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n;
  return [x, y];
}

interface Props {
  polygon: LngLat[];
  /** extra outlines drawn thin (neighbours) */
  label: string;
  year?: number;
  /** Turn the photo so north points this many degrees clockwise from up (default: north up) */
  rotateDeg?: number;
}

export default function AerialThumb({ polygon, label, year = 2025, rotateDeg = 0 }: Props) {
  if (polygon.length < 3) return null;
  const t = words();
  const lngs = polygon.map((p) => p[0]);
  const lats = polygon.map((p) => p[1]);
  const center: LngLat = [(Math.min(...lngs) + Math.max(...lngs)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2];
  // highest zoom (≤ 21) where the lot fills at most ~40% of the frame
  let z = 21;
  for (; z > 15; z--) {
    const a = project([Math.min(...lngs), Math.max(...lats)], z);
    const b = project([Math.max(...lngs), Math.min(...lats)], z);
    if (Math.max(b[0] - a[0], b[1] - a[1]) <= SIZE * 0.4) break;
  }
  const [cx, cy] = project(center, z);
  const x0 = cx - SIZE / 2;
  const y0 = cy - SIZE / 2;
  // a turned photo needs tiles out to the corners of the frame
  const turned = Math.abs(rotateDeg % 360) > 0.5;
  const reach = turned ? (SIZE * (Math.SQRT2 - 1)) / 2 + 2 : 0;
  const tiles: { x: number; y: number; url: string }[] = [];
  for (let tx = Math.floor((x0 - reach) / TILE); tx <= Math.floor((x0 + SIZE + reach) / TILE); tx++)
    for (let ty = Math.floor((y0 - reach) / TILE); ty <= Math.floor((y0 + SIZE + reach) / TILE); ty++)
      tiles.push({ x: tx * TILE - x0, y: ty * TILE - y0, url: aerialTileUrl(z, tx, ty, year) });
  const d =
    polygon
      .map((p, i) => {
        const [px, py] = project(p, z);
        return `${i ? 'L' : 'M'}${(px - x0).toFixed(1)},${(py - y0).toFixed(1)}`;
      })
      .join(' ') + 'Z';
  return (
    <figure style="margin:0">
      <svg class="ph-outline" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={label} style="background:#ccc;direction:ltr">
        <g transform={turned ? `rotate(${rotateDeg},${SIZE / 2},${SIZE / 2})` : undefined}>
          {tiles.map((t) => (
            <image href={t.url} x={t.x} y={t.y} width={TILE} height={TILE} />
          ))}
          <path d={d} fill="none" stroke="#fff" stroke-width="7" stroke-linejoin="round" opacity="0.9" />
          <path d={d} fill="none" stroke="#00A8E8" stroke-width="4" stroke-linejoin="round" />
        </g>
        <g transform={`translate(${SIZE - 58},58)`} aria-hidden="true">
          <circle r="50" fill="#fff" opacity="0.9" />
          <g transform={`rotate(${rotateDeg})`}>
            <path d="M0,-12 L13,26 L0,18 L-13,26Z" fill="#111" />
            <text y="-27" transform={`rotate(${-rotateDeg},0,-27)`} text-anchor="middle" dominant-baseline="central" font-size="28" font-weight="700" fill="#111">
              {t('map.north')}
            </text>
          </g>
        </g>
      </svg>
      <figcaption class="ph-credit">{t('aerial.credit', { year: String(year) })}</figcaption>
    </figure>
  );
}

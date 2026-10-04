/** @jsxImportSource preact */
// A small aerial photo of the lot with its outline: City of Philadelphia 2025
// 3-inch imagery tiles composed in an SVG (no map library needed).

import type { LngLat } from '../../lib/types';
import { aerialTileUrl } from '../../lib/mapstyle';

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
}

export default function AerialThumb({ polygon, label, year = 2025 }: Props) {
  if (polygon.length < 3) return null;
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
  const tiles: { x: number; y: number; url: string }[] = [];
  for (let tx = Math.floor(x0 / TILE); tx <= Math.floor((x0 + SIZE) / TILE); tx++)
    for (let ty = Math.floor(y0 / TILE); ty <= Math.floor((y0 + SIZE) / TILE); ty++)
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
      <svg class="ph-outline" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={label} style="background:#ccc">
        {tiles.map((t) => (
          <image href={t.url} x={t.x} y={t.y} width={TILE} height={TILE} />
        ))}
        <path d={d} fill="none" stroke="#fff" stroke-width="7" stroke-linejoin="round" opacity="0.9" />
        <path d={d} fill="none" stroke="#00A8E8" stroke-width="4" stroke-linejoin="round" />
      </svg>
      <figcaption class="ph-credit">Aerial photo {year} © City of Philadelphia. Your lot is outlined in blue.</figcaption>
    </figure>
  );
}

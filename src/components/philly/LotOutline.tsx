/** @jsxImportSource preact */
// A small north-up drawing of the parcel with its street edges marked.

import type { LotRecord } from '../../lib/types';
import type { LotExtra } from '../../lib/philly/types';
import { makeProjector } from '../../lib/philly/geo';
import { words } from '../../lib/philly/words';

export default function LotOutline({ lot, size = 150 }: { lot: LotRecord; size?: number }) {
  const t = words();
  const poly = lot.polygon;
  const g = (lot.extra as LotExtra | undefined)?.geometry;
  const pr = makeProjector(poly[0]!);
  const pts = poly.map(pr.toXY);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY) || 1;
  const pad = 18;
  const k = (size - 2 * pad) / span;
  const ox = pad + ((size - 2 * pad) - (maxX - minX) * k) / 2;
  const oy = pad + ((size - 2 * pad) - (maxY - minY) * k) / 2;
  const tx = (p: [number, number]) => [ox + (p[0] - minX) * k, size - (oy + (p[1] - minY) * k)] as const;
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${tx(p).join(',')}`).join(' ') + 'Z';
  const streetEdges = (g?.edges ?? []).filter((e) => e.street);
  return (
    <svg
      class="ph-outline"
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      style="direction:ltr"
      aria-label={g ? t('outline.label', { width: Math.round(g.widthFt), length: Math.round(g.lengthFt) }) : t('outline.labelNoSize')}
    >
      <path d={d} fill="#bfe9f9" stroke="#111" stroke-width="1.5" stroke-linejoin="round" />
      {streetEdges.map((e) => {
        const a = tx(pr.toXY(e.from));
        const b = tx(pr.toXY(e.to));
        return <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#00709c" stroke-width="5" stroke-linecap="round" />;
      })}
      <g transform={`translate(${size - 12},14)`} aria-hidden="true">
        <path d="M0,-9 L4,4 L0,1 L-4,4Z" fill="#111" />
        <text y="13" text-anchor="middle" font-size="8" font-weight="700" fill="#111">
          {t('map.north')}
        </text>
      </g>
    </svg>
  );
}

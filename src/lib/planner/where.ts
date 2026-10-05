// Where an item is, in words a builder can pace out (fix round 2026-10-04, build-lead A13).
// Pure, tested.
//
// "Café table + chairs — 29 ft in" read like feet-and-inches and two of the same thing
// couldn't be told apart. Now: "29 ft from the entrance, 4 ft from the left side",
// measured from the item's own near edges (as turned), standing at the entrance looking in.
// Words: i18n area "planner" (where.*).

import { pt, type PlannerT } from './words';

export interface WhereItem {
  x: number;
  y: number;
  w: number;
  h: number;
  rotationDeg: number;
}

/** Half the item's extent along the park's length (x) and width (y), as turned. */
export function halfExtents(it: Pick<WhereItem, 'w' | 'h' | 'rotationDeg'>): [number, number] {
  const r = (it.rotationDeg * Math.PI) / 180;
  const c = Math.abs(Math.cos(r));
  const s = Math.abs(Math.sin(r));
  return [(c * it.w + s * it.h) / 2, (s * it.w + c * it.h) / 2];
}

/**
 * `parkW` = the park's width. `leftIsY1` = the park's y1 side is on your left as you walk
 * in (true unless the park is flipped left–right on the lot).
 */
export function itemWhere(it: WhereItem, parkW: number, leftIsY1 = true, t: PlannerT = pt()): string {
  const [hx, hy] = halfExtents(it);
  const ft = (v: number) => Math.max(0, Math.round(v));
  const fromEntrance = ft(it.x - hx);
  const toY1 = ft(parkW - (it.y + hy));
  const toY0 = ft(it.y - hy);
  const left = leftIsY1 ? toY1 : toY0;
  const right = leftIsY1 ? toY0 : toY1;
  const across =
    Math.abs(left - right) <= 1
      ? t('where.middle')
      : left < right
        ? left === 0
          ? t('where.againstLeft')
          : t('where.fromLeft', { ft: left, count: left })
        : right === 0
          ? t('where.againstRight')
          : t('where.fromRight', { ft: right, count: right });
  const along = fromEntrance === 0 ? t('where.atEntrance') : t('where.fromEntrance', { ft: fromEntrance, count: fromEntrance });
  return t('where.both', { along, across });
}

/** Labels for a list of items, numbered where two would read the same ("Stool — …, #2"). */
export function uniqueLabels(labels: string[], t: PlannerT = pt()): string[] {
  const seen = new Map<string, number>();
  const total = new Map<string, number>();
  for (const l of labels) total.set(l, (total.get(l) ?? 0) + 1);
  return labels.map((l) => {
    if ((total.get(l) ?? 0) < 2) return l;
    const n = (seen.get(l) ?? 0) + 1;
    seen.set(l, n);
    return t('where.numbered', { label: l, n: String(n) });
  });
}

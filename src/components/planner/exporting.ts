// Export: PNG snapshots and a printable plan sheet (plan view + counts).

import type { PlannerScene } from '../../lib/planner/scene';
import type { PlannerStore } from '../../lib/planner/store';
import { THEMES } from '../../data/themes';
import { catalogEntry } from '../../lib/planner/catalog';

export function downloadDataUrl(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, cls?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (text != null) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}

export function printPlan(scene: PlannerScene, store: PlannerStore) {
  const site = store.$site.get();
  const d = store.$design.get();
  const t = store.$tally.get();
  if (!site || !d) return;
  const url = scene.snapshot('plan', { w: 1800, h: 1050 });
  const sheet = el('div', undefined, 'pl-print-sheet');
  sheet.appendChild(el('p', 'Park in a Truck · park plan', 'eyebrow'));
  sheet.appendChild(el('h1', site.ctx.lot.address));
  sheet.appendChild(
    el(
      'p',
      `Size ${d.size} · ${d.lengthFt} ft × ${d.widthFt} ft · frame ${THEMES[d.frame].name}, front ${THEMES[d.front].name}, back ${THEMES[d.back].name}`,
    ),
  );
  const img = el('img');
  img.src = url;
  img.alt = `Plan view of the park design on ${site.ctx.lot.address}, on a 1-foot grid with 4-foot squares.`;
  sheet.appendChild(img);
  if (t) {
    const table = el('table');
    const row = (a: string, b: string) => {
      const tr = el('tr');
      tr.append(el('th', a), el('td', b));
      table.appendChild(tr);
    };
    row('Length (long side)', `${t.lengthFt} ft`);
    row('Width (short side)', `${t.widthFt} ft`);
    row('Green squares (perennials)', `${t.plantingSquares.sun} in sun, ${t.plantingSquares.shade} in shade`);
    row('Shrubs', `${t.shrubs.sun} in sun, ${t.shrubs.shade} in shade`);
    row('Small trees', String(t.smallTrees));
    row('Large trees', String(t.largeTrees));
    if (t.naturePlaySquares) row('Nature play squares', String(t.naturePlaySquares));
    for (const [id, n] of Object.entries(t.items)) row(catalogEntry(id).name, String(n));
    sheet.appendChild(table);
  }
  document.body.appendChild(sheet);
  document.body.classList.add('pl-printing');
  const done = () => {
    sheet.remove();
    document.body.classList.remove('pl-printing');
    window.removeEventListener('afterprint', done);
  };
  window.addEventListener('afterprint', done);
  const go = () => setTimeout(() => window.print(), 30);
  if (img.complete) go();
  else img.onload = go;
}

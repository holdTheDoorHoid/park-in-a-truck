// Export: PNG snapshots and a printable plan sheet (plan view + counts).

import type { PlannerScene } from '../../lib/planner/scene';
import type { PlannerStore } from '../../lib/planner/store';
import { THEMES } from '../../data/themes';
import { localizeRecord } from '../../i18n/data';
import { catalogEntry } from '../../lib/planner/catalog';
import { isolate, plannerLang, pt } from '../../lib/planner/words';

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
  const tally = store.$tally.get();
  if (!site || !d) return;
  const t = pt();
  const themes = localizeRecord(THEMES, 'themes', t.locale);
  const url = scene.snapshot('plan', { w: 1800, h: 1050 });
  const sheet = el('div', undefined, 'pl-print-sheet');
  // in the planner's language (English, left to right, until the planner is translated)
  const ld = plannerLang(t);
  sheet.lang = ld.lang;
  sheet.dir = ld.dir;
  sheet.appendChild(el('p', t('print.eyebrow'), 'eyebrow'));
  sheet.appendChild(el('h1', isolate(site.ctx.lot.address, t)));
  sheet.appendChild(
    el(
      'p',
      t('print.summary', { size: d.size, length: d.lengthFt, width: d.widthFt, frame: themes[d.frame].name, front: themes[d.front].name, back: themes[d.back].name }),
    ),
  );
  const img = el('img');
  img.src = url;
  img.alt = t('print.alt', { address: isolate(site.ctx.lot.address, t) });
  sheet.appendChild(img);
  if (tally) {
    const table = el('table');
    const row = (a: string, b: string) => {
      const tr = el('tr');
      tr.append(el('th', a), el('td', b));
      table.appendChild(tr);
    };
    const sunShade = (v: { sun: number; shade: number }) => t('print.sunShade', { sun: v.sun, shade: v.shade });
    row(t('print.length'), t('common.ft', { ft: tally.lengthFt, count: tally.lengthFt }));
    row(t('print.width'), t('common.ft', { ft: tally.widthFt, count: tally.widthFt }));
    row(t('print.squares'), sunShade(tally.plantingSquares));
    row(t('counts.shrubs'), sunShade(tally.shrubs));
    row(t('counts.smallTrees'), t.num(tally.smallTrees));
    row(t('counts.largeTrees'), t.num(tally.largeTrees));
    if (tally.naturePlaySquares) row(t('counts.naturePlay'), t.num(tally.naturePlaySquares));
    for (const [id, n] of Object.entries(tally.items)) row(catalogEntry(id).name, t.num(n));
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

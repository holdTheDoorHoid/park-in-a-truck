/** @jsxImportSource preact */
// The cost estimator: PiaT's cost spreadsheet as a live form. Questions are
// prefilled from the design (project.extra.tally) when there is one; anything
// typed is saved in project.extra.costInputs and can be reset per question.

import { useStore } from '@nanostores/preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { $project, setExtra } from '../../lib/project';
import type { DesignTally, SiteFacts } from '../../lib/types';
import { FIELD_GROUPS } from '../../lib/cost/fields';
import { estimate, fmtN, money, type CostInputKey } from '../../lib/cost/model';
import { COST_INPUTS_KEY, readSaved, resolveInputs, withOverride, withUnitPrice, type SavedCostInputs } from '../../lib/cost/state';
import { estimateCsv } from '../../lib/cost/csv';
import NumberField from './NumberField';
import { Differences, EstimateView, OrderListView, PriceNeeded, TotalCard } from './Results';
import './cost.css';

interface Props {
  /** Heading shown above the estimator */
  title?: string;
  /** Open the order list first (e.g. in the Create chapter) */
  focus?: 'estimate' | 'order';
}

let counter = 0;

export default function CostEstimator({ title = 'Your cost estimate', focus = 'estimate' }: Props) {
  const project = useStore($project);
  const [mounted, setMounted] = useState(false);
  const [openAll, setOpenAll] = useState(false);
  const [idBase] = useState(() => `ce${++counter}`);
  const resultsRef = useRef<HTMLElement>(null);
  /** Which question groups start open; worked out once so a group never snaps shut while you type in it. */
  const groupsOpen = useRef<Record<string, boolean> | null>(null);
  useEffect(() => setMounted(true), []);

  const tally = (project.extra.tally as DesignTally | undefined) ?? null;
  const site = (project.extra.site as SiteFacts | undefined) ?? null;
  const saved = readSaved(project.extra[COST_INPUTS_KEY]);
  const r = useMemo(() => resolveInputs(saved, tally, site), [project.extra[COST_INPUTS_KEY], tally, site]);
  const e = useMemo(() => estimate(r.values, { unitPrices: saved.unitPrices }), [r, project.extra[COST_INPUTS_KEY]]);

  const save = (next: SavedCostInputs) => setExtra(COST_INPUTS_KEY, next);
  const change = (key: CostInputKey, v: number | undefined) => save(withOverride(readSaved($project.get().extra[COST_INPUTS_KEY]), key, v));
  const setPrice = (id: string, v: number | undefined) => save(withUnitPrice(readSaved($project.get().extra[COST_INPUTS_KEY]), id, v));
  const overrides = Object.keys(saved.overrides).length;

  if (!mounted) {
    return (
      <section class="ce ce-loading" aria-busy="true">
        <p class="eyebrow">Cost estimator</p>
        <p>Loading your cost estimate…</p>
      </section>
    );
  }

  function downloadCsv() {
    const csv = estimateCsv(e, project.name);
    const safe = project.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'park';
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safe}-cost-estimate.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function print() {
    const root = resultsRef.current;
    if (!root) return;
    // Print only the results: hide everything that is not on the path to them, open every section.
    const hidden: Element[] = [];
    const path: Element[] = [];
    for (let el: Element | null = root; el && el.parentElement; el = el.parentElement) {
      const parent: Element = el.parentElement;
      path.push(parent);
      for (const sib of Array.from(parent.children)) if (sib !== el) hidden.push(sib);
    }
    const details = Array.from(root.querySelectorAll('details'));
    const wasOpen = details.map((d) => d.open);
    details.forEach((d) => (d.open = true));
    hidden.forEach((h) => h.classList.add('ce-print-hide'));
    path.forEach((p) => p.classList.add('ce-print-path'));
    document.documentElement.dataset.print = 'cost';
    const done = () => {
      delete document.documentElement.dataset.print;
      hidden.forEach((h) => h.classList.remove('ce-print-hide'));
      path.forEach((p) => p.classList.remove('ce-print-path'));
      details.forEach((d, k) => (d.open = wasOpen[k]!));
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    window.print();
  }

  const answered = (keys: CostInputKey[]) => keys.filter((k) => r.values[k] !== 0).length;
  groupsOpen.current ??= Object.fromEntries(FIELD_GROUPS.map((g, gi) => [g.id, gi < 3 || answered(g.fields.map((f) => f.key)) > 0]));
  const unmapped = r.fromTally.unmapped;

  return (
    <section class="ce" aria-labelledby={`${idBase}-title`}>
      <header class="ce-head">
        <p class="eyebrow">Cost estimator</p>
        <h3 id={`${idBase}-title`} class="ce-title">
          {title}
        </h3>
        {r.hasDesign ? (
          <p class="ce-status ce-status-design">
            ✓ Filled in from your design. Change any number — your changes are saved in this browser, and “Reset” brings back the design’s count.
          </p>
        ) : r.base === 'example' ? (
          <p class="ce-status ce-status-example">
            These are the example numbers from the Park in a Truck spreadsheet{r.fromTally.sizeFrom === 'lot' ? ', with your lot’s size' : ''}. Replace them with your own counts, or
            design your park in the planner to fill them in automatically.{' '}
            <button type="button" class="btn btn-small" onClick={() => save({ ...saved, base: 'zero' })}>
              Start from zero
            </button>
          </p>
        ) : (
          <p class="ce-status">
            Count your pieces and type the totals here, or design your park in the planner to fill them in automatically.{' '}
            <button type="button" class="btn btn-small" onClick={() => save({ ...saved, base: 'example' })}>
              Show the spreadsheet’s example
            </button>
          </p>
        )}
        {unmapped.length > 0 && (
          <p class="ce-status ce-status-warn">
            Your design also has {unmapped.map((u) => `${fmtN(u.count)} × ${u.name}`).join(', ')}. The PiaT estimator has no line for{' '}
            {unmapped.length === 1 && unmapped[0]!.count === 1 ? 'it' : 'them'} — add the cost under “Anything else”.
          </p>
        )}
      </header>

      <div class="ce-form">
        {FIELD_GROUPS.map((g) => {
          const keys = g.fields.map((f) => f.key);
          const n = answered(keys);
          return (
            <details class="ce-group" key={g.id} open={groupsOpen.current![g.id]}>
              <summary>
                <span class="ce-group-title">{g.title}</span>
                <span class="ce-group-count">
                  {keys.length} question{keys.length === 1 ? '' : 's'}
                  {n > 0 && ` · ${n} not zero`}
                </span>
              </summary>
              {g.intro && <p class="ce-intro">{g.intro}</p>}
              {g.id === 'plants' && (
                <p class="ce-computed">
                  Perennials: <strong>{fmtN(e.summary.perennials)}</strong> <span class="muted">(4 × {fmtN(r.values.plantingSquares)} planting squares)</span>
                </p>
              )}
              {g.fields.map((f) => (
                <NumberField
                  key={f.key}
                  field={f}
                  idBase={idBase}
                  value={r.values[f.key]}
                  source={r.source[f.key]}
                  fallback={r.fallback[f.key]}
                  fallbackSource={r.fallbackSource[f.key]}
                  derivedNote={r.fromTally.notes[f.key]}
                  onChange={(v) => change(f.key, v)}
                />
              ))}
            </details>
          );
        })}
        {overrides > 0 && (
          <p class="ce-reset-all">
            <button
              type="button"
              class="btn btn-small"
              onClick={() => {
                if (window.confirm(`Clear the ${overrides} number${overrides === 1 ? '' : 's'} you typed${r.hasDesign ? ' and go back to your design’s counts' : ''}?`))
                  save({ ...saved, overrides: {} });
              }}
            >
              ↺ Clear my {overrides} number{overrides === 1 ? '' : 's'}
            </button>
          </p>
        )}
        <div class="ce-sticky">
          <span>
            Estimated final cost <strong>{money(e.total)}</strong>
          </span>
          <a href={`#${idBase}-results`}>See the estimate ↓</a>
        </div>
      </div>

      <section class="ce-results" id={`${idBase}-results`} ref={resultsRef} aria-label="Estimate and order list">
        <h4 class="ce-print-title">
          {project.name} — cost estimate and order list
        </h4>
        <TotalCard e={e} />
        {e.warnings.length > 0 && (
          <div class="ce-warnings" role="note">
            <p class="ce-warnings-head">Please check</p>
            <ul>
              {e.warnings.map((w, k) => (
                <li key={k}>{w}</li>
              ))}
            </ul>
          </div>
        )}
        <PriceNeeded e={e} onPrice={setPrice} idBase={idBase} />
        <Differences e={e} />
        <div class="ce-actions ce-no-print">
          <button type="button" class="btn btn-primary btn-small" onClick={print}>
            🖨 Print order list
          </button>
          <button type="button" class="btn btn-small" onClick={downloadCsv}>
            ⬇ Download CSV
          </button>
          <button type="button" class="btn btn-small" onClick={() => setOpenAll(!openAll)} aria-pressed={openAll}>
            {openAll ? 'Close all sections' : 'Open all sections'}
          </button>
        </div>
        <h4 class="ce-section-head">Cost by category</h4>
        <EstimateView e={e} open={openAll} />
        <details class="ce-orderlist" open={focus === 'order' || openAll}>
          <summary>
            <span class="ce-section-head">Order list</span>
            <span class="ce-group-count">what to buy, where, and delivery times</span>
          </summary>
          <OrderListView e={e} />
        </details>
      </section>
    </section>
  );
}

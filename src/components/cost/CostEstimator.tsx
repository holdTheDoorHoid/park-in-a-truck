/** @jsxImportSource preact */
// The cost estimator: PiaT's cost spreadsheet as a live form. Questions are
// prefilled from the design (project.extra.tally) when there is one; anything
// typed is saved in project.extra.costInputs and can be reset per question.

import { useStore } from '@nanostores/preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { $project, setExtra } from '../../lib/project';
import type { DesignTally, SiteFacts } from '../../lib/types';
import { fieldGroups } from '../../lib/cost/fields';
import { PERENNIALS_PER_SQUARE } from '../../lib/cost/corrections';
import { estimate, type CostInputKey } from '../../lib/cost/model';
import { COST_INPUTS_KEY, readSaved, resolveInputs, withOverride, withUnitPrice, type SavedCostInputs } from '../../lib/cost/state';
import { estimateCsv } from '../../lib/cost/csv';
import { costT, join, money } from '../../lib/cost/text';
import { ELEMENTS } from '../../data/elements';
import { localizeRecord } from '../../i18n/data.ts';
import NumberField from './NumberField';
import { Differences, EstimateView, OrderListView, PriceNeeded, TotalCard } from './Results';
import './cost.css';

interface Props {
  /** Heading shown above the estimator */
  title?: string;
  /** Open the order list first (e.g. in the Create chapter) */
  focus?: 'estimate' | 'order';
  /** The page's language (passed by the Astro wrapper) */
  locale?: string;
  /** Build guides' titles in that language, by slug (the guides' text is not shipped to browsers) */
  guideTitles?: Record<string, string>;
}

let counter = 0;

export default function CostEstimator({ title, focus = 'estimate', locale, guideTitles }: Props) {
  const t = useMemo(() => costT(locale), [locale]);
  const groups = useMemo(() => fieldGroups(t), [t]);
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
  const r = useMemo(() => resolveInputs(saved, tally, site, t), [project.extra[COST_INPUTS_KEY], tally, site, t]);
  const e = useMemo(() => estimate(r.values, { unitPrices: saved.unitPrices, t }), [r, project.extra[COST_INPUTS_KEY], t]);

  const save = (next: SavedCostInputs) => setExtra(COST_INPUTS_KEY, next);
  const change = (key: CostInputKey, v: number | undefined) => save(withOverride(readSaved($project.get().extra[COST_INPUTS_KEY]), key, v));
  const setPrice = (id: string, v: number | undefined) => save(withUnitPrice(readSaved($project.get().extra[COST_INPUTS_KEY]), id, v));
  const overrides = Object.keys(saved.overrides).length;

  if (!mounted) {
    return (
      <section class="ce ce-loading" aria-busy="true">
        <p class="eyebrow">{t('ui.eyebrow')}</p>
        <p>{t('ui.loading')}</p>
      </section>
    );
  }

  function downloadCsv() {
    const csv = estimateCsv(e, project.name, new Date(), t);
    const safe = project.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'park';
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = t('ui.csvFile', { name: safe });
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
  groupsOpen.current ??= Object.fromEntries(groups.map((g, gi) => [g.id, gi < 3 || answered(g.fields.map((f) => f.key)) > 0]));
  const unmapped = r.fromTally.unmapped;
  const elements = localizeRecord(ELEMENTS, 'elements', t.locale);

  return (
    <section class="ce" aria-labelledby={`${idBase}-title`}>
      <header class="ce-head">
        <p class="eyebrow">{t('ui.eyebrow')}</p>
        <h3 id={`${idBase}-title`} class="ce-title">
          {title ?? t('ui.title')}
        </h3>
        {r.hasDesign ? (
          <p class="ce-status ce-status-design">{t('ui.status.design')}</p>
        ) : r.base === 'example' ? (
          <p class="ce-status ce-status-example">
            {t(r.fromTally.sizeFrom === 'lot' ? 'ui.status.exampleLot' : 'ui.status.example')}{' '}
            <button type="button" class="btn btn-small" onClick={() => save({ ...saved, base: 'zero' })}>
              {t('ui.startZero')}
            </button>
          </p>
        ) : (
          <p class="ce-status">
            {t('ui.status.blank')}{' '}
            <button type="button" class="btn btn-small" onClick={() => save({ ...saved, base: 'example' })}>
              {t('ui.showExample')}
            </button>
          </p>
        )}
        {unmapped.length > 0 && (
          <p class="ce-status ce-status-warn">
            {t('ui.unmapped', {
              count: unmapped.reduce((a, u) => a + u.count, 0),
              list: join(
                t,
                unmapped.map((u) => t('ui.unmappedItem', { count: u.count, name: elements[u.element]?.name ?? u.name })),
              ),
            })}
          </p>
        )}
      </header>

      <div class="ce-form">
        {groups.map((g) => {
          const keys = g.fields.map((f) => f.key);
          const n = answered(keys);
          return (
            <details class="ce-group" key={g.id} open={groupsOpen.current![g.id]}>
              <summary>
                <span class="ce-group-title">{g.title}</span>
                <span class="ce-group-count">
                  {t('ui.group.questions', { count: keys.length })}
                  {n > 0 && ` · ${t('ui.group.notZero', { count: n })}`}
                </span>
              </summary>
              {g.intro && <p class="ce-intro">{g.intro}</p>}
              {g.id === 'plants' && (
                <p class="ce-computed">
                  {t('ui.perennials')} <strong>{t.num(e.summary.perennials)}</strong>{' '}
                  <span class="muted">{t('ui.perennialsHow', { per: PERENNIALS_PER_SQUARE, count: r.values.plantingSquares })}</span>
                </p>
              )}
              {g.fields.map((f) => (
                <NumberField
                  key={f.key}
                  t={t}
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
                if (window.confirm(t(r.hasDesign ? 'ui.clearConfirmDesign' : 'ui.clearConfirm', { count: overrides }))) save({ ...saved, overrides: {} });
              }}
            >
              {t('ui.clearMine', { count: overrides })}
            </button>
          </p>
        )}
        <div class="ce-sticky">
          <span>
            {t('ui.finalCost')} <strong>{money(t, e.total)}</strong>
          </span>
          <a href={`#${idBase}-results`}>{t('ui.seeEstimate')}</a>
        </div>
      </div>

      <section class="ce-results" id={`${idBase}-results`} ref={resultsRef} aria-label={t('ui.resultsLabel')}>
        <h4 class="ce-print-title">{t('ui.printTitle', { name: project.name })}</h4>
        <TotalCard e={e} t={t} />
        {e.warnings.length > 0 && (
          <div class="ce-warnings" role="note">
            <p class="ce-warnings-head">{t('ui.check')}</p>
            <ul>
              {e.warnings.map((w, k) => (
                <li key={k}>{w}</li>
              ))}
            </ul>
          </div>
        )}
        <PriceNeeded e={e} t={t} onPrice={setPrice} idBase={idBase} />
        <Differences e={e} t={t} />
        <div class="ce-actions ce-no-print">
          <button type="button" class="btn btn-primary btn-small" data-ce="print" onClick={print}>
            {t('ui.print')}
          </button>
          <button type="button" class="btn btn-small" onClick={downloadCsv}>
            {t('ui.csv')}
          </button>
          <button type="button" class="btn btn-small" onClick={() => setOpenAll(!openAll)} aria-pressed={openAll}>
            {openAll ? t('ui.closeAll') : t('ui.openAll')}
          </button>
        </div>
        <h4 class="ce-section-head">{t('ui.byCategory')}</h4>
        <EstimateView e={e} t={t} open={openAll} guideTitles={guideTitles} />
        <details class="ce-orderlist" open={focus === 'order' || openAll}>
          <summary>
            <span class="ce-section-head">{t('ui.orderList')}</span>
            <span class="ce-group-count">{t('ui.orderListWhat')}</span>
          </summary>
          <OrderListView e={e} t={t} />
        </details>
      </section>
    </section>
  );
}

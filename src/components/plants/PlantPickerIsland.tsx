/** @jsxImportSource preact */
// The Dream workbook's plant-list calculator + picker. Reads plant targets
// from the planner's DesignTally (project.extra.tally) when there is one
// ("from your design"), or lets the person type the same six numbers the
// workbook's own "Count your plants" page asks for. Choosing WHICH species
// and how many of each is left to the person, same as the spreadsheets
// (see src/data/plants.ts for the calculator this ports and why).
import { useEffect, useMemo, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { $project, setExtra, setField } from '../../lib/project';
import { u } from '../../lib/url';
import type { DesignTally, ThemeId } from '../../lib/types';
import { THEME_ORDER, THEMES } from '../../data/themes';
import {
  evenSplit,
  plantCounts,
  PLANTS,
  PLANTS_PER_SQUARE,
  plantsForBucket,
  plantsForType,
  selectionCost,
  type Plant,
  type PlantPickerState,
  type PlantTargets,
} from '../../data/plants';
import plantsMsgs from '../../i18n/messages/en/plants.ts';
import { getT, type T } from '../../i18n/t.ts';
import { localizeKeyed, localizeRecord } from '../../i18n/data.ts';
import { stripIsolates } from '../../i18n/format.ts';

type PlantsT = T<typeof plantsMsgs>;

interface Props {
  theme?: ThemeId | ThemeId[];
  /** The page's language (passed by the Astro wrapper) */
  locale?: string;
}

type BucketLight = 'sun' | 'shade';
interface Bucket {
  key: string;
  label: string;
  light: BucketLight | 'both';
  plants: Plant[];
  target: number;
}

/**
 * The Dream workbook's six "Count your plants" blanks (dream.mdx). They show the
 * design's counts until the person types their own; a typed number wins here too,
 * so the boxes and the picker always agree.
 */
const COUNT_FIELDS = [
  { key: 'squareSun', id: 'dream.perennials-sun', label: 'count.squareSun', fromTally: (t: DesignTally) => t.plantingSquares.sun },
  { key: 'squareShade', id: 'dream.perennials-shade', label: 'count.squareShade', fromTally: (t: DesignTally) => t.plantingSquares.shade },
  { key: 'shrubSun', id: 'dream.shrubs-sun', label: 'count.shrubSun', fromTally: (t: DesignTally) => t.shrubs.sun },
  { key: 'shrubShade', id: 'dream.shrubs-shade', label: 'count.shrubShade', fromTally: (t: DesignTally) => t.shrubs.shade },
  { key: 'smallTree', id: 'dream.small-trees', label: 'type.smallTree', fromTally: (t: DesignTally) => t.smallTrees },
  { key: 'largeTree', id: 'dream.large-trees', label: 'type.largeTree', fromTally: (t: DesignTally) => t.largeTrees },
] as const;
type CountKey = (typeof COUNT_FIELDS)[number]['key'];

function themeList(t?: ThemeId | ThemeId[]): ThemeId[] {
  if (!t) return [];
  return Array.isArray(t) ? t : [t];
}

function buildBuckets(t: PlantsT, themes: ThemeId[], counts: PlantTargets): Bucket[] {
  const defs: { key: string; label: string; light: BucketLight | 'both'; plants: Plant[]; target: number }[] = [
    { key: 'perennial-sun', label: t('bucket.perennialSun'), light: 'sun', plants: plantsForBucket(themes, 'perennial', 'sun'), target: counts.perennial.sun },
    { key: 'perennial-shade', label: t('bucket.perennialShade'), light: 'shade', plants: plantsForBucket(themes, 'perennial', 'shade'), target: counts.perennial.shade },
    { key: 'shrub-sun', label: t('bucket.shrubSun'), light: 'sun', plants: plantsForBucket(themes, 'shrub', 'sun'), target: counts.shrub.sun },
    { key: 'shrub-shade', label: t('bucket.shrubShade'), light: 'shade', plants: plantsForBucket(themes, 'shrub', 'shade'), target: counts.shrub.shade },
    { key: 'small-tree', label: t('type.smallTree'), light: 'both', plants: plantsForType(themes, 'small-tree'), target: counts.smallTree },
    { key: 'large-tree', label: t('type.largeTree'), light: 'both', plants: plantsForType(themes, 'large-tree'), target: counts.largeTree },
  ];
  return defs.filter((b) => b.plants.length > 0);
}

/** A pot size in the page's language: "Quart" has words; nursery numbers ("#2") stay as they are. */
function potSize(size: string, t: PlantsT): string {
  if (size === 'Quart') return t('pot.quart');
  if (size === '1 quart') return t('pot.oneQuart');
  return size;
}

function csvEscape(s: string | number): string {
  // right-to-left isolate marks are for the page, not for spreadsheets (src/i18n/format.ts)
  const v = stripIsolates(String(s));
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

const CSV_TYPE = { 'large-tree': 'csv.type.largeTree', 'small-tree': 'csv.type.smallTree', shrub: 'csv.type.shrub', perennial: 'csv.type.perennial' } as const;
const CSV_LIGHT = { sun: 'csv.light.sun', shade: 'csv.light.shade', both: 'csv.light.both' } as const;

export default function PlantPickerIsland({ theme, locale }: Props) {
  const t = useMemo(() => getT(locale, plantsMsgs), [locale]);
  /** Plant names, notes and sizes in the reader's language (ids, botanical names and prices stay as they are) */
  const local = useMemo(() => new Map(localizeKeyed(PLANTS, 'plants', 'id', t.locale).map((p) => [p.id, p])), [t]);
  const themeNames = useMemo(() => localizeRecord(THEMES, 'themes', t.locale), [t]);
  /** Counts as the picker always wrote them (no thousands separator) */
  const n = (v: number) => t.num(v, { useGrouping: false });
  /** Dollars and cents as the picker always wrote them ("$1234.50", no thousands separator) */
  const usd = (v: number) =>
    t.num(v, { style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol', minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
  const project = useStore($project);
  const tally = project.extra.tally as DesignTally | undefined;
  const saved = project.extra.plants as PlantPickerState | undefined;

  const [themes, setThemes] = useState<ThemeId[]>(() => {
    if (saved?.themes?.length) return saved.themes;
    const propThemes = themeList(theme);
    if (propThemes.length) return propThemes;
    if (project.design) return Array.from(new Set([project.design.frame, project.design.front, project.design.back]));
    return [];
  });
  const [qty, setQty] = useState<Record<string, number>>(() => saved?.qty ?? {});
  const [useManual, setUseManual] = useState(!tally);

  const fromDesign = Boolean(tally) && !useManual;

  // Each count: the number typed in the Dream workbook's blank, else the design's (or 0).
  const typed = (id: string): number | undefined => {
    const v = project.fields[id];
    return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
  };
  const values = Object.fromEntries(
    COUNT_FIELDS.map((f) => [f.key, typed(f.id) ?? (fromDesign && tally ? (f.fromTally(tally) ?? 0) : 0)]),
  ) as Record<CountKey, number>;
  const anyTyped = COUNT_FIELDS.some((f) => typed(f.id) !== undefined);
  const valuesKey = COUNT_FIELDS.map((f) => values[f.key]).join(',');

  const counts = useMemo<PlantTargets>(
    () =>
      plantCounts({
        plantingSquares: { sun: values.squareSun, shade: values.squareShade },
        shrubs: { sun: values.shrubSun, shade: values.shrubShade },
        smallTrees: values.smallTree,
        largeTrees: values.largeTree,
      }),
    [valuesKey],
  );

  const buckets = useMemo(() => buildBuckets(t, themes, counts), [t, themes, counts]);

  // Persist whenever the person's choices actually change, rather than from
  // inside each handler -- handlers below use the *functional* setState form
  // (prev => ...) so two state updates fired in the same tick (e.g. a bulk
  // "fill evenly") never clobber each other by both reading the same stale
  // `qty`/`themes` closure.
  useEffect(() => {
    const state: PlantPickerState = { v: 1, themes, qty, updatedAt: new Date().toISOString() };
    setExtra('plants', state);
  }, [themes, qty]);

  function toggleTheme(id: ThemeId) {
    setThemes((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function setPlantQty(id: string, n: number) {
    const v = Math.max(0, Math.round(Number.isFinite(n) ? n : 0));
    setQty((prev) => ({ ...prev, [id]: v }));
  }

  function fillEvenly(bucket: Bucket) {
    const fill = evenSplit(bucket.target, bucket.plants.map((p) => p.id));
    setQty((prev) => {
      const next = { ...prev };
      for (const s of fill) next[s.plantId] = s.qty;
      return next;
    });
  }

  function clearBucket(bucket: Bucket) {
    setQty((prev) => {
      const next = { ...prev };
      for (const p of bucket.plants) next[p.id] = 0;
      return next;
    });
  }

  const allPlants = buckets.flatMap((b) => b.plants);
  const selections = allPlants.filter((p) => (qty[p.id] ?? 0) > 0).map((p) => ({ plantId: p.id, qty: qty[p.id] ?? 0 }));
  const grandTarget = counts.perennial.sun + counts.perennial.shade + counts.shrub.sun + counts.shrub.shade + counts.smallTree + counts.largeTree;
  const grandChosen = selections.reduce((s, x) => s + x.qty, 0);
  const grandCost = selectionCost(selections);

  function downloadCsv() {
    const rows = [[t('csv.common'), t('csv.botanical'), t('csv.type'), t('csv.light'), t('csv.quantity'), t('csv.unitCost'), t('csv.lineCost')]];
    for (const p of allPlants) {
      const q = qty[p.id] ?? 0;
      if (q <= 0) continue;
      rows.push([
        local.get(p.id)?.common ?? p.common,
        p.botanical,
        t(CSV_TYPE[p.type]),
        t(CSV_LIGHT[p.light]),
        String(q),
        (p.unitCost ?? 0).toFixed(2),
        ((p.unitCost ?? 0) * q).toFixed(2),
      ]);
    }
    rows.push([t('csv.total'), '', '', '', String(grandChosen), '', grandCost.toFixed(2)]);
    const csv = rows.map((r) => r.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = t('picker.csvFile');
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div class="plant-picker">
      <div class="pp-setup no-print">
        <div class="pp-themes">
          <span class="pp-label">{t('picker.themes', { count: themes.length > 1 ? themes.length : 1 })}</span>
          <div class="pp-theme-chips">
            {THEME_ORDER.map((id) => {
              const meta = themeNames[id];
              const on = themes.includes(id);
              return (
                <button
                  type="button"
                  class="pp-chip"
                  aria-pressed={on}
                  style={{ '--chip-color': meta.frame } as any}
                  onClick={() => toggleTheme(id)}
                >
                  <span class="pp-swatch" aria-hidden="true"></span>
                  {meta.name}
                </button>
              );
            })}
          </div>
          <p class="field-hint">{t('picker.mixHint')}</p>
        </div>

        <div class="pp-counts">
          {tally && (
            <label class="pp-source-toggle">
              <input type="checkbox" checked={!useManual} onChange={(e) => setUseManual(!(e.currentTarget as HTMLInputElement).checked)} />
              {t('picker.useDesign')}
            </label>
          )}
          {fromDesign ? (
            <p class="field-auto" style={{ marginTop: '0.4em' }}>
              {t(anyTyped ? 'picker.fromDesignTyped' : 'picker.fromDesign', {
                summary: t('picker.summary', {
                  perennials: n(counts.perennial.sun + counts.perennial.shade),
                  per: n(PLANTS_PER_SQUARE),
                  shrubs: n(counts.shrub.sun + counts.shrub.shade),
                  small: n(counts.smallTree),
                  large: n(counts.largeTree),
                }),
              })}
            </p>
          ) : (
            <div class="pp-manual-grid">
              {COUNT_FIELDS.map((f) => (
                <label key={f.key}>
                  {t(f.label)}
                  <input
                    type="number"
                    min="0"
                    value={values[f.key]}
                    onInput={(e) => {
                      const raw = (e.currentTarget as HTMLInputElement).value;
                      const n = Number(raw);
                      setField(f.id, raw.trim() === '' || !Number.isFinite(n) ? null : n);
                    }}
                  />
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {themes.length === 0 ? (
        <p class="muted">{t('picker.chooseTheme')}</p>
      ) : (
        <>
          {buckets.map((bucket) => {
            const chosen = bucket.plants.reduce((s, p) => s + (qty[p.id] ?? 0), 0);
            const ok = chosen === bucket.target;
            return (
              <section class="pp-bucket" key={bucket.key}>
                <header class="pp-bucket-head">
                  <h3>{bucket.label}</h3>
                  <div class="pp-bucket-tally">
                    <span class={ok ? 'pp-match ok' : 'pp-match'}>{t('picker.planned', { chosen: n(chosen), count: n(bucket.target) })}</span>
                    <div class="no-print pp-bucket-actions">
                      <button type="button" class="btn btn-small" onClick={() => fillEvenly(bucket)}>
                        {t('picker.fillEvenly')}
                      </button>
                      <button type="button" class="btn btn-small" onClick={() => clearBucket(bucket)}>
                        {t('picker.clear')}
                      </button>
                    </div>
                  </div>
                </header>
                <div class="pp-cards">
                  {bucket.plants.map((plant) => {
                    const p = local.get(plant.id) ?? plant;
                    return (
                    <article class="pp-card" key={p.id}>
                      <div class="pp-photo">
                        {p.photo ? <img src={u(p.photo)} alt={t('photo.alt', { common: p.common, botanical: p.botanical })} loading="lazy" /> : <span class="pp-photo-none" aria-hidden="true" />}
                      </div>
                      <div class="pp-card-body">
                        <p class="pp-common">{p.common}</p>
                        <p class="pp-botanical">{p.botanical}</p>
                        <p class="pp-meta">
                          {p.matureSize && t('picker.mature', { size: p.matureSize })}
                          {p.containerSize && ` · ${t('picker.atPurchase', { size: potSize(p.containerSize, t) })}`}
                        </p>
                        {p.notes && <p class="pp-notes">{p.notes}</p>}
                        <p class="pp-cost">{t('picker.each', { price: usd(p.unitCost ?? 0) })}</p>
                      </div>
                      <div class="pp-qty no-print">
                        <label class="visually-hidden" for={`qty-${p.id}`}>
                          {t('picker.howMany', { name: p.common })}
                        </label>
                        <input
                          id={`qty-${p.id}`}
                          type="number"
                          min="0"
                          value={qty[p.id] ?? 0}
                          onInput={(e) => setPlantQty(p.id, Number((e.currentTarget as HTMLInputElement).value))}
                        />
                      </div>
                      <div class="pp-qty-print print-only">{qty[p.id] ?? 0}×</div>
                    </article>
                    );
                  })}
                </div>
              </section>
            );
          })}

          <div class="pp-grand">
            <div dangerouslySetInnerHTML={{ __html: t.html('picker.picked', { chosen: n(grandChosen), count: n(grandTarget) }) }} />
            <div class="pp-grand-cost" dangerouslySetInnerHTML={{ __html: t.html('picker.cost', { cost: usd(grandCost) }) }} />
            <div class="no-print pp-grand-actions">
              <button type="button" class="btn" onClick={() => window.print()}>
                {t('picker.print')}
              </button>
              <button type="button" class="btn btn-primary" onClick={downloadCsv}>
                {t('picker.csv')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

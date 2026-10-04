/** @jsxImportSource preact */
// The Dream workbook's plant-list calculator + picker. Reads plant targets
// from the planner's DesignTally (project.extra.tally) when there is one
// ("from your design"), or lets the person type the same six numbers the
// workbook's own "Count your plants" page asks for. Choosing WHICH species
// and how many of each is left to the person, same as the spreadsheets
// (see src/data/plants.ts for the calculator this ports and why).
import { useEffect, useMemo, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { $project, setExtra } from '../../lib/project';
import { u } from '../../lib/url';
import type { DesignTally, ThemeId } from '../../lib/types';
import { THEME_ORDER, THEMES } from '../../data/themes';
import {
  evenSplit,
  plantCounts,
  plantsForBucket,
  plantsForType,
  selectionCost,
  type Plant,
  type PlantPickerState,
  type PlantTargets,
} from '../../data/plants';

interface Props {
  theme?: ThemeId | ThemeId[];
}

type BucketLight = 'sun' | 'shade';
interface Bucket {
  key: string;
  label: string;
  light: BucketLight | 'both';
  plants: Plant[];
  target: number;
}

function themeList(t?: ThemeId | ThemeId[]): ThemeId[] {
  if (!t) return [];
  return Array.isArray(t) ? t : [t];
}

function buildBuckets(themes: ThemeId[], counts: PlantTargets): Bucket[] {
  const defs: { key: string; label: string; light: BucketLight | 'both'; plants: Plant[]; target: number }[] = [
    { key: 'perennial-sun', label: 'Perennials — sun', light: 'sun', plants: plantsForBucket(themes, 'perennial', 'sun'), target: counts.perennial.sun },
    { key: 'perennial-shade', label: 'Perennials — shade', light: 'shade', plants: plantsForBucket(themes, 'perennial', 'shade'), target: counts.perennial.shade },
    { key: 'shrub-sun', label: 'Shrubs — sun', light: 'sun', plants: plantsForBucket(themes, 'shrub', 'sun'), target: counts.shrub.sun },
    { key: 'shrub-shade', label: 'Shrubs — shade', light: 'shade', plants: plantsForBucket(themes, 'shrub', 'shade'), target: counts.shrub.shade },
    { key: 'small-tree', label: 'Small trees', light: 'both', plants: plantsForType(themes, 'small-tree'), target: counts.smallTree },
    { key: 'large-tree', label: 'Large trees', light: 'both', plants: plantsForType(themes, 'large-tree'), target: counts.largeTree },
  ];
  return defs.filter((b) => b.plants.length > 0);
}

function csvEscape(s: string | number): string {
  const v = String(s);
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export default function PlantPickerIsland({ theme }: Props) {
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
  const [manual, setManual] = useState({ squareSun: 0, squareShade: 0, shrubSun: 0, shrubShade: 0, smallTree: 0, largeTree: 0 });
  const [useManual, setUseManual] = useState(!tally);

  const fromDesign = Boolean(tally) && !useManual;

  const counts = useMemo<PlantTargets>(() => {
    const t = fromDesign && tally
      ? tally
      : {
          plantingSquares: { sun: manual.squareSun, shade: manual.squareShade },
          shrubs: { sun: manual.shrubSun, shade: manual.shrubShade },
          smallTrees: manual.smallTree,
          largeTrees: manual.largeTree,
        };
    return plantCounts(t);
  }, [fromDesign, tally, manual]);

  const buckets = useMemo(() => buildBuckets(themes, counts), [themes, counts]);

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
    const rows = [['Common name', 'Botanical name', 'Type', 'Light', 'Quantity', 'Unit cost', 'Line cost']];
    for (const p of allPlants) {
      const q = qty[p.id] ?? 0;
      if (q <= 0) continue;
      rows.push([p.common, p.botanical, p.type, p.light, String(q), (p.unitCost ?? 0).toFixed(2), ((p.unitCost ?? 0) * q).toFixed(2)]);
    }
    rows.push(['TOTAL', '', '', '', String(grandChosen), '', grandCost.toFixed(2)]);
    const csv = rows.map((r) => r.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'park-in-a-truck-plant-list.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div class="plant-picker">
      <div class="pp-setup no-print">
        <div class="pp-themes">
          <span class="pp-label">Theme{themes.length > 1 ? 's' : ''}</span>
          <div class="pp-theme-chips">
            {THEME_ORDER.map((id) => {
              const meta = THEMES[id];
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
          <p class="field-hint">
            Mixing two themes? The Dream workbook says that's fine — pick plants from both lists.
          </p>
        </div>

        <div class="pp-counts">
          {tally && (
            <label class="pp-source-toggle">
              <input type="checkbox" checked={!useManual} onChange={(e) => setUseManual(!(e.currentTarget as HTMLInputElement).checked)} />
              Use the counts from your design
            </label>
          )}
          {fromDesign ? (
            <p class="field-auto" style={{ marginTop: '0.4em' }}>
              ✓ Filled in from your design — {counts.perennial.sun + counts.perennial.shade} perennials,{' '}
              {counts.shrub.sun + counts.shrub.shade} shrubs, {counts.smallTree} small trees, {counts.largeTree} large trees
            </p>
          ) : (
            <div class="pp-manual-grid">
              <label>
                Green squares — sun
                <input type="number" min="0" value={manual.squareSun} onInput={(e) => setManual((prev) => ({ ...prev, squareSun: Number((e.currentTarget as HTMLInputElement).value) }))} />
              </label>
              <label>
                Green squares — shade
                <input type="number" min="0" value={manual.squareShade} onInput={(e) => setManual((prev) => ({ ...prev, squareShade: Number((e.currentTarget as HTMLInputElement).value) }))} />
              </label>
              <label>
                Shrubs — sun
                <input type="number" min="0" value={manual.shrubSun} onInput={(e) => setManual((prev) => ({ ...prev, shrubSun: Number((e.currentTarget as HTMLInputElement).value) }))} />
              </label>
              <label>
                Shrubs — shade
                <input type="number" min="0" value={manual.shrubShade} onInput={(e) => setManual((prev) => ({ ...prev, shrubShade: Number((e.currentTarget as HTMLInputElement).value) }))} />
              </label>
              <label>
                Small trees
                <input type="number" min="0" value={manual.smallTree} onInput={(e) => setManual((prev) => ({ ...prev, smallTree: Number((e.currentTarget as HTMLInputElement).value) }))} />
              </label>
              <label>
                Large trees
                <input type="number" min="0" value={manual.largeTree} onInput={(e) => setManual((prev) => ({ ...prev, largeTree: Number((e.currentTarget as HTMLInputElement).value) }))} />
              </label>
            </div>
          )}
        </div>
      </div>

      {themes.length === 0 ? (
        <p class="muted">Choose a theme above to see its plant list.</p>
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
                    <span class={ok ? 'pp-match ok' : 'pp-match'}>
                      {chosen} of {bucket.target} planned
                    </span>
                    <div class="no-print pp-bucket-actions">
                      <button type="button" class="btn btn-small" onClick={() => fillEvenly(bucket)}>
                        Fill evenly
                      </button>
                      <button type="button" class="btn btn-small" onClick={() => clearBucket(bucket)}>
                        Clear
                      </button>
                    </div>
                  </div>
                </header>
                <div class="pp-cards">
                  {bucket.plants.map((p) => (
                    <article class="pp-card" key={p.id}>
                      <div class="pp-photo">
                        {p.photo ? <img src={u(p.photo)} alt={`${p.common} (${p.botanical})`} loading="lazy" /> : <span class="pp-photo-none" aria-hidden="true" />}
                      </div>
                      <div class="pp-card-body">
                        <p class="pp-common">{p.common}</p>
                        <p class="pp-botanical">{p.botanical}</p>
                        <p class="pp-meta">
                          {p.matureSize && <>Mature: {p.matureSize}</>}
                          {p.containerSize && <> · At purchase: {p.containerSize}</>}
                        </p>
                        {p.notes && <p class="pp-notes">{p.notes}</p>}
                        <p class="pp-cost">${(p.unitCost ?? 0).toFixed(2)} each</p>
                      </div>
                      <div class="pp-qty no-print">
                        <label class="visually-hidden" for={`qty-${p.id}`}>
                          How many {p.common}?
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
                  ))}
                </div>
              </section>
            );
          })}

          <div class="pp-grand">
            <div>
              <strong>{grandChosen}</strong> of <strong>{grandTarget}</strong> plants picked
            </div>
            <div class="pp-grand-cost">Estimated cost: <strong>${grandCost.toFixed(2)}</strong></div>
            <div class="no-print pp-grand-actions">
              <button type="button" class="btn" onClick={() => window.print()}>
                Print shopping list
              </button>
              <button type="button" class="btn btn-primary" onClick={downloadCsv}>
                Download CSV
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

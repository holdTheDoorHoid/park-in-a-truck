/** @jsxImportSource preact */
import { useStore } from '@nanostores/preact';
import type { PlannerStore } from '../../lib/planner/store';
import type { ExistingItem } from '../../lib/types';
import { EXISTING, existingMeta } from '../../lib/planner/catalog';
import { addExisting, deleteExisting, treesKept, updateExisting } from '../../lib/planner/design';
import { siteToLocal } from '../../lib/planner/rect';
import { rotateSelected } from './keyboard';

function label(e: ExistingItem) {
  const m = existingMeta(e.element);
  if (e.element === 'existing-tree' && e.species) return `${e.species}${e.dbhIn ? ` (${e.dbhIn}" trunk)` : ''}`;
  return m.name;
}

export function ExistingPanel({ store, compact = false }: { store: PlannerStore; compact?: boolean }) {
  const site = useStore(store.$site);
  const d = useStore(store.$design);
  const sel = useStore(store.$selection);
  if (!site || !d) return null;
  const items = d.existing ?? [];
  const selected = sel?.kind === 'existing' ? items.find((e) => e.id === sel.id) : undefined;
  const cityNear = site.trees.filter((t) => !t.onLot).length;

  const add = (element: string) => {
    const f = site.frame;
    const n = items.length;
    // start in the middle of the lot, a little apart from the last one
    const p = siteToLocal(f, [f.lengthFt / 2 + ((n % 3) - 1) * 3, f.widthFt / 2 + ((Math.floor(n / 3) % 3) - 1) * 2]);
    const ll = site.lf.toLngLat(p);
    const r = addExisting(d, element, [Number(ll[0].toFixed(7)), Number(ll[1].toFixed(7))]);
    store.commit(r.design);
    store.$selection.set({ kind: 'existing', id: r.id });
  };
  const patch = (id: string, p: Partial<ExistingItem>, coalesce?: string) => store.commit(updateExisting(d, id, p), coalesce);

  return (
    <section class={`pl-section${compact ? ' pl-compact' : ''}`}>
      <h3 class="pl-h">{compact ? 'Already on the lot' : "What's on the lot now"}</h3>
      <p class="pl-small">
        Mark what's already there: trees, a neighbor's downspout, spots that get wet, hydrants, poles and wires, old pavement.
        {cityNear ? ` The ${cityNear} street tree${cityNear > 1 ? 's' : ''} nearby come from the City's tree inventory.` : ''} Add a thing, then drag it to
        where it really is.
      </p>
      <div class="pl-chips">
        {EXISTING.map((m) => (
          <button type="button" class="pl-chip" onClick={() => add(m.id)}>
            + {m.name}
          </button>
        ))}
      </div>

      {selected && (
        <div class="pl-card pl-selected">
          <h4 class="pl-h4">{label(selected)}</h4>
          <p class="pl-small muted">{existingMeta(selected.element).hint}</p>
          {selected.element === 'existing-tree' && (
            <>
              <label class="pl-field">
                <span class="pl-small">Branches spread {Math.round((selected.radiusFt ?? 8) * 2)} ft across</span>
                <input
                  type="range"
                  min={2}
                  max={30}
                  step={1}
                  value={selected.radiusFt ?? 8}
                  onInput={(e) => patch(selected.id, { radiusFt: Number((e.target as HTMLInputElement).value) }, `radiusFt:${selected.id}`)}
                />
              </label>
            </>
          )}
          {selected.element === 'wet-area' && (
            <label class="pl-field">
              <span class="pl-small">About {Math.round((selected.radiusFt ?? 5) * 2)} ft across</span>
              <input type="range" min={1} max={20} step={0.5} value={selected.radiusFt ?? 5} onInput={(e) => patch(selected.id, { radiusFt: Number((e.target as HTMLInputElement).value) }, `radiusFt:${selected.id}`)} />
            </label>
          )}
          {(selected.element === 'utility-line' || selected.element === 'old-pavement') && (
            <label class="pl-field">
              <span class="pl-small">{Math.round(selected.lengthFt ?? 10)} ft long</span>
              <input type="range" min={2} max={120} step={1} value={selected.lengthFt ?? 10} onInput={(e) => patch(selected.id, { lengthFt: Number((e.target as HTMLInputElement).value) }, `lengthFt:${selected.id}`)} />
            </label>
          )}
          {selected.element === 'old-pavement' && (
            <label class="pl-field">
              <span class="pl-small">{Math.round(selected.widthFt ?? 8)} ft wide</span>
              <input type="range" min={1} max={60} step={1} value={selected.widthFt ?? 8} onInput={(e) => patch(selected.id, { widthFt: Number((e.target as HTMLInputElement).value) }, `widthFt:${selected.id}`)} />
            </label>
          )}
          <div class="pl-row">
            {(selected.element === 'utility-line' || selected.element === 'old-pavement' || selected.element === 'utility-pole') && (
              <>
                <button type="button" class="btn btn-small" onClick={() => rotateSelected(store, 15)}>
                  ↻ Turn 15°
                </button>
                <button type="button" class="btn btn-small" onClick={() => rotateSelected(store, 90)}>
                  ↻ 90°
                </button>
              </>
            )}
            {selected.origin !== 'city' && (
              <button
                type="button"
                class="btn btn-small pl-danger"
                onClick={() => {
                  store.commit(deleteExisting(d, selected.id));
                  store.$selection.set(null);
                }}
              >
                Take off the map
              </button>
            )}
          </div>
        </div>
      )}

      {items.length > 0 && (
        <ul class="pl-list">
          {items.map((e) => (
            <li class={sel?.id === e.id ? 'is-selected' : undefined}>
              <button type="button" class="pl-link" onClick={() => store.$selection.set({ kind: 'existing', id: e.id })}>
                {label(e)}
              </button>
              {e.origin === 'city' && <span class="pl-tag">City record</span>}
              {e.element === 'existing-tree' && (
                <span class="pl-keep" role="group" aria-label={`Keep or remove ${label(e)}`}>
                  <button type="button" aria-pressed={e.keep !== false} onClick={() => patch(e.id, { keep: true })}>
                    Keep
                  </button>
                  <button type="button" aria-pressed={e.keep === false} onClick={() => patch(e.id, { keep: false })}>
                    Remove
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      <p class="pl-small muted">
        Trees you're keeping: <strong>{treesKept(d)}</strong>. Kept trees shade the lot in the sun study.
      </p>
    </section>
  );
}

/** @jsxImportSource preact */
import { useStore } from '@nanostores/preact';
import type { PlannerStore } from '../../lib/planner/store';
import type { ExistingItem } from '../../lib/types';
import { existingList, existingMeta } from '../../lib/planner/catalog';
import { addExisting, deleteExisting, treesKept, updateExisting } from '../../lib/planner/design';
import { siteToLocal } from '../../lib/planner/rect';
import { rotateSelected } from './keyboard';
import { SlopeCard } from './SlopeCard';
import { TreeHabitChoice } from './TreeHabitChoice';
import { isolate, pt } from '../../lib/planner/words';

/** A City tree by its species (as the City lists it) and trunk width; anything else by what it is. */
function label(e: Pick<ExistingItem, 'element' | 'species' | 'dbhIn'>): string {
  const t = pt();
  if (e.element === 'existing-tree' && e.species) return e.dbhIn ? t('existing.treeSpecies', { species: isolate(e.species, t), dbh: e.dbhIn }) : isolate(e.species, t);
  return existingMeta(e.element).name;
}

export function ExistingPanel({ store, compact = false }: { store: PlannerStore; compact?: boolean }) {
  const site = useStore(store.$site);
  const d = useStore(store.$design);
  const sel = useStore(store.$selection);
  const drawing = useStore(store.$drawing);
  if (!site || !d) return null;
  const t = pt();
  const items = d.existing ?? [];
  const selected = sel?.kind === 'existing' ? items.find((e) => e.id === sel.id) : undefined;
  const cityNear = site.trees.filter((tr) => !tr.onLot).length;

  // terrain: a wet area is drawn as an outline on the map, point by point
  const draw = (replaceId?: string) => {
    store.$selection.set(null);
    store.$view.set('plan');
    store.$drawing.set(replaceId ? { replaceId } : {});
  };

  const add = (element: string) => {
    if (element === 'wet-area' && store.editable) {
      draw();
      return;
    }
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
      <h3 class="pl-h">{t(compact ? 'existing.titleCompact' : 'existing.title')}</h3>
      <p class="pl-small">
        {[t('existing.intro'), cityNear ? t('existing.cityTrees', { count: cityNear }) : '', t('existing.intro2')].filter(Boolean).join(' ')}
      </p>
      <SlopeCard store={store} compact={compact} />
      <div class="pl-chips">
        {existingList().map((m) => (
          <button type="button" class="pl-chip" onClick={() => add(m.id)} aria-pressed={m.id === 'wet-area' && drawing ? true : undefined}>
            {t('common.add', { name: m.name })}
          </button>
        ))}
      </div>
      {drawing && (
        <div class="pl-card pl-selected pl-drawing" role="status">
          <h4 class="pl-h4">{t(drawing.replaceId ? 'existing.redrawTitle' : 'existing.drawTitle')}</h4>
          <p class="pl-small">{t('existing.drawHelp')}</p>
          <div class="pl-row">
            <button type="button" class="btn btn-small" onClick={() => store.$drawing.set(null)}>
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {selected && (
        <div class="pl-card pl-selected">
          <h4 class="pl-h4">{label(selected)}</h4>
          <p class="pl-small muted">{existingMeta(selected.element).hint}</p>
          {selected.element === 'existing-tree' && (
            <>
              <label class="pl-field">
                <span class="pl-small">{t('existing.spread', { ft: Math.round((selected.radiusFt ?? 8) * 2) })}</span>
                <input
                  type="range"
                  min={2}
                  max={30}
                  step={1}
                  value={selected.radiusFt ?? 8}
                  onInput={(e) => patch(selected.id, { radiusFt: Number((e.target as HTMLInputElement).value) }, `radiusFt:${selected.id}`)}
                />
              </label>
              {/* shadows workstream: evergreen trees shade the lot all winter */}
              <TreeHabitChoice store={store} item={selected} />
            </>
          )}
          {selected.element === 'wet-area' && selected.outline && selected.outline.length >= 3 && (
            <>
              <p class="pl-small">{t('existing.wetSize', { area: Math.round(Math.PI * (selected.radiusFt ?? 5) ** 2) })}</p>
              {store.editable && (
                <div class="pl-row">
                  <button type="button" class="btn btn-small" onClick={() => draw(selected.id)}>
                    {t('existing.redraw')}
                  </button>
                </div>
              )}
            </>
          )}
          {selected.element === 'wet-area' && !(selected.outline && selected.outline.length >= 3) && (
            <>
              {/* older saves: a circle */}
              <label class="pl-field">
                <span class="pl-small">{t('existing.across', { ft: Math.round((selected.radiusFt ?? 5) * 2) })}</span>
                <input type="range" min={1} max={20} step={0.5} value={selected.radiusFt ?? 5} onInput={(e) => patch(selected.id, { radiusFt: Number((e.target as HTMLInputElement).value) }, `radiusFt:${selected.id}`)} />
              </label>
              {store.editable && (
                <div class="pl-row">
                  <button type="button" class="btn btn-small" onClick={() => draw(selected.id)}>
                    {t('existing.drawInstead')}
                  </button>
                </div>
              )}
            </>
          )}
          {(selected.element === 'utility-line' || selected.element === 'old-pavement') && (
            <label class="pl-field">
              <span class="pl-small">{t('existing.long', { ft: Math.round(selected.lengthFt ?? 10) })}</span>
              <input type="range" min={2} max={120} step={1} value={selected.lengthFt ?? 10} onInput={(e) => patch(selected.id, { lengthFt: Number((e.target as HTMLInputElement).value) }, `lengthFt:${selected.id}`)} />
            </label>
          )}
          {selected.element === 'old-pavement' && (
            <label class="pl-field">
              <span class="pl-small">{t('existing.wide', { ft: Math.round(selected.widthFt ?? 8) })}</span>
              <input type="range" min={1} max={60} step={1} value={selected.widthFt ?? 8} onInput={(e) => patch(selected.id, { widthFt: Number((e.target as HTMLInputElement).value) }, `widthFt:${selected.id}`)} />
            </label>
          )}
          <div class="pl-row">
            {(selected.element === 'utility-line' || selected.element === 'old-pavement' || selected.element === 'utility-pole') && (
              <>
                <button type="button" class="btn btn-small" onClick={() => rotateSelected(store, 15)}>
                  {t('existing.turn15')}
                </button>
                <button type="button" class="btn btn-small" onClick={() => rotateSelected(store, 90)}>
                  {t('existing.turn90')}
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
                {t('existing.takeOff')}
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
              {e.origin === 'city' && <span class="pl-tag">{t('existing.cityRecord')}</span>}
              {e.element === 'existing-tree' && (
                <span class="pl-keep" role="group" aria-label={t('existing.keepGroup', { name: label(e) })}>
                  <button type="button" aria-pressed={e.keep !== false} onClick={() => patch(e.id, { keep: true })}>
                    {t('existing.keep')}
                  </button>
                  <button type="button" aria-pressed={e.keep === false} onClick={() => patch(e.id, { keep: false })}>
                    {t('existing.remove')}
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      <p class="pl-small muted" dangerouslySetInnerHTML={{ __html: t.html('existing.kept', { count: treesKept(d) }) }} />
    </section>
  );
}

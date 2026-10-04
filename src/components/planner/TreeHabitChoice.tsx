/** @jsxImportSource preact */
// For a tree on the lot: does it lose its leaves in winter? (shadows workstream, 2026-10-04)
// City trees start from their species name; trees added by hand start as deciduous.
import type { PlannerStore } from '../../lib/planner/store';
import type { ExistingItem } from '../../lib/types';
import { updateExisting } from '../../lib/planner/design';
import { existingTreeLook } from '../../lib/planner/treemodel';
import { pt } from '../../lib/planner/words';

export function TreeHabitChoice({ store, item }: { store: PlannerStore; item: ExistingItem }) {
  const t = pt();
  const evergreen = existingTreeLook(item).evergreen;
  const pick = (leafHabit: 'deciduous' | 'evergreen') => {
    const d = store.$design.get();
    if (d && leafHabit !== (evergreen ? 'evergreen' : 'deciduous')) store.commit(updateExisting(d, item.id, { leafHabit }));
  };
  return (
    <fieldset class="pl-fieldset pl-habit">
      <legend>{t('tree.winter')}</legend>
      <span class="pl-keep" role="group">
        <button type="button" aria-pressed={!evergreen} onClick={() => pick('deciduous')}>
          {t('tree.deciduous')}
        </button>
        <button type="button" aria-pressed={evergreen} onClick={() => pick('evergreen')}>
          {t('tree.evergreen')}
        </button>
      </span>
    </fieldset>
  );
}

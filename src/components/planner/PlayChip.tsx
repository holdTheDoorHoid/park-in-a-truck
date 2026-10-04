/** @jsxImportSource preact */
// Over the 3D view while the day or the year plays: the date and time, big enough to
// follow (shadows workstream, 2026-10-04). The sun panel has the same facts for screen
// readers, so this one is hidden from them.
import { useStore } from '@nanostores/preact';
import type { PlannerStore } from '../../lib/planner/store';
import { MONTHS } from '../../lib/planner/sunperiod';
import { leafWords } from '../../lib/planner/treemodel';
import { clock } from './SunPanel';

export function PlayChip({ store }: { store: PlannerStore }) {
  const play = useStore(store.sun.$play);
  const t = useStore(store.$sunTime);
  if (play.mode === 'off') return null;
  return (
    <div class="pl-playchip" aria-hidden="true">
      <strong>{play.mode === 'year' ? MONTHS[t.month - 1] : `${MONTHS[t.month - 1]} ${t.day}`}</strong>
      <span>{play.mode === 'year' ? `${t.day} · ${clock(t.minutes)}` : clock(t.minutes)}</span>
      <span class="pl-playchip-leaf">{leafWords(t.month, t.day).replace(/ \(.*\)$/, '')}</span>
    </div>
  );
}

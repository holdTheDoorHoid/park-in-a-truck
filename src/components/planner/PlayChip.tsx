/** @jsxImportSource preact */
// Over the 3D view while the day or the year plays: the date and time, big enough to
// follow (shadows workstream, 2026-10-04). The sun panel has the same facts for screen
// readers, so this one is hidden from them.
import { useStore } from '@nanostores/preact';
import type { PlannerStore } from '../../lib/planner/store';
import { clock, leafWords, monthDay, monthName, pt } from '../../lib/planner/words';

export function PlayChip({ store }: { store: PlannerStore }) {
  const play = useStore(store.sun.$play);
  const t = useStore(store.$sunTime);
  if (play.mode === 'off') return null;
  const w = pt();
  return (
    <div class="pl-playchip" aria-hidden="true">
      <strong>{play.mode === 'year' ? monthName(t.month, w) : monthDay(t.month, t.day, w)}</strong>
      <span>{play.mode === 'year' ? `${w.num(t.day)} · ${clock(t.minutes, w)}` : clock(t.minutes, w)}</span>
      <span class="pl-playchip-leaf">{leafWords(t.month, t.day, w, true)}</span>
    </div>
  );
}

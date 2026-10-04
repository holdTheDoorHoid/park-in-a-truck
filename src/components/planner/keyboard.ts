// Keyboard: arrows move the selected thing (by the snap step), R turns it, Delete removes
// it, Ctrl/Cmd+Z undoes, Ctrl+Shift+Z / Ctrl+Y redoes, Esc deselects, P switches 3D/plan.
// Only while focus is inside the planner and not in a text field.

import type { PlannerStore } from '../../lib/planner/store';
import { deleteExisting, moveItem, removeItem, updateExisting } from '../../lib/planner/design';

export function nudgeSelected(store: PlannerStore, dx: number, dy: number) {
  const sel = store.$selection.get();
  const d = store.$design.get();
  const site = store.$site.get();
  if (!sel || !d || !site) return;
  if (sel.kind === 'item') {
    const it = store.$layout.get()?.items.find((x) => x.id === sel.id);
    if (it) store.commit(moveItem(d, it.id, it.x + dx, it.y + dy, it.rotationDeg));
  } else {
    const e = d.existing?.find((x) => x.id === sel.id);
    if (!e?.lngLat) return;
    // existing things move in the lot's frame (x along the lot, y across it)
    const [x, y] = site.lf.toLocal(e.lngLat);
    const f = site.frame;
    const p: [number, number] = [x + dx * f.u[0] + dy * f.v[0], y + dx * f.u[1] + dy * f.v[1]];
    const ll = site.lf.toLngLat(p);
    store.commit(updateExisting(d, e.id, { lngLat: [Number(ll[0].toFixed(7)), Number(ll[1].toFixed(7))] }));
  }
}

export function rotateSelected(store: PlannerStore, by = 90) {
  const sel = store.$selection.get();
  const d = store.$design.get();
  if (!sel || !d) return;
  if (sel.kind === 'item') {
    const it = store.$layout.get()?.items.find((x) => x.id === sel.id);
    if (it) store.commit(moveItem(d, it.id, it.x, it.y, (((it.rotationDeg + by) % 360) + 360) % 360));
  } else {
    const e = d.existing?.find((x) => x.id === sel.id);
    if (e) store.commit(updateExisting(d, e.id, { rotationDeg: (((e.rotationDeg ?? 0) + by) % 360 + 360) % 360 }));
  }
}

export function deleteSelected(store: PlannerStore) {
  const sel = store.$selection.get();
  const d = store.$design.get();
  if (!sel || !d) return;
  store.commit(sel.kind === 'item' ? removeItem(d, sel.id) : deleteExisting(d, sel.id));
  store.$selection.set(null);
}

/** keydown handler for the planner root (attached with onKeyDown, so it follows re-renders). */
export function keyHandler(store: PlannerStore, step: string) {
  return (e: KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest('input, textarea, select, [contenteditable]') && !(t as HTMLInputElement).type?.match(/checkbox|radio|button/)) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) store.redo();
      else store.undo();
      return;
    }
    if (mod && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      store.redo();
      return;
    }
    if (mod || e.altKey) return;
    const sel = store.$selection.get();
    const s = store.$snap.get();
    const canEdit = sel && (sel.kind === 'item' ? step === 'arrange' || step === 'size' : step === 'existing' || step === 'lot');
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'ArrowUp':
      case 'ArrowDown': {
        if (!canEdit) return;
        e.preventDefault();
        const k = e.shiftKey ? 4 : s;
        const dx = e.key === 'ArrowLeft' ? -k : e.key === 'ArrowRight' ? k : 0;
        const dy = e.key === 'ArrowDown' ? -k : e.key === 'ArrowUp' ? k : 0;
        nudgeSelected(store, dx, dy);
        break;
      }
      case 'r':
      case 'R':
        if (!canEdit) return;
        e.preventDefault();
        rotateSelected(store, e.shiftKey ? -90 : 90);
        break;
      case 'Delete':
      case 'Backspace':
        if (!canEdit) return;
        e.preventDefault();
        deleteSelected(store);
        break;
      case 'Escape':
        store.$selection.set(null);
        break;
      case 'p':
      case 'P':
        store.$view.set(store.$view.get() === 'plan' ? '3d' : 'plan');
        break;
    }
  };
}

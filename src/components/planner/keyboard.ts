// Keyboard: arrows move the selected thing (by the snap step), R turns it, Ctrl/Cmd+D
// duplicates it, Delete removes it, Ctrl/Cmd+Z undoes, Ctrl+Shift+Z / Ctrl+Y redoes, Esc
// deselects, P switches 3D/plan. While focus is anywhere in the planner (or nowhere, right
// after using it) and not in a text field; on the "pick from the list" box the arrows keep
// going through the list. The same actions back the buttons and the right-click menu.

import type { PlannerStore } from '../../lib/planner/store';
import { deleteExisting, duplicateItem, moveItem, removeItem, updateExisting } from '../../lib/planner/design';
import { duplicatePlacement } from '../../lib/planner/interact';
import { catalogEntry, existingMeta } from '../../lib/planner/catalog';

/** Copy the selected park item and put the copy right next to it (then pick the copy). */
export function duplicateSelected(store: PlannerStore): boolean {
  const sel = store.$selection.get();
  const d = store.$design.get();
  const layout = store.$layout.get();
  if (!store.editable || sel?.kind !== 'item' || !d || !layout) return false;
  const it = layout.items.find((x) => x.id === sel.id);
  if (!it) return false;
  const [x, y] = duplicatePlacement(it, layout.lengthFt, layout.widthFt, layout.items);
  const r = duplicateItem(d, it, x, y);
  store.commit(r.design);
  store.$selection.set({ kind: 'item', id: r.id });
  return true;
}

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
  const name =
    sel.kind === 'item'
      ? catalogEntry(store.$layout.get()?.items.find((x) => x.id === sel.id)?.element ?? '').name
      : existingMeta(d.existing?.find((x) => x.id === sel.id)?.element ?? '').name;
  // the button that did it is about to go: keep keyboard focus in the planner (access F2)
  const was = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
  const root = was?.closest?.('.pl-root') as HTMLElement | null;
  store.commit(sel.kind === 'item' ? removeItem(d, sel.id) : deleteExisting(d, sel.id));
  store.$selection.set(null);
  store.$announce.set('');
  store.$announce.set(`Removed ${name ? name.toLowerCase() : 'it'}. Undo (Ctrl+Z) brings it back.`);
  if (root)
    setTimeout(() => {
      const now = document.activeElement;
      if (now && now !== document.body && root.contains(now)) return;
      const to = root.querySelector<HTMLElement>('[data-pl-after-remove]') ?? root.querySelector<HTMLElement>('.pl-canvas');
      to?.focus({ preventScroll: true });
    }, 0);
}

/** keydown handler for the planner root (attached with onKeyDown, so it follows re-renders). */
export function keyHandler(store: PlannerStore) {
  return (e: KeyboardEvent) => {
    const t = e.target as HTMLElement;
    const mod = e.ctrlKey || e.metaKey;
    if (t.closest?.('input, textarea, select, [contenteditable]') && !(t as HTMLInputElement).type?.match(/checkbox|radio|button/)) {
      // the "pick from the list" box: turn, copy and remove the picked thing from there too
      // (its arrows and letters still go through the list)
      const list = t.matches('select[data-pl-items]') && store.$selection.get()?.kind === 'item';
      const ok = list && !e.altKey && ((!mod && (e.key === 'r' || e.key === 'R' || e.key === 'Delete')) || (mod && e.key.toLowerCase() === 'd'));
      if (!ok) return;
    }
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
    if (mod && e.key.toLowerCase() === 'd') {
      // (and keep the browser from bookmarking the page)
      if (store.$selection.get()?.kind === 'item') {
        e.preventDefault();
        duplicateSelected(store);
      }
      return;
    }
    if (mod || e.altKey) return;
    const sel = store.$selection.get();
    const s = store.$snap.get() || 1;
    // anything you can pick, you can move — on every step (not in the sun-only widget)
    const canEdit = Boolean(sel) && store.editable;
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

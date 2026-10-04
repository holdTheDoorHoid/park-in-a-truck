/** @jsxImportSource preact */
import { useRef } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import type { PlannerStore } from '../../lib/planner/store';
import { catalogEntry, palette } from '../../lib/planner/catalog';
import { addItem, resetTemplate } from '../../lib/planner/design';
import { addPlacement } from '../../lib/planner/interact';
import { deleteSelected, duplicateSelected, nudgeSelected, rotateSelected } from './keyboard';
import { itemWhere, uniqueLabels } from '../../lib/planner/where';

/** A touch screen (no mouse, usually no keyboard): touch wording instead of keys and Shift. */
const touchFirst = () => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

/**
 * Press on a palette item and drag it onto the 3D/plan view: the view shows where it
 * will land, letting go adds it there, Esc (or letting go off the view) cancels. Mouse and
 * pen only — on a touch screen a tap adds it and then you drag it into place.
 */
function startPaletteDrag(store: PlannerStore, e: PointerEvent, element: string, label: string, suppressClick: { current: boolean }) {
  if (e.pointerType === 'touch' || e.button !== 0) return;
  const sx = e.clientX;
  const sy = e.clientY;
  let dragging = false;
  let tag: HTMLElement | null = null;
  const move = (ev: PointerEvent) => {
    if (!dragging) {
      if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
      dragging = true;
      tag = document.createElement('div');
      tag.className = 'pl-drag-tag';
      tag.textContent = `+ ${label}`;
      document.body.appendChild(tag);
      document.documentElement.classList.add('pl-palette-dragging');
    }
    ev.preventDefault();
    const over = store.bridge.viewport?.dropPreview(element, ev.clientX, ev.clientY) ?? false;
    if (tag) {
      tag.classList.toggle('is-over', over);
      tag.textContent = over ? 'Let go to put it here · Esc cancels' : `+ ${label}`;
      // keep the label on screen: flip it to the left of the pointer near the right edge
      const left = ev.clientX + 14 + tag.offsetWidth > window.innerWidth - 8 ? ev.clientX - 14 - tag.offsetWidth : ev.clientX + 14;
      tag.style.transform = `translate(${Math.max(4, left)}px, ${ev.clientY + 12}px)`;
    }
  };
  const finish = (drop: PointerEvent | null) => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', cancel);
    window.removeEventListener('keydown', key, true);
    tag?.remove();
    document.documentElement.classList.remove('pl-palette-dragging');
    if (!dragging) return;
    // a drag is not also a click
    suppressClick.current = true;
    setTimeout(() => (suppressClick.current = false), 0);
    if (drop) store.bridge.viewport?.drop(element, drop.clientX, drop.clientY);
    else store.bridge.viewport?.clearDrop();
  };
  const up = (ev: PointerEvent) => finish(ev);
  const cancel = () => finish(null);
  const key = (ev: KeyboardEvent) => {
    if (ev.key !== 'Escape' || !dragging) return;
    ev.preventDefault();
    ev.stopPropagation();
    finish(null);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', cancel);
  window.addEventListener('keydown', key, true);
}

const SOURCE: Record<string, string> = { frame: 'frame', front: 'front', back: 'back', added: 'added by you' };

export function ArrangePanel({ store }: { store: PlannerStore }) {
  const d = useStore(store.$design);
  const layout = useStore(store.$layout);
  const sel = useStore(store.$selection);
  const snap = useStore(store.$snap);
  const hist = useStore(store.$history);
  const overhang = useStore(store.$overhang);
  const suppressClick = useRef(false);
  if (!d || !layout) return null;
  const item = sel?.kind === 'item' ? layout.items.find((i) => i.id === sel.id) : undefined;
  const step = snap || 1;
  const changes = d.added.length + d.removed.length + Object.keys(d.moved).length;
  const touch = touchFirst();
  // standing at the entrance looking in, the park's y1 side is on your left unless it's flipped
  const where = (i: (typeof layout.items)[number]) => itemWhere(i, layout.widthFt, !d.flipped);

  const add = (element: string) => {
    if (suppressClick.current) return;
    // the middle of the park (beside the last one if that spot is taken), in the theme of the piece it lands in
    const p = addPlacement(layout, element, d.front);
    const r = addItem(d, element, p.x, p.y, p.theme);
    store.commit(r.design);
    store.$selection.set({ kind: 'item', id: r.id });
  };

  return (
    <section class="pl-section">
      <div class="pl-row pl-tools-row">
        <button type="button" class="btn btn-small" disabled={!hist.canUndo} onClick={store.undo} title="Undo (Ctrl+Z)">
          ↶ Undo
        </button>
        <button type="button" class="btn btn-small" disabled={!hist.canRedo} onClick={store.redo} title="Redo (Ctrl+Shift+Z)">
          ↷ Redo
        </button>
        <div class="pl-seg pl-seg-small" role="group" aria-label="Snap to grid">
          <span class="pl-small">Snap</span>
          <button type="button" aria-pressed={snap === 1} onClick={() => store.$snap.set(1)}>
            1 ft
          </button>
          <button type="button" aria-pressed={snap === 4} onClick={() => store.$snap.set(4)}>
            4 ft
          </button>
          <button type="button" aria-pressed={snap === 0} onClick={() => store.$snap.set(0)} title="Move freely, not on the grid">
            Off
          </button>
        </div>
      </div>

      {item ? (
        <div class="pl-card pl-selected">
          <h3 class="pl-h">{catalogEntry(item.element).name}</h3>
          <p class="pl-small muted">
            {Math.round(item.w * 10) / 10} × {Math.round(item.h * 10) / 10} ft · {SOURCE[item.source ?? ''] ?? item.source} · {where(item)}
          </p>
          {overhang?.items.includes(item.id) && <p class="pl-warn">This sticks out past the lot line.</p>}
          <div class="pl-row">
            <div class="pl-pad" role="group" aria-label="Move">
              <button type="button" class="pl-tool" aria-label="Move toward the entrance" onClick={() => nudgeSelected(store, -step, 0)}>
                ←
              </button>
              <button type="button" class="pl-tool" aria-label="Move left" onClick={() => nudgeSelected(store, 0, step)}>
                ↑
              </button>
              <button type="button" class="pl-tool" aria-label="Move right" onClick={() => nudgeSelected(store, 0, -step)}>
                ↓
              </button>
              <button type="button" class="pl-tool" aria-label="Move toward the back" onClick={() => nudgeSelected(store, step, 0)}>
                →
              </button>
            </div>
            <button type="button" class="btn btn-small" onClick={() => rotateSelected(store)}>
              ↻ Turn
            </button>
            <button type="button" class="btn btn-small" onClick={() => duplicateSelected(store)} title="Put a copy right next to it (Ctrl+D)">
              ⧉ Duplicate
            </button>
            <button type="button" class="btn btn-small pl-danger" onClick={() => deleteSelected(store)}>
              Remove
            </button>
          </div>
          {touch ? (
            <p class="pl-small muted">Drag it to move it, or drag the round handle to turn it (it turns a quarter at a time). Hold your finger on it for more.</p>
          ) : (
            <p class="pl-small muted">
              Drag it to move it, or drag the round handle to turn it (it turns in steps; hold Shift to turn freely). Keys: arrows move, R
              turns, Ctrl+D duplicates, Delete removes, Esc lets go.
            </p>
          )}
        </div>
      ) : (
        <p class="pl-small">
          <strong>Drag</strong> anything in the park to move it. {touch ? 'Tap' : 'Click'} it to pick it, then drag its <strong>round handle</strong> to turn it.
          {touch ? ' Hold your finger on it for more.' : ' Right-click it (or hold your finger on it) for more.'} Switch to <em>Plan</em> view to see it like the paper
          pieces.
        </p>
      )}

      <label class="pl-field">
        <span class="pl-small">Or pick from the list</span>
        <select
          data-pl-items=""
          data-pl-after-remove=""
          value={item?.id ?? ''}
          onChange={(e) => {
            const v = (e.target as HTMLSelectElement).value;
            store.$selection.set(v ? { kind: 'item', id: v } : null);
          }}
        >
          <option value="">— nothing picked —</option>
          {(['frame', 'front', 'back', 'added'] as const).map((src) => {
            const its = layout.items.filter((i) => (i.source ?? 'added') === src);
            if (!its.length) return null;
            const labels = uniqueLabels(its.map((i) => `${catalogEntry(i.element).name} — ${where(i)}`));
            return (
              <optgroup label={src === 'added' ? 'Added by you' : `${src[0]!.toUpperCase()}${src.slice(1)} piece`}>
                {its.map((i, k) => (
                  <option value={i.id}>{labels[k]}</option>
                ))}
              </optgroup>
            );
          })}
        </select>
      </label>

      <h3 class="pl-h">Add to your park</h3>
      <p class="pl-small muted">
        {touch ? 'Tap one to add it in the middle of the park, then drag it into place.' : 'Drag one onto the park to put it where you want, or click it to add it in the middle.'}
      </p>
      {palette().map((g, i) => (
        <details class="pl-palette" open={i === 0}>
          <summary>{g.group}</summary>
          <div class="pl-chips">
            {g.items.map((e) => (
              <button
                type="button"
                class="pl-chip pl-chip-drag"
                onClick={() => add(e.id)}
                onPointerDown={(ev) => startPaletteDrag(store, ev as PointerEvent, e.id, e.name, suppressClick)}
              >
                + {e.name} <span class="pl-dim">{e.w} × {e.h} ft</span>
              </button>
            ))}
          </div>
        </details>
      ))}

      <p class="pl-small" style={{ marginTop: '14px' }}>
        {changes ? `${changes} change${changes > 1 ? 's' : ''} from the Park in a Truck design. ` : 'This is the starting Park in a Truck layout. '}
        {changes > 0 && (
          <button
            type="button"
            class="pl-link"
            onClick={() => {
              // no "are you sure?": Undo brings it all back
              store.commit(resetTemplate(d));
              store.$selection.set(null);
            }}
          >
            Start over from the Park in a Truck layout (Undo brings your changes back)
          </button>
        )}
      </p>
    </section>
  );
}

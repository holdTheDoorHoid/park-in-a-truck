/** @jsxImportSource preact */
import { useStore } from '@nanostores/preact';
import type { PlannerStore } from '../../lib/planner/store';
import type { ThemeId } from '../../lib/types';
import { catalogEntry, palette } from '../../lib/planner/catalog';
import { addItem, resetTemplate } from '../../lib/planner/design';
import { deleteSelected, nudgeSelected, rotateSelected } from './keyboard';

const SOURCE: Record<string, string> = { frame: 'frame', front: 'front', back: 'back', added: 'added by you' };

export function ArrangePanel({ store }: { store: PlannerStore }) {
  const d = useStore(store.$design);
  const layout = useStore(store.$layout);
  const sel = useStore(store.$selection);
  const snap = useStore(store.$snap);
  const hist = useStore(store.$history);
  const overhang = useStore(store.$overhang);
  if (!d || !layout) return null;
  const item = sel?.kind === 'item' ? layout.items.find((i) => i.id === sel.id) : undefined;
  const changes = d.added.length + d.removed.length + Object.keys(d.moved).length;

  const add = (element: string) => {
    // drop it in the middle of the park, in the theme of the piece it lands in
    const x = layout.lengthFt / 2;
    const y = layout.widthFt / 2;
    const zone = layout.surfaces.find((s) => {
      const xs = s.polygon.map((p) => p[0]);
      const ys = s.polygon.map((p) => p[1]);
      return x >= Math.min(...xs) && x <= Math.max(...xs) && y >= Math.min(...ys) && y <= Math.max(...ys);
    });
    const theme: ThemeId = (zone?.theme as ThemeId) ?? d.front;
    const r = addItem(d, element, Math.round(x), Math.round(y), theme);
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
        </div>
      </div>

      {item ? (
        <div class="pl-card pl-selected">
          <h3 class="pl-h">{catalogEntry(item.element).name}</h3>
          <p class="pl-small muted">
            {Math.round(item.w * 10) / 10} × {Math.round(item.h * 10) / 10} ft · {SOURCE[item.source ?? ''] ?? item.source} · {Math.round(item.x - item.w / 2)} ft
            from the entrance
          </p>
          {overhang?.items.includes(item.id) && <p class="pl-warn">This sticks out past the lot line.</p>}
          <div class="pl-row">
            <div class="pl-pad" role="group" aria-label="Move">
              <button type="button" class="pl-tool" aria-label="Move toward the entrance" onClick={() => nudgeSelected(store, -snap, 0)}>
                ←
              </button>
              <button type="button" class="pl-tool" aria-label="Move left" onClick={() => nudgeSelected(store, 0, snap)}>
                ↑
              </button>
              <button type="button" class="pl-tool" aria-label="Move right" onClick={() => nudgeSelected(store, 0, -snap)}>
                ↓
              </button>
              <button type="button" class="pl-tool" aria-label="Move toward the back" onClick={() => nudgeSelected(store, snap, 0)}>
                →
              </button>
            </div>
            <button type="button" class="btn btn-small" onClick={() => rotateSelected(store)}>
              ↻ Turn
            </button>
            <button type="button" class="btn btn-small pl-danger" onClick={() => deleteSelected(store)}>
              Remove
            </button>
          </div>
          <p class="pl-small muted">Keys: arrows move, R turns, Delete removes, Esc lets go.</p>
        </div>
      ) : (
        <p class="pl-small">
          <strong>Tap or click</strong> anything in the park to pick it, then <strong>drag</strong> it to move it. Switch to <em>Plan</em> view to
          see it like the paper pieces.
        </p>
      )}

      <label class="pl-field">
        <span class="pl-small">Or pick from the list</span>
        <select
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
            return (
              <optgroup label={src === 'added' ? 'Added by you' : `${src[0]!.toUpperCase()}${src.slice(1)} piece`}>
                {its.map((i) => (
                  <option value={i.id}>
                    {catalogEntry(i.element).name} — {Math.max(0, Math.round(i.x))} ft in
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
      </label>

      <h3 class="pl-h">Add to your park</h3>
      {palette().map((g, i) => (
        <details class="pl-palette" open={i === 0}>
          <summary>{g.group}</summary>
          <div class="pl-chips">
            {g.items.map((e) => (
              <button type="button" class="pl-chip" onClick={() => add(e.id)}>
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

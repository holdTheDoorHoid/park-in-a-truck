/** @jsxImportSource preact */
import { useRef } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import type { PlannerStore } from '../../lib/planner/store';
import { catalogEntry, palette } from '../../lib/planner/catalog';
import { addItem, resetTemplate } from '../../lib/planner/design';
import { addPlacement } from '../../lib/planner/interact';
import { deleteSelected, duplicateSelected, nudgeSelected, rotateSelected } from './keyboard';
import { itemWhere, uniqueLabels } from '../../lib/planner/where';
import { plannerLang, pt, type PlannerKey } from '../../lib/planner/words';

/** A touch screen (no mouse, usually no keyboard): touch wording instead of keys and Shift. */
const touchFirst = () => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

/**
 * Press on a palette item and drag it onto the 3D/plan view: the view shows where it
 * will land, letting go adds it there, Esc (or letting go off the view) cancels. Mouse and
 * pen only — on a touch screen a tap adds it and then you drag it into place.
 */
function startPaletteDrag(store: PlannerStore, e: PointerEvent, element: string, label: string, suppressClick: { current: boolean }) {
  if (e.pointerType === 'touch' || e.button !== 0) return;
  const t = pt();
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
      const ld = plannerLang(t);
      tag.lang = ld.lang;
      tag.dir = ld.dir;
      tag.textContent = t('common.add', { name: label });
      document.body.appendChild(tag);
      document.documentElement.classList.add('pl-palette-dragging');
    }
    ev.preventDefault();
    const over = store.bridge.viewport?.dropPreview(element, ev.clientX, ev.clientY) ?? false;
    if (tag) {
      tag.classList.toggle('is-over', over);
      tag.textContent = over ? t('arrange.dropHere') : t('common.add', { name: label });
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

const SOURCE: Record<string, PlannerKey> = { frame: 'arrange.sourceFrame', front: 'arrange.sourceFront', back: 'arrange.sourceBack', added: 'arrange.sourceAdded' };
const GROUP: Record<'frame' | 'front' | 'back' | 'added', PlannerKey> = {
  frame: 'arrange.groupFrame',
  front: 'arrange.groupFront',
  back: 'arrange.groupBack',
  added: 'arrange.groupAdded',
};

export function ArrangePanel({ store }: { store: PlannerStore }) {
  const d = useStore(store.$design);
  const layout = useStore(store.$layout);
  const sel = useStore(store.$selection);
  const snap = useStore(store.$snap);
  const hist = useStore(store.$history);
  const overhang = useStore(store.$overhang);
  const suppressClick = useRef(false);
  if (!d || !layout) return null;
  const t = pt();
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
        <button type="button" class="btn btn-small" disabled={!hist.canUndo} onClick={store.undo} title={t('arrange.undoTitle')}>
          {t('arrange.undo')}
        </button>
        <button type="button" class="btn btn-small" disabled={!hist.canRedo} onClick={store.redo} title={t('arrange.redoTitle')}>
          {t('arrange.redo')}
        </button>
        <div class="pl-seg pl-seg-small" role="group" aria-label={t('arrange.snapGroup')}>
          <span class="pl-small">{t('arrange.snap')}</span>
          <button type="button" aria-pressed={snap === 1} onClick={() => store.$snap.set(1)}>
            {t('common.ft', { ft: 1 })}
          </button>
          <button type="button" aria-pressed={snap === 4} onClick={() => store.$snap.set(4)}>
            {t('common.ft', { ft: 4 })}
          </button>
          <button type="button" aria-pressed={snap === 0} onClick={() => store.$snap.set(0)} title={t('arrange.snapOffTitle')}>
            {t('arrange.snapOff')}
          </button>
        </div>
      </div>

      {item ? (
        <div class="pl-card pl-selected">
          <h3 class="pl-h">{catalogEntry(item.element).name}</h3>
          <p class="pl-small muted">
            {t('arrange.itemFacts', {
              dims: t('common.dims', { length: Math.round(item.w * 10) / 10, width: Math.round(item.h * 10) / 10 }),
              source: SOURCE[item.source ?? ''] ? t(SOURCE[item.source ?? '']!) : item.source,
              where: where(item),
            })}
          </p>
          {overhang?.items.includes(item.id) && <p class="pl-warn">{t('arrange.sticksOut')}</p>}
          <div class="pl-row">
            {/* the arrows point the way the item moves on a plan with the entrance on the left: they stay left to right in every language */}
            <div class="pl-pad" role="group" aria-label={t('arrange.move')} dir="ltr">
              <button type="button" class="pl-tool" aria-label={t('arrange.moveFront')} onClick={() => nudgeSelected(store, -step, 0)}>
                ←
              </button>
              <button type="button" class="pl-tool" aria-label={t('arrange.moveLeft')} onClick={() => nudgeSelected(store, 0, step)}>
                ↑
              </button>
              <button type="button" class="pl-tool" aria-label={t('arrange.moveRight')} onClick={() => nudgeSelected(store, 0, -step)}>
                ↓
              </button>
              <button type="button" class="pl-tool" aria-label={t('arrange.moveBack')} onClick={() => nudgeSelected(store, step, 0)}>
                →
              </button>
            </div>
            <button type="button" class="btn btn-small" onClick={() => rotateSelected(store)}>
              {t('action.turn')}
            </button>
            <button type="button" class="btn btn-small" onClick={() => duplicateSelected(store)} title={t('action.duplicateTitle')}>
              {t('action.duplicate')}
            </button>
            <button type="button" class="btn btn-small pl-danger" onClick={() => deleteSelected(store)}>
              {t('arrange.remove')}
            </button>
          </div>
          <p class="pl-small muted">{t(touch ? 'arrange.helpTouch' : 'arrange.helpMouse')}</p>
        </div>
      ) : (
        <p class="pl-small" dangerouslySetInnerHTML={{ __html: t.html(touch ? 'arrange.introTouch' : 'arrange.introMouse') }} />
      )}

      <label class="pl-field">
        <span class="pl-small">{t('arrange.pickList')}</span>
        <select
          data-pl-items=""
          data-pl-after-remove=""
          value={item?.id ?? ''}
          onChange={(e) => {
            const v = (e.target as HTMLSelectElement).value;
            store.$selection.set(v ? { kind: 'item', id: v } : null);
          }}
        >
          <option value="">{t('arrange.nothingPicked')}</option>
          {(['frame', 'front', 'back', 'added'] as const).map((src) => {
            const its = layout.items.filter((i) => (i.source ?? 'added') === src);
            if (!its.length) return null;
            const labels = uniqueLabels(its.map((i) => t('arrange.itemOption', { name: catalogEntry(i.element).name, where: where(i) })));
            return (
              <optgroup label={t(GROUP[src])}>
                {its.map((i, k) => (
                  <option value={i.id}>{labels[k]}</option>
                ))}
              </optgroup>
            );
          })}
        </select>
      </label>

      <h3 class="pl-h">{t('arrange.addTitle')}</h3>
      <p class="pl-small muted">{t(touch ? 'arrange.addTouch' : 'arrange.addMouse')}</p>
      {palette().map((g, i) => (
        <details class="pl-palette" open={i === 0}>
          <summary>{g.label}</summary>
          <div class="pl-chips">
            {g.items.map((e) => (
              <button
                type="button"
                class="pl-chip pl-chip-drag"
                onClick={() => add(e.id)}
                onPointerDown={(ev) => startPaletteDrag(store, ev as PointerEvent, e.id, e.name, suppressClick)}
              >
                {t('common.add', { name: e.name })} <span class="pl-dim">{t('common.dims', { length: e.w, width: e.h })}</span>
              </button>
            ))}
          </div>
        </details>
      ))}

      <p class="pl-small" style={{ marginTop: '14px' }}>
        {changes ? t('arrange.changes', { count: changes }) : t('arrange.noChanges')}
        {changes > 0 && ' '}
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
            {t('arrange.startOver')}
          </button>
        )}
      </p>
    </section>
  );
}

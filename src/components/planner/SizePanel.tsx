/** @jsxImportSource preact */
import { useStore } from '@nanostores/preact';
import type { PlannerStore } from '../../lib/planner/store';
import type { LotKind, SizeId, ThemeId } from '../../lib/types';
import { SIZES, fitSize } from '../../lib/sizing';
import { THEMES, THEME_ORDER } from '../../data/themes';
import { parkDims, setLotKind, setSize, setThemes } from '../../lib/planner/design';
import { getExtra } from '../../lib/project';
import type { SiteFacts } from '../../lib/types';

const PIECES: { key: 'frame' | 'front' | 'back'; label: string; hint: string }[] = [
  { key: 'frame', label: 'Frame', hint: 'the planted border around the edge' },
  { key: 'front', label: 'Front', hint: 'the part by the entrance' },
  { key: 'back', label: 'Back', hint: 'the far end' },
];

export function SizePanel({ store }: { store: PlannerStore }) {
  const site = useStore(store.$site);
  const d = useStore(store.$design);
  const set = useStore(store.$set);
  const fitArea = useStore(store.$fit);
  if (!site || !d) return null;
  // the largest rectangle that fits inside the lot (build-lead A6)
  const stretch = parkDims(true, { lengthFt: 0, widthFt: 0 }, fitArea ?? site.frame);
  const facts = store.$demo.get() ? undefined : getExtra<SiteFacts>('site');
  const fit = fitSize(site.frame.lengthFt, site.frame.widthFt);
  const one = d.frame === d.front && d.front === d.back ? d.frame : null;
  const pickTheme = (patch: Partial<Record<'frame' | 'front' | 'back', ThemeId>>) => store.commit(setThemes(d, patch));

  return (
    <section class="pl-section">
      <h3 class="pl-h">Park size</h3>
      <p class="pl-small">
        Park in a Truck's pieces come in five sizes. Your lot is about {Math.round(site.frame.lengthFt)} × {Math.round(site.frame.widthFt)} ft,
        which fits <strong>size {fit.size}</strong>
        {fit.tooSmall ? ' — it is smaller than size A, so the Park Patch workbook may suit it better' : ''}
        {fit.tooBig ? ' — it is bigger than size E, so use E and add more, or make two parks' : ''}.
      </p>
      <div class="pl-chips" role="radiogroup" aria-label="Park size">
        <button type="button" role="radio" aria-checked={Boolean(d.sizeAuto)} class="pl-chip" onClick={() => store.commit(setSize(d, 'auto', site, facts))}>
          Fit my lot ({fit.size})
        </button>
        {SIZES.map((s) => (
          <button
            type="button"
            role="radio"
            aria-checked={!d.sizeAuto && d.size === s.id}
            class="pl-chip"
            title={`${s.long[0]}–${s.long[1]} ft long, ${s.short[0]}–${s.short[1]} ft wide`}
            onClick={() => store.commit(setSize(d, s.id as SizeId, site, facts))}
          >
            {s.id}
          </button>
        ))}
      </div>
      <p class="pl-small muted">
        Size {d.size}: lots {SIZES.find((s) => s.id === d.size)!.long.join('–')} ft long and {SIZES.find((s) => s.id === d.size)!.short.join('–')} ft
        wide.
      </p>

      <fieldset class="pl-fieldset">
        <legend>Stretch to the lot?</legend>
        <label class="pl-radio">
          <input type="radio" name="pl-fit" checked={d.fitToLot !== false} onChange={() => store.commit({ ...d, fitToLot: true, updatedAt: new Date().toISOString() })} />
          Stretch the pieces to fill my lot ({stretch.lengthFt} × {stretch.widthFt} ft — like adding the seams)
        </label>
        <label class="pl-radio">
          <input type="radio" name="pl-fit" checked={d.fitToLot === false} onChange={() => store.commit({ ...d, fitToLot: false, updatedAt: new Date().toISOString() })} />
          Keep the printed size{set ? ` (${set.nominal.lengthFt} × ${set.nominal.widthFt} ft)` : ''}
        </label>
      </fieldset>

      <fieldset class="pl-fieldset">
        <legend>Kind of lot</legend>
        {(
          [
            ['auto', `As found on the map (${site.frame.lotKind === 'interior' ? 'mid-block' : 'corner'})`],
            ['interior', 'Mid-block'],
            ['corner-left', 'Corner — side street on the left'],
            ['corner-right', 'Corner — side street on the right'],
          ] as [LotKind | 'auto', string][]
        ).map(([k, label]) => (
          <label class="pl-radio">
            <input
              type="radio"
              name="pl-kind"
              checked={k === 'auto' ? Boolean(d.lotKindAuto) : !d.lotKindAuto && d.lotKind === k}
              onChange={() => store.commit(setLotKind(d, k, site))}
            />
            {label}
          </label>
        ))}
      </fieldset>

      <h3 class="pl-h">Themes</h3>
      <p class="pl-small">Use one theme for everything, or mix and match the frame, front and back.</p>
      <div class="pl-onetheme" role="group" aria-label="One theme for everything">
        {THEME_ORDER.map((t) => (
          <button
            type="button"
            class="pl-theme-btn"
            aria-pressed={one === t}
            style={{ '--c1': THEMES[t].frame, '--c2': THEMES[t].front, '--c3': THEMES[t].back }}
            onClick={() => pickTheme({ frame: t, front: t, back: t })}
          >
            <span class="pl-swatch" aria-hidden="true" />
            {THEMES[t].name}
          </button>
        ))}
      </div>
      {PIECES.map((p) => (
        <fieldset class="pl-fieldset pl-piece">
          <legend>
            {p.label} <span class="muted">— {p.hint}</span>
          </legend>
          <div class="pl-chips">
            {THEME_ORDER.map((t) => (
              <label class="pl-theme-chip" style={{ '--c': THEMES[t][p.key] }}>
                <input type="radio" name={`pl-theme-${p.key}`} checked={d[p.key] === t} onChange={() => pickTheme({ [p.key]: t })} />
                <span class="pl-dot" aria-hidden="true" />
                {THEMES[t].name}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <p class="pl-small muted">{THEMES[d.front].blurb}</p>
    </section>
  );
}

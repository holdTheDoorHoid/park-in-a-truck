/** @jsxImportSource preact */
// One estimator question: a number box with a badge saying where the number
// came from (your design, your lot, the spreadsheet's example, or you) and a
// per-field reset.

import { useState } from 'preact/hooks';
import type { CostField } from '../../lib/cost/fields';
import type { ValueSource } from '../../lib/cost/state';
import type { CostKey, CostT } from '../../lib/cost/text';

interface Props {
  t: CostT;
  field: CostField;
  idBase: string;
  value: number;
  source: ValueSource;
  fallback: number;
  fallbackSource: Exclude<ValueSource, 'you'>;
  /** How a design value was worked out, or what the design has for a question it can't answer */
  derivedNote?: string;
  onChange: (v: number | undefined) => void;
}

const BADGE: Record<ValueSource, CostKey | null> = {
  design: 'ui.badge.design',
  lot: 'ui.badge.lot',
  example: 'ui.badge.example',
  you: 'ui.badge.you',
  blank: null,
};

const RESET: Record<Exclude<ValueSource, 'you'>, CostKey> = {
  design: 'ui.reset.design',
  lot: 'ui.reset.lot',
  example: 'ui.reset.example',
  blank: 'ui.reset.blank',
};

export default function NumberField({ t, field, idBase, value, source, fallback, fallbackSource, derivedNote, onChange }: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const id = `${idBase}-${field.key}`;
  const hintId = `${id}-hint`;
  const shown = draft ?? (value === 0 && source === 'blank' ? '' : String(value));

  function input(e: Event) {
    const raw = (e.currentTarget as HTMLInputElement).value;
    setDraft(raw);
    if (raw.trim() === '') {
      setInvalid(false);
      return;
    }
    const v = Number(raw);
    const ok = Number.isFinite(v) && v >= 0;
    setInvalid(!ok);
    if (ok) onChange(v);
  }
  function blur() {
    if (draft !== null && draft.trim() === '') onChange(fallback !== 0 ? 0 : undefined);
    setDraft(null);
    setInvalid(false);
  }

  const badgeKey = BADGE[source];
  const badge = badgeKey && t(badgeKey);
  const unit = field.unit === 'ft' ? t('ui.unit.ft') : field.unit === 'squares' ? t('ui.unit.squares') : field.unit;
  const describedBy = field.hint || field.unpriced || derivedNote || invalid ? hintId : undefined;
  return (
    <div class={`ce-field ce-src-${source}`}>
      <label class="ce-label" for={id}>
        {field.label}
      </label>
      <div class="ce-control">
        <span class="ce-input-wrap">
          {field.unit === '$' && <span class="ce-unit ce-unit-pre">$</span>}
          <input
            id={id}
            type="number"
            min={0}
            step="any"
            inputMode={field.decimal ? 'decimal' : 'numeric'}
            value={shown}
            placeholder="0"
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            onInput={input}
            onBlur={blur}
          />
          {unit && field.unit !== '$' && <span class="ce-unit">{unit}</span>}
        </span>
        {badge && <span class={`ce-badge ce-badge-${source}`}>{source === 'you' ? '✎ ' : source === 'example' ? '' : '✓ '}{badge}</span>}
        {source === 'you' && (
          <button type="button" class="ce-reset" onClick={() => onChange(undefined)} title={t('ui.backTo', { value: fallback })}>
            ↺ {t(RESET[fallbackSource])}
            {fallbackSource !== 'blank' && <span class="visually-hidden"> ({t.num(fallback)})</span>}
          </button>
        )}
      </div>
      {describedBy && (
        <p class="ce-hint" id={hintId}>
          {invalid && <span class="ce-invalid">{t('ui.invalid')} </span>}
          {field.hint && <span>{field.hint} </span>}
          {derivedNote && <span>{derivedNote} </span>}
          {field.unpriced && <span class="ce-unpriced">⚠ {field.unpriced}</span>}
        </p>
      )}
    </div>
  );
}

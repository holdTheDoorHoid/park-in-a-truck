/** @jsxImportSource preact */
// Address type-ahead (accessible combobox). Suggestions from searchAddresses():
// AIS for full addresses, intersections and OPA numbers; the City property list
// for half-typed streets.

import { useEffect, useId, useRef, useState } from 'preact/hooks';
import { searchAddresses } from '../../lib/philly/search';
import type { AddressSuggestion } from '../../lib/philly/types';
import { titleCase } from '../../lib/philly/plain';
import { isolate, words } from '../../lib/philly/words';
import { useDebounced } from './hooks';

interface Props {
  label?: string;
  hint?: string;
  placeholder?: string;
  buttonLabel?: string;
  busy?: boolean;
  /** called with a picked suggestion, or the raw text when the person presses Enter / the button */
  onPick: (q: AddressSuggestion | string) => void;
  initial?: string;
  /** what the form is for, for screen readers' list of landmarks */
  formLabel?: string;
}

export default function AddressSearch({ label, hint, placeholder, buttonLabel, busy, onPick, initial = '', formLabel }: Props) {
  const t = words();
  label ??= t('search.label');
  hint ??= t('search.hint');
  placeholder ??= t('search.placeholder');
  buttonLabel ??= t('search.button');
  const id = useId();
  const [text, setText] = useState(initial);
  const [items, setItems] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [problem, setProblem] = useState<string | null>(null);
  const q = useDebounced(text, 300);
  const typed = useRef(false);

  useEffect(() => {
    if (!typed.current) return;
    const ctrl = new AbortController();
    if (q.trim().length < 3) {
      setItems([]);
      return;
    }
    searchAddresses(q, { signal: ctrl.signal })
      .then((s) => {
        setItems(s);
        setActive(-1);
        setOpen(s.length > 0);
        setProblem(null);
      })
      .catch((e) => {
        if (e?.code === 'aborted' || e?.name === 'AbortError' || ctrl.signal.aborted) return;
        setItems([]);
        setProblem(e?.message ?? t('search.down'));
      });
    return () => ctrl.abort();
  }, [q]);

  const pick = (s: AddressSuggestion | string) => {
    // Filling the box with the picked address must not start a new search
    // (that would reopen the list over the result card).
    typed.current = false;
    setOpen(false);
    if (typeof s !== 'string') setText(s.kind === 'address' ? titleCase(s.label) : titleCase(s.label));
    onPick(s);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(items.length > 0);
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(-1, a - 1));
    } else if (e.key === 'Escape') {
      // first Escape closes the list and keeps what was typed (a search box would clear it)
      if (open) e.preventDefault();
      setOpen(false);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && active >= 0 && items[active]) pick(items[active]!);
      else if (text.trim()) pick(text.trim());
    }
  };

  const listId = `${id}-list`;
  const hintId = `${id}-hint`;
  return (
    // A real form: the button submits it, so clicking it and pressing Enter always do the same thing.
    <form
      class="ph-search"
      role="search"
      aria-label={formLabel ?? label}
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim() && !busy) pick(text.trim());
      }}
    >
      <label class="ph-label" for={`${id}-in`}>
        {label}
      </label>
      <div class="ph-search-row">
        <input
          id={`${id}-in`}
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && active >= 0 ? `${id}-o${active}` : undefined}
          aria-describedby={problem || hint ? hintId : undefined}
          autocomplete="off"
          spellcheck={false}
          placeholder={placeholder}
          value={text}
          onInput={(e) => {
            typed.current = true;
            setText((e.target as HTMLInputElement).value);
          }}
          onKeyDown={onKey}
          onFocus={() => items.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        <button class="btn btn-primary" type="submit" disabled={busy || !text.trim()}>
          {busy ? <span class="ph-spinner" aria-hidden="true" /> : null}
          {buttonLabel}
        </button>
      </div>
      {open && items.length > 0 && (
        <ul class="ph-list" id={listId} role="listbox" aria-label={t('search.listLabel')}>
          {items.map((s, i) => (
            <li
              id={`${id}-o${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(s);
              }}
            >
              {s.kind === 'intersection' ? '✚ ' : ''}
              {isolate(titleCase(s.label), t)}
              <small>{s.kind === 'intersection' ? t('search.corner') : s.owner ? t('search.owner', { owner: isolate(s.owner, t) }) : ''}</small>
            </li>
          ))}
        </ul>
      )}
      {problem ? (
        <span class="ph-hint" role="status" id={hintId}>
          {problem}
        </span>
      ) : hint ? (
        <span class="ph-hint" id={hintId}>
          {hint}
        </span>
      ) : null}
    </form>
  );
}

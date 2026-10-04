/** @jsxImportSource preact */
// A "Use this as my park lot" / "+ Add to my list" button that turns into its
// confirmation ("✓ On your list") once done. Keyboard focus moves onto the
// confirmation instead of vanishing with the button, and the confirmation is a
// status message so screen readers announce it (usability test 2026-10-04,
// access-keyboard F7).

import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

interface Props {
  done: boolean;
  /** shown once done, e.g. "✓ On your list" */
  doneText: ComponentChildren;
  children: ComponentChildren;
  onClick: () => void;
  primary?: boolean;
  small?: boolean;
  disabled?: boolean;
  /** accessible name for the button when its text alone is ambiguous */
  label?: string;
}

export default function SaveToggle({ done, doneText, children, onClick, primary, small, disabled, label }: Props) {
  const clicked = useRef(false);
  const msg = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (done && clicked.current) {
      clicked.current = false;
      msg.current?.focus();
    }
  }, [done]);
  if (done)
    return (
      <span class="ph-saved" role="status" tabIndex={-1} ref={msg}>
        {doneText}
      </span>
    );
  return (
    <button
      class={`btn${primary ? ' btn-primary' : ''}${small ? ' btn-small' : ''}`}
      type="button"
      disabled={disabled}
      aria-label={label}
      onClick={() => {
        clicked.current = true;
        onClick();
      }}
    >
      {children}
    </button>
  );
}

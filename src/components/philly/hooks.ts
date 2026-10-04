import { useEffect, useRef, useState } from 'preact/hooks';
import type { RefObject } from 'preact';
import { useStore } from '@nanostores/preact';
import { $project } from '../../lib/project';
import type { Project } from '../../lib/types';

/** The active saved project (re-renders on change). */
export function useProject(): Project {
  return useStore($project);
}

/** `value`, settled for `ms` (for type-ahead). */
export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** True once the element has scrolled near the viewport (lazy-load maps). */
export function useNearViewport<T extends Element>(): [RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (near || !ref.current) return;
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) {
        setNear(true);
        io.disconnect();
      }
    }, { rootMargin: '300px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [near]);
  return [ref, near];
}

/** Tell bind.ts to wire up any workbook fields rendered inside `el`. */
export function rebind(el: Element | null | undefined) {
  el?.dispatchEvent(new CustomEvent('piat:bind', { bubbles: true }));
}

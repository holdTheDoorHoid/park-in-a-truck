/** @jsxImportSource preact */
// The 3D assembly viewer beside a build guide's steps. As the reader scrolls,
// the step they're reading becomes the viewer's step: its parts fly into place
// and glow cyan. Step 1 ("mark, label and cut") lays every board out flat.
//
// This island stays small: three.js, the viewer and the model JSON are loaded
// only when the viewer comes near the screen, and only if WebGL works. If it
// doesn't, the page falls back to the plain step layout (data-g3d="off").
//
// Layout (sticky column on desktop, sticky strip on phones) is in
// src/pages/build/[slug].astro; the viewer's own look is in guide3d.css.

import { useEffect, useRef, useState } from 'preact/hooks';
import { readingLine, same, stepAtReadingLine, type ScrollStep } from '../../lib/guides3d/scroll';
import type { GuideModel } from '../../lib/guides3d/schema';
import type { CutLike } from '../../lib/guides3d/labels';
import type { View } from '../../lib/guides3d/timeline';

type ViewerModule = typeof import('../../lib/guides3d/viewer');
type Viewer = InstanceType<ViewerModule['AssemblyViewer']>;

const models = import.meta.glob<GuideModel>('../../data/guides/models/*.json', { import: 'default' });

interface Props {
  slug: string;
  title: string;
  steps: { n: number; title?: string }[];
  cutList: CutLike[];
}

const STORE_KEY = 'piat.guide3d.collapsed'; // a viewing preference, not project data

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORE_KEY) === '1';
  } catch {
    return false;
  }
}
function writeCollapsed(v: boolean) {
  try {
    if (v) localStorage.setItem(STORE_KEY, '1');
    else localStorage.removeItem(STORE_KEY);
  } catch {
    /* private mode etc. */
  }
}

function webglWorks(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

const viewOf = (s: ScrollStep): View => (s.kind === 'step' ? { kind: 'step', n: s.n } : { kind: 'complete' });

export default function GuideViewerIsland({ slug, title, steps, cutList }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const viewer = useRef<Viewer | null>(null);
  const mod = useRef<ViewerModule | null>(null);
  const scrollStep = useRef<ScrollStep>({ kind: 'before' });
  const playToken = useRef(0);
  const [status, setStatus] = useState<'waiting' | 'loading' | 'ready' | 'off'>('waiting');
  const [shown, setShown] = useState<ScrollStep>({ kind: 'before' });
  const [playing, setPlaying] = useState<View | null>(null);
  const [exploded, setExploded] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const layout = () => root.current?.closest<HTMLElement>('[data-g3d]') ?? null;
  const turnOff = () => {
    const l = layout();
    if (l) l.dataset.g3d = 'off';
    setStatus('off');
  };

  // ---- scroll -> current step ------------------------------------------------
  useEffect(() => {
    if (!webglWorks() || !(`../../data/guides/models/${slug}.json` in models)) {
      turnOff();
      return;
    }
    const l = layout();
    if (l) l.dataset.g3d = 'on';
    const header = document.querySelector<HTMLElement>('.site-header');
    const desktop = window.matchMedia('(min-width: 1000px)');
    const blocks = () => [...document.querySelectorAll<HTMLElement>('[data-guide-step]')];

    const measure = () => {
      const lay = layout();
      if (!lay) return;
      const hb = header ? header.getBoundingClientRect().height : 64;
      lay.style.setProperty('--g3d-top', `${Math.round(hb)}px`);
      const r = root.current?.getBoundingClientRect();
      if (r) lay.style.setProperty('--g3d-h', `${Math.round(r.height)}px`);
    };

    const compute = (): ScrollStep => {
      const hb = header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
      let top = hb;
      if (!desktop.matches && root.current) {
        const r = root.current.getBoundingClientRect();
        if (r.bottom > top) top = r.bottom; // the sticky viewer covers the top on phones
      }
      const vh = window.innerHeight;
      const rects = blocks().map((el) => {
        const r = el.getBoundingClientRect();
        return { n: Number(el.dataset.guideStep), top: r.top, bottom: r.bottom };
      });
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      return stepAtReadingLine(rects, readingLine(top, vh), { prev: scrollStep.current, atPageEnd: atEnd, viewportHeight: vh });
    };

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const s = compute();
        const changed = !same(s, scrollStep.current);
        scrollStep.current = s;
        // near the screen? start loading three.js
        const r = root.current?.getBoundingClientRect();
        if (r && r.top < window.innerHeight + 700 && r.bottom > -700) load();
        if (changed) {
          if (playToken.current) stopPlay(); // scrolling to another step takes over from "play all"
          else {
            setShown(s);
            void viewer.current?.show(viewOf(s));
          }
        }
      });
    };

    let loading = false;
    const load = () => {
      if (loading) return;
      loading = true;
      setStatus('loading');
      const loader = models[`../../data/guides/models/${slug}.json`]!;
      Promise.all([import('../../lib/guides3d/viewer'), loader()])
        .then(([m, model]) => {
          if (!stage.current) return;
          mod.current = m;
          const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
          const s = compute();
          scrollStep.current = s;
          setShown(s);
          viewer.current = new m.AssemblyViewer({
            container: stage.current,
            model,
            steps,
            cutList,
            reducedMotion: reduce.matches,
            view: viewOf(s),
            onError: turnOff,
          });
          reduce.addEventListener?.('change', () => viewer.current?.setReducedMotion(reduce.matches));
          if (import.meta.env.DEV) (window as unknown as { __g3d: unknown }).__g3d = viewer.current; // dev-only handle for checks
          setStatus('ready');
        })
        .catch((err) => {
          console.warn('3D model viewer unavailable:', err);
          turnOff();
        });
    };

    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && load(), { rootMargin: '700px 0px' });
    if (root.current) io.observe(root.current);
    const ro = new ResizeObserver(() => {
      measure();
      onScroll();
    });
    if (root.current) ro.observe(root.current);
    if (header) ro.observe(header);
    // images loading above the reader move the steps without a scroll event
    const list = layout()?.querySelector('.steps');
    if (list) ro.observe(list);
    measure();
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
      viewer.current?.dispose();
      viewer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    const l = layout();
    if (l) l.dataset.g3dCollapsed = collapsed ? '1' : '0';
  }, [collapsed, status]);

  // ---- controls ----------------------------------------------------------------
  function stopPlay() {
    playToken.current = 0;
    setPlaying(null);
    const s = scrollStep.current;
    setShown(s);
    void viewer.current?.show(viewOf(s));
  }

  async function playAll() {
    const v = viewer.current;
    const m = mod.current;
    if (!v || !m) return;
    if (playToken.current) return stopPlay();
    const token = Date.now();
    playToken.current = token;
    for (const view of m.playSequence(v.prepared)) {
      if (playToken.current !== token) return;
      setPlaying(view);
      await v.show(view);
      if (playToken.current !== token) return;
      await v.hold(view.kind === 'empty' ? 200 : view.kind === 'complete' ? 400 : 1300);
    }
    if (playToken.current === token) {
      playToken.current = 0;
      setPlaying(null);
      // stay on the finished piece until the reader scrolls to another step
      setShown({ kind: 'after' });
      scrollStep.current = { kind: 'after' };
    }
  }

  function replay() {
    if (playToken.current) stopPlay();
    void viewer.current?.replay();
  }

  function toggleExploded() {
    const on = !exploded;
    setExploded(on);
    viewer.current?.setExploded(on);
  }

  function toggleCollapsed() {
    const c = !collapsed;
    setCollapsed(c);
    writeCollapsed(c);
  }

  // ---- labels --------------------------------------------------------------------
  const total = steps.length;
  const active: View = playing ?? viewOf(shown);
  let eyebrow: string;
  let heading: string;
  if (active.kind === 'step') {
    eyebrow = `Step ${active.n} of ${total}`;
    heading = steps.find((s) => s.n === active.n)?.title ?? `Step ${active.n}`;
  } else if (active.kind === 'empty') {
    eyebrow = 'Play all steps';
    heading = 'Starting…';
  } else {
    eyebrow = 'The finished piece';
    heading = shown.kind === 'before' && !playing ? 'Scroll through the steps to watch it go together' : title;
  }
  if (playing) eyebrow = `▶ ${eyebrow}`;

  const v = viewer.current;
  let state = '';
  if (v && active.kind === 'step') {
    const adds = mod.current?.stepPartsSummary(v.prepared, active.n);
    state = active.n === v.prepared.pileStep ? 'Every cut board laid out flat and labelled.' : adds ? `Step ${active.n} adds ${adds}.` : 'The whole piece.';
  } else if (active.kind === 'complete') state = 'The whole piece.';
  const describe = `3D model of the ${title}. ${state} Drag or use the arrow keys to turn it; plus and minus zoom.`;

  if (status === 'off') return null;
  const ready = status === 'ready';
  const bodyId = `g3d-body-${slug}`;

  return (
    <div ref={root} class={`g3d${collapsed ? ' is-collapsed' : ''}`} data-status={status}>
      <div class="g3d-head">
        <p class="g3d-where">
          <span class="g3d-eyebrow">{eyebrow}</span>
          <span class="g3d-title">{heading}</span>
        </p>
        <button type="button" class="g3d-collapse" aria-expanded={!collapsed} aria-controls={bodyId} onClick={toggleCollapsed}>
          {collapsed ? 'Show 3D' : 'Hide 3D'}
        </button>
      </div>
      <div class="g3d-body" id={bodyId}>
        <div class="g3d-stage-wrap">
          <div ref={stage} class="g3d-stage" tabIndex={0} role="group" aria-roledescription="3D model" aria-label={describe} />
          {!ready && <div class="g3d-loading">{status === 'loading' ? 'Loading the 3D model…' : '3D model'}</div>}
        </div>
        <div class="g3d-tools" role="toolbar" aria-label="3D model controls">
          <button type="button" class="g3d-btn" onClick={replay} disabled={!ready}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M4.5 10a5.5 5.5 0 1 0 1.8-4.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              <path d="M3.2 3.2v4.2h4.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span class="g3d-long">Replay step</span>
            <span class="g3d-short">Replay</span>
          </button>
          <button type="button" class="g3d-btn" onClick={playAll} disabled={!ready} aria-pressed={!!playing}>
            {playing ? (
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <rect x="5" y="5" width="10" height="10" rx="1" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M6 4.5v11l9-5.5z" fill="currentColor" />
              </svg>
            )}
            <span>{playing ? 'Stop' : 'Play all'}</span>
          </button>
          <button type="button" class="g3d-btn" onClick={toggleExploded} disabled={!ready} aria-pressed={exploded}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <rect x="7.5" y="7.5" width="5" height="5" fill="none" stroke="currentColor" stroke-width="1.8" />
              <path d="M2.5 2.5l3 3M17.5 2.5l-3 3M2.5 17.5l3-3M17.5 17.5l-3-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
            <span class="g3d-long">Exploded view</span>
            <span class="g3d-short">Explode</span>
          </button>
          <button type="button" class="g3d-btn" onClick={() => viewer.current?.resetView()} disabled={!ready}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M10 3v3M10 14v3M3 10h3M14 10h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              <circle cx="10" cy="10" r="4.2" fill="none" stroke="currentColor" stroke-width="1.8" />
            </svg>
            <span class="g3d-long">Reset view</span>
            <span class="g3d-short">Reset</span>
          </button>
        </div>
        <p class="g3d-help">Drag to turn it. Click it, then scroll to zoom. Point at a board to see its size.</p>
      </div>
    </div>
  );
}

/** @jsxImportSource preact */
// The planner island. One component for every place the planner appears:
//   mode="full"   the /planner/ page (step rail: lot → size & themes → arrange → sun → counts)
//   mode="design" the Dream chapter (size & themes, arrange, sun, counts)
//   mode="site"   the Assess chapter (what's already on the lot, sun & shade)
//   mode="sun"    the SunStudy widget (sun & shade only)
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { createPlannerStore, type PlannerMode } from '../../lib/planner/store';
import { $project } from '../../lib/project';
import { DEMO_LOTS, type DemoSlug } from '../../lib/planner/site';
import { u } from '../../lib/url';
import { Viewport } from './Viewport';
import { LotPanel } from './LotPanel';
import { SizePanel } from './SizePanel';
import { ArrangePanel } from './ArrangePanel';
import { ExistingPanel } from './ExistingPanel';
import { SunPanel } from './SunPanel';
import { CountsPanel } from './CountsPanel';
import { keyHandler } from './keyboard';
import './planner.css';

export type StepId = 'lot' | 'size' | 'arrange' | 'existing' | 'sun' | 'counts';

const STEP_LABEL: Record<StepId, string> = {
  lot: 'Your lot',
  size: 'Size & themes',
  arrange: 'Arrange',
  existing: "What's there",
  sun: 'Sun & shade',
  counts: 'Counts',
};

const STEPS: Record<PlannerMode, StepId[]> = {
  full: ['lot', 'size', 'arrange', 'sun', 'counts'],
  design: ['size', 'arrange', 'sun', 'counts'],
  site: ['existing', 'sun'],
  sun: ['sun'],
};

interface Props {
  mode?: PlannerMode;
  /** start on a demo lot (also ?demo=dover|greenway on the /planner page) */
  demo?: DemoSlug;
  /** the /planner page: fill the viewport */
  page?: boolean;
}

interface Query {
  demo: DemoSlug | null;
  step: string | null;
  view?: string | null;
  date?: string | null;
  time?: string | null;
  run?: string | null;
}

/** /planner/?demo=dover&step=sun&view=plan&date=06-21&time=15:30&run=sun — handy for sharing a view. */
function fromQuery(): Query {
  try {
    const q = new URLSearchParams(location.search);
    const d = q.get('demo');
    return { demo: d === 'dover' || d === 'greenway' ? d : null, step: q.get('step'), view: q.get('view'), date: q.get('date'), time: q.get('time'), run: q.get('run') };
  } catch {
    return { demo: null, step: null };
  }
}

/**
 * In a chapter the planner may sit far down the page: wait until it is about to scroll
 * into view before loading City data and Three.js.
 */
export default function PlannerApp(props: Props) {
  const [near, setNear] = useState(Boolean(props.page) || typeof IntersectionObserver === 'undefined');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (near || !ref.current) return;
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) {
        setNear(true);
        io.disconnect();
      }
    }, { rootMargin: '400px 0px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [near]);
  if (!near) {
    return (
      <div class={`pl-root pl-${props.mode ?? 'design'} pl-waiting`} ref={ref}>
        <p class="muted">The 3D planner loads when you scroll to it…</p>
      </div>
    );
  }
  return <PlannerInner {...props} />;
}

function PlannerInner({ mode = 'design', demo, page = false }: Props) {
  const query: Query = page ? fromQuery() : { demo: null, step: null };
  const store = useMemo(() => {
    const st = createPlannerStore(mode, demo ?? query.demo);
    if (query.view === 'plan') st.$view.set('plan');
    const dm = query.date?.match(/^(\d{1,2})-(\d{1,2})$/);
    const tm = query.time?.match(/^(\d{1,2}):(\d{2})$/);
    if (dm || tm) {
      const cur = st.$sunTime.get();
      st.$sunTime.set({
        month: dm ? Number(dm[1]) : cur.month,
        day: dm ? Number(dm[2]) : cur.day,
        minutes: tm ? Number(tm[1]) * 60 + Number(tm[2]) : cur.minutes,
      });
    }
    if (query.run === 'sun') {
      // ?run=sun works out the sun hours as soon as the lot is ready
      const off = st.$status.listen((v) => {
        if (v === 'ready') {
          off();
          setTimeout(() => st.computeSun(), 0);
        }
      });
    }
    // debugging and the headless checks: the store of the last planner made
    if (import.meta.env.DEV) (window as unknown as { __plannerStore?: unknown }).__plannerStore = st;
    return st;
  }, []);
  useEffect(() => () => store.destroy(), [store]);
  const steps = STEPS[mode];
  const [step, setStep] = useState<StepId>(() => (steps.includes(query.step as StepId) ? (query.step as StepId) : steps[0]!));
  const status = useStore(store.$status);
  const note = useStore(store.$note);
  const demoSlug = useStore(store.$demo);
  const hasLot = Boolean(useStore($project).lot);

  useEffect(() => {
    // what's shown (markers for things already on the lot) depends on the step
    store.$step.set(step);
    store.$selection.set(null);
  }, [step]);

  if (status === 'no-lot') {
    return (
      <div class={`pl-root pl-${mode}${page ? ' pl-page' : ''}`}>
        <div class="pl-cta">
          <p class="eyebrow">Plan your park</p>
          <h2>First, choose your lot</h2>
          <p>
            The planner fits Park in a Truck's park pieces to a real Philadelphia lot, with the neighbors' buildings and
            trees around it. Look up your lot and it will appear here.
          </p>
          <p>
            <a class="btn btn-primary" href={u('lot/')}>
              Find your lot
            </a>
          </p>
          <p class="pl-cta-demo">Or try it out on a demo lot (nothing is saved):</p>
          <div class="pl-row">
            {(Object.keys(DEMO_LOTS) as DemoSlug[]).map((k) => (
              <button type="button" class="btn" onClick={() => store.setDemo(k)}>
                {DEMO_LOTS[k].label}
                <span class="pl-btn-note">{DEMO_LOTS[k].blurb}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const idx = steps.indexOf(step);
  return (
    <div class={`pl-root pl-${mode}${page ? ' pl-page' : ''}`} onKeyDown={keyHandler(store)}>
      <div class="pl-layout">
      <div class="pl-stage">
        <Viewport store={store} mode={mode} />
      </div>
      <div class="pl-side">
        {demoSlug && (
          <div class="pl-demo-banner" role="status">
            <strong>Demo lot:</strong> {DEMO_LOTS[demoSlug].label}. Nothing you do here is saved.{' '}
            {hasLot ? (
              <button type="button" class="pl-link" onClick={() => store.setDemo(null)}>
                Back to your lot
              </button>
            ) : (
              <a href={u('lot/')}>Use your own lot</a>
            )}
          </div>
        )}
        {note && <p class="pl-note">{note}</p>}
        {steps.length > 1 && (
          <nav class="pl-rail" aria-label="Planner steps">
            <ol>
              {steps.map((s, i) => (
                <li>
                  <button type="button" aria-current={s === step ? 'step' : undefined} onClick={() => setStep(s)}>
                    <span class="pl-rail-n">{i + 1}</span>
                    <span class="pl-rail-label">{STEP_LABEL[s]}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        )}
        <div class="pl-panel" aria-live="polite" aria-busy={status === 'loading'}>
          {status === 'loading' && <p class="muted">Loading your lot and its neighbors…</p>}
          {status === 'error' && <p class="pl-note">{note ?? 'Could not load this lot.'}</p>}
          {status === 'ready' && (
            <>
              {step === 'lot' && <LotPanel store={store} />}
              {step === 'size' && <SizePanel store={store} />}
              {step === 'arrange' && <ArrangePanel store={store} />}
              {step === 'existing' && <ExistingPanel store={store} />}
              {step === 'sun' && <SunPanel store={store} />}
              {step === 'counts' && <CountsPanel store={store} />}
              {mode === 'full' && step === 'lot' && <ExistingPanel store={store} compact />}
            </>
          )}
        </div>
        {steps.length > 1 && status === 'ready' && (
          <div class="pl-next">
            {idx > 0 && (
              <button type="button" class="btn btn-small" onClick={() => setStep(steps[idx - 1]!)}>
                ← {STEP_LABEL[steps[idx - 1]!]}
              </button>
            )}
            {idx < steps.length - 1 && (
              <button type="button" class="btn btn-small btn-primary" onClick={() => setStep(steps[idx + 1]!)}>
                Next: {STEP_LABEL[steps[idx + 1]!]} →
              </button>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

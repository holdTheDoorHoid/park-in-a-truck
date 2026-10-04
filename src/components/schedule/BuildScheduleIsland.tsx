import { useStore } from '@nanostores/preact';
import { useMemo } from 'preact/hooks';
import { $project, getExtra, setExtra } from '../../lib/project';
import {
  blankSchedule,
  clearOverride,
  computeSchedule,
  scheduleToIcsEvents,
  setOverride,
  setStartDate,
  skipWeekend,
  unskipWeekend,
  type BuildScheduleState,
} from './buildSchedule';
import { formatLong } from './dates';
import { downloadIcs } from './ics';
import { PHASES } from './phases';

const EXTRA_KEY = 'buildSchedule';

function current(): BuildScheduleState {
  return getExtra<BuildScheduleState>(EXTRA_KEY) ?? blankSchedule();
}

/** Applies `fn` to the freshest saved state (not a value captured at render time), so two
 * edits dispatched in quick succession — e.g. "skip" clicked twice before a re-render —
 * both land instead of the second overwriting the first. */
function update(fn: (state: BuildScheduleState) => BuildScheduleState) {
  setExtra(EXTRA_KEY, fn(current()));
}

export default function BuildScheduleIsland() {
  const project = useStore($project);
  const state = (project.extra[EXTRA_KEY] as BuildScheduleState | undefined) ?? blankSchedule();
  const slots = useMemo(() => computeSchedule(state), [state]);
  const lotAddress = project.lot?.address;

  const onStart = (e: Event) => {
    const value = (e.currentTarget as HTMLInputElement).value;
    update((s) => setStartDate(s, value || null));
  };

  const onEditDate = (phaseId: string, value: string) => {
    update((s) => (value ? setOverride(s, phaseId, value) : clearOverride(s, phaseId)));
  };

  const onSkip = (autoDate: string) => update((s) => skipWeekend(s, autoDate));
  const onUnskip = (autoDate: string) => update((s) => unskipWeekend(s, autoDate));
  const onReset = (phaseId: string) => update((s) => clearOverride(s, phaseId));

  const onDownload = () => {
    const events = scheduleToIcsEvents(slots, lotAddress);
    downloadIcs('park-build-schedule.ics', 'Park build schedule', events);
  };

  const hasSchedule = Boolean(state.startDate);

  return (
    <div class="build-schedule no-print-controls">
      <div class="field">
        <label class="field-label" for="build-start">
          When do you want to start building?
        </label>
        <input
          id="build-start"
          type="date"
          value={state.startDate ?? ''}
          onInput={onStart}
        />
        <span class="field-hint">
          Pick any date — we'll start the first phase on the Saturday on or after it. Each phase gets its own
          weekend; you can edit any date or skip a weekend below.
        </span>
      </div>

      {hasSchedule && (
        <>
          <ol class="phase-list">
            {slots.map((slot, i) => {
              const phase = PHASES[i]!;
              return (
                <li class="phase-row" key={phase.id}>
                  <div class="phase-info">
                    <span class="phase-num" aria-hidden="true">
                      {i + 1}
                    </span>
                    <div>
                      <strong>{phase.title}</strong>
                      <span class="phase-blurb">{phase.blurb}</span>
                    </div>
                  </div>
                  <div class="phase-date">
                    <input
                      type="date"
                      value={slot.date}
                      aria-label={`Date for ${phase.title}`}
                      onInput={(e) => onEditDate(phase.id, (e.currentTarget as HTMLInputElement).value)}
                    />
                    <span class="phase-date-long">{slot.date ? formatLong(slot.date) : ''}</span>
                    <div class="phase-actions no-print">
                      {slot.overridden ? (
                        <button type="button" class="link-btn" onClick={() => onReset(phase.id)}>
                          Reset to auto date
                        </button>
                      ) : (
                        <button type="button" class="link-btn" onClick={() => onSkip(slot.auto)}>
                          Skip this weekend →
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          {state.skipDates.length > 0 && (
            <div class="skipped-weekends no-print">
              <span class="field-label">Skipped weekends</span>
              {state.skipDates.map((d) => (
                <button type="button" class="chip" key={d} onClick={() => onUnskip(d)}>
                  {formatLong(d)} ✕
                </button>
              ))}
            </div>
          )}

          <div class="build-schedule-actions no-print">
            <button type="button" class="btn btn-primary" onClick={onDownload}>
              ⬇ Add to my calendar
            </button>
            <button type="button" class="btn" onClick={() => window.print()}>
              🖨 Print schedule
            </button>
          </div>
          {!lotAddress && (
            <p class="muted no-print">
              Add your lot's address in Acquire to include it as the location on calendar events.
            </p>
          )}
        </>
      )}

      <style>{`
        .build-schedule { margin: 1.5em 0; }
        .build-schedule .field { max-width: none; }
        .phase-list { list-style: none; padding: 0; margin: 1.2em 0; border-top: 1px solid var(--line); }
        .phase-row { display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--line); }
        .phase-info { display: flex; gap: 12px; align-items: flex-start; flex: 1 1 220px; min-width: 0; }
        .phase-num { flex: none; width: 1.8em; height: 1.8em; border-radius: 50%; background: var(--cyan); color: #fff; display: grid; place-items: center; font-weight: 800; font-size: 0.85rem; }
        .phase-info strong { display: block; }
        .phase-blurb { display: block; font-size: 0.85rem; color: var(--muted); }
        .phase-date { display: flex; flex-direction: column; gap: 4px; align-items: flex-end; flex: none; }
        .phase-date input[type='date'] { font: inherit; padding: 0.4em 0.6em; border: 2px solid #9a9a9a; border-radius: var(--radius); }
        .phase-date-long { font-size: 0.8rem; color: var(--muted); }
        .link-btn { border: 0; background: none; color: var(--cyan-ink); font: inherit; font-size: 0.82rem; cursor: pointer; padding: 0; text-decoration: underline; }
        .skipped-weekends { margin: 1em 0; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        .chip { border: 2px solid var(--line); background: #fff; border-radius: 999px; padding: 0.3em 0.8em; font-size: 0.82rem; cursor: pointer; }
        .build-schedule-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 1em; }
        @media (max-width: 560px) {
          .phase-row { flex-direction: column; align-items: stretch; }
          .phase-date { align-items: stretch; }
          .phase-date-long { text-align: right; }
        }
        @media print {
          .phase-actions, .no-print { display: none !important; }
          .phase-date input[type='date'] { border: none; }
        }
      `}</style>
    </div>
  );
}

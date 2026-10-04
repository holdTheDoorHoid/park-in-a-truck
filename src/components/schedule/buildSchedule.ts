// Pure scheduling logic for the Create-step build schedule: pick a start date, lay the
// eight phases out on consecutive Saturday-Sunday weekends, allow skipping a weekend
// (pushing that and every later phase out by a week) and editing any single phase's date
// by hand. Kept free of the DOM/project store so it's easy to unit test.

import { addDaysISO, nextSaturdayISO } from './dates';
import { PHASES } from './phases';
import type { IcsEvent } from './ics';

export interface BuildScheduleState {
  v: 1;
  /** ISO date; the actual first phase lands on the Saturday on/after this date */
  startDate: string | null;
  /** ISO Saturdays the person wants off (holiday, bad weather…) */
  skipDates: string[];
  /** phaseId -> ISO date, when someone drags a single phase to a different day */
  overrides: Record<string, string>;
}

export function blankSchedule(): BuildScheduleState {
  return { v: 1, startDate: null, skipDates: [], overrides: {} };
}

export interface PhaseSlot {
  phaseId: string;
  /** The date actually shown (override, or the computed one) */
  date: string;
  /** The computed Saturday, ignoring any override — what "skip this weekend" skips */
  auto: string;
  overridden: boolean;
}

/** Lay the 8 phases out on weekly Saturday slots starting at `startDate`, skipping any
 * Saturday in `skipDates`, then applying per-phase overrides on top. */
export function computeSchedule(state: BuildScheduleState): PhaseSlot[] {
  if (!state.startDate) {
    return PHASES.map((p) => ({ phaseId: p.id, date: '', auto: '', overridden: false }));
  }
  const skip = new Set(state.skipDates);
  let cur = nextSaturdayISO(state.startDate);
  const out: PhaseSlot[] = [];
  for (const phase of PHASES) {
    while (skip.has(cur)) cur = addDaysISO(cur, 7);
    const auto = cur;
    const override = state.overrides[phase.id];
    out.push({ phaseId: phase.id, date: override ?? auto, auto, overridden: Boolean(override) });
    cur = addDaysISO(cur, 7);
  }
  return out;
}

export function setStartDate(state: BuildScheduleState, iso: string | null): BuildScheduleState {
  return { ...state, startDate: iso };
}

export function skipWeekend(state: BuildScheduleState, autoDate: string): BuildScheduleState {
  if (!autoDate || state.skipDates.includes(autoDate)) return state;
  return { ...state, skipDates: [...state.skipDates, autoDate].sort() };
}

export function unskipWeekend(state: BuildScheduleState, autoDate: string): BuildScheduleState {
  return { ...state, skipDates: state.skipDates.filter((d) => d !== autoDate) };
}

export function setOverride(state: BuildScheduleState, phaseId: string, iso: string): BuildScheduleState {
  return { ...state, overrides: { ...state.overrides, [phaseId]: iso } };
}

export function clearOverride(state: BuildScheduleState, phaseId: string): BuildScheduleState {
  const overrides = { ...state.overrides };
  delete overrides[phaseId];
  return { ...state, overrides };
}

/** Each phase becomes a two-day (Saturday–Sunday) all-day event. */
export function scheduleToIcsEvents(slots: PhaseSlot[], location?: string): IcsEvent[] {
  return slots
    .filter((s) => s.date)
    .map((s) => {
      const phase = PHASES.find((p) => p.id === s.phaseId)!;
      return {
        uid: `build-${phase.id}-${s.date}`,
        summary: `Park build: ${phase.title}`,
        description: phase.blurb,
        location,
        start: s.date,
        endExclusive: addDaysISO(s.date, 2),
      };
    });
}

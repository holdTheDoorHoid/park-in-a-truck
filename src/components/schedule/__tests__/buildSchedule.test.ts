import { describe, expect, it } from 'vitest';
import {
  blankSchedule,
  clearOverride,
  computeSchedule,
  scheduleToIcsEvents,
  setOverride,
  setStartDate,
  skipWeekend,
  unskipWeekend,
} from '../buildSchedule';
import { PHASES } from '../phases';

describe('computeSchedule', () => {
  it('returns empty dates until a start date is chosen', () => {
    const slots = computeSchedule(blankSchedule());
    expect(slots).toHaveLength(8);
    expect(slots.every((s) => s.date === '')).toBe(true);
  });

  it('lays out 8 phases on consecutive Saturdays starting from the chosen date', () => {
    // 2026-03-02 is a Monday; the first phase should land on the following Saturday.
    const state = setStartDate(blankSchedule(), '2026-03-02');
    const slots = computeSchedule(state);
    expect(slots).toHaveLength(8);
    expect(slots[0]!.date).toBe('2026-03-07');
    expect(slots[1]!.date).toBe('2026-03-14');
    expect(slots[7]!.date).toBe('2026-04-25');
    // every date is a Saturday
    for (const s of slots) {
      const day = new Date(s.date + 'T00:00:00Z').getUTCDay();
      expect(day).toBe(6);
    }
  });

  it('keeps a Saturday start date unchanged', () => {
    const state = setStartDate(blankSchedule(), '2026-03-07');
    expect(computeSchedule(state)[0]!.date).toBe('2026-03-07');
  });

  it('skipping a weekend pushes that and every later phase out by a week', () => {
    let state = setStartDate(blankSchedule(), '2026-03-07');
    const before = computeSchedule(state);
    // skip the 3rd phase's weekend (2026-03-21)
    state = skipWeekend(state, before[2]!.auto);
    const after = computeSchedule(state);
    expect(after[0]!.date).toBe('2026-03-07'); // unaffected
    expect(after[1]!.date).toBe('2026-03-14'); // unaffected
    expect(after[2]!.date).toBe('2026-03-28'); // pushed a week
    expect(after[3]!.date).toBe('2026-04-04'); // and everything after
    expect(after[7]!.date).toBe('2026-05-02');
  });

  it('un-skipping restores the original dates', () => {
    let state = setStartDate(blankSchedule(), '2026-03-07');
    const before = computeSchedule(state);
    state = skipWeekend(state, before[0]!.auto);
    state = unskipWeekend(state, before[0]!.auto);
    expect(computeSchedule(state)).toEqual(before);
  });

  it('a per-phase override only changes that phase', () => {
    let state = setStartDate(blankSchedule(), '2026-03-07');
    state = setOverride(state, PHASES[4]!.id, '2026-05-01');
    const slots = computeSchedule(state);
    expect(slots[4]!.date).toBe('2026-05-01');
    expect(slots[4]!.overridden).toBe(true);
    expect(slots[4]!.auto).toBe('2026-04-04'); // the un-overridden auto date is preserved
    // neighbors are untouched
    expect(slots[3]!.date).toBe('2026-03-28');
    expect(slots[5]!.date).toBe('2026-04-11');
  });

  it('clearing an override reverts to the auto date', () => {
    let state = setStartDate(blankSchedule(), '2026-03-07');
    state = setOverride(state, PHASES[0]!.id, '2026-06-01');
    state = clearOverride(state, PHASES[0]!.id);
    expect(computeSchedule(state)[0]!.date).toBe('2026-03-07');
  });
});

describe('scheduleToIcsEvents', () => {
  it('builds one 2-day all-day event per scheduled phase, carrying the lot address', () => {
    const state = setStartDate(blankSchedule(), '2026-03-07');
    const events = scheduleToIcsEvents(computeSchedule(state), '123 Main St, Philadelphia, PA');
    expect(events).toHaveLength(8);
    expect(events[0]!.start).toBe('2026-03-07');
    expect(events[0]!.endExclusive).toBe('2026-03-09');
    expect(events[0]!.location).toBe('123 Main St, Philadelphia, PA');
    expect(events[0]!.summary).toContain('Organize');
  });

  it('skips phases with no date yet', () => {
    expect(scheduleToIcsEvents(computeSchedule(blankSchedule()))).toHaveLength(0);
  });
});

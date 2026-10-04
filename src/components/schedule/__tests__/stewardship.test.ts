import { describe, expect, it } from 'vitest';
import {
  TASKS,
  allInstances,
  blankStewardship,
  instancesForMonth,
  isChecked,
  setChecked,
  stewardshipToIcsEvents,
} from '../stewardship';

describe('instancesForMonth', () => {
  it('includes every task whose months array contains that month', () => {
    const april = instancesForMonth(3); // April, 0-indexed
    const ids = april.map((i) => i.taskId);
    expect(ids).toContain('water-weekly');
    expect(ids).toContain('weed-weekly');
    expect(ids).toContain('monthly-inspection');
  });

  it('is empty for no task in a month with nothing scheduled is still possible, but monthly-inspection means every month has at least one', () => {
    for (let m = 0; m < 12; m++) {
      expect(instancesForMonth(m).length).toBeGreaterThan(0);
    }
  });

  it('gives each instance a stable, month-specific key', () => {
    const jan = instancesForMonth(0);
    const feb = instancesForMonth(1);
    const janInspect = jan.find((i) => i.taskId === 'monthly-inspection')!;
    const febInspect = feb.find((i) => i.taskId === 'monthly-inspection')!;
    expect(janInspect.key).not.toBe(febInspect.key);
    expect(janInspect.key).toBe('monthly-inspection:0');
  });
});

describe('allInstances', () => {
  it('totals the sum of every task’s month count', () => {
    const expected = TASKS.reduce((n, t) => n + t.months.length, 0);
    expect(allInstances()).toHaveLength(expected);
  });
});

describe('checked state', () => {
  it('is unchecked by default', () => {
    expect(isChecked(blankStewardship(), 2026, 'water-weekly:3')).toBe(false);
  });

  it('round-trips a checked task for a given year', () => {
    let state = blankStewardship();
    state = setChecked(state, 2026, 'water-weekly:3', true);
    expect(isChecked(state, 2026, 'water-weekly:3')).toBe(true);
    // a different year is unaffected
    expect(isChecked(state, 2027, 'water-weekly:3')).toBe(false);
  });

  it('unchecking removes the key rather than storing false (keeps saved state small)', () => {
    let state = blankStewardship();
    state = setChecked(state, 2026, 'water-weekly:3', true);
    state = setChecked(state, 2026, 'water-weekly:3', false);
    expect(state.years['2026']).toEqual({});
  });
});

describe('stewardshipToIcsEvents', () => {
  it('produces one yearly-recurring event per task-month instance', () => {
    const events = stewardshipToIcsEvents(2026);
    expect(events).toHaveLength(allInstances().length);
    expect(events.every((e) => e.yearly)).toBe(true);
  });

  it('anchors dates to the requested year', () => {
    const events = stewardshipToIcsEvents(2026);
    expect(events.every((e) => e.start.startsWith('2026-'))).toBe(true);
  });
});

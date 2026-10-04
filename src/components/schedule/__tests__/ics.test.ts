import { describe, expect, it } from 'vitest';
import { buildIcs } from '../ics';

describe('buildIcs', () => {
  it('wraps events in a VCALENDAR with one VEVENT each', () => {
    const ics = buildIcs('Test calendar', [
      { uid: 'a', summary: 'Phase one', start: '2026-03-07', endExclusive: '2026-03-09' },
      { uid: 'b', summary: 'Phase two', start: '2026-03-14', endExclusive: '2026-03-16' },
    ]);
    expect(ics).toMatch(/^BEGIN:VCALENDAR\r\n/);
    expect(ics.trim()).toMatch(/END:VCALENDAR$/);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain('DTSTART;VALUE=DATE:20260307');
    expect(ics).toContain('DTEND;VALUE=DATE:20260309');
    expect(ics).toContain('SUMMARY:Phase one');
  });

  it('adds a yearly RRULE only when asked', () => {
    const ics = buildIcs('Cal', [
      { uid: 'a', summary: 'Yearly', start: '2026-04-01', endExclusive: '2026-04-02', yearly: true },
      { uid: 'b', summary: 'Once', start: '2026-04-01', endExclusive: '2026-04-02' },
    ]);
    expect(ics.match(/RRULE:FREQ=YEARLY/g)).toHaveLength(1);
  });

  it('escapes commas, semicolons and newlines in text fields', () => {
    const ics = buildIcs('Cal', [
      { uid: 'a', summary: 'Weeding, mulching; etc', description: 'Line one\nLine two', start: '2026-04-01', endExclusive: '2026-04-02' },
    ]);
    expect(ics).toContain('SUMMARY:Weeding\\, mulching\\; etc');
    expect(ics).toContain('DESCRIPTION:Line one\\nLine two');
  });

  it('folds lines longer than 75 octets with a leading space continuation', () => {
    const longSummary = 'A'.repeat(120);
    const ics = buildIcs('Cal', [{ uid: 'a', summary: longSummary, start: '2026-04-01', endExclusive: '2026-04-02' }]);
    const lines = ics.split('\r\n');
    expect(lines.some((l) => l.startsWith(' '))).toBe(true);
    // no unfolded line (other than the leading-space continuations) exceeds 75 octets
    for (const l of lines) {
      if (!l.startsWith(' ')) expect(l.length).toBeLessThanOrEqual(75);
    }
  });
});

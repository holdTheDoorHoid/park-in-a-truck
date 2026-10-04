// Minimal RFC 5545 (iCalendar) writer shared by BuildSchedule and StewardshipCalendar.
// Only what both widgets need: all-day events, an optional location, and an optional
// yearly RRULE. No timezones (everything here is a date, not a date-time).

export interface IcsEvent {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  /** ISO date (yyyy-mm-dd) the event starts */
  start: string;
  /** ISO date (yyyy-mm-dd), EXCLUSIVE end (RFC 5545 all-day events end the day after) */
  endExclusive: string;
  /** Repeat every year on the same month/day, forever */
  yearly?: boolean;
}

function escapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/** RFC 5545 requires folding lines longer than 75 octets, continued with a leading space. */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    parts.push(rest.slice(0, 75));
    rest = ' ' + rest.slice(75);
  }
  parts.push(rest);
  return parts.join('\r\n');
}

const asDate = (iso: string) => iso.replace(/-/g, '');

function stamp(): string {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function buildIcs(calName: string, events: IcsEvent[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Park in a Truck//' + calName + '//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeText(calName)}`,
  ];
  const now = stamp();
  for (const ev of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.uid}@parkinatruck`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART;VALUE=DATE:${asDate(ev.start)}`);
    lines.push(`DTEND;VALUE=DATE:${asDate(ev.endExclusive)}`);
    lines.push(`SUMMARY:${escapeText(ev.summary)}`);
    if (ev.description) lines.push(`DESCRIPTION:${escapeText(ev.description)}`);
    if (ev.location) lines.push(`LOCATION:${escapeText(ev.location)}`);
    if (ev.yearly) lines.push('RRULE:FREQ=YEARLY');
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

export function downloadIcs(filename: string, calName: string, events: IcsEvent[]) {
  const blob = new Blob([buildIcs(calName, events)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

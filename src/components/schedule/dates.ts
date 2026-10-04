// Date-only helpers (yyyy-mm-dd strings), deliberately avoiding the local timezone by
// doing all arithmetic in UTC — a build schedule is a sequence of calendar days, not
// date-times, and we never want "Saturday" to become "Friday night" for someone west of
// the prime meridian.

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1));
}

export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

export function addDaysISO(iso: string, n: number): string {
  return toISO(addDays(parseISO(iso), n));
}

/** The Saturday on or after this date (unchanged if it's already a Saturday). */
export function nextSaturdayISO(iso: string): string {
  const d = parseISO(iso);
  const delta = (6 - d.getUTCDay() + 7) % 7;
  return toISO(addDays(d, delta));
}

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function formatLong(iso: string): string {
  const d = parseISO(iso);
  return `${WEEKDAY_SHORT[d.getUTCDay()]}, ${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

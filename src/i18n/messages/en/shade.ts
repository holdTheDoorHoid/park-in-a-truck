// Area "shade": the shade calendar in the planner's Sun and shade step
// (src/components/planner/ShadeCalendar.tsx, words built in src/lib/planner/shadewords.ts).
// It sits under the "Sun through the year at one spot" month chart: for the same spot, WHEN in
// the day it gets direct sun, month by month (a grid of 12 months × half-hours).
// Month names and clock times are filled in by the code in each language's own way.
import { defineMessages } from '../../define.ts';

export default defineMessages('shade', {
  /** Heading (small, uppercase in the planner's side panel) */
  'title': 'Sun and shade through the day',
  /** Under the heading, spot mode. "the chart above" = the month-by-month sun chart just above */
  'intro.spot': 'When this spot gets direct sun on a typical day of each month (the same spot as the chart above). Each square is half an hour.',
  /** Under the heading, whole-lot mode */
  'intro.lot': 'How much of the whole lot is in direct sun on a typical day of each month. Each square is half an hour.',
  /** Two buttons side by side: what the calendar is for */
  'mode.label': 'Calendar for',
  'mode.spot': 'This spot',
  'mode.lot': 'Whole lot',
  /** While the calendar is being worked out (spot: a moment; whole lot: a second or two) */
  'working': 'Working it out…',
  /** {pct} is already formatted, e.g. "40%" */
  'working.lot': 'Working out the whole lot… {pct}',
  'failed': 'Could not work this out.',
  /** A link-style button after "failed" */
  'retry': 'Try again',

  // ---- the summary above the grid: one line per group of months ----
  /** The label of a summary line that covers every month */
  'months.all': 'All year',
  /** The label of a summary line for three or more months in a row, e.g. "June to August", "November to February" */
  'months.range': '{from} to {to}',
  /** After a months label. {dir} is one of the "dir.*" phrases, e.g. "to the south" */
  'sum.none.building': 'No direct sun: the buildings {dir} block it all day.',
  'sum.none.tree': 'No direct sun: trees {dir} shade it all day (dappled light).',
  'sum.none.mixed': 'No direct sun: buildings and trees {dir} shade it all day.',
  /** {from}, {to}: clock times, e.g. "9 AM", "3:30 PM" */
  'sum.sun.allDay': 'Direct sun from sunrise to sunset.',
  'sum.sun.fromSunrise': 'Direct sun from sunrise to about {to}.',
  'sum.sun.toSunset': 'Direct sun from about {from} until sunset.',
  'sum.sun.window': 'Direct sun from about {from} to {to}.',
  'sum.sun.two': 'Direct sun from about {from} to {to}, and again from about {from2} to {to2}.',
  'sum.sun.patchy': 'Direct sun on and off between about {from} and {to}.',
  /** Follows the "Direct sun from…" sentence: what shades the spot before the sun reaches it */
  'sum.before.building': 'Before that, shade from the buildings {dir}.',
  'sum.before.tree': 'Before that, dappled shade from trees {dir}.',
  'sum.before.mixed': 'Before that, shade from buildings and trees {dir}.',
  /** Between the two spells of sun in "sum.sun.two" */
  'sum.between.building': 'In between, shade from the buildings {dir}.',
  'sum.between.tree': 'In between, dappled shade from trees {dir}.',
  'sum.between.mixed': 'In between, shade from buildings and trees {dir}.',
  /** After the last spell of sun */
  'sum.after.building': 'After that, shade from the buildings {dir}.',
  'sum.after.tree': 'After that, dappled shade from trees {dir}.',
  'sum.after.mixed': 'After that, shade from buildings and trees {dir}.',
  /** Where the shade comes from (the side the sun is on while something blocks it). Used as {dir} above and below. */
  'dir.0': 'to the north',
  'dir.1': 'to the northeast',
  'dir.2': 'to the east',
  'dir.3': 'to the southeast',
  'dir.4': 'to the south',
  'dir.5': 'to the southwest',
  'dir.6': 'to the west',
  'dir.7': 'to the northwest',
  /** Small print under the summary */
  'sum.note': 'A typical day: direct sun when it reaches the spot on at least half of the days. Facts from the sun and the City\'s buildings and trees, not advice.',

  // ---- the grid ----
  /** Screen-reader name of the grid */
  'grid.label': 'Sun and shade at this spot by month (rows) and time of day (columns)',
  'grid.labelLot': 'Share of the lot in direct sun by month (rows) and time of day (columns)',
  /** How to use the grid (mouse/touch and keyboard) */
  'grid.how': 'Click or tap a square to see that moment in the 3D view (on the 15th of the month). Keyboard: arrow keys move, Enter shows it.',
  /** One square, described: {month} "June", {from} {to} clock times */
  'cell.when': '{month}, {from} to {to}',
  /** {when} = "cell.when"; {parts} = a list of the "cell.*" pieces below, e.g. "direct sun 70% of the time and shade from the buildings to the west 30% of the time" */
  'cell.line': '{when}: {parts}.',
  /** {pct} already formatted, e.g. "70%" */
  'cell.sun': 'direct sun {pct} of the time',
  'cell.tree': 'dappled shade from trees {dir} {pct} of the time',
  'cell.building': 'shade from the buildings {dir} {pct} of the time',
  'cell.night': 'sun down {pct} of the time',
  'cell.dark': '{when}: the sun is down.',
  /** Whole-lot mode */
  'cell.lot': '{when}: about {pct} of the lot in direct sun.',
  /** Added to a square's description when it is the moment the 3D view shows */
  'cell.now': '(shown in 3D now)',
  /** Status after a square was clicked: {date} "June 15", {time} "3:15 PM" */
  'applied': 'The 3D view now shows {date} at {time}.',

  // ---- legend ----
  'legend.sun': 'Direct sun',
  'legend.tree': 'Dappled: through tree leaves or bare branches',
  'legend.building': 'Shade from a building',
  'legend.night': 'Sun down',
  'legend.now': 'The date and time the 3D view shows',
  'legend.split': 'A square in two colors changes from day to day: each color\'s share is how often.',
  /** Whole-lot mode: a colour bar from "none" to "all" */
  'legend.lot': 'Share of the lot in direct sun:',
  'legend.lotNone': 'none',
  'legend.lotAll': 'all',

  // ---- the table alternative ----
  'table.show': 'Show as a table',
  'table.month': 'Month',
  'table.up': 'Sun is up',
  'table.sun': 'Direct sun',
  'table.tree': 'Dappled',
  'table.building': 'Building shade',
  /** Whole-lot table columns */
  'table.half': 'Half the lot or more in sun',
  'table.best': 'Most sun',
  /** "45% at 1 PM" */
  'table.bestAt': '{pct} at {time}',
  /** An empty table cell */
  'table.none': 'none',
  /** A span of clock time, e.g. "9 AM – 3 PM" */
  'time.range': '{from} – {to}',

  /** Small print at the end */
  'assume':
    'Worked out the same way as the chart above: direct sun only; buildings near and far, trees by season, the slope of the ground. A typical day averages {days} days of the month at three moments in each half-hour ({lotDays} days and two moments for the whole lot). Times are Philadelphia clock time, with daylight saving.',
});

import { useStore } from '@nanostores/preact';
import { useState } from 'preact/hooks';
import { $project, getExtra, setExtra } from '../../lib/project';
import { monthName } from './dates';
import { downloadIcs } from './ics';
import {
  categoryLabel,
  taskLabel,
  blankStewardship,
  instancesForMonth,
  isChecked,
  setChecked,
  stewardshipToIcsEvents,
  type StewardshipState,
} from './stewardship';
import schedule from '../../i18n/messages/en/schedule.ts';
import { getT } from '../../i18n/t.ts';

const EXTRA_KEY = 'stewardship';
const THIS_YEAR = new Date().getFullYear();
const THIS_MONTH = new Date().getMonth();

function current(): StewardshipState {
  return getExtra<StewardshipState>(EXTRA_KEY) ?? blankStewardship();
}

/** Reads the freshest saved state rather than one captured at render time, so two checkbox
 * clicks in quick succession (before a re-render lands) don't clobber each other. */
function update(fn: (state: StewardshipState) => StewardshipState) {
  setExtra(EXTRA_KEY, fn(current()));
}

export default function StewardshipCalendarIsland() {
  const t = getT(undefined, schedule);
  const project = useStore($project);
  const state = (project.extra[EXTRA_KEY] as StewardshipState | undefined) ?? blankStewardship();
  const [year, setYear] = useState(THIS_YEAR);
  const [openMonth, setOpenMonth] = useState<number | null>(THIS_MONTH);

  const total = Array.from({ length: 12 }, (_, m) => instancesForMonth(m)).flat().length;
  const done = Object.keys(state.years[String(year)] ?? {}).length;

  const onToggle = (key: string, checked: boolean) => update((s) => setChecked(s, year, key, checked));

  const onDownload = () =>
    downloadIcs(`park-stewardship-${year}.ics`, t('ics.stewardCalendar', { year: String(year) }), stewardshipToIcsEvents(year, t.locale));

  return (
    <div class="stewardship-calendar">
      <div class="steward-toolbar no-print">
        <div class="year-switch">
          <button type="button" class="btn btn-small" onClick={() => setYear((y) => y - 1)} aria-label={t('calendar.prevYear')}>
            {t('calendar.prev')}
          </button>
          <strong>{year}</strong>
          <button type="button" class="btn btn-small" onClick={() => setYear((y) => y + 1)} aria-label={t('calendar.nextYear')}>
            {t('calendar.next')}
          </button>
        </div>
        <span class="steward-progress">{t('calendar.progress', { done, total, year: String(year) })}</span>
        <div class="steward-actions">
          <button type="button" class="btn btn-primary btn-small" onClick={onDownload}>
            {t('calendar.download')}
          </button>
          <button type="button" class="btn btn-small" onClick={() => window.print()}>
            {t('calendar.print')}
          </button>
        </div>
      </div>

      <div class="month-grid">
        {Array.from({ length: 12 }, (_, m) => {
          const name = monthName(m, t.locale);
          const items = instancesForMonth(m);
          const isCurrent = year === THIS_YEAR && m === THIS_MONTH;
          const isOpen = openMonth === m;
          const monthDone = items.filter((it) => isChecked(state, year, it.key)).length;
          return (
            <section class={`month-card${isCurrent ? ' is-current' : ''}`} key={m}>
              <button
                type="button"
                class="month-head"
                aria-expanded={isOpen}
                onClick={() => setOpenMonth(isOpen ? null : m)}
              >
                <span>
                  {name}
                  {isCurrent && <span class="current-badge">{t('calendar.now')}</span>}
                </span>
                <span class="month-count">{t('calendar.monthCount', { done: monthDone, total: items.length })}</span>
              </button>
              <ul class={`task-list${isOpen ? '' : ' is-collapsed'}`}>
                {items.map((it) => (
                  <li key={it.key} class={`task-${it.category}`}>
                    <label class="check">
                      <input
                        type="checkbox"
                        checked={isChecked(state, year, it.key)}
                        onChange={(e) => onToggle(it.key, (e.currentTarget as HTMLInputElement).checked)}
                      />
                      <span>
                        <span class="task-category">{categoryLabel(it.category, t.locale)}</span>
                        {taskLabel(it, t.locale)}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <style>{`
        .stewardship-calendar { margin: 1.5em 0; }
        .steward-toolbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; margin-bottom: 1em; }
        .year-switch { display: flex; align-items: center; gap: 10px; font-size: 1.1rem; }
        .steward-progress { color: var(--muted); font-size: 0.9rem; }
        .steward-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .month-grid { display: grid; gap: 10px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
        .month-card { border: 1px solid var(--line); border-radius: var(--radius); background: #fff; overflow: hidden; }
        .month-card.is-current { border-color: var(--cyan); box-shadow: 0 0 0 2px var(--cyan-wash); }
        .month-head { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 12px 14px; border: 0; background: none; font: inherit; font-weight: 700; cursor: pointer; text-align: start; }
        .current-badge { margin-inline-start: 0.5em; font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--cyan-ink); border: 1px solid var(--cyan-ink); border-radius: 999px; padding: 0.1em 0.5em; }
        .month-count { font-weight: 400; color: var(--muted); font-size: 0.85rem; }
        .task-list { list-style: none; margin: 0; padding: 0 14px 12px; display: grid; gap: 6px; }
        .task-list.is-collapsed { display: none; }
        .task-list .check { font-size: 0.88rem; }
        .task-category { display: block; font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
        .task-survive .task-category { color: var(--ok); }
        .task-thrive .task-category { color: var(--cyan-ink); }
        .task-socialize .task-category { color: #8e1f6b; }
        @media print {
          .no-print { display: none !important; }
          .month-card { break-inside: avoid; }
          .task-list.is-collapsed { display: grid; }
        }
      `}</style>
    </div>
  );
}

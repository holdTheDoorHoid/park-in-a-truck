// The Sustain workbook's Survive / Thrive / Socialize calendars and the toolkit's Park
// Stewardship Annual Workplan, combined into one month-by-month task list. Months are
// 0-indexed (0 = January) to match JS Date. Socialize entries are the workbook's own
// suggestions ("entirely up to you") rather than obligations.

import type { IcsEvent } from './ics';
import { addDaysISO } from './dates';
import schedule from '../../i18n/messages/en/schedule.ts';
import { getT } from '../../i18n/t.ts';
import type { Locale } from '../../i18n/locales.ts';

export type StewardCategory = 'survive' | 'thrive' | 'socialize';

export interface StewardTask {
  id: string;
  label: string;
  category: StewardCategory;
  /** 0 = January … 11 = December; one checklist row per month listed here */
  months: number[];
  /** day of month used for the .ics reminder (display is month-only) */
  day?: number;
}

/** English names of the three calendars (categoryLabel() gives them in the reader's language). */
export const CATEGORY_LABEL: Record<StewardCategory, string> = {
  survive: 'Survive',
  thrive: 'Thrive',
  socialize: 'Socialize',
};

type ScheduleKey = keyof typeof schedule.messages;

/** "Survive" / "Thrive" / "Socialize" in the reader's language (default: the page's). */
export const categoryLabel = (c: StewardCategory, locale?: Locale | string) => getT(locale, schedule)(`category.${c}`);

/** A task's words in the reader's language (TASKS keep the English; keys "task.<id>"). */
export function taskLabel(task: { taskId?: string; id?: string; label: string }, locale?: Locale | string): string {
  const key = `task.${task.taskId ?? task.id}` as ScheduleKey;
  return key in schedule.messages ? getT(locale, schedule)(key) : task.label;
}

export const TASKS: StewardTask[] = [
  // ---- Survive (critical) -------------------------------------------------
  { id: 'water-weekly', label: 'Water weekly — soak 3 hrs or water by hand, 6–8" deep', category: 'survive', months: [3, 4, 5, 6, 7, 8, 9] },
  { id: 'weed-weekly', label: 'Weed weekly (pull, or spray with 20% vinegar)', category: 'survive', months: [3, 4, 5, 6, 7, 8, 9], day: 15 },
  { id: 'monthly-inspection', label: 'Monthly inspection — pests, weeds, mulch, dead plants, trash', category: 'survive', months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  { id: 'rake-beds', label: 'Lightly rake out beds', category: 'survive', months: [2] },
  { id: 'cutback-perennials', label: 'Cut back unsightly perennials', category: 'survive', months: [2] },
  { id: 'preemergent-spring', label: 'Apply pre-emergent; spray weeds with 20% vinegar', category: 'survive', months: [2] },
  { id: 'mulch-spring', label: 'Mulch beds — 2–3" deep, donut around trees, not touching trunks', category: 'survive', months: [2, 3] },
  { id: 'annuals-spring', label: 'Add pansies / cool-season annuals for early color', category: 'survive', months: [2, 3] },
  { id: 'prune-evergreens', label: 'Prune evergreen shrubs', category: 'survive', months: [7] },
  { id: 'preemergent-summer', label: 'Apply pre-emergent; spray weeds with 20% vinegar', category: 'survive', months: [7] },
  { id: 'inspect-weeds-fall', label: 'Inspect plant areas to make sure weeds are eradicated', category: 'survive', months: [9] },
  { id: 'prune-dormant', label: 'Prune shrubs & trees after leaves fall (leave perennial stems for pollinators)', category: 'survive', months: [10] },
  { id: 'mulch-fall', label: 'Mulch beds, or plan to mulch in spring', category: 'survive', months: [10] },
  { id: 'water-trees-fall', label: 'Water trees deeply before the ground freezes', category: 'survive', months: [10] },
  // ---- Thrive (optional extra effort) -------------------------------------
  { id: 'seed-catalogs', label: 'Browse seed catalogs', category: 'thrive', months: [0] },
  { id: 'order-seeds', label: 'Order seeds for veggies and annuals', category: 'thrive', months: [1] },
  { id: 'start-seeds', label: 'Start seeds indoors for an edible garden', category: 'thrive', months: [2] },
  { id: 'fertilize-bulbs', label: 'Fertilize bulbs, 4–6 weeks before anticipated bloom', category: 'thrive', months: [2] },
  { id: 'buy-annuals', label: 'Buy desired annual flowers', category: 'thrive', months: [3] },
  { id: 'plant-seedlings', label: 'Transfer seedlings to planters once weather warms', category: 'thrive', months: [4] },
  { id: 'plant-annuals', label: 'Plant annuals (April if warm, June if cool)', category: 'thrive', months: [3, 5] },
  { id: 'deadhead-bulbs', label: 'Deadhead bulb flowers after bloom', category: 'thrive', months: [4] },
  { id: 'remove-bulb-foliage', label: 'Remove bulb foliage once it has turned yellow', category: 'thrive', months: [5] },
  { id: 'order-bulbs', label: 'Order bulbs; store in a cool, dry space', category: 'thrive', months: [8] },
  { id: 'plant-bulbs', label: 'Plant bulbs (between Halloween & Thanksgiving)', category: 'thrive', months: [9, 10] },
  // ---- Socialize (ideas, not obligations) ---------------------------------
  { id: 'info-meeting', label: 'Park information meeting (idea)', category: 'socialize', months: [1, 4, 7, 10] },
  { id: 'bird-watching', label: 'Bird-watching event (idea)', category: 'socialize', months: [2] },
  { id: 'earth-day', label: 'Earth Day celebration (idea)', category: 'socialize', months: [3] },
  { id: 'community-cleanup', label: 'Community clean-up (idea)', category: 'socialize', months: [3, 9] },
  { id: 'nature-camp', label: 'Summer nature camp (idea)', category: 'socialize', months: [6] },
  { id: 'ribbon-cutting', label: 'Ribbon cutting (idea)', category: 'socialize', months: [6] },
];

export interface TaskInstance {
  key: string;
  taskId: string;
  month: number;
  label: string;
  category: StewardCategory;
  day: number;
}

export function instancesForMonth(month: number): TaskInstance[] {
  return TASKS.filter((t) => t.months.includes(month)).map((t) => ({
    key: `${t.id}:${month}`,
    taskId: t.id,
    month,
    label: t.label,
    category: t.category,
    day: t.day ?? 1,
  }));
}

export function allInstances(): TaskInstance[] {
  return Array.from({ length: 12 }, (_, m) => instancesForMonth(m)).flat();
}

// ---- saved state (project.extra.stewardship) -------------------------------

export interface StewardshipState {
  v: 1;
  /** calendar year (as a string key) -> instance key -> checked */
  years: Record<string, Record<string, boolean>>;
}

export function blankStewardship(): StewardshipState {
  return { v: 1, years: {} };
}

export function isChecked(state: StewardshipState, year: number, key: string): boolean {
  return Boolean(state.years[String(year)]?.[key]);
}

export function setChecked(state: StewardshipState, year: number, key: string, checked: boolean): StewardshipState {
  const y = String(year);
  const yearMap = { ...(state.years[y] ?? {}) };
  if (checked) yearMap[key] = true;
  else delete yearMap[key];
  return { ...state, years: { ...state.years, [y]: yearMap } };
}

// ---- .ics export: one yearly-recurring reminder per task occurrence --------

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Yearly reminders, worded in `locale` (default: the page's language). */
export function stewardshipToIcsEvents(year: number, locale?: Locale | string): IcsEvent[] {
  const t = getT(locale, schedule);
  return allInstances().map((inst) => {
    const start = `${year}-${pad2(inst.month + 1)}-${pad2(inst.day)}`;
    return {
      uid: `steward-${inst.key}`,
      summary: t('ics.stewardEvent', { category: categoryLabel(inst.category, t.locale), task: taskLabel(inst, t.locale) }),
      start,
      endExclusive: addDaysISO(start, 1),
      yearly: true,
    };
  });
}

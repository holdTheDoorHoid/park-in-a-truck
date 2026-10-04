// The eight Create-step phases, in order — each roughly a weekend's work.
// Ids are permanent (used as keys in project.extra.buildSchedule.overrides).
// `title`/`blurb` are the English words; phaseText() gives them in the reader's language
// (keys "phase.<id>.title" / "phase.<id>.blurb" in src/i18n/messages/<lang>/schedule.ts).

import schedule from '../../i18n/messages/en/schedule.ts';
import { getT } from '../../i18n/t.ts';
import type { Locale } from '../../i18n/locales.ts';

export interface PhaseDef {
  id: string;
  /** English (the schedule catalog's "phase.<id>.title"); phaseText() gives the reader's language */
  title: string;
  blurb: string;
}

type ScheduleKey = keyof typeof schedule.messages;
const PHASE_IDS = ['organize', 'prepare-lot', 'layout-gravel', 'install-edge', 'spread-topsoil', 'plant', 'install-gravel', 'install-elements'];
const en = (key: string) => String(schedule.messages[key as ScheduleKey] ?? key);

export const PHASES: PhaseDef[] = PHASE_IDS.map((id) => ({ id, title: en(`phase.${id}.title`), blurb: en(`phase.${id}.blurb`) }));

/** A phase's title and blurb in the reader's language (default: the page's). */
export function phaseText(phase: PhaseDef, locale?: Locale | string): { title: string; blurb: string } {
  const t = getT(locale, schedule);
  return { title: t(`phase.${phase.id}.title` as ScheduleKey), blurb: t(`phase.${phase.id}.blurb` as ScheduleKey) };
}

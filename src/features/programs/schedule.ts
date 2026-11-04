import type { ProgramWeek } from './types';

/** Where "today" falls inside a programme, derived from its Monday start date. */
export interface ProgramPosition {
  week: number;
  day: number; // 1 (Mon) – 7 (Sun)
  finished: boolean;
}

export interface CompDayInfo {
  dayName: string;
  date: string; // YYYY-MM-DD
  daysAway: number;
}

interface YMD {
  y: number;
  m: number; // 1–12
  d: number;
}

function parseYMD(dateStr: string): YMD {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { y, m, d };
}

/** Local calendar-date parts of `date` — never the UTC-shifted equivalent. */
function toYMD(date: Date): YMD {
  return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() };
}

function formatYMD({ y, m, d }: YMD): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Whole calendar days between two Y/M/D triples (b - a). Uses Date.UTC purely
 * as day-counting arithmetic (no real-world instant/timezone involved), so
 * the result can't be perturbed by local DST transitions.
 */
function daysBetween(a: YMD, b: YMD): number {
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000);
}

/** Adds whole calendar days to a Y/M/D triple, handling month/year rollover. */
function addDays(parts: YMD, days: number): YMD {
  const t = Date.UTC(parts.y, parts.m - 1, parts.d) + days * 86_400_000;
  const d = new Date(t);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
}

/**
 * Monday of `date`'s local calendar week, as YYYY-MM-DD. Pure local-date
 * arithmetic (getFullYear/getMonth/getDate — never toISOString, which would
 * convert to UTC and can shift the day in positive-offset timezones).
 */
export function mondayOf(date: Date): string {
  const dow = (date.getDay() + 6) % 7; // Mon=0 … Sun=6
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - dow);
  return formatYMD(toYMD(monday));
}

/**
 * The Monday start date that puts `today` in week `weekPosition`: this
 * week's Monday, moved back a week per week already done. Days stay on
 * their weekdays (day 1 is always a Monday), so the week is the one thing
 * a lifter can move.
 */
export function startDateForWeek(today: Date, weekPosition: number): string {
  const monday = parseYMD(mondayOf(today));
  return formatYMD(addDays(monday, -(Math.max(1, weekPosition) - 1) * 7));
}

/**
 * Maps `today` onto the programme's week/day grid, where `startDate` is the
 * Monday of week 1 day 1. Clamped to a week-1-day-1 "preview" before the
 * programme starts, and to the last week (day 7, finished) once it's over.
 */
export function currentProgramPosition(
  startDate: string,
  today: Date,
  totalWeeks: number,
): ProgramPosition {
  const offset = daysBetween(parseYMD(startDate), toYMD(today));

  if (offset < 0) return { week: 1, day: 1, finished: false };

  const week = Math.floor(offset / 7) + 1;
  const day = (offset % 7) + 1;

  if (week > totalWeeks) return { week: totalWeeks, day: 7, finished: true };
  return { week, day, finished: false };
}

/**
 * The next comp-kind day at or after `position` (week/day order), with its
 * calendar date and how many days away from `today` it is. `weeks` need not
 * be in any particular order; day/week `position` fields are what's compared.
 */
export function nextCompDay(
  weeks: ProgramWeek[],
  position: { week: number; day: number },
  startDate: string,
  today: Date,
): CompDayInfo | null {
  const candidates = weeks
    .flatMap((week) =>
      week.days
        .filter((day) => day.kind === 'comp')
        .map((day) => ({ week: week.position, day: day.position, name: day.name })),
    )
    .filter((c) => c.week > position.week || (c.week === position.week && c.day >= position.day))
    .sort((a, b) => a.week - b.week || a.day - b.day);

  const next = candidates[0];
  if (!next) return null;

  const compDate = addDays(parseYMD(startDate), (next.week - 1) * 7 + (next.day - 1));

  return {
    dayName: next.name,
    date: formatYMD(compDate),
    daysAway: daysBetween(toYMD(today), compDate),
  };
}

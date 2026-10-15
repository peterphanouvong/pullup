import type { DayKind, ProgramWeek } from './types';

/** Calendar maths for the Programme calendar. All local-calendar: dates are
 * `YYYY-MM-DD` keys built from getFullYear/getMonth/getDate and day steps
 * use `setDate`, never `toISOString` (see the Dates section of the guide). */

export interface CalendarCell {
  /** YYYY-MM-DD, local. */
  key: string;
  dayOfMonth: number;
  /** False for the leading/trailing days that pad the grid to full weeks. */
  inMonth: boolean;
}

/** A local Date's calendar key. */
export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parses a YYYY-MM-DD key into a local midnight Date. */
export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** The local calendar day an instant (an ISO timestamp) falls on. */
export function localDayOf(iso: string): string {
  return dateKey(new Date(iso));
}

/** Full Monday-first weeks covering `month` (0-11) of `year`: padded with
 * the neighbouring months' days so every row has seven cells. */
export function monthGrid(year: number, month: number): CalendarCell[][] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // Mon=0 … Sun=6
  const cursor = new Date(year, month, 1 - lead);
  const weeks: CalendarCell[][] = [];
  do {
    const week: CalendarCell[] = [];
    for (let i = 0; i < 7; i++) {
      week.push({ key: dateKey(cursor), dayOfMonth: cursor.getDate(), inMonth: cursor.getMonth() === month });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  } while (cursor.getMonth() === month);
  return weeks;
}

export interface PlannedDay {
  weekPosition: number;
  weekName: string;
  dayId: string;
  dayName: string;
  kind: DayKind;
}

/** What the programme has on `key`, given its Monday `startDate`: the day
 * at that offset, or null outside the programme's span (or for a gap in
 * the plan). */
export function plannedDayOn(key: string, startDate: string, weeks: ProgramWeek[]): PlannedDay | null {
  const offset = Math.round((fromKey(key).getTime() - fromKey(startDate).getTime()) / 86_400_000);
  if (offset < 0) return null;
  const weekPosition = Math.floor(offset / 7) + 1;
  const dayPosition = (offset % 7) + 1;
  const week = weeks.find((w) => w.position === weekPosition);
  const day = week?.days.find((d) => d.position === dayPosition);
  if (!week || !day) return null;
  return { weekPosition, weekName: week.name, dayId: day.id, dayName: day.name, kind: day.kind };
}

/** Moves a (year, month) pair by `delta` months. */
export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

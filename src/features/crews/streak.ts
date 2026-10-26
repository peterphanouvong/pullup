import { dateKey, fromKey, localDayOf } from '@/features/programs/calendar';
import { mondayOf } from '@/features/programs/schedule';

/**
 * Consecutive weeks, ending now, with at least `target` sessions. The
 * current week counts once it's met and never breaks the run before it's
 * over, so a streak only ends when a whole week is missed. Mirrors
 * `week_streak()` on the server, which does the same for crewmates.
 */
export function weekStreak(sessionStartIsos: string[], target: number, now: Date): number {
  const counts = new Map<string, number>();
  for (const iso of sessionStartIsos) {
    const monday = mondayOf(fromKey(localDayOf(iso)));
    counts.set(monday, (counts.get(monday) ?? 0) + 1);
  }
  let streak = 0;
  let cursor = fromKey(mondayOf(now));
  for (let i = 0; i < 520; i++) {
    const n = counts.get(mondayOf(cursor)) ?? 0;
    if (n >= target) streak++;
    else if (i > 0) break;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 7);
  }
  return streak;
}

/** Monday-first flags for the local week containing `now`: whether each
 * day had a session. The celebration's row of seven dots. */
export function trainedDaysThisWeek(sessionStartIsos: string[], now: Date): boolean[] {
  const monday = fromKey(mondayOf(now));
  const days = new Set(sessionStartIsos.map(localDayOf));
  return Array.from({ length: 7 }, (_, i) =>
    days.has(dateKey(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i))),
  );
}

/** Sessions started in the local week containing `now`. */
export function sessionsThisWeek(sessionStartIsos: string[], now: Date): number {
  const monday = mondayOf(now);
  return sessionStartIsos.filter((iso) => mondayOf(fromKey(localDayOf(iso))) === monday).length;
}

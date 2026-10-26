/**
 * Number and date text for profiles and stats. Hand-rolled rather than
 * `toLocaleString`, the same as the rest of the app: Hermes may ship
 * without the ICU data those need.
 */

import type { ExerciseBest } from '@/features/stats/stats';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** 5895 → "5,895". */
export function thousands(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** "45min", "1h 5min". */
export function shortDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

/** "13 Oct", from an ISO instant or a YYYY-MM-DD key, in local time. */
export function dayMonth(isoOrKey: string): string {
  const d = isoOrKey.length === 10 ? new Date(`${isoOrKey}T00:00:00`) : new Date(isoOrKey);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "Today", "Yesterday", or "Thursday, 4 Sep". */
export function sessionDate(iso: string, now: Date): string {
  const d = new Date(iso);
  const days = Math.round(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86_400_000,
  );
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** A kg figure without trailing noise: 102.5 stays, 100.0 is 100. */
export function kg(n: number): string {
  return `${Math.round(n * 10) / 10} kg`;
}

/** The headline best for an exercise, in whichever unit it's logged. */
export function bestLabel(best: ExerciseBest): string {
  if (best.heaviest != null) {
    return best.heaviest.reps != null ? `${kg(best.heaviest.weightKg)} × ${best.heaviest.reps}` : kg(best.heaviest.weightKg);
  }
  if (best.longest != null) return `${best.longest.seconds} s`;
  if (best.mostReps != null) return `${best.mostReps.reps} reps`;
  return '—';
}

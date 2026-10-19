import { dateKey, fromKey, localDayOf } from '@/features/programs/calendar';
import { stripWeekdayPrefix } from '@/features/programs/labels';

/** The three reactions. Preset, so nothing typed ever reaches a crewmate. */
export const REACTIONS = ['🔥', '💪', '👏'] as const;
export type Reaction = (typeof REACTIONS)[number];

export interface CheckinReaction {
  userId: string;
  displayName: string;
  emoji: Reaction;
}

/** A finished session as the crew sees it. */
export interface Checkin {
  workoutId: string;
  userId: string;
  displayName: string;
  /** The programme day's name, or null for a session off the plan. */
  dayName: string | null;
  startedAt: string;
  finishedAt: string;
  completedSets: number;
  reactions: CheckinReaction[];
}

export interface RawCheckinRow {
  workout_id: string;
  user_id: string;
  display_name: string;
  day_name: string | null;
  started_at: string;
  finished_at: string;
  completed_sets: number;
  reactions: { user_id: string; display_name: string; emoji: string }[];
}

export function toCheckin(row: RawCheckinRow): Checkin {
  return {
    workoutId: row.workout_id,
    userId: row.user_id,
    displayName: row.display_name,
    dayName: row.day_name,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    completedSets: row.completed_sets,
    reactions: row.reactions
      .filter((r): r is RawCheckinRow['reactions'][number] & { emoji: Reaction } =>
        (REACTIONS as readonly string[]).includes(r.emoji),
      )
      .map((r) => ({ userId: r.user_id, displayName: r.display_name, emoji: r.emoji })),
  };
}

/** The feed covers the last seven days, so Monday morning isn't empty. */
export function feedRange(now: Date): { fromIso: string; toIso: string } {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { fromIso: from.toISOString(), toIso: to.toISOString() };
}

/** "You finished Upper A" / "Bea finished a workout". */
export function checkinHeadline(checkin: Checkin, myUserId: string): string {
  const who = checkin.userId === myUserId ? 'You' : checkin.displayName;
  const what = checkin.dayName != null ? stripWeekdayPrefix(checkin.dayName) : 'a workout';
  return `${who} finished ${what}`;
}

/** "Today · 48 min · 14 sets". */
export function checkinDetail(checkin: Checkin, now: Date): string {
  const minutes = Math.max(
    1,
    Math.round((new Date(checkin.finishedAt).getTime() - new Date(checkin.startedAt).getTime()) / 60_000),
  );
  const sets = checkin.completedSets === 1 ? '1 set' : `${checkin.completedSets} sets`;
  return `${dayLabel(localDayOf(checkin.finishedAt), now)} · ${minutes} min · ${sets}`;
}

/** Today, Yesterday, else the weekday. */
export function dayLabel(key: string, now: Date): string {
  const today = dateKey(now);
  if (key === today) return 'Today';
  const yesterday = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  if (key === yesterday) return 'Yesterday';
  return fromKey(key).toLocaleDateString(undefined, { weekday: 'long' });
}

/** Your own reaction on a check-in, if any. */
export function myReaction(checkin: Checkin, myUserId: string): Reaction | null {
  return checkin.reactions.find((r) => r.userId === myUserId)?.emoji ?? null;
}

/** The feed with `myUserId`'s reaction on `workoutId` set to `emoji` (or
 * removed when null): what the list shows while the server catches up. */
export function withMyReaction(feed: Checkin[], workoutId: string, myUserId: string, myName: string, emoji: Reaction | null): Checkin[] {
  return feed.map((c) => {
    if (c.workoutId !== workoutId) return c;
    const others = c.reactions.filter((r) => r.userId !== myUserId);
    return {
      ...c,
      reactions: emoji == null ? others : [...others, { userId: myUserId, displayName: myName, emoji }],
    };
  });
}

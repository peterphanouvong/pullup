import { dateKey, fromKey, localDayOf } from '@/features/programs/calendar';
import { mondayOf } from '@/features/programs/schedule';

/** The crew's week runs Monday to Sunday on the viewer's own calendar. */
export interface CrewWeekRange {
  /** Local YYYY-MM-DD of each day, Monday first. */
  days: string[];
  /** The instants bounding the week, for the server query: [from, to). */
  fromIso: string;
  toIso: string;
}

export function crewWeekRange(today: Date): CrewWeekRange {
  const monday = fromKey(mondayOf(today));
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(dateKey(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)));
  }
  const nextMonday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7);
  return { days, fromIso: monday.toISOString(), toIso: nextMonday.toISOString() };
}

export interface CrewMemberWeek {
  userId: string;
  displayName: string;
  joinedAt: string;
  /** Local days (YYYY-MM-DD) with at least one finished session. */
  trainedDays: Set<string>;
  sessionCount: number;
}

export interface RawCrewWeekRow {
  user_id: string;
  display_name: string;
  joined_at: string;
  session_starts: string[];
}

export function toMemberWeek(row: RawCrewWeekRow): CrewMemberWeek {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    joinedAt: row.joined_at,
    trainedDays: new Set(row.session_starts.map(localDayOf)),
    sessionCount: row.session_starts.length,
  };
}

/** You first, then whoever's trained most this week, then who joined
 * first — so the order is stable when everyone's level. */
export function orderMembers(members: CrewMemberWeek[], myUserId: string): CrewMemberWeek[] {
  return [...members].sort((a, b) => {
    if (a.userId === myUserId) return -1;
    if (b.userId === myUserId) return 1;
    if (a.sessionCount !== b.sessionCount) return b.sessionCount - a.sessionCount;
    return a.joinedAt.localeCompare(b.joinedAt);
  });
}

/** Six characters from the server's alphabet; anything else can't be a
 * code, so there's no point asking the server. */
export function normaliseInviteCode(raw: string): string | null {
  const code = raw.replace(/\s+/g, '').toUpperCase();
  return /^[A-HJKMNP-Z2-9]{6}$/.test(code) ? code : null;
}

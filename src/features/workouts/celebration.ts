/**
 * Copy for the post-workout celebration.
 *
 * The point of difference: Pull Up isn't a general gym log, it's an 8-week
 * peak aimed at one competition. So the headline doesn't say "nice work" —
 * it says where this session puts you in that peak. Programme context first,
 * generic praise only as the fallback for an unplanned session.
 */

export interface CelebrationContext {
  /** Lifting sessions completed in the viewed week, this one included. */
  sessionsDone: number;
  /** Lifting sessions the week prescribes; 0 for an unplanned workout. */
  sessionsPlanned: number;
  /** Days until the next competition day, or null when none is scheduled. */
  daysToComp: number | null;
}

export interface CelebrationCopy {
  /** The shout — short, earned, never exclamation-stacked. */
  headline: string;
  /** The context line under it. */
  detail: string;
}

export function celebrationCopy(context: CelebrationContext): CelebrationCopy {
  const { sessionsDone, sessionsPlanned, daysToComp } = context;

  const headline =
    sessionsPlanned > 0 && sessionsDone >= sessionsPlanned ? 'Week complete' : 'Session logged';

  // The most specific true thing wins: finishing the week beats a countdown,
  // a countdown beats a plain tally, a tally beats nothing.
  if (sessionsPlanned > 0 && sessionsDone >= sessionsPlanned) {
    return {
      headline,
      detail:
        daysToComp != null
          ? `All ${sessionsPlanned} sessions done. ${formatCountdown(daysToComp)}`
          : `All ${sessionsPlanned} sessions done.`,
    };
  }

  if (sessionsPlanned > 0) {
    return {
      headline,
      detail: `${sessionsDone} of ${sessionsPlanned} this week${
        daysToComp != null ? `. ${formatCountdown(daysToComp)}` : ''
      }`,
    };
  }

  return {
    headline,
    detail: daysToComp != null ? formatCountdown(daysToComp) : 'Off-programme, still counts.',
  };
}

/** "Comp day" / "1 day to comp" / "4 days to comp" — never "0 days". */
export function formatCountdown(daysToComp: number): string {
  if (daysToComp <= 0) return 'Comp day.';
  return `${daysToComp} day${daysToComp === 1 ? '' : 's'} to comp.`;
}

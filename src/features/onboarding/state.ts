import { observable } from '@legendapp/state';
import type { ProgramPlan } from '@/features/programs/plan';
import type { Draft } from './questions';

/**
 * The interview in flight. In memory only: an interview is a few minutes,
 * and starting over after the app is killed is cheaper than reconciling a
 * half-answered draft with questions that may have changed.
 */
export const draft$ = observable<Draft>({});

/** The built programme: the plan as returned, and the instance it was
 * written to. The reveal screen reads this; "change something" reworks it. */
export const proposal$ = observable<{ plan: ProgramPlan; programId: string } | null>(null);

export function resetOnboarding(): void {
  draft$.set({});
  proposal$.set(null);
}

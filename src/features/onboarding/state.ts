import { observable } from '@legendapp/state';
import type { ProgramPlan } from '@/features/programs/plan';
import { defaultDraft, type Draft } from './questions';

/**
 * The interview in flight. In memory only: an interview is a few minutes,
 * and starting over after the app is killed is cheaper than reconciling a
 * half-answered draft with questions that may have changed. Starts from
 * the defaults, so every question already has an answer to tap past.
 */
export const draft$ = observable<Draft>(defaultDraft());

/** The built programme: the plan as returned, and the instance it was
 * written to. The reveal screen reads this; "change something" reworks it. */
export const proposal$ = observable<{ plan: ProgramPlan; programId: string } | null>(null);

/** How the programme is coming: written by the coach from the interview,
 * or picked from the catalogue. Chosen on the welcome screen; the name and
 * sticker steps run either way, then the paths split. */
export const path$ = observable<'build' | 'browse'>('build');

export function resetOnboarding(): void {
  draft$.set(defaultDraft());
  proposal$.set(null);
  path$.set('build');
}

/** Starts a fresh build from a set of answers (an earlier programme's,
 * say), keeping the name: the interview opens with them already chosen. */
export function seedOnboarding(draft: Draft): void {
  const name = draft$.name.peek();
  draft$.set({ ...draft, name: draft.name ?? name });
  proposal$.set(null);
  path$.set('build');
}

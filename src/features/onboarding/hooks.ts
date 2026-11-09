import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/lib/auth';
import { seedDisplayName } from '@/features/account/api';
import { applyPlan, buildPlan, type BuildProgress } from './api';
import type { TrainingBrief } from './brief';
import { draft$, proposal$ } from './state';

/**
 * Build and apply in one go: the programme exists the moment the coach
 * answers, so the reveal shows what's really on the account and a
 * "change something" rewrites that same instance.
 */
export function useBuildProgram() {
  const session = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      brief,
      note,
      programId,
      onProgress,
    }: {
      brief: TrainingBrief;
      note: string | null;
      /** The instance to rework; null writes a new one. */
      programId: string | null;
      /** Called as the coach writes, for the waiting screen. */
      onProgress?: (progress: BuildProgress) => void;
    }) => {
      const plan = await buildPlan(brief, note, programId, onProgress);
      const id = await applyPlan(plan, brief, programId);
      return { plan, programId: id };
    },
    onSuccess: (result) => {
      proposal$.set(result);
      // A signed-in user's interview name becomes their crew name, unless
      // they already have one.
      const name = draft$.name.peek();
      if (name && !session.user.is_anonymous) {
        void seedDisplayName(session.user.id, name).then(() =>
          queryClient.invalidateQueries({ queryKey: ['profile', session.user.id] }),
        );
      }
      void queryClient.invalidateQueries({ queryKey: ['active-program', session.user.id] });
      void queryClient.invalidateQueries({ queryKey: ['programs'] });
      // A rework rewrites the brief alongside the plan.
      void queryClient.invalidateQueries({ queryKey: ['program-brief', result.programId] });
      void queryClient.invalidateQueries({ queryKey: ['program-history', session.user.id] });
    },
  });
}

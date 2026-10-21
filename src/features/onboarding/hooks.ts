import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/lib/auth';
import { seedDisplayName } from '@/features/account/api';
import { applyPlan, buildPlan } from './api';
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
    }: {
      brief: TrainingBrief;
      note: string | null;
      /** The instance to rework; null writes a new one. */
      programId: string | null;
    }) => {
      const plan = await buildPlan(brief, note, programId);
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
    },
  });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/lib/auth';
import { applyPlan, buildPlan } from './api';
import type { TrainingBrief } from './brief';
import { proposal$ } from './state';

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
      void queryClient.invalidateQueries({ queryKey: ['active-program', session.user.id] });
      void queryClient.invalidateQueries({ queryKey: ['programs'] });
    },
  });
}

import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { mondayOf } from '@/features/programs/schedule';
import { validatePlan, type ProgramPlan } from '@/features/programs/plan';
import type { TrainingBrief } from './brief';

/** Asks the coach for a programme. `programId` sends the caller's current
 * instance as context, for a change rather than a fresh write. */
export async function buildPlan(brief: TrainingBrief, note: string | null, programId: string | null): Promise<ProgramPlan> {
  const { data, error } = await supabase.functions.invoke('plan', {
    body: { brief, note, program_id: programId },
  });
  if (error) {
    // The function answers with a sentence written for the user; surface
    // that rather than "Edge Function returned a non-2xx status code".
    if (error instanceof FunctionsHttpError) {
      const body = (await error.context.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? error.message);
    }
    throw error;
  }
  // Once the function has started streaming it can only report a failure
  // in the body.
  const body = data as { plan?: unknown; error?: string } | null;
  if (body?.error) throw new Error(body.error);
  const check = validatePlan(body?.plan);
  if (!check.ok) throw new Error(`The program came back malformed (${check.reason}).`);
  return check.plan;
}

/** Writes the plan. With no `programId` a fresh instance is created and made
 * active, starting this Monday; with one, that instance is rewritten in
 * place. The brief rides along so a rework can read it. Returns the
 * instance id. */
export async function applyPlan(plan: ProgramPlan, brief: TrainingBrief, programId: string | null): Promise<string> {
  const { data, error } = await supabase.rpc('apply_program_plan', {
    p_program_id: programId,
    p_plan: { ...plan, brief },
    p_start_date: mondayOf(new Date()),
  });
  if (error) throw error;
  return data as string;
}

import { supabase } from '@/lib/supabase';
import { toProgram } from './mapping';
import { mondayOf } from './schedule';
import type { ActiveProgram, Program, ProgramSummary, RawProgram } from './types';

const PROGRAM_SELECT = `
  id, slug, name, summary, description,
  program_weeks (
    id, position, name, phase, description,
    program_days (
      id, position, name, kind, notes,
      day_exercises ( id, position, exercise_name, exercise_id, sets, reps, load, notes )
    )
  )
`;

/** The catalogue: templates only. A user's own instances are reached
 * through their active programme, not listed here. */
export async function fetchPrograms(): Promise<ProgramSummary[]> {
  const { data, error } = await supabase
    .from('programs')
    .select('id, slug, name, summary')
    .is('owner_id', null)
    .order('name');
  if (error) throw error;
  return data;
}

export async function fetchProgram(id: string): Promise<Program> {
  const { data, error } = await supabase
    .from('programs')
    .select(PROGRAM_SELECT)
    .eq('id', id)
    .single();
  if (error) throw error;
  return toProgram(data as unknown as RawProgram);
}

export async function fetchActiveProgram(userId: string): Promise<ActiveProgram | null> {
  const { data, error } = await supabase
    .from('user_programs')
    .select('program_id, start_date, programs ( template_id )')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  // PostgREST returns the to-one join as an object; typed loosely since the
  // client is untyped.
  const program = data.programs as unknown as { template_id: string | null } | null;
  return { programId: data.program_id, startDate: data.start_date, templateId: program?.template_id ?? null };
}

/** Selecting a template copies it into a private instance owned by the
 * caller and makes that the active programme (the `select_program` RPC);
 * edits later land on the instance, never the template. Returns the
 * instance id. */
export async function selectProgram(templateId: string): Promise<string> {
  const { data, error } = await supabase.rpc('select_program', {
    p_template_id: templateId,
    p_start_date: mondayOf(new Date()),
  });
  if (error) throw error;
  return data as string;
}

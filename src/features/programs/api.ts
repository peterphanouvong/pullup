import { supabase } from '@/lib/supabase';
import { toProgram } from './mapping';
import type { Program, ProgramSummary, RawProgram } from './types';

const PROGRAM_SELECT = `
  id, slug, name, summary, description,
  program_weeks (
    id, position, name, phase, description,
    program_days (
      id, position, name, kind, notes,
      day_exercises ( id, position, exercise_name, sets, reps, load, notes )
    )
  )
`;

export async function fetchPrograms(): Promise<ProgramSummary[]> {
  const { data, error } = await supabase
    .from('programs')
    .select('id, slug, name, summary')
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

export async function fetchActiveProgramId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_programs')
    .select('program_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.program_id ?? null;
}

export async function selectProgram(userId: string, programId: string): Promise<void> {
  const { error } = await supabase
    .from('user_programs')
    .upsert(
      { user_id: userId, program_id: programId, selected_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
  if (error) throw error;
}

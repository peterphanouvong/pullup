import { supabase } from '@/lib/supabase';
import { toProgram } from './mapping';
import { mondayOf } from './schedule';
import type { ActiveProgram, Program, ProgramSummary, RawProgram } from './types';
import type { LogType } from '@/features/workouts/types';

const PROGRAM_SELECT = `
  id, slug, name, summary, description,
  program_weeks (
    id, position, name, phase, description,
    program_days (
      id, position, name, kind, notes,
      day_exercises ( id, position, exercise_name, exercise_id, sets, reps, load, notes, log_type )
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

/** One exercise as the day editor holds it. A `null` id is a row the user
 * has just added and the database hasn't seen yet. */
export interface DayExerciseDraft {
  id: string | null;
  exerciseName: string;
  exerciseId: string | null;
  sets: number | null;
  reps: string | null;
  load: string | null;
  notes: string | null;
}

/**
 * Writes a programme day's exercise list back, in the order given.
 *
 * Only ever called against the user's own instance — RLS rejects writes to
 * a catalogue template, which is the point of instances (see
 * `20261021110000_program_instances.sql`).
 *
 * Deletes go first so a row can be removed and its position reused in the
 * same save without tripping the (day_id, position) ordering.
 */
export async function saveDayExercises(
  dayId: string,
  drafts: DayExerciseDraft[],
  removedIds: string[],
): Promise<void> {
  if (removedIds.length > 0) {
    const { error } = await supabase.from('day_exercises').delete().in('id', removedIds);
    if (error) throw error;
  }

  const updates: Record<string, unknown>[] = [];
  const inserts: Record<string, unknown>[] = [];
  drafts.forEach((draft, index) => {
    const row = {
      day_id: dayId,
      // Position is the list's own order, renumbered from 1 on every save.
      position: index + 1,
      exercise_name: draft.exerciseName,
      exercise_id: draft.exerciseId,
      sets: draft.sets,
      reps: draft.reps,
      load: draft.load,
      notes: draft.notes,
    };
    if (draft.id != null) updates.push({ ...row, id: draft.id });
    else inserts.push(row);
  });

  // Existing rows keep their ids (an upsert carrying the id), so anything
  // pointing at them still does.
  if (updates.length > 0) {
    const { error } = await supabase.from('day_exercises').upsert(updates);
    if (error) throw error;
  }

  if (inserts.length > 0) {
    const { error } = await supabase.from('day_exercises').insert(inserts);
    if (error) throw error;
  }
}

/** "Log as…" from a live workout, remembered on the programme day so the
 * next time it's started the table is already right. Matched by name, the
 * way a workout's exercises relate back to the day. Only the user's own
 * instance can be written (RLS), so on a template this quietly does nothing. */
export async function saveDayExerciseLogType(
  dayId: string,
  exerciseName: string,
  logType: LogType,
): Promise<void> {
  const { error } = await supabase
    .from('day_exercises')
    .update({ log_type: logType })
    .eq('day_id', dayId)
    .eq('exercise_name', exerciseName);
  if (error) throw error;
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

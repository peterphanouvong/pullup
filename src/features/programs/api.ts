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

/** Moves the active programme's anchor: "I'm on week 3" becomes a start
 * date that puts today in week 3 (see `startDateForWeek`). */
export async function setProgramStartDate(userId: string, startDate: string): Promise<void> {
  const { error } = await supabase.from('user_programs').update({ start_date: startDate }).eq('user_id', userId);
  if (error) throw error;
}

/** A programme you've been on before: your own instance that isn't the
 * active one. Nothing is ever deleted when a new programme replaces the
 * old, so these are all still here to go back to. */
export interface PastProgram {
  id: string;
  name: string;
  summary: string;
  templateId: string | null;
  /** When the instance was made: the day it was first chosen or built. */
  createdAt: string;
  weekCount: number;
  /** Every day id in the programme, so sessions logged against it can be
   * counted from the local workout store. */
  dayIds: string[];
  /** Day id → week position, for "pick up where you left off". */
  weekOfDay: Record<string, number>;
}

interface RawPastProgram {
  id: string;
  name: string;
  summary: string;
  template_id: string | null;
  created_at: string;
  program_weeks: { position: number; program_days: { id: string }[] }[];
}

/** Your own instances other than the active one, newest first. */
export async function fetchProgramHistory(userId: string, activeProgramId: string | null): Promise<PastProgram[]> {
  let query = supabase
    .from('programs')
    .select('id, name, summary, template_id, created_at, program_weeks ( position, program_days ( id ) )')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });
  if (activeProgramId != null) query = query.neq('id', activeProgramId);
  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as RawPastProgram[]).map((p) => {
    const weekOfDay: Record<string, number> = {};
    for (const week of p.program_weeks) for (const day of week.program_days) weekOfDay[day.id] = week.position;
    return {
      id: p.id,
      name: p.name,
      summary: p.summary,
      templateId: p.template_id,
      createdAt: p.created_at,
      weekCount: p.program_weeks.length,
      dayIds: Object.keys(weekOfDay),
      weekOfDay,
    };
  });
}

/** Makes one of your own instances the active programme again, anchored
 * so today falls in `weekPosition`. The row is yours (RLS) and the
 * programme is yours (the foreign key only; a template can't be resumed,
 * only selected, which copies it). */
export async function resumeProgram(userId: string, programId: string, startDate: string): Promise<void> {
  const { error } = await supabase
    .from('user_programs')
    .upsert({ user_id: userId, program_id: programId, selected_at: new Date().toISOString(), start_date: startDate });
  if (error) throw error;
}

/** The interview answers a built programme was written from, for editing
 * them and building again. Null for a template copy or an older instance
 * that has none. */
export async function fetchProgramBrief(programId: string): Promise<unknown | null> {
  const { data, error } = await supabase.from('programs').select('brief').eq('id', programId).maybeSingle();
  if (error) throw error;
  return data?.brief ?? null;
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

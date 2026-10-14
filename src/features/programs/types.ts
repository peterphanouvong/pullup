export type DayKind = 'lifting' | 'court' | 'rest' | 'comp';

export interface DayExercise {
  id: string;
  position: number;
  exerciseName: string;
  exerciseId: string | null;
  sets: number | null;
  reps: string | null;
  load: string | null;
  notes: string | null;
}

export interface ProgramDay {
  id: string;
  position: number;
  name: string;
  kind: DayKind;
  notes: string | null;
  exercises: DayExercise[];
}

export interface ProgramWeek {
  id: string;
  position: number;
  name: string;
  phase: string;
  description: string | null;
  days: ProgramDay[];
}

export interface ProgramSummary {
  id: string;
  slug: string;
  name: string;
  summary: string;
}

export interface Program extends ProgramSummary {
  description: string;
  weeks: ProgramWeek[];
}

/** The user's currently-selected programme, with its "Today" anchor date. */
export interface ActiveProgram {
  programId: string;
  startDate: string; // YYYY-MM-DD, Monday of the selection week
}

/** One row of the overview timeline: a week's phase plus its comp day, if any. */
export interface PhaseEntry {
  weekName: string;
  phase: string;
  compDayName: string | null;
}

/** Raw rows as PostgREST returns them (snake_case, unordered). */
export interface RawProgram {
  id: string;
  slug: string;
  name: string;
  summary: string;
  description: string;
  program_weeks: {
    id: string;
    position: number;
    name: string;
    phase: string;
    description: string | null;
    program_days: {
      id: string;
      position: number;
      name: string;
      kind: DayKind;
      notes: string | null;
      day_exercises: {
        id: string;
        position: number;
        exercise_name: string;
        exercise_id: string | null;
        sets: number | null;
        reps: string | null;
        load: string | null;
        notes: string | null;
      }[];
    }[];
  }[];
}

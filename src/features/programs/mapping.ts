import type { PhaseEntry, Program, ProgramWeek, RawProgram } from './types';

const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position;

export function toProgram(raw: RawProgram): Program {
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    summary: raw.summary,
    description: raw.description,
    weeks: [...raw.program_weeks].sort(byPosition).map((week) => ({
      id: week.id,
      position: week.position,
      name: week.name,
      phase: week.phase,
      description: week.description,
      days: [...week.program_days].sort(byPosition).map((day) => ({
        id: day.id,
        position: day.position,
        name: day.name,
        kind: day.kind,
        notes: day.notes,
        exercises: [...day.day_exercises].sort(byPosition).map((exercise) => ({
          id: exercise.id,
          position: exercise.position,
          exerciseName: exercise.exercise_name,
          exerciseId: exercise.exercise_id,
          sets: exercise.sets,
          reps: exercise.reps,
          load: exercise.load,
          notes: exercise.notes,
          logType: exercise.log_type ?? null,
        })),
      })),
    })),
  };
}

export function buildPhaseTimeline(weeks: ProgramWeek[]): PhaseEntry[] {
  return weeks.map((week) => ({
    weekName: week.name,
    phase: week.phase,
    compDayName: week.days.find((day) => day.kind === 'comp')?.name ?? null,
  }));
}

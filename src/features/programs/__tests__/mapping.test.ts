import { toProgram, buildPhaseTimeline } from '../mapping';
import type { RawProgram } from '../types';

const raw: RawProgram = {
  id: 'p1', slug: '8-week-peak', name: '8-Week Peak', summary: 's', description: 'd',
  program_weeks: [
    {
      id: 'w2', position: 2, name: 'Week 2 — Mon 19 Oct', phase: 'Deload', description: null,
      program_days: [],
    },
    {
      id: 'w1', position: 1, name: 'Week 1 — Mon 12 Oct', phase: 'Load 2', description: 'intro',
      program_days: [
        { id: 'd7', position: 7, name: 'Sun — Comp', kind: 'comp', notes: null, day_exercises: [] },
        {
          id: 'd1', position: 1, name: 'Mon — Lower power', kind: 'lifting', notes: null,
          day_exercises: [
            { id: 'e2', position: 2, exercise_name: 'Power clean', sets: 4, reps: '2', load: '85%', notes: null },
            { id: 'e1', position: 1, exercise_name: 'Sprints', sets: 5, reps: '30 m', load: 'Max', notes: '2–3 min rest' },
          ],
        },
        { id: 'd3', position: 3, name: 'Wed — Court', kind: 'court', notes: 'night', day_exercises: [] },
      ],
    },
  ],
};

describe('toProgram', () => {
  it('sorts weeks, days and exercises by position', () => {
    const program = toProgram(raw);
    expect(program.weeks.map((w) => w.id)).toEqual(['w1', 'w2']);
    expect(program.weeks[0].days.map((d) => d.id)).toEqual(['d1', 'd3', 'd7']);
    expect(program.weeks[0].days[0].exercises.map((e) => e.exerciseName)).toEqual(['Sprints', 'Power clean']);
  });

  it('maps snake_case rows to camelCase and keeps non-lifting days with empty exercises', () => {
    const program = toProgram(raw);
    const court = program.weeks[0].days[1];
    expect(court.kind).toBe('court');
    expect(court.notes).toBe('night');
    expect(court.exercises).toEqual([]);
  });
});

describe('buildPhaseTimeline', () => {
  it('returns one entry per week with the comp day name when present', () => {
    const program = toProgram(raw);
    expect(buildPhaseTimeline(program.weeks)).toEqual([
      { weekName: 'Week 1 — Mon 12 Oct', phase: 'Load 2', compDayName: 'Sun — Comp' },
      { weekName: 'Week 2 — Mon 19 Oct', phase: 'Deload', compDayName: null },
    ]);
  });
});

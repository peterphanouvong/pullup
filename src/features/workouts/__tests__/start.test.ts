// buildWorkoutFromDay: turns a programme day's prescription into the
// workout/workout_exercise/workout_set payloads a "Start workout" CTA
// writes. Fixtures below are copied verbatim from the real 8-Week Peak seed
// (supabase/migrations/20261013215225_seed_8_week_peak.sql): W1 Monday's
// five "Lower power + sprints" exercises, plus the Tuesday "Spanish squat
// iso" / "Copenhagen plank" / "Bench press" rows used to exercise the
// timed-vs-reps and missing-load branches of target composition.

import { buildWorkoutFromDay } from '../start';
import type { ProgramDay } from '@/features/programs/types';

function idSequence(prefix: string): () => string {
  let n = 0;
  return () => `${prefix}-${++n}`;
}

const mondayLowerPower: ProgramDay = {
  id: 'day-mon',
  position: 1,
  name: 'Mon — Lower power + sprints',
  kind: 'lifting',
  notes: null,
  exercises: [
    {
      id: 'de-1',
      position: 1,
      exerciseName: 'Sprints',
      exerciseId: null, // unmatched programme row — UI falls back to exercise_name
      sets: 5,
      reps: '30 m',
      load: 'Max',
      notes: '2–3 min rest',
    },
    {
      id: 'de-2',
      position: 2,
      exerciseName: 'Power clean',
      exerciseId: 'ex-power-clean',
      sets: 4,
      reps: '2',
      load: '85%',
      notes: null,
    },
    {
      id: 'de-3',
      position: 3,
      exerciseName: 'Front squat',
      exerciseId: 'ex-front-squat',
      sets: 4,
      reps: '3',
      load: '87% TM',
      notes: null,
    },
    {
      id: 'de-4',
      position: 4,
      exerciseName: 'Standing calf raise',
      exerciseId: 'ex-calf-raise',
      sets: 3,
      reps: '12–15',
      load: 'RPE 8',
      notes: 'Slow lower',
    },
    {
      id: 'de-5',
      position: 5,
      exerciseName: 'Repeat pogo hops',
      exerciseId: 'ex-pogo-hop',
      sets: 2,
      reps: '25',
      load: 'Submaximal',
      notes: 'Rhythmic',
    },
  ],
};

const now = new Date('2026-10-14T18:00:00.000Z');
const opts = { userId: 'user-1', programDayId: 'day-mon', now, idGen: idSequence('id') };

describe('buildWorkoutFromDay', () => {
  it('titles the workout from day.name and wires user/program/started_at', () => {
    const { workout } = buildWorkoutFromDay(mondayLowerPower, opts);

    expect(workout.title).toBe('Mon — Lower power + sprints');
    expect(workout.user_id).toBe('user-1');
    expect(workout.program_day_id).toBe('day-mon');
    expect(workout.started_at).toBe(now.toISOString());
    expect(workout.finished_at).toBeNull();
    expect(workout.notes).toBeNull();
    expect(workout.deleted).toBe(false);
    expect(workout.created_at).toBe(now.toISOString());
    expect(workout.updated_at).toBe(now.toISOString());
  });

  it('creates one workout_exercise per day.exercises, preserving position and exercise_id', () => {
    const { exercises } = buildWorkoutFromDay(mondayLowerPower, opts);

    expect(exercises).toHaveLength(5);
    expect(exercises.map((e) => e.position)).toEqual([1, 2, 3, 4, 5]);
    expect(exercises.map((e) => e.exercise_name)).toEqual([
      'Sprints',
      'Power clean',
      'Front squat',
      'Standing calf raise',
      'Repeat pogo hops',
    ]);
    // exercise_id passes through from DayExercise.exerciseId, null when unmatched.
    expect(exercises[0].exercise_id).toBeNull();
    expect(exercises[1].exercise_id).toBe('ex-power-clean');
  });

  it('carries DayExercise.notes forward as the prefilled, user-editable workout_exercise notes', () => {
    const { exercises } = buildWorkoutFromDay(mondayLowerPower, opts);

    // Standing calf raise: notes "Slow lower" — a per-exercise coaching cue.
    expect(exercises[3].exercise_name).toBe('Standing calf raise');
    expect(exercises[3].notes).toBe('Slow lower');

    // Power clean: notes null — no cue for this row, stays null (not "").
    expect(exercises[1].exercise_name).toBe('Power clean');
    expect(exercises[1].notes).toBeNull();
  });

  it('every workout_exercise belongs to the built workout', () => {
    const { workout, exercises } = buildWorkoutFromDay(mondayLowerPower, opts);
    for (const ex of exercises) {
      expect(ex.workout_id).toBe(workout.id);
      expect(ex.user_id).toBe('user-1');
      expect(ex.deleted).toBe(false);
    }
  });

  it('creates `sets` rows per exercise (DayExercise.sets count), set_type working, no actual values yet', () => {
    const { exercises, sets } = buildWorkoutFromDay(mondayLowerPower, opts);
    const powerCleanSets = sets.filter((s) => s.workout_exercise_id === exercises[1].id);

    expect(powerCleanSets).toHaveLength(4); // Power clean: 4 x 2 @ 85%
    expect(powerCleanSets.map((s) => s.position)).toEqual([1, 2, 3, 4]);
    for (const s of powerCleanSets) {
      expect(s.set_type).toBe('working');
      expect(s.weight_kg).toBeNull();
      expect(s.reps).toBeNull();
      expect(s.duration_seconds).toBeNull();
      expect(s.completed_at).toBeNull();
      expect(s.deleted).toBe(false);
    }
  });

  it('defaults to 1 set when DayExercise.sets is null', () => {
    const day: ProgramDay = {
      ...mondayLowerPower,
      exercises: [{ ...mondayLowerPower.exercises[0], sets: null }],
    };
    const { sets } = buildWorkoutFromDay(day, opts);
    expect(sets).toHaveLength(1);
    expect(sets[0].position).toBe(1);
  });

  it('composes the target string from sets x reps @ load (e.g. "4 × 2 @ 85%")', () => {
    const { exercises, sets } = buildWorkoutFromDay(mondayLowerPower, opts);
    const powerCleanSets = sets.filter((s) => s.workout_exercise_id === exercises[1].id);
    expect(powerCleanSets[0].target).toBe('4 × 2 @ 85%');

    const frontSquatSets = sets.filter((s) => s.workout_exercise_id === exercises[2].id);
    expect(frontSquatSets[0].target).toBe('4 × 3 @ 87% TM');

    const calfRaiseSets = sets.filter((s) => s.workout_exercise_id === exercises[3].id);
    expect(calfRaiseSets[0].target).toBe('3 × 12–15 @ RPE 8');

    const sprintSets = sets.filter((s) => s.workout_exercise_id === exercises[0].id);
    expect(sprintSets[0].target).toBe('5 × 30 m @ Max');
  });

  it('omits the "@ load" clause when load is null', () => {
    const day: ProgramDay = {
      ...mondayLowerPower,
      exercises: [
        {
          id: 'de-plank',
          position: 1,
          exerciseName: 'Copenhagen plank',
          exerciseId: 'ex-copenhagen-plank',
          sets: 2,
          reps: '20 s/side',
          load: null,
          notes: null,
        },
      ],
    };
    const { sets } = buildWorkoutFromDay(day, opts);
    expect(sets[0].target).toBe('2 × 20 s/side');
  });

  describe('timed-vs-weighted detection drives rest_seconds default', () => {
    it('defaults rest_seconds to 150 for ordinary rep prescriptions', () => {
      const { exercises } = buildWorkoutFromDay(mondayLowerPower, opts);
      // Power clean "2", Front squat "3", Standing calf raise "12–15", Repeat pogo hops "25".
      expect(exercises[1].rest_seconds).toBe(150);
      expect(exercises[2].rest_seconds).toBe(150);
      expect(exercises[3].rest_seconds).toBe(150);
      expect(exercises[4].rest_seconds).toBe(150);
    });

    it('treats sprint distance text ("30 m") as reps-style, not duration — rest_seconds 150', () => {
      const { exercises } = buildWorkoutFromDay(mondayLowerPower, opts);
      expect(exercises[0].rest_seconds).toBe(150);
    });

    it('treats "3 + 1 single" (Bench press) as reps-style — rest_seconds 150', () => {
      const day: ProgramDay = {
        ...mondayLowerPower,
        exercises: [
          {
            id: 'de-bench',
            position: 1,
            exerciseName: 'Bench press',
            exerciseId: 'ex-bench-press',
            sets: 4,
            reps: '3 + 1 single',
            load: '87% TM, single @ 90%',
            notes: null,
          },
        ],
      };
      const { exercises } = buildWorkoutFromDay(day, opts);
      expect(exercises[0].rest_seconds).toBe(150);
    });

    it('treats "30–45 s" (Spanish squat iso) as duration — rest_seconds null', () => {
      const day: ProgramDay = {
        ...mondayLowerPower,
        exercises: [
          {
            id: 'de-iso',
            position: 1,
            exerciseName: 'Spanish squat iso',
            exerciseId: 'ex-spanish-squat-iso',
            sets: 4,
            reps: '30–45 s',
            load: 'Hard, not maximal',
            notes: null,
          },
        ],
      };
      const { exercises, sets } = buildWorkoutFromDay(day, opts);
      expect(exercises[0].rest_seconds).toBeNull();
      expect(sets[0].target).toBe('4 × 30–45 s @ Hard, not maximal');
    });

    it('treats "20 s/side" (Copenhagen plank) as duration — rest_seconds null', () => {
      const day: ProgramDay = {
        ...mondayLowerPower,
        exercises: [
          {
            id: 'de-plank',
            position: 1,
            exerciseName: 'Copenhagen plank',
            exerciseId: 'ex-copenhagen-plank',
            sets: 2,
            reps: '20 s/side',
            load: null,
            notes: null,
          },
        ],
      };
      const { exercises } = buildWorkoutFromDay(day, opts);
      expect(exercises[0].rest_seconds).toBeNull();
    });
  });

  it('uses idGen for every generated id, and the fallback default generates unique ids without one', () => {
    const { workout, exercises, sets } = buildWorkoutFromDay(mondayLowerPower, opts);
    const allIds = [workout.id, ...exercises.map((e) => e.id), ...sets.map((s) => s.id)];
    expect(new Set(allIds).size).toBe(allIds.length); // all unique
    expect(allIds.every((id) => id.startsWith('id-'))).toBe(true);

    // No idGen passed — falls back to a built-in generator (no store import required).
    const { workout: w2 } = buildWorkoutFromDay(mondayLowerPower, {
      userId: 'user-1',
      programDayId: 'day-mon',
      now,
    });
    expect(typeof w2.id).toBe('string');
    expect(w2.id.length).toBeGreaterThan(0);
  });
});

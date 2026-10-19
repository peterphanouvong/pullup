import { act, create } from 'react-test-renderer';
import type { Observable } from '@legendapp/state';
import type { WorkoutSet } from '../../types';

import { FillDownBar } from '../fill-down-bar';
import { focusSetField, focusedSet$ } from '../../focused-set';
import { workoutSets$ } from '../../store';

// The real store needs Supabase; a bare observable is all the bar reads.
jest.mock('../../store', () => {
  const { observable } = jest.requireActual('@legendapp/state');
  return { workoutSets$: observable({}) };
});
jest.mock('../../hooks', () => ({ updateSet: jest.fn() }));

const sets$ = workoutSets$ as Observable<Record<string, WorkoutSet>>;

const set = (id: string, position: number, weight: number | null): WorkoutSet => ({
  id, user_id: 'u', workout_exercise_id: 'e1', position, set_type: 'working', weight_kg: weight, reps: 5,
  duration_seconds: null, target: null, completed_at: null, created_at: 't', updated_at: 't', deleted: false,
});

function labels(tree: ReturnType<typeof create>): string[] {
  return tree.root
    .findAll((n) => String(n.type) === 'Text' && typeof n.props.children === 'string' && n.props.children.startsWith('Fill'))
    .map((n) => n.props.children as string);
}

describe('FillDownBar', () => {
  it('offers only the columns with a value, for a row with sets below it', () => {
    sets$.set({ s1: set('s1', 1, 60), s2: set('s2', 2, null) });
    let tree!: ReturnType<typeof create>;
    act(() => {
      tree = create(<FillDownBar onReveal={() => {}} />);
    });
    expect(labels(tree)).toEqual([]);

    act(() => focusSetField('s1', 'weight'));
    expect(labels(tree)).toEqual(['Fill kg', 'Fill reps']);

    // The last row has nothing below it to fill.
    act(() => focusSetField('s2', 'reps'));
    expect(labels(tree)).toEqual([]);

    act(() => focusedSet$.set(null));
    expect(labels(tree)).toEqual([]);
  });

  it('renders with nothing focused, then with a focused set', () => {
    sets$.set({ s1: set('s1', 1, 60), s2: set('s2', 2, null) });
    let tree!: ReturnType<typeof create>;
    act(() => {
      tree = create(<FillDownBar onReveal={() => {}} />);
    });
    act(() => {
      focusSetField('s1', 'weight');
    });
    act(() => {
      focusedSet$.set(null);
    });
    expect(tree.toJSON()).toBeTruthy();
  });
});

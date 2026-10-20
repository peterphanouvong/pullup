import { saveDayExercises, type DayExerciseDraft } from '../api';

const mockDelete = { in: jest.fn().mockResolvedValue({ error: null }) };
const mockUpsert = jest.fn().mockResolvedValue({ error: null });
const mockInsert = jest.fn().mockResolvedValue({ error: null });

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      delete: () => mockDelete,
      upsert: (...args: unknown[]) => mockUpsert(...args),
      insert: (...args: unknown[]) => mockInsert(...args),
    }),
  },
}));

function draft(over: Partial<DayExerciseDraft> = {}): DayExerciseDraft {
  return {
    id: 'ex-1',
    exerciseName: 'Back squat',
    exerciseId: 'lib-1',
    sets: 4,
    reps: '2',
    load: '85%',
    notes: null,
    ...over,
  };
}

beforeEach(() => {
  mockDelete.in.mockClear();
  mockUpsert.mockClear();
  mockInsert.mockClear();
});

describe('saveDayExercises', () => {
  it('upserts existing rows by id and inserts new ones', async () => {
    await saveDayExercises('day-1', [draft(), draft({ id: null, exerciseName: 'Split squat' })], []);

    expect(mockUpsert).toHaveBeenCalledWith([expect.objectContaining({ id: 'ex-1', day_id: 'day-1' })]);
    const inserted = mockInsert.mock.calls[0][0] as Record<string, unknown>[];
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).not.toHaveProperty('id');
    expect(inserted[0]).toMatchObject({ exercise_name: 'Split squat', day_id: 'day-1' });
  });

  it('renumbers positions from the list order, so a reorder sticks', async () => {
    await saveDayExercises('day-1', [draft({ id: 'b' }), draft({ id: 'a' })], []);

    const rows = mockUpsert.mock.calls[0][0] as { id: string; position: number }[];
    expect(rows).toEqual([
      expect.objectContaining({ id: 'b', position: 1 }),
      expect.objectContaining({ id: 'a', position: 2 }),
    ]);
  });

  it('deletes removed rows before writing, so a freed position can be reused', async () => {
    const order: string[] = [];
    mockDelete.in.mockImplementationOnce(async () => {
      order.push('delete');
      return { error: null };
    });
    mockUpsert.mockImplementationOnce(async () => {
      order.push('upsert');
      return { error: null };
    });

    await saveDayExercises('day-1', [draft()], ['ex-9']);

    expect(mockDelete.in).toHaveBeenCalledWith('id', ['ex-9']);
    expect(order).toEqual(['delete', 'upsert']);
  });

  it('skips the write entirely when there is nothing to save', async () => {
    await saveDayExercises('day-1', [], []);
    expect(mockDelete.in).not.toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('surfaces a refused write', async () => {
    mockUpsert.mockResolvedValueOnce({ error: new Error('new row violates row-level security policy') });
    await expect(saveDayExercises('day-1', [draft()], [])).rejects.toThrow('row-level security');
  });
});

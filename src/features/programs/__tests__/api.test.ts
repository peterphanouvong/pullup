import { selectProgram } from '../api';
import { mondayOf } from '../schedule';
import { supabase } from '@/lib/supabase';

const mockUpsert = jest.fn().mockResolvedValue({ error: null });
jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn(() => ({ upsert: mockUpsert })) },
}));

describe('selectProgram', () => {
  it('upserts on user_id so re-selecting switches instead of failing', async () => {
    await selectProgram('user-1', 'prog-1');
    expect(supabase.from).toHaveBeenCalledWith('user_programs');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', program_id: 'prog-1' }),
      { onConflict: 'user_id' },
    );
  });

  it('writes start_date as the Monday of the selection week, YYYY-MM-DD', async () => {
    await selectProgram('user-1', 'prog-1');
    const payload = mockUpsert.mock.calls[mockUpsert.mock.calls.length - 1][0];
    expect(payload.start_date).toEqual(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
    expect(payload.start_date).toBe(mondayOf(new Date()));
  });
});

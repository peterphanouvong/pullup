import { selectProgram } from '../api';
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
});

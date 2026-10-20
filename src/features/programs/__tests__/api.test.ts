import { selectProgram } from '../api';
import { mondayOf } from '../schedule';
import { supabase } from '@/lib/supabase';

const mockRpc = jest.fn().mockResolvedValue({ data: 'instance-1', error: null });
jest.mock('@/lib/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

describe('selectProgram', () => {
  it('asks the server for a private instance of the template', async () => {
    await expect(selectProgram('template-1')).resolves.toBe('instance-1');
    expect(mockRpc).toHaveBeenCalledWith('select_program', expect.objectContaining({ p_template_id: 'template-1' }));
    expect(supabase.rpc).toBeDefined();
  });

  it('sends start_date as the Monday of the selection week, YYYY-MM-DD', async () => {
    await selectProgram('template-1');
    const payload = mockRpc.mock.calls[mockRpc.mock.calls.length - 1][1];
    expect(payload.p_start_date).toEqual(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
    expect(payload.p_start_date).toBe(mondayOf(new Date()));
  });

  it('surfaces a server refusal', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: new Error('not a template programme') });
    await expect(selectProgram('instance-1')).rejects.toThrow('not a template');
  });
});

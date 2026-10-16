import { DISPLAY_NAME_MAX, cleanDisplayName } from '../api';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

describe('cleanDisplayName', () => {
  it('trims and collapses whitespace', () => {
    expect(cleanDisplayName('  Sam   Lee ')).toBe('Sam Lee');
  });

  it('rejects a blank name', () => {
    expect(cleanDisplayName('   ')).toBeNull();
  });

  it('caps the length the database allows', () => {
    expect(cleanDisplayName('x'.repeat(50))).toHaveLength(DISPLAY_NAME_MAX);
  });
});

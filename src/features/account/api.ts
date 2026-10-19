import { supabase } from '@/lib/supabase';

export interface Profile {
  id: string;
  displayName: string;
  /** Sessions a week you're aiming for, 1–7. */
  weeklyTarget: number;
}

export const DEFAULT_WEEKLY_TARGET = 3;

/** The longest name a crew row has room for; the database enforces it too. */
export const DISPLAY_NAME_MAX = 30;

export function cleanDisplayName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, ' ').slice(0, DISPLAY_NAME_MAX).trim();
  return name.length > 0 ? name : null;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, weekly_target')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? { id: data.id, displayName: data.display_name, weeklyTarget: data.weekly_target } : null;
}

export async function saveDisplayName(userId: string, displayName: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, display_name: displayName }, { onConflict: 'id' });
  if (error) throw error;
}

/** Seeds a name from the provider without overwriting one already chosen
 * (switching back into an account must not reset its name). */
export async function seedDisplayName(userId: string, displayName: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, display_name: displayName }, { onConflict: 'id', ignoreDuplicates: true });
  if (error) throw error;
}

/** Deletes the account and everything in it, then drops the local session
 * (the gate starts a new guest). */
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_account');
  if (error) throw error;
  await supabase.auth.signOut({ scope: 'local' });
}

export async function saveWeeklyTarget(userId: string, weeklyTarget: number): Promise<void> {
  const { error } = await supabase.from('profiles').update({ weekly_target: weeklyTarget }).eq('id', userId);
  if (error) throw error;
}

import { supabase } from '@/lib/supabase';
import { toCheckin, type Checkin, type RawCheckinRow, type Reaction } from './feed';
import { toMemberWeek, type CrewMemberWeek, type RawCrewWeekRow } from './week';

export interface Crew {
  id: string;
  name: string;
  inviteCode: string;
  memberCount: number;
}

/** Most members a crew can have; the server enforces it too. */
export const CREW_MAX_MEMBERS = 8;

interface RawCrew {
  id: string;
  name: string;
  invite_code: string;
  crew_members: { count: number }[];
}

/** RLS limits this to crews you're in. */
export async function fetchMyCrews(): Promise<Crew[]> {
  const { data, error } = await supabase
    .from('crews')
    .select('id, name, invite_code, crew_members(count)')
    .order('created_at');
  if (error) throw error;
  return (data as unknown as RawCrew[]).map((c) => ({
    id: c.id,
    name: c.name,
    inviteCode: c.invite_code,
    memberCount: c.crew_members[0]?.count ?? 0,
  }));
}

export async function fetchCrewWeek(crewId: string, fromIso: string, toIso: string): Promise<CrewMemberWeek[]> {
  const { data, error } = await supabase.rpc('crew_week', { p_crew_id: crewId, p_from: fromIso, p_to: toIso });
  if (error) throw error;
  return (data as RawCrewWeekRow[]).map(toMemberWeek);
}

/** Resolves to the new crew's name and code, so the caller can go
 * straight to inviting people. */
export async function createCrew(name: string): Promise<{ name: string; inviteCode: string }> {
  const { data, error } = await supabase.rpc('create_crew', { p_name: name });
  if (error) throw error;
  const crew = data as { name: string; invite_code: string };
  return { name: crew.name, inviteCode: crew.invite_code };
}

export async function joinCrew(code: string): Promise<void> {
  const { error } = await supabase.rpc('join_crew', { p_code: code });
  if (error) throw error;
}

export async function leaveCrew(crewId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_crew', { p_crew_id: crewId });
  if (error) throw error;
}

export async function fetchCrewFeed(crewId: string, fromIso: string, toIso: string): Promise<Checkin[]> {
  const { data, error } = await supabase.rpc('crew_feed', { p_crew_id: crewId, p_from: fromIso, p_to: toIso });
  if (error) throw error;
  return (data as RawCheckinRow[]).map(toCheckin);
}

/** Sets your reaction on a crewmate's session; null takes it back. */
export async function setReaction(workoutId: string, emoji: Reaction | null): Promise<void> {
  const { error } = await supabase.rpc('set_reaction', { p_workout_id: workoutId, p_emoji: emoji });
  if (error) throw error;
}

export interface Poke {
  id: string;
  crewId: string;
  fromUser: string;
  toUser: string;
  createdAt: string;
}

/** Pokes you've sent or received since `sinceIso`. */
export async function fetchPokes(sinceIso: string): Promise<Poke[]> {
  const { data, error } = await supabase
    .from('pokes')
    .select('id, crew_id, from_user, to_user, created_at')
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map((p) => ({ id: p.id, crewId: p.crew_id, fromUser: p.from_user, toUser: p.to_user, createdAt: p.created_at }));
}

export async function pokeCrewmate(crewId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc('poke_crewmate', { p_crew_id: crewId, p_user_id: userId });
  if (error) throw error;
}

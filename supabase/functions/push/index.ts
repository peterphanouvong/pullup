// Pushes for Pull Up, via Expo's push service.
//
// Called by the database (pg_net, see dispatch_push()) with {type, id}:
//   checkin  — id is a workout: tell the finisher's crewmates
//   reaction — id is a workout: tell its owner who reacted
//   poke     — id is a poke: tell the person poked
//   recap    — hourly: the Sunday 6pm recap for everyone it's 6pm Sunday for
//
// Everything in a message is re-derived here from the database with the
// service role; the caller's payload is only ever ids. Nothing a user
// typed reaches a notification: programme day names, counts, emoji.

import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const RECAP_HOUR = 18;

interface Message {
  to: string;
  title: string;
  body: string;
  data: { url: string };
  sound: 'default';
}

type Row = Record<string, any>;

function dayLabel(name: string | null): string {
  return name == null ? 'a workout' : name.replace(/^(mon|tue|wed|thu|fri|sat|sun)[a-z]*\s*[—–-]\s*/i, '');
}

async function tokensFor(userIds: string[]): Promise<Map<string, string[]>> {
  const byUser = new Map<string, string[]>();
  if (userIds.length === 0) return byUser;
  const { data, error } = await supabase.from('push_tokens').select('token, user_id').in('user_id', userIds);
  if (error) throw error;
  for (const row of data as Row[]) byUser.set(row.user_id, [...(byUser.get(row.user_id) ?? []), row.token]);
  return byUser;
}

async function crewmatesOf(userId: string): Promise<string[]> {
  const { data, error } = await supabase.from('crew_members').select('crew_id').eq('user_id', userId);
  if (error) throw error;
  const crewIds = (data as Row[]).map((r) => r.crew_id);
  if (crewIds.length === 0) return [];
  const { data: members, error: mErr } = await supabase
    .from('crew_members')
    .select('user_id')
    .in('crew_id', crewIds)
    .neq('user_id', userId);
  if (mErr) throw mErr;
  return [...new Set((members as Row[]).map((r) => r.user_id))];
}

async function nameOf(userId: string): Promise<string> {
  const { data } = await supabase.from('profiles').select('display_name').eq('id', userId).maybeSingle();
  return (data as Row | null)?.display_name ?? 'A crewmate';
}

async function workoutFacts(workoutId: string) {
  const { data, error } = await supabase
    .from('workouts')
    .select('id, user_id, started_at, finished_at, deleted, program_days(name)')
    .eq('id', workoutId)
    .maybeSingle();
  if (error) throw error;
  const w = data as Row | null;
  if (!w || !w.finished_at || w.deleted) return null;
  const minutes = Math.max(1, Math.round((Date.parse(w.finished_at) - Date.parse(w.started_at)) / 60_000));
  const day = dayLabel((w.program_days as Row | null)?.name ?? null);
  return { ownerId: w.user_id as string, minutes, day };
}

async function send(messages: Message[]) {
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(Deno.env.get('EXPO_ACCESS_TOKEN') ? { Authorization: `Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}` } : {}),
      },
      body: JSON.stringify(chunk),
    });
    const json = (await res.json()) as { data?: { status: string; details?: { error?: string } }[] };
    // A token Expo says is gone is removed, so we stop sending to it.
    const dead = (json.data ?? [])
      .map((ticket, idx) => (ticket.details?.error === 'DeviceNotRegistered' ? chunk[idx].to : null))
      .filter((t): t is string => t != null);
    if (dead.length > 0) await supabase.from('push_tokens').delete().in('token', dead);
  }
}

function fanOut(userIds: string[], tokens: Map<string, string[]>, make: (userId: string) => Omit<Message, 'to'>): Message[] {
  return userIds.flatMap((uid) => (tokens.get(uid) ?? []).map((to) => ({ to, ...make(uid) })));
}

async function checkin(workoutId: string): Promise<Message[]> {
  const facts = await workoutFacts(workoutId);
  if (!facts) return [];
  const [name, mates] = await Promise.all([nameOf(facts.ownerId), crewmatesOf(facts.ownerId)]);
  const tokens = await tokensFor(mates);
  return fanOut(mates, tokens, () => ({
    title: `${name} finished ${facts.day}`,
    body: `${facts.minutes} min. Send them a 🔥`,
    data: { url: '/crew' },
    sound: 'default',
  }));
}

async function reaction(workoutId: string): Promise<Message[]> {
  const facts = await workoutFacts(workoutId);
  if (!facts) return [];
  // The newest reaction is the one that fired this.
  const { data } = await supabase
    .from('workout_reactions')
    .select('user_id, emoji')
    .eq('workout_id', workoutId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const r = data as Row | null;
  if (!r || r.user_id === facts.ownerId) return [];
  const [name, tokens] = await Promise.all([nameOf(r.user_id), tokensFor([facts.ownerId])]);
  return fanOut([facts.ownerId], tokens, () => ({
    title: `${name} reacted ${r.emoji}`,
    body: `to your ${facts.day} session`,
    data: { url: '/crew' },
    sound: 'default',
  }));
}

async function poke(pokeId: string): Promise<Message[]> {
  const { data } = await supabase.from('pokes').select('from_user, to_user').eq('id', pokeId).maybeSingle();
  const p = data as Row | null;
  if (!p) return [];
  const [name, tokens] = await Promise.all([nameOf(p.from_user), tokensFor([p.to_user])]);
  return fanOut([p.to_user], tokens, () => ({
    title: `${name} poked you 👋`,
    body: 'You training today?',
    data: { url: '/crew' },
    sound: 'default',
  }));
}

/** Local weekday (0 = Sunday) and hour for an IANA zone. */
function localNow(tz: string, now: Date): { weekday: number; hour: number } | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: 'numeric', hour12: false }).formatToParts(now);
    const wd = parts.find((p) => p.type === 'weekday')?.value ?? '';
    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? NaN) % 24;
    const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(wd);
    return weekday < 0 || Number.isNaN(hour) ? null : { weekday, hour };
  } catch {
    return null;
  }
}

async function recap(now: Date): Promise<Message[]> {
  const { data: profiles, error } = await supabase.from('profiles').select('id, display_name, weekly_target, timezone');
  if (error) throw error;
  const due = (profiles as Row[]).filter((p) => {
    const local = localNow(p.timezone, now);
    return local?.weekday === 0 && local.hour === RECAP_HOUR;
  });
  if (due.length === 0) return [];
  const tokens = await tokensFor(due.map((p) => p.id));
  const messages: Message[] = [];
  for (const p of due) {
    if (!tokens.has(p.id)) continue;
    const { data: weekStart } = await supabase.rpc('local_week_start', { p_at: now.toISOString(), tz: p.timezone });
    const { count } = await supabase
      .from('workouts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', p.id)
      .eq('deleted', false)
      .not('finished_at', 'is', null)
      .gte('started_at', weekStart as string);
    const { data: streak } = await supabase.rpc('week_streak', { p_user_id: p.id, p_now: now.toISOString() });
    const done = count ?? 0;
    const hit = done >= p.weekly_target;
    const streakText = (streak as number) >= 2 ? ` · ${streak}-week streak 🔥` : '';
    messages.push(
      ...fanOut([p.id], tokens, () => ({
        title: hit ? `Week done: ${done}/${p.weekly_target} 💪` : `This week: ${done}/${p.weekly_target}`,
        body: (hit ? `Target hit${streakText}. ` : `${p.weekly_target - done} short of your target. `) + 'New week starts tomorrow.',
        data: { url: '/crew' },
        sound: 'default',
      })),
    );
  }
  return messages;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  let payload: { type?: string; id?: string | null };
  try {
    payload = await req.json();
  } catch {
    return new Response('Bad JSON', { status: 400 });
  }
  try {
    let messages: Message[] = [];
    switch (payload.type) {
      case 'checkin': messages = await checkin(payload.id!); break;
      case 'reaction': messages = await reaction(payload.id!); break;
      case 'poke': messages = await poke(payload.id!); break;
      case 'recap': messages = await recap(new Date()); break;
      default: return new Response('Unknown type', { status: 400 });
    }
    if (messages.length > 0) await send(messages);
    return Response.json({ sent: messages.length });
  } catch (e) {
    console.error('push failed', payload, e);
    return new Response(String(e), { status: 500 });
  }
});

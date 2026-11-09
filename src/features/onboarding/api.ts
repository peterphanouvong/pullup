import { fetch as expoFetch } from 'expo/fetch';
import { supabase } from '@/lib/supabase';
import { mondayOf } from '@/features/programs/schedule';
import { validatePlan, type ProgramPlan } from '@/features/programs/plan';
import type { TrainingBrief } from './brief';

/** What to say when the answer never finished, however it failed. */
const CUT_OFF = 'The connection dropped while the coach was writing. Nothing was saved; try again and it starts fresh.';

/** What the coach is up to, as the programme streams in. */
export type BuildProgress =
  | { stage: 'reading' }
  | { stage: 'structure'; name: string }
  | { stage: 'week'; week: number; name: string; phase: string };

/**
 * Asks the coach for a programme. `programId` sends the caller's current
 * instance as context, for a change rather than a fresh write.
 *
 * The function streams newline-delimited JSON: progress events while it
 * writes (reported through `onProgress`), then the plan or an error as
 * the last line. Read with Expo's fetch, which can stream a body; the
 * Supabase client's `invoke` can't. A function that predates the stream
 * flag answers with one JSON document after some keep-alive whitespace,
 * which the fallback at the end still accepts.
 */
export async function buildPlan(
  brief: TrainingBrief,
  note: string | null,
  programId: string | null,
  onProgress?: (progress: BuildProgress) => void,
): Promise<ProgramPlan> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in.');

  let response: Awaited<ReturnType<typeof expoFetch>>;
  try {
    response = await expoFetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/plan`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: process.env.EXPO_PUBLIC_SUPABASE_KEY!,
        authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ brief, note, program_id: programId, stream: true }),
    });
  } catch {
    throw new Error(CUT_OFF);
  }
  if (!response.ok) {
    // The function answers with a sentence written for the user; surface
    // that rather than the status code.
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `The coach isn’t answering right now (${response.status}).`);
  }

  let result: { plan?: unknown; error?: string } | null = null;
  const take = (event: unknown) => {
    if (event == null || typeof event !== 'object') return;
    if ('plan' in event || 'error' in event) result = event as { plan?: unknown; error?: string };
    else if ('stage' in event) onProgress?.(event as BuildProgress);
  };

  const parse = (text: string): unknown => {
    try {
      return JSON.parse(text);
    } catch {
      return undefined;
    }
  };

  const reader = response.body?.getReader();
  if (reader == null) {
    take(parse(await response.text().catch(() => '')));
  } else {
    const decoder = new TextDecoder();
    let whole = '';
    let buffer = '';
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          whole += chunk;
          buffer += chunk;
        }
        let newline: number;
        while ((newline = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (line.length > 0) take(parse(line));
        }
        if (done) break;
      }
    } catch {
      // The connection went while the coach was writing. Whatever arrived
      // whole is in `whole`; the checks below decide.
    }
    // A last line without a newline, or the legacy function's single
    // document after its keep-alive whitespace.
    if (result == null && buffer.trim().length > 0) take(parse(buffer.trim()));
    if (result == null) take(parse(whole.trim()));
  }

  const body = result as { plan?: unknown; error?: string } | null;
  // Nothing usable arrived: the function was cut short (its time ran out,
  // or the connection dropped) before it could say either way.
  if (body == null) throw new Error(CUT_OFF);
  if (body.error) throw new Error(body.error);
  const check = validatePlan(body.plan);
  if (!check.ok) throw new Error(`The program came back malformed (${check.reason}).`);
  return check.plan;
}

/** Writes the plan. With no `programId` a fresh instance is created and made
 * active, starting this Monday; with one, that instance is rewritten in
 * place. The brief rides along so a rework can read it. Returns the
 * instance id. */
export async function applyPlan(plan: ProgramPlan, brief: TrainingBrief, programId: string | null): Promise<string> {
  const { data, error } = await supabase.rpc('apply_program_plan', {
    p_program_id: programId,
    p_plan: { ...plan, brief },
    p_start_date: mondayOf(new Date()),
  });
  if (error) throw error;
  return data as string;
}

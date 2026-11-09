// The programme-writing agent (docs/ai-programming.md, "The agent").
//
// POST { brief, note?, program_id? } with the user's JWT.
//   brief       the onboarding answers (TrainingBrief)
//   note        optional free text: "change something" on the reveal screen
//   program_id  optional: the caller's existing instance to rework, sent as
//               context so a change keeps what wasn't mentioned
//
// Responds { plan } — a validated ProgramPlan. The model never writes to the
// database: the app shows the plan and calls apply_program_plan itself.
//
// With `stream: true` in the body the response is newline-delimited JSON
// instead: progress events as the coach writes ({ stage: 'reading' },
// { stage: 'structure', name }, { stage: 'week', week, name, phase }), a
// { tick } every few seconds to keep the connection warm, then the same
// final { plan } or { error } as its own line. Older app builds don't send
// the flag and get the single JSON document.
//
// The Anthropic key lives in Supabase secrets (ANTHROPIC_API_KEY), never in
// the app.

import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { PLAN_JSON_SCHEMA, validatePlan } from '../_shared/plan-schema.ts';
import { briefToProse, isBrief, normaliseBrief } from '../_shared/brief.ts';

// The spec names the current Sonnet; move to Opus only if proposals are poor.
const MODEL = 'claude-sonnet-5-5';
const NOTE_MAX = 500;
const posthogProjectToken = Deno.env.get('POSTHOG_PROJECT_TOKEN');
const posthogHost = Deno.env.get('POSTHOG_HOST');

for (const variableName of [
  ...(!posthogProjectToken ? ['POSTHOG_PROJECT_TOKEN'] : []),
  ...(!posthogHost ? ['POSTHOG_HOST'] : []),
]) {
  if (Deno.env.get('ENVIRONMENT') !== 'production') {
    console.warn(`${variableName} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${variableName} is configured`);
  }
}

type Row = Record<string, unknown>;

type Progress =
  | { stage: 'reading' }
  | { stage: 'structure'; name: string }
  | { stage: 'week'; week: number; name: string; phase: string };

const STRING = '"((?:[^"\\\\]|\\\\.)*)"';
const PLAN_NAME = new RegExp(`^\\s*\\{\\s*"name"\\s*:\\s*${STRING}`);
const WEEK_PHASE = new RegExp(`"phase"\\s*:\\s*${STRING}`, 'g');
const ANY_NAME = new RegExp(`"name"\\s*:\\s*${STRING}`, 'g');

const unescape = (s: string): string => {
  try {
    return JSON.parse(`"${s}"`) as string;
  } catch {
    return s;
  }
};

/** Reads progress out of the JSON as it streams: the programme's name once
 * it's complete, and each week as its phase lands (only weeks have one).
 * Incremental: each call scans only what's arrived since the last week,
 * because the edge runtime's CPU budget per request is small and the
 * snapshot runs to tens of kilobytes. */
function progressReader(onProgress: (p: Progress) => void): (snapshot: string) => void {
  let named = false;
  let weeks = 0;
  // Everything before this index has been accounted for.
  let consumed = 0;
  return (snapshot) => {
    if (!named) {
      const head = snapshot.slice(0, 400);
      const m = PLAN_NAME.exec(head);
      if (m) {
        named = true;
        onProgress({ stage: 'structure', name: unescape(m[1]) });
      } else if (snapshot.length > 400) {
        named = true; // Not where we expected it; stop looking.
      }
    }
    WEEK_PHASE.lastIndex = consumed;
    let phase: RegExpExecArray | null;
    while ((phase = WEEK_PHASE.exec(snapshot)) != null) {
      // The week's name is the last "name" between the previous week's
      // phase and this one.
      const window = snapshot.slice(consumed, phase.index);
      let name: string | null = null;
      for (const m of window.matchAll(ANY_NAME)) name = m[1];
      consumed = phase.index + phase[0].length;
      WEEK_PHASE.lastIndex = consumed;
      weeks += 1;
      onProgress({ stage: 'week', week: weeks, name: name != null ? unescape(name) : `Week ${weeks}`, phase: unescape(phase[1]) });
    }
  };
}

const PROGRAM_SELECT = `
  id, name, summary, description, owner_id,
  program_weeks (
    position, name, phase, description,
    program_days (
      position, name, kind, notes,
      day_exercises ( position, exercise_name, sets, reps, load, notes )
    )
  )
`;

const SYSTEM = `You are a strength and conditioning coach writing a training programme for one athlete, for the Pull Up app.

The athlete is here for consistency: a plan they will actually keep, week after week, more than a perfect one. Sessions should be repeatable and clear, never a test of how much they can survive. A week they finish beats a week that's optimal on paper.

Write for a real person with a life: the programme must fit the days, minutes and equipment they have, not the ideal. Court or field sessions they already do are fixed and count as training load; place them on the days a club would (midweek evening, weekend morning) and lift around them: never a heavy lower-body day the morning of a court session, keep the day before a comp light or off.

Structure:
- Every week has exactly 7 days, Monday to Sunday, in order. Each day's name starts with the weekday, e.g. "Mon — Lower power". Days are one of: lifting, court, rest, comp. Rest and court days have no exercises; a court day's notes say what the session is for. A comp day is the competition itself.
- Weeks have a short name ("Week 3") and a phase ("Build", "Deload", "Taper"...) and a one-paragraph description of what the week is for.
- Lifting days have 4 to 7 exercises: warm-up isn't listed. Use exercise names from the library list exactly when one fits; invent a name only when nothing in the library is close. Give sets as a whole number, reps as text ("5", "6-8", "8/side", "30 s"), load as text ("bodyweight", "RPE 7", "70%", "heavy") and a note only when it changes how the exercise is done.
- Give every exercise a log type, which decides what the athlete records: "weight_reps" for anything loaded (squats, presses, rows, weighted carries), "reps" for bodyweight and plyometric work where only the count matters (jumps, bounds, pogos, push-ups, bodyweight pull-ups), "duration" for anything timed or run (sprints, shuttles, holds, planks). A sprint over a distance is "duration", never "weight_reps".
- Minimum viable workout: every lifting day's notes start with a short version for a flat day, as long as the athlete said they could still manage, written as one line: "Short on time (15 min): <2-3 exercises with sets x reps>". Pick the movements that matter most that day. It still counts.
- Season: in season, keep gym volume modest and lift around games; pre-season and off-season are the windows to build. Match the phases to where they are.
- What stops them: shape the plan around it. Not knowing what to do means clear, simple sessions with few exercises; no time means shorter sessions and supersets; dropping off means an easier first week that builds; too tired after court means lighter lifting on court days and the hard work on fresh days.
- Progress across the weeks: load, volume or intensity moves week to week, with a deload where the length warrants one. Repeat structure, vary the dose.
- Respect limitations: for a flagged knee, ankle, shoulder or back, choose joint-friendly variations and add isometric or tempo work rather than avoiding the area entirely.
- Equipment is a hard constraint: only what they listed, nothing else. Bodyweight only means no bands, no bench, no bar: floor and a wall at most.
- Keep text tight. The description is markdown a lifter reads once: an overview paragraph, a table of weeks and phases, and the weekly rules. No motivational filler.

Where the athlete answered in their own words, those words win over any assumption the card options would have made: read them for the sport, the days, the kit, the injury or the deadline they describe, and if they name a length or a date, size the programme to it (never more than 8 weeks).

If a catalogue template suits the athlete's goal and sport, start from it and adapt it to their days, minutes, equipment and length rather than writing from nothing. Otherwise write from scratch.

Return only the JSON programme in the required shape.`;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

/** Best-effort edge capture: analytics must never delay a programme response. */
function captureAiGeneration(distinctId: string, properties: Record<string, unknown>): void {
  if (!posthogProjectToken || !posthogHost) return;

  void fetch(`${posthogHost.replace(/\/$/, '')}/i/v0/e/`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      api_key: posthogProjectToken,
      event: '$ai_generation',
      properties: { distinct_id: distinctId, ...properties },
    }),
  }).catch(() => console.warn('PostHog AI Observability capture failed'));
}

/** A programme as the model reads it: names, kinds and doses, no ids. */
function compactProgram(p: Row): string {
  const weeks = ((p.program_weeks as Row[]) ?? [])
    .sort((a, b) => (a.position as number) - (b.position as number))
    .map((w) => {
      const days = ((w.program_days as Row[]) ?? [])
        .sort((a, b) => (a.position as number) - (b.position as number))
        .map((d) => {
          const exercises = ((d.day_exercises as Row[]) ?? [])
            .sort((a, b) => (a.position as number) - (b.position as number))
            .map((e) =>
              [e.exercise_name, e.sets != null ? `${e.sets}x${e.reps ?? '?'}` : e.reps, e.load, e.notes]
                .filter(Boolean)
                .join(' | '),
            );
          return `    ${d.name} [${d.kind}]${d.notes ? ` ${d.notes}` : ''}${exercises.length ? '\n      ' + exercises.join('\n      ') : ''}`;
        });
      return `  ${w.name} (${w.phase})${w.description ? `: ${w.description}` : ''}\n${days.join('\n')}`;
    });
  return `# ${p.name}\n${p.summary}\n\n${p.description}\n\n${weeks.join('\n')}`;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: 'not signed in' }, 401);

  const body = await req.json().catch(() => null);
  // Older app builds still send the single-choice equipment answer.
  const brief = body ? normaliseBrief(body.brief) : null;
  if (!body || !isBrief(brief)) return json({ error: 'bad brief' }, 400);
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, NOTE_MAX) : '';
  const programId = typeof body.program_id === 'string' ? body.program_id : null;
  const streaming = body.stream === true;
  // Reworks share a session by programme; a first-time generation is a one-turn session.
  const aiSessionId = programId ?? crypto.randomUUID();
  const aiTraceId = crypto.randomUUID();

  // The response starts now, so the app sees the first stage while the
  // context below is still being read (and so iOS, which drops a request
  // that goes 60 s without a byte, stays on the line).
  const { readable, writable } = new TransformStream<Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const send = (event: unknown) => writer.write(encoder.encode(streaming ? `${JSON.stringify(event)}\n` : ' ')).catch(() => {});
  const keepAlive = setInterval(() => void send({ tick: true }), 10_000);
  if (streaming) void send({ stage: 'reading' } satisfies Progress);


  /** Everything after the request is accepted. Thrown messages are
   * written for the user and sent as `{ error }` in the body. A closure,
   * not a declaration, so the brief keeps its narrowed type inside. */
  const prepareAndWrite = async (onProgress: (p: Progress) => void): Promise<{ plan: unknown }> => {
    // Everything the model sees is read as the user, so RLS applies: the
    // catalogue, the library, and only their own instance.
    const [templates, exercises, current] = await Promise.all([
      supabase.from('programs').select(PROGRAM_SELECT).is('owner_id', null).order('name'),
      supabase.from('exercises').select('name, equipment').is('owner_id', null).eq('deleted', false).order('name'),
      programId
        ? supabase.from('programs').select(PROGRAM_SELECT).eq('id', programId).eq('owner_id', user.id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (templates.error) throw new Error('Couldn’t read the catalogue. Try again in a moment.');
    if (exercises.error) throw new Error('Couldn’t read the exercise library. Try again in a moment.');
    if (current.error) throw new Error('Couldn’t read your current program. Try again in a moment.');

    const library = (exercises.data as Row[]).map((e) => `${e.name} (${e.equipment})`).join('\n');
    const catalogue = (templates.data as Row[]).map(compactProgram).join('\n\n---\n\n');
    const today = new Date().toISOString().slice(0, 10);

    const parts = [
      `Today is ${today}. The program starts on the Monday of this week.`,
      `## The athlete\n${briefToProse(brief)}`,
    ];
    if (current.data) {
      parts.push(`## Their current program\n${compactProgram(current.data as Row)}`);
    }
    if (note) {
      parts.push(
        current.data
          ? `## What they want changed\n${note}\n\nKeep everything they didn't mention. Rewrite the whole program with the change applied.`
          : `## Something they asked for\n${note}`,
      );
    }
    parts.push(`## Exercise library (name (equipment))\n${library}`);
    parts.push(`## Catalogue templates\n${catalogue || 'None.'}`);

    const userPrompt = parts.join('\n\n');
    const aiInput = [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: userPrompt },
    ];
    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

    const startedAt = Date.now();
    let timeToFirstToken: number | undefined;
    let message;
    try {
      const stream = anthropic.messages.stream({
        model: MODEL,
        max_tokens: 64000,
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: userPrompt }],
        output_config: { effort: 'medium', format: { type: 'json_schema', schema: PLAN_JSON_SCHEMA } },
      });
      const read = progressReader(onProgress);
      stream.on('text', (_delta, snapshot) => {
        timeToFirstToken ??= (Date.now() - startedAt) / 1000;
        read(snapshot);
      });
      message = await stream.finalMessage();
      captureAiGeneration(user.id, {
        $ai_trace_id: aiTraceId,
        $ai_session_id: aiSessionId,
        $ai_span_id: crypto.randomUUID(),
        $ai_span_name: 'programme_generation',
        $ai_model: MODEL,
        $ai_provider: 'anthropic',
        $ai_input: aiInput,
        $ai_input_tokens: message.usage.input_tokens,
        $ai_output_choices: [{ role: 'assistant', content: message.content }],
        $ai_output_tokens: message.usage.output_tokens,
        $ai_latency: (Date.now() - startedAt) / 1000,
        $ai_stream: true,
        $ai_time_to_first_token: timeToFirstToken,
        $ai_stop_reason: message.stop_reason,
      });
    } catch (e) {
      const status = e instanceof Anthropic.APIError ? e.status : 500;
      captureAiGeneration(user.id, {
        $ai_trace_id: aiTraceId,
        $ai_session_id: aiSessionId,
        $ai_span_id: crypto.randomUUID(),
        $ai_span_name: 'programme_generation',
        $ai_model: MODEL,
        $ai_provider: 'anthropic',
        $ai_input: aiInput,
        $ai_latency: (Date.now() - startedAt) / 1000,
        $ai_stream: true,
        $ai_time_to_first_token: timeToFirstToken,
        $ai_http_status: status,
        $ai_is_error: true,
        $ai_error: e instanceof Error ? e.message : 'Unknown Anthropic error',
      });
      console.error('plan: model call failed', status, e instanceof Error ? e.message : e);
      throw new Error('Couldn’t reach the coach. Try again in a moment.');
    }

    if (message.stop_reason === 'refusal') throw new Error('The coach declined to write that program.');
    if (message.stop_reason === 'max_tokens') throw new Error('The program came back incomplete. Try a shorter block.');
    const text = message.content.find((b) => b.type === 'text')?.text ?? '';
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('The program came back malformed. Try again.');
    }
    const check = validatePlan(parsed);
    if (!check.ok) {
      console.error('plan: invalid plan', check.reason);
      throw new Error(`The program came back malformed (${check.reason}). Try again.`);
    }
    // Seconds matter here: the edge runtime kills a request at its wall-clock
    // limit, and a long rewrite is the one that gets close.
    console.log('plan: ok', {
      user: user.id,
      weeks: check.plan.weeks.length,
      rework: programId != null,
      seconds: Math.round((Date.now() - startedAt) / 1000),
      usage: message.usage,
    });
    return { plan: check.plan };
  };

  void (async () => {
    try {
      const result = await prepareAndWrite((p) => {
        if (streaming) void send(p);
      });
      await writer.write(encoder.encode(JSON.stringify(result) + (streaming ? '\n' : '')));
    } catch (e) {
      const error = { error: e instanceof Error ? e.message : 'Something went wrong.' };
      await writer.write(encoder.encode(JSON.stringify(error) + (streaming ? '\n' : ''))).catch(() => {});
    } finally {
      clearInterval(keepAlive);
      await writer.close().catch(() => {});
    }
  })();

  // In the legacy shape the keep-alive is a space every few seconds and
  // the JSON follows: leading whitespace is still valid JSON to the
  // client. Anything that fails after this point is a `{ error }` body,
  // since the status is already sent.
  return new Response(readable, {
    status: 200,
    headers: { 'content-type': streaming ? 'application/x-ndjson' : 'application/json' },
  });
});

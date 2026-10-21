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
// The Anthropic key lives in Supabase secrets (ANTHROPIC_API_KEY), never in
// the app.

import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { PLAN_JSON_SCHEMA, validatePlan } from '../_shared/plan-schema.ts';
import { briefToProse, isBrief } from '../_shared/brief.ts';

// The spec names the current Sonnet; move to Opus only if proposals are poor.
const MODEL = 'claude-sonnet-5-5';
const NOTE_MAX = 500;

type Row = Record<string, unknown>;

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

Write for a real person with a life: the programme must fit the days, minutes and equipment they have, not the ideal. Court or field sessions they already do are fixed and count as training load; place them on the days a club would (midweek evening, weekend morning) and lift around them: never a heavy lower-body day the morning of a court session, keep the day before a comp light or off.

Structure:
- Every week has exactly 7 days, Monday to Sunday, in order. Each day's name starts with the weekday, e.g. "Mon — Lower power". Days are one of: lifting, court, rest, comp. Rest and court days have no exercises; a court day's notes say what the session is for. A comp day is the competition itself.
- Weeks have a short name ("Week 3") and a phase ("Build", "Deload", "Taper"...) and a one-paragraph description of what the week is for.
- Lifting days have 4 to 7 exercises: warm-up isn't listed. Use exercise names from the library list exactly when one fits; invent a name only when nothing in the library is close. Give sets as a whole number, reps as text ("5", "6-8", "8/side", "30 s"), load as text ("bodyweight", "RPE 7", "70%", "heavy") and a note only when it changes how the exercise is done.
- Progress across the weeks: load, volume or intensity moves week to week, with a deload where the length warrants one. Repeat structure, vary the dose.
- Respect limitations: for a flagged knee, ankle, shoulder or back, choose joint-friendly variations and add isometric or tempo work rather than avoiding the area entirely.
- Equipment is a hard constraint. Bodyweight means no bands, no bench.
- Keep text tight. The description is markdown a lifter reads once: an overview paragraph, a table of weeks and phases, and the weekly rules. No motivational filler.

Where the athlete answered in their own words, those words win over any assumption the card options would have made: read them for the sport, the days, the kit, the injury or the deadline they describe, and if they name a length or a date, size the programme to it (never more than 8 weeks).

If a catalogue template suits the athlete's goal and sport, start from it and adapt it to their days, minutes, equipment and length rather than writing from nothing. Otherwise write from scratch.

Return only the JSON programme in the required shape.`;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
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
  if (!body || !isBrief(body.brief)) return json({ error: 'bad brief' }, 400);
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, NOTE_MAX) : '';
  const programId = typeof body.program_id === 'string' ? body.program_id : null;

  // Everything the model sees is read as the user, so RLS applies: the
  // catalogue, the library, and only their own instance.
  const [templates, exercises, current] = await Promise.all([
    supabase.from('programs').select(PROGRAM_SELECT).is('owner_id', null).order('name'),
    supabase.from('exercises').select('name, equipment').is('owner_id', null).eq('deleted', false).order('name'),
    programId
      ? supabase.from('programs').select(PROGRAM_SELECT).eq('id', programId).eq('owner_id', user.id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (templates.error) return json({ error: templates.error.message }, 500);
  if (exercises.error) return json({ error: exercises.error.message }, 500);
  if (current.error) return json({ error: current.error.message }, 500);

  const library = (exercises.data as Row[]).map((e) => `${e.name} (${e.equipment})`).join('\n');
  const catalogue = (templates.data as Row[]).map(compactProgram).join('\n\n---\n\n');
  const today = new Date().toISOString().slice(0, 10);

  const parts = [
    `Today is ${today}. The programme starts on the Monday of this week.`,
    `## The athlete\n${briefToProse(body.brief)}`,
  ];
  if (current.data) {
    parts.push(`## Their current programme\n${compactProgram(current.data as Row)}`);
  }
  if (note) {
    parts.push(
      current.data
        ? `## What they want changed\n${note}\n\nKeep everything they didn't mention. Rewrite the whole programme with the change applied.`
        : `## Something they asked for\n${note}`,
    );
  }
  parts.push(`## Exercise library (name (equipment))\n${library}`);
  parts.push(`## Catalogue templates\n${catalogue || 'None.'}`);

  const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

  /** Everything after the request is accepted. Thrown messages are
   * written for the user and sent as `{ error }` in the body. */
  async function write(): Promise<{ plan: unknown }> {
    let message;
    try {
      message = await anthropic.messages
        .stream({
          model: MODEL,
          max_tokens: 64000,
          system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: parts.join('\n\n') }],
          output_config: { effort: 'medium', format: { type: 'json_schema', schema: PLAN_JSON_SCHEMA } },
        })
        .finalMessage();
    } catch (e) {
      const status = e instanceof Anthropic.APIError ? e.status : 500;
      console.error('plan: model call failed', status, e instanceof Error ? e.message : e);
      throw new Error('Couldn’t reach the coach. Try again in a moment.');
    }

    if (message.stop_reason === 'refusal') throw new Error('The coach declined to write that programme.');
    if (message.stop_reason === 'max_tokens') throw new Error('The programme came back incomplete. Try a shorter block.');
    const text = message.content.find((b) => b.type === 'text')?.text ?? '';
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('The programme came back malformed. Try again.');
    }
    const check = validatePlan(parsed);
    if (!check.ok) {
      console.error('plan: invalid plan', check.reason);
      throw new Error(`The programme came back malformed (${check.reason}). Try again.`);
    }
    console.log('plan: ok', { user: user.id, weeks: check.plan.weeks.length, usage: message.usage });
    return { plan: check.plan };
  }

  // The coach can take over a minute, and iOS drops a request that goes
  // 60 s without a byte. So the response starts at once and streams a
  // space every few seconds until the JSON is ready; leading whitespace
  // is still valid JSON to the client. Anything that fails from here on
  // is a `{ error }` body, since the status is already sent.
  const { readable, writable } = new TransformStream<Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const keepAlive = setInterval(() => void writer.write(encoder.encode(' ')).catch(() => {}), 10_000);
  void (async () => {
    try {
      const result = await write();
      await writer.write(encoder.encode(JSON.stringify(result)));
    } catch (e) {
      await writer.write(encoder.encode(JSON.stringify({ error: e instanceof Error ? e.message : 'Something went wrong.' })));
    } finally {
      clearInterval(keepAlive);
      await writer.close().catch(() => {});
    }
  })();
  return new Response(readable, { status: 200, headers: { 'content-type': 'application/json' } });
});

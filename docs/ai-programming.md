# AI-assisted programming — spec

Status: **spec**. Needed for launch. The data model in "Templates and
instances" is built (`20261021110000_program_instances.sql`); everything
after it is to do.

## The problem

A programme is written once, but the athlete's life changes under it: a new
methodology (the high/low restructure of 21 Oct was the first case), a
tournament moves, a knee flares, court nights change. Today the only way to
change a programme is a migration written by hand. Players need to reshape
their own programme, by hand for small things and by describing what they
want for big ones.

## Templates and instances

- A programme row is a **template** (`owner_id` null, in the catalogue,
  seeded by migration, read-only to users) or an **instance** (`owner_id`
  set, one user's private copy, `template_id` pointing back).
- Selecting a template calls the `select_program` RPC, which deep-copies it
  into a fresh instance and makes that the active programme. Selecting again
  makes another fresh copy: that's "start again".
- All edits, manual or AI, happen on instances. Row-level security lets an
  owner insert, update and delete down the whole tree (weeks, days,
  exercises) of their own instances and read any template.
- Workouts reference instance days, so week completion is per instance. A
  future "reset to template" should remap workouts by week and day position
  the way the backfill did.
- Open question: instances carry their own copy of the long `description`
  markdown. Fine for now; if templates get edited later we'll want to decide
  whether instances follow.

## One apply path

A single RPC, `apply_program_plan(p_program_id uuid, p_plan jsonb)`, takes a
complete proposed programme (weeks → days → exercises, in the shape of
`RawProgram`) and writes it in one transaction:

- Refuses unless the caller owns the instance.
- Matches weeks and days by position and updates in place, so ids (and the
  workouts pointing at them) survive. New positions insert, missing ones
  delete.
- Exercise rows are replaced per day, then linked to the exercise library by
  name (the two passes from `20261014030200_day_exercises_backfill.sql`).
  Unmatched names are allowed (`exercise_id` null) but reported back.
- Returns the saved programme so the client can swap it into the query cache.

Manual editing and the agent both end here, so there's one thing to get
right and one thing to test.

## The agent

A Supabase edge function, `plan`, calls the Claude API (key in Supabase
secrets, never in the app). Model: the current Sonnet; escalate to Opus only
if proposals are poor. It is stateless: the client sends the full message
history each turn.

Inputs: the user's instance (as `RawProgram`), today's date, the active
programme's start date, the exercise library names, and the conversation so
far (the pasted text, answers to questions).

Tools the model gets:

- `get_program()` — the instance, so the system prompt can stay short.
- `ask_user(question, options?)` — ends the turn with a question. The app
  shows it as a card with tappable options or a text field; the answer goes
  back as the next user message.
- `propose_plan(plan, summary)` — the full proposed programme plus a short
  human summary of what changed and why. Ends the turn.

The model never writes to the database. The app renders the proposal as a
before/after (per week: days renamed, kinds changed, exercises added or
removed, loads changed) and only an explicit Apply calls
`apply_program_plan`. Rejecting returns to the chat with a message.

Clarifications it should ask for the kinds of requests we expect: which week
a change starts; what happens to weeks the new plan doesn't cover (replace,
keep, drop); how fixed events in the template (comps, tournaments) are kept;
how a "week by week" loads table maps onto per-week sets; whether a court
night counts as a `court` day or a note on a lifting day.

Guardrails: the plan is validated server-side against the `RawProgram`
schema and the `kind` enum before it reaches the app; positions must be
contiguous; a proposal that drops a `comp` day the template had is flagged
in the summary. Cost: one conversation is a handful of calls; cap at 20
turns.

## In the app

- Entry: Programme tab → gear → **Rework programme**. Also from the workout
  preview's Edit button for a single day, with the day as context.
- Screen: a chat. Paste or type; the model's questions appear as cards.
  Proposal appears as a review screen with Apply / Keep talking.
- After Apply: the active programme query is invalidated and the Programme
  tab shows the new week. A toast names what changed.

## Manual editing

Same apply path, no model:

- **Workout (day):** reorder, add, remove exercises; edit sets, reps, load,
  notes; rename; change kind. Exercise picker reuses the one from the live
  workout.
- **Week:** rename, reorder days, change a day's kind, edit the week
  description.
- The preview screen's Edit workout button opens the day editor.

## Onboarding: a programme from an interview

The same agent, pointed at a new user instead of an existing instance.
Design: `docs/superpowers/specs/2026-10-22-onboarding-design.md`.

- Ten one-question screens (goal, sport and court days, lifting days,
  session length, equipment, experience, limitations, what they'll give up,
  block length) produce a `TrainingBrief`
  (`supabase/functions/_shared/brief.ts`).
- The `plan` function in build mode takes the brief, the catalogue and the
  exercise library, and returns a `ProgramPlan`
  (`supabase/functions/_shared/plan-schema.ts`): a template adapted when one
  suits, written from scratch otherwise. Structured output, validated on
  both sides.
- `apply_program_plan(null, plan)` creates the instance and makes it
  active. The brief is stored on the instance (`programs.brief`) so a later
  rework has it.
- "Change something" on the reveal re-runs build with a note and the
  current instance as context, and applies to the same id.
- Sign-in is asked right before the reveal and is skippable; the crew step
  is last. The interview is re-runnable from Plan.

## Phases

1. ✅ Templates and instances (schema, RLS, `select_program`, backfill).
2. ✅ `apply_program_plan` RPC (`20261022000000_program_plans.sql`).
3. ✅ Day editor (manual) on the preview screen.
4. ✅ `plan` edge function in build mode + onboarding (interview, reveal,
   change-something). Still to do: the chat for reworking an existing
   programme by conversation, with `ask_user` questions.
5. Week editor; "reset to template".

## Interim

Until the chat exists, big restructures of an existing instance are either
a "change something" note on a rebuild, or a migration against one user's
instance, the way the high/low change was (`20261021120000_high_low_peak.sql`,
documented in `docs/programs/8-week-peak-high-low.md`).

# Onboarding: a programme from an interview — design

Date: 2026-10-22. Status: built in the same pass (see `docs/ai-programming.md`).

## Why

People are trying the app, and the only programme on offer is Peter's own
8-Week Peak. A new user needs a programme that fits their goal, sport, week
and gym, without Peter writing a migration. The agent the AI-programming
spec describes is the right tool; onboarding is its first entry point.

## Shape

Modelled on Cal AI's quiz onboarding (one question per screen, thin
progress bar, big tappable cards, a "calculating" interstitial, sign-in asked
as "save your plan" right before the reveal) carrying Hevy Trainer's
questions (experience, goal, equipment, days, session length) plus the
athlete-specific ones: sport and court days, limitations, what they'll give
up, block length or weeks to a comp.

Screens, all in `src/app/onboarding/`:

1. `index` — welcome: Build my programme / Browse programmes instead.
2. `[step]` — questions 1–10 (`features/onboarding/questions.ts`). Court
   days is skipped for no sport; the last question asks weeks-to-comp for a
   comp goal.
3. `building` — staged ticks while the `plan` function runs; builds and
   applies in one mutation (`useBuildProgram`).
4. `save` — guests only: the account card, skippable.
5. `reveal` — name, summary, three facts, week 1 at a glance. Start
   training, or Change something (a one-line note → back to `building`
   against the same instance).
6. `crew` — create (share sheet) / join / done. Guests get the pitch.

Done marks `onboarding-done:<userId>` in AsyncStorage and dismisses the
modal. The Programme tab pushes the flow on first launch when there's no
active programme and the flag is unset; its empty state and Plan both offer
"Build my programme" afterwards.

## Data

- `TrainingBrief` and `ProgramPlan` live in `supabase/functions/_shared/`,
  imported by both the edge function (Deno) and the app (Metro/Jest).
- `apply_program_plan(p_program_id, p_plan, p_start_date)`: null id creates
  an instance owned by the caller and makes it active; an id rewrites that
  instance in place, matching weeks and days by position so workouts keep
  pointing at the right days. Exercises link to the library by name.
- `programs.brief jsonb` keeps the answers on the instance.

## The agent

`supabase/functions/plan`: Claude Sonnet 5.5, structured output against the
plan JSON schema, effort medium, streamed. Context: the brief as prose,
today's date, the catalogue templates (compact), the exercise library, and
for a rework the current instance plus the note. Validated server-side and
again in the app before the RPC. Secret: `ANTHROPIC_API_KEY`.

## Not in this pass

The chat for reworking by conversation (ask_user cards, before/after
review), the week editor, reset to template.

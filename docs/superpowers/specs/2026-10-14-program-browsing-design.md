# Pull Up — Programme Browsing & Selection (Slice 1) — Design

**Date:** 2026-10-14
**Status:** Approved approach (A — relational rows, pragmatic fields)
**Scope:** First vertical slice of Pull Up (working repo name `pullup`): ship the
8-Week Peak programme inside the app as structured data backed by Supabase,
let the user select it as their active programme, and browse it fully
(overview → week → day).

## Context & intent

Pull Up is a workout tracker that turns a friend group into a training crew
(see PRD v0.1). This slice deliberately defers crews, workout logging, the AI
builder, and import. It establishes:

- The Supabase backend and schema that later slices (logging, crews,
  adherence) build on.
- The programme data model: structured enough to drive logging later, honest
  about text-heavy prescriptions ("87% TM", "3 + 1 single").
- The core navigation shell and first real screens.

Success: on a phone, open the app → see the programme list → open 8-Week
Peak → read the overview → drill into any week and day and see the exact
session tables from the source document → tap "Make this my programme" and
have that persist across restarts.

## Decisions already made

| Decision | Choice |
| --- | --- |
| Backend | Supabase, hosted project, from day one |
| Data model | Fully structured (relational rows), not JSONB blob |
| Screens | Full drill-down: list → overview → week → day |
| Selection | Sets the user's active programme (persisted per user) |
| Auth | Supabase anonymous sign-in, silent on first launch |
| Seed content | "8-Week Peak — Good Neighbour Tournament" document |

## Backend

### Supabase project & migrations

- Hosted Supabase project created by Peter; CLI linked (`supabase link`).
- Schema managed as SQL migrations in `supabase/migrations/`, applied with
  `supabase db push` (no local Docker stack).
- Project URL and publishable key supplied to the app via
  `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY` in `.env.local`
  (already created, gitignored via `.env*.local`; `.env.example` committed).

### Schema

All tables have RLS enabled.

**`programs`**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | default `gen_random_uuid()` |
| `slug` | text unique | e.g. `8-week-peak` |
| `name` | text | "8-Week Peak — Good Neighbour Tournament" |
| `summary` | text | one-liner for the list screen |
| `description` | text (markdown) | overview, weekly rules, loading key, fuelling, cramp prevention — programme-level prose |
| `created_at` | timestamptz | default now() |

**`program_weeks`**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `program_id` | uuid FK → programs | on delete cascade |
| `position` | int | 1-based order; unique per programme |
| `name` | text | "Week 1 — Mon 12 Oct" |
| `phase` | text | "Load 2", "Deload", "Convert 1", "Taper" |
| `description` | text (markdown) | week intro, comp notes, shifted-day explanations |

**`program_days`**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `week_id` | uuid FK → program_weeks | on delete cascade |
| `position` | int | 1-based order within week; unique per week |
| `name` | text | "Mon — Lower power + sprints" |
| `kind` | text | `lifting` \| `court` \| `rest` \| `comp` |
| `notes` | text (markdown), nullable | "Skip court tonight", trimmed-session caveats |

Court, rest, and comp days are real rows with no exercise rows, so a week
renders as the full 7 days.

**`day_exercises`**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `day_id` | uuid FK → program_days | on delete cascade |
| `position` | int | 1-based order within day; unique per day |
| `exercise_name` | text | free text for now; `exercise_id` FK added when the exercise library arrives |
| `sets` | int, nullable | null where the source doesn't give a count |
| `reps` | text, nullable | "3 + 1 single", "12–15", "30–45 s" |
| `load` | text, nullable | "87% TM", "RPE 8", "4 kg, max effort" |
| `notes` | text, nullable | per-exercise caveats |

**`user_programs`**

| Column | Type | Notes |
| --- | --- | --- |
| `user_id` | uuid PK, FK → auth.users | unique: one active programme per user |
| `program_id` | uuid FK → programs | |
| `selected_at` | timestamptz | default now() |

Selecting a different programme upserts the row.

### RLS policies

- `programs`, `program_weeks`, `program_days`, `day_exercises`: `SELECT`
  allowed for any authenticated user (anonymous users are authenticated).
  No client-side writes.
- `user_programs`: `SELECT` / `INSERT` / `UPDATE` / `DELETE` only where
  `user_id = auth.uid()`.

### Auth

- Supabase anonymous sign-in on first launch, performed silently during app
  bootstrap; session persisted on-device.
- No signup/login UI in this slice. Anonymous users can later be converted
  in place to Apple/email identities (Supabase supports linking), so nothing
  here is throwaway.

### Seed data

The 8-Week Peak document is encoded as a SQL seed migration:

- 1 programme, 7 week rows (Load 2, Deload, Convert 1–4, Taper), 7 day rows
  per week (49 days), exercise rows for every lifting session.
- The Convert-phase session templates are **materialised per week**: the
  week-by-week load table (e.g. Convert 2 main lifts "4 × 3 @ 80%") is
  applied so each week's day shows concrete prescriptions, including the
  trimmed comp-week Thursday and the shifted days in the week of 9 Nov.
- Programme-level prose (overview, weekly rules, warm-up, knee/lateral work,
  loading key, comp-day fuelling, cramp prevention, progress markers,
  non-negotiables) goes into `programs.description` verbatim as markdown.
- Week intros and day caveats go into `program_weeks.description` /
  `program_days.notes`.

**Seed verification:** after `db push`, a check (script or SQL) confirms:
1 programme, 7 weeks, 49 days, and a non-zero exercise count for every
`lifting` day.

## App

### New dependencies

- `@supabase/supabase-js` plus the storage adapter Expo SDK 57 requires for
  React Native session persistence (exact packages confirmed against current
  Supabase + Expo docs at implementation time, per AGENTS.md).
- `@tanstack/react-query` for fetching, caching, and uniform
  loading/error states.
- A lightweight React Native markdown renderer for the prose fields
  (chosen at implementation time against SDK 57 compatibility).

### Code layout

Routes in `src/app/`, everything else outside (per AGENTS.md):

```
src/
  lib/supabase.ts                  # client + anonymous-auth bootstrap
  features/programs/
    types.ts                       # Program, ProgramWeek, ProgramDay, DayExercise, view-models
    api.ts                         # typed queries against Supabase
    hooks.ts                       # usePrograms, useProgram, useActiveProgram, useSelectProgram
    components/                    # ExerciseTable, WeekCard, DayRow, PhaseTimeline
  app/
    _layout.tsx                    # root stack; query client; auth bootstrap
    index.tsx                      # programme list
    program/[id]/index.tsx         # programme overview
    program/[id]/week/[weekId].tsx # week detail
    program/[id]/day/[dayId].tsx   # day detail
```

Demo scaffold screens and components (`explore.tsx`, hint rows, web badge,
etc.) are removed. `app.json` display name becomes **Pull Up**.

### Screens

1. **Programme list (`index.tsx`)** — all programmes; the active one badged
   and pinned on top. Tap → overview.
2. **Programme overview (`program/[id]/index.tsx`)** — name, summary,
   phase/comp timeline derived from week rows (phase + comp mentions),
   rendered `description` markdown, tappable week list, and a
   "Make this my programme" button (state: not selected / selected).
3. **Week detail** — week name, phase, intro markdown, all 7 days in order
   with kind icons; lifting days navigate to day detail; court/rest/comp
   days show their notes inline.
4. **Day detail** — day name, notes, exercise table: name / sets × reps /
   load, with per-exercise notes.

### Error handling

- Every query screen has loading, error (with retry), and empty states via
  React Query.
- Anonymous sign-in failure surfaces a blocking retry screen (the app is
  useless without a session).
- No offline support in this slice; the PRD's offline requirement applies to
  logging, which doesn't exist yet.

## Testing

- `jest-expo` configured now.
- Unit tests for the data layer: row → view-model mapping (grouping days
  into weeks, ordering by position, phase-timeline derivation), and the
  select-programme upsert hook logic (mocked client).
- Seed integrity verified against the counts above after push.
- Screens verified manually on the iOS simulator.
- `npx expo lint` and `npx tsc --noEmit` gate every task.

## Out of scope (this slice)

Workout logging, progress/PRs, crews, nudges, AI programme builder,
programme import, editing programmes, offline support, kg/lb settings,
identity upgrade (Apple/email), Android-specific polish, web.

## Open questions deferred

- Programme template vs. dated instance: 8-Week Peak's dates are baked into
  week/day names for now. When other users run a programme on their own
  calendar, a start-date/instance concept will be needed — deliberately not
  modelled yet.
- Exercise library (`exercise_id`) and structured progression rules arrive
  with the logging slice.

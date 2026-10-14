# Pull Up — Design v2 (Flighty-inspired) + Today-first IA — Design

**Date:** 2026-10-14
**Status:** Approved direction (references: Flighty visual language, Runna
information architecture, Hevy logging UX)
**Supersedes:** the "no redesign" constraint of sub-project A and all
`@expo/ui` component usage in screens. The Unistyles token foundation and
dev build from sub-project A are the base; this extends them.

## Direction

Pull Up is a countdown to a real event: the 8-Week Peak ends at the Good
Neighbour tournament. The design leans into that — time is the hero.

- **Signature element — the countdown numeral.** Flighty's oversized
  left-rail day numbers become Pull Up's motif: Today carries a
  `T–<n> days · <comp name>` eyebrow derived from the programme's next
  `comp` day; week and activity lists use an oversized numeral rail
  (day-of-month or week number) beside quiet content. The numeral style:
  system font, weight 800, tabular numerals, tight tracking.
- Everything else is disciplined: generous whitespace, one accent in play
  per screen, no decoration that doesn't encode information.

## Tokens (extend `src/styles/unistyles.ts`)

**Colors** (light / dark):
- `canvas` #F4F5F7 / #0B0D12 (replaces `bg` as the screen ground; keep `bg`
  as alias or migrate — implementer picks one and applies consistently)
- `card` #FFFFFF / #15181E; `cardElevated` #FFFFFF / #1D212A
- `ink` #0B0D12 / #F4F5F7; `inkMuted` #697080 / #8A91A0
- `accent` #208AEF / #4DA6F5 (actions, active tab); `onAccent` as today
- `done` #30C25B / #3AD66B (completed sets/rows — Hevy green, used as tint
  + 12–16% alpha row fill)
- `comp` #E8590C / #FF7A33 (comp days, countdown accents)
- `border` #E3E5EA / #262B33
- Gradients (two-stop token pairs): `gradientRecap` ['#0E2A5C','#1D4ED8'] /
  ['#0A1F44','#1E40AF']; `gradientEmber` ['#7A1E1E','#C2410C'] (both themes)
  — recap/summary cards and comp-week banners. Rendered with
  `expo-linear-gradient`.

**Type scale** (system font / SF Pro — Flighty's own approach; no custom
font assets):
- `display` 34 / 800, letterSpacing -0.5 (screen titles)
- `numeralXL` 44 / 800, tabular-nums (signature numerals)
- `title` 22 / 700; `heading` 17 / 600; `body` 15 / 400; `caption` 13 / 500
  (used with `inkMuted`); `label` 11 / 700, uppercase, letterSpacing 0.8
  (eyebrows, table headers)

**Shape/elevation:** radii add `xl: 20`, `pill: 999`; `shadow.card` (subtle:
y2 blur12 @ 8% ink), `shadow.float` (tab bar: y6 blur24 @ 12%).

## Core components (`src/components/ui/`)

All custom RN + Unistyles; `@expo/ui` is removed from screens entirely.
Icons via `expo-symbols` (SF Symbols) with sensible fallbacks.

- `Screen` — canvas bg + safe-area padding wrapper.
- `ScreenTitle` — display-type title row with optional circular icon
  buttons (`IconCircle`) on the right.
- `Card` — card bg, radius xl, `shadow.card`, padding lg.
- `GradientCard` — LinearGradient + same geometry; white/onDark text roles.
- `SectionLabel` — `label` type eyebrow.
- `NumeralRow` — the signature list row: oversized numeral + label on the
  left rail, content block to the right, hairline divider.
- `DayStrip` — Mon–Sun horizontal strip: weekday label + day number; dot(s)
  under days with planned sessions (dot color = session kind); today gets a
  filled ring; selected day highlighted; tap to select.
- `WorkoutCard` — Runna-style: 4pt colored left edge (kind color), title,
  meta line, trailing checkmark circle when completed, chevron otherwise.
- `PillTabBar` — floating rounded-pill tab bar (custom `tabBar` for
  expo-router Tabs): card bg + `shadow.float` (solid bg; no blur dependency
  unless trivially available via expo-blur), SF Symbol + label per tab,
  accent active state.
- `PrimaryButton` — full-width pill CTA (accent bg, onAccent text) — the
  "Start workout" / "Finish" actions.

## Information architecture (Runna-style)

expo-router tab group:

```
src/app/(tabs)/_layout.tsx    # Tabs + PillTabBar
src/app/(tabs)/index.tsx      # Today
src/app/(tabs)/plan.tsx       # programme browse entry (current home content)
src/app/(tabs)/activities.tsx # finished-workout history
```

Programme detail (`/program/...`) and workout (`/workout/...`) routes stay
stack-presented above the tabs.

**Today** (default tab):
- `ScreenTitle` "Today" + comp countdown eyebrow (`T–<n> days ·
  <comp day name>`, from the active programme's next `comp`-kind day at or
  after today; hidden when none).
- Week selector line: "Week <k> of <n> · <phase>".
- `DayStrip` for the current programme week; selecting a day swaps the card
  below.
- Selected day's `WorkoutCard` (kind, name, exercise count; checkmark when
  a finished workout exists for that `program_day_id`) — tapping opens the
  day detail; rest/court days render as informational cards.
- `PrimaryButton` "Start workout" for lifting days (wired to sub-project
  B's start flow once it exists; until then it deep-links to the day
  detail screen).
- No active programme → empty state pointing at the Plan tab.

**Plan**: the existing programme list (restyled with `Card`s), → overview →
week (NumeralRow days) → day. Same routes, new skin.

**Activities**: finished workouts, newest first, as `NumeralRow`s (day
numeral + date label rail; workout title, duration/volume meta). Empty
state: "No workouts yet — your first session will show up here." Fed by
sub-project B's store; ships as the empty state until B's store lands.

## "Today" mapping (schema + logic)

- New migration: `alter table public.user_programs add column start_date date`
  — set on selection; `selectProgram` now writes `start_date` = the Monday
  of the selection week (client-computed, local calendar). Existing row
  backfilled in the migration to the Monday of its `selected_at` week.
- Pure functions (tested; date-only arithmetic on local calendar dates —
  no UTC conversions that shift days):
  - `currentProgramPosition(startDate, today)` → `{ week: number, day: 1–7 }`
    (clamped to the programme's range; before start → week 1 day 1 preview;
    after end → last week, marked `finished`).
  - `nextCompDay(program, position)` → `{ dayName, date, daysAway } | null`.
- This is the first piece of the scheduling model discussed earlier
  (per-day offsets remain future work; weekday mapping is template order
  for now).

## Logging-screen skin (consumed by sub-project B)

Hevy UX as specced in the workout-logging design, rendered in this system:
- Header: collapse chevron + elapsed time (accent), rest-timer icon,
  `Finish` as compact accent pill.
- Exercise cards: `Card` with exercise name in `heading` + accent, notes
  placeholder, rest-timer row.
- Set table: `label`-type column headers (SET / PREVIOUS / KG / REPS / ✓);
  completed rows get `done`-tinted row fill + filled check square (Hevy's
  green); set numerals tabular.
- Finish summary: `GradientCard` recap (Flighty-passport style): big
  numerals for duration / volume / sets, per-exercise best-set list below.

## Dependencies

`expo-linear-gradient` (gradients), optionally `expo-blur` (tab bar — only
if trivial), both via `npx expo install`. `expo-symbols` already installed.

## Out of scope

Custom font assets; animations beyond standard navigation/press feedback
(a later polish pass); Android visual QA; crew/social tabs; week-picker
sheet (the "Week 1/8" line is informational this slice — tapping routes to
the Plan tab's overview).

## Revision (2026-10-14)

Unistyles v3 removed in favor of plain RN `StyleSheet` + `useTheme()` /
`useThemedStyles()` to restore Expo Go compatibility (Unistyles' native
module, via `react-native-nitro-modules`, required a development build).
Token values and visual design are unchanged — the theme module moved
verbatim to `src/styles/theme.ts` (light/dark theme objects + `Theme`
type), with live light/dark switching now driven by RN's `useColorScheme()`
instead of Unistyles' adaptive-themes setting.

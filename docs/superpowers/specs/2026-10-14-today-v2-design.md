# Pull Up — Today Page v2 — Design

**Date:** 2026-10-14
**Status:** Approved direction (Peter: "model off of Nike mostly, but take
more of the utility of the Runna top bar + floating button")
**Depends on:** workout-logging (merged) — store, selectors, start-guard.
**Parents:** design-v2 spec (tokens/components; its Today section is
superseded by this file), workout-logging spec.

## Direction

- **Nike Run Club** supplies the body: the current week as a vertically
  scrolling checklist — every day visible as a card, completed days
  checked, plus a segmented week-progress bar ("Workouts completed: X of N").
- **Runna** supplies the utility chrome: a compact top bar with the week
  indicator and the glanceable day strip (dots + today ring), and the
  floating primary-action button above the tab bar.
- The comp-countdown eyebrow (our signature) stays at the very top.

## Layout (top to bottom)

1. `ScreenTitle` "Today".
2. Countdown eyebrow (`T–<n> DAYS · <comp day>`, comp color; hidden when
   none / programme finished) — unchanged logic.
3. **Utility bar (Runna):** "Week <k> of <n> · <phase>" (tap → programme
   overview) and the existing `DayStrip` in compact form — dots by kind,
   today ring, **tap scrolls the week list to that day's card** (selection
   no longer swaps a single card; the strip is a jump-nav + glance row).
4. **Week progress (Nike):** segmented bar — one segment per lifting day
   this week, filled (done color) when that day has a finished workout;
   caption "Workouts completed: X of N".
5. **Week list (Nike):** all 7 days in position order as cards:
   - Today's card **promoted**: "TODAY" `label`-type eyebrow, accent left
     edge, full meta.
   - Completed days: done-colored check circle (existing `WorkoutCard`
     affordance), slightly muted.
   - Past, undone lifting days: "Missed" caption in `inkMuted` (visual
     only — roll-forward scheduling remains future work).
   - Future days: standard quiet cards.
   - Lifting days navigate to day detail; court/rest/comp cards are
     informational (not pressable), notes shown as meta.
6. **Floating action button (Runna):** pinned above the glass tab bar
   (safe-area + tab-bar-height aware), pill, `shadow.float`. Context-aware
   label/action, first match wins:
   - Active workout exists → **"Resume workout"** → push `/workout/[id]`.
   - Today is a lifting day without a finished workout → **"Start today's
     session"** → start-guarded `startWorkoutFromDay`.
   - Otherwise → **"Start workout"** → start-guarded `startEmptyWorkout`.
   It replaces BOTH the inline "Start workout" `PrimaryButton` and the
   quiet "Start empty workout" link. The `ResumeBanner` card is removed
   from Today (delete the component if unreferenced afterwards).
   The week list's scroll content reserves clearance so the last card
   clears the floating button + tab bar.

## States

- No active programme: title + "No active programme" card (→ Plan tab) +
  floating "Start workout". No strip/progress/list.
- Programme finished: title + finished card + floating button ("Resume
  workout" if one is active, else "Start workout"); countdown hidden.
- Loading/error: existing QueryFallback behavior unchanged.

## Data/logic additions (pure, tested)

- `weekCompletion(workouts, days): Map<programDayId, boolean>` (or
  equivalent record) — finished non-deleted workout per day; feeds list
  checkmarks AND the progress segments (segments derive from
  `days.filter(kind === 'lifting')` in position order).
- Day-state derivation for the list: `todayState(day, position, completion)
  → 'today' | 'done' | 'missed' | 'upcoming' | 'info'` — pure + tested
  (missed = lifting, position < today's position, not done; non-lifting
  days are 'info' regardless, except they can be 'done'-decorated court/comp
  days are out of scope — only lifting days complete).
- Floating-button state selection — pure + tested (active > today-lifting
  -undone > fallback).

## Out of scope

Roll-forward of missed sessions; crew avatars on day rows (the layout is
deliberately crew-ready); next-week preview; strip removal (kept per
Runna-utility direction); animations beyond press feedback.

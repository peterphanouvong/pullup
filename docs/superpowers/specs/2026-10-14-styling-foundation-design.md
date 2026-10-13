# Pull Up — Styling Foundation with Unistyles v3 (Sub-project A) — Design

**Date:** 2026-10-14
**Status:** Approved approach
**Scope:** Adopt Unistyles v3 on a development build, define the app theme
(light + dark), and restyle the four existing screens with tokens. No visual
redesign — consistency, dark-mode correctness, and a foundation the logging
UI (sub-project B) builds on.

## Context

Slice 1 shipped programme browsing styled with ad-hoc inline styles and
`@expo/ui` native components. Peter chose Unistyles v3
(https://unistyl.es/v3/start/configuration/) as the styling layer going
forward (GlueStack explicitly rejected earlier). Unistyles v3 is a
C++/Nitro-modules library: it does not run in Expo Go, so the project moves
to a development build — approved, and also required later by MMKV
(sub-project B).

## Decisions already made

| Decision | Choice |
| --- | --- |
| Styling library | Unistyles v3 (react-native-unistyles@^3) |
| Runtime | Development build via `npx expo run:ios` (CNG; `ios/` stays generated and gitignored) |
| Theme modes | Light + dark, `adaptiveThemes: true` (follows system; no in-app toggle) |
| Scope of restyle | Existing screens/components only; no redesign, no new screens |
| @expo/ui components | Kept as-is; they style themselves natively. Unistyles styles RN views/text |

## Dev build

- `npx expo install react-native-unistyles react-native-nitro-modules
  react-native-edge-to-edge` (exact dep list confirmed against the
  Unistyles v3 getting-started doc at implementation time, per AGENTS.md).
- Babel: create `babel.config.js` with `babel-preset-expo` plus the
  `react-native-unistyles/plugin` entry configured with the Unistyles
  docs' recommended options for an Expo Router project whose code lives
  in `src/` (the plugin must process every file that uses Unistyles).
- First run: `npx expo run:ios` builds the dev client; day-to-day remains
  `npx expo start`.
- Expo Go no longer runs the app. README gains a one-paragraph "running
  the app" note.

## Theme

`src/styles/unistyles.ts`, imported at the app entry (root `_layout.tsx`,
first import) before any stylesheet is created:

- **Colors** (per theme): `bg`, `surface`, `surfaceAlt`, `text`,
  `textMuted`, `accent` (#208AEF in light; a lighter variant for dark),
  `onAccent`, `success`, `danger`, `border`.
- **Spacing:** `xs 4, sm 8, md 12, lg 16, xl 24, xxl 32`.
- **Radii:** `sm 6, md 10, lg 14`.
- **Type scale:** `title (20/700)`, `heading (17/600)`, `body (15/400)`,
  `caption (13/400 muted)` as `{fontSize, fontWeight}` token objects.
- **Breakpoints:** `xs: 0` only (phones; more when a tablet/web pass
  happens).
- `settings: { adaptiveThemes: true }`.
- TypeScript module augmentation (`UnistylesThemes`, `UnistylesBreakpoints`)
  so tokens autocomplete.

Both themes define every token (no partial dark theme). The existing
`src/constants/theme.ts` and `use-theme`/`use-color-scheme` hooks are
retired in favor of Unistyles if nothing else consumes them after the
restyle; `themed-text`/`themed-view` components are removed where the
restyle makes them redundant.

## Restyle pass

Screens: programme list, overview, week, day. Components: `QueryFallback`,
`DayRow`, `ExerciseTable`, `Markdown`, `PhaseTimeline`-equivalent text,
`AuthGate` fallback views.

- Inline style objects move to `StyleSheet.create((theme) => ...)` from
  `react-native-unistyles`, consuming tokens.
- Text styling goes through the type-scale tokens; hardcoded hex values
  (`#555`, `#208AEF`, `#b91c1c`) are eliminated.
- The `Markdown` wrapper gets a theme-driven style map (body text color/size
  from tokens) so programme prose is legible in dark mode.
- Layout, copy, and component structure stay the same — a reviewer should
  see style-only diffs plus the removed hex literals.

## Error handling / testing

- No new runtime behavior. `npx jest --silent`, `npx expo lint`,
  `npx tsc --noEmit` stay green; existing tests untouched (none assert
  styles).
- Unistyles needs its config imported before components render in jest:
  if the suite trips on it, add the Unistyles-documented jest setup
  (mock or setup file) rather than ad-hoc mocks.
- Manual verification on the dev build: all four screens in light AND dark
  mode; a screenshot pass per mode.

## Out of scope

Visual redesign, new screens, in-app theme toggle, Android build
verification (tracked, not gating), web styling pass, GlueStack or any
component library.

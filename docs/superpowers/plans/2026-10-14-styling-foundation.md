# Styling Foundation (Sub-project A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adopt Unistyles v3 on a development build, define the Pull Up theme (light + dark), and restyle the existing screens with tokens — no redesign.

**Architecture:** Unistyles v3 (Nitro-based, dev-build only) configured via `StyleSheet.configure` in `src/styles/unistyles.ts`, imported first at the app entry; a babel plugin processes `src/`; all ad-hoc inline styles and hex literals in existing screens/components move to theme tokens; scaffold theme hooks retire.

**Tech Stack:** react-native-unistyles@3, react-native-nitro-modules, react-native-edge-to-edge, Expo SDK 57 CNG dev build.

**Spec:** `docs/superpowers/specs/2026-10-14-styling-foundation-design.md`

## Global Constraints

- Install deps ONLY with `npx expo install <pkg>`; pin `react-native-nitro-modules` to the version the Unistyles compatibility table names for unistyles 3.x (check https://unistyl.es/v3/start/getting-started/ and the repo's compatibility notes at implementation time).
- `ios/`/`android/` are generated (CNG): `npx expo prebuild --clean` / `npx expo run:ios` may create them locally but they stay gitignored — never commit or hand-edit them.
- Theme tokens are the spec's exact set: colors `bg, surface, surfaceAlt, text, textMuted, accent, onAccent, success, danger, border`; spacing `xs:4, sm:8, md:12, lg:16, xl:24, xxl:32`; radii `sm:6, md:10, lg:14`; type scale `title(20/700), heading(17/600), body(15/400), caption(13/400)`; breakpoints `{ xs: 0 }`; `settings: { adaptiveThemes: true }`. Light accent `#208AEF`.
- After the restyle: zero hardcoded hex color literals in `src/app/` and `src/features/` (grep-checkable), excluding the theme file itself.
- No visual redesign: component structure, copy, and layout stay; style values route through tokens.
- Every task ends with `npx jest --silent`, `npx expo lint`, `npx tsc --noEmit` all clean.
- Commits stage only task files — never `git add -A`.

## Review Focus

1. **Unistyles config imported too late** — config must execute before any `StyleSheet.create` consumer renders (Expo Router: per https://unistyl.es/v3/guides/expo-router, which the implementer must read); a late import crashes at startup only on device. → Task 1 includes a dev-build boot (or best-possible bundle check) + Task 3's manual pass.
2. **Jest breakage** — unistyles' native module isn't available under jest-expo; the suite must stay green. → Task 1 adds the Unistyles-documented jest setup/mocks if (and only if) the existing suite breaks, and proves `npx jest --silent` green.
3. **Dark-mode regressions** — every restyled view must take background/text from tokens; a missed `backgroundColor` shows white-on-white in dark mode. → Task 3 manual light+dark pass on all four screens (human).
4. **Dead theme scaffolding left half-removed** — `themed-text`, `themed-view`, `constants/theme.ts`, `use-theme`, `use-color-scheme(.web)` must be fully removed or fully kept-and-working; a dangling import breaks the bundle. → Task 2 greps for remaining consumers before deleting; tsc gates it.
5. **Markdown prose illegible in dark mode** — the `Markdown` wrapper previously relied on renderer defaults (dark text). → Task 2 gives it a token-driven style map; Task 3's manual pass checks programme description in dark mode.

---

### Task 1: Dev build + Unistyles installation and theme

**Files:**
- Create: `babel.config.js`, `src/styles/unistyles.ts`
- Modify: `src/app/_layout.tsx` (add config import as FIRST import), `package.json` (deps), `README.md` (running-the-app note)

**Interfaces:**
- Produces: theme tokens importable via `react-native-unistyles` `StyleSheet.create((theme) => ...)` everywhere under `src/`; `AppThemes`/augmentation so `theme.colors.accent` etc. typecheck. Tasks 2–3 consume exactly the token names in Global Constraints.

- [ ] **Step 1: Read the two doc pages** — https://unistyl.es/v3/start/getting-started/ and https://unistyl.es/v3/guides/expo-router — and note the current install command, nitro-modules pin, babel plugin options, and the Expo Router entry-import guidance. The brief's snippets below follow the docs as of planning; the docs win on conflict.

- [ ] **Step 2: Install**

```bash
npx expo install react-native-unistyles react-native-nitro-modules react-native-edge-to-edge
```

(If `expo install` picks a nitro-modules version outside the Unistyles compatibility table, pin the documented one in package.json and re-run `npx expo install --fix`.)

- [ ] **Step 3: Babel config** (`babel.config.js`)

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [['react-native-unistyles/plugin', { root: 'src' }]],
  };
};
```

- [ ] **Step 4: Theme file** (`src/styles/unistyles.ts`) — the full token set:

```ts
import { StyleSheet } from 'react-native-unistyles';

const shared = {
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radii: { sm: 6, md: 10, lg: 14 },
  type: {
    title: { fontSize: 20, fontWeight: '700' },
    heading: { fontSize: 17, fontWeight: '600' },
    body: { fontSize: 15, fontWeight: '400' },
    caption: { fontSize: 13, fontWeight: '400' },
  },
} as const;

const lightTheme = {
  ...shared,
  colors: {
    bg: '#FFFFFF',
    surface: '#F2F2F7',
    surfaceAlt: '#E9E9EF',
    text: '#111214',
    textMuted: '#6B6E76',
    accent: '#208AEF',
    onAccent: '#FFFFFF',
    success: '#1F9D55',
    danger: '#C0392B',
    border: '#D9D9E0',
  },
} as const;

const darkTheme = {
  ...shared,
  colors: {
    bg: '#0E0F12',
    surface: '#1A1C20',
    surfaceAlt: '#24262C',
    text: '#F3F4F6',
    textMuted: '#9CA0A8',
    accent: '#4DA6F5',
    onAccent: '#0E0F12',
    success: '#34C277',
    danger: '#E05B4D',
    border: '#32353C',
  },
} as const;

const appThemes = { light: lightTheme, dark: darkTheme };
const breakpoints = { xs: 0 } as const;

type AppThemes = typeof appThemes;
type AppBreakpoints = typeof breakpoints;

declare module 'react-native-unistyles' {
  export interface UnistylesThemes extends AppThemes {}
  export interface UnistylesBreakpoints extends AppBreakpoints {}
}

StyleSheet.configure({
  themes: appThemes,
  breakpoints,
  settings: { adaptiveThemes: true },
});
```

- [ ] **Step 5: Entry import** — per the Expo Router guide: typically `import '@/styles/unistyles';` as the first import of `src/app/_layout.tsx` (follow the guide exactly if it prescribes a different entry point).

- [ ] **Step 6: Build and verify** — `npx expo prebuild --clean` then `npx expo run:ios` if the environment can; otherwise background `npx expo start` + iOS bundle curl (0 errors) as the fallback and SAY SO (the controller/human completes the on-device boot). Run `npx jest --silent` — if unistyles breaks jest, apply the Unistyles-documented jest setup (mock/setup file per their testing guide), nothing ad-hoc. Then `npx expo lint && npx tsc --noEmit`.

- [ ] **Step 7: README note + commit** — short "Running the app" paragraph (dev build required, `npx expo run:ios` first time, `npx expo start` after; no Expo Go).

```bash
git add babel.config.js src/styles/unistyles.ts src/app/_layout.tsx package.json pnpm-lock.yaml README.md
git commit -m "feat: adopt Unistyles v3 with Pull Up theme on dev build"
```

(Plus the jest setup file if one was needed.)

---

### Task 2: Restyle shared components + retire scaffold theming

**Files:**
- Modify: `src/features/programs/components/query-fallback.tsx`, `src/features/programs/components/markdown.tsx`, `src/features/programs/components/day-row.tsx`, `src/features/programs/components/exercise-table.tsx` (only if it has RN-styled parts; @expo/ui internals stay), `src/lib/auth.tsx`
- Delete (after grep confirms zero remaining imports): `src/components/themed-text.tsx`, `src/components/themed-view.tsx`, `src/constants/theme.ts`, `src/hooks/use-theme.ts`, `src/hooks/use-color-scheme.ts`, `src/hooks/use-color-scheme.web.ts`

**Interfaces:**
- Consumes: Task 1's tokens.
- Produces: components styled via `StyleSheet.create((theme) => ...)`; `Markdown` renders token-colored prose (consumed visually by Task 3's screens).

- [ ] **Step 1: Grep for consumers of the scaffold theme files** (`grep -rn "themed-text\|themed-view\|constants/theme\|use-theme\|use-color-scheme" src/`). Migrate any remaining consumer to tokens, then delete the files. If something still genuinely needs them, STOP and report (plan defect) rather than keeping both systems.

- [ ] **Step 2: Restyle the components** — pattern (example for `query-fallback.tsx`; apply equivalently to the others):

```tsx
import { ActivityIndicator, Button, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

export function QueryFallback({ isError, message, onRetry }: { isError: boolean; message: string; onRetry: () => void }) {
  return (
    <View style={styles.container}>
      {isError ? (
        <>
          <Text style={styles.message}>{message}</Text>
          <Button title="Retry" onPress={onRetry} />
        </>
      ) : (
        <ActivityIndicator />
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.bg,
  },
  message: { ...theme.type.body, color: theme.colors.text },
}));
```

`Markdown` gets a token style map (body/heading/table colors + sizes from `theme.type` and `theme.colors` — body text `theme.colors.text`, table borders `theme.colors.border`). `auth.tsx` fallback views get `bg`/`text` tokens. `day-row.tsx` text uses `heading`/`caption` tokens.

- [ ] **Step 3: Gates and commit**

```bash
npx jest --silent && npx expo lint && npx tsc --noEmit
git add -u src/ && git status --short   # verify ONLY intended files staged, then
git commit -m "feat: restyle shared components with theme tokens, retire scaffold theming"
```

---

### Task 3: Restyle screens + verification

**Files:**
- Modify: `src/app/index.tsx`, `src/app/program/[id]/index.tsx`, `src/app/program/[id]/week/[weekId].tsx`, `src/app/program/[id]/day/[dayId].tsx`

**Interfaces:**
- Consumes: tokens + restyled components. Produces: the finished sub-project.

- [ ] **Step 1: Restyle each screen** — move inline style objects to `StyleSheet.create((theme) => ...)`; all text through type tokens; screen backgrounds `theme.colors.bg`; the overview's Section headers use `theme.type.heading`; eliminate every hex literal. Structure/copy unchanged.

- [ ] **Step 2: Hex sweep** — `grep -rnE "#[0-9a-fA-F]{3,8}" src/app src/features src/lib` must return nothing (theme file excluded by path).

- [ ] **Step 3: Gates**

```bash
npx jest --silent && npx expo lint && npx tsc --noEmit
```

Plus an iOS bundle check (background `expo start` + curl, 0 errors).

- [ ] **Step 4: Manual light/dark pass (human)** — all four screens in light and dark (simulator appearance toggle): no white-on-white/black-on-black, markdown prose legible in dark, accent/comp markers visible in both. The controller hands this to the human alongside the final review.

- [ ] **Step 5: Commit**

```bash
git add -u src/app && git commit -m "feat: restyle screens with theme tokens"
```

# Pull Up — component style guide

The patterns this app has settled on, and the reasons behind the ones that
look arbitrary. Written after a long design pass, so most entries exist
because something broke or looked wrong first.

## Platform ground rules

- **Expo Go must keep working.** No custom native modules, ever. This is why
  Unistyles/nitro/MMKV were ripped out. `@expo/ui` and `expo-symbols` are
  fine — they ship inside Expo Go.
- **Dark by default.** `userInterfaceStyle: "dark"` in `app.json` covers real
  builds; `Appearance.setColorScheme('dark')` in `src/app/_layout.tsx` covers
  Expo Go, which ignores the manifest. The runtime call is what makes *native*
  chrome (nav bars, tab bar, keyboards) go dark, not just our own views.
- **Prefer the native thing.** Native tab bar, native navigation bars, native
  header items, SwiftUI buttons. Reach for a styled `Pressable` only where a
  native control can't go (see "Where SwiftUI can't go").

## Theming

All colour, spacing, type and shadow live in `src/styles/theme.ts`. Consume
them through `useTheme()` / `useThemedStyles(createStyles)`.

- **No hex outside `theme.ts`.** If you need a new shade, add a token with a
  comment explaining what it's for.
- `createStyles` is always a **module-level** function. An inline factory
  defeats the memoisation in `useThemedStyles` and rebuilds styles every
  render.
- Numerals that update (timers, weights, set counts) get
  `fontVariant: ['tabular-nums']` so they don't jitter.

### Tokens worth knowing

| Token | Use |
| --- | --- |
| `canvas` / `card` | Screen background / opaque card |
| `glass` / `glassBorder` | Translucent card fill + hairline edge |
| `glassControl` | Round buttons sitting on a glass surface |
| `glassSolid` | `glass` flattened over `canvas`; the fill for set-row chips |
| `accent` / `onAccent` | Primary blue (buttons, exercise names) and white on it |
| `done` (same blue) / `doneRow` / `doneChip` | Completion colour, the completed-row wash, and a completed set's number chip |
| `activeRow` / `activeRowBorder` | The set row currently being edited |
| `comp` / `danger` | Competition days / destructive actions |

Set rows have no backing of their own. The swipeable keeps its actions at
opacity 0 until a swipe starts, so the row doesn't need to be opaque to hide
them. `glassSolid` instead fills the row's controls (see "Lists and rows").

## Cards

`Card` (`src/components/ui/card.tsx`) is the surface: translucent `glass`
fill, hairline `glassBorder`, radius `xl`, padding `lg`, plus real Liquid
Glass behind it.

- **`GlassSurface`** (`src/components/ui/glass-surface.tsx`) is SwiftUI's
  `.glassEffect` pinned behind ordinary RN content, `pointerEvents="none"`.
  SwiftUI hosts can only contain SwiftUI children, so this is a background
  layer rather than a wrapper. The translucent fill underneath is the
  pre-iOS-26 fallback.
- Glass refracts what's *behind* it. Over a flat canvas it reads as a quiet
  tint; it earns its keep where content scrolls under it.
- Pass `glass={false}` for cards inside dense lists or stacked on other
  cards — each glass layer is a hosting view, and they aren't free.
- Any card hosting a glass layer needs `overflow: 'hidden'` to clip it to the
  corners.

### Row cards (`WeekDayCard`)

Plan-row anatomy, left to right: identity block (weekday + kind label),
hairline divider, title with at-a-glance metrics, then a trailing done-check
or chevron. The active row carries its own primary button — **the card is the
preview, the button is the commitment.**

The card marks **done** the same way a completed set row
is: a filled tick and a soft `doneRow` wash, at full strength. Never dim a
finished card with opacity or muted text — on a dark canvas that reads as
disabled, not complete. A finished day also glows: a soft blue
halo (`theme.shadow.glow`) on an unclipped wrapper. Today is a thin 1pt blue
edge, not a heavy border or recoloured text; the card clips to its corners, so a shadow on the card itself would
be cut off. Days you skipped are left exactly as they
were: a missed session is a fact, not a scolding, and fading half the week
makes it harder to read for no gain.

## Buttons

- **`NativeButton`** (`src/components/ui/native-button.tsx`) is the default:
  a real SwiftUI button with four `variant`s, heaviest first:

  | Variant | SwiftUI style | Use |
  | --- | --- | --- |
  | `primary` | `glassProminent` in `accent` | Commitments: Start workout, Done |
  | `secondary` (default) | `glass` | Optional but real: Add Exercise, Share |
  | `tonal` | `glassProminent` tinted `tonalFill` | Actions inside a card: Add Set |
  | `ghost` | `borderless` | Tertiary actions, links |

  Tonal is still a real Liquid Glass capsule. The prominent style fills
  with its tint, so a soft translucent tint gives a soft glass fill, with
  more presence than clear glass on a glass card. (SwiftUI's `bordered`
  style was tried first: it's a flat rounded rectangle and stopped looking
  like our other buttons.)
  There's no `outline` (SwiftUI has no native outline style) and no `cta`
  (that's `primary`). Destructive is a colour, not a variant: pass
  `tint={theme.colors.danger}`.
- Two things it took iterations to learn:
  - The fill `frame` goes on the **label**, not the button. Glass button
    styles hug their content, so framing the button only widens its hit area
    and leaves a label-sized capsule.
  - The label colour must be **explicit** (`onAccent` on the fill). When
    `accent` was near-white, SwiftUI's default white label vanished into it;
    keep it explicit so a palette change can't do that again.
- `Host`'s `seedColor` themes the SwiftUI accent. Without it, prominent
  buttons paint themselves system blue.
- Size and colour are props: `size` (`small` / `regular` / `large`, default
  large), `fullWidth` (default true; false hugs the label), `tint` to
  override the variant's fill, `labelColor`, and `style` for host layout
  such as `flex: 1`. Colours come from `theme.colors`. Plain glass is left
  untinted unless `tint` is passed, so secondary buttons don't pick up the
  primary blue.

### Where SwiftUI can't go

`InputAccessoryView` is hosted by the keyboard, **outside the app's view
hierarchy**. Mounting a SwiftUI host there crashes the app, and
gesture-handler presses never fire. Inside an accessory use plain RN views
and **React Native's** `Pressable`.

The same hierarchy rule explains the gesture-handler `Pressable` everywhere
else: inside a swipeable row it yields to the pan, where RN's fires a press
mid-swipe.

## Navigation and headers

- Screens draw their own chrome; the root stack sets `headerShown: false`.
  Screens that want a native bar opt in (the Today tab has its own stack
  purely for this).
- **Header options belong in the layout's `screenOptions`, or in expo-router's
  composition components** (`Stack.Title`, `Stack.Header`, `Stack.Toolbar`),
  which memoise. An inline `options={{…}}` object on a page changes identity
  every render, re-running `setOptions` and resetting native animations
  mid-scroll.
- **Never toggle `headerShown` inside a modal.** It remounts the screen and
  drops local state.
- The workout screen's title is a custom **left** bar item beside the
  chevron, not the centred title: a centred title only gets twice the
  narrower side, and timer + Finish left it no room (the timer sat on top of
  it). It's the session name with the live stats as a subtitle. There's no
  separate stats strip under the bar any more.
- Headers are **transparent with no material**, like the Programme tab:
  iOS 26 then draws its soft scroll-edge effect as content passes under. If
  you ever do want a material, name the dark one explicitly
  (`blurEffect: 'systemChromeMaterialDark'`); a bare blur falls back to the
  *light* material, a white strip with an invisible title.
- Header buttons use `Stack.Toolbar` items (SF Symbols, real UIKit menus,
  liquid-glass backgrounds) rather than custom views.
  The exception is the workout screen: native bar items have a fixed size
  with no option to shrink them in the left/right placements, so its header
  hosts SwiftUI glass buttons at the `regular` control size (`small` was too small) (`header-buttons.tsx`) in
  `Stack.Toolbar.View` with `hidesSharedBackground`. Chevrons use
  `HEADER_CHEVRON_SIZE`, a step up from other symbols, because the thin
  glyph reads small. Finish opens a Save step (name, description, date,
  Discard) before the summary; an empty workout is offered a discard first.

### The scroll view must be the first child

react-native-screens finds a screen's content scroll view by walking
`subviews[0]` from the screen down (`RNSScrollViewFinder`). **Any wrapper
`View` between the screen and the `ScrollView` breaks that chain**, and with
it large-title collapse and scroll-edge effects. Return a fragment and put
the background on the `ScrollView` itself.

## Lists and rows

- Row state is shown by the row's own treatment, never by a coloured block:
  completion is a filled checkbox plus a soft `doneRow` wash; editing is the
  `activeRow` fill plus a 1pt edge drawn in place of a transparent default
  border, so nothing shifts when it appears. (A hairline at low alpha is
  invisible in practice — subtle still has to register.)
- Set rows are a line of matching filled chips, Hevy-style: the set number,
  the inputs and the checkbox share one `glassSolid` fill, one height and one
  radius. A logged set's inputs drop their chip and turn bold on the
  `doneRow` wash, and its set-number chip switches to `doneChip`.
- Checkboxes always render their checkmark — muted on the chip when pending,
  filled when done. An empty box gives the eye nothing to aim at.
- Numeric inputs that arrive prefilled use `selectTextOnFocus`, so typing
  replaces the value instead of appending to it.
- Keep tap targets at 44pt. Don't use `hitSlop` to reach that when a
  neighbouring control is close; it creates two targets fighting over one tap.

## Swipe actions

`SwipeToDelete` wraps `ReanimatedSwipeable`: Delete trailing, optional
leading action. Actions are **inset rounded chips** in our palette, not
full-bleed slabs, with a fixed height — stretching them to short rows
squashes them into slivers.

SwiftUI's native `.swipeActions` is **not** usable here: it applies to
SwiftUI rows inside a SwiftUI `List`, and our set rows are React Native
(text inputs included). Adopting it means rebuilding the row in SwiftUI.

## Keyboard accessories

Attach **one accessory per input**. Two inputs sharing a `nativeID` leaves
the second one with no accessory at all.

Leave `backgroundColor` unset — the native content view is nil-backed
(clear), whereas passing `"transparent"` through the colour conversion comes
back opaque. And return `null` for the whole component when there's nothing
to show: rendering `null` *inside* an accessory still mounts its backdrop.

## Navigation shape

Two tabs: **Programme** (the week you're running) and **Profile** (the hub
for Plan and Activity). Things you *visit* don't earn permanent tab-bar
space; things you *work in* do. Pushed screens reached from the hub carry a
`BackRow` rather than a native header, matching the rest of the app.

## Progressive disclosure

Rare actions live in the header menu (`Stack.Toolbar.Menu`), not in
persistent chrome. Starting an unplanned workout is a good example: it had a
full-width floating button over the week list, which gave a rare action more
weight than the plan itself. The floating slot is reserved for state that is
genuinely live — currently just the minimized workout bar. That bar is a
Liquid Glass capsule (`GlassSurface shape="capsule"`), since it floats over
scrolling content — the one place glass refracts something worth seeing.

## Motion, haptics and perceived speed

- Haptics mark achievement, not interaction: light on completing a set and on
  fill-down, medium on starting a session, success on finishing. Nothing on
  undoing. Fire them **after** any guard, so feedback never marks a no-op.
- Heavy screens render a **skeleton** first and mount real content once the
  transition has had its frames. Modal open animations and first render of a
  long card list compete for the same frames otherwise.
- Don't `setState` on every scroll event. Compare against a ref and write only
  on change, or the whole screen re-renders ~10×/second mid-scroll and the
  scroll feels hijacked.

## React Compiler

The compiler memoises render expressions by their dependencies. **A ticking
clock must be real state** — `const [now, setNow] = useState(() => new Date())`
with an interval — because deriving elapsed time from a bare re-render tick
gets memoised and freezes. Keep the value timestamp-derived (`endsAt - now`)
so backgrounding can't drift it.

## Dates

All day maths is local-calendar maths: parse `YYYY-MM-DD` into a local
`Date`, add days with `setDate`. Never `toISOString()` for day arithmetic —
it silently shifts the day across timezones.

## Testing

Logic lives in pure functions with tests (`today-state.ts`, `edit.ts`,
`start.ts`, `selectors.ts`); components stay thin enough to eyeball. Peter
owns device QA — no simulator automation.

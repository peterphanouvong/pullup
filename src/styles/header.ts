import type { Theme } from './theme';

/**
 * The app's one page-header style — the Programme tab's, promoted to the
 * default so every screen gets it from the stack it lives in.
 *
 * A compact title sharing the bar row with any toolbar buttons (no large
 * title: its collapse behaviour wasn't worth the trouble), transparent so
 * iOS draws its own scroll-edge effect as content passes under, and no
 * bottom hairline. A screen supplies a `title` and nothing else.
 *
 * Transparency has one requirement: the screen's ScrollView must be its
 * FIRST subview, or UIKit can't find it and the scroll-edge effect never
 * fires. That rules out a wrapper `<Screen>` View on these screens — put
 * the canvas background on the ScrollView's own `style` instead, and let
 * `contentInsetAdjustmentBehavior="automatic"` own the top spacing.
 *
 * Pass it through `useThemedStyles` so the object identity is stable:
 * `screenOptions` that changes identity re-configures the native bar.
 */
export function nativeHeader(theme: Theme) {
  return {
    headerShadowVisible: false,
    headerTransparent: true,
    headerTintColor: theme.colors.ink,
    // The chevron on its own — the previous screen's title crowds the bar
    // and says nothing the back gesture doesn't.
    headerBackButtonDisplayMode: 'minimal',
  } as const;
}

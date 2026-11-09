import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import { StyleSheet, useWindowDimensions, type ScrollView, type ScrollViewProps } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated, { useAnimatedRef, useAnimatedStyle, useScrollViewOffset } from 'react-native-reanimated';
import { ShaderBackdrop } from './shader-backdrop';
import { useVibe } from './store';
import type { Vibe } from './vibes';

/** Extra canvas above and below the window: room for the rubber-band
 * overscroll and for the parallax travel, so the field's edge never shows. */
const SLACK = 240;

/**
 * A ScrollView whose background is a page vibe (see `vibes.ts`).
 *
 * The field is drawn as the scroll view's FIRST CHILD and pinned to the
 * window by counter-translating it with the scroll offset on the UI
 * thread, rather than as a sibling behind the scroll view. That's
 * deliberate: iOS finds the scroll view that drives the header's
 * scroll-edge effect by walking first subviews from the screen, so the
 * ScrollView has to stay the first thing in the screen (see
 * `styles/header.ts`). Inside the scroll view, the first child draws
 * under everything else and ignores touches, so content is unaffected.
 *
 * The field is still. Animating it means re-running a full-screen noise
 * shader at device resolution every frame, which on an iPhone 15 Pro
 * made the Program tab scroll in lurches and heated the phone, and it did
 * so from underneath whatever was stacked on top. So pages ignore the
 * vibe's Speed; only a screen that passes `animated` moves (the finish
 * screen, briefly), and only while it's the focused one.
 *
 * Drop-in for `ScrollView`: same props and ref. The vibe's base colour
 * becomes the scroll view's background, over whatever `style` says.
 */
export const ShaderScrollView = forwardRef<ScrollView, ScrollViewProps & { vibe: Vibe; animated?: boolean }>(
  function ShaderScrollView({ vibe, animated, children, style, ...rest }, ref) {
    const animatedRef = useAnimatedRef<Animated.ScrollView>();
    useImperativeHandle(ref, () => animatedRef.current as unknown as ScrollView, [animatedRef]);
    const offset = useScrollViewOffset(animatedRef);
    const { width, height } = useWindowDimensions();
    const settings = useVibe(vibe);

    const [focused, setFocused] = useState(false);
    useFocusEffect(
      useCallback(() => {
        setFocused(true);
        return () => setFocused(false);
      }, []),
    );
    const moving = animated === true && focused;

    // Content moves up by the offset as you scroll. Countering all of it
    // holds the field still against the window; countering less lets it
    // follow the scroll at a fraction of the speed (the vibe's parallax),
    // capped at the slack so the canvas edge never comes into view.
    const parallax = settings.parallax;
    const pin = useAnimatedStyle(() => {
      const scrolled = offset.get();
      const travel = Math.max(-SLACK, Math.min(SLACK, parallax * scrolled));
      return { transform: [{ translateY: scrolled - travel }] };
    });
    const canvasWidth = width + 2 * SLACK;
    const canvasHeight = height + 2 * SLACK;

    return (
      <Animated.ScrollView ref={animatedRef} {...rest} style={[style, { backgroundColor: settings.back }]}>
        <Animated.View
          pointerEvents="none"
          style={[styles.field, { top: -SLACK, left: -SLACK, width: canvasWidth, height: canvasHeight }, pin]}
        >
          <ShaderBackdrop vibe={vibe} width={canvasWidth} height={canvasHeight} animated={moving} />
        </Animated.View>
        {children}
      </Animated.ScrollView>
    );
  },
);

const styles = StyleSheet.create({
  field: { position: 'absolute' },
});

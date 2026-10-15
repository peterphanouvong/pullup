import { StyleSheet } from 'react-native';
import { Host, Spacer, VStack } from '@expo/ui/swift-ui';
import { frame, glassEffect } from '@expo/ui/swift-ui/modifiers';

/** Real iOS Liquid Glass (SwiftUI's `.glassEffect`) as a background layer.
 *
 * SwiftUI hosts can only contain SwiftUI children, so rather than rebuild
 * our cards in SwiftUI this renders an empty glass-filled host pinned behind
 * ordinary React Native content. It's `pointerEvents="none"` so taps fall
 * through to the content above it.
 *
 * Glass refracts whatever is behind it — over a flat canvas it reads as a
 * quiet translucent sheet, and it comes alive where content scrolls under
 * it. On iOS versions without Liquid Glass the modifier is a no-op, so
 * callers should keep a solid background underneath as the fallback. */
export function GlassSurface({ cornerRadius }: { cornerRadius: number }) {
  return (
    <Host style={StyleSheet.absoluteFill} pointerEvents="none">
      <VStack
        modifiers={[
          frame({ maxWidth: Number.MAX_SAFE_INTEGER, maxHeight: Number.MAX_SAFE_INTEGER }),
          glassEffect({ glass: { variant: 'regular' }, shape: 'roundedRectangle', cornerRadius }),
        ]}
      >
        <Spacer />
      </VStack>
    </Host>
  );
}

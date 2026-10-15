import type { StyleProp, ViewStyle } from 'react-native';
import type { SFSymbol } from 'expo-symbols';
import { Button, Host, HStack, Image, Text } from '@expo/ui/swift-ui';
import { buttonStyle, controlSize, foregroundColor, frame, tint } from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '@/styles/use-theme';

export type NativeButtonSize = 'small' | 'regular' | 'large';

/** Per size: the height the hosting view reserves (SwiftUI lays the button
 * out inside it, so it also sets the footprint in React Native), the SwiftUI
 * control size, and the leading symbol's point size. */
const SIZES: Record<NativeButtonSize, { height: number; control: 'small' | 'regular' | 'large'; icon: number }> = {
  small: { height: 34, control: 'small', icon: 12 },
  regular: { height: 42, control: 'regular', icon: 14 },
  large: { height: 50, control: 'large', icon: 15 },
};

/** Stand-in for SwiftUI's `.infinity` — the bridge takes a CGFloat, so a very
 * large max width is how "fill the available space" crosses over. */
const FILL = 100_000;

/**
 * A real SwiftUI button, so our primary actions get Apple's own Liquid Glass
 * treatment, press animation and accessibility rather than a styled
 * `Pressable`.
 *
 * `prominent` is the filled treatment (a commitment — Start workout); the
 * default is plain glass for secondary actions (Add Set, Add Exercise).
 *
 * Size and colour are flexible:
 * - `size` picks the control size and height (`large` by default).
 * - `fullWidth` (default) stretches the capsule across its container; pass
 *   `false` to hug the label. `style` goes on the host, e.g. `{ flex: 1 }`
 *   to share a row.
 * - `tint` is the prominent fill (defaults to `accent`); passed to a plain
 *   glass button it tints the glass. `labelColor` colours the label and
 *   symbol, defaulting to whatever contrasts with the default fill.
 *
 * Pass colours from `theme.colors` — no hex outside `theme.ts`.
 */
export function NativeButton({
  label,
  systemImage,
  onPress,
  prominent = false,
  size = 'large',
  fullWidth = true,
  tint: tintColor,
  labelColor: labelColorProp,
  style,
}: {
  label: string;
  /** SF Symbol shown before the label. */
  systemImage?: SFSymbol;
  onPress: () => void;
  prominent?: boolean;
  size?: NativeButtonSize;
  /** Stretch to the container's width (default) or hug the label. */
  fullWidth?: boolean;
  /** Prominent fill, or a glass tint on the plain style. */
  tint?: string;
  /** Label and symbol colour. */
  labelColor?: string;
  /** Layout for the hosting view (flex, margins, alignment). */
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const { height, control, icon } = SIZES[size];
  const fill = tintColor ?? theme.colors.accent;
  // Explicit, never SwiftUI's default: the prominent fill takes our
  // near-white accent, which would otherwise swallow a white label.
  const labelColor = labelColorProp ?? (prominent ? theme.colors.onAccent : theme.colors.ink);

  return (
    // seedColor themes the SwiftUI accent, so the prominent button picks up
    // our colour rather than painting itself system blue. A hugging button
    // sizes its host to the label horizontally.
    <Host
      style={[{ height }, style]}
      seedColor={fill}
      matchContents={fullWidth ? undefined : { horizontal: true }}
    >
      <Button
        onPress={onPress}
        modifiers={[
          buttonStyle(prominent ? 'glassProminent' : 'glass'),
          controlSize(control),
          // Plain glass stays untinted unless asked: tinting it would wash
          // every secondary button in our near-white accent.
          ...(prominent || tintColor != null ? [tint(fill)] : []),
        ]}
      >
        {/* The frame goes on the LABEL, not the button: glass button styles
            hug their content, so framing the button alone widens only its
            hit area and leaves the capsule label-sized. */}
        <HStack spacing={6} modifiers={fullWidth ? [frame({ maxWidth: FILL, alignment: 'center' })] : []}>
          {systemImage != null ? <Image systemName={systemImage} size={icon} color={labelColor} /> : null}
          <Text modifiers={[foregroundColor(labelColor)]}>{label}</Text>
        </HStack>
      </Button>
    </Host>
  );
}

import type { StyleProp, ViewStyle } from 'react-native';
import type { SFSymbol } from 'expo-symbols';
import { Button, Host, HStack, Image, Text } from '@expo/ui/swift-ui';
import { buttonStyle, controlSize, foregroundColor, frame, tint } from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '@/styles/use-theme';

export type NativeButtonSize = 'small' | 'regular' | 'large';

/** How much weight the button carries, from most to least:
 * - `primary`: filled glass in `accent`. A commitment — Start workout, Done.
 * - `secondary`: clear Liquid Glass. Real but optional — Add Exercise, Share.
 * - `tonal`: the same Liquid Glass capsule, tinted with a soft translucent
 *   fill (`tonalFill`) instead of the accent. For actions inside a card —
 *   Add Set — that need more presence than clear glass but aren't a
 *   commitment.
 * - `ghost`: label only, no container. Tertiary actions and links. */
export type NativeButtonVariant = 'primary' | 'secondary' | 'tonal' | 'ghost';

const BUTTON_STYLES = {
  primary: 'glassProminent',
  secondary: 'glass',
  // Tonal is glassProminent with a translucent tint: the prominent style
  // fills with its tint, so a soft tint gives a soft glass fill.
  tonal: 'glassProminent',
  ghost: 'borderless',
} as const;

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
 * `variant` sets the weight (see `NativeButtonVariant`); `secondary` is the
 * default. Size and colour are flexible:
 * - `size` picks the control size and height (`large` by default).
 * - `fullWidth` (default) stretches the capsule across its container; pass
 *   `false` to hug the label. `style` goes on the host, e.g. `{ flex: 1 }`
 *   to share a row.
 * - `tint` overrides the fill: the primary fill (default `accent`), the
 *   tonal fill (default `tonalFill`), or a
 *   tint on secondary glass (untinted by default). `labelColor` colours the
 *   label and symbol, defaulting to whatever contrasts with the fill.
 *
 * Pass colours from `theme.colors` — no hex outside `theme.ts`.
 */
export function NativeButton({
  label,
  systemImage,
  onPress,
  variant = 'secondary',
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
  variant?: NativeButtonVariant;
  size?: NativeButtonSize;
  /** Stretch to the container's width (default) or hug the label. */
  fullWidth?: boolean;
  /** Fill colour; see the variant notes above. */
  tint?: string;
  /** Label and symbol colour. */
  labelColor?: string;
  /** Layout for the hosting view (flex, margins, alignment). */
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const { height, control, icon } = SIZES[size];
  const isPrimary = variant === 'primary';
  const fill = tintColor ?? (variant === 'tonal' ? theme.colors.tonalFill : theme.colors.accent);
  // Explicit, never SwiftUI's default: the label must track `onAccent`
  // (and `ink` off the fill) rather than whatever SwiftUI picks.
  const labelColor = labelColorProp ?? (isPrimary ? theme.colors.onAccent : theme.colors.ink);
  // Secondary glass stays untinted unless asked: tinting it would wash it in
  // the primary blue. Ghost has no fill to tint.
  const applyTint = isPrimary || variant === 'tonal' || (variant === 'secondary' && tintColor != null);

  return (
    // seedColor themes the SwiftUI accent, so the primary button picks up
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
          buttonStyle(BUTTON_STYLES[variant]),
          controlSize(control),
          ...(applyTint ? [tint(fill)] : []),
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

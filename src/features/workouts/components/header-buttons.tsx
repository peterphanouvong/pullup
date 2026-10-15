import type { SFSymbol } from 'expo-symbols';
import { Button, Host, Image, Text } from '@expo/ui/swift-ui';
import {
  accessibilityLabel as a11yLabel,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  foregroundColor,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '@/styles/use-theme';

/** Compact header controls for the workout screen.
 *
 * Native bar button items have a fixed system size and no size option in the
 * left/right placements, which made the workout header feel heavy. These sit
 * at SwiftUI's `regular` control size — `small` went too far the other way. These are
 * small SwiftUI glass buttons hosted in `Stack.Toolbar.View` (with
 * `hidesSharedBackground`, so the bar doesn't draw a second capsule around
 * them). Each host sizes itself to its button. */

/** Symbol size inside a header circle. Chevrons are thin glyphs that read
 * small at the same point size as a filled icon, so they get a bump. */
export const HEADER_ICON_SIZE = 17;
export const HEADER_CHEVRON_SIZE = 21;

/** A round glass button holding one SF Symbol. */
export function HeaderIconButton({
  icon,
  accessibilityLabel,
  onPress,
  iconSize = HEADER_ICON_SIZE,
}: {
  icon: SFSymbol;
  accessibilityLabel: string;
  onPress: () => void;
  iconSize?: number;
}) {
  const theme = useTheme();
  return (
    <Host matchContents seedColor={theme.colors.accent}>
      <Button
        onPress={onPress}
        modifiers={[
          buttonStyle('glass'),
          buttonBorderShape('circle'),
          controlSize('regular'),
          a11yLabel(accessibilityLabel),
        ]}
      >
        <Image systemName={icon} size={iconSize} color={theme.colors.ink} />
      </Button>
    </Host>
  );
}

/** The header's commitment pill (Finish, Save): glass prominent in our
 * accent, at the same control size as the icon buttons beside it. */
export function HeaderPrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Host matchContents seedColor={theme.colors.accent}>
      <Button
        onPress={onPress}
        modifiers={[buttonStyle('glassProminent'), controlSize('regular'), tint(theme.colors.accent)]}
      >
        <Text modifiers={[foregroundColor(theme.colors.onAccent)]}>{label}</Text>
      </Button>
    </Host>
  );
}

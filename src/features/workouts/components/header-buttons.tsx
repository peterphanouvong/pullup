import type { SFSymbol } from 'expo-symbols';
import { Button, Divider, Host, Image, Menu, Text } from '@expo/ui/swift-ui';
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

/** A small round glass button holding one SF Symbol. */
export function HeaderIconButton({
  icon,
  accessibilityLabel,
  onPress,
}: {
  icon: SFSymbol;
  accessibilityLabel: string;
  onPress: () => void;
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
        <Image systemName={icon} size={17} color={theme.colors.ink} />
      </Button>
    </Host>
  );
}

/** The prominent Finish pill. Tapping it opens a menu: finishing is the
 * headline item, and discarding lives here rather than as its own bin button
 * in the header — a rare, destructive action shouldn't sit one tap away
 * beside the timer. */
export function FinishMenu({ onFinish, onDiscard }: { onFinish: () => void; onDiscard: () => void }) {
  const theme = useTheme();
  return (
    <Host matchContents seedColor={theme.colors.accent}>
      <Menu
        label={<Text modifiers={[foregroundColor(theme.colors.onAccent)]}>Finish</Text>}
        modifiers={[buttonStyle('glassProminent'), controlSize('regular'), tint(theme.colors.accent)]}
      >
        <Button label="Finish workout" systemImage="checkmark" onPress={onFinish} />
        <Divider />
        <Button label="Discard workout" systemImage="trash" role="destructive" onPress={onDiscard} />
      </Menu>
    </Host>
  );
}

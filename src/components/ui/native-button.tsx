import { Button, Host, Text } from '@expo/ui/swift-ui';
import { buttonStyle, controlSize, foregroundColor, frame } from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '@/styles/use-theme';

/** Height the hosting view reserves for the button. SwiftUI lays the button
 * out inside this, so it also sets the row's footprint in React Native. */
const BUTTON_HEIGHT = 50;

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
 */
export function NativeButton({
  label,
  onPress,
  prominent = false,
}: {
  label: string;
  onPress: () => void;
  prominent?: boolean;
}) {
  const theme = useTheme();
  return (
    // seedColor themes the SwiftUI accent, so the prominent button picks up
    // our ink rather than painting itself system blue.
    <Host style={{ height: BUTTON_HEIGHT }} seedColor={theme.colors.accent}>
      <Button
        onPress={onPress}
        modifiers={[buttonStyle(prominent ? 'glassProminent' : 'glass'), controlSize('large')]}
      >
        {/* The frame goes on the LABEL, not the button: glass button styles
            hug their content, so framing the button alone widens only its
            hit area and leaves the capsule label-sized. The colour is
            explicit too — the prominent fill takes our near-white accent,
            which would otherwise swallow a white label. */}
        <Text
          modifiers={[
            frame({ maxWidth: FILL }),
            foregroundColor(prominent ? theme.colors.onAccent : theme.colors.ink),
          ]}
        >
          {label}
        </Text>
      </Button>
    </Host>
  );
}

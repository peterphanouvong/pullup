import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ColorPicker, Host, Picker, Slider, Text as SwiftText } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import * as Clipboard from 'expo-clipboard';
import { Card } from '@/components/ui/card';
import { NativeButton } from '@/components/ui/native-button';
import { SectionLabel } from '@/components/ui/section-label';
import { ShaderScrollView } from '@/features/backdrop/shader-scroll-view';
import { resetAllVibes, resetVibe, useVibe, vibes$ } from '@/features/backdrop/store';
import { MAX_COLORS, VIBE_LABELS, VIBES, type Vibe, type VibeSettings } from '@/features/backdrop/vibes';
import { haptics } from '@/lib/haptics';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';

type NumericKey = {
  [K in keyof VibeSettings]: VibeSettings[K] extends number ? K : never;
}[keyof VibeSettings];

const DIALS: { key: NumericKey; label: string; min: number; max: number; hint: string }[] = [
  { key: 'glow', label: 'Glow', min: 0, max: 1, hint: 'How much colour. The main dial.' },
  { key: 'softness', label: 'Softness', min: 0, max: 1, hint: 'Hard bands to smooth gradient.' },
  { key: 'intensity', label: 'Distortion', min: 0, max: 1, hint: 'Grainy warp between the bands.' },
  { key: 'noise', label: 'Grain', min: 0, max: 1, hint: 'Film grain over the top.' },
  { key: 'fade', label: 'Fade', min: 0.1, max: 1.2, hint: 'Top light only: how far down the colour reaches.' },
  { key: 'scale', label: 'Scale', min: 0.4, max: 3, hint: 'Zoom. Bigger is calmer. Not used by top light.' },
  { key: 'rotation', label: 'Rotation', min: -45, max: 45, hint: 'Tilt of the field, in degrees.' },
  { key: 'motion', label: 'Motion', min: 0, max: 1, hint: 'Top light only: how much it moves. 0 is still.' },
  { key: 'speed', label: 'Speed', min: 0, max: 1, hint: 'How fast it moves. Only the finish screen animates; pages stay still (a moving full-screen shader made scrolling lag).' },
  { key: 'parallax', label: 'Parallax', min: 0, max: 1, hint: 'How much the light follows your scroll. 0 holds still.' },
  { key: 'offsetX', label: 'Shift X', min: -1.5, max: 1.5, hint: 'Where the light pools, left to right.' },
  { key: 'offsetY', label: 'Shift Y', min: -1.5, max: 1.5, hint: 'Where the light pools, top to bottom.' },
];

/** The system colour picker hands back `#rrggbb` or `#rrggbbaa`; keep the
 * six digits the shader wants (opacity is the glow dial's job). */
function sixDigitHex(value: string): string {
  const m = /^#?([0-9a-fA-F]{6})/.exec(value.trim());
  return m ? `#${m[1].toUpperCase()}` : value;
}

/**
 * The Vibe Lab: every page backdrop's dials, live, on the device.
 *
 * This screen draws itself with the vibe being edited (animated, so Speed
 * is visible), and every change goes straight into the store the other
 * screens read from and is saved on the device. "Copy settings" puts the
 * whole set on the clipboard as JSON, ready to paste into `vibes.ts` as
 * the new defaults.
 */
export default function VibeLabScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [vibe, setVibe] = useState<Vibe>('programme');
  const settings = useVibe(vibe);
  const [copied, setCopied] = useState(false);

  async function copySettings() {
    haptics.success();
    await Clipboard.setStringAsync(JSON.stringify(vibes$.get(), null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  function setColor(index: number, value: string) {
    const colors = [...settings.colors];
    colors[index] = sixDigitHex(value);
    vibes$[vibe].colors.set(colors);
  }

  return (
    <ShaderScrollView
      vibe={vibe}
      animated
      style={styles.scroll}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <Host matchContents>
        <Picker
          selection={vibe}
          onSelectionChange={(next) => {
            if (next === vibe) return;
            haptics.select();
            setVibe(next);
          }}
          modifiers={[pickerStyle('segmented')]}
        >
          {VIBES.map((v) => (
            <SwiftText key={v} modifiers={[tag(v)]}>
              {VIBE_LABELS[v]}
            </SwiftText>
          ))}
        </Picker>
      </Host>

      <Card style={styles.group}>
        <SectionLabel>Shape</SectionLabel>
        <Host matchContents={{ vertical: true }} style={styles.slider}>
          <Picker
            selection={settings.shape}
            onSelectionChange={(next) => {
              if (next === settings.shape) return;
              haptics.select();
              vibes$[vibe].shape.set(next);
            }}
            modifiers={[pickerStyle('segmented')]}
          >
            <SwiftText modifiers={[tag('wave')]}>Wave</SwiftText>
            <SwiftText modifiers={[tag('top')]}>Top light</SwiftText>
            <SwiftText modifiers={[tag('blob')]}>Blobs</SwiftText>
          </Picker>
        </Host>
        <Text style={styles.hint}>
          Wave is Paper&apos;s rolling horizon. Top light falls from the top edge into black. Blobs drift.
        </Text>
      </Card>

      <Card style={styles.group}>
        <SectionLabel>Dials</SectionLabel>
        {DIALS.map((dial) => (
          <View key={dial.key} style={styles.dial}>
            <View style={styles.dialHeader}>
              <Text style={styles.dialLabel}>{dial.label}</Text>
              <Text style={styles.dialValue}>{settings[dial.key].toFixed(2)}</Text>
            </View>
            {/* Height from the control, width from the row: a fully
                content-sized host collapses the track to its thumb. */}
            <Host matchContents={{ vertical: true }} style={styles.slider}>
              <Slider
                value={settings[dial.key]}
                min={dial.min}
                max={dial.max}
                onValueChange={(value) => {
                  // SwiftUI reports the initial value on mount; only a real
                  // move should touch (and so persist) the settings.
                  const next = Math.round(value * 100) / 100;
                  if (Math.abs(next - settings[dial.key]) < 0.005) return;
                  vibes$[vibe][dial.key].set(next);
                }}
              />
            </Host>
            <Text style={styles.hint}>{dial.hint}</Text>
          </View>
        ))}
      </Card>

      <Card style={styles.group}>
        <SectionLabel>Colours</SectionLabel>
        <ColorRow label="Base" value={settings.back} onChange={(v) => vibes$[vibe].back.set(sixDigitHex(v))} />
        {settings.colors.map((color, i) => (
          <ColorRow
            key={i}
            label={`Colour ${i + 1}`}
            value={color}
            onChange={(v) => setColor(i, v)}
            onRemove={
              settings.colors.length > 1
                ? () => {
                    haptics.tap();
                    vibes$[vibe].colors.set(settings.colors.filter((_, j) => j !== i));
                  }
                : undefined
            }
          />
        ))}
        {settings.colors.length < MAX_COLORS && (
          <NativeButton
            variant="tonal"
            systemImage="plus"
            label="Add colour"
            onPress={() => {
              haptics.tap();
              vibes$[vibe].colors.set([...settings.colors, settings.colors[settings.colors.length - 1]]);
            }}
          />
        )}
        <Text style={styles.hint}>Dark to bright. Keep the base dark so text stays readable.</Text>
      </Card>

      <View style={styles.actions}>
        <NativeButton variant="primary" systemImage="doc.on.doc" label={copied ? 'Copied' : 'Copy settings'} onPress={copySettings} />
        <NativeButton
          variant="ghost"
          labelColor={theme.colors.ink}
          label={`Reset ${VIBE_LABELS[vibe]}`}
          onPress={() => {
            haptics.warning();
            resetVibe(vibe);
          }}
        />
        <NativeButton
          variant="ghost"
          labelColor={theme.colors.danger}
          label="Reset everything"
          onPress={() => {
            haptics.warning();
            resetAllVibes();
          }}
        />
      </View>
    </ShaderScrollView>
  );
}

function ColorRow({
  label,
  value,
  onChange,
  onRemove,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onRemove?: () => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.colorRow}>
      <View style={[styles.swatch, { backgroundColor: value }]} />
      <Text style={styles.dialLabel}>{label}</Text>
      <Text style={styles.hex}>{value}</Text>
      <Host matchContents>
        <ColorPicker selection={value} onSelectionChange={onChange} />
      </Host>
      {onRemove != null && (
        <NativeButton variant="ghost" size="small" fullWidth={false} systemImage="minus.circle" label="" labelColor={theme.colors.inkMuted} onPress={onRemove} />
      )}
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  group: { gap: theme.spacing.md },
  dial: { gap: 2 },
  dialHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  dialLabel: { ...theme.type.heading, color: theme.colors.ink },
  dialValue: { ...theme.type.caption, color: theme.colors.inkMuted, fontVariant: ['tabular-nums'] },
  slider: { alignSelf: 'stretch' },
  hint: { ...theme.type.caption, color: theme.colors.inkMuted },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.glassBorder },
  hex: { ...theme.type.caption, color: theme.colors.inkMuted, flex: 1, fontVariant: ['tabular-nums'] },
  actions: { gap: theme.spacing.sm },
});

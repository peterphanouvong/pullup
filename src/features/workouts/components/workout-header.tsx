import { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { Button, HStack, Host, Popover, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityLabel as a11yLabel,
  buttonStyle,
  font,
  foregroundColor,
  frame,
  lineLimit,
  monospacedDigit,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '@/styles/use-theme';
import { haptics } from '@/lib/haptics';
import { elapsedSeconds } from '../selectors';
import type { Workout } from '../types';

function formatElapsed(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** A ticking clock as real state, not a bare re-render tick: React Compiler
 * memoizes render expressions by their dependencies, so computing
 * `elapsedSeconds(workout, new Date())` off a dummy tick froze the display —
 * `now` as state makes the recompute an explicit dependency. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  return now;
}

/** Height of the custom title view: two lines inside the 44pt bar. */
const TITLE_HEIGHT = 40;
/** Everything else in the bar's row: the screen margins, the chevron and
 * its gap on the left, the timer + Finish group on the right, and UIKit's
 * own spacing between bar items. The title takes what's left and truncates.
 * Generous on purpose: if the row overflows, iOS drops the last bar item
 * (Finish) without warning, so a gap is fine and an overflow isn't. */
const TITLE_SIDE_ROOM = 300;

/**
 * The workout screen's header title: the session name with the live stats
 * as its subtitle — duration, volume, sets done of total. The bar carries
 * the numbers so no strip has to float over the list.
 *
 * Rendered as a LEFT bar item beside the chevron, not as the centred title:
 * a centred title only gets twice the narrower of the two sides, and the
 * timer + Finish side left it almost no room, so the timer sat on top of
 * it. Left-aligned, it gets everything up to the right-hand buttons.
 *
 * Tapping it opens a popover with the untruncated name and each stat
 * labelled — the bar has to squeeze both.
 */
export function WorkoutHeaderTitle({
  workout,
  volumeKg,
  completedCount,
  totalCount,
}: {
  workout: Workout;
  volumeKg: number;
  completedCount: number;
  /** Live sets in the workout — the "of N". */
  totalCount: number;
}) {
  const theme = useTheme();
  const now = useNow();
  const { width } = useWindowDimensions();
  const [isOpen, setIsOpen] = useState(false);

  const duration = formatElapsed(elapsedSeconds(workout, now));
  const volume = `${Math.round(volumeKg)} kg`;
  const sets = `${completedCount} of ${totalCount}`;
  const titleWidth = Math.max(80, width - TITLE_SIDE_ROOM);

  return (
    // SwiftUI throughout: the popover needs a SwiftUI trigger. A fixed
    // frame width (not hug) is what makes long names truncate in the bar.
    <Host matchContents seedColor={theme.colors.accent}>
      <Popover isPresented={isOpen} onIsPresentedChange={setIsOpen} arrowEdge="top">
        <Popover.Trigger>
          <Button
            onPress={() => {
              haptics.select();
              setIsOpen(true);
            }} modifiers={[buttonStyle('plain'), a11yLabel(`${workout.title}, show stats`)]}>
            <VStack
              alignment="leading"
              spacing={1}
              modifiers={[frame({ width: titleWidth, height: TITLE_HEIGHT, alignment: 'leading' })]}
            >
              <Text modifiers={[font({ size: 17, weight: 'semibold' }), foregroundColor(theme.colors.ink), lineLimit(1)]}>
                {workout.title}
              </Text>
              <Text
                modifiers={[
                  font({ size: 13, weight: 'medium' }),
                  monospacedDigit(),
                  foregroundColor(theme.colors.inkMuted),
                  lineLimit(1),
                ]}
              >
                {`${duration} · ${volume} · ${sets} sets`}
              </Text>
            </VStack>
          </Button>
        </Popover.Trigger>
        {/* The full picture the bar has to squeeze: the untruncated name
            and each number with its label. */}
        <Popover.Content>
          <VStack alignment="leading" spacing={14} modifiers={[padding({ all: 16 }), frame({ minWidth: 260, alignment: 'leading' })]}>
            <Text modifiers={[font({ size: 17, weight: 'semibold' }), foregroundColor(theme.colors.ink)]}>
              {workout.title}
            </Text>
            <HStack spacing={20}>
              <PopoverStat label="DURATION" value={duration} />
              <PopoverStat label="VOLUME" value={volume} />
              <PopoverStat label="SETS" value={sets} />
            </HStack>
          </VStack>
        </Popover.Content>
      </Popover>
    </Host>
  );
}

function PopoverStat({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <VStack alignment="leading" spacing={2}>
      <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundColor(theme.colors.inkMuted)]}>{label}</Text>
      <Text modifiers={[font({ size: 17, weight: 'semibold' }), monospacedDigit(), foregroundColor(theme.colors.ink)]}>
        {value}
      </Text>
    </VStack>
  );
}

import { Button, HStack, Image, ProgressView, RoundedRectangle, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  buttonBorderShape,
  buttonStyle,
  font,
  foregroundStyle,
  frame,
  labelStyle,
  lineLimit,
  monospacedDigit,
  padding,
  progressViewStyle,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactNode } from 'react';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

/** One input cell of the row: what's typed, or the placeholder it shows. */
export type QueuedCellProps = { value: string | null; hint: string };

/** A set still to do, as shown and completed from the widget. Mirrors the
 * app's set row: chip, PREVIOUS ghost, and the KG / REPS (or TIME) cells
 * with the same placeholders. */
export type QueuedSetProps = {
  setId: string;
  exerciseName: string;
  number: number;
  of: number;
  label: string;
  chip: string;
  chipTone: 'working' | 'warmup' | 'intense';
  logType: 'weight_reps' | 'reps' | 'duration';
  previous: string;
  cells: QueuedCellProps[];
};

/** Everything the activity shows. Times are epoch milliseconds: props cross
 * to the widget runtime as JSON, so Dates don't survive the trip. */
export type WorkoutActivityProps = {
  title: string;
  exerciseName: string | null;
  completedSets: number;
  totalSets: number;
  startedAt: number;
  /** When the running rest ends; null when not resting. */
  restEndsAt: number | null;
  /** The next few sets, first is the one you're on. Empty when all done. */
  queue: QueuedSetProps[];
};

/** The button's identifier carries the set it completes; the app's
 * listener (`widget-sync.tsx`) reads it back. */
export const COMPLETE_TARGET_PREFIX = 'complete:';

/**
 * The workout in progress, on the Lock Screen and in the Dynamic Island.
 *
 * - Compact island: a ring of sets done and the set you're on in the
 *   table's shorthand ("80×5") — or, while resting, the ring emptying with
 *   the rest and the countdown beside it.
 * - Expanded island and Lock Screen: the exercise you're on and its row
 *   exactly as the workout screen draws it — SET chip, PREVIOUS, KG and
 *   REPS with last time's numbers as placeholders — and the tick to
 *   complete it. The Lock Screen also shows the row after it, dimmed.
 *
 * Runs in the widget's own runtime: only `@expo/ui/swift-ui` and what's in
 * `props`. No module constants (colours are inline), no hooks. Lower-case
 * name so the React Compiler doesn't treat it as a component and memoise it.
 */
const workoutActivity = (props: WorkoutActivityProps, environment: LiveActivityEnvironment) => {
  'widget';
  const dimmed = environment.isLuminanceReduced === true;
  const blue = dimmed ? '#FFFFFF' : '#3D8BF7';
  const orange = dimmed ? '#FFFFFF' : '#FF7A33';
  const red = dimmed ? '#FFFFFF' : '#E05B4D';
  const secondary = { type: 'hierarchical' as const, style: 'secondary' as const };
  const tertiary = { type: 'hierarchical' as const, style: 'tertiary' as const };
  const cellFill = { type: 'hierarchical' as const, style: 'quaternary' as const };

  const now = Date.now();
  const resting = props.restEndsAt != null && props.restEndsAt > now;
  const started = new Date(props.startedAt);
  const elapsed = { lower: started, upper: new Date(props.startedAt + 24 * 60 * 60 * 1000) };
  const rest = { lower: new Date(now), upper: new Date(props.restEndsAt ?? now) };
  const progress = props.totalSets > 0 ? props.completedSets / props.totalSets : 0;
  const setsLabel = `${props.completedSets} of ${props.totalSets} sets`;

  // The set you're on, and the one after it. Completing from here: the
  // widget ticks it and advances on its own; the app logs it for real when
  // it hears the tap, then sends fresh props.
  const current = props.queue.length > 0 ? props.queue[0] : null;
  const next = props.queue.length > 1 ? props.queue[1] : null;

  // "80×5", "12 reps", "45s": the row in a word, from what's typed or what
  // the placeholders show.
  const shorthand = (set: QueuedSetProps) => {
    const shown = set.cells.map((c) => c.value ?? c.hint);
    if (set.logType === 'weight_reps') return `${shown[0]}×${shown[1]}`;
    if (set.logType === 'duration') return `${shown[0]}s`;
    return `${shown[0]} reps`;
  };

  const chipColor = (set: QueuedSetProps) =>
    set.chipTone === 'warmup' ? orange : set.chipTone === 'intense' ? red : { type: 'hierarchical' as const, style: 'primary' as const };

  // The ring: sets done out of total, or the rest draining away.
  const ring = (size: number) =>
    resting ? (
      <ProgressView
        timerInterval={rest}
        countsDown
        modifiers={[progressViewStyle('circular'), tint(blue), frame({ width: size, height: size })]}
      />
    ) : (
      <ProgressView value={progress} modifiers={[progressViewStyle('circular'), tint(blue), frame({ width: size, height: size })]} />
    );

  const clock = (size: number) =>
    resting ? (
      <Text timerInterval={rest} countsDown modifiers={[font({ size, weight: 'semibold' }), monospacedDigit(), foregroundStyle(blue)]} />
    ) : (
      <Text timerInterval={elapsed} countsDown={false} modifiers={[font({ size, weight: 'semibold' }), monospacedDigit()]} />
    );

  const completeButton = (set: QueuedSetProps, size: number) => (
    <Button
      label="Complete set"
      systemImage="checkmark"
      target={`complete:${set.setId}`}
      onPress={() => ({ ...props, completedSets: props.completedSets + 1, queue: props.queue.slice(1) })}
      modifiers={[
        labelStyle('iconOnly'),
        buttonStyle('borderedProminent'),
        buttonBorderShape('roundedRectangle', 8),
        tint(blue),
        frame({ width: size, height: size }),
      ]}
    />
  );

  // A boxed cell, as the row's chip and inputs are drawn.
  const box = (width: number, height: number, content: ReactNode) => (
    <ZStack>
      <RoundedRectangle cornerRadius={8} modifiers={[frame({ width, height }), foregroundStyle(cellFill)]} />
      {content}
    </ZStack>
  );

  // The set row, the app's table in miniature: SET | PREVIOUS | cells | ✓.
  // `live` rows get the tick; the row after reads dimmer and has none.
  const row = (set: QueuedSetProps, live: boolean, height: number) => {
    const cellWidth = set.logType === 'weight_reps' ? 50 : 104;
    const size = height - 3;
    return (
      <HStack spacing={6}>
        {box(
          34,
          height,
          <Text modifiers={[font({ size: size * 0.5, weight: 'bold' }), monospacedDigit(), foregroundStyle(live ? chipColor(set) : tertiary)]}>
            {set.chip}
          </Text>,
        )}
        <Text modifiers={[font({ size: 12 }), foregroundStyle(live ? secondary : tertiary), lineLimit(1), frame({ minWidth: 56, alignment: 'leading' })]}>
          {set.previous}
        </Text>
        <Spacer />
        {set.cells.map((cell, i) =>
          box(
            cellWidth,
            height,
            <Text
              key={i}
              modifiers={[
                font({ size: 14, weight: cell.value != null ? 'semibold' : 'regular' }),
                monospacedDigit(),
                foregroundStyle(cell.value != null && live ? { type: 'hierarchical', style: 'primary' } : tertiary),
              ]}
            >
              {cell.value ?? cell.hint}
            </Text>,
          ),
        )}
        {live ? completeButton(set, height) : box(height, height, <Image systemName="checkmark" color="#808080" />)}
      </HStack>
    );
  };

  const columnHeaders = (set: QueuedSetProps) => {
    const label = (text: string, width: number | undefined) => (
      <Text modifiers={[font({ size: 9, weight: 'semibold' }), foregroundStyle(tertiary), ...(width != null ? [frame({ width })] : [])]}>
        {text}
      </Text>
    );
    return (
      <HStack spacing={6}>
        {label('SET', 34)}
        {label('PREVIOUS', undefined)}
        <Spacer />
        {set.logType === 'weight_reps' ? (
          <HStack spacing={6}>
            {label('KG', 50)}
            {label('REPS', 50)}
          </HStack>
        ) : (
          label(set.logType === 'duration' ? 'TIME' : 'REPS', 104)
        )}
        {label('', 30)}
      </HStack>
    );
  };

  return {
    banner: (
      <VStack alignment="leading" spacing={8} modifiers={[padding({ all: 14 })]}>
        <HStack spacing={8}>
          {ring(18)}
          <Text modifiers={[font({ weight: 'semibold', size: 15 }), lineLimit(1)]}>{props.title}</Text>
          <Spacer />
          {resting && <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(blue)]}>REST</Text>}
          {clock(15)}
        </HStack>
        {current != null ? (
          <VStack alignment="leading" spacing={6}>
            <HStack>
              <Text modifiers={[font({ size: 17, weight: 'bold' }), lineLimit(1)]}>{current.exerciseName}</Text>
              <Spacer />
              <Text modifiers={[font({ size: 12 }), monospacedDigit(), foregroundStyle(secondary)]}>{`Set ${current.number} of ${current.of}`}</Text>
            </HStack>
            {columnHeaders(current)}
            {row(current, true, 32)}
            {next != null && next.exerciseName === current.exerciseName && row(next, false, 28)}
            {next != null && next.exerciseName !== current.exerciseName && (
              <Text modifiers={[font({ size: 12 }), foregroundStyle(tertiary), lineLimit(1)]}>{`Then ${next.exerciseName}`}</Text>
            )}
          </VStack>
        ) : (
          <Text modifiers={[font({ size: 17, weight: 'bold' })]}>All sets done</Text>
        )}
        <HStack spacing={8}>
          <ProgressView value={progress} modifiers={[tint(blue)]} />
          <Text modifiers={[font({ size: 12 }), monospacedDigit(), foregroundStyle(secondary)]}>{setsLabel}</Text>
        </HStack>
      </VStack>
    ),
    compactLeading: <VStack modifiers={[padding({ leading: 2 })]}>{ring(18)}</VStack>,
    compactTrailing: (
      <VStack modifiers={[frame({ maxWidth: 72 }), padding({ trailing: 2 })]}>
        {resting ? (
          clock(14)
        ) : current != null ? (
          <Text modifiers={[font({ size: 14, weight: 'semibold' }), monospacedDigit(), lineLimit(1)]}>{shorthand(current)}</Text>
        ) : (
          clock(14)
        )}
      </VStack>
    ),
    minimal: ring(18),
    expandedLeading: (
      <ZStack modifiers={[padding({ leading: 4 })]}>
        {ring(40)}
        <Text modifiers={[font({ size: 11, weight: 'bold' }), monospacedDigit()]}>{`${props.completedSets}/${props.totalSets}`}</Text>
      </ZStack>
    ),
    expandedCenter: (
      <VStack spacing={2}>
        <Text modifiers={[font({ weight: 'semibold', size: 15 }), lineLimit(1)]}>
          {current?.exerciseName ?? props.title}
        </Text>
        <Text modifiers={[font({ size: 12 }), monospacedDigit(), foregroundStyle(secondary), lineLimit(1)]}>
          {current != null ? `Set ${current.number} of ${current.of}` : setsLabel}
        </Text>
      </VStack>
    ),
    expandedTrailing: (
      <VStack alignment="trailing" spacing={0} modifiers={[padding({ trailing: 4 })]}>
        {clock(15)}
        <Text modifiers={[font({ size: 10, weight: 'semibold' }), foregroundStyle(resting ? blue : tertiary)]}>{resting ? 'REST' : 'ELAPSED'}</Text>
      </VStack>
    ),
    expandedBottom: (
      <VStack spacing={6} modifiers={[padding({ horizontal: 8, bottom: 6 })]}>
        {current != null ? (
          row(current, true, 32)
        ) : (
          <Text modifiers={[font({ size: 13 }), foregroundStyle(secondary)]}>All sets done</Text>
        )}
      </VStack>
    ),
  };
};

export default createLiveActivity('WorkoutActivity', workoutActivity);

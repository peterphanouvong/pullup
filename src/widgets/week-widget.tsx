import type { ReactNode } from 'react';
import { Button, Circle, HStack, Image, ProgressView, RoundedRectangle, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
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
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { QueuedSetProps } from './workout-activity';

export type WeekWidgetProps = {
  /** A session in progress: the widget turns into the set you're on. */
  live: {
    title: string;
    completedSets: number;
    totalSets: number;
    queue: QueuedSetProps[];
  } | null;
  /** Sessions finished this week. */
  done: number;
  /** Lifting sessions the programme has this week; 0 with no programme. */
  planned: number;
  /** Monday first: whether you trained that day. */
  trained: boolean[];
  /** 0 = Monday. */
  todayIndex: number;
  /** The next planned session you haven't done, e.g. "Lower A". */
  nextSession: string | null;
  programName: string | null;
};

/**
 * Your week on the home screen: sessions done out of planned, a dot per
 * day, and what's next. Small, medium, and a Lock Screen rectangle.
 *
 * Same rules as the app: a trained day is the one loud mark (filled blue),
 * today gets a ring, missed days are just empty. Runs in the widget
 * runtime — see the note on the workout Live Activity.
 */
const weekWidget = (props: WeekWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const blue = '#3D8BF7';
  const muted = { type: 'hierarchical' as const, style: 'secondary' as const };
  const empty = { type: 'hierarchical' as const, style: 'quaternary' as const };
  const letters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const count = props.planned > 0 ? `${props.done}/${props.planned}` : `${props.done}`;
  const caption = props.planned > 0 ? 'sessions this week' : props.done === 1 ? 'session this week' : 'sessions this week';
  const next = props.nextSession != null ? `Next: ${props.nextSession}` : props.planned > 0 && props.done >= props.planned ? 'Week done' : null;

  const dots = (size: number, withLetters: boolean) => (
    <HStack spacing={size * 0.45}>
      {props.trained.map((didTrain, i) => (
        <VStack key={i} spacing={3}>
          {withLetters && (
            <Text modifiers={[font({ size: 10, weight: 'semibold' }), foregroundStyle(i === props.todayIndex ? { type: 'hierarchical', style: 'primary' } : muted)]}>
              {letters[i]}
            </Text>
          )}
          <Circle
            modifiers={[
              frame({ width: size, height: size }),
              foregroundStyle(didTrain ? blue : i === props.todayIndex ? { type: 'hierarchical', style: 'tertiary' } : empty),
            ]}
          />
        </VStack>
      ))}
    </HStack>
  );

  // A live session takes the widget over: the exercise you're on and its
  // row as the workout screen draws it — SET chip, PREVIOUS, KG and REPS
  // with last time's numbers as placeholders — and the tick to complete
  // it. The widget advances on its own; the app logs the set when it
  // hears the tap and sends the real state back.
  if (props.live != null) {
    const live = props.live;
    const current = live.queue.length > 0 ? live.queue[0] : null;
    const next = live.queue.length > 1 ? live.queue[1] : null;
    const setsLabel = `${live.completedSets} of ${live.totalSets} sets`;
    const progress = live.totalSets > 0 ? live.completedSets / live.totalSets : 0;
    const tertiary = { type: 'hierarchical' as const, style: 'tertiary' as const };
    const cellFill = { type: 'hierarchical' as const, style: 'quaternary' as const };
    const shorthand = (set: QueuedSetProps) => {
      const shown = set.cells.map((c) => c.value ?? c.hint);
      if (set.logType === 'weight_reps') return `${shown[0]}×${shown[1]}`;
      if (set.logType === 'duration') return `${shown[0]}s`;
      return `${shown[0]} reps`;
    };
    const chipColor = (set: QueuedSetProps) =>
      set.chipTone === 'warmup' ? '#FF7A33' : set.chipTone === 'intense' ? '#E05B4D' : { type: 'hierarchical' as const, style: 'primary' as const };
    const completeButton = (set: QueuedSetProps, size: number) => (
      <Button
        label="Complete set"
        systemImage="checkmark"
        target={`complete:${set.setId}`}
        onPress={() => ({
          ...props,
          live: { ...live, completedSets: live.completedSets + 1, queue: live.queue.slice(1) },
        })}
        modifiers={[
          labelStyle('iconOnly'),
          buttonStyle('borderedProminent'),
          buttonBorderShape('roundedRectangle', 8),
          tint(blue),
          frame({ width: size, height: size }),
        ]}
      />
    );
    const box = (width: number, height: number, content: ReactNode) => (
      <ZStack>
        <RoundedRectangle cornerRadius={8} modifiers={[frame({ width, height }), foregroundStyle(cellFill)]} />
        {content}
      </ZStack>
    );
    const row = (set: QueuedSetProps, isLive: boolean, height: number) => {
      const cellWidth = set.logType === 'weight_reps' ? 46 : 96;
      return (
        <HStack spacing={6}>
          {box(
            30,
            height,
            <Text modifiers={[font({ size: 14, weight: 'bold' }), monospacedDigit(), foregroundStyle(isLive ? chipColor(set) : tertiary)]}>
              {set.chip}
            </Text>,
          )}
          <Text modifiers={[font({ size: 11 }), foregroundStyle(isLive ? muted : tertiary), lineLimit(1)]}>{set.previous}</Text>
          <Spacer />
          {set.cells.map((cell, i) =>
            box(
              cellWidth,
              height,
              <Text
                key={i}
                modifiers={[
                  font({ size: 13, weight: cell.value != null ? 'semibold' : 'regular' }),
                  monospacedDigit(),
                  foregroundStyle(cell.value != null && isLive ? { type: 'hierarchical', style: 'primary' } : tertiary),
                ]}
              >
                {cell.value ?? cell.hint}
              </Text>,
            ),
          )}
          {isLive ? completeButton(set, height) : box(height, height, <Image systemName="checkmark" color="#808080" />)}
        </HStack>
      );
    };
    const ring = (size: number) => (
      <ZStack>
        <ProgressView value={progress} modifiers={[progressViewStyle('circular'), tint(blue), frame({ width: size, height: size })]} />
        <Text modifiers={[font({ size: size * 0.28, weight: 'bold' }), monospacedDigit()]}>{`${live.completedSets}/${live.totalSets}`}</Text>
      </ZStack>
    );

    if (environment.widgetFamily === 'accessoryRectangular') {
      return (
        <VStack alignment="leading" spacing={2}>
          <Text modifiers={[font({ size: 15, weight: 'semibold' }), lineLimit(1)]}>{current?.exerciseName ?? live.title}</Text>
          <Text modifiers={[font({ size: 13 }), monospacedDigit(), lineLimit(1)]}>
            {current != null ? `Set ${current.chip} · ${shorthand(current)} · last ${current.previous}` : setsLabel}
          </Text>
        </VStack>
      );
    }
    if (environment.widgetFamily === 'systemMedium') {
      return (
        <VStack alignment="leading" spacing={8} modifiers={[padding({ all: 2 })]}>
          <HStack spacing={8}>
            {ring(30)}
            <VStack alignment="leading" spacing={0}>
              <Text modifiers={[font({ size: 10, weight: 'semibold' }), foregroundStyle(blue)]}>LIVE</Text>
              <Text modifiers={[font({ size: 15, weight: 'semibold' }), lineLimit(1)]}>{current?.exerciseName ?? live.title}</Text>
            </VStack>
            <Spacer />
            {current != null && (
              <Text modifiers={[font({ size: 12 }), monospacedDigit(), foregroundStyle(muted)]}>{`Set ${current.number} of ${current.of}`}</Text>
            )}
          </HStack>
          {current != null ? row(current, true, 30) : <Text modifiers={[font({ size: 13 }), foregroundStyle(muted)]}>All sets done</Text>}
          {next != null && next.exerciseName === current?.exerciseName && row(next, false, 26)}
          {next != null && next.exerciseName !== current?.exerciseName && (
            <Text modifiers={[font({ size: 11 }), foregroundStyle(tertiary), lineLimit(1)]}>{`Then ${next.exerciseName}`}</Text>
          )}
        </VStack>
      );
    }
    // Small: no room for the full table, so the chip, the row in a word
    // and the tick, with last time's lift underneath.
    return (
      <VStack alignment="leading" spacing={6}>
        <HStack spacing={6}>
          {ring(26)}
          <Text modifiers={[font({ size: 10, weight: 'semibold' }), foregroundStyle(blue)]}>LIVE</Text>
          <Spacer />
        </HStack>
        <Text modifiers={[font({ size: 15, weight: 'semibold' }), lineLimit(2)]}>{current?.exerciseName ?? live.title}</Text>
        <Spacer />
        {current != null ? (
          <VStack alignment="leading" spacing={4}>
            <HStack spacing={6}>
              {box(
                28,
                28,
                <Text modifiers={[font({ size: 13, weight: 'bold' }), monospacedDigit(), foregroundStyle(chipColor(current))]}>{current.chip}</Text>,
              )}
              <Text modifiers={[font({ size: 17, weight: 'semibold' }), monospacedDigit(), lineLimit(1)]}>{shorthand(current)}</Text>
              <Spacer />
              {completeButton(current, 28)}
            </HStack>
            <Text modifiers={[font({ size: 11 }), foregroundStyle(muted), lineLimit(1)]}>{`Last time ${current.previous}`}</Text>
          </VStack>
        ) : (
          <Text modifiers={[font({ size: 13 }), foregroundStyle(muted)]}>All sets done</Text>
        )}
      </VStack>
    );
  }

  if (environment.widgetFamily === 'accessoryRectangular') {
    return (
      <VStack alignment="leading" spacing={4}>
        <Text modifiers={[font({ size: 15, weight: 'semibold' }), monospacedDigit()]}>{`${count} ${caption}`}</Text>
        {dots(10, false)}
      </VStack>
    );
  }

  if (environment.widgetFamily === 'systemMedium') {
    return (
      <HStack spacing={16} modifiers={[padding({ all: 4 })]}>
        <VStack alignment="leading" spacing={2}>
          <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(muted)]}>THIS WEEK</Text>
          <Text modifiers={[font({ size: 44, weight: 'bold' }), monospacedDigit(), foregroundStyle(blue)]}>{count}</Text>
          <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>{caption}</Text>
        </VStack>
        <Spacer />
        <VStack alignment="trailing" spacing={10}>
          {dots(16, true)}
          {next != null && (
            <Text modifiers={[font({ size: 14, weight: 'semibold' }), lineLimit(1)]}>{next}</Text>
          )}
          {props.programName != null && (
            <Text modifiers={[font({ size: 12 }), foregroundStyle(muted), lineLimit(1)]}>{props.programName}</Text>
          )}
        </VStack>
      </HStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={6}>
      <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(muted)]}>THIS WEEK</Text>
      <Text modifiers={[font({ size: 40, weight: 'bold' }), monospacedDigit(), foregroundStyle(blue)]}>{count}</Text>
      <Spacer />
      {dots(12, false)}
      {next != null && (
        <Text modifiers={[font({ size: 13, weight: 'semibold' }), lineLimit(1)]}>{next}</Text>
      )}
    </VStack>
  );
};

export default createWidget('WeekWidget', weekWidget);

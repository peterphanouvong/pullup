import { HStack, Image, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, frame, lineLimit, monospacedDigit, padding, tint } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

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
};

/**
 * The workout in progress, on the Lock Screen and in the Dynamic Island.
 *
 * - Compact island: a dumbbell and the session clock — or, while resting,
 *   a timer icon and the rest countdown, the number you actually glance at.
 * - Expanded island and Lock Screen: the session, the exercise you're on,
 *   sets done out of total with a bar, and the clock.
 *
 * Runs in the widget's own runtime: only `@expo/ui/swift-ui` and what's in
 * `props`. No module constants (colours are inline), no hooks. Lower-case
 * name so the React Compiler doesn't treat it as a component and memoise it.
 */
const workoutActivity = (props: WorkoutActivityProps, environment: LiveActivityEnvironment) => {
  'widget';
  const blue = environment.isLuminanceReduced ? '#FFFFFF' : '#3D8BF7';
  const now = Date.now();
  const resting = props.restEndsAt != null && props.restEndsAt > now;
  const started = new Date(props.startedAt);
  const elapsed = { lower: started, upper: new Date(props.startedAt + 24 * 60 * 60 * 1000) };
  const rest = { lower: new Date(now), upper: new Date(props.restEndsAt ?? now) };
  const progress = props.totalSets > 0 ? props.completedSets / props.totalSets : 0;
  const setsLabel = `${props.completedSets} of ${props.totalSets} sets`;

  const clock = resting ? (
    <Text timerInterval={rest} countsDown modifiers={[monospacedDigit(), foregroundStyle(blue)]} />
  ) : (
    <Text timerInterval={elapsed} countsDown={false} modifiers={[monospacedDigit()]} />
  );

  return {
    banner: (
      <VStack alignment="leading" spacing={8} modifiers={[padding({ all: 16 })]}>
        <HStack spacing={8}>
          <Image systemName="dumbbell.fill" color={blue} />
          <Text modifiers={[font({ weight: 'semibold', size: 17 }), lineLimit(1)]}>{props.title}</Text>
          <Spacer />
          {resting ? (
            <HStack spacing={4}>
              <Image systemName="timer" color={blue} />
              <Text
                timerInterval={rest}
                countsDown
                modifiers={[font({ weight: 'bold', size: 17 }), monospacedDigit(), foregroundStyle(blue)]}
              />
            </HStack>
          ) : (
            <Text
              timerInterval={elapsed}
              countsDown={false}
              modifiers={[font({ weight: 'semibold', size: 17 }), monospacedDigit()]}
            />
          )}
        </HStack>
        <ProgressView value={progress} modifiers={[tint(blue)]} />
        <HStack>
          <Text modifiers={[font({ size: 13 }), foregroundStyle({ type: 'hierarchical', style: 'secondary' }), lineLimit(1)]}>
            {props.exerciseName ?? 'Workout'}
          </Text>
          <Spacer />
          <Text modifiers={[font({ size: 13 }), monospacedDigit(), foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>
            {setsLabel}
          </Text>
        </HStack>
      </VStack>
    ),
    compactLeading: <Image systemName={resting ? 'timer' : 'dumbbell.fill'} color={blue} />,
    compactTrailing: <VStack modifiers={[frame({ maxWidth: 56 })]}>{clock}</VStack>,
    minimal: <Image systemName={resting ? 'timer' : 'dumbbell.fill'} color={blue} />,
    expandedLeading: (
      <VStack alignment="leading" spacing={2} modifiers={[padding({ leading: 4 })]}>
        <Image systemName="dumbbell.fill" color={blue} />
      </VStack>
    ),
    expandedCenter: (
      <VStack spacing={2}>
        <Text modifiers={[font({ weight: 'semibold', size: 15 }), lineLimit(1)]}>{props.title}</Text>
        <Text modifiers={[font({ size: 13 }), foregroundStyle({ type: 'hierarchical', style: 'secondary' }), lineLimit(1)]}>
          {props.exerciseName ?? setsLabel}
        </Text>
      </VStack>
    ),
    expandedTrailing: (
      <VStack alignment="trailing" modifiers={[padding({ trailing: 4 })]}>
        {clock}
      </VStack>
    ),
    expandedBottom: (
      <VStack spacing={6} modifiers={[padding({ horizontal: 8, bottom: 4 })]}>
        <ProgressView value={progress} modifiers={[tint(blue)]} />
        <HStack>
          <Text modifiers={[font({ size: 13 }), foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>
            {resting ? 'Resting' : 'Lifting'}
          </Text>
          <Spacer />
          <Text modifiers={[font({ size: 13 }), monospacedDigit(), foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>
            {setsLabel}
          </Text>
        </HStack>
      </VStack>
    ),
  };
};

export default createLiveActivity('WorkoutActivity', workoutActivity);

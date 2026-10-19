import { Circle, HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, frame, lineLimit, monospacedDigit, padding } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type WeekWidgetProps = {
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

import { useEffect } from 'react';
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import { useSelector } from '@legendapp/state/react';
import { addUserInteractionListener, type LiveActivityFactory, type Widget } from 'expo-widgets';
import { useActiveProgram, useProgram } from '@/features/programs/hooks';
import { restTimer$ } from '@/features/workouts/rest-timer';
import { activeWorkout } from '@/features/workouts/selectors';
import { workoutExercises$, workouts$, workoutSets$ } from '@/features/workouts/store';
import { completeSet, useFinishedWorkouts } from '@/features/workouts/hooks';
import { useProfile } from '@/features/account/hooks';
import { COMPLETE_TARGET_PREFIX, type WorkoutActivityProps } from '@/widgets/workout-activity';
import type { WeekWidgetProps } from '@/widgets/week-widget';
import { liveWidgetProps, weekWidgetTimeline, workoutActivityProps } from './props';

/** Only on a build that has the native module: `expo-widgets` resolves it
 * eagerly and throws without it, which would take the app down with it. */
const widgetsAvailable = Platform.OS === 'ios' && requireOptionalNativeModule('ExpoWidgets') != null;

interface WidgetModules {
  WorkoutActivity: LiveActivityFactory<WorkoutActivityProps>;
  WeekWidget: Widget<WeekWidgetProps>;
}

let modules: WidgetModules | null = null;

function load(): WidgetModules {
  /* eslint-disable @typescript-eslint/no-require-imports -- deliberately lazy, see widgetsAvailable */
  modules ??= {
    WorkoutActivity: require('@/widgets/workout-activity').default,
    WeekWidget: require('@/widgets/week-widget').default,
  };
  /* eslint-enable @typescript-eslint/no-require-imports */
  return modules;
}

/** The workout the running Live Activity belongs to, so a different
 * session gets a fresh activity (with its own deep link) rather than the
 * old one's content swapped out. Null after a relaunch: the existing
 * activity is adopted. */
let activityWorkoutId: string | null = null;

function syncLiveActivity(workoutId: string | null, props: WorkoutActivityProps | null) {
  const { WorkoutActivity } = load();
  try {
    const [current, ...extras] = WorkoutActivity.getInstances();
    for (const extra of extras) void extra.end('immediate');

    if (workoutId == null || props == null) {
      // Finished or discarded: the clock would keep ticking on a session
      // that's over, so it goes straight away.
      if (current) void current.end('immediate');
      activityWorkoutId = null;
      return;
    }
    if (current && (activityWorkoutId == null || activityWorkoutId === workoutId)) {
      void current.update(props);
    } else {
      if (current) void current.end('immediate');
      WorkoutActivity.start(props, `pullup://workout/${workoutId}`);
    }
    activityWorkoutId = workoutId;
  } catch (e) {
    // ActivityKit refuses when Live Activities are off in Settings, or the
    // app isn't in the foreground. Neither should break logging.
    console.warn('Live Activity sync failed', e);
  }
}

/**
 * Keeps the app's surfaces outside the app in step with the store: the
 * workout Live Activity (Lock Screen and Dynamic Island) and the week
 * widget. Renders nothing.
 */
export function WidgetSync() {
  return widgetsAvailable ? <Sync /> : null;
}

function Sync() {
  // "Complete set" tapped on the Live Activity or the home screen widget:
  // the widget has already ticked it on its own; this logs it for real,
  // and the store change below sends the true state back out. Only an
  // unticked set is completed, so a tap the app already saw is harmless.
  useEffect(() => {
    const subscription = addUserInteractionListener((event) => {
      if (!event.target.startsWith(COMPLETE_TARGET_PREFIX)) return;
      const setId = event.target.slice(COMPLETE_TARGET_PREFIX.length);
      if (workoutSets$[setId].completed_at.peek() == null) completeSet(setId, new Date());
    });
    return () => subscription.remove();
  }, []);

  // Serialised so effects fire only when what's shown actually changes —
  // not on every keystroke into a weight field.
  const activityJson = useSelector(() => {
    const workouts = workouts$.get() ?? {};
    const workout = activeWorkout(workouts);
    if (!workout) return JSON.stringify({ id: null, props: null });
    const props = workoutActivityProps(workout, workoutExercises$.get() ?? {}, workoutSets$.get() ?? {}, restTimer$.get(), workouts);
    return JSON.stringify({ id: workout.id, props });
  });

  useEffect(() => {
    const { id, props } = JSON.parse(activityJson) as { id: string | null; props: WorkoutActivityProps | null };
    syncLiveActivity(id, props);
  }, [activityJson]);

  const finished = useFinishedWorkouts();
  const active = useActiveProgram();
  const program = useProgram(active.data?.programId ?? '');
  const profile = useProfile();
  const timeline = weekWidgetTimeline(new Date(), {
    weeklyTarget: profile.data?.weeklyTarget,
    finished: finished.map((f) => f.workout),
    programName: program.data?.name ?? null,
    weeks: program.data?.weeks ?? [],
    startDate: active.data?.startDate ?? null,
  });
  // While a session runs, every entry carries it, so the widget shows the
  // set you're on whichever day's entry is current.
  const live = (() => {
    const { props } = JSON.parse(activityJson) as { props: WorkoutActivityProps | null };
    return props ? liveWidgetProps(props) : null;
  })();
  const timelineJson = JSON.stringify(timeline.map((e) => ({ ...e, props: { ...e.props, live } })));

  useEffect(() => {
    const entries = (JSON.parse(timelineJson) as { date: string; props: WeekWidgetProps }[]).map((e) => ({
      date: new Date(e.date),
      props: e.props,
    }));
    try {
      load().WeekWidget.updateTimeline(entries);
    } catch (e) {
      console.warn('Week widget update failed', e);
    }
  }, [timelineJson]);

  return null;
}

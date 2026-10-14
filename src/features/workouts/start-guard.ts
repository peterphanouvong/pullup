/**
 * Starting a new workout while one is already in progress prompts to resume
 * it or discard it first, instead of silently abandoning it in the
 * background. Shared by every "Start workout" entry point — Today's
 * prescribed-day and empty-workout buttons, and the programme day-detail
 * screen's "Start workout" — so none of them can bypass the guard (fix for
 * the day-detail screen starting directly, with no prompt at all).
 */

import { Alert } from 'react-native';
import { router } from 'expo-router';
import { discardWorkout } from './hooks';
import type { Workout } from './types';

export function startWorkoutOrPrompt(activeWorkout: Workout | null, startFn: () => void): void {
  if (activeWorkout) {
    Alert.alert(
      'Workout in progress',
      `You have an unfinished workout — "${activeWorkout.title}". Resume it, or discard it and start new?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Resume', onPress: () => router.push(`/workout/${activeWorkout.id}`) },
        {
          text: 'Discard & start new',
          style: 'destructive',
          onPress: () => {
            discardWorkout(activeWorkout.id);
            startFn();
          },
        },
      ],
    );
    return;
  }
  startFn();
}

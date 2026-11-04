import { observable, type Observable } from '@legendapp/state';
import { syncedSupabase } from '@legendapp/state/sync-plugins/supabase';
import { observablePersistAsyncStorage } from '@legendapp/state/persist-plugins/async-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/lib/supabase';
import type { Exercise, Workout, WorkoutExercise, WorkoutSet } from './types';

// One shared persist plugin instance (not a bare class reference): the
// AsyncStorage plugin's constructor takes its `{ AsyncStorage }` config
// directly, unlike MMKV's, so we build it once here and hand the same
// instance to every table's `persist.plugin` below. AsyncStorage ships with
// Expo Go (no custom native/dev-client build required).
const persistPlugin = observablePersistAsyncStorage({ AsyncStorage });

/** Client-generated id for rows created offline (workouts, workout_exercises, workout_sets). */
export function generateId(): string {
  return Crypto.randomUUID();
}

type CrudAction = 'create' | 'read' | 'update' | 'delete';
type TableName = 'exercises' | 'workouts' | 'workout_exercises' | 'workout_sets';

// Shared sync config for every table: local-first via AsyncStorage, infinite
// retry against Supabase, created_at/updated_at/deleted matching the DB
// trigger + soft-delete columns from
// supabase/migrations/20261014030000_workout_schema.sql.
// `select` is typed loosely (the installed syncedSupabase's own PostgREST
// builder generics don't unify across tables); the binding contract here is
// the runtime shape (`Record<string, TRow>`), which the cast below pins.
function tableSynced<TRow extends { id: string }>(
  collection: TableName,
  persistName: string,
  actions: CrudAction[],
  select: (from: any) => any,
): Observable<Record<string, TRow>> {
  return observable(
    syncedSupabase({
      supabase,
      collection,
      select,
      actions,
      fieldCreatedAt: 'created_at',
      fieldUpdatedAt: 'updated_at',
      fieldDeleted: 'deleted',
      changesSince: 'last-sync',
      // Batches keystroke-level writes (notes text, weight/reps typing) into
      // one Supabase round-trip per table instead of one per keystroke —
      // local reads/writes (and persisted-to-AsyncStorage state) are
      // unaffected, only the remote `set` push is delayed/coalesced.
      debounceSet: 1000,
      persist: {
        name: persistName,
        plugin: persistPlugin,
        retrySync: true,
      },
      retry: { infinite: true },
      // A failed push is retried forever, silently; this is the one place
      // it's visible, so a column the server doesn't have (or a policy it
      // won't allow) can be found from a device log.
      onError: (error: unknown) => console.warn(`[sync] ${collection}:`, error),
    } as any),
  ) as unknown as Observable<Record<string, TRow>>;
}

// Populated by initWorkoutStore(); undefined until then (no user session yet).
export let exercises$: Observable<Record<string, Exercise>>;
export let workouts$: Observable<Record<string, Workout>>;
export let workoutExercises$: Observable<Record<string, WorkoutExercise>>;
export let workoutSets$: Observable<Record<string, WorkoutSet>>;

let initializedUserId: string | null = null;

/**
 * Builds the four workout-logging observables for `userId`. Idempotent: a
 * second call with the same id is a no-op so re-renders of the gate that
 * calls this don't tear down and recreate the sync machinery.
 */
export function initWorkoutStore(userId: string): void {
  if (initializedUserId === userId) return;
  initializedUserId = userId;

  // Read-only global library; RLS scopes rows to global-or-own, no client filter.
  exercises$ = tableSynced<Exercise>(
    'exercises',
    `exercises-${userId}`,
    ['read'],
    (from) => from.select('*'),
  );

  // No hard deletes on workout tables — soft-delete via `deleted` + update only.
  workouts$ = tableSynced<Workout>(
    'workouts',
    `workouts-${userId}`,
    ['read', 'create', 'update'],
    (from) => from.select('*').eq('user_id', userId),
  );

  workoutExercises$ = tableSynced<WorkoutExercise>(
    'workout_exercises',
    `workout_exercises-${userId}`,
    ['read', 'create', 'update'],
    (from) => from.select('*').eq('user_id', userId),
  );

  workoutSets$ = tableSynced<WorkoutSet>(
    'workout_sets',
    `workout_sets-${userId}`,
    ['read', 'create', 'update'],
    (from) => from.select('*').eq('user_id', userId),
  );
}

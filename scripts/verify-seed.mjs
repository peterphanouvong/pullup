import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_KEY,
);

const fail = (msg) => { console.error(`FAIL: ${msg}`); process.exit(1); };

const { error: authError } = await supabase.auth.signInAnonymously();
if (authError) fail(`anonymous sign-in: ${authError.message}`);

const { data: programs, error } = await supabase
  .from('programs')
  .select('id, slug, program_weeks(id, position, program_days(id, kind, day_exercises(id)))');
if (error) fail(error.message);

const program = programs.find((p) => p.slug === '8-week-peak');
if (!program) fail('programme 8-week-peak not found');
if (program.program_weeks.length !== 7) fail(`weeks: ${program.program_weeks.length} !== 7`);
const days = program.program_weeks.flatMap((w) => w.program_days);
if (days.length !== 49) fail(`days: ${days.length} !== 49`);
const bareLifting = days.filter((d) => d.kind === 'lifting' && d.day_exercises.length === 0);
if (bareLifting.length > 0) fail(`${bareLifting.length} lifting day(s) with no exercises`);

console.log('OK: 1 programme, 7 weeks, 49 days, all lifting days have exercises');

const { count: exercisesCount, error: exercisesError } = await supabase
  .from('exercises')
  .select('*', { count: 'exact', head: true })
  .is('owner_id', null);
if (exercisesError) fail(exercisesError.message);
if (exercisesCount < 100) fail(`exercises: global count ${exercisesCount} < 100`);

const { data: unmatchedDayExercises, error: unmatchedError } = await supabase
  .from('day_exercises')
  .select('id, exercise_name')
  .is('exercise_id', null);
if (unmatchedError) fail(unmatchedError.message);
if (unmatchedDayExercises.length > 0) {
  console.error('Offending day_exercises rows (null exercise_id):');
  for (const row of unmatchedDayExercises) {
    console.error(`  - id=${row.id} exercise_name=${JSON.stringify(row.exercise_name)}`);
  }
  fail(`day_exercises: ${unmatchedDayExercises.length} row(s) with null exercise_id`);
}

console.log(`OK: ${exercisesCount} global exercises, 0 day_exercises rows with null exercise_id`);

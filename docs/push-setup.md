# Pushes: one-time setup

Pushes are sent by the `push` edge function (`supabase/functions/push`),
which the database calls when a workout is finished, a reaction lands, a
poke is sent, and once an hour for the Sunday recap. Nothing in a push is
typed by a user: programme day names, minutes, emoji.

## 1. Expo project (for push tokens)

```sh
npx eas init
```

Writes `extra.eas.projectId` into app.json. Without it the app never asks
for notification permission and never registers a token.

## 2. Deploy the function

```sh
supabase functions deploy push
```

Optional, raises Expo's rate limits: `supabase secrets set EXPO_ACCESS_TOKEN=…`
(from expo.dev → Account settings → Access tokens).

## 3. Tell the database where it is

In the SQL editor (once):

```sql
select vault.create_secret('https://uzkshlhlvlslnwygpejp.supabase.co/functions/v1/push', 'push_function_url');
select vault.create_secret('<the project''s publishable / anon key>', 'push_function_key');
```

Until both exist, the triggers are silent no-ops. The key is the public
one the app already ships with; the gateway just needs a valid JWT.

## 4. Check pg_cron

The migration schedules `pullup-weekly-recap` (hourly). If
`select * from cron.job` is empty, enable pg_cron under Database →
Extensions and run the `cron.schedule(...)` line from
`supabase/migrations/20261021000000_push_targets_pokes.sql`.

## 5. Rebuild the app

`expo-notifications` is a native module: `npx expo prebuild --clean &&
npx expo run:ios --device`. Pushes only arrive on a real phone.

## Testing a push by hand

```sql
select public.dispatch_push('checkin', '<a finished workout id>');
```

## TestFlight

Needs a paid Apple Developer Program membership (TestFlight is not available
to free accounts). Then, from the repo:

```sh
npx eas build --platform ios --profile production   # say yes to Push Notifications setup
npx eas submit --platform ios --latest
```

The first build logs in with your Apple ID and creates the two App IDs
(app + widgets), the App Group, signing certificates and the App Store
Connect record. `eas.json` carries the public Supabase URL and key for
the build, since `.env.local` is gitignored and never uploaded.

Then App Store Connect → the app → TestFlight → Internal Testing: add
testers by Apple ID email. Apple requires TestFlight testers to be 13+.

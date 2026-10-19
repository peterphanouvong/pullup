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

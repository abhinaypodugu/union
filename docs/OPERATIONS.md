# Union — Operations Runbook

## 0. If a service-role key was ever in the app — rotate it first

Earlier builds read `EXPO_PUBLIC_SUPABASE_SERVICE_KEY`. Anything named `EXPO_PUBLIC_*` is compiled into the
APK / web bundle and can be extracted by anyone. If that variable was ever set for a build (local `.env`,
EAS environment, CI), treat the key as leaked:

1. Supabase dashboard → **Project Settings → API keys** → roll the **secret / service_role** key.
2. Remove `EXPO_PUBLIC_SUPABASE_SERVICE_KEY`, `EXPO_PUBLIC_ADMIN_SETUP_KEY` and `EXPO_PUBLIC_ADMIN_PHONES`
   from every `.env`, EAS environment and CI variable.
3. Old auth users created by the previous client code have the predictable password `UnionAuth!<digits>`.
   Reset them (SQL editor, run as `postgres`):
   ```sql
   UPDATE auth.users SET encrypted_password = NULL WHERE email LIKE 'u\_%@union.app';
   ```
   Phone OTP sign-in keeps working; password sign-in for those synthetic emails is disabled.

## 1. First-time setup

1. **Auth → Providers → Phone**: enable, configure the SMS provider (Twilio / MessageBird / Vonage).
   Disable "Email" sign-ups if you don't use them.
2. **SQL editor**: run `supabase/schema.sql` (it is idempotent and also migrates the previous version).
3. **Database → Extensions**: enable `pg_cron` (and `pg_net` for push scheduling), then re-run the last
   section of `schema.sql` (or the whole file) so the deadline job is scheduled.
4. **Add the first Platform Super Admin** (SQL editor, as `postgres`):
   ```sql
   INSERT INTO platform_admins (phone, name) VALUES ('+917995731200', 'Platform Operations');
   ```
   Use the full number with country code. A bare 10-digit number is treated as India (+91),
   the same rule the app applies when someone types a 10-digit number, so `'7995731200'`
   and `'+917995731200'` are equivalent; the same digits under another country code are not.
   That person signs in with OTP and sees "Create organization". Add at least two admins; the database
   refuses to deactivate the last one.
5. **App environment** (`.env` locally, EAS environment / GitHub `vars` for builds):
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
   ```
   Nothing else. No secret keys in the app.

## 2. Push notifications (PRD §11)

Pipeline: database functions write `notifications` (durable in-app record) and `notification_outbox`
(push queue) → the `dispatch-push` Edge Function sends via Expo Push (APNs/FCM) with batching, retries
(exponential backoff, 5 attempts), quiet hours, invalid-token cleanup and delivery status.

```bash
supabase functions deploy dispatch-push --no-verify-jwt
supabase secrets set CRON_SECRET=<random-string>
```
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to Edge Functions automatically.

Schedule it every minute (SQL editor, requires `pg_cron` + `pg_net`):
```sql
SELECT cron.schedule('union-dispatch-push', '* * * * *', $$
  SELECT net.http_post(
    url := 'https://<project>.supabase.co/functions/v1/dispatch-push',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
  );
$$);
```

Android needs FCM credentials in the Expo project (`eas credentials`), iOS needs an APNs key.

**Monitoring (PRD §14.5):**
```sql
SELECT status, count(*) FROM notification_outbox GROUP BY status;          -- delivery health
SELECT * FROM notification_outbox WHERE status = 'failed' ORDER BY id DESC;  -- failures with last_error
```

## 3. Deadlines & automatic escalation (PRD §9.5)

`process_issue_deadlines()` runs every 10 minutes via `pg_cron` (scheduled by `schema.sql`):
reminders 24h before a deadline (assignee + committee chair), automatic escalation after it, and an
admin alert when no higher committee is configured. It is idempotent (`p_expected_level` guard) and
can only run without an end-user JWT.

Stuck-escalation check:
```sql
SELECT id, level, committee_name, due_at FROM issues
WHERE due_at < now() - interval '1 hour' AND status NOT IN ('resolved','closed','rejected','awaiting_member','awaiting_external');
```

## 4. Native builds

New native modules were added (`expo-notifications`, `@react-native-async-storage/async-storage`,
`expo-document-picker`, `expo-device`). Regenerate native projects before building:

```bash
npx expo prebuild --platform android
```
CI does this automatically. For EAS: `eas build -p android --profile preview`.

## 5. Tests

```bash
npm test
```
Runs `supabase/schema.sql` on a real PostgreSQL (PGlite) and checks tenant isolation, RLS, routing,
escalation, governance, notification and audit rules, plus unit tests for app helpers. CI runs this on
every push and pull request.

## 6. Platforms

PRD §14.6 targets Android and iOS via Expo. The Management area (`/manage`) is part of the
mobile app. The same code also builds for the web (`npx expo export --platform web`) and works
against the same RLS-protected backend, which is handy for desk-based admins, but the web
build is not a supported product surface. PRD §15.1 still mentions a separate Next.js admin
console; that remains optional and would need no backend changes.

## 7. Test data (staging only)

`supabase/seed-ten-levels.sql` creates a 10-role test roster (see `docs/SEED_TEN_LEVELS.md`).
It refuses to run unless you first execute `SET app.allow_test_seed = 'on';`, uses only the
fictional +1 555-555-01xx numbers, and writes audit rows for every grant. Never run it on
production.

# Notifications

## Current state (verified 2026-10-24)

On-device notifications work while the app process is alive (foreground or
background). Supabase Realtime delivers the `notifications` row, and
`src/services/push.ts` raises an OS notification on the high-importance
`alerts` channel.

When the app process is killed, no notification appears: the code that would
raise it is gone. Closing that gap requires a remote courier.

## Why Firebase (FCM) and APNs are needed

| Layer | Component | Role |
|---|---|---|
| Data + logic | Supabase (already in use) | Writes `notifications` / `notification_outbox`, runs `dispatch-push` |
| Broker (optional) | Expo Push Service | One HTTP call, fans out to FCM + APNs |
| OS courier | FCM (Android) / APNs (iOS) | Wakes the device and displays the tray notification |
| Renderer | `expo-notifications` | Already installed; owns the `alerts` channel |

Supabase is the backend. It cannot wake a dead app: when the process is not
running, something outside the device must hand the payload to the OS, and on
Google-certified Android that is FCM. Apple's equivalent is APNs. Firebase is
free; the only cost in this picture is the Apple Developer Program ($99/yr),
which is required for an iOS APNs key.

## What is already built

- `supabase/functions/dispatch-push/index.ts`: drains `notification_outbox`,
  batching, retries, quiet hours, `ExpoPushProvider` behind a `PushProvider`
  abstraction (swap for direct FCM/APNs without touching business logic).
- `publish_post(...)` enqueues per-recipient notification rows and outbox rows
  when `p_notify` is true.
- `device_tokens`, `notification_outbox` tables and their RLS policies.
- Client registration path in `src/services/push.ts` (`registerForPush`).

## What is missing (all need account access)

1. Firebase project with an Android app for `org.commons.union`;
   place `google-services.json` in `android/app/`. Without it logcat reports
   `FirebaseApp initialization unsuccessful`.
2. `com.google.gms:google-services` Gradle plugin in `android/build.gradle`
   and applied in `android/app/build.gradle`.
3. Expo credentials: `eas credentials` -> Android -> Push Notifications,
   upload the FCM V1 service-account key (`extra.eas.projectId` is already set
   in `app.json`).
4. Supabase access token: `npx supabase login`. Without it `dispatch-push`
   cannot be deployed and pg_cron cannot be scheduled.
5. Server side: deploy `dispatch-push`, set `CRON_SECRET`, enable `pg_cron` +
   `pg_net`, schedule the every-minute drain (see `docs/OPERATIONS.md`).
   `notification_outbox` rows stay `pending` until this exists.

For iOS the same path applies with an APNs key instead of the FCM key.

## Deferred

Remote push is deferred until the credentials above exist. The in-app record
and the local OS notification remain the supported behaviour until then.

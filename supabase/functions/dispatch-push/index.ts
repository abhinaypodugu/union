// Supabase Edge Function: drains notification_outbox and delivers push notifications
// (PRD §11.2 durable queue, batching, retry, idempotency, delivery/failure tracking;
//  §11.3 quiet hours; §11.4 provider abstraction).
//
// Runs server-side with the service-role key from the function's own environment —
// the key never ships in the mobile/web app. Schedule it every minute, e.g. with
// pg_cron + pg_net (see docs/OPERATIONS.md), and protect it with CRON_SECRET.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

type OutboxRow = {
  id: number;
  notification_id: string;
  recipient_profile_id: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  mandatory: boolean;
  attempts: number;
};

type PushMessage = { to: string; title: string; body: string; data: Record<string, unknown>; outboxId: number };
type PushResult = { outboxId: number; token: string; ok: boolean; error?: string; tokenInvalid?: boolean };

/** Provider abstraction so Expo can be swapped for direct FCM/APNs without touching business logic. */
interface PushProvider {
  send(messages: PushMessage[]): Promise<PushResult[]>;
}

class ExpoPushProvider implements PushProvider {
  async send(messages: PushMessage[]): Promise<PushResult[]> {
    const results: PushResult[] = [];
    for (let i = 0; i < messages.length; i += 100) {
      const batch = messages.slice(i, i + 100);
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(batch.map(({ to, title, body, data }) => ({ to, title, body, data, sound: 'default' }))),
      });
      if (!res.ok) {
        const text = await res.text();
        batch.forEach((m) => results.push({ outboxId: m.outboxId, token: m.to, ok: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` }));
        continue;
      }
      const json = (await res.json()) as { data: Array<{ status: string; message?: string; details?: { error?: string } }> };
      json.data.forEach((ticket, idx) => {
        const m = batch[idx];
        const err = ticket.details?.error;
        results.push({
          outboxId: m.outboxId,
          token: m.to,
          ok: ticket.status === 'ok',
          error: ticket.status === 'ok' ? undefined : err || ticket.message,
          tokenInvalid: err === 'DeviceNotRegistered',
        });
      });
    }
    return results;
  }
}

const MAX_ATTEMPTS = 5;
const BATCH = 500;

function inQuietHours(prefs: Record<string, unknown> | null, now: Date): Date | null {
  const q = prefs?.quietHours as { start?: string; end?: string; tzOffsetMinutes?: number } | undefined;
  if (!q?.start || !q?.end) return null;
  const offset = q.tzOffsetMinutes ?? 0;
  const local = new Date(now.getTime() + offset * 60000);
  const mins = local.getUTCHours() * 60 + local.getUTCMinutes();
  const [sh, sm] = q.start.split(':').map(Number);
  const [eh, em] = q.end.split(':').map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  const quiet = start <= end ? mins >= start && mins < end : mins >= start || mins < end;
  if (!quiet) return null;
  const wait = (end - mins + 1440) % 1440;
  return new Date(now.getTime() + wait * 60000);
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET');
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  const provider: PushProvider = new ExpoPushProvider();
  const now = new Date();

  const { data: rows, error } = await supabase
    .from('notification_outbox')
    .select('id, notification_id, recipient_profile_id, title, body, data, mandatory, attempts')
    .eq('status', 'pending')
    .lte('next_attempt_at', now.toISOString())
    .order('id')
    .limit(BATCH);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  const outbox = (rows || []) as OutboxRow[];
  if (outbox.length === 0) return Response.json({ processed: 0 });

  const profileIds = [...new Set(outbox.map((r) => r.recipient_profile_id))];
  const { data: profiles } = await supabase.from('profiles').select('id, user_id, status, notification_prefs').in('id', profileIds);
  const profileById = new Map((profiles || []).map((p) => [p.id as string, p]));
  const userIds = [...new Set((profiles || []).map((p) => p.user_id).filter(Boolean))];
  const { data: tokens } = await supabase.from('device_tokens').select('token, user_id').in('user_id', userIds);
  const tokensByUser = new Map<string, string[]>();
  (tokens || []).forEach((t) => tokensByUser.set(t.user_id, [...(tokensByUser.get(t.user_id) || []), t.token]));

  const messages: PushMessage[] = [];
  const skipped: number[] = [];
  const deferred: Array<{ id: number; until: Date }> = [];
  for (const row of outbox) {
    const profile = profileById.get(row.recipient_profile_id);
    // Revoked sessions / suspended memberships get nothing; in-app record already exists
    if (!profile || profile.status !== 'verified' || !profile.user_id) { skipped.push(row.id); continue; }
    const userTokens = tokensByUser.get(profile.user_id) || [];
    if (userTokens.length === 0) { skipped.push(row.id); continue; }
    const until = row.mandatory ? null : inQuietHours(profile.notification_prefs, now);
    if (until) { deferred.push({ id: row.id, until }); continue; }
    userTokens.forEach((to) => messages.push({ to, title: row.title, body: row.body, data: row.data, outboxId: row.id }));
  }

  const results = messages.length ? await provider.send(messages) : [];
  const byOutbox = new Map<number, PushResult[]>();
  results.forEach((r) => byOutbox.set(r.outboxId, [...(byOutbox.get(r.outboxId) || []), r]));

  const invalidTokens = results.filter((r) => r.tokenInvalid).map((r) => r.token);
  if (invalidTokens.length) await supabase.from('device_tokens').delete().in('token', invalidTokens);

  for (const row of outbox) {
    const rs = byOutbox.get(row.id);
    if (!rs) continue;
    if (rs.some((r) => r.ok)) {
      await supabase.from('notification_outbox').update({ status: 'sent', sent_at: new Date().toISOString(), attempts: row.attempts + 1, last_error: null }).eq('id', row.id);
    } else {
      const attempts = row.attempts + 1;
      const backoffMin = Math.min(60, 2 ** attempts);
      await supabase.from('notification_outbox').update({
        status: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
        attempts,
        next_attempt_at: new Date(Date.now() + backoffMin * 60000).toISOString(),
        last_error: rs.map((r) => r.error).filter(Boolean).join('; ').slice(0, 500),
      }).eq('id', row.id);
    }
  }
  if (skipped.length) await supabase.from('notification_outbox').update({ status: 'skipped' }).in('id', skipped);
  for (const d of deferred) await supabase.from('notification_outbox').update({ next_attempt_at: d.until.toISOString() }).eq('id', d.id);

  const failed = results.filter((r) => !r.ok).length;
  // Structured log line for delivery monitoring (PRD §14.5) — no message content.
  console.log(JSON.stringify({ fn: 'dispatch-push', processed: outbox.length, sent: results.length - failed, failed, skipped: skipped.length, deferred: deferred.length }));
  return Response.json({ processed: outbox.length, sent: results.length - failed, failed, skipped: skipped.length, deferred: deferred.length });
});

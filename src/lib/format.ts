// Pure helpers (no React Native imports) so they can be unit-tested with Node directly.

export type DueState = 'ok' | 'soon' | 'overdue';

/** Normalize an Indian-default mobile number to E.164 (+91XXXXXXXXXX). */
export function normalizePhoneNumber(raw: string): { normalized: string; digits: string } {
  const trimmed = (raw || '').trim();
  const digitsOnly = trimmed.replace(/[^0-9]/g, '');
  if (!digitsOnly) return { normalized: '', digits: '' };
  if (trimmed.startsWith('+')) return { normalized: `+${digitsOnly}`, digits: digitsOnly };
  if (digitsOnly.length === 10) return { normalized: `+91${digitsOnly}`, digits: `91${digitsOnly}` };
  return { normalized: `+${digitsOnly}`, digits: digitsOnly };
}

/** "Just now", "5m", "3h", "2d", or a date for older items. */
export function relativeTime(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return '';
  const then = new Date(iso);
  const diff = Math.max(0, now.getTime() - then.getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return then.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** Deadline text + state computed from the server's due_at (single source of truth). */
export function dueInfo(dueAt: string | null | undefined, now: Date = new Date()): { due: string; dueState: DueState } {
  if (!dueAt) return { due: '—', dueState: 'ok' };
  const ms = new Date(dueAt).getTime() - now.getTime();
  if (ms <= 0) {
    const late = Math.ceil(-ms / 3600000);
    return { due: late >= 48 ? `Overdue ${Math.floor(late / 24)}d` : `Overdue ${late}h`, dueState: 'overdue' };
  }
  const hours = ms / 3600000;
  if (hours < 24) return { due: `Due in ${Math.max(1, Math.round(hours))}h`, dueState: 'soon' };
  return { due: `Due in ${Math.round(hours / 24)}d`, dueState: 'ok' };
}

/** Median of numbers (for first-response metrics). */
export function median(values: number[]): number | null {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

export type AudienceScope = 'org' | 'region' | 'local' | 'group' | 'committee';
export interface AudienceOption {
  scope: AudienceScope;
  value: string | null;
  label: string;
}

/** Map a notification go_target to an in-app route. The destination re-checks access. */
export function notificationHref(goTarget: string | null | undefined): string | undefined {
  if (!goTarget) return undefined;
  if (goTarget.startsWith('/')) return goTarget;
  return `/issue?id=${encodeURIComponent(goTarget)}`;
}

/** Short, user-facing message from a Postgres/PostgREST error. */
export function errorMessage(err: unknown): string {
  if (!err) return 'Something went wrong';
  const msg = typeof err === 'string' ? err : (err as { message?: string }).message || String(err);
  return msg.replace(/^.*?ERROR:\s*/, '').slice(0, 200);
}

/** 950 → "950", 1240 → "1.2k", 18400 → "18k", 1200000 → "1.2M". */
export function compactCount(n: number): string {
  if (!Number.isFinite(n) || n < 1000) return String(Math.max(0, Math.round(n || 0)));
  const fmt = (v: number, s: string) => (v < 10 ? v.toFixed(1).replace(/\.0$/, '') : String(Math.round(v))) + s;
  return n < 1e6 ? fmt(n / 1e3, 'k') : fmt(n / 1e6, 'M');
}

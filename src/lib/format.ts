// Pure helpers (no React Native imports) so they can be unit-tested with Node directly.

/** Logical size of the crop editor canvas; crop offsets are stored in this space. */
export const AVATAR_EDITOR_SIZE = 240;

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

/** Parse URL crop coordinates (#crop=scale,dx,dy) and scale offsets proportionally for any target diameter. */
export function parseCropParams(uri: string | null | undefined, targetSize = 40): {
  actualUri: string;
  scale: number;
  translateX: number;
  translateY: number;
  hasCrop: boolean;
} {
  const [actualUri = '', cropParams] = (uri || '').split('#crop=');
  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  let hasCrop = false;

  if (cropParams) {
    const parts = cropParams.split(',');
    if (parts.length >= 3) {
      const s = parseFloat(parts[0]);
      const dx = parseFloat(parts[1]);
      const dy = parseFloat(parts[2]);
      if (Number.isFinite(s) && s > 0) scale = s;
      const ratio = targetSize / AVATAR_EDITOR_SIZE;
      if (Number.isFinite(dx)) translateX = dx * ratio;
      if (Number.isFinite(dy)) translateY = dy * ratio;
      hasCrop = true;
    }
  }

  return { actualUri, scale, translateX, translateY, hasCrop };
}

/** Normalizes DD-MM-YYYY or DD/MM/YYYY to YYYY-MM-DD for PostgreSQL DATE columns. */
export function normalizeDobToIso(rawDob: string | null | undefined): string | null {
  const raw = (rawDob || '').trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parts = raw.split(/[-/]/);
  if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return null;
}

/** Returns true if a designation is a leadership post (L1+) requiring executive approval. */
export function isLeadershipDesignation(designation: string | null | undefined): boolean {
  const d = (designation || '').trim().toLowerCase();
  return Boolean(d && d !== 'member');
}

/** Enforces field-level security when merging profile updates. */
export function computeSafePostalProfile<
  T extends {
    employeeId?: string;
    designation?: string;
    category?: string;
    dob?: string;
    officeEmployed?: string;
    division?: string;
    circle?: string;
    unit?: string;
    region?: string;
    avatarUrl?: string;
  }
>(
  data: Partial<T>,
  activeMember: T,
  isAdmin: boolean
): T {
  const newUnit = data.division || data.unit || activeMember.division || activeMember.unit || 'Secunderabad';
  const newRegion = data.circle || data.region || activeMember.circle || activeMember.region || 'Telangana';

  return {
    ...activeMember,
    employeeId: isAdmin ? (data.employeeId !== undefined ? data.employeeId : activeMember.employeeId) : activeMember.employeeId,
    designation: isAdmin ? (data.designation !== undefined ? data.designation : activeMember.designation) : activeMember.designation,
    category: isAdmin ? (data.category !== undefined ? data.category : activeMember.category) : activeMember.category,
    dob: data.dob !== undefined ? normalizeDobToIso(data.dob) || data.dob : activeMember.dob,
    officeEmployed: data.officeEmployed !== undefined ? data.officeEmployed : activeMember.officeEmployed,
    division: data.division || activeMember.division || newUnit,
    circle: data.circle || activeMember.circle || newRegion,
    unit: newUnit,
    region: newRegion,
    avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : activeMember.avatarUrl,
  };
}

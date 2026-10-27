import type { GroupItem, Persona } from '../store/types';

export const SETUP_VERSION = 1;

export type SetupProgressStep = 'avatar' | 'details' | 'intro';

export interface SetupProgress {
  avatar: boolean;
  details: boolean;
  intro: boolean;
}

export const EMPTY_SETUP_PROGRESS: SetupProgress = { avatar: false, details: false, intro: false };

export function isSetupEligible(member: Persona | null): boolean {
  return Boolean(member && member.status === 'verified' && member.setupVersion === 0);
}

export function setupProgressKey(userId: string, step: SetupProgressStep): string {
  return `app-tour:${userId}:setup-progress:${step}`;
}

/** Device-local fallback for members created before the setup marker reaches the server. */
export function pendingSetupKey(profileId: string): string {
  return `app-tour:${profileId}:pending-setup`;
}

/** The first channel a member can actually write in; the division is preferred. */
export function pickIntroGroup(
  groups: Array<{ items: GroupItem[] }>,
  canWrite: (scope: GroupItem['scope'], value: string | null) => boolean
): GroupItem | null {
  const all = groups.flatMap((section) => section.items);
  const writable = all.filter((item) => canWrite(item.scope, item.value));
  return writable.find((item) => item.scope === 'local')
    || writable.find((item) => item.scope === 'group')
    || writable[0]
    || null;
}

/** A friendly 1–2 line introduction that the member can edit before sending. */
export function buildIntroMessage(member: Pick<Persona, 'name' | 'designation' | 'officeEmployed' | 'division' | 'unit'>): string {
  const first = member.name.trim().split(/\s+/)[0] || member.name;
  const rawRole = member.designation?.trim();
  const role = !rawRole || /^member$/i.test(rawRole) ? 'a member' : rawRole;
  const place = member.officeEmployed?.trim() || member.division?.trim() || member.unit?.trim();
  const where = place ? ` at ${place}` : '';
  return `Namaste everyone, I'm ${first} — ${role}${where}. Glad to connect with you all here.`;
}

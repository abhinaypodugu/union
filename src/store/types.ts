import type { IssueStatus } from '../components/domain/StatusBadge';
import type { EscalationStage } from '../components/domain/EscalationTimeline';
import type { AudienceOption, AudienceScope, DueState } from '../lib/format';

export type { IssueStatus, EscalationStage, AudienceOption, AudienceScope, DueState };

export interface HierarchyLevel {
  level: number;
  label: string;
}

export interface TerminologyConfig {
  orgLabel: string;
  level1Label: string;
  level2Label: string;
  level3Label: string;
  groupLabel: string;
  caseLabel: string;
  cadres?: string[];
  cities?: string[];
  states?: string[];
  levels?: HierarchyLevel[];
}

export function getHierarchyLevels(terminology?: Partial<TerminologyConfig>): HierarchyLevel[] {
  if (terminology?.levels && terminology.levels.length > 0) {
    return terminology.levels;
  }
  return [
    { level: 1, label: terminology?.level1Label || 'City' },
    { level: 2, label: terminology?.level2Label || 'State' },
    { level: 3, label: terminology?.level3Label || 'National' },
  ];
}

export interface TenantSettings {
  autoApproveMembers?: boolean;
  reopenWindowDays?: number;
  memberPosts?: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  short: string;
  code: string;
  description: string;
  terminology: TerminologyConfig;
  settings?: TenantSettings;
  cadres?: string[];
  cities?: string[];
  states?: string[];
  levels?: HierarchyLevel[];
}

export type MembershipStatus = 'verified' | 'pending' | 'suspended' | 'rejected' | 'ended';

export interface NotificationPrefs {
  announcements?: boolean;
  replies?: boolean;
  groupActivity?: boolean;
  caseUpdates?: boolean;
  quietHours?: { start: string; end: string; tzOffsetMinutes: number } | null;
}

/** A membership (one person in one organization). */
export interface Persona {
  id: string;
  userId?: string;
  name: string;
  memberId: string;
  tenantId: string;
  email?: string;
  phone?: string;
  unit: string;
  region: string;
  country: string;
  groups: string[];
  roles: string[];
  status: MembershipStatus;
  statusReason?: string;
  since: string;
  prefs?: NotificationPrefs;
}

export interface Issue {
  id: string;
  tenantId: string;
  complainantId: string;
  complainantName: string;
  title: string;
  description?: string;
  status: IssueStatus;
  statusLabel?: string;
  level: number;
  category: string;
  location: string;
  group?: string;
  committeeId: string | null;
  committee: string;
  assigneeId: string | null;
  assignee: string | null;
  priority: 'normal' | 'high' | 'urgent';
  confidential: boolean;
  affectsOthers: boolean;
  due: string;
  dueState: DueState;
  dueAt: string | null;
  nextAction: string;
  resolutionSummary?: string;
  lastReason?: string;
  opened: string;
  createdAt: string;
  updatedAt: string;
  firstResponseAt: string | null;
  stages: EscalationStage[];
}

/** Handler-side view of an issue (same record, different screen). */
export type Case = Issue & { age: string; next: string; reason?: string };

export interface Post {
  id: string;
  tenantId: string;
  kind: 'member' | 'official' | 'committee';
  pinned: boolean;
  authorId: string | null;
  author: { name: string; role?: string; official?: boolean };
  source: string;
  time: string;
  createdAt: string;
  title?: string;
  body: string;
  audience: { scope: AudienceScope; value: string | null; label: string };
  likes: number;
  comments: number;
  removed?: boolean;
  expiresAt?: string | null;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string | null;
  authorName: string;
  text: string;
  time: string;
}

export type AppointmentStatus = 'pending' | 'active' | 'suspended' | 'expired' | 'revoked' | 'replaced';

export interface CommitteeMember {
  id: string;
  committeeId: string;
  profileId: string | null;
  name: string;
  role: 'Chair' | 'Secretary' | 'Issue handler' | 'Member';
  since: string;
  method: string;
  formation: string;
  status: AppointmentStatus;
  override?: boolean;
  overrideReason?: string;
  statusReason?: string;
  startDate?: string | null;
  endDate?: string | null;
}

export interface CommitteeInfo {
  id: string;
  name: string;
  scope: string;
  level: number;
  functionalGroup: string | null;
  geoUnitId: string | null;
  escalatesToId: string | null;
  method: string;
  term: string;
  responseHours: number;
  resolutionHours: number;
  responsibilities: [string, string][];
  members: CommitteeMember[];
}

export interface GeoUnit {
  id: string;
  name: string;
  type: 'country' | 'state' | 'city' | 'local';
  kind: string;
  parentId: string | null;
  memberCount: number;
}

export interface FunctionalGroup {
  id: string;
  name: string;
  memberCount: number;
}

export interface RoutingRule {
  id: string;
  category: string;
  targetKind: 'group' | 'general' | 'committee';
  targetCommitteeId: string | null;
  startLevel: number;
  confidential: boolean;
  sortOrder: number;
  active: boolean;
}

export interface AuditEntry {
  id: string;
  time: string;
  actor: string;
  actorRole: string;
  action: string;
  entityId: string;
  details: string;
  reason?: string;
  isOverride?: boolean;
}

export interface AppNotification {
  id: string;
  kind: 'status' | 'announcement' | 'reply' | 'escalation' | 'security' | 'appointment';
  title: string;
  context: string;
  time: string;
  createdAt: string;
  unread: boolean;
  mandatory: boolean;
  goTarget: string | null;
}

export interface InternalNote {
  id: string;
  authorName: string;
  authorRole: string;
  text: string;
  time: string;
}

export interface MemberReply {
  id: string;
  authorName: string;
  text: string;
  time: string;
}

export interface Attachment {
  id: string;
  fileName: string;
  path: string;
  internal: boolean;
  time: string;
}

export interface ChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  time: string;
}

export interface GroupItem {
  id: string;
  name: string;
  kind: string;
  icon: string;
  tone: 'geo' | 'group' | 'committee';
  scope: AudienceScope;
  value: string | null;
}

export interface GroupSection {
  section: string;
  note?: string;
  items: GroupItem[];
}

export type IssueAction =
  | 'route' | 'assign' | 'acknowledge' | 'start' | 'request_info' | 'await_external'
  | 'resolve' | 'close' | 'reject' | 'reply' | 'confirm' | 'reopen' | 'add_note';

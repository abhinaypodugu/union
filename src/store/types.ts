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

export interface AffiliatedAssociation {
  name: string;
  category: string;
  shortLabel: string;
}

export const AFFILIATED_ASSOCIATIONS: AffiliatedAssociation[] = [
  { name: 'Bharatiya Postal RMS Supervisors Association Group ‘B’', category: 'Supervisors', shortLabel: 'Supervisors' },
  { name: 'Bharatiya Postal Employees Association Postman & MTS', category: 'Postman & MTS', shortLabel: 'Postman & MTS' },
  { name: 'Bharatiya Postal Employees Association Gr. ‘C’', category: 'Group ‘C’', shortLabel: 'Group ‘C’' },
  { name: 'Bharatiya Gramin Dak Karamchari Sangh', category: 'GDS', shortLabel: 'GDS' },
  { name: 'Bharatiya RMS & MMS Employees Association Gr. ‘C’', category: 'RMS & MMS', shortLabel: 'RMS & MMS' },
  { name: 'Bharatiya RMS & MMS Employees Association Mailguard & MTS', category: 'Mailguard & MTS', shortLabel: 'Mailguard & MTS' },
  { name: 'Bharatiya Postal Civil Wing Non-Gazetted Employees Association', category: 'Civil Wing', shortLabel: 'Civil Wing' },
  { name: 'Bharatiya Postal Accounts Office Employees Association', category: 'Postal Accounts', shortLabel: 'Postal Accounts' },
  { name: 'Bharatiya Postal Administrative Offices Employees Association Group ‘C’ / MTS & other Non-Gazetted Staff', category: 'Administrative Offices', shortLabel: 'Administrative Offices' },
  { name: 'Bharatiya Postal SBCO Employees Association', category: 'SBCO', shortLabel: 'SBCO' },
  { name: 'Bharatiya Postal Officers Association', category: 'Postal Officers', shortLabel: 'Postal Officers' },
  { name: 'Bharatiya Postal IP and ASP Association', category: 'IP & ASP', shortLabel: 'IP & ASP' },
];

export const DEFAULT_POSTAL_CADRES = AFFILIATED_ASSOCIATIONS.map((a) => a.category);
export interface UnionDesignation {
  title: string;
  level: number;
  levelBadge: string;
  meaning: string;
  tone: 'neutral' | 'officer' | 'head';
}

/** Union designations in strictly increasing order from Member to President */
export const UNION_DESIGNATIONS: UnionDesignation[] = [
  {
    title: 'Member',
    level: 0,
    levelBadge: 'L0 · Base',
    meaning: 'Baseline union membership with workplace representation and voting rights.',
    tone: 'neutral',
  },
  {
    title: 'Executive Committee Member',
    level: 1,
    levelBadge: 'L1 · Branch',
    meaning: 'Elected workplace delegate representing fellow staff in committee deliberations.',
    tone: 'officer',
  },
  {
    title: 'Assistant Secretary',
    level: 2,
    levelBadge: 'L2 · Officer',
    meaning: 'Assists in branch administration, records meeting minutes, and handles member correspondence.',
    tone: 'officer',
  },
  {
    title: 'Vice President',
    level: 3,
    levelBadge: 'L3 · Officer',
    meaning: 'Supports the President and chairs executive meetings and delegations in their absence.',
    tone: 'officer',
  },
  {
    title: 'Treasurer',
    level: 4,
    levelBadge: 'L4 · Finance',
    meaning: 'Custodian of union funds, collects subscriptions, and maintains financial audits.',
    tone: 'officer',
  },
  {
    title: 'Division Secretary',
    level: 5,
    levelBadge: 'L5 · Division Head',
    meaning: 'Chief executive officer of the postal division; coordinates grievances and local stewards.',
    tone: 'head',
  },
  {
    title: 'Circle Secretary',
    level: 6,
    levelBadge: 'L6 · Circle Head',
    meaning: 'State-level executive coordinating all divisions and CPMG administrative matters.',
    tone: 'head',
  },
  {
    title: 'President',
    level: 7,
    levelBadge: 'L7 · Supreme Head',
    meaning: 'Highest constitutional head representing the entire union in all official matters.',
    tone: 'head',
  },
];


export const DEFAULT_TERMINOLOGY: TerminologyConfig = {
  orgLabel: 'Union',
  level1Label: 'Division',
  level2Label: 'Circle',
  level3Label: 'All India',
  groupLabel: 'Affiliated Association',
  caseLabel: 'Grievance',
  cadres: DEFAULT_POSTAL_CADRES,
  cities: [],
  states: [],
  levels: [
    { level: 1, label: 'Division' },
    { level: 2, label: 'Circle' },
    { level: 3, label: 'All India' },
  ],
};

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
  employeeId?: string;
  designation?: string;
  category?: string;
  dob?: string;
  officeEmployed?: string;
  division?: string;
  circle?: string;
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

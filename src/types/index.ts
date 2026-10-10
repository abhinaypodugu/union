// Commons Platform Types (PRD v1.2)

export type GeographicLevel = 'country' | 'state' | 'city' | 'local';

export interface TerminologyConfig {
  orgLabel: string;        // e.g. "Federation" | "Union" | "Association"
  level1Label: string;     // e.g. "City" | "District" | "Branch"
  level2Label: string;     // e.g. "State" | "Province" | "Region"
  level3Label: string;     // e.g. "National" | "Country"
  groupLabel: string;      // e.g. "Functional Group" | "Sector" | "Trade"
  caseLabel: string;       // e.g. "Issue" | "Grievance" | "Case"
}

export interface Tenant {
  id: string;
  name: string;
  shortName: string;
  code: string;
  description: string;
  terminology: TerminologyConfig;
  active: boolean;
}

export interface GeoUnit {
  id: string;
  name: string;
  type: GeographicLevel;
  kind: string; // Label like "City", "State", "Country"
  parentId?: string;
  memberCount: number;
  tenantId: string;
}

export interface FunctionalGroup {
  id: string;
  name: string;
  category: string;
  icon: string;
  memberCount: number;
  tenantId: string;
  geographicScope?: string; // e.g. "Hyderabad", "Telangana", or org-wide
}

export type CommitteeRole = 'Chair' | 'Secretary' | 'Issue handler' | 'Member';
export type FormationMethod = 'Appointment' | 'Nomination & approval' | 'Election' | 'Eligibility-based selection';
export type AppointmentStatus = 'active' | 'suspended' | 'pending' | 'revoked';

export interface CommitteeMember {
  id: string;
  name: string;
  role: CommitteeRole;
  since: string;
  method: string; // Detailed formation text
  formationType: FormationMethod;
  status: AppointmentStatus;
  override?: boolean; // Platform Super Admin override flag
  overrideReason?: string;
}

export interface CommitteeAudit {
  time: string;
  actor: string;
  action: string;
  text: string;
  override?: boolean;
}

export interface Committee {
  id: string;
  name: string;
  tenantId: string;
  scope: string; // e.g. "Hyderabad · IT Workers"
  level: 1 | 2 | 3; // 1: City, 2: State/Region, 3: National
  functionalGroupId?: string;
  geoUnitId?: string;
  method: FormationMethod;
  term: string;
  members: CommitteeMember[];
  audit: CommitteeAudit[];
  responsibilities: {
    handles: string;
    escalatesTo: string;
    publishScope: string;
  };
}

export type UserRole =
  | 'visitor'
  | 'member'
  | 'handler'
  | 'chair'
  | 'local_leader'
  | 'regional_leader'
  | 'national_leader'
  | 'org_admin'
  | 'super_admin';

export interface Member {
  id: string;
  name: string;
  memberNumber: string; // e.g. DWF-104582
  tenantId: string;
  email: string;
  unit: string;      // City
  region: string;    // State
  country: string;   // Country
  groups: string[];  // Functional groups
  roles: UserRole[];
  status: 'verified' | 'pending' | 'suspended';
  since: string;
  notificationPrefs: {
    announcements: boolean;
    replies: boolean;
    groupActivity: boolean;
    caseUpdates: boolean; // Locked true by policy
  };
}

export interface Comment {
  id: string;
  author: string;
  time: string;
  text: string;
}

export interface Post {
  id: string;
  tenantId: string;
  kind: 'official' | 'member' | 'committee';
  pinned?: boolean;
  mine?: boolean;
  author: {
    name: string;
    role?: string;
    avatar?: string;
  };
  source: string;
  time: string;
  title?: string;
  body: string;
  media?: string;
  audience: {
    scope: 'local' | 'group' | 'region' | 'org' | 'private';
    label: string;
  };
  likes: number;
  likedByMe?: boolean;
  comments: Comment[];
  notifyPush?: boolean;
}

export type IssueStatus =
  | 'submitted'
  | 'triage'
  | 'assigned'
  | 'acknowledged'
  | 'in_progress'
  | 'awaiting_member'
  | 'escalated'
  | 'resolved'
  | 'closed';

export type IssuePriority = 'normal' | 'high' | 'urgent';

export interface TimelineEvent {
  time: string;
  text: string;
  actor?: string;
}

export interface EscalationStage {
  name: string;
  state: 'done' | 'current' | 'upcoming';
  levelShort?: string; // "L1", "L2", "L3"
  sub?: string;
  escalatedHere?: boolean;
  reason?: string;
  due?: string;
  dueState?: 'ok' | 'soon' | 'overdue';
  events?: TimelineEvent[];
}

export interface InternalNote {
  id: string;
  time: string;
  author: string;
  role: string;
  text: string;
}

export interface MemberReply {
  id: string;
  time: string;
  author: string;
  text: string;
  attachments?: string[];
}

export interface Issue {
  id: string;
  tenantId: string;
  complainantId: string;
  complainantName: string;
  title: string;
  description?: string;
  category: string;
  location: string;
  group?: string; // Functional group
  committee: string;
  committeeId?: string;
  status: IssueStatus;
  statusLabel?: string;
  priority: IssuePriority;
  confidential?: boolean;
  affectsOthers?: boolean;
  age: string;
  due?: string;
  dueState?: 'ok' | 'soon' | 'overdue';
  level: number; // 1, 2, 3
  nextAction: string;
  assignee: string | null;
  opened: string;
  stages: EscalationStage[];
  internalNotes: InternalNote[]; // STRICTLY HIDDEN FROM REGULAR MEMBERS
  memberReplies: MemberReply[];
}

export interface Notification {
  id: string;
  tenantId: string;
  recipientId?: string;
  group: 'Today' | 'Earlier';
  kind: 'status' | 'announcement' | 'reply' | 'escalation' | 'security' | 'appointment';
  unread: boolean;
  mandatory?: boolean;
  title: string;
  context: string;
  time: string;
  go?: string; // Case ID or screen key
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  tenantId: string;
  tenantName: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: 'committee' | 'appointment' | 'case' | 'announcement' | 'member' | 'system';
  entityId: string;
  details: string;
  reason?: string;
  isSuperAdminOverride: boolean;
}

export interface TreeNode {
  id: string;
  name: string;
  type: 'country' | 'state' | 'city' | 'committee' | 'group';
  kind: string;
  meta?: string;
  children?: TreeNode[];
}

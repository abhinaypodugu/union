// Synthetic demo data — no real people or organizations.
import type { EscalationStage, IssueStatus, NotificationKind, OrgNode, PostCardProps, Rich, DueState } from '../components';

export interface TerminologyConfig {
  orgLabel: string;
  level1Label: string;
  level2Label: string;
  level3Label: string;
  groupLabel: string;
  caseLabel: string;
}

export interface Tenant {
  id: string;
  name: string;
  short: string;
  code: string;
  description: string;
  terminology: TerminologyConfig;
}

export const TENANTS: Tenant[] = [
  {
    id: 'dwf',
    name: "Deccan Workers' Federation",
    short: 'DWF',
    code: 'DWF',
    description: "Federation of technology, transport, and service industry workers in the Deccan region.",
    terminology: {
      orgLabel: 'Federation',
      level1Label: 'City',
      level2Label: 'State',
      level3Label: 'National',
      groupLabel: 'Functional Group',
      caseLabel: 'Issue',
    },
  },
  {
    id: 'nea',
    name: 'National Educators Alliance',
    short: 'NEA',
    code: 'NEA',
    description: 'Alliance of primary, secondary, and higher-education professionals and academic staff.',
    terminology: {
      orgLabel: 'Alliance',
      level1Label: 'Branch',
      level2Label: 'Region',
      level3Label: 'National',
      groupLabel: 'Sector',
      caseLabel: 'Grievance',
    },
  },
];

export interface Persona {
  id: string;
  name: string;
  memberId: string;
  tenantId: string;
  email: string;
  unit: string;
  region: string;
  country: string;
  groups: string[];
  roles: string[];
  status: 'verified' | 'pending' | 'suspended';
  since: string;
  isLeader?: boolean;
  leaderScope?: string;
}

export const PERSONAS: Persona[] = [
  {
    id: 'm-priya',
    name: 'Priya Nair',
    memberId: 'DWF-104582',
    tenantId: 'dwf',
    email: 'priya.nair@dwf.org',
    unit: 'Hyderabad',
    region: 'Telangana',
    country: 'India',
    groups: ['IT Workers'],
    roles: ['member', 'handler'],
    status: 'verified',
    since: 'March 2023',
    isLeader: true,
    leaderScope: 'State admin · Telangana',
  },
  {
    id: 'm-anita',
    name: 'Anita Desai',
    memberId: 'DWF-102140',
    tenantId: 'dwf',
    email: 'anita.desai@dwf.org',
    unit: 'Hyderabad',
    region: 'Telangana',
    country: 'India',
    groups: ['IT Workers'],
    roles: ['member', 'handler'],
    status: 'verified',
    since: 'January 2022',
    isLeader: true,
    leaderScope: 'Secretary · Hyderabad IT Workers',
  },
  {
    id: 'm-imran',
    name: 'Imran Sheikh',
    memberId: 'DWF-098421',
    tenantId: 'dwf',
    email: 'imran.sheikh@dwf.org',
    unit: 'Hyderabad',
    region: 'Telangana',
    country: 'India',
    groups: ['IT Workers'],
    roles: ['member', 'chair'],
    status: 'verified',
    since: 'November 2020',
    isLeader: true,
    leaderScope: 'Chair · Telangana IT Workers',
  },
  {
    id: 'm-lakshmi',
    name: 'Lakshmi Rao',
    memberId: 'DWF-081042',
    tenantId: 'dwf',
    email: 'lakshmi.rao@dwf.org',
    unit: 'Hyderabad',
    region: 'Telangana',
    country: 'India',
    groups: ['IT Workers', 'Transport Workers'],
    roles: ['member', 'org_admin'],
    status: 'verified',
    since: 'June 2019',
    isLeader: true,
    leaderScope: 'State Admin · Telangana',
  },
  {
    id: 'm-vikram-patel',
    name: 'Dr. Vikram Patel',
    memberId: 'SYS-000001',
    tenantId: 'dwf',
    email: 'superadmin@commons.org',
    unit: 'National Office',
    region: 'Central',
    country: 'India',
    groups: [],
    roles: ['super_admin'],
    status: 'verified',
    since: 'Founding Admin',
    isLeader: true,
    leaderScope: 'Platform Super Admin',
  },
  {
    id: 'm-maya',
    name: 'Maya Sen',
    memberId: 'NEA-204199',
    tenantId: 'nea',
    email: 'maya.sen@nea.org',
    unit: 'Bangalore Central',
    region: 'Karnataka',
    country: 'India',
    groups: ['Higher Ed Faculty'],
    roles: ['member'],
    status: 'verified',
    since: 'August 2024',
    isLeader: false,
  },
];

export const ORG = { name: "Deccan Workers' Federation", short: 'D' };
export const ME = PERSONAS[0];

export type Post = PostCardProps & { id: string; tenantId?: string; mine?: boolean };
export const POSTS: Post[] = [
  { id: 'p1', tenantId: 'dwf', kind: 'official', pinned: true, mine: true, author: { name: 'Telangana State Committee' }, source: 'Telangana · All members', time: '2h', title: 'Statewide open session on revised shift rules', body: 'All members are invited on Saturday 18 October, 10:00 at Ravindra Bharathi. Bring your questions about the new overtime policy — committee members will be there to take them.', audience: { scope: 'region', label: 'Telangana' }, likes: 214, comments: 38 },
  { id: 'p2', tenantId: 'dwf', kind: 'member', mine: true, author: { name: 'Ravi Kumar' }, source: 'Hyderabad · IT Workers', time: '35m', body: 'Great turnout at today’s Hitech City meet-up. Notes and the sign-up sheet are in the group files.', media: 'photo · member meet-up', audience: { scope: 'group', label: 'IT Workers' }, likes: 48, comments: 6 },
  { id: 'p5', tenantId: 'dwf', kind: 'committee', mine: true, author: { name: 'Anita Desai', role: 'Secretary' }, source: 'Hyderabad IT Workers Committee', time: '5h', body: 'Draft agenda for Thursday is in the channel — please review by Wednesday.', audience: { scope: 'committee', label: '5 members' }, comments: 4 },
  { id: 'p3', tenantId: 'dwf', kind: 'official', author: { name: 'National Welfare Committee' }, source: 'India · All members', time: '1d', title: 'Health-cover enrolment closes 31 October', body: 'Check your dependants are listed in your profile before the deadline.', audience: { scope: 'org', label: 'All members' }, likes: 502, comments: 91 },
  { id: 'p4', tenantId: 'dwf', kind: 'member', mine: true, author: { name: 'Sameera Khan' }, source: 'Hyderabad · All members', time: '1d', body: 'Does anyone know if the Gachibowli office is open on the 2nd? Planning a volunteer table.', audience: { scope: 'local', label: 'Hyderabad' }, likes: 12, comments: 9 },
  // NEA Post (Proves Tenant Isolation)
  { id: 'p-nea-1', tenantId: 'nea', kind: 'official', pinned: true, author: { name: 'Karnataka Regional Council' }, source: 'Karnataka · All educators', time: '3h', title: 'Revised Academic Appraisal Guidelines Approved', body: 'The revised appraisal standards have been ratified after discussions with university vice-chancellors. Faculty members may review the draft in the Branch files.', audience: { scope: 'region', label: 'Karnataka' }, likes: 87, comments: 12 },
];

export const STORY_GROUPS = [
  { name: 'Hyderabad', unread: true }, { name: 'Telangana', unread: true }, { name: 'India' }, { name: 'IT Workers', unread: true }, { name: 'Women in Tech' },
];

export const GROUPS = [
  {
    section: 'Your places', note: 'Joined automatically from your registered location', items: [
      { id: 'hyd', name: 'Hyderabad', kind: 'City · 18,240 members', icon: 'building-2', unread: 4, tone: 'geo' as const },
      { id: 'tg', name: 'Telangana', kind: 'State · 96,500 members', icon: 'map-pin', unread: 2, tone: 'geo' as const },
      { id: 'in', name: 'India', kind: 'National · 412,000 members', icon: 'globe', tone: 'geo' as const },
    ]
  },
  {
    section: 'Functional groups', items: [
      { id: 'hyd-it', name: 'IT Workers · Hyderabad', kind: 'Functional group · 1,284 members', icon: 'briefcase', unread: 7, tone: 'group' as const },
      { id: 'tg-it', name: 'IT Workers · Telangana', kind: 'Functional group · 6,910 members', icon: 'briefcase', tone: 'group' as const },
    ]
  },
  {
    section: 'Committee channels', items: [
      { id: 'hyd-it-c', name: 'Hyderabad IT Workers Committee', kind: 'Private · you are Issue handler', icon: 'lock', tone: 'committee' as const },
    ]
  },
  {
    section: 'Communities', items: [
      { id: 'wit', name: 'Women in Tech', kind: 'Community · 640 members', icon: 'users-round', tone: 'geo' as const },
    ]
  },
];

export const NEA_GROUPS = [
  {
    section: 'Your places', note: 'Joined automatically from your registered location in Bangalore', items: [
      { id: 'nea-blr', name: 'Bangalore Central', kind: 'Branch · 12,800 members', icon: 'building-2', unread: 3, tone: 'geo' as const },
      { id: 'nea-ka', name: 'Karnataka', kind: 'Region · 42,000 members', icon: 'map-pin', unread: 1, tone: 'geo' as const },
      { id: 'nea-in', name: 'India', kind: 'National · 154,000 members', icon: 'globe', tone: 'geo' as const },
    ]
  },
  {
    section: 'Sectors & Departments', items: [
      { id: 'nea-he', name: 'Higher Ed Faculty', kind: 'Sector · 3,200 members', icon: 'briefcase', unread: 4, tone: 'group' as const },
      { id: 'nea-pri', name: 'Primary Educators', kind: 'Sector · 5,600 members', icon: 'briefcase', tone: 'group' as const },
    ]
  },
];

export interface Issue {
  id: string; tenantId?: string; title: string; status: IssueStatus; statusLabel?: string; level?: number;
  category: string; location: string; group?: string; committee: string;
  due?: string; dueState?: DueState; nextAction?: string; opened: string; stages: EscalationStage[];
}

export const ISSUES: Issue[] = [
  {
    id: 'CASE-2041', tenantId: 'dwf', title: 'Unpaid overtime for night-shift support staff', status: 'escalated', level: 2, category: 'Wages', location: 'Hyderabad', group: 'IT Workers', committee: 'Telangana IT Workers Committee', due: 'Update by 18 Oct', nextAction: 'State committee review', opened: '12 Sep',
    stages: [
      { name: 'Hyderabad IT Workers Committee', state: 'done', sub: 'City level', events: [{ time: '12 Sep', text: 'Submitted and routed' }, { time: '13 Sep', text: 'Acknowledged by committee' }, { time: '20 Sep', text: 'You added 2 payslips' }] },
      { name: 'Telangana IT Workers Committee', state: 'current', escalatedHere: true, levelShort: 'L2', sub: 'State level · reviewing', reason: 'Not resolved within the city committee’s 14-day window.', due: 'Update by 18 Oct', events: [{ time: '04 Oct', text: 'Escalated to state committee' }] },
      { name: 'National IT Workers Committee', state: 'upcoming', levelShort: 'L3', sub: 'Only if unresolved at state level' },
    ]
  },
  {
    id: 'CASE-1988', tenantId: 'dwf', title: 'Shift allowance missing from September pay', status: 'awaiting_member', statusLabel: 'Needs your reply', category: 'Wages', location: 'Hyderabad', group: 'IT Workers', committee: 'Hyderabad IT Workers Committee', due: 'Reply in 2 days', dueState: 'soon', nextAction: 'Send your September payslip', opened: '29 Sep',
    stages: [
      { name: 'Hyderabad IT Workers Committee', state: 'current', levelShort: 'L1', sub: 'City level · in progress', due: 'Reply in 2 days', dueState: 'soon', events: [{ time: '29 Sep', text: 'Submitted and routed' }, { time: '30 Sep', text: 'Assigned to a case handler' }, { time: '08 Oct', text: 'Committee asked for your September payslip' }] },
      { name: 'Telangana IT Workers Committee', state: 'upcoming', levelShort: 'L2', sub: 'State level' },
    ]
  },
  {
    id: 'CASE-1902', tenantId: 'dwf', title: 'Locker room closed without notice', status: 'closed', category: 'Facilities', location: 'Hyderabad', committee: 'Hyderabad General Committee', opened: '02 Aug',
    stages: [{ name: 'Hyderabad General Committee', state: 'done', sub: 'Resolved · employer reopened the facility', events: [{ time: '02 Aug', text: 'Submitted' }, { time: '19 Aug', text: 'Resolved — you confirmed' }] }]
  },
  // NEA Grievance (Proves Tenant Isolation)
  {
    id: 'GRV-102', tenantId: 'nea', title: 'Laboratory safety grant disbursement delayed', status: 'in_progress', level: 1, category: 'Facilities & Safety', location: 'Bangalore Central', group: 'Higher Ed Faculty', committee: 'Bangalore Educators Committee', due: '6d left', dueState: 'ok', nextAction: 'University registrar consultation', opened: '06 Oct',
    stages: [{ name: 'Bangalore Educators Committee', state: 'current', levelShort: 'L1', sub: 'Branch level', events: [{ time: '06 Oct', text: 'Submitted by Maya Sen' }, { time: '07 Oct', text: 'Assigned to Prof. Alok Gupta' }] }]
  },
];

export interface Notif { id: string; tenantId?: string; group: 'Today' | 'Earlier'; kind: NotificationKind; title: Rich; context?: string; time: string; unread?: boolean; mandatory?: boolean; href?: string }
export const NOTIFICATIONS: Notif[] = [
  { id: 'n1', tenantId: 'dwf', group: 'Today', kind: 'status', unread: true, title: ['There is an update to your case ', { b: 'CASE-1988' }], context: 'Issues', time: '2h', href: '/issue?id=CASE-1988' },
  { id: 'n2', tenantId: 'dwf', group: 'Today', kind: 'announcement', unread: true, title: [{ b: 'Telangana State Committee' }, ' posted an official announcement'], context: 'Telangana · All members', time: '2h', href: '/main' },
  { id: 'n3', tenantId: 'dwf', group: 'Today', kind: 'deadline', mandatory: true, unread: true, title: ['Response due on ', { b: 'CASE-2077' }, ' in 6 hours'], context: 'Assigned to you', time: '3h', href: '/manage/case?id=CASE-2077' },
  { id: 'n4', tenantId: 'dwf', group: 'Today', kind: 'reply', title: [{ b: 'Ravi Kumar' }, ' replied to your comment'], context: 'Hyderabad · IT Workers', time: '5h', href: '/main' },
  { id: 'n5', tenantId: 'dwf', group: 'Earlier', kind: 'escalation', title: ['Your case ', { b: 'CASE-2041' }, ' moved to the state committee'], context: 'Issues', time: '4 Oct', href: '/issue?id=CASE-2041' },
  { id: 'n6', tenantId: 'dwf', group: 'Earlier', kind: 'appointment', title: ['You were appointed ', { b: 'Issue handler' }, ', Hyderabad IT Workers Committee'], time: '14 Jun' },
  { id: 'n7', tenantId: 'dwf', group: 'Earlier', kind: 'security', mandatory: true, title: ['New sign-in on ', { b: 'Android · Pixel 8' }], context: 'Account', time: '1 Oct' },
  // NEA Notification
  { id: 'n-nea-1', tenantId: 'nea', group: 'Today', kind: 'announcement', unread: true, title: [{ b: 'Karnataka Regional Council' }, ' posted an official announcement'], context: 'Karnataka · All educators', time: '3h', href: '/main' },
];

export const REPS = [
  { name: 'Anita Desai', role: 'Secretary', committee: 'Hyderabad IT Workers', level: 1 as const },
  { name: 'Imran Sheikh', role: 'Chair', committee: 'Telangana IT Workers', level: 2 as const },
  { name: 'Joseph Mathew', role: 'Chair', committee: 'Hyderabad General', level: 1 as const },
];

export const TREE: OrgNode[] = [{
  id: 'in', name: 'India', type: 'country', kind: 'Country', meta: '412k', children: [
    { id: 'nat-it', name: 'National IT Workers Committee', type: 'committee', kind: 'Committee', meta: '5' },
    {
      id: 'tg', name: 'Telangana', type: 'state', kind: 'State', meta: '96.5k', children: [
        { id: 'tg-it', name: 'Telangana IT Workers Committee', type: 'committee', kind: 'Committee', meta: '5' },
        {
          id: 'hyd', name: 'Hyderabad', type: 'city', kind: 'City', you: true, meta: '18.2k', children: [
            { id: 'hyd-gen', name: 'Hyderabad General Committee', type: 'committee', kind: 'Committee', meta: '4' },
            {
              id: 'hyd-it', name: 'IT Workers', type: 'group', kind: 'Functional group', you: true, meta: '1,284', children: [
                { id: 'hyd-it-c', name: 'Hyderabad IT Workers Committee', type: 'committee', kind: 'Committee', meta: '5' }]
            },
            { id: 'hyd-tr', name: 'Transport Workers', type: 'group', kind: 'Functional group', meta: '932' }]
        },
        { id: 'wgl', name: 'Warangal', type: 'city', kind: 'City', meta: '7.1k' }]
    },
    { id: 'ka', name: 'Karnataka', type: 'state', kind: 'State', meta: '120k' }]
}];

/* ---------- Management (leadership) ---------- */
export interface Case {
  id: string; tenantId?: string; title: string; category: string; location: string; group: string; committee: string;
  assignee: string | null; status: IssueStatus; priority: 'normal' | 'high' | 'urgent'; age: string;
  due: string; dueState: DueState; level: 1 | 2 | 3; next: string; confidential?: boolean; reason?: string;
}
export const CASES: Case[] = [
  { id: 'CASE-2077', tenantId: 'dwf', title: 'No safety equipment on loading bay', category: 'Health & safety', location: 'Secunderabad', group: 'Transport Workers', committee: 'Hyderabad Transport Workers', assignee: 'Priya Nair', status: 'in_progress', priority: 'high', age: '9d', due: 'Overdue 6h', dueState: 'overdue', level: 1, next: 'Acknowledge employer response' },
  { id: 'CASE-2088', tenantId: 'dwf', title: 'Contract renewals withheld after complaint', category: 'Retaliation', location: 'Warangal', group: 'IT Workers', committee: 'Telangana IT Workers', assignee: null, status: 'triage', priority: 'urgent', age: '1d', due: '20h left', dueState: 'soon', level: 2, next: 'Assign handler', confidential: true },
  { id: 'CASE-2041', tenantId: 'dwf', title: 'Unpaid overtime for night-shift support staff', category: 'Wages', location: 'Hyderabad', group: 'IT Workers', committee: 'Telangana IT Workers', assignee: 'Imran Sheikh', status: 'escalated', priority: 'normal', age: '28d', due: '4d left', dueState: 'ok', level: 2, next: 'State review', reason: 'Resolution deadline missed at city level (auto-escalation).' },
  { id: 'CASE-1988', tenantId: 'dwf', title: 'Shift allowance missing from September pay', category: 'Wages', location: 'Hyderabad', group: 'IT Workers', committee: 'Hyderabad IT Workers', assignee: 'Anita Desai', status: 'awaiting_member', priority: 'normal', age: '11d', due: '2d left', dueState: 'soon', level: 1, next: 'Member payslip' },
  { id: 'CASE-2065', tenantId: 'dwf', title: 'Depot rest-room unusable since August', category: 'Facilities', location: 'Hyderabad', group: 'Transport Workers', committee: 'Hyderabad General', assignee: 'Joseph Mathew', status: 'acknowledged', priority: 'normal', age: '6d', due: '5d left', dueState: 'ok', level: 1, next: 'Site visit' },
  { id: 'CASE-2019', tenantId: 'dwf', title: 'Mandatory weekend shifts without notice', category: 'Working hours', location: 'Karimnagar', group: 'IT Workers', committee: 'Telangana IT Workers', assignee: 'Lakshmi Rao', status: 'resolved', priority: 'normal', age: '19d', due: '—', dueState: 'ok', level: 2, next: 'Member confirmation' },
  // NEA Case
  { id: 'GRV-102', tenantId: 'nea', title: 'Laboratory safety grant disbursement delayed', category: 'Facilities & Safety', location: 'Bangalore Central', group: 'Higher Ed Faculty', committee: 'Bangalore Educators Committee', assignee: 'Prof. Alok Gupta', status: 'in_progress', priority: 'normal', age: '4d', due: '6d left', dueState: 'ok', level: 1, next: 'University registrar consultation' },
];

export const HANDLERS = [
  { name: 'Anita Desai', note: 'Issue handler · 4 open' },
  { name: 'Imran Sheikh', note: 'Chair · 6 open' },
  { name: 'Lakshmi Rao', note: 'Issue handler · 3 open' },
  { name: 'Priya Nair', note: 'Issue handler · 2 open' },
];

export type MemberStatus = 'active' | 'suspended' | 'pending';
export interface CommitteeMember { name: string; role: string; since: string; method: string; status: MemberStatus; override?: boolean; overrideReason?: string }
export const COMMITTEE = {
  name: 'Hyderabad IT Workers Committee', scope: 'Hyderabad · IT Workers', level: 1 as const, method: 'Nomination & approval', term: 'Apr 2026 – Mar 2028',
  members: [
    { name: 'Ravi Kumar', role: 'Chair', since: '01 Apr 2026', method: 'Elected', status: 'active' },
    { name: 'Anita Desai', role: 'Secretary', since: '01 Apr 2026', method: 'Nominated · approved by State Exec', status: 'active' },
    { name: 'Priya Nair', role: 'Issue handler', since: '14 Jun 2026', method: 'Appointed by Chair', status: 'active' },
    { name: 'Vikram Reddy', role: 'Member', since: '01 Apr 2026', method: 'Elected', status: 'suspended' },
    { name: 'Farah Ali', role: 'Member', since: 'Pending', method: 'Nominated · awaiting approval', status: 'pending' },
  ] as CommitteeMember[],
  responsibilities: [
    ['Handles', 'Wages, Working hours, Health & safety — IT Workers in Hyderabad'],
    ['Escalates to', 'Telangana IT Workers Committee after 14 days'],
    ['Can publish to', 'Hyderabad · IT Workers (push needs Chair)'],
  ],
  audit: [
    { time: '08 Oct', text: 'Lakshmi Rao (State admin) suspended Vikram Reddy — “Conflict of interest under review”' },
    { time: '02 Oct', text: 'Ravi Kumar nominated Farah Ali as Member' },
    { time: '14 Jun', text: 'Ravi Kumar appointed Priya Nair as Issue handler' },
  ],
};

export const AUDIENCES: [string, number][] = [
  ['Hyderabad · IT Workers', 1284], ['Hyderabad · All members', 18240], ['Telangana · IT Workers', 6910], ['Telangana · All members', 96500],
];

export interface AuditEntry {
  id: string;
  time: string;
  actor: string;
  action: string;
  entityId: string;
  details: string;
  isOverride?: boolean;
}

export const INITIAL_AUDIT_LOG: AuditEntry[] = [
  { id: 'aud-1', time: '10 Oct 14:22', actor: 'Dr. Vikram Patel (Super Admin)', action: 'Platform Super Admin Override', entityId: 'hyd-it-c', details: 'Assigned Sameera Khan as Member with Platform Admin Override flag (Emergency quorum)', isOverride: true },
  { id: 'aud-2', time: '08 Oct 14:20', actor: 'Lakshmi Rao (State Admin)', action: 'Suspend Member', entityId: 'cm-4', details: 'Suspended Vikram Reddy — "Conflict of interest under review"' },
  { id: 'aud-3', time: '04 Oct 10:15', actor: 'System SLA Watcher', action: 'Auto-Escalate Case', entityId: 'CASE-2041', details: 'Escalated from L1 to L2 after 14-day SLA expiry' },
  { id: 'aud-4', time: '02 Oct 09:05', actor: 'Ravi Kumar', action: 'Nominate Member', entityId: 'cm-5', details: 'Nominated Farah Ali as Member' },
];

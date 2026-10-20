# Product Requirements Document (PRD)
## Multi-Tenant Organization, Membership, Community, and Issue Management Platform

**Document status:** Approved — updated for Postal Union branding, 12 Affiliated Associations, Employee ID identity model, cascading hierarchy, role-gated chat matrix, and reactive layout design  
**Version:** 1.3  
**Date:** 20 October 2026

---

## 1. Product Overview

### 1.1 Summary

Build a web-first, domain-agnostic platform that enables independent organizations—such as associations, federations, professional networks, unions, clubs, or other member-based bodies—to manage members, configurable organizational structures, functional groups, committees, internal communications, communities, and issues in one place. The product must use generic internal concepts and allow each organization to configure the labels shown in its own interface.

The product combines:
- Member registration and directory management.
- A geographic hierarchy, such as Country → State/Province → City/District.
- Multiple functional groups within each geographic unit.
- Dedicated committees for functional groups at different geographic levels.
- An Instagram-inspired social feed for posts, official announcements, comments, reactions, and group discussions.
- Audience-targeted push notifications for authorized committee and organization leaders.
- Separate issue/case workspace for complaints, assignments, deadlines, and hierarchical escalation; issues are not automatically published as social posts.
- A Microsoft Teams-style organizational chart.
- Strict separation between independent organizations using the same platform.

### 1.2 Product Vision

Give every organization a digital home that reflects its own governance model, helps members communicate with the right people, and ensures issues reach accountable representatives and are followed through to resolution. The platform must not assume that all organizations use the same titles, geographic levels, group types, or appointment rules.

### 1.3 Core Product Principle

**Geography determines jurisdiction. Functional groups determine functional or member grouping. Committees determine responsibility and authority. Permissions determine access. Issues follow a configured resolution workflow.**

These concepts must remain separate in the data model and user experience.

---

## 2. Problem Statement

Organizations may manage member information in spreadsheets, communicate across fragmented messaging groups, maintain unclear organizational charts, and handle complaints through informal channels. This makes it difficult to:
- Keep membership records accurate.
- Understand who represents a member.
- Coordinate committees across cities, states, and countries.
- Give members relevant discussions without exposing private committee conversations.
- Route complaints to the correct functional group committee.
- Track deadlines, accountability, and escalations.
- Measure unresolved issues across organizational levels.

The platform should provide one structured system for these activities.

---

## 3. Goals and Non-Goals

### 3.1 Goals

1. Support multiple independent organizations on a shared platform.
2. Provide each organization with its own members, structure, settings, committees, content, and issue workflows.
3. Map members to their geographic units and eligible functional groups.
4. Allow each city, state/province, country, or other configured unit to contain multiple functional groups.
5. Allow each functional group at a geographic level to have a committee with configurable membership, roles, and responsibilities.
6. Provide geographic groups and functional group-specific communication spaces.
7. Show the organizational chart and relevant representatives.
8. Route complaints to the appropriate committee and escalate overdue or unresolved cases.
9. Provide dashboards appropriate to each user's role and jurisdiction.
10. Protect member data, private conversations, and sensitive complaints through access control and auditability.

### 3.2 Non-Goals for the Initial Release

- Payments, organization dues collection, or accounting.
- Full-featured elections, voting, or formal digital ballots in the MVP; the governance model must be extensible to support them later.
- Full video conferencing.
- A public social network spanning independent organizations.
- Automated legal advice or automatic adjudication of complaints.
- AI-based complaint decisions. Any future AI assistance should be advisory and subject to human review.
- Complex analytics beyond basic operational dashboards.

---

## 4. Core Domain Model

The system must not model the organization as one simple tree. It has a geographic hierarchy, functional groups associated with geographic units, committees, memberships, communities, and workflows.

### 4.1 Organization / Tenant

A tenant represents one independent organization using the platform. The tenant is the primary data-isolation boundary.

Each tenant has its own:
- Members and member profiles.
- Geographic structure.
- Functional groups and committees.
- Roles and permissions.
- Feeds, groups, chats, and announcements.
- Complaints, assignments, and escalation policies.
- Administrators, configuration, and audit records.

**Tenant isolation is mandatory.** Users from Organization A must not see Organization B's private members, content, complaints, or organizational data unless a future, explicit cross-organization feature is designed and authorized.

A person may independently hold membership in multiple organizations, but each membership and its permissions must be separate.

### 4.2 Geographic Organization

An organization can configure geographic levels such as:

`Organization → Country → State/Province → City/District → Local Unit`

The exact levels and names must be configurable to support organizations operating in different countries or using different administrative structures.

Each geographic unit should have:
- Name and unique identifier.
- Unit type and parent unit.
- Status (active/inactive).
- Assigned leaders and authorized administrators.
- Functional groups and committees operating within its jurisdiction.
- Membership and activity summaries, subject to permissions.

### 4.3 Functional Groups

A functional group is a functional, professional, demographic, or other organization-defined grouping, such as IT Workers, Transport Workers, Youth, or Welfare.

Requirements:
- A geographic unit can contain multiple functional groups.
- The same functional group type can exist in multiple cities, states/provinces, and countries.
- functional group membership and functional group committee appointments are distinct.
- A member may belong to multiple functional groups if organization policy permits.
- functional groups can have their own feeds, discussions, announcements, member lists, issue queues, and committees.
- Functional-group scope and eligibility rules must be configurable.
- A functional group may be local-only or have corresponding committees at higher geographic levels.

### 4.4 Committees

A committee is a team responsible for a geographic unit, functional group, or organization-wide function.

Examples:
- Hyderabad IT Workers Committee.
- Telangana IT Workers Committee.
- National IT Workers Committee.
- Hyderabad General Committee.
- National Welfare Committee.

Requirements:
- A committee belongs to a tenant and has a defined scope.
- A committee may be associated with a geographic unit, a functional group, or both.
- Committee size must be configurable; 3–5 members is a common starting point, not a hard-coded limit.
- Committee roles may include chair/president, secretary, member, issue handler, and other configurable roles.
- Committee members can have different permissions.
- A person can serve on multiple committees, subject to policy.
- Committee membership does not automatically grant access to all content or complaints in the geographic area.
- Committee responsibilities and escalation destinations must be configurable.
- The system must support cross-functional group or general committees for issues that do not belong to one specific functional group.

### 4.5 Governance and Committee Formation

The platform provides governance mechanisms; each organization defines its normal governance policy. The platform must not assume that a title or organizational level inherently grants appointment authority.

#### Formation methods

Each organization can configure one or more methods for creating committees and filling positions:
- **Appointment:** an authorized person assigns a member to a position.
- **Nomination and approval:** one person nominates a candidate and an authorized person or body approves or rejects the nomination.
- **Election:** eligible members vote according to configurable election rules. Full digital elections may be delivered after the MVP, but the data model must support this future capability.
- **Eligibility-based selection:** a rule selects or recommends eligible members, with any required human approval.

#### Authority and delegation

- Appointment authority must be explicitly configured by organization, organizational scope, committee type, and action.
- Authority may be delegated to specified roles or people for a defined scope and period.
- A local administrator may manage only committees within their delegated scope.
- Higher-level leadership does not automatically gain authority over every lower-level committee unless the organization's policy grants it.
- **Platform Super Admin is the exception:** the platform-level administrator can assign, replace, suspend, reinstate, and remove committee members at any level in any organization, regardless of that organization's normal appointment workflow. These actions must be explicitly identified as platform-admin actions or overrides, not misrepresented as organization-approved appointments.

#### Appointment record and lifecycle

Every appointment must record at least:
- Organization, committee, organizational scope, position, and appointed person.
- Formation method (appointment, nomination/approval, election, or eligibility-based selection).
- Initiator, approver, and/or appointing authority, as applicable.
- Effective start date and optional end date.
- Status: pending, active, suspended, expired, revoked, or replaced.
- Permissions granted by the position and their scope.
- Reason, timestamp, and audit history for material changes, especially overrides and removals.

The system must support terms, renewals, vacancies, succession, replacement, suspension, and revocation. When an appointment ends or is revoked, its appointment-derived permissions must be removed promptly while historical records remain available to authorized auditors. A person's committee appointment is separate from their general membership and functional-group membership.

### 4.6 Member

A member profile contains:
- Member ID (e.g. `TU-0001`, `TU-0101`).
- Employee ID (Department of Posts Staff Number, e.g. `10125634`).
- Union Designation (e.g. `Founding President`, `President`, `Division Secretary`, `Circle Secretary`, `Treasurer`, `Vice President`, `Member`).
- Affiliated Association and Category (e.g. `Supervisors`, `Postman & MTS`, `GDS`, `RMS & MMS`, `Civil Wing`, `Group ‘C’`, etc.).
- Name, mobile number, and optional email address.
- Date of Birth (ISO formatted `YYYY-MM-DD`).
- Office Employed (e.g. `Sitaphalmandi SO`, `Secunderabad HPO`).
- Division ($L_1$) and Circle ($L_2$).
- Verification and membership status (`verified`, `pending`, `suspended`, `rejected`, `ended`).
- Committee appointments and organizational roles (`member`, `org_admin`, `membership_admin`, `moderator`).
- Privacy and notification preferences.

**Governance & Immutability Rules:**
1. **Self-Modification Restrictions:** Ordinary members cannot self-modify `employee_id`, `designation`, or `category`. These fields are strictly locked in member profiles to prevent unauthorized leadership rank elevation or identity spoofing. Only Organization Administrators can alter or verify these governance attributes.
2. **Workplace Transfer Updates:** Members may update their `office_employed`, `division`, and `circle` (e.g. upon postal workplace transfer). Updating the workplace automatically synchronizes the member's active tier channels and recalculates geographic Row Level Security.
### 4.7 Communities and Groups

Groups provide communication spaces and are separate from committees.

Supported group and channel types:
1. **Division Association Channel (Local Workplace Tier — $D_A, D_B, D_C$):**
   - e.g. `Secunderabad · Supervisors`.
   - Formed dynamically from the member's Division ($L_1$) and Affiliated Association Category.
   - **Access Matrix:** All verified members in that division and category have unrestricted read & chat access. This is their daily workplace communication hub.
2. **Circle Channel (Intermediate Tier — $C_{ABC}$):**
   - e.g. `Telangana Circle`.
   - Encompasses all pooled postal employees across all divisions in that state/circle.
   - **Access Matrix:** Read-only for regular members. Division committee heads (Chairs, Secretaries, Handlers) and Circle office bearers can post messages and coordinate regional matters.
3. **All-India Union Channel (Apex / Federation Tier):**
   - e.g. `All India Bharatiya Postal Employees Union`.
   - Encompasses the nationwide postal workforce.
   - **Access Matrix:** Read-only for regular members and division heads. Circle leaders and National Executive officers can post resolutions and official broadcasts.
4. **Committee Private Deliberation Rooms:**
   - Case handlers and committee leadership rooms gated by active appointment.
### 4.8 Tags

Tags describe attributes or help classify members, content, and issues. Examples include profession, employer, membership type, or issue category.

Requirements:
- Tags must not themselves grant administrative authority.
- Sensitive tags must have restricted assignment and visibility.
- Tags may assist filtering, community eligibility, and issue routing.
- Tag-based rules must be explicit, reviewable, and auditable.

---

## 5. User Roles

A user can hold more than one role. Permissions should be calculated from assigned roles, scope, committee membership, and explicit access grants.

### 5.1 Visitor / Applicant
- View public organization information if the organization enables it.
- Register or apply for membership.
- Track their own application.

### 5.2 Regular Member
- View and participate in permitted geographic and functional-group spaces.
- View the permitted member directory and organizational chart.
- Post, comment, react, and chat where authorized.
- Join eligible communities.
- Raise complaints and track their own cases.
- Reply to requests for information and provide feedback on resolutions.
- Cannot access private committee channels or unrelated confidential complaints by default.

### 5.3 functional group Committee Member / Issue Handler
- View authorized functional group information and committee discussions.
- View the committee's issue queue as permitted.
- Claim or receive assigned cases.
- Request information, record actions, and propose or record resolutions within granted permissions.
- Escalate cases with a reason.
- Cannot access unrelated committees' private cases merely because they are a committee member.

### 5.4 functional group Committee Head
- Assign and reassign issues within their committee's scope.
- Monitor workload, deadlines, and overdue cases.
- Review case actions and resolutions.
- Manage authorized committee discussions and announcements.
- Escalate unresolved cases to the configured next level.

### 5.5 Local / Unit Leadership
- View authorized city-wide information and dashboards.
- Manage designated local committees and their appointments.
- Coordinate cross-functional group or city-wide issues within their jurisdiction.
- View cases escalated to them or otherwise within their authorized remit.
- Do not automatically gain access to every private conversation or confidential complaint.

### 5.6 Regional Leadership
- View state/province-level dashboards and organizational structure.
- Coordinate city units and committees.
- Handle cross-city cases and cases escalated to state/provincial level.
- Manage authorized state/provincial committees.
- Do not automatically see every un-escalated local complaint.

### 5.7 National / Organization-Wide Leadership
- View national/country-level dashboards and committees.
- Coordinate state/provincial organizations.
- Handle national or cross-state cases and authorized escalations.
- Publish official national announcements and policies.
- Access only the private content and cases permitted by role and policy.

### 5.8 Membership / Data Administrator
- Verify registrations and membership records.
- Handle duplicates, membership status, and approved geographic transfers.
- Manage member data only within the administrator's assigned scope.
- Does not automatically gain access to confidential case discussions.

### 5.9 Community Moderator
- Moderate posts and comments in assigned groups.
- Review reports, remove content under policy, and lock discussions when authorized.
- Does not gain complaint-resolution authority solely by being a moderator.

### 5.10 Organization Admin
- Configure the organization's geographic structure, functional groups, committees, roles, communities, and policies.
- Assign authorized organization-level administrators.
- Configure complaint categories, routing, escalation deadlines, and notification settings.
- Review audit records within permitted scope.

### 5.11 Platform Super Admin

The Platform Super Admin is the highest-privilege operational role and can perform all platform operations across all tenants. This includes direct committee management at every organizational level.

- Create, configure, suspend, restore, and decommission organizations, subject to retention and recovery safeguards.
- View and manage organization structures, members, functional groups, committees, positions, policies, and configuration across all organizations.
- Assign, replace, suspend, reinstate, and remove committee members at any level in any organization, including local, regional, national, cross-functional, and organization-wide committees.
- Create committees and positions, correct erroneous assignments, and override a normal appointment workflow when necessary.
- Manage platform users, platform roles, security settings, integrations, operational configuration, and incident recovery.
- Investigate and resolve stuck workflows and other platform failures.
- Access sensitive records only when necessary for a legitimate support, security, or operational purpose, using explicit privileged-access controls.

**Mandatory safeguards:** every privileged change must record the administrator, tenant, affected entity, action, timestamp, and reason. Committee assignment changes must be marked as platform-admin assignments/overrides and must not falsely imply that the organization's normal appointment or election process occurred. Require strong authentication (MFA), protect against accidental removal of the last active Platform Super Admin, and provide audit review. The Platform Super Admin's technical authority does not silently change an organization's governance policy or erase the provenance of prior decisions.

---

## 6. Registration and Onboarding

### 6.1 Member Registration Flow

1. User verifies mobile number via Supabase Auth Phone OTP (Twilio integration).
2. User enters organization invite code (e.g. `TU`).
3. User enters full name and optional work email.
4. User completes Postal Identity & Workplace onboarding:
   - **Employee ID:** Staff number issued by Department of Posts.
   - **Union Designation:** Selects leadership post (`President`, `Division Secretary`, `Treasurer`, `Member`, etc.).
   - **Affiliated Association:** Selects from the 12 configured postal trade associations (two-tier display: full official name + concise Category chip).
   - **Date of Birth:** Entered via direct text or interactive calendar picker sheet.
   - **Circle ($L_2$) & Division ($L_1$):** Selectable cascading dropdowns (choosing Circle filters available Divisions, or detected automatically via device GPS).
   - **Office Employed:** Dynamically preloads Sub-Offices (SO), Head Post Offices (HPO), and Branch Offices (BO) for the chosen Division, with live search filtering and custom office entry.
5. **Approval Routing & Leadership Gate:**
   - If applicant selects baseline designation `'Member'`, membership status evaluates according to `autoApproveMembers` policy (`verified` if enabled, `pending` if disabled).
   - If applicant claims any leadership designation other than `'Member'` (e.g. `President`, `Division Secretary`, `Treasurer`), the application is **strictly held in `'pending'` review**, requiring explicit verification by higher union leadership regardless of automatic approval settings.
### 6.2 Membership Changes

- Authorized administrators can approve, reject, suspend, reactivate, or end membership.
- Geographic transfers must update relevant group eligibility and committee jurisdiction without deleting historical records.
- Functional-group membership changes must preserve the audit history.
- Committee appointments must have effective dates and may be revoked independently of general membership.
- Pending or suspended members must have explicitly defined access limitations.

---

## 7. Member Experience and Navigation

The interface should feel familiar to users of social/community applications while preserving clear organizational structure.

### 7.1 Primary Navigation

1. **Home** — Instagram-inspired feed of permitted posts, official announcements, and explicitly approved public updates.
2. **Groups** — City, State/Province, Country/National, functional groups, committees, and other permitted communities.
3. **Issues** — raise an issue, track own cases, and view assigned cases if the user is an authorized handler.
4. **Notifications** — push and in-app notifications for announcements, replies, mentions, assignments, deadlines, and escalations.
5. **Organization** — interactive organizational chart, committees, leaders, and representatives.
6. **Profile** — member information, geographic mapping, functional group memberships, privacy, and notification preferences.
7. **Management** — shown only to users with relevant administrative or leadership permissions.

### 7.2 Geographic Groups

- Every approved member should be mapped to the applicable the configured local, regional, and national (or equivalent) groups where those levels exist.
- These memberships should be system-managed rather than requiring manual joining.
- The home feed may combine content from these groups, but users should be able to filter by organization, geographic scope, functional group, and official announcements.
- Provide clear feed filters such as **For You / Relevant**, **Following or My Groups**, and **Announcements**; the exact labels may be configurable.
- Posts should be chronologically ordered by default or use a transparent, simple relevance ranking; do not optimize for engagement at the expense of important official notices.
- Reading or posting in each group is governed by that group's permissions.
- The platform should not assume that every national group is fully public to every member.

### 7.3 functional group Groups

- Members see functional-group spaces they belong to or are otherwise authorized to access.
- Functional-group spaces are scoped to the relevant geographic unit and organization.
- functional group members can discuss functional group-specific matters.
- Committee-private channels remain separate from general functional group discussions.
- Cross-functional group communities may be supported without merging the underlying committees.

### 7.4 Organization Chart

- Display the geographic hierarchy and relevant committee structures.
- Show a member's applicable representatives and reporting/escalation route.
- Allow authorized users to expand geographic units and inspect committee membership.
- Clearly distinguish a geographic parent-child relationship from functional group membership and committee appointment.
- Do not imply that every committee is the direct manager of every member.
- Hide restricted personal information and roles based on permissions.

---

## 8. Posts, Chat, and Announcements

### 8.1 Social Feed, Posts, and Discussions

The feed should feel familiar to users of social/community applications such as Instagram, while remaining focused on organization-related communication rather than unrestricted public social networking.

- Authorized users can create text and media posts in permitted groups or organization-wide channels.
- Support comments, reactions, optional sharing/reposting, content reporting, and moderation.
- Each post displays its author, source organization/group, timestamp, and visibility/audience label.
- Support pinned posts and an official-announcement visual treatment distinct from ordinary member posts.
- Support feed filtering by relevant groups and announcements. Feed ranking must not suppress urgent or pinned official announcements.
- Posts and comments must respect tenant, group, membership, and moderation permissions on every read and write.
- Editing, deletion, retention, and moderation policies are configurable and audited where appropriate.
- The home feed must not become a list of every complaint or every internal case event.

### 8.2 Chat

- **Default Chat View:** Tapping any channel from the Groups screen opens directly to the active live **Chat** stream by default (with an optional tab toggle for **Posts**).
- **Loading State:** Displays an animated loading spinner with *"Loading messages…"* while fetching channel history from Supabase, eliminating false empty-state flickers.
- **Optimistic Messaging:** When sending a message, the bubble renders immediately on screen with a *"Just now"* timestamp, reverting gracefully if network transport fails.
- **Role-Gated Permissions:** Chat posting permissions are strictly enforced server-side via `can_write_group_message()` definer function and PostgreSQL RLS:
  - Local Division Association Channel: Read & Write for all verified division category members.
  - Circle Channel: Read-Only for members; Write-enabled for division heads and circle leaders.
  - All-India Union Channel: Read-Only for members; Write-enabled for circle chairs and central executives.
### 8.3 Official Announcements and Audience Targeting

- Authorized committee leaders and organization leaders can publish official announcements only within their permitted scope.
- At publish time, the author can choose an eligible audience, such as a committee, functional group, geographic unit, multiple explicitly authorized groups, or the whole organization if permitted.
- The interface must show an audience preview/count before publishing where practical, and prevent authors from targeting members outside their authority.
- Provide a **Notify audience** option. Routine posts can enter the feed without a push notification; important announcements can trigger push notifications.
- Support pinned announcements, optional expiry dates, and configurable distribution from higher-level groups to lower-level groups.
- Store the publication and audience decision as auditable records, including the publisher, tenant, audience rule, and time.
- A notification opens the relevant post in the app through a deep link and still re-checks authorization when opened.

---

## 9. Complaint and Issue Management

Complaints are structured workflow records, not ordinary social posts. The Issues workspace is separate from the social feed. A case may produce a separate public/community update only when an authorized person explicitly publishes a privacy-reviewed, sanitized update. Escalation events must not automatically create feed posts.

### 9.1 Create an Issue

The member provides:
- Title and description.
- Category and optional subcategory.
- Location/geographic scope.
- Relevant functional group, if known.
- Employer, organization, or other relevant entity if applicable.
- Priority or urgency, subject to policy.
- Supporting documents, images, or other permitted attachments.
- Whether the issue affects only the member or additional members, where appropriate.

The member should not need to know the responsible committee. The routing engine should identify it from configured rules.

### 9.2 Routing Rules

Routing may consider:
- Tenant/organization.
- Geographic location and jurisdiction.
- functional group or functional responsibility.
- Complaint category.
- Committee responsibilities.
- Confidentiality or sensitivity requirements.
- Severity and configured exceptions.

Rules must be configurable, transparent to authorized administrators, and auditable. Tags can help route a case but must not independently grant access to it.

If no suitable committee is found, the case should enter a designated triage queue rather than being silently lost.

### 9.3 Issue Lifecycle

Suggested statuses:
- Submitted.
- Awaiting Triage.
- Assigned.
- Acknowledged.
- In Progress.
- Awaiting Member Information.
- Awaiting External Action.
- Resolved — Awaiting Confirmation.
- Closed.
- Reopened.
- Escalated.
- Rejected / Out of Scope, with a recorded reason.

The organization may configure additional statuses, but status transitions should be controlled.

### 9.4 Committee Issue Queue

Each committee's queue should display:
- Issue ID, title, category, and location.
- functional group and responsible committee.
- Current assignee.
- Status, priority, and age.
- Next deadline and overdue indicator.
- Escalation level and history.
- Last activity and required next action.

Authorized committee members can claim or be assigned cases. Assignment, reassignment, status changes, notes, and resolution actions must be recorded.

### 9.5 Escalation Model

Example for an IT Workers complaint:
1. Hyderabad IT Workers Committee.
2. Telangana IT Workers Committee.
3. National IT Workers Committee.

The exact chain is configured by the organization and may vary by functional group, geography, complaint category, or severity.

Requirements:
- Each stage has configurable response and resolution deadlines.
- Notify the assignee and committee head before or when a deadline is missed.
- Escalate automatically according to the configured policy.
- Allow authorized manual escalation with a reason.
- Include the complaint, attachments, timeline, previous actions, and escalation reason in the next-level view.
- Prevent duplicate or conflicting escalations.
- Support reassignments and cases that need a cross-functional group or general committee.
- Support urgent/confidential routes that bypass ordinary levels when authorized.
- Keep the original complaint linked to all escalation events.
- Record when an issue is resolved, reopened, or closed and by whom.

A missed deadline should trigger the configured escalation policy, not erase the current assignee's accountability. Policies may notify a higher level, transfer ownership, or both.

### 9.6 Member Visibility

Members should be able to:
- See their own complaints and permitted shared cases.
- Track status and the next expected action.
- Reply to information requests and attach additional evidence.
- Receive status-change and escalation notifications.
- See a suitable resolution summary.
- Request review or reopen a case according to policy.

Members must not see internal notes, other members' personal information, or confidential evidence unless explicitly authorized.

### 9.7 Complaint Privacy

- Complaints are private by default.
- Access is limited to the complainant, assigned handlers, authorized committee members, and permitted oversight roles.
- Sensitive complaint categories may use restricted handlers or direct escalation.
- Attachments must follow the same access rules as the complaint.
- Case access and exports must be auditable.
- If multiple members report a common issue, the system may link related cases while preserving each complainant's privacy.

---

## 10. Dashboards

### 10.1 Member Dashboard

- Feed from permitted geographic and functional-group spaces.
- Official announcements.
- My groups and communities.
- My complaints and their status.
- Notifications and upcoming relevant events.
- Link to representatives and the organization chart.

### 10.2 functional group Committee Dashboard

- functional group membership and committee details.
- Committee feed and private discussions.
- New, assigned, overdue, and escalated issues.
- Workload by handler.
- Upcoming deadlines and recent actions.
- Basic statistics within the committee's scope.

### 10.3 Local / Unit Leadership Dashboard

- Member and functional group summaries within the city/local jurisdiction.
- Committee directory and appointments.
- Cross-functional group or city-wide activity.
- Issues assigned to or escalated to city leadership.
- Overdue cases and escalation trends.
- No default access to unrelated private committee conversations.

### 10.4 Regional Leadership Dashboard

- Geographic organization chart and city-unit summaries.
- State-level committees and functional group coverage.
- Cross-city cases and authorized escalations.
- Overdue and critical issue summaries.
- Comparative workload and resolution metrics, subject to permissions.

### 10.5 National / Organization-Wide Dashboard

- Country/national organization structure.
- State/province and functional group summaries.
- National and cross-region cases.
- Issues escalated to national committees.
- High-level membership and resolution metrics.
- No automatic unrestricted access to every private conversation or un-escalated complaint.

### 10.6 Organization Admin Dashboard

- Membership approvals and status.
- Geographic units, functional groups, committees, and role assignments.
- Configuration of routing, escalation, and visibility policies.
- Audit events and operational summaries.

---

## 11. Notifications

Support in-app notifications and mobile push notifications for Android and iOS. Email and SMS can be added as optional channels according to tenant configuration.

### 11.1 Notification Events

Events may include:
- New official announcement published to an eligible audience, when **Notify audience** is selected.
- Mentions, replies, and relevant group activity according to user preferences.
- Committee invitations, appointments, replacements, suspensions, or removals.
- New complaint assignment or reassignment.
- Request for information and member response reminders.
- Complaint status change, resolution, closure, or reopening.
- Upcoming deadline, overdue case, manual escalation, or automatic escalation.
- Security-sensitive account and membership events.

### 11.2 Audience and Delivery Rules

- Resolve recipients on the server from current tenant membership, geographic scope, functional-group membership, committee appointments, audience selection, notification preferences, and access policy. Never trust a recipient list supplied by the mobile client.
- Organization-wide announcements notify only eligible members of that organization. A regional announcement targets the relevant region; a functional-group announcement targets eligible members of that group; a private committee message targets authorized participants only.
- Complaint notifications go only to the complainant and authorized case participants as appropriate. They must not reveal the existence or content of a confidential case to unrelated members.
- Use a durable queue/background processing for large audiences, with batching, retry, idempotency, rate-limit handling, and delivery/failure tracking.
- Store an in-app notification record even when push delivery fails where the event warrants it. Push delivery is best-effort; in-app state is the durable notification record.
- Deep links must open the intended screen and re-check authorization on the server. A push token or notification payload must never act as authorization.
- Avoid sensitive complaint details, evidence, private messages, or personal data in lock-screen notification text. Use generic text such as “There is an update to your case.”
- Handle device-token registration, token rotation, logout, revoked sessions, and multiple devices per member.

### 11.3 Preferences and Priority

- Members can manage non-critical categories such as routine posts, comments, and group activity, including quiet hours where supported.
- Organizations can define which security, assignment, urgent, or case-workflow notifications are mandatory.
- Do not send a push for every ordinary post by default. Leaders explicitly select **Notify audience** for announcements that warrant a push, subject to rate limits and policy.
- Avoid duplicate notifications when a member belongs to multiple targeted groups; deduplicate by event and recipient.

### 11.4 Implementation Direction

For an Expo-based mobile app, evaluate Expo Push Notifications with APNs for iOS and FCM for Android. Keep provider integration behind a notification service abstraction so providers can be changed without rewriting business logic. Delivery receipts and provider errors should be monitored.

---

## 12. Permissions and Security

### 12.1 Authorization

Use role-based access control combined with scope-aware rules:
- Tenant/organization scope.
- Geographic jurisdiction.
- functional group membership.
- Committee membership.
- Content or case assignment.
- Explicit access grants and confidentiality classification.

A senior title alone should not provide unrestricted access to all data. The system must distinguish visibility, participation, management, and resolution authority. Platform Super Admin is a separately defined platform-wide role with explicit cross-tenant capabilities; its actions are still authenticated, reasoned where sensitive, and audited. Tenant-scoped roles must never acquire platform-wide permissions by inheritance.

### 12.2 Tenant Isolation

- All organization-owned records must be associated with a tenant, including committee appointments, appointment history, governance policies, and audit events.
- Server-side authorization must enforce tenant boundaries for every request.
- Queries, search, notifications, file downloads, exports, and background jobs must preserve tenant isolation.
- Cross-tenant access must be denied by default and covered by automated tests.

### 12.3 Data Protection

- Encrypt data in transit and at rest where supported.
- Store passwords using a secure password-hashing scheme or use a trusted identity provider.
- Enforce secure sessions, account recovery, and optional multi-factor authentication.
- Validate file uploads and restrict attachment access.
- Apply rate limits and protections against common web attacks.
- Define data retention, export, correction, and deletion procedures.
- Collect only the personal data required for the organization's purposes.

### 12.4 Audit Logs

Record relevant events such as:
- Member verification and status changes.
- Role and committee appointment changes, including Platform Super Admin assignments, overrides, suspensions, replacements, and removals.
- Access-policy changes.
- Complaint views where required for sensitive cases.
- Assignments, status transitions, notes, resolutions, and escalations.
- Administrative exports and configuration changes.

Audit records should be tamper-resistant to the extent practical and available only to authorized reviewers.

---

## 13. Search and Discovery

- Search members within the user's permitted directory scope.
- Filter members by geographic unit, functional group, committee role, and approved tags.
- Search posts and announcements within accessible groups.
- Search complaints only within the user's authorized cases and queues.
- Provide filters for status, assignee, category, location, functional group, priority, and age.
- Ensure search results never reveal the existence or details of unauthorized private records.

---

## 14. Non-Functional Requirements

### 14.1 Scalability
- Support multiple organizations with different organizational sizes and structures.
- Support large member directories and high-volume discussion feeds.
- Avoid assumptions that each city has only one functional group or that each committee has a fixed number of members.

### 14.2 Reliability
- Prevent complaints and escalation events from being silently lost.
- Use durable processing for deadline and notification workflows.
- Make background actions retryable and idempotent where appropriate.
- Maintain backups and test restoration procedures.

### 14.3 Performance
Initial targets to validate:
- Common feed and profile requests should typically load within 2 seconds under expected load.
- Common directory searches should typically return within 2 seconds.
- Complaint creation and assignment should provide prompt confirmation.
- Time-based escalation should execute within the configured tolerance.
- Performance targets must be verified through load testing.
- Interactive overlays (toasts, sheets, dialogs, tooltips) must use native-driven animation and dismiss on scrim/back.
- Home-feed empty check: `tenantLoading` drives a skeleton, not the final empty card.

### 14.4 Onboarding & Routing (added 2026-10-14)
- Onboarding is a short wizard with **1–2 questions per screen**; replace flaky `1.` / `2a.` / `2b.` numbering with plain labels and a filling **progress bar** (`value/total`, 4px height, accent `#1E40AF` fill, track `paper200`) as user advances. 3 steps for admin, 3 for member; `admin_share` shows full bar.
- No placeholder examples under fields unless the format is non-obvious (e.g. a code pattern); question copy is intuitive on its own. Use a small **"i" info button** (`20dp` circle, `1px` border `borderDefault`/`accent` on press, `bgSunken`/`accentSoft` fill, popover `accentSoft` / `accentSoftBorder` with `radius.m` and `bodyS` body) at the right of each label for explanations — progressive disclosure, not hint spam.
- **Back is top-left** (`IconButton chevron-left size=md`) on every wizard step including `Welcome → phone` and `Verify` (subtitle shows `normalizedPhone`); the secondary "Change number" row is removed — header is the single navigation affordance, as on standard apps.
- **Keyboard must never cover the focused field.** `KeyboardAvoidingView` (`ios: padding`, `android: height`, `keyboardVerticalOffset = insets.top + 8` via `useSafeAreaInsets`) + `ScrollView automaticallyAdjustKeyboardInsets + keyboardDismissMode="interactive" + keyboardShouldPersistTaps="handled"` + safe-area + bottom padding `max(insets.bottom, 16) + 24` is the standard iOS/Android pattern and must be audited on every input-bearing screen. Registered onboarding location fields (`Headquarters city` / city, state) lift fluidly with this stack. `Field` + `Input` keep `control.sm/md` height, focus ring `shadow.focus`, and `editable` sunken variant.
- City/State autofill: `expo-location` (`requestForegroundPermissionsAsync` → `getCurrentPositionAsync(Balanced)` → `reverseGeocodeAsync` → `city/subregion/district` + `region`) proposes into the city/state `Input`s with a **"Use my location"** ghost `ghost map-pin` button (`locBusy → "Locating…"`) above the fields; fallback is manual typing. Country defaults to **India**; permission denied shows a `toast` and keeps manual flow. Native module is guarded (`try require('expo-location')`) so a base APK without it does not crash (JS null-ops).
- **Loader gate to kill admin/member flash.** After OTP, hold `pendingPhone: string | null` + branded `LoadingState` (`pulse 700ms easeInOut + shimmer 1400ms linear, shield-check 30dp in 72dp rounded 18 track, scale 1→1.08, shimmer translateX -40→88`) with subtitle "Signing you in…" until Supabase `verifyOtp(normalizedPhone||phoneInput, otp)` + `is_platform_admin()` resolves; branch render is: `!authReady → LoadingState` → `pendingPhone→LoadingState` → `signedIn && activeMember && !admin_share → Redirect /main` → wizard. Do not render either wizard in the `pendingPhone` gap and do not route via `member_q1 → admin_q1`.
- Phone number never overflows the header: mono `UNION` pill + titles use `numberOfLines={1}` truncation; wizard headers carry phone as subtitle with truncation.
- `TenantLoading` skeleton gate on Home: `AppStore.tenantLoading` around `loadTenant` (10-way `Promise.allSettled`) drives `FeedSkeleton` (`3× PostCardSkeleton` with `SkeletonBlock` shimmer `paper100→paper200`, `1100ms linear loop, translateX -80→260`) when `tenantLoading && posts.length===0`; otherwise empty `Card ("Nothing here yet")` or `PostCard` list. Prevents the post-login empty-feed flash.

### 14.5 Design System
- **Primitives:** `Button (primary/secondary/ghost/danger/inverse, sm/md/lg, 44dp tap target)`, `Card (radius.l, borderSubtle, shadow.card)`, `Field (gap 6, label ink800 + red * + inline error circle-alert / hint bodyS muted)`, `Input (h sm32/md40, radius s/m, borderDefault→Focus→redSolid invalid, bgSunken when not editable, placeholder ink400, selection accent)`, `Badge, Tag, Sheet, Dialog, Toast`.
- **Feedback surfaces:** `LoadingState` (branded pulse+shimmer), `FeedSkeleton`/`PostCardSkeleton`/`SkeletonBlock` shimmer skeletons — shared animation tokens (`Easing` with `useNativeDriver:true`, translateX shimmer, scale pulse).
- **Motion:** all sheets/dialogs/tooltips/notifications use native animation tokens (`motion.slow 320ms`, `Easing.bezier(0.2,0.7,0.2,1)` in sheets, spring-free loops in loaders) and remain fluid during keyboard and navigation transitions; loaders are `useNativeDriver:true` and do not jank.
- **Tokens (src/theme/tokens.ts — sRGB from oklch):** `palette` (`paper0/50/100/150/200/300`, `ink400–900`, `blue50–800 #1E40AF`, `red/amber/green/violet` triples), `colors` (`bgApp paper50, bgSunken paper100, surfaceCard paper0, surfaceHover paper100, textPrimary ink900 → textMuted ink500, accent blue600, borderSubtle paper200, etc`), `space / radius / control / shadow (card/raised/popover/sheet/focus) / motion (fast120/base200/slow320)` — single source of truth for every screen.

### 14.6 Accessibility and Usability
- Responsive mobile interface on Android/iOS via Expo.
- Clear distinction between public/ordinary group posts, official announcements, private committee content, and complaints.
- Accessible navigation, readable typography, and clear status indicators.
- Support localization and multiple languages as needed.
- Provide understandable permission and privacy messaging.

### 14.7 Observability
- Application logs, metrics, error tracking, and health checks.
- Monitoring for failed notifications, stuck escalations, and workflow errors.
- Operational alerts without leaking sensitive complaint data.

### 14.8 Responsive UI and Viewport Scaling

- All modal panels, bottom sheets, and selection dialogs must dynamically scale using `useWindowDimensions()` and safe area insets.
- Bottom sheet containers must enforce a reactive ceiling: $\text{maxHeight} = \text{round}(\text{windowHeight} \times 0.88 - \text{insets.top})$ with `overflow: 'hidden'`, guaranteeing that headers, drag handles, and close buttons remain pinned within the visible screen on any device.
- Scrollable content must use `flexShrink: 1` rather than fixed pixel heights (`540px`, `400px`, `380px`), allowing sheets to adapt fluidly across compact phones, tall flagships, and tablets without offscreen clipping or layout skew.
---

## 15. Suggested Technical Direction
### 15.1 Recommended MVP Stack

- **Android/iOS:** React Native + Expo + TypeScript.
- **Web administration:** Next.js + TypeScript for Platform Super Admin and organization-management dashboards.
- **Managed backend foundation:** Supabase PostgreSQL, Supabase Auth, Supabase Storage, and Supabase Realtime.
- **Server-side business logic:** Supabase Edge Functions and PostgreSQL functions/transactions for privileged actions, audience resolution, and other atomic operations. Never put service-role secrets in mobile/web clients.
- **Authorization:** PostgreSQL Row Level Security (RLS) as a data-access layer, plus explicit server-side authorization for high-risk actions and Platform Super Admin overrides. Test tenant isolation and private-channel policies automatically.
- **Scheduled/background work:** Supabase Cron and Queues or an equivalent durable queue for notification dispatch, reminders, and initial escalation processing. Use idempotent handlers, retries, and audit records. Add a dedicated workflow engine only if observed workflow complexity and reliability requirements justify it.
- **Push notifications:** Expo Push Notifications backed by APNs and FCM, behind a provider abstraction.
- **File storage:** Supabase Storage with private buckets and short-lived authorized download URLs for confidential evidence.
- **Observability:** Error reporting, structured logs, delivery failure monitoring, backup/restore tests, and security alerts.

This stack avoids a separate application server and dedicated workflow engine in the initial release. If Edge Functions and database transactions become an awkward fit for complex domain logic, introduce a standalone API service based on demonstrated needs rather than choosing one by default. Keep the database schema and domain boundaries portable.

### 15.2 Core Modules

Organize the code and database around Tenant Management, Membership, Organizational Structure, Functional Groups, Committees & Governance, Permissions, Social Feed, Groups & Messaging, Issues, Escalation, Notifications, Audit, and Platform Administration. A modular monolith/function-oriented deployment is preferred over microservices for the MVP.

### 15.3 Open-Source Reuse Strategy

Do not assume an existing repository is a complete fit. Reuse isolated components and patterns after reviewing the source, tests, dependency health, security, and exact license files. Do not copy a whole repository into production without an architecture and security review.

The following public repositories were identified in a preliminary research pass on 10 October 2026. They are candidates to inspect, not endorsements or guarantees of production readiness. Re-check their current default branch, last commit, issues, dependencies, and license before adopting code.

| Repository | Relevant code/patterns | License indicated by repository | Fit and cautions |
|---|---|---|---|
| [ciaorelated](https://github.com/dogankaraarslan1/ciaorelated) | Expo/React Native social feed, profiles, groups, chat, GraphQL, PostgreSQL, media uploads, push-registration foundation | MIT (README; verify LICENSE file) | **Best social-app starter to evaluate first.** Its architecture is closer to an organization/community social app than a generic Instagram clone. It uses a separate backend and PostgreSQL rather than Supabase-native services, so adapting auth and data access is work. Check project maturity and current build status before forking. |
| [xMind](https://github.com/aashir-athar/xmind-app) | Expo SDK 54, TypeScript, paginated feed, profiles, chat, search, feed-ranking patterns | MIT | Useful for feed UX, pagination, optimistic interactions, and mobile UI patterns. Its documented backend uses Express, MongoDB, Clerk, and Cloudinary, and push notifications are still listed as roadmap work; do not assume it matches the target backend. |
| [Ahlan Social Mobile](https://github.com/ahlan-app/ahlan-social-mobile) | Expo/React Native, Supabase Auth, feed, media posts, comments, Supabase Realtime messaging | Apache-2.0 (repository README) | **Best Supabase-specific mobile reference to inspect.** The repository is relatively small/early-stage; assess tests, completeness, recent activity, and the exact LICENSE/NOTICE files before reuse. |
| [CivicFix](https://github.com/civic-fix/civicfix) | Expo mobile app, Supabase/PostgreSQL, issue reporting and tracking, admin dashboard, feed, issue updates, notification-related code | MIT (repository README; verify LICENSE file) | **Best issue-management reference to inspect.** Its civic-authority domain and role model differ from multi-tenant organizational governance. Treat as a source of UI/workflow patterns, not a drop-in complaint module; review current code and dependencies. |
| [React Native + Supabase chat POC](https://github.com/quentin-aslan/poc-react-native-supabase) | Basic authentication and realtime chat integration | MIT (repository README; verify LICENSE file) | Small learning reference only. It is explicitly a proof of concept and says message notifications are not implemented. Do not use as the production messaging foundation without substantial hardening. |
| [Pixelfed React Native app](https://github.com/pixelfed/pixelfed-rn) | Established open-source photo-social mobile client patterns | AGPL (repository README) | Useful for studying social UX, but **not the default code-reuse choice**: the AGPL obligations and Pixelfed-specific backend assumptions require legal and architecture review. Avoid copying code unless the project accepts those terms. |
| [Mastodon Native](https://github.com/mastodon/mastodon-native) | React Native social client structure | Verify current license and maintenance status | Older/early-stage mobile project; inspect for learning only unless activity, dependencies, and compatibility are verified. |

#### Reuse Decision

1. Prototype the social/feed shell from **ciaorelated** and compare it with **Ahlan Social Mobile** for Supabase integration.
2. Inspect **CivicFix** for issue intake, issue status timelines, and admin queue patterns.
3. Use **xMind** for feed pagination and interaction patterns where useful.
4. Prefer copying small, well-understood components over adopting an entire application. Keep a `THIRD_PARTY_NOTICES.md` and record repository URL, commit hash, file/component origin, license, modifications, and required notices.
5. Do not copy project branding, logos, screenshots, seed data, credentials, or demo content. Replace them with original assets and synthetic test data.
6. Before merging reused code, check dependencies and secrets, run static analysis and tests, review authentication/authorization, and confirm no client can bypass RLS or access private complaints.
7. Open-source licensing is a release gate. Preserve copyright/license notices and comply with attribution, NOTICE, source-distribution, and copyleft requirements applicable to each selected component. Obtain legal review for unclear cases.

The research suggests that no single repository identified here should be treated as the complete foundation for the platform. The best path is a controlled hybrid: reuse selected mobile/social and issue-management components, while implementing the tenant model, governance, committee permissions, complaint confidentiality, and escalation rules specifically for this product.

### 15.4 Visual Identity and Postal Theme

The mobile client integrates the national identity of India Post with the solidarity of the trade union movement (Bharatiya Mazdoor Sangh emblem):
- **India Post Red (`#C6262E`):** Primary brand accent, primary action buttons, active indicator pills, and timeline nodes.
- **Postal Blue / Navy (`#1A237E` / `#283593`):** Industrial cogwheel border accents, secondary badges, and council tags.
- **Union Saffron (`#EB6E02`):** Labor solidarity highlights, warning tones, and action pips.
- **India Post Gold (`#FFC72C` / `#FFD54F`):** Golden wing highlights, wheat sheaf contours, and verified badges.
- **App Launcher Assets:** Mapped and packaged across all Android standard and adaptive mipmap densities (`mdpi`, `hdpi`, `xhdpi`, `xxhdpi`, `xxxhdpi`) embedding the unified postal wing, gear, and wheat sheaf emblem.
---

## 16. MVP Scope and Delivery Phases

### Phase 1 — Organization and Membership
- Tenant creation and isolation.
- Geographic hierarchy.
- Member registration and verification.
- functional groups and committee setup.
- Role and scope-based permissions.
- Configurable terminology and organizational levels.
- Committee/position creation, appointment and removal flows.
- Platform Super Admin cross-tenant committee assignment capability with audit trail.
- Member directory and basic organization chart.

### Phase 2 — Social Feed and Communication
- Automatic geographic group membership and functional-group spaces.
- Committee-private channels with access-control tests.
- Home feed with group filters, official-announcement styling, pinned posts, comments, reactions, and moderation.
- Group chats and announcements.
- Audience-targeted publishing with an explicit **Notify audience** option.
- In-app notification center, Android/iOS push delivery, device-token lifecycle, deep links, retry handling, and delivery monitoring.

### Phase 3 — Issues and Escalation
- Structured issue creation, evidence uploads, routing, assignment, and status history.
- Private issue workspace, member case tracking, committee queues, deadlines, and configured escalation.
- Notifications to the complainant and authorized case participants only.
- Optional explicitly approved and sanitized public/community updates; no automatic issue-to-feed publishing.
- Audit trail and role-specific issue dashboards.

### Phase 4 — Hardening and Advanced Features
- Advanced search, reporting, and workload analytics.
- Cross-functional issues and confidential/urgent routing.
- Optional email/SMS notification channels and configurable quiet hours.
- Load testing, security testing, tenant-isolation tests, localization, accessibility, backup/restore validation, and review of open-source license obligations.

---

## 17. Acceptance Criteria

The MVP is acceptable when the following scenarios pass:

1. A platform operator can create two independent organizations.
2. A member of organization A cannot access organization B's data through the UI, API, search, notifications, or file links.
3. An approved member is mapped to the configured geographic groups based on their membership and location.
4. An administrator can create multiple functional groups within one city and create committees for those functional groups.
5. A functional group committee can contain a configurable number of members with different permissions.
6. A member can belong to multiple permitted functional groups without receiving committee privileges automatically.
7. A member sees only permitted geographic groups, functional group spaces, and committee content.
8. A member can view the relevant organization chart and identify their representatives.
9. A complaint is routed to the correct committee using configured rules, or enters a triage queue if no route matches.
10. An authorized handler can claim, update, and resolve a complaint.
11. An unresolved complaint escalates according to its configured deadlines and chain.
12. The receiving committee sees the case history and evidence necessary to continue handling it.
13. A member can track their own complaint without seeing confidential internal notes.
14. Leadership dashboards show only cases and metrics within the user's authorized scope.
15. Administrative and complaint actions are recorded in the audit trail.
16. Changes in geography, functional-group membership, committee appointments, or account status update access appropriately without destroying historical records.
17. A Platform Super Admin can assign, replace, suspend, reinstate, and remove a committee member at any level in any organization, and every action is clearly attributed to the Platform Super Admin in the audit history.
18. An organization administrator cannot appoint committee members outside their delegated scope unless the organization's configured policy explicitly allows it.
19. An appointment's effective permissions are granted and revoked according to its lifecycle, without erasing the appointment history.
20. Each organization can configure its visible terminology without requiring a schema or code change.
21. A committee leader can publish an announcement to only the audience they are authorized to target and choose whether to send push notifications.
22. Members receive relevant announcement notifications on Android and iOS when targeted and enabled, without receiving notifications for unrelated organizations or groups.
23. A push notification deep link opens the intended post or case only after the app revalidates the user's current permissions.
24. Complaint escalations do not automatically appear in the social feed; only explicitly approved, sanitized updates may be published there.
25. Notification retries do not create duplicate in-app notifications or duplicate escalation actions.
26. Third-party reused code has a recorded source, commit/version, license, modification notes, and required notices.

---

## 18. Open Product Decisions

These decisions should be confirmed before implementation:

1. **Membership approval:** Is every registration approved by a human, or can some memberships be automatically verified?
2. **Geographic levels:** Which levels are required for the first organization? Can a organization rename or omit levels?
3. **functional group eligibility:** Are functional groups assigned by administrators, selected by members, or determined by rules?
4. **Committee authority:** Can a committee member resolve a case independently, or is approval from the committee head required for some categories?
5. **Escalation semantics:** Does escalation notify the next level, transfer ownership, or do both? Can the current level continue working on the case?
6. **Multiple functional groups:** If a member belongs to several functional groups, which committee handles cross-functional group complaints?
7. **Shared cases:** Can members link their complaints to a common issue, and who can see the linked identities?
8. **Messaging:** Are direct messages allowed, or should communication remain inside groups and official channels?
9. **Confidential complaints:** Which categories need restricted handlers or direct escalation?
10. **External organizations:** Is the platform strictly an infrastructure provider for independent organizations, or will any explicitly authorized cross-organization collaboration ever be needed?
11. **Deployment and governance:** Will this be hosted centrally as a service, self-hosted by each organization, or support both?
12. **Feed ranking:** Chronological feed by default, or a configurable relevance-ranked feed? Recommendation: chronological/relevance-light with pinned official announcements protected from ranking suppression.
13. **Push policy:** Which announcement categories may leaders mark as push-worthy, and what rate limits/quiet hours should apply?
14. **Open-source adoption:** Which candidate repositories pass code-quality, maintenance, security, and license review before any code is copied?

---

## 19. Product Success Metrics

Potential metrics:
- Member registration completion and approval rate.
- Percentage of active members using the platform monthly.
- Participation across geographic groups and functional groups.
- Percentage of complaints assigned within the target time.
- Median time to first response and resolution.
- Percentage of complaints escalated because of missed deadlines.
- Percentage of cases reopened after resolution.
- Number of complaints without an assigned handler.
- Unauthorized access incidents and tenant-isolation test failures.

Success should be measured not just by engagement, but by whether members can find the right people, communicate safely, and get accountable responses to their issues.

---

## 20. Final Product Definition

A multi-tenant, domain-agnostic platform where **each independent organization operates an isolated tenant**, configures its terminology and organizational hierarchy, manages members and functional groups, and uses committees to handle responsibilities and issues through auditable workflows. Organization-specific governance controls normal committee formation, while the Platform Super Admin can assign and manage committee members at every level across every organization, with explicit audit trails and privileged-access safeguards.

The product provides a social-style experience for everyday members, a Teams-style organizational directory, and a structured case-management system for committee members and leadership—while preserving strict separation between organizations and least-privilege access within each organization.

# Union — User & Testing Guide

Welcome to **Union**, the multi-tenant membership, community, and issue-management platform. This guide covers the Mobile + OTP authentication flow, Admin Organization Creation & Invite Code sharing, the 1–2 question per screen Member Setup wizard, and live Supabase persistence.

## Table of Contents

1. [Product Overview & Governance Principles](#1-product-overview--governance-principles)
2. [How to Launch & Access the App](#2-how-to-launch--access-the-app)
3. [User Personas & Testing Accounts](#3-user-personas--testing-accounts)
4. [Member Application Navigation Flows](#4-member-application-navigation-flows)
   - [Flow 1: Home Feed & Official Announcements](#flow-1-home-feed--official-announcements)
   - [Flow 2: Groups & Trade Communities](#flow-2-groups--trade-communities)
   - [Flow 3: Raising an Issue & Auto-Routing](#flow-3-raising-an-issue--auto-routing)
   - [Flow 4: Tracking Grievances & Progress Timeline](#flow-4-tracking-grievances--progress-timeline)
   - [Flow 5: Notifications & Deep-Linking](#flow-5-notifications--deep-linking)
   - [Flow 6: Organization Chart & Representatives](#flow-6-organization-chart--representatives)
   - [Flow 7: Profile, Settings & Member Application](#flow-7-profile-settings--member-application)
5. [Leadership & Administration Flows](#5-leadership--administration-flows)
   - [Flow 8: Accessing Management Tools](#flow-8-accessing-management-tools)
   - [Flow 9: Leadership Dashboard & Live Metrics](#flow-9-leadership-dashboard--live-metrics)
   - [Flow 10: Issue Queue & Case Management](#flow-10-issue-queue--case-management)
   - [Flow 11: Handler Assignment & Caseloads](#flow-11-handler-assignment--caseloads)
   - [Flow 12: Tiered Escalation with Mandatory Reason](#flow-12-tiered-escalation-with-mandatory-reason)
   - [Flow 13: Case Resolution](#flow-13-case-resolution)
   - [Flow 14: Committee Governance & Appointments](#flow-14-committee-governance--appointments)
   - [Flow 15: Platform Super Admin Override](#flow-15-platform-super-admin-override)
   - [Flow 16: Audience-Targeted Broadcasts](#flow-16-audience-targeted-broadcasts)
   - [Flow 17: Multi-Tenant Switching & Organization Creation](#flow-17-multi-tenant-switching--organization-creation)
6. [Live Database & Supabase Integration](#6-live-database--supabase-integration)

---

## 1. Product Overview & Governance Principles

The Commons platform is built on one foundational principle (**PRD §1.3**):

> **Geography determines jurisdiction. Functional groups determine membership. Committees determine responsibility. Permissions determine access. Issues follow a configured resolution workflow.**

### Key Architectural Concepts
- **Strict Tenant Isolation:** Each independent organization (e.g. *Deccan Workers' Federation* vs *National Educators Alliance*) operates in complete data separation. A user in Organization A cannot see Organization B's members, complaints, committees, or private channels.
- **Configurable Terminology:** Organizations configure their visible nouns without code changes:
  - Organization: *Federation* / *Union* / *Alliance* / *Association*
  - Tiers: *City* $\rightarrow$ *State* $\rightarrow$ *National* or *Branch* $\rightarrow$ *Region* $\rightarrow$ *Country*
  - Case: *Issue* / *Grievance* / *Case* / *Complaint*
  - Group: *Functional Group* / *Sector* / *Trade*
- **Complaint Privacy:** Workplace complaints and grievances are **strictly private**. They never appear in public feeds. Internal committee handler notes are completely isolated from complainants.

---

## 2. How to Launch & Access the App

You can access and test the app using any of the following methods:

### Method A: Standalone Android App (`.apk`)
1. Download the compiled `app-debug.apk` directly from your GitHub Actions page:
   `https://github.com/abhinaypodugu/union/actions` $\rightarrow$ Artifacts $\rightarrow$ **`commons-mobile-apk`**
2. Install and launch on any physical Android phone.

### Method B: Live Mobile Preview via Expo Go (iOS & Android)
1. Install **Expo Go** from the Apple App Store or Google Play Store.
2. In your terminal on your computer:
   ```bash
   npx expo start
   ```
3. Scan the terminal QR code with your iPhone Camera app or Android Expo Go app.

### Method C: Standalone PWA on iPhone (Zero installation barrier)
1. On your iPhone, open Safari and navigate to your deployed URL or local IP address:
   `http://192.168.29.44:8081/`
2. Tap the **Share icon** (square with up arrow) $\rightarrow$ **Add to Home Screen**.
3. Launch the app icon from your home screen. It runs in full-screen standalone mode without Safari address bars.

---

## 3. Mobile + OTP Authentication & Onboarding Flows

The Welcome screen (`app/index.tsx`) asks **only** for a **Mobile Number** followed by **6-digit OTP verification** persisted in Supabase.

### Path A: Founding Administrator (Create Organization & Share Code)
*Regular members cannot see or access the organization creation path. Only a whitelisted admin phone number (e.g. `9999999999`) or an account entering the Admin Setup Key (`UNION-ADMIN`) can create an organization.*

1. **Mobile + Admin Verification:** Enter an admin mobile number (or tap *"Founding administrator? Enter admin key"* and enter `UNION-ADMIN`), then verify the 6-digit OTP code.
2. **Step 1 of 3 (2 Questions):** Enter the **Organization Name** and choose a unique **Organization Code** (e.g. `NHWU`).
3. **Step 2 of 3 (2 Questions):** Enter the **Organization Description** and configure governance nouns (**Case label** & **Group label**).
4. **Step 3 of 3 (2 Questions):** Enter the **Founding Administrator Name**, **Headquarters City**, and **Email**.
5. **Share Invite Code Screen:** Once created and persisted to Supabase, Union displays the **Organization Invite Code** with a **Share organization code** button so the admin can share it with members.

### Path B: Member Onboarding (Join via Shared Organization Code)
1. **Mobile + OTP Verification:** Enter your 10-digit mobile number and verify the 6-digit OTP code.
2. **Step 1 of 3 (1 Question):** Enter the **Organization Code** shared by your administrator (verified live against Supabase).
3. **Step 2 of 3 (2 Questions):** Enter your **Full Name** and **Email Address**.
4. **Step 3 of 3 (2 Questions):** Enter your **City / Branch** (`level1Label`) and **Trade Sector / Group** (`groupLabel`), then tap **Complete Setup** to save your profile to Supabase and launch the Home screen.

### Returning Users (Admin or Member)
- Verifying your mobile number via OTP automatically detects your existing profile in Supabase and signs you directly into your organization's Home screen.

---

## 4. Member Application Navigation Flows

### Flow 1: Home Feed & Official Announcements
1. Tap the **Home** tab in the bottom bar.
2. **Filter Segment:**
   - **For you:** Blended feed of updates and notices relevant to your location and sector.
   - **My groups:** Routine member discussions from your enrolled channels.
   - **Announcements:** Verified official announcements published by leadership.
3. **Visual Content Types (PRD §14.4):**
   - **Official Announcement:** Distinguished by a civic blue flag band, mono overline (`OFFICIAL ANNOUNCEMENT`), check-seal on the avatar, serif headline, and pale-blue highlight.
   - **Member Post:** Warm paper card with hairline border.
4. **Engagement:**
   - Tap the **Heart icon** to like/unlike.
   - Tap **Share** to share via the native system share sheet.
---

### Flow 2: Groups & Trade Communities
1. Tap the **Groups** tab in the bottom bar.
2. **Your Places:** Geographic jurisdictions joined automatically based on your registration (*City*, *State*, *National*). Notice the unread count pills.
3. **Functional Groups:** Trade and sector spaces scoped to your location (*IT Workers · Hyderabad*, *IT Workers · Telangana*).
4. **Committee Channels:** Private channels with dashed borders and lock icons. Only visible if you are currently appointed to that committee.
5. **Communities:** Cross-functional interest groups (*Women in Tech*).
6. **Privacy Notice:** The notice card at the bottom reinforces that private committee deliberations are separated by strict governance.

---

### Flow 3: Raising an Issue & Auto-Routing
Members do not need to guess which committee handles their complaint—the platform's routing engine handles it automatically (**PRD §9.1, §9.2**).

1. Tap the **Issues** tab.
2. Tap the **`+ Raise`** button in the top-right header (or open the modal sheet).
3. **Fill in the Grievance Intake Sheet:**
   - **Category (Required):** Select *Health & safety*, *Wages*, *Working hours*, *Facilities*, *Harassment (confidential)*, or *Retaliation*.
   - **Title (Required):** Short summary (e.g., *"No safety equipment on loading bay"*).
   - **What happened?:** Detailed description of the event, times, and parties involved.
   - **Affects others checkbox:** Check *"This affects other members too"* if the issue is collective (complainant identity remains protected).
4. Tap **Submit issue**.
5. **Automated Routing Behavior:**
   - If *Harassment* or *Retaliation* $\rightarrow$ Automatically routed to **Confidential Handlers** directly at Level 2 (State).
   - If *Facilities* $\rightarrow$ Routed to **Hyderabad General Committee**.
   - If *Wages* or *Health & safety* $\rightarrow$ Routed to **Hyderabad IT Workers Committee** (Level 1).
6. A confirmation toast appears, and the new case opens directly in the case progress view.

---

### Flow 4: Tracking Grievances & Progress Timeline
1. On the **Issues** tab, tap any case card (e.g., `CASE-2041` or your newly created case).
2. **Facts Bar:** Displays Category icon, Location, and Date opened.
3. **Status Badge:** Shows current workflow state (*Submitted*, *Assigned*, *In progress*, *Awaiting member info*, *Escalated · L2*, *Resolved*).
4. **Action Needed Callout:**
   - If the committee requested information (*Awaiting member info*), an amber alert box appears with a note and deadline timer (e.g., *"Reply in 2 days"*).
   - Enter your response in the reply text box and tap **Send reply**. Status updates to *Reply sent*.
5. **Escalation Progress Timeline:**
   - Displays the tiered chain: **Level 1 (City Committee)** $\rightarrow$ **Level 2 (State Committee)** $\rightarrow$ **Level 3 (National Committee)**.
   - Completed stages show green checks with historical timestamps.
   - Active stages show a blue dot with current handler and due dates.
   - Escalated stages show a violet chevron and the exact reason for escalation.
6. **Privacy Assurance:** Internal committee deliberation notes are never displayed to the complainant.

---

### Flow 5: Notifications & Deep-Linking
1. Tap the **Alerts** tab in the bottom bar (badge displays unread count).
2. Notifications are grouped by **Today** and **Earlier**:
   - **Status updates:** *"There is an update to your case CASE-1988"* (generic lockscreen text to preserve confidentiality per PRD §11.2).
   - **Official announcements:** *"Telangana State Committee posted an official announcement"*.
   - **Escalation alerts:** *"Your case CASE-2041 moved to the state committee"*.
   - **Security events:** *"New sign-in on Android · Pixel 8"*.
3. Tap any notification $\rightarrow$ It marks the item as read and **deep-links directly** into the target case progress screen or feed post.
4. Tap **Mark all read** in the top-right to clear all unread badges.

---

### Flow 6: Organization Chart & Representatives
1. Tap the **Organization** tab.
2. **Your Representatives:** View cards of appointed officers who represent you at each level:
   - *Anita Desai* (Secretary · Level 1 City)
   - *Imran Sheikh* (Chair · Level 2 State)
   - *Joseph Mathew* (Chair · Facilities)
   - Tap **Message** on any representative to initiate direct officer communications.
3. **Your Escalation Route:** Visual badge chain showing your path of accountability:
   `[Hyderabad L1] ──► [Telangana L2] ──► [National L3]`
4. **Structure:** Interactive, expandable tree. Tap nodes (*India*, *Telangana*, *Hyderabad*, *Committees*) to explore units and member counts.

---

### Flow 7: Profile, Settings & Admin Invite Code Sharing
1. On the **Home** tab, tap your **Avatar** in the top-right.
2. View your member hero with verified badge, verified mobile number, and ID number.
3. **Admin Invite Code Card (Admins Only):**
   - Administrators see the **Shareable Organization Code** card displaying the organization's code (e.g. `NHWU`) with a **Share code with members** button (`Share.share`) and a shortcut to the **Admin console**.
   - Regular members only see their organization badge and cannot access organization creation.
4. **Notification Preferences:**
   - Toggle *Official announcements*, *Replies & mentions*, and *Group activity*.
   - *Case updates* toggle is **locked on** with the note *"Mandated by organization constitution"* (PRD §11.3).
## 5. Leadership & Administration Flows

### Flow 8: Accessing Management Tools
You can enter the Leadership & Management suite in two ways:
1. **Shortcut:** Tap the **Shield icon** (`🛡️`) in the top-right header on the **Home** screen.
2. **Via Profile:** Open **Profile** $\rightarrow$ tap **Leadership tools** under the *Management* section.

---

### Flow 9: Leadership Dashboard & Live Metrics
The **Management** overview screen provides operational visibility across your authorized jurisdiction (**PRD §10**):
- **Live Metric Tiles:**
  - `Open cases`: Total unresolved grievances.
  - `Overdue SLA`: Cases where the response or resolution window has lapsed.
  - `First response`: Median time to first handler action (e.g. `1.4d`).
  - `Approvals`: Count of pending membership registrations and committee nominations.
- **Needs Attention List:** Quick access cards for cases that are overdue or awaiting initial triage.
- **Navigation Shortcuts:** Tap *Issue queue*, *Committees & appointments*, or *New announcement*.

---

### Flow 10: Issue Queue & Case Management
1. In the Management panel, tap **Issue queue** (`/manage/queue`).
2. **Filter Tabs:**
   - **All open:** Every active case in your jurisdiction.
   - **Unassigned:** Freshly routed complaints needing an officer assignment.
   - **Overdue:** Cases that have breached their SLA deadline.
   - **Escalated:** Cases received from lower tiers.
3. Tap any issue card to open the **Case Handling Inspector** (`/manage/case`).

---

### Flow 11: Handler Assignment & Caseloads
1. Inside the Case Inspector (`/manage/case?id=CASE-XXXX`):
2. Tap the **Assign** (or **Reassign**) button.
3. The **Assign handler** sheet slides up, displaying eligible committee members with their current workload:
   - *Anita Desai · 4 active cases*
   - *Imran Sheikh · 6 active cases*
   - *Lakshmi Rao · 3 active cases*
   - *Priya Nair · 2 active cases*
4. Tap any officer $\rightarrow$ The case is claimed, status updates to `Assigned`, and an immutable event is written to the audit trail.

---

### Flow 12: Tiered Escalation with Mandatory Reason
When a case cannot be resolved at the city tier or exceeds deadlines (**PRD §9.5, §17.11**):

1. Inside the Case Inspector, tap **Escalate**.
2. A dialog appears: *"Escalate to the next level? The receiving committee gets the complaint, attachments, timeline and your reason."*
3. **Mandatory Justification Input:**
   - Enter the reason: e.g., *"Employer refused to engage within the 14-day local SLA window"*.
   - The **Escalate** button remains disabled until a reason is provided.
4. Tap **Escalate**.
5. **Immediate System Actions:**
   - Tier increments from Level 1 $\rightarrow$ Level 2 (State Committee).
   - A violet `Escalated · L2` badge attaches to the case.
   - The Escalation Timeline records the event and reason.
   - An immutable record is created in `audit_logs`.
   - The complainant receives a notification: *"Your case moved to the next committee level"*.

---

### Flow 13: Case Resolution
1. Once a settlement or remedy is reached, tap **Resolve** in the Case Inspector.
2. Status updates to `Resolved · awaiting confirmation`.
3. Deadlines clear, and the member is prompted to confirm resolution satisfaction.

---

### Flow 14: Committee Governance & Appointments
1. In Management, tap **Committees & appointments** (`/manage/committee`).
2. View the committee charter, term (*Apr 2026 – Mar 2028*), formation method, and jurisdictional remit (*Handles*, *Escalates to*, *Can publish to*).
3. **Member Roster:** View all appointed officers and their statuses (*Active*, *Suspended*, *Pending approval*).
4. **Approve Nominations:** For members in `Pending approval` status, tap **Approve** $\rightarrow$ status becomes active and permissions activate.

---

### Flow 15: Platform Super Admin Override
To resolve deadlocks or make emergency governance adjustments (**PRD §5.11, §17.17**):

1. Switch your persona to **Dr. Vikram Patel** (Profile $\rightarrow$ Switch test persona).
2. Open **Committees & appointments** $\rightarrow$ Tap **`+ Add`**.
3. Enter the member's name and position (*Issue handler*).
4. Toggle on **Platform Super Admin override**:
   - A red notice appears: *"Recorded as a platform-admin action. The audit trail will show this as an override — not an organization-approved appointment. A reason is required."*
   - Enter the mandatory override reason: e.g. *"Emergency quorum appointment authorized under platform charter §5.11"*.
5. Tap **Assign as platform admin**.
6. **Result:** The member appears on the roster with a distinct red **`Platform-admin override`** badge, and the event is permanently recorded in the audit trail.

---

### Flow 16: Audience-Targeted Broadcasts
1. In Management, tap **New announcement** (`/manage/announce`).
2. Enter the **Headline** and **Message**.
3. Toggle **Pin to top of feed** if urgent.
4. **Audience Targeting:**
   - Tap eligible audience tags within your authority (*Hyderabad · IT Workers*, *Telangana · All members*).
   - Audiences outside your jurisdiction (e.g. *National · All members*) display a lock icon and cannot be selected without higher authorization.
   - The real-time recipient counter calculates de-duplicated member reach (e.g., `96,500 members`).
5. **Push Notification Toggle:**
   - Toggle on **Notify audience** to queue mobile push alerts.
6. **Live Member Preview:** View the live card preview below before publishing.
7. Tap **Publish & notify**.

---

### Flow 17: Multi-Tenant Switching & Organization Creation (Admin Only)
1. Open **Profile** as an Administrator $\rightarrow$ tap the **Organization** card.
2. **Switch or Create Organizations:**
   - Switch between active organizations in Supabase, or tap **`+ Create new organization`** to establish a new isolated tenant boundary and generate its shareable member invite code.

---

## 6. Live Database & Supabase Integration

All data in **Union** is persisted directly to your live Supabase PostgreSQL database (`supabase/schema.sql`):
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
EXPO_PUBLIC_SUPABASE_SERVICE_KEY=sb_secret_...
EXPO_PUBLIC_ADMIN_SETUP_KEY=UNION-ADMIN
EXPO_PUBLIC_ADMIN_PHONES=9999999999,+919999999999
```
- **Mobile OTP Verification:** Generates and persists 6-digit OTP codes in Supabase (`auth.users` metadata and `otp_verifications`).
- **Organizations & Profiles:** Every organization (`tenants`), member/admin (`profiles`), committee (`committees`, `committee_members`), geographic unit (`geo_units`), trade group (`functional_groups`), grievance (`issues`), announcement (`posts`), and audit event (`audit_logs`) is stored in Supabase and hydrated automatically on launch.
- **Realtime Sync:** Changes to issues and announcements stream live across connected devices.

---

*Union · Built with Expo SDK 57, React Native, and Supabase · Conforming to PRD v1.2*

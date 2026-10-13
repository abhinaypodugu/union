# Ten-Level Test Roster — TU + SU (Platform / Org / Committee / Member)

> **Tenant isolation is law.** Every action below is checked server-side through `is_member`, `has_tenant_role`, `committee_role`, `can_handle_issue`, `in_audience`, and `can_publish`. Nothing in this file bypasses RLS except the **service-role seed** (`supabase/seed-ten-levels.sql`) which exists only to populate `auth.users` / `profiles` without sending real OTP. Manual testing on a live project uses **OTP only**.

## 0. Quick start (live project)

```sql
-- 1. Apply schema (idempotent) in Supabase SQL editor:
--    paste supabase/schema.sql
-- 2. Ensure at least one platform admin exists:
INSERT INTO platform_admins (phone, name) VALUES ('+917995731200', 'Abhinay') ON CONFLICT DO NOTHING;
-- 3. (Optional) bulk-seed without OTP — run as service_role / postgres:
--    paste supabase/seed-ten-levels.sql
--    OR create every account manually via OTP as described in §3.
```

`npm test` runs the same roster on **PGlite** (`test/ten-levels.test.mjs`) without touching your live project.

---

## 1. Tenants

| id | code | name | terminology (TU example) | settings |
|---|---|---|---|---|
| `tu` | `TU` | Test union | City / State / National · Cadre · Issue | `autoApproveMembers=false`, `memberPosts=true`, `reopenWindowDays=30` |
| `su` | `SU` | Second Union | Organization / City / State / National (defaults) | same defaults |

`tu` already exists in your live project (seed checks `ON CONFLICT DO NOTHING`). `su` is created by the platform admin via `create_organization` (or inserted directly by the seed for PGlite). **No member of `tu` can see `su` rows and vice-versa** (`tenants` policy: `is_platform_admin() OR EXISTS (SELECT 1 FROM profiles WHERE tenant_id = tenants.id AND user_id = auth.uid())`).

### Geo units

```
TU: tu-country-india (Country) → tu-state-telangana (State) → tu-city-telangana-hyderabad (City)
SU: su-country-india → su-state-maharashtra → su-city-maharashtra-pune
```

`ensure_geo_path` creates these on first `register_member`. The seed inserts them explicitly.

### Functional groups (both tenants carry the same set)

`IT Workers`, `Transport`, `Administration` — stored in `functional_groups` with ids `tu-grp-it-workers`, etc. Member counts are maintained by `refresh_member_counts`.

### Committees

| id (TU) | name | level | functional_group | geo_unit | escalates_to |
|---|---|---|---|---|---|
| `200d68f4-27a2-4210-afda-ea6264b75d13` | Test union Executive Committee | 3 | NULL (general) | NULL | NULL (top) |
| `tu-l1-hyd-it` | Hyderabad IT Workers Committee | 1 | IT Workers | `tu-city-telangana-hyderabad` | `tu-l2-tg-it` |
| `tu-l2-tg-it` | Telangana IT Workers Committee | 2 | IT Workers | `tu-state-telangana` | Executive (L3) |

SU has its own Executive Committee `su-exec-…` (created by `create_organization`).

Default `routing_rules` (seeded by `create_organization`):

| category | target_kind | start_level | confidential |
|---|---|---|---|
| Wages | group | 1 | false |
| Working hours | group | 1 | false |
| Health & safety | group | 1 | false |
| Facilities | general | 1 | false |
| Harassment (confidential) | general | 2 | **true** |

---

## 2. Roster — 10 users across every level

Phones use the `91900…` test block so they never collide with real users. `digits_only` matching means `+91 9000000101`, `919000000101` and `9000000101` are equivalent.

| # | persona | phone (normalized) | tenant | profile status | tenant roles (`profiles.roles`) | committee appointment (`committee_members.role`) | groups | unit / region |
|---|---|---|---|---|---|---|---:|---|
| 1 | **Platform Super Admin / Org Admin (TU founding)** — Abhinay | `+917995731200` | `tu` | verified | `member` `org_admin` | **Chair** of Executive L3 (platform-admin override, founding) | Administration | Hyderabad / Telangana |
| 2 | **Org Admin #2 (TU)** — Priya Rao | `+919000000101` | `tu` | verified | `member` `org_admin` | — (pure org admin, no committee needed) | Administration | Hyderabad / Telangana |
| 3 | **Org Admin (SU)** — Vikram Singh | `+919000000102` | `su` | verified | `member` `org_admin` | Chair of SU Executive L3 | Administration | Pune / Maharashtra |
| 4 | **Committee Chair L1 City** — Anita Desai | `+919000000103` | `tu` | verified | `member` | **Chair** of Hyderabad IT Workers L1 | IT Workers | Hyderabad / Telangana |
| 5 | **Issue Handler L3 National** — Ramesh Kumar | `+919000000104` | `tu` | verified | `member` | **Issue handler** of Executive L3 | IT Workers | Hyderabad / Telangana |
| 6 | **Moderator** — Suresh Moderator | `+919000000105` | `tu` | verified | `member` `moderator` | — | IT Workers | Hyderabad / Telangana |
| 7 | **Membership Admin** — Lakshmi Admin | `+919000000106` | `tu` | verified | `member` `membership_admin` | — | IT Workers | Hyderabad / Telangana |
| 8 | **Verified Member (core)** — Asha Member | `+919000000107` | `tu` | verified | `member` | — | IT Workers | Hyderabad / Telangana |
| 9 | **Verified Member (other group = negative-test)** — Omar Other | `+919000000108` | `tu` | verified | `member` | — | **Transport** | Hyderabad / Telangana |
| 10 | **Pending Applicant** — Late Joiner | `+919000000109` | `tu` | **pending** | `member` | — | IT Workers | Hyderabad / Telangana |

> **TU member_numbers:** `TU-0001` (Abhinay) then `TU-0101` … `TU-0109`. SU founder is `SU-0001`.

### What each role CAN and CANNOT do (server-enforced)

| role | can | cannot |
|---|---|---|
| **Platform Super Admin** (1) | `create_organization`; `is_platform_admin()` bypass for tenant reads; `appoint_committee_member(..., p_override=true)` with required reason (flagged `is_super_admin_override`); read `audit_logs`; read all committees/posts/issues via `is_platform_admin()` branch in policies | Use `platform_admins` as tenant role (CHECK prevents `platform_admin` inside `profiles.roles`); remove last active platform admin (trigger); act as scheduler (`process_issue_deadlines` rejects `auth.uid() IS NOT NULL`) |
| **Org Admin** (2, 3) | `set_member_status` (approve/reject/suspend/ended, reason required for negative actions), `set_member_roles`, `admin_list_members` (sees phone/email), `upsert_committee`, `upsert_routing_rule`, `update_tenant_config`, `appoint_committee_member(..., p_method='Appointment')` (active immediately), `set_appointment_status`, `publish_post('official', scope='org')`, `moderate_post`, read `audit_logs` for own tenant only | Create organizations; appoint without authority (non-admin `AppointCommittee` rejected); remove own `org_admin` (rejected); view other tenant's data (RLS returns 0 rows) |
| **Committee Chair L1** (4) | `can_publish('official'/'committee', scope='group'/'local'/'committee')` limited to owned committee's coverage; `appoint_committee_member(..., p_method='Nomination & approval')` (creates `pending` nomination); `can_handle_issue` for issues routed to own committee (and `handled_committee_ids` after escalation); `issue_action(assign/acknowledge/start/request_info/resolve/…)` on those issues | Publish to `org` (only L3 general chairs can); `set_member_status` (not authorized); approve own nomination (needs org admin); handle confidential issue in other committee (hidden) |
| **Issue Handler L3** (5) | Handle any issue at L3 including confidential (policy allows `Chair`/`Issue handler` for confidential); `issue_action(add_note)` (internal_notes hidden from complainant); `escalate_issue` (manual, reason required, `p_expected_level` guards duplicate) | Handle L1 issue (not member of that committee, `can_handle_issue` false); act on own complaint (`is_my_issue` blocks handler actions except `add_note` as platform case — otherwise rejected) |
| **Moderator** (6) | `moderate_post(pin/unpin/remove/restore)`, read `post_reports`, `can_view_post` for all via `has_tenant_role('moderator')` | `set_member_status`, `set_member_roles`, `upsert_committee` (needs org_admin) |
| **Membership Admin** (7) | `set_member_status` (approve/reject/suspend — same as org_admin but **cannot** `set_member_roles` or change tenant config/committees); `admin_list_members` | `set_member_roles`, `upsert_committee`, `publish_post('official', scope='org')` (needs org_admin or chair) |
| **Verified Member** (8, 9) | `create_issue` (routed by `routing_rules` → group L1 or triage), `issue_action(reply/confirm/reopen)` on own issues only, `publish_post('member', scope='local'/'group'/'committee')` limited to own `in_audience`, `toggle_like`, `add_comment`, `report_post`, chat `INSERT group_messages` only in own channel | `publish_post('official', scope='org')` (rejected `not authorized`), `issue_action(resolve/assign)` (rejected `not authorized to act`), read `audit_logs` (0 rows), read `internal_notes` (0 rows), SELECT `phone` column (permission denied — only `get_my_memberships` reveals own phone) |
| **Pending Member** (10) | `get_my_memberships` shows `status=pending`; nothing else until approved | `SELECT * FROM posts/issues` returns 0 rows; `create_issue` rejected `Only verified members can raise issues`; no content access (verified by test `new applicants are pending…`) |

---

## 3. Manual test scripts (OTP → approval → post → issue → audit → search isolation)

> Replace `91900…` with real phone numbers when testing on a live Supabase project. Each flow starts **signed out** (`Profile → Sign out`).

### Flow A — Platform Super Admin creates the world

1. **Sign in** as Platform Super Admin (`+91 7995731200`): Welcome → enter phone → 6-digit OTP → `verifyOtp`.
2. **Expect:** organization wizard appears (or, if TU already exists, the profile shows the org switcher with TU).
3. **If TU missing:** Create it — Name `Test union`, Code `TU`, Short `TU`, HQ `Hyderabad / Telangana`, Terminology `Cadre / Issue` → Share screen shows code `TU`.
4. **Verify:** `supabase.from('platform_admins').select()` not readable from client (RLS: 0 policies) — confirms no client leak.
5. **Create SU** for isolation testing: `create_organization('Second Union','SU','SU','Second test org','{}','Vikram Singular','','Pune','Maharashtra')` via the same screen; SU appears in org switcher only for you until you add members.
6. **Negative:** try to `UPDATE platform_admins SET active=false` for the last admin — DB rejects `Cannot remove the last active Platform Super Admin`.

### Flow B — Org Admin approves a pending member

1. Sign in as **Pending Late Joiner** `919000000109`: OTP → org code `TU` → name `Late Joiner` → city `Hyderabad` → region `Telangana` → group `IT Workers` → `register_member` → status `pending`. The app shows `pending.tsx` (Application under review). Confirm: Issues feed is empty, Home feed returns 0 `posts`, `create_issue` disabled.
2. **Switch persona:** sign out, sign in as **Membership Admin** `919000000106` (or Org Admin `919000000101`). Open `Manage → Members`.
3. **Approve:** tap `Late Joiner` → `Approve`. Under the hood: `SELECT set_member_status($1,'verified')`. Expect toast + audit row `Membership Verified`.
4. **Re-login as Late Joiner** (same OTP): now verified — `get_my_memberships` shows `tu:verified`, Home/Issues/Groups load, `create_issue` enabled.
5. **Negative:** sign in as **Verified Member Asha** `919000000107` and try to approve another pending — `set_member_status` throws `Not authorized to change memberships`.

### Flow C — Verified member posts; search isolation

1. Sign in as **Asha** `919000000107` (IT Workers, Hyderabad): Home → `Member post` composer → body `Hello IT folks` → audience `Hyderabad · City` or `IT Workers · Cadre` → Publish. Expect: `publish_post('member', ...)` succeeds; `can_publish` passes `in_audience`.
2. Try to publish as member to `Transport`: `publish_post('member', scope='group', value='Transport')` → rejected `not authorized` (you are not in Transport — `in_audience` false).
3. **Search isolation:** open `Search` → filter Members by `Transport` — Omar appears, Asha does not when filtering `Transport, Hyderabad` with group=Transport. Search for posts: `Hello IT folks` appears for Asha and other IT Workers, **not** for Omar when his feed is Group-filtered (policy `can_view_post` checks `in_audience`). Try `SELECT * FROM posts WHERE tenant_id='su'` as Asha — 0 rows.

### Flow D — Official announcement (org admin + chair) with audience dedup

1. Sign in as **Priya (Org Admin)** `919000000101`: `Manage → New announcement` → Title `IT meeting` → Body `Sunday 10am` → Audiences `IT Workers` + `Hyderabad` (two overlapping) → Toggle `Notify audience` **on** → `Publish & notify`. Expect: two `posts` rows (one per audience) + `publish_post` dedup: each IT/Hyderabad member gets **one** `notifications` row + one `notification_outbox` row despite two audiences. Check: `SELECT count(*) FROM notifications WHERE event_key = 'announcement-' || md5(...)` = 1 per recipient.
2. Sign in as **Omar (Transport)** `919000000108`: `posts WHERE title='IT meeting'` → 1 row (because Hyderabad local matches). Sign in as **Anita (Chair L1)** `919000000103`: can also publish official to `IT Workers` (her committee's group) — succeeds; try to publish to `org` → rejected (only L3 general chair or org_admin can do `scope='org'`).

### Flow E — Issue raise → handler assign → internal note vs member reply → escalation → audit

1. **Raise:** sign in as **Asha** `919000000107`: `Issues → + Raise` → Category `Wages` → Title `Night shift unpaid` → Details `3 nights in Sep` → Priority `high` → Submit. Expect `create_issue` returns `TU-1xxx`; row has `committee_id = Hyderabad IT Workers L1`, `status=submitted`, `due_at = NOW()+48h`, notification to committee.
2. **Negative routing:** sign in as **Omar** `919000000108` (Transport): raise with category `Wages` (Transport has no L1 committee) → `status=triage`, `committee_id=NULL`, notification to `notify_org_admins` only — handler cannot see it (`SELECT * FROM issues WHERE id=$1` as Anita returns 0).
3. **Handler flow:** sign in as **Anita (Chair L1)** `919000000103`: `Manage → Issue queue` shows `Night shift unpaid`. `Assign` → choose self or Ramesh? Actually Ramesh is L3, not eligible for L1 confidential — choose Anita (Chair). `issue_action('assign', {profile_id: anitaProfileId})` → status `assigned`. Then `Request info` → text `Attach payslips` → status `awaiting_member`.
4. **Internal note isolation:** still as Anita: `Add note` → `Employer history of late pay` → `SELECT * FROM internal_notes WHERE issue_id=$1` as Anita = 1 row; as **Asha** = 0 rows (policy `can_handle_issue`).
5. **Member reply:** sign in as **Asha**: `Reply` → `Payslips attached` → status back to `in_progress`. Anita sees the reply in `member_replies`.
6. **Escalate:** sign in as **Anita**: `Escalate` → reason `Employer refuses to engage` → level `2`, committee becomes `Telangana IT Workers L2`, previous committee kept in `handled_committee_ids`, timeline gets new stage with `reason`. Try duplicate `escalate_issue(..., p_expected_level=1)` → rejected `already escalated to level 2`.
7. **Audit & notifications:** sign in as **Priya (Org Admin)**: `Manage → Audit` shows `Create Issue`, `Case Assign`, `Case Request_info`, `Add Internal Note`, `Case Reply`, `Manual Escalate Case` with correct `actor_name` and `reason`. Query `SELECT * FROM notifications WHERE kind='escalation'` → one row for Asha with `event_key='issue-escalated-TU-xxx-L2'` and generic push body `There is an update to your case.` (no confidential details).

### Flow F — Moderation & security invariants

1. As **Suresh (Moderator)** `919000000105`: open the `IT meeting` post → `Moderate → Remove` with reason → `posts` hidden for Asha (`can_view_post` now false due to `removed`).
2. As **Asha** (member): try `moderate_post('pin')` → rejected `Not authorized`.
3. As **Lakshmi (Membership Admin)** `919000000106`: `set_member_roles` → rejected `Only organization admins can change roles`; `admin_list_members('tu')` succeeds (sees phone/email); `admin_list_members('su')` returns 0 (not a member).
4. As **Anita**: suspend test — Org Admin suspends Omar: `set_member_status(omarId,'suspended','Conduct review')` → Omar's `posts/issues` become 0 rows (RLS `is_member` requires `status='verified'`), his committee appointment (if any) becomes `suspended`.

### Flow G — Cross-tenant isolation (SU)

1. Sign in as **Vikram (Org Admin SU)** `919000000102`: `tenants` list shows only `su`; `profiles WHERE tenant_id='tu'` returns 0; `create_issue('tu', ...)` rejected `Only verified members can raise issues in this organization` (not a member of TU).
2. Create an issue in SU, confirm it never appears in TU's `Manage → Issue queue` when signed in as Priya (TU org admin).

---

## 4. Seeded credentials (for emulators / PGlite; swap to real OTP on live)

| persona | phone | OTP note |
|---|---|---|
| Platform Super Admin | 7995731200 | Real OTP via Supabase Auth |
| Priya Rao (Org Admin TU) | 919000000101 | PGlite: `createUser(db,'919000000101')`; Live: obtain OTP |
| Vikram Singh (Org Admin SU) | 919000000102 | same |
| Anita Desai (Chair L1) | 919000000103 | same |
| Ramesh Kumar (Handler L3) | 919000000104 | same |
| Suresh Moderator | 919000000105 | same |
| Lakshmi Membership Admin | 919000000106 | same |
| Asha Member | 919000000107 | same |
| Omar Other | 919000000108 | same |
| Late Joiner (pending) | 919000000109 | stays pending until Flow B |

All `auth.users.phone_confirmed_at = NOW()` in the seed so `is_platform_admin()` passes.

---

## 5. RLS contract (must stay green)

- `profiles.column privileges` hide `phone/email/notification_prefs` from non-admin directory queries. Verified by `the shared directory never exposes phone, email or preferences`.
- `tenants` policy: only own tenants (+ platform admin).
- `issues`/`internal_notes`/`member_replies`/`issue_attachments`: `is_my_issue OR can_handle_issue`.
- `posts`/`comments`/`post_likes`/`post_reports`: `can_view_post` / `in_audience`.
- `group_messages`: `in_audience` on both read and write; `author_profile_id = my_profile_id`.
- `notifications`: recipient-only.
- `audit_logs`: org_admin or platform_admin only; `append-only` trigger blocks UPDATE/DELETE.
- Every RPC re-validates `auth.uid()` — the client never decides authorization.

Run `npm test` before shipping; `supabase/schema.sql` + `supabase/seed-ten-levels.sql` must both be idempotent (`ON CONFLICT DO NOTHING / DO UPDATE`).

---

*Generated for union PRD v1.2. See `supabase/seed-ten-levels.sql` (service-role seed) and `test/ten-levels.test.mjs` (PGlite proof).*

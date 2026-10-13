# Union — Fixes for the PRD code review

Branch: `fix/prd-review-findings` (based on `f9e1d58`)
Scope: every finding from both code reviews (the review of `4360b4f` and the re-review of `f9e1d58`),
plus problems found while fixing them. Each entry lists **the problem**, **what changed**, **where**,
and **how it is verified**.

## How this was verified

| Check | Result |
|---|---|
| `npm run lint` (TypeScript) | ✅ 0 errors |
| `npm test`: `test/rls.test.mjs` runs `supabase/schema.sql` on real PostgreSQL 18 (PGlite) and acts as different users through RLS | ✅ 29 / 29 |
| `test/migration.test.mjs`: loads the **previous** schema with data, then the new one, twice | ✅ 1 / 1 |
| `test/format.test.mjs`: unit tests that import the real TypeScript helpers | ✅ 11 / 11 |
| `npx expo export --platform android` / `--platform web` | ✅ bundles build; no secret keys or admin keys in the bundle |
| Web build opened in a browser | ✅ sign-in screen renders, no console errors, admin-key field gone |

**Not verified:**
- I didn't sign in end-to-end against your live Supabase project, because that sends real SMS and needs the new schema applied there first.
- The `dispatch-push` Edge Function wasn't executed (no Deno/Supabase CLI here).
- I didn't run a native build on a device.

---

## Architecture change (applies to most fixes)

| Before | After |
|---|---|
| The app decided who could do what. It wrote tables directly, used the Auth Admin API, and could run with the service-role key. | The app holds only the publishable key and the user's session. **Reads** go through Row Level Security. **Every privileged write** is a `SECURITY DEFINER` database function that re-checks `auth.uid()` against membership, committee appointment and role. Clients have no INSERT/UPDATE/DELETE grants on any table except policy-checked chat inserts. |
| One profile per person, with `id` = auth user id | **One membership per person per organization**: `profiles.id` is the membership and `profiles.user_id` is the person. |
| `super_admin` was a role inside a tenant's profile | Platform Super Admin is a platform-level record (`platform_admins`, matched on the verified auth phone). Tenant roles are limited by a CHECK constraint to `member`, `org_admin`, `membership_admin`, `moderator`. Committee authority comes only from active `committee_members` rows. |

Key files: `supabase/schema.sql` (rewritten, idempotent, migrates the old version), `src/services/db.ts`,
`src/store/AppStore.tsx`, `src/store/types.ts`, `src/lib/format.ts`, `src/services/push.ts`,
`supabase/functions/dispatch-push/index.ts`, `docs/OPERATIONS.md`.

---

## Part A: Critical security findings (re-review of `f9e1d58`)

### A1. Service-role key could ship inside the app
- **Problem:** `src/services/supabase.ts` read `EXPO_PUBLIC_SUPABASE_SERVICE_KEY` and preferred it over the anon key. That key is compiled into the bundle and bypasses all RLS. `USER_GUIDE.md` even told people to set it.
- **Fix:**
  - Removed the variable and `activeSupabaseKey`. The client only ever uses the publishable key.
  - Env vars are now read statically (`process.env.EXPO_PUBLIC_X`); the old dynamic `process.env[key]` access is not inlined by Expo, so builds silently used the fallback.
  - Updated the guide with a warning.
  - `docs/OPERATIONS.md §0` explains rotating the key if it was ever set.
- **Verified:** bundle scan finds no key; `grep SERVICE_KEY` in the repo finds nothing.

### A2. Client used the Auth Admin API and created users with a guessable password
- **Problem:**
  - `ensureSupabaseAuthUser` in `db.ts` listed and created auth users from the client.
  - It set the password `UnionAuth!<phone digits>`, so anyone who knew a phone number could sign in as that person.
- **Fix:**
  - Deleted the function and every Admin API call.
  - Accounts are created only by Supabase Auth phone OTP (`signInWithOtp` / `verifyOtp`).
  - Memberships are created by `register_member()` / `create_organization()`, which take the identity from the session.
  - `docs/OPERATIONS.md §0` has SQL to disable passwords on previously created synthetic accounts.
- **Verified:** no `auth/v1/admin` calls remain; the RLS tests create memberships only through RPCs.

### A3. Admin access guarded by a hardcoded key and phone list inside the app
- **Problem:**
  - `UNION-ADMIN` was the default setup key, and real phone numbers were hardcoded in the client.
  - Admin status was decided on the device.
  - `platform_admins.setup_key` was publicly readable.
- **Fix:**
  - Removed the key, the phone list, `isPhoneAdminWhitelisted` and the "Enter admin key" UI (`app/index.tsx`).
  - Dropped the `setup_key` column.
  - `is_platform_admin()` matches the **verified** auth phone (`phone_confirmed_at`) against `platform_admins`, server-side.
  - `platform_admins` has no client grants at all, and a trigger blocks removing the last active admin.
  - Operators add admins in SQL (`docs/OPERATIONS.md §1`).
- **Verified:**
  - Test *"only a Platform Super Admin can create organizations"*.
  - Test *"clients cannot write tables… platform_admins → permission denied"*.
  - Test *"the last active Platform Super Admin cannot be removed"*.

### A4. OTP table fully open
- **Problem:** `otp_verifications` had `FOR ALL USING (true) WITH CHECK (true)`.
- **Fix:** Dropped the table; Supabase Auth handles OTP.
- **Verified:** the migration test asserts the table is gone after upgrade.

### A5. RLS policies allowed cross-organization writes and reads
- **Problem:**
  - `tenants` INSERT/UPDATE were `true`.
  - `committees`, `committee_members`, `geo_units` and `functional_groups` had SELECT/INSERT `true`.
  - Complainants could UPDATE any column of their issue.
  - Members could INSERT audit rows.
  - The `profiles` UPDATE policy had a self-referencing subquery.
- **Fix:**
  - All old policies are dropped programmatically and replaced by tenant-scoped SELECT policies (`is_member`, `in_audience`, `can_handle_issue`, `is_my_issue`, …).
  - Writes on all tables are revoked; changes go only through RPCs.
  - `audit_logs` is append-only: a trigger blocks UPDATE/DELETE, and only definer functions can insert.
  - The `profiles` UPDATE policy no longer exists, so there's nothing to recurse.
- **Verified:**
  - Tests *"a member of org B sees none of org A"*.
  - Test *"clients cannot write tables directly or grant themselves roles"*.
  - Test *"nobody can edit [the audit log]"*.

### A6. A sign-in path without OTP remained
- **Problem:** `login(identifier)` in the store matched by name, email or phone with no verification.
- **Fix:** Removed `login`, `switchPersona` and `personas`. The only way in is a Supabase session.
- **Verified:** `grep "login("` finds nothing; typecheck passes.

### A7. Entire member directory loaded before sign-in; OTP lookup selected every profile
- **Problem:**
  - `hydrateDirectory()` called `getAllMembers()` on app start.
  - `verifyPhoneOtp` ran `select('*')` on all profiles and matched on the device.
- **Fix:**
  - Nothing loads before sign-in.
  - After sign-in, `get_my_memberships()` returns only the caller's own rows.
  - The directory query uses explicit columns, and column privileges hide `phone`, `email` and `notification_prefs` from other members (PRD §4.6).
  - Admins get contact details through `admin_list_members()`, which checks the role.
- **Verified:**
  - Test *"the shared directory never exposes phone, email or preferences"*.
  - Test *"anonymous users can read nothing and call nothing"*.

---

## Part B: Critical findings from the first review (`4360b4f`)

### B1. No real backend or auth; data lost on reload
- **Fix:**
  - Supabase phone OTP sign-in.
  - Sessions persist (`AsyncStorage` on native, `localStorage` on web, `persistSession: true`, auto-refresh while foregrounded).
  - All state is loaded from and written to the database.
  - `authReady` gating prevents flashing the sign-in screen.
- **Files:** `src/services/supabase.ts`, `src/store/AppStore.tsx`, `app/index.tsx`, `app/main/_layout.tsx`.

### B2. Anyone could switch into any account or any organization
- **Fix:**
  - The persona switcher is gone.
  - `switchTenant` only accepts organizations where the user holds a membership.
  - The org sheet in Profile lists only the user's own memberships, with their status.
  - RLS makes other tenants invisible anyway.
- **Verified:** tenant-isolation tests.

### B3. Data from one organization appeared in another
- **Fix:**
  - All tenant data is cleared and reloaded whenever the active tenant or membership changes (`loadTenant`, `clearTenantData`).
  - Every query is tenant-filtered, and RLS enforces it.
  - Realtime channels are per tenant and RLS-filtered.

### B4. Founding admin received `super_admin`
- **Fix:**
  - Organizations can only be created by a Platform Super Admin, who becomes that org's `org_admin`.
  - The founding Chair appointment is recorded as a platform-admin assignment with a reason.
  - `super_admin` can no longer exist in tenant roles (CHECK constraint).
  - The migration strips it from existing rows.
- **Verified:** migration test (`roles` become `member, org_admin`).

### B5. RLS holes (self-promotion, cross-tenant notifications and comments, audit readable by all, handlers seeing every issue, definer functions without auth checks, no insert policies)
- **Fix:**
  - **Self-promotion:** no client UPDATE on profiles; roles change only through `set_member_roles()` (org admin only, and you can't remove your own admin role).
  - **Notifications:** every notification is addressed (NULL broadcasts deleted and no longer created); the policy is recipient-only.
  - **Comments:** carry a `tenant_id` and are visible only to the post's audience.
  - **Audit:** readable only by org admins and platform admins.
  - **Issues:** visible only to the complainant, members of the current or previous committee in the escalation chain (confidential cases: Chair or Issue handler only), org admins (non-confidential), and platform admins.
  - **Functions:** every RPC checks the caller; internal helpers and the scheduler aren't executable by end users; nothing is callable by `anon`.
- **Verified:** RLS tests cover each of these.

---

## Part C: Major PRD gaps

### Issues & escalation (§9)

| # | Problem | Fix | Verified |
|---|---|---|---|
| C1 | Routing hardcoded by category substring, fixed committee IDs, no triage | New **`routing_rules`** table (category → member's group committee / general committee / specific committee, starting level, confidential flag). `create_issue()` resolves the committee by tenant, level, functional group and geography (`find_committee`). **No match → `triage` status, org admins notified**. Default rules are seeded per org and editable in **Manage → Settings**. | *routes by configured rule*, *enters the triage queue*, *Pensions → specific committee* |
| C2 | Confidential category not marked or handled | The rule flag or the member's "Keep confidential" checkbox sets `confidential`. Only Chairs/Issue handlers see the case and can be assigned; push text is generic; every view is audited (`log_case_view`). | *confidential categories are flagged and hidden* |
| C3 | Description, priority, "affects others" dropped; evidence a stub | All saved. Evidence uploads to the private **`evidence`** bucket (path `tenant/issue/file`, storage RLS = case access, 15 MB limit, 60-second signed URLs). Members attach at raise time or later; handlers can add **internal** files. | *attachments: path must match the case* |
| C4 | Member view and handler view out of sync | A single `issues` record; the member list and the handler queue are two filters of the same data, refreshed by realtime. | — |
| C5 | Escalation always went to L2; no deadlines or auto-escalation; duplicates possible; `committee_id` not updated | `escalate_issue()`: reason required; next committee = configured `escalates_to_id` or the next level for the same group, then general; ownership transfers; previous committee keeps history access; previous assignee recorded; deadline reset. **`p_expected_level` blocks duplicate or concurrent escalation.** `process_issue_deadlines()` (pg_cron, every 10 min) sends reminders 24h before and **auto-escalates** overdue cases; scheduler-only. | *escalates one level… blocks duplicate*, *automatic escalation… idempotent* |
| C6 | `awaiting_member`/`triage` never set; reply text ignored; no reopen/reject | `issue_action()` implements controlled transitions: route, assign, acknowledge, start, request info, await external, resolve (summary required), reject (reason), close, plus member reply / confirm / reopen (reason, within a configurable window) and internal notes. Handlers can't act on their own case. | *case lifecycle: route… close* |
| C7 | Schema/TS status mismatch | The schema CHECK includes all 12 statuses (reopened, rejected, awaiting_external). | — |
| C8 | Random, colliding case IDs | `ORGCODE-<sequence>` from `issue_seq`; member numbers from `member_seq`. | `^ORGA-\d+$` |
| C9 | Assign/resolve/approve not audited | Every RPC writes an audit row with actor, role, action, entity and reason. | *org admins can [read audit]* |

### Committees & governance (§4.4, §4.5, §5.11)

| # | Problem | Fix | Verified |
|---|---|---|---|
| C10 | Committee screen bypassed the store; nothing audited | Rewritten `app/manage/committee.tsx` uses `appoint_committee_member()` / `set_appointment_status()`; history is shown from the audit log. | — |
| C11 | Override shown to everyone; no reason | Override shown only to platform admins; the server requires a reason, sets `formation_type = 'Platform admin override'`, and flags the audit row `is_super_admin_override`. | *only a Platform Super Admin can override…* |
| C12 | Members were free-text names | Appointments are picked from verified members and stored with `profile_id`, initiator, approver, start and end dates. | — |
| C13 | No suspend/revoke/replace; hardcoded approval date | Full lifecycle: approve, suspend, reinstate, revoke, replace, expire, each with a reason. Revoking or suspending removes access immediately (end date respected in every check). | *revoking an appointment removes case access* |
| C14 | One committee per org | Unlimited committees per org (level, functional group, geo unit, escalation target, response/resolution hours). The committee list is grouped by level, and committees can be created and edited. | — |
| C15 | Flat roles not tied to scope | Handler/chair authority comes from active appointments; tenant roles are limited and scoped to one membership. | *ordinary member cannot appoint* |

### Membership & onboarding (§4.1, §6)

| # | Problem | Fix | Verified |
|---|---|---|---|
| C16 | One organization per person | Multi-membership (`profiles.user_id` + unique `(user_id, tenant_id)`); "Join another organization" in Profile; org switcher. | *one person… two organizations* |
| C17 | Approval removed (auto-verified) / pending had full access | `register_member()` creates **pending** memberships (unless the org enables *auto-approve* in Settings). The main and manage layouts send pending, suspended, rejected or ended members to `app/pending.tsx`; RLS gives them no content. | *new applicants are pending…* |
| C18 | Anyone could approve | `set_member_status()` requires org admin or membership admin; a reason is required for reject/suspend/end; suspending also suspends committee appointments. New `app/manage/members.tsx`: approve, reject, suspend, reactivate, end, and role assignment. | *a regular member cannot approve*, *suspended members lose access* |
| C19 | Geographic hierarchy unused; Hyderabad/Telangana hardcoded | `ensure_geo_path()` builds country → state → city units from registrations; member counts maintained. Hardcoded place names removed from all screens. | *new applicants are pending* (asserts city/state/country units) |

### Configuration (§4.2, §5.10, AC #20)

| # | Problem | Fix |
|---|---|---|
| C20 | Terminology discarded / `updateTerminology` unused | `create_organization()` stores custom terms; new **Manage → Settings** edits all six labels plus policies (auto-approve, member posts, reopen window) through `update_tenant_config()`, audited. |
| C21 | `createTenant` returned the wrong ID | Removed; the server derives the ID from the code and returns it. |

### Feed & announcements (§8)

| # | Problem | Fix | Verified |
|---|---|---|---|
| C22 | Audience always `org`; count hardcoded 1200; Notify toggle ignored; fake preview | `publish_post()` checks authority per audience (`can_publish`: org admins anywhere; committee Chairs/Secretaries only their committee's scope; members only their own groups). Multiple audiences, a server-side **audience count**, `notify_push` saved, pin, **expiry**, and a preview with the real author. Options shown are only those within the user's authority. | *a member cannot publish official…*, *group audiences are enforced on read* |
| C23 | "My groups" filter showed your own posts | Filters by the post's audience matching your unit, region, groups or committees. Feed is chronological; **pinned official announcements stay on top and can't be muted**. | — |
| C24 | No comments; likes on device only; report/mute did nothing; no moderation | `post_likes` (server, optimistic UI), comments (`add_comment`, `app/post.tsx`), `report_post` (moderators notified), local mute, `moderate_post` (pin/unpin/remove/restore with reason; authors can delete their own). Member posting via a composer on Home. | *feed: like, comment, report, moderate* |

### Notifications (§11)

| # | Problem | Fix | Verified |
|---|---|---|---|
| C25 | Alerts screen hardcoded empty; unread count hardcoded 0 | Notifications load from the DB (RLS: own only), grouped Today/Earlier by real timestamps, realtime refresh, server-side read state (`mark_notifications_read`). | — |
| C26 | `markAllRead` marked everything unread | Fixed: marks all read locally and on the server. | *mark_notifications_read* |
| C27 | No push, device tokens or deep links | `expo-notifications`: permission, Expo token registered with `register_device_token` (rotation hands the token to the new user), unregistered on sign-out. Notification taps deep-link; target screens (`/issue`, `/post`, `/manage/case`) **re-fetch through RLS**, so a stale push never grants access. Durable `notification_outbox` → **`dispatch-push` Edge Function**: batching, retries with backoff, invalid-token cleanup, quiet hours, delivery status, provider abstraction. Server-side recipient resolution, **deduplicated by event + recipient**, generic lock-screen text for cases. | *notify-audience reaches only the targeted audience, once*, *case push text never carries case details* |
| C28 | Notification preferences not saved | `update_my_prefs()` saves preferences (case updates can't be turned off) and quiet hours; the dispatcher honours them. | *mandatory category stays on* |

### Groups, org chart, search (§4.7, §7, §8.2, §13)

| # | Problem | Fix |
|---|---|---|
| C29 | Groups did nothing; no chat or committee channels | Rows open `app/group.tsx`: the space's posts plus **group chat** (`group_messages`, RLS = channel membership, realtime). The city, state and national places come from the member's registration. Committee channels are listed and readable only by active appointees. Verified by *chat channel membership* (write to a foreign channel is rejected by RLS). |
| C30 | Org chart static; escalation route hardcoded | `app/main/org.tsx` builds the tree from geo units, committees and functional groups (distinct node types; names and positions only). Representatives are the active appointees on the member's computed route; the route follows each committee's configured escalation target. The "Message" button was removed (DMs are optional in the PRD and not enabled). |
| C31 | Search buttons did nothing | New `app/search.tsx`: members (filter by group/city), posts, and cases. It searches only data RLS already returned, so it can't reveal unauthorized records. |

### Access control in the UI (§7.1)

| # | Problem | Fix |
|---|---|---|
| C32 | `/manage/*` reachable by URL | New `app/manage/_layout.tsx` route guard (signed in → verified → leader), plus per-screen role checks (`Restricted`). The server enforces the same rules independently. |

---

## Part D: Build, repo and process

| # | Problem | Fix |
|---|---|---|
| D1 | CI ran a missing build script and Capacitor | Separate **test** job (typecheck + `npm test`, also on pull requests) and **build** job (Node 22, `expo export`, `expo prebuild` so new native modules apply, Gradle). Public Supabase values come from repository `vars`. |
| D2 | Tests didn't test the app | Removed `test/tenant-isolation.test.mjs`. Added real integration tests (`test/rls.test.mjs`, 29), a migration test, and unit tests that import the real source. |
| D3 | Leftover prototype and mock data | Removed `Design system react native/mobile/` (old prototype app incl. `src/data/mock.ts`) and the duplicate `Design system setup form/` folder. |
| D4 | Third-party notices | `THIRD_PARTY_NOTICES.md` updated for new packages; states that no code was copied from the §15.3 candidate repos. |
| D5 | Web admin (Next.js) missing | Not built. The Expo `/manage` area runs on the web against the same RLS backend; the decision is recorded in `docs/OPERATIONS.md §6`. |
| D6 | UI text overselling ("Production Engine", "Recorded in audit trail") | Copy now matches behaviour. "Backend not configured" shows when env vars are missing. Every "recorded"/"audited" claim is now true. |
| D7 | Docs published admin keys and service-key advice | `USER_GUIDE.md` / `.html` rewritten for the real flows; new `docs/OPERATIONS.md` runbook covering setup, admins, key rotation, push, scheduler, monitoring and native builds. |

---

## Part E: Problems found while fixing

| # | Problem | Fix |
|---|---|---|
| E1 | `app/manage/queue.tsx` and `app/manage/announce.tsx` called `useState` **after an early return** (breaks React's rules of hooks; can crash when the role changes) | All hooks run before any return in every rewritten screen. |
| E2 | Dynamic `process.env[key]` reads are not inlined by Expo, so builds silently used the fallback project | Static `process.env.EXPO_PUBLIC_*` reads. |
| E3 | `schema.sql` couldn't upgrade an existing DB (old policies depended on functions dropped first) | Old policies are dropped first, then legacy functions; covered by `test/migration.test.mjs` (run twice to prove it can be re-run). |
| E4 | "First response" metric was a hardcoded `1.4d` | New `issues.first_response_at`, set on the first handler action; the dashboard shows the real median, plus resolved %, triage count, and workload by handler. |

---

## Upgrade steps

1. If a service key was ever set for a build, **rotate it** (`docs/OPERATIONS.md §0`).
2. Run `supabase/schema.sql` in the SQL editor (it migrates in place), enable `pg_cron`, and add your platform admins.
3. Deploy and schedule `dispatch-push`; set `CRON_SECRET`.
4. Set `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` (GitHub `vars`, EAS env), then `npx expo prebuild` and rebuild.

## Still open / out of scope

- **MFA for Platform Super Admins** (PRD §5.11). Phone OTP is single-factor; enforcing `aal2` needs a TOTP enrolment flow.
- **Elections / digital ballots**: an MVP non-goal. Data model hooks exist (`formation_type`), but the app rejects that formation method.
- **Direct messages**: optional in the PRD and not enabled.
- **Load testing, localization, accessibility audit** (PRD Phase 4).
- TypeScript `strict` is still off (repo convention); the new code is typed but strict mode would surface older issues.

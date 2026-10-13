-- ==============================================================================
-- UNION — Ten-Level Seed (idempotent)
-- Populates the TU + SU tenants with 10 users across every role without
-- sending OTP. Run as service_role / postgres in Supabase SQL editor.
-- Also used as reference for PGlite tests (test/ten-levels.test.mjs rebuilds
-- the same roster programmatically). Safe to re-run: every INSERT uses
-- ON CONFLICT DO NOTHING / DO UPDATE.
-- ==============================================================================

-- ---------------------------------------------------------------------------
-- 0. Platform Super Admin (Abhinay) — already exists in live, ensure present
-- ---------------------------------------------------------------------------
INSERT INTO platform_admins (phone, name) VALUES ('+917995731200', 'Abhinay')
ON CONFLICT (phone) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 1. Tenants
-- TU already exists (id=tu). SU is the second org for cross-tenant isolation.
-- ---------------------------------------------------------------------------
INSERT INTO tenants (id, name, short_name, code, description, terminology, settings, active)
VALUES (
  'tu', 'Test union', 'TU', 'TU', 'Test union — primary test tenant',
  '{"orgLabel":"Organization","level1Label":"City","level2Label":"State","level3Label":"National","groupLabel":"Cadre","caseLabel":"Issue"}'::jsonb,
  '{"autoApproveMembers":false,"reopenWindowDays":30,"memberPosts":true}'::jsonb, TRUE
) ON CONFLICT (id) DO NOTHING;

INSERT INTO tenants (id, name, short_name, code, description, terminology, settings, active)
VALUES (
  'su', 'Second Union', 'SU', 'SU', 'Second Union — isolation test tenant',
  '{"orgLabel":"Organization","level1Label":"City","level2Label":"State","level3Label":"National","groupLabel":"Functional Group","caseLabel":"Issue"}'::jsonb,
  '{"autoApproveMembers":false,"reopenWindowDays":30,"memberPosts":true}'::jsonb, TRUE
) ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Geo units (TU already has its 3; ensure SU's 3)
-- ---------------------------------------------------------------------------
INSERT INTO geo_units (id, tenant_id, name, type, kind, parent_id) VALUES
  ('tu-country-india', 'tu', 'India', 'country', 'Country', NULL),
  ('tu-state-telangana', 'tu', 'Telangana', 'state', 'State', 'tu-country-india'),
  ('tu-city-telangana-hyderabad', 'tu', 'Hyderabad', 'city', 'City', 'tu-state-telangana')
ON CONFLICT (id) DO NOTHING;

INSERT INTO geo_units (id, tenant_id, name, type, kind, parent_id) VALUES
  ('su-country-india', 'su', 'India', 'country', 'Country', NULL),
  ('su-state-maharashtra', 'su', 'Maharashtra', 'state', 'State', 'su-country-india'),
  ('su-city-maharashtra-pune', 'su', 'Pune', 'city', 'City', 'su-state-maharashtra')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Functional groups (both tenants)
-- ---------------------------------------------------------------------------
INSERT INTO functional_groups (id, tenant_id, name, category, geographic_scope) VALUES
  ('tu-grp-it-workers', 'tu', 'IT Workers', 'Functional group', 'Organization-wide'),
  ('tu-grp-transport', 'tu', 'Transport', 'Functional group', 'Organization-wide'),
  ('tu-grp-administration', 'tu', 'Administration', 'Functional group', 'Organization-wide')
ON CONFLICT (id) DO NOTHING;

INSERT INTO functional_groups (id, tenant_id, name, category, geographic_scope) VALUES
  ('su-grp-it-workers', 'su', 'IT Workers', 'Functional group', 'Organization-wide'),
  ('su-grp-transport', 'su', 'Transport', 'Functional group', 'Organization-wide'),
  ('su-grp-administration', 'su', 'Administration', 'Functional group', 'Organization-wide')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Committees
-- TU Executive (L3) already exists as 200d68f4-27a2-4210-afda-ea6264b75d13.
-- Ensure TU L1/L2 and SU Executive exist.
-- ---------------------------------------------------------------------------
-- TU L2 State (escalates to Executive)
INSERT INTO committees (id, tenant_id, name, scope, level, functional_group, geo_unit_id, escalates_to_id, method, term, response_hours, resolution_hours, active)
VALUES (
  'tu-l2-tg-it', 'tu', 'Telangana IT Workers Committee', 'Telangana', 2,
  'IT Workers', 'tu-state-telangana', '200d68f4-27a2-4210-afda-ea6264b75d13',
  'Appointment', '2026', 48, 336, TRUE
) ON CONFLICT (id) DO NOTHING;

-- TU L1 City (escalates to L2)
INSERT INTO committees (id, tenant_id, name, scope, level, functional_group, geo_unit_id, escalates_to_id, method, term, response_hours, resolution_hours, active)
VALUES (
  'tu-l1-hyd-it', 'tu', 'Hyderabad IT Workers Committee', 'Hyderabad', 1,
  'IT Workers', 'tu-city-telangana-hyderabad', 'tu-l2-tg-it',
  'Appointment', '2026', 48, 336, TRUE
) ON CONFLICT (id) DO NOTHING;

-- Backfill tu-l2 escalates_to if seed ran before executive existed (harmless)
UPDATE committees SET escalates_to_id = '200d68f4-27a2-4210-afda-ea6264b75d13'
WHERE id = 'tu-l2-tg-it' AND escalates_to_id IS NULL;

-- SU Executive (created deterministically so tests can reference it)
INSERT INTO committees (id, tenant_id, name, scope, level, method, term, responsibilities, active)
VALUES (
  'su-exec-0001', 'su', 'Second Union Executive Committee', 'Organization-wide', 3,
  'Appointment', '2026',
  '{"handles":"Organization-wide and escalated grievances","escalatesTo":"Final level","publishScope":"Whole organization"}'::jsonb,
  TRUE
) ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. auth.users — 9 deterministic test users (phones 101..109)
-- Abhinay (7995731200) already exists in live; insert is a no-op there.
-- In PGlite the auth.users table is minimal (id, phone, phone_confirmed_at).
-- Live Supabase has more columns but they have defaults, so this succeeds
-- when run as postgres / service_role.
-- ---------------------------------------------------------------------------
INSERT INTO auth.users (id, phone, phone_confirmed_at) VALUES
  ('00000000-0000-4000-8000-00000000101', '919000000101', NOW()),
  ('00000000-0000-4000-8000-00000000102', '919000000102', NOW()),
  ('00000000-0000-4000-8000-00000000103', '919000000103', NOW()),
  ('00000000-0000-4000-8000-00000000104', '919000000104', NOW()),
  ('00000000-0000-4000-8000-00000000105', '919000000105', NOW()),
  ('00000000-0000-4000-8000-00000000106', '919000000106', NOW()),
  ('00000000-0000-4000-8000-00000000107', '919000000107', NOW()),
  ('00000000-0000-4000-8000-00000000108', '919000000108', NOW()),
  ('00000000-0000-4000-8000-00000000109', '919000000109', NOW())
ON CONFLICT (id) DO NOTHING;

-- For live Supabase, ensure phone_confirmed_at is set (is_platform_admin requires it)
UPDATE auth.users SET phone_confirmed_at = NOW() WHERE id IN (
  '00000000-0000-4000-8000-00000000101','00000000-0000-4000-8000-00000000102',
  '00000000-0000-4000-8000-00000000103','00000000-0000-4000-8000-00000000104',
  '00000000-0000-4000-8000-00000000105','00000000-0000-4000-8000-00000000106',
  '00000000-0000-4000-8000-00000000107','00000000-0000-4000-8000-00000000108',
  '00000000-0000-4000-8000-00000000109'
) AND phone_confirmed_at IS NULL;

-- ---------------------------------------------------------------------------
-- 6. profiles — one membership per tenant (id is membership uuid, user_id is person)
-- member_numbers TU-0101..TU-0109 and SU-0001 for isolation.
-- Abhinay's TU membership (TU-0001, org_admin) already exists; do not duplicate.
-- ---------------------------------------------------------------------------
INSERT INTO profiles (id, user_id, tenant_id, member_number, name, email, phone, unit, region, country, groups, roles, status) VALUES
  ('11111111-1111-4000-8000-00000000101', '00000000-0000-4000-8000-00000000101', 'tu', 'TU-0101', 'Priya Rao',        'priya@tu.test',   '919000000101', 'Hyderabad', 'Telangana',   'India', ARRAY['Administration'], ARRAY['member','org_admin'],        'verified'),
  ('11111111-1111-4000-8000-00000000103', '00000000-0000-4000-8000-00000000103', 'tu', 'TU-0103', 'Anita Desai',      'anita@tu.test',   '919000000103', 'Hyderabad', 'Telangana',   'India', ARRAY['IT Workers'],     ARRAY['member'],                   'verified'),
  ('11111111-1111-4000-8000-00000000104', '00000000-0000-4000-8000-00000000104', 'tu', 'TU-0104', 'Ramesh Kumar',     'ramesh@tu.test',  '919000000104', 'Hyderabad', 'Telangana',   'India', ARRAY['IT Workers'],     ARRAY['member'],                   'verified'),
  ('11111111-1111-4000-8000-00000000105', '00000000-0000-4000-8000-00000000105', 'tu', 'TU-0105', 'Suresh Moderator', 'suresh@tu.test',  '919000000105', 'Hyderabad', 'Telangana',   'India', ARRAY['IT Workers'],     ARRAY['member','moderator'],        'verified'),
  ('11111111-1111-4000-8000-00000000106', '00000000-0000-4000-8000-00000000106', 'tu', 'TU-0106', 'Lakshmi Admin',    'lakshmi@tu.test', '919000000106', 'Hyderabad', 'Telangana',   'India', ARRAY['IT Workers'],     ARRAY['member','membership_admin'], 'verified'),
  ('11111111-1111-4000-8000-00000000107', '00000000-0000-4000-8000-00000000107', 'tu', 'TU-0107', 'Asha Member',      'asha@tu.test',    '919000000107', 'Hyderabad', 'Telangana',   'India', ARRAY['IT Workers'],     ARRAY['member'],                   'verified'),
  ('11111111-1111-4000-8000-00000000108', '00000000-0000-4000-8000-00000000108', 'tu', 'TU-0108', 'Omar Other',       'omar@tu.test',    '919000000108', 'Hyderabad', 'Telangana',   'India', ARRAY['Transport'],      ARRAY['member'],                   'verified'),
  ('11111111-1111-4000-8000-00000000109', '00000000-0000-4000-8000-00000000109', 'tu', 'TU-0109', 'Late Joiner',      'late@tu.test',    '919000000109', 'Hyderabad', 'Telangana',   'India', ARRAY['IT Workers'],     ARRAY['member'],                   'pending')
ON CONFLICT (id) DO NOTHING;

-- SU founder (separate tenant for isolation proof)
INSERT INTO profiles (id, user_id, tenant_id, member_number, name, email, phone, unit, region, country, groups, roles, status) VALUES
  ('11111111-1111-4000-8000-00000000102', '00000000-0000-4000-8000-00000000102', 'su', 'SU-0001', 'Vikram Singh', 'vikram@su.test', '919000000102', 'Pune', 'Maharashtra', 'India', ARRAY['Administration'], ARRAY['member','org_admin'], 'verified')
ON CONFLICT (id) DO NOTHING;

-- Ensure (user_id, tenant_id) uniqueness is respected on re-run
-- (profiles_user_tenant_uq prevents duplicate memberships)

-- ---------------------------------------------------------------------------
-- 7. committee_members — appointments (idempotent)
-- ---------------------------------------------------------------------------
-- Anita Desai → Chair of Hyderabad L1
INSERT INTO committee_members (id, committee_id, tenant_id, profile_id, name, role, formation_type, method, since, status, start_date, is_override)
VALUES ('cm-anita-l1', 'tu-l1-hyd-it', 'tu', '11111111-1111-4000-8000-00000000103', 'Anita Desai', 'Chair', 'Appointment', 'Appointment', '01 Jan 2026', 'active', NOW(), FALSE)
ON CONFLICT (id) DO NOTHING;

-- Ramesh Kumar → Issue handler of Executive L3 (national)
INSERT INTO committee_members (id, committee_id, tenant_id, profile_id, name, role, formation_type, method, since, status, start_date, is_override)
VALUES ('cm-ramesh-l3', '200d68f4-27a2-4210-afda-ea6264b75d13', 'tu', '11111111-1111-4000-8000-00000000104', 'Ramesh Kumar', 'Issue handler', 'Appointment', 'Appointment', '01 Jan 2026', 'active', NOW(), FALSE)
ON CONFLICT (id) DO NOTHING;

-- Vikram Singh → Chair of SU Executive (isolation tenant)
INSERT INTO committee_members (id, committee_id, tenant_id, profile_id, name, role, formation_type, method, since, status, start_date, is_override)
VALUES ('cm-vikram-su', 'su-exec-0001', 'su', '11111111-1111-4000-8000-00000000102', 'Vikram Singh', 'Chair', 'Appointment', 'Appointment', '01 Jan 2026', 'active', NOW(), FALSE)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 8. Default routing rules for SU (TU already seeded by create_organization)
-- ---------------------------------------------------------------------------
INSERT INTO routing_rules (tenant_id, category, target_kind, start_level, confidential, sort_order, active) VALUES
  ('su', 'Wages', 'group', 1, FALSE, 10, TRUE),
  ('su', 'Working hours', 'group', 1, FALSE, 20, TRUE),
  ('su', 'Health & safety', 'group', 1, FALSE, 30, TRUE),
  ('su', 'Facilities', 'general', 1, FALSE, 40, TRUE),
  ('su', 'Harassment (confidential)', 'general', 2, TRUE, 50, TRUE)
ON CONFLICT (tenant_id, category) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 9. Refresh denormalized member counts
-- ---------------------------------------------------------------------------
SELECT refresh_member_counts('tu');
SELECT refresh_member_counts('su');

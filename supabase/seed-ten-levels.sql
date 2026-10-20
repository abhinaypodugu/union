-- ==============================================================================
-- UNION — Ten-Level TEST Seed (idempotent, staging / test projects only)
--
-- Populates the TU + SU tenants with 10 users across every role without sending
-- OTP. Run as postgres / service_role in the Supabase SQL editor of a STAGING or
-- TEST project — never production:
--
--   SET app.allow_test_seed = 'on';
--   -- then paste this file
--
-- Safety:
--   * Refuses to run unless app.allow_test_seed = 'on' is set in the session.
--   * Test phones are in the reserved fictional range +1 555-555-0101..0109
--     (NANP 555-01xx), so no real person can receive an OTP for them and take over
--     a seeded admin account. To sign in as them, add them under
--     Auth → Providers → Phone → "Test phone numbers" with a fixed OTP.
--   * Every role grant / appointment made here is written to audit_logs
--     (actor "Test seed"), so the audit trail stays complete (PRD §5.11, §12.4).
--   * No hard-coded ids from any live project: the Executive committee is looked
--     up (or created) per tenant.
--
-- Verified by test/seed.test.mjs, which executes this exact file on PGlite.
-- ==============================================================================

DO $$
BEGIN
  IF coalesce(current_setting('app.allow_test_seed', true), '') <> 'on' THEN
    RAISE EXCEPTION 'Refusing to run the test seed. Use a staging/test project and run: SET app.allow_test_seed = ''on'';';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1. Tenants
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
-- 2. Geo units
-- ---------------------------------------------------------------------------
INSERT INTO geo_units (id, tenant_id, name, type, kind, parent_id) VALUES
  ('tu-country-india', 'tu', 'India', 'country', 'Country', NULL),
  ('tu-state-telangana', 'tu', 'Telangana', 'state', 'State', 'tu-country-india'),
  ('tu-city-telangana-hyderabad', 'tu', 'Hyderabad', 'city', 'City', 'tu-state-telangana'),
  ('su-country-india', 'su', 'India', 'country', 'Country', NULL),
  ('su-state-maharashtra', 'su', 'Maharashtra', 'state', 'State', 'su-country-india'),
  ('su-city-maharashtra-pune', 'su', 'Pune', 'city', 'City', 'su-state-maharashtra')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Functional groups
-- ---------------------------------------------------------------------------
INSERT INTO functional_groups (id, tenant_id, name, category, geographic_scope) VALUES
  ('tu-grp-it-workers', 'tu', 'IT Workers', 'Functional group', 'Organization-wide'),
  ('tu-grp-transport', 'tu', 'Transport', 'Functional group', 'Organization-wide'),
  ('tu-grp-civil-wing', 'tu', 'Civil Wing', 'Affiliated Association', 'Organization-wide'),
  ('tu-grp-postal-accounts', 'tu', 'Postal Accounts', 'Affiliated Association', 'Organization-wide'),
  ('tu-grp-group-c', 'tu', 'Group ‘C’', 'Affiliated Association', 'Organization-wide'),
  ('tu-grp-postman-mts', 'tu', 'Postman & MTS', 'Affiliated Association', 'Organization-wide'),
  ('tu-grp-rms-mms', 'tu', 'RMS & MMS', 'Affiliated Association', 'Organization-wide'),
  ('tu-grp-mailguard-mts', 'tu', 'Mailguard & MTS', 'Affiliated Association', 'Organization-wide'),
  ('tu-grp-admin-offices', 'tu', 'Administrative Offices', 'Affiliated Association', 'Organization-wide'),
  ('tu-grp-sbco', 'tu', 'SBCO', 'Affiliated Association', 'Organization-wide'),
  ('tu-grp-supervisors', 'tu', 'Supervisors', 'Affiliated Association', 'Organization-wide'),
  ('tu-grp-gds', 'tu', 'GDS', 'Affiliated Association', 'Organization-wide'),
  ('tu-grp-postal-officers', 'tu', 'Postal Officers', 'Affiliated Association', 'Organization-wide'),
  ('tu-grp-ip-asp', 'tu', 'IP & ASP', 'Affiliated Association', 'Organization-wide'),
  ('su-grp-it-workers', 'su', 'IT Workers', 'Functional group', 'Organization-wide'),
  ('su-grp-transport', 'su', 'Transport', 'Functional group', 'Organization-wide')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Committees — Executive (L3) is looked up per tenant, created only if missing
-- ---------------------------------------------------------------------------
INSERT INTO committees (id, tenant_id, name, scope, level, method, term, responsibilities, active)
SELECT t.id || '-exec', t.id, t.name || ' Executive Committee', 'Organization-wide', 3, 'Appointment', '2026',
       '{"handles":"Organization-wide and escalated grievances","escalatesTo":"Final level","publishScope":"Whole organization"}'::jsonb, TRUE
FROM tenants t
WHERE t.id IN ('tu', 'su')
  AND NOT EXISTS (SELECT 1 FROM committees c WHERE c.tenant_id = t.id AND c.level = 3 AND c.functional_group IS NULL AND c.active)
ON CONFLICT (id) DO NOTHING;

INSERT INTO committees (id, tenant_id, name, scope, level, functional_group, geo_unit_id, escalates_to_id, method, term, response_hours, resolution_hours, active)
SELECT 'tu-l2-tg-it', 'tu', 'Telangana IT Workers Committee', 'Telangana', 2, 'IT Workers', 'tu-state-telangana',
       (SELECT id FROM committees WHERE tenant_id = 'tu' AND level = 3 AND functional_group IS NULL AND active ORDER BY created_at LIMIT 1),
       'Appointment', '2026', 48, 336, TRUE
ON CONFLICT (id) DO NOTHING;

INSERT INTO committees (id, tenant_id, name, scope, level, functional_group, geo_unit_id, escalates_to_id, method, term, response_hours, resolution_hours, active)
VALUES ('tu-l1-hyd-it', 'tu', 'Hyderabad IT Workers Committee', 'Hyderabad', 1, 'IT Workers', 'tu-city-telangana-hyderabad',
        'tu-l2-tg-it', 'Appointment', '2026', 48, 336, TRUE)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. auth.users — 9 fictional test users (+1 555-555-0101 .. 0109)
-- ---------------------------------------------------------------------------
INSERT INTO auth.users (id, phone, phone_confirmed_at) VALUES
  ('00000000-0000-4000-8000-000000000101', '15555550101', NOW()),
  ('00000000-0000-4000-8000-000000000102', '15555550102', NOW()),
  ('00000000-0000-4000-8000-000000000103', '15555550103', NOW()),
  ('00000000-0000-4000-8000-000000000104', '15555550104', NOW()),
  ('00000000-0000-4000-8000-000000000105', '15555550105', NOW()),
  ('00000000-0000-4000-8000-000000000106', '15555550106', NOW()),
  ('00000000-0000-4000-8000-000000000107', '15555550107', NOW()),
  ('00000000-0000-4000-8000-000000000108', '15555550108', NOW()),
  ('00000000-0000-4000-8000-000000000109', '15555550109', NOW())
ON CONFLICT (id) DO NOTHING;

-- On real Supabase, GoTrue expects aud/role; set them when those columns exist.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'aud') THEN
    EXECUTE $q$UPDATE auth.users SET aud = 'authenticated', role = 'authenticated'
             WHERE id::text LIKE '00000000-0000-4000-8000-0000000001%' AND (aud IS NULL OR aud = '')$q$;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6. profiles — one membership per tenant (id = membership, user_id = person)
-- ---------------------------------------------------------------------------
INSERT INTO profiles (id, user_id, tenant_id, member_number, name, email, phone, unit, region, country, groups, roles, status) VALUES
  ('11111111-1111-4000-8000-000000000101', '00000000-0000-4000-8000-000000000101', 'tu', 'TU-0101', 'Priya Rao',        'priya@tu.test',   '15555550101', 'Hyderabad', 'Telangana',   'India', ARRAY['Administration'], ARRAY['member','org_admin'],        'verified'),
  ('11111111-1111-4000-8000-000000000102', '00000000-0000-4000-8000-000000000102', 'su', 'SU-0001', 'Vikram Singh',     'vikram@su.test',  '15555550102', 'Pune',      'Maharashtra', 'India', ARRAY['Administration'], ARRAY['member','org_admin'],        'verified'),
  ('11111111-1111-4000-8000-000000000103', '00000000-0000-4000-8000-000000000103', 'tu', 'TU-0103', 'Anita Desai',      'anita@tu.test',   '15555550103', 'Hyderabad', 'Telangana',   'India', ARRAY['IT Workers'],     ARRAY['member'],                   'verified'),
  ('11111111-1111-4000-8000-000000000104', '00000000-0000-4000-8000-000000000104', 'tu', 'TU-0104', 'Ramesh Kumar',     'ramesh@tu.test',  '15555550104', 'Hyderabad', 'Telangana',   'India', ARRAY['IT Workers'],     ARRAY['member'],                   'verified'),
  ('11111111-1111-4000-8000-000000000105', '00000000-0000-4000-8000-000000000105', 'tu', 'TU-0105', 'Suresh Moderator', 'suresh@tu.test',  '15555550105', 'Hyderabad', 'Telangana',   'India', ARRAY['IT Workers'],     ARRAY['member','moderator'],        'verified'),
  ('11111111-1111-4000-8000-000000000106', '00000000-0000-4000-8000-000000000106', 'tu', 'TU-0106', 'Lakshmi Admin',    'lakshmi@tu.test', '15555550106', 'Hyderabad', 'Telangana',   'India', ARRAY['IT Workers'],     ARRAY['member','membership_admin'], 'verified'),
  ('11111111-1111-4000-8000-000000000107', '00000000-0000-4000-8000-000000000107', 'tu', 'TU-0107', 'Asha Member',      'asha@tu.test',    '15555550107', 'Hyderabad', 'Telangana',   'India', ARRAY['IT Workers'],     ARRAY['member'],                   'verified'),
  ('11111111-1111-4000-8000-000000000108', '00000000-0000-4000-8000-000000000108', 'tu', 'TU-0108', 'Omar Other',       'omar@tu.test',    '15555550108', 'Hyderabad', 'Telangana',   'India', ARRAY['Transport'],      ARRAY['member'],                   'verified'),
  ('11111111-1111-4000-8000-000000000109', '00000000-0000-4000-8000-000000000109', 'tu', 'TU-0109', 'Late Joiner',      'late@tu.test',    '15555550109', 'Hyderabad', 'Telangana',   'India', ARRAY['IT Workers'],     ARRAY['member'],                   'pending')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 7. committee_members — appointments
-- ---------------------------------------------------------------------------
INSERT INTO committee_members (id, committee_id, tenant_id, profile_id, name, role, formation_type, method, since, status, start_date, is_override)
VALUES ('cm-anita-l1', 'tu-l1-hyd-it', 'tu', '11111111-1111-4000-8000-000000000103', 'Anita Desai', 'Chair', 'Appointment', 'Appointment (test seed)', '01 Jan 2026', 'active', NOW(), FALSE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO committee_members (id, committee_id, tenant_id, profile_id, name, role, formation_type, method, since, status, start_date, is_override)
SELECT 'cm-ramesh-l3', c.id, 'tu', '11111111-1111-4000-8000-000000000104', 'Ramesh Kumar', 'Issue handler', 'Appointment', 'Appointment (test seed)', '01 Jan 2026', 'active', NOW(), FALSE
FROM committees c WHERE c.tenant_id = 'tu' AND c.level = 3 AND c.functional_group IS NULL AND c.active
ORDER BY c.created_at LIMIT 1
ON CONFLICT (id) DO NOTHING;

INSERT INTO committee_members (id, committee_id, tenant_id, profile_id, name, role, formation_type, method, since, status, start_date, is_override)
SELECT 'cm-vikram-su', c.id, 'su', '11111111-1111-4000-8000-000000000102', 'Vikram Singh', 'Chair', 'Appointment', 'Appointment (test seed)', '01 Jan 2026', 'active', NOW(), FALSE
FROM committees c WHERE c.tenant_id = 'su' AND c.level = 3 AND c.functional_group IS NULL AND c.active
ORDER BY c.created_at LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 8. Routing rules (create_organization seeds these; ensure for seeded tenants)
-- ---------------------------------------------------------------------------
INSERT INTO routing_rules (tenant_id, category, target_kind, start_level, confidential, sort_order, active)
SELECT t.id, r.category, r.kind, r.lvl, r.conf, r.ord, TRUE
FROM (VALUES ('tu'), ('su')) AS t(id)
CROSS JOIN (VALUES
  ('Wages', 'group', 1, FALSE, 10),
  ('Working hours', 'group', 1, FALSE, 20),
  ('Health & safety', 'group', 1, FALSE, 30),
  ('Facilities', 'general', 1, FALSE, 40),
  ('Harassment (confidential)', 'general', 2, TRUE, 50)
) AS r(category, kind, lvl, conf, ord)
ON CONFLICT (tenant_id, category) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 9. Audit trail for everything granted above (once per entity)
-- ---------------------------------------------------------------------------
INSERT INTO audit_logs (tenant_id, tenant_name, actor_name, actor_role, action, entity_type, entity_id, details, reason)
SELECT p.tenant_id, t.name, 'Test seed', 'seed', 'Seed Membership', 'profile', p.id::text,
       'Seeded ' || p.name || ' (' || p.member_number || ') status=' || p.status || ' roles=' || array_to_string(p.roles, ','),
       'Test roster seed (staging only)'
FROM profiles p JOIN tenants t ON t.id = p.tenant_id
WHERE p.id::text LIKE '11111111-1111-4000-8000-0000000001%'
  AND NOT EXISTS (SELECT 1 FROM audit_logs a WHERE a.entity_id = p.id::text AND a.action = 'Seed Membership');

INSERT INTO audit_logs (tenant_id, tenant_name, actor_name, actor_role, action, entity_type, entity_id, details, reason)
SELECT m.tenant_id, t.name, 'Test seed', 'seed', 'Seed Committee Appointment', 'committee_member', m.id,
       m.name || ' → ' || m.role || ' of ' || c.name, 'Test roster seed (staging only)'
FROM committee_members m JOIN committees c ON c.id = m.committee_id JOIN tenants t ON t.id = m.tenant_id
WHERE m.id IN ('cm-anita-l1', 'cm-ramesh-l3', 'cm-vikram-su')
  AND NOT EXISTS (SELECT 1 FROM audit_logs a WHERE a.entity_id = m.id AND a.action = 'Seed Committee Appointment');

-- ---------------------------------------------------------------------------
-- 10. Denormalized member counts
-- ---------------------------------------------------------------------------
SELECT refresh_member_counts('tu');
SELECT refresh_member_counts('su');

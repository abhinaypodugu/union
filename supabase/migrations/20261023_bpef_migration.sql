-- ==============================================================================
-- BPEF SINGLE-ORGANIZATION PRODUCTION MIGRATION
-- Execute in: Supabase Dashboard -> SQL Editor -> Run
--
-- SECURITY: run supabase/migrations/20261024_audit_fixes.sql after this file.
-- That migration replaces the profile RPCs, revokes anonymous function
-- execution, restricts directory columns, and re-runs the privilege sweep.
-- ==============================================================================

-- 1. Ensure BPEF Tenant & Deactivate Old Multi-Tenants
INSERT INTO tenants (id, name, short_name, code, description, terminology, active)
VALUES (
  'bpef',
  'Bharatiya Postal Employees Federation',
  'BPEF',
  'BPEF',
  'Apex Federation of Postal Trade Unions and Affiliated Associations in India Post',
  '{"orgLabel":"Federation","level1Label":"Division","level2Label":"Circle","level3Label":"All India","groupLabel":"Affiliated Association","caseLabel":"Grievance","cadres":["Supervisors","Postman & MTS","Group ‘C’","GDS","RMS & MMS","Mailguard & MTS","Civil Wing","Postal Accounts","Administrative Offices","SBCO","Postal Officers","IP & ASP"]}'::jsonb,
  TRUE
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  terminology = EXCLUDED.terminology,
  active = TRUE;

UPDATE tenants SET active = FALSE WHERE id <> 'bpef';

-- 2. Ensure 12 Affiliated Association Functional Groups
INSERT INTO functional_groups (id, tenant_id, name, category, geographic_scope) VALUES
  ('bpef-grp-supervisors', 'bpef', 'Supervisors', 'Affiliated Association', 'Organization-wide'),
  ('bpef-grp-postman-mts', 'bpef', 'Postman & MTS', 'Affiliated Association', 'Organization-wide'),
  ('bpef-grp-group-c', 'bpef', 'Group ‘C’', 'Affiliated Association', 'Organization-wide'),
  ('bpef-grp-gds', 'bpef', 'GDS', 'Affiliated Association', 'Organization-wide'),
  ('bpef-grp-rms-mms', 'bpef', 'RMS & MMS', 'Affiliated Association', 'Organization-wide'),
  ('bpef-grp-mailguard-mts', 'bpef', 'Mailguard & MTS', 'Affiliated Association', 'Organization-wide'),
  ('bpef-grp-civil-wing', 'bpef', 'Civil Wing', 'Affiliated Association', 'Organization-wide'),
  ('bpef-grp-postal-accounts', 'bpef', 'Postal Accounts', 'Affiliated Association', 'Organization-wide'),
  ('bpef-grp-administrative-offices', 'bpef', 'Administrative Offices', 'Affiliated Association', 'Organization-wide'),
  ('bpef-grp-sbco', 'bpef', 'SBCO', 'Affiliated Association', 'Organization-wide'),
  ('bpef-grp-postal-officers', 'bpef', 'Postal Officers', 'Affiliated Association', 'Organization-wide'),
  ('bpef-grp-ip-asp', 'bpef', 'IP & ASP', 'Affiliated Association', 'Organization-wide')
ON CONFLICT (id) DO NOTHING;

-- 3. Committees: Level 1 (Division), Level 2 (Circle), Level 3 (National)
INSERT INTO committees (id, tenant_id, name, scope, level, functional_group, method, term, responsibilities)
VALUES
  ('bpef-l1-sec-supervisors', 'bpef', 'Secunderabad Supervisors Branch Committee', 'Local', 1, 'Supervisors', 'Election', '2026 – 2028',
   '{"handles":"Secunderabad Supervisors division grievances","escalatesTo":"Telangana Circle Executive Committee"}'::jsonb),
  ('bpef-l2-telangana-circle', 'bpef', 'Telangana Circle Executive Committee', 'Regional', 2, NULL, 'Election', '2026 – 2028',
   '{"handles":"Telangana circle-wide and escalated division grievances","escalatesTo":"BPEF All-India Executive Committee"}'::jsonb),
  ('bpef-exec-national', 'bpef', 'BPEF All-India Executive Committee', 'Organization-wide', 3, NULL, 'Election / Appointment', '2026 – 2028',
   '{"handles":"Federation-wide and escalated grievances","escalatesTo":"Apex Federation","publishScope":"Whole federation"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET active = TRUE;

-- Link Escalation Chain
UPDATE committees SET escalates_to_id = 'bpef-l2-telangana-circle' WHERE id = 'bpef-l1-sec-supervisors';
UPDATE committees SET escalates_to_id = 'bpef-exec-national' WHERE id = 'bpef-l2-telangana-circle';

-- 4. Default Routing Rules
INSERT INTO routing_rules (tenant_id, category, target_kind, start_level, confidential, sort_order) VALUES
  ('bpef', 'Wages', 'group', 1, FALSE, 10),
  ('bpef', 'Working hours', 'group', 1, FALSE, 20),
  ('bpef', 'Health & safety', 'group', 1, FALSE, 30),
  ('bpef', 'Facilities', 'general', 1, FALSE, 40),
  ('bpef', 'Harassment (confidential)', 'general', 2, TRUE, 50)
ON CONFLICT DO NOTHING;

-- 5. Enhanced Platform Admin Check (Matches E164 digits gracefully)
CREATE OR REPLACE FUNCTION is_platform_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_admins pa
    JOIN auth.users u ON u.id = auth.uid()
    WHERE pa.active
      AND e164_digits(pa.phone) = e164_digits(u.phone)
      AND length(digits_only(u.phone)) >= 10
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 6. Secure RPC to update postal profile
CREATE OR REPLACE FUNCTION update_postal_profile(
  p_profile_id UUID,
  p_employee_id TEXT DEFAULT NULL,
  p_designation TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_dob DATE DEFAULT NULL,
  p_office_employed TEXT DEFAULT NULL,
  p_division TEXT DEFAULT NULL,
  p_circle TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_prof profiles%ROWTYPE;
  v_is_admin BOOLEAN := FALSE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_prof FROM profiles WHERE id = p_profile_id;
  IF v_prof.id IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_prof.user_id = auth.uid() OR is_platform_admin() OR has_tenant_role(v_prof.tenant_id, 'org_admin') THEN
    v_is_admin := (is_platform_admin() OR has_tenant_role(v_prof.tenant_id, 'org_admin'));
  ELSE
    RAISE EXCEPTION 'Not authorized to update this profile';
  END IF;

  IF coalesce(p_division, v_prof.division) IS NOT NULL AND coalesce(p_circle, v_prof.circle) IS NOT NULL THEN
    PERFORM ensure_geo_path(v_prof.tenant_id, coalesce(p_division, v_prof.division), coalesce(p_circle, v_prof.circle), 'India');
  END IF;

  IF p_category IS NOT NULL AND trim(p_category) <> '' THEN
    INSERT INTO functional_groups (id, tenant_id, name, category, geographic_scope)
    VALUES (v_prof.tenant_id || '-grp-' || slugify(p_category), v_prof.tenant_id, trim(p_category), 'Affiliated Association', 'Organization-wide')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  UPDATE profiles
  SET
    employee_id = CASE WHEN v_is_admin THEN coalesce(nullif(trim(p_employee_id), ''), employee_id) ELSE employee_id END,
    designation = CASE WHEN v_is_admin THEN coalesce(nullif(trim(p_designation), ''), designation) ELSE designation END,
    category = coalesce(nullif(trim(p_category), ''), category),
    dob = coalesce(p_dob, dob),
    office_employed = coalesce(nullif(trim(p_office_employed), ''), office_employed),
    division = coalesce(nullif(trim(p_division), ''), division),
    circle = coalesce(nullif(trim(p_circle), ''), circle),
    unit = coalesce(nullif(trim(p_division), ''), unit),
    region = coalesce(nullif(trim(p_circle), ''), region),
    avatar_url = coalesce(nullif(trim(p_avatar_url), ''), avatar_url),
    groups = CASE 
      WHEN p_category IS NOT NULL AND trim(p_category) <> '' THEN ARRAY[trim(p_category)]
      ELSE groups
    END
  WHERE id = p_profile_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION update_postal_profile TO authenticated;

-- 7. Updated register_member RPC (Auto-promotes Platform Admins to verified org_admin)
CREATE OR REPLACE FUNCTION register_member(
  p_org_code TEXT, p_name TEXT, p_email TEXT, p_city TEXT, p_region TEXT, p_group TEXT, p_country TEXT DEFAULT 'India',
  p_employee_id TEXT DEFAULT NULL, p_designation TEXT DEFAULT 'Member', p_category TEXT DEFAULT NULL,
  p_dob DATE DEFAULT NULL, p_office_employed TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_tenant tenants%ROWTYPE;
  v_profile UUID;
  v_phone TEXT;
  v_status TEXT;
  v_code TEXT := coalesce(nullif(trim(p_org_code), ''), 'BPEF');
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  SELECT * INTO v_tenant FROM tenants WHERE active AND upper(code) = upper(trim(v_code));
  IF v_tenant.id IS NULL THEN
    SELECT * INTO v_tenant FROM tenants WHERE id = 'bpef' AND active;
  END IF;
  IF v_tenant.id IS NULL THEN RAISE EXCEPTION 'No organization matches code %', upper(v_code); END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND tenant_id = v_tenant.id) THEN
    RAISE EXCEPTION 'You already have a membership in %', v_tenant.name;
  END IF;
  IF coalesce(trim(p_name), '') = '' OR coalesce(trim(p_city), '') = '' THEN
    RAISE EXCEPTION 'Name and location are required';
  END IF;

  -- Platform Super Admins automatically become verified org_admins of the federation.
  IF is_platform_admin() THEN
    v_status := 'verified';
  ELSIF coalesce(nullif(trim(p_designation), ''), 'Member') <> 'Member' THEN
    v_status := 'pending';
  ELSE
    v_status := CASE WHEN coalesce((v_tenant.settings ->> 'autoApproveMembers')::boolean, FALSE) THEN 'verified' ELSE 'pending' END;
  END IF;
  SELECT phone INTO v_phone FROM auth.users WHERE id = auth.uid();

  PERFORM ensure_geo_path(v_tenant.id, trim(p_city), coalesce(nullif(trim(p_region), ''), 'Central'), coalesce(p_country, 'India'));
  IF coalesce(trim(p_group), '') <> '' THEN
    INSERT INTO functional_groups (id, tenant_id, name, category, geographic_scope)
    VALUES (v_tenant.id || '-grp-' || slugify(p_group), v_tenant.id, trim(p_group), 'Affiliated Association', 'Organization-wide')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  INSERT INTO profiles (user_id, tenant_id, member_number, name, email, phone, unit, region, country, groups, roles, status,
                        employee_id, designation, category, dob, office_employed, division, circle, status_reason)
  VALUES (auth.uid(), v_tenant.id, v_tenant.code || '-' || lpad(nextval('member_seq')::text, 5, '0'), trim(p_name),
          coalesce(p_email, ''), v_phone, trim(p_city), coalesce(nullif(trim(p_region), ''), 'Central'),
          coalesce(p_country, 'India'), CASE WHEN coalesce(trim(p_group), '') = '' THEN '{}'::text[] ELSE ARRAY[trim(p_group)] END,
          CASE WHEN is_platform_admin() THEN ARRAY['member', 'org_admin'] ELSE ARRAY['member'] END, v_status,
          nullif(trim(p_employee_id), ''), coalesce(nullif(trim(p_designation), ''), 'Member'),
          nullif(trim(p_category), ''), p_dob, nullif(trim(p_office_employed), ''),
          trim(p_city), coalesce(nullif(trim(p_region), ''), 'Central'),
          CASE WHEN is_platform_admin() THEN NULL
               WHEN coalesce(nullif(trim(p_designation), ''), 'Member') <> 'Member'
               THEN 'Designation "' || trim(p_designation) || '" requires leadership verification'
               ELSE NULL END)
  RETURNING id INTO v_profile;

  PERFORM write_audit(v_tenant.id, 'applicant', 'Member Registration', 'profile', v_profile::text,
                      trim(p_name) || ' applied for membership in ' || trim(p_city) || ' (' || v_status || ')');
  IF v_status = 'pending' THEN
    PERFORM notify_org_admins(v_tenant.id, 'security', 'New membership application', 'Membership · ' || trim(p_name),
                              '/manage/members', 'member-application-' || v_profile::text);
  ELSE
    PERFORM refresh_member_counts(v_tenant.id);
  END IF;
  RETURN v_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION register_member TO authenticated;

-- 8. Privileges on profiles columns
REVOKE ALL ON profiles FROM anon, authenticated;
GRANT SELECT (
  id, user_id, tenant_id, member_number, name, email, phone, unit, region, country, groups, roles, status, created_at,
  employee_id, designation, category, dob, office_employed, division, circle, avatar_url, status_reason
) ON profiles TO authenticated;

-- 9. Storage Buckets (Public read for avatars)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO UPDATE SET public = TRUE;

-- Storage RLS policies for avatars
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated users can upload avatars'
  ) THEN
    CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
      FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public can view avatars'
  ) THEN
    CREATE POLICY "Public can view avatars" ON storage.objects
      FOR SELECT TO public USING (bucket_id = 'avatars');
  END IF;
END $$;

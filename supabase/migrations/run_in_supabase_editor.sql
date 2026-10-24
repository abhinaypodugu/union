-- ==============================================================================
-- RUN THIS IN SUPABASE DASHBOARD -> SQL EDITOR -> RUN
-- Pure DDL (Functions and Permissions) - No JSON string literals
-- ==============================================================================

-- 1. Helper to match platform admin phone numbers cleanly
CREATE OR REPLACE FUNCTION is_platform_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_admins pa
    JOIN auth.users u ON u.id = auth.uid()
    WHERE pa.active
      AND e164_digits(pa.phone) = e164_digits(u.phone)
      AND length(digits_only(u.phone)) >= 10
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 2. Secure RPC to update postal profile (with RLS enforcement)
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

  IF v_is_admin AND p_category IS NOT NULL AND trim(p_category) <> '' THEN
    INSERT INTO functional_groups (id, tenant_id, name, category, geographic_scope)
    VALUES (v_prof.tenant_id || '-grp-' || slugify(p_category), v_prof.tenant_id, trim(p_category), 'Affiliated Association', 'Organization-wide')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  UPDATE profiles
  SET
    employee_id = CASE WHEN v_is_admin THEN coalesce(nullif(trim(p_employee_id), ''), employee_id) ELSE employee_id END,
    designation = CASE WHEN v_is_admin THEN coalesce(nullif(trim(p_designation), ''), designation) ELSE designation END,
    category = CASE WHEN v_is_admin THEN coalesce(nullif(trim(p_category), ''), category) ELSE category END,
    dob = coalesce(p_dob, dob),
    office_employed = coalesce(nullif(trim(p_office_employed), ''), office_employed),
    division = coalesce(nullif(trim(p_division), ''), division),
    circle = coalesce(nullif(trim(p_circle), ''), circle),
    unit = coalesce(nullif(trim(p_division), ''), unit),
    region = coalesce(nullif(trim(p_circle), ''), region),
    -- NULL keeps the photo; an explicit empty string clears it.
    avatar_url = CASE WHEN p_avatar_url IS NULL THEN avatar_url
                      WHEN trim(p_avatar_url) = '' THEN NULL
                      ELSE trim(p_avatar_url) END,
    groups = CASE
      WHEN v_is_admin AND p_category IS NOT NULL AND trim(p_category) <> '' THEN ARRAY[trim(p_category)]
      ELSE groups
    END
  WHERE id = p_profile_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION update_postal_profile TO authenticated;
-- 2b. Direct lightweight avatar updater
CREATE OR REPLACE FUNCTION update_my_avatar(p_avatar_url TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE profiles
  SET avatar_url = NULLIF(trim(p_avatar_url), '')
  WHERE user_id = auth.uid();

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION update_my_avatar(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION update_my_phone(p_phone TEXT) RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE profiles SET phone = trim(p_phone) WHERE user_id = auth.uid();
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION update_my_phone(TEXT) TO authenticated;


-- 3. Updated register_member RPC (Auto-promotes Platform Admins to verified org_admin)
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

-- 4. Column Privileges on profiles: verified members are the organization
-- directory, so contact/postal columns are shared; notification_prefs stays
-- on the own/admin RPCs.
REVOKE ALL ON profiles FROM anon, authenticated;
GRANT SELECT (
  id, user_id, tenant_id, member_number, name, email, phone, unit, region, country, groups, roles, status, created_at,
  employee_id, designation, category, dob, office_employed, division, circle, avatar_url, status_reason
) ON profiles TO authenticated;

-- Writes go through update_postal_profile/update_my_avatar only; remove any
-- legacy direct-avatar policy and update grant.
DROP POLICY IF EXISTS "Users can update own avatar" ON profiles;

-- 5. Storage policies for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO UPDATE SET public = TRUE;

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

-- 6. Function privileges: nothing callable anonymously; internal helpers are
-- not callable by end users. Re-run this block at the end of every migration.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig, p.proname FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    IF r.proname IN ('write_audit', 'notify_profile', 'notify_committee', 'notify_org_admins', 'ensure_geo_path',
                     'refresh_member_counts', 'process_issue_deadlines', 'audit_logs_immutable', 'platform_admins_keep_one',
                     'assign_random_avatar') THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.sig);
    ELSE
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    END IF;
  END LOOP;
END $$;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated, service_role;

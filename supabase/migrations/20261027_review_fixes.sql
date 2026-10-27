-- ==============================================================================
-- Review fixes (2026-10-27): profile row privacy, directory payloads, avatar
-- URL validation, profile-change auditing, workplace-change alerting, and the
-- legacy avatar storage policy. Safe to re-run on an existing database.
-- ==============================================================================

-- 1. Pending/suspended profiles are not part of the directory. Own rows remain
--    readable; authorized admins retain full access.
DROP POLICY IF EXISTS "profiles: own or tenant directory" ON profiles;
CREATE POLICY "profiles: own or tenant directory" ON profiles FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_platform_admin()
    OR has_tenant_role(tenant_id, 'org_admin', 'membership_admin')
    OR (is_member(tenant_id) AND status = 'verified')
  );

-- status_reason is internal admin context; it is cleared when a membership is
-- verified and is no longer returned by the directory RPC. Keep the column
-- grant so legitimate SELECT * reads continue to work.
REVOKE ALL ON profiles FROM anon, authenticated;
GRANT SELECT (
  id, user_id, tenant_id, member_number, name, email, phone, unit, region, country, groups, roles, status, created_at,
  employee_id, designation, category, dob, office_employed, division, circle, avatar_url, status_reason
) ON profiles TO authenticated;

CREATE OR REPLACE FUNCTION set_member_status(p_profile UUID, p_status TEXT, p_reason TEXT DEFAULT NULL) RETURNS VOID AS $$
DECLARE
  v_target profiles%ROWTYPE;
  v_platform BOOLEAN := is_platform_admin();
BEGIN
  SELECT * INTO v_target FROM profiles WHERE id = p_profile;
  IF v_target.id IS NULL THEN RAISE EXCEPTION 'Membership not found'; END IF;
  IF NOT (v_platform OR has_tenant_role(v_target.tenant_id, 'org_admin', 'membership_admin')) THEN
    RAISE EXCEPTION 'Not authorized to change memberships in this organization';
  END IF;
  IF p_status NOT IN ('verified', 'rejected', 'suspended', 'ended') THEN
    RAISE EXCEPTION 'Invalid membership status %', p_status;
  END IF;
  IF p_status IN ('rejected', 'suspended', 'ended') AND coalesce(trim(p_reason), '') = '' THEN
    RAISE EXCEPTION 'A reason is required';
  END IF;
  IF v_target.user_id = auth.uid() AND p_status <> 'verified' THEN
    RAISE EXCEPTION 'You cannot change your own membership status';
  END IF;

  UPDATE profiles SET status = p_status,
                      status_reason = CASE WHEN p_status = 'verified' THEN NULL ELSE p_reason END
  WHERE id = p_profile;
  IF p_status IN ('suspended', 'ended') THEN
    UPDATE committee_members SET status = 'suspended', status_reason = 'Membership ' || p_status || ': ' || p_reason
    WHERE profile_id = p_profile AND status = 'active';
  END IF;

  PERFORM write_audit(v_target.tenant_id, CASE WHEN v_platform THEN 'platform_admin' ELSE 'membership_admin' END,
                      'Membership ' || initcap(p_status), 'profile', p_profile::text,
                      'Set membership of ' || v_target.name || ' (' || v_target.member_number || ') to ' || p_status,
                      p_reason, v_platform AND NOT has_tenant_role(v_target.tenant_id, 'org_admin', 'membership_admin'));
  PERFORM notify_profile(v_target.tenant_id, p_profile, 'security',
                         CASE p_status WHEN 'verified' THEN 'Your membership was approved' ELSE 'Your membership status changed' END,
                         'Membership · ' || p_status, '/main', 'membership-' || p_status || '-' || p_profile::text || '-' || extract(epoch FROM NOW())::bigint,
                         TRUE, TRUE);
  PERFORM refresh_member_counts(v_target.tenant_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Avatar validation: bundled presets or the member's own uploaded folder.
CREATE OR REPLACE FUNCTION valid_avatar_url(p_url TEXT, p_user UUID) RETURNS BOOLEAN AS $$
DECLARE
  v_url TEXT := trim(coalesce(p_url, ''));
  v_base TEXT;
  v_crop TEXT;
  v_host TEXT;
  v_req_host TEXT;
  v_path TEXT;
  v_parts TEXT[];
BEGIN
  IF v_url = '' THEN RETURN TRUE; END IF;
  IF length(v_url) > 2048 THEN RETURN FALSE; END IF;

  v_base := split_part(v_url, '#crop=', 1);
  IF v_base <> v_url THEN
    v_crop := substring(v_url FROM length(v_base) + 7);
    IF v_crop !~ '^[0-9]+(\.[0-9]{1,3})?,-?[0-9]+,-?[0-9]+$' THEN RETURN FALSE; END IF;
  END IF;

  IF v_base ~ '^default:sculpted_(0[1-9]|1[0-6])$' THEN RETURN TRUE; END IF;

  IF v_base !~ '^https://[^/?#]+/storage/v1/object/public/avatars/[^/]+/[^/]+/avatar_[A-Za-z0-9._-]+$' THEN
    RETURN FALSE;
  END IF;
  IF p_user IS NULL THEN RETURN FALSE; END IF;

  v_host := lower(split_part(split_part(v_base, '://', 2), '/', 1));
  BEGIN
    v_req_host := lower(split_part(nullif(current_setting('request.headers', true), '')::jsonb ->> 'host', ':', 1));
  EXCEPTION WHEN others THEN
    v_req_host := NULL;
  END;
  IF v_req_host IS NOT NULL THEN
    IF v_host <> v_req_host THEN RETURN FALSE; END IF;
  ELSIF v_host !~ '\.supabase\.(co|in)$' THEN
    RETURN FALSE;
  END IF;

  v_path := substring(v_base FROM '/storage/v1/object/public/avatars/(.*)$');
  v_parts := string_to_array(v_path, '/');
  IF array_length(v_parts, 1) <> 3 THEN RETURN FALSE; END IF;
  IF v_parts[2] <> p_user::text THEN RETURN FALSE; END IF;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 3. Profile updates: validate new avatars and write an audit trail. A
--    non-admin workplace change additionally alerts organization admins.
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
  v_employee_id TEXT;
  v_designation TEXT;
  v_category TEXT;
  v_dob DATE;
  v_office TEXT;
  v_division TEXT;
  v_circle TEXT;
  v_avatar TEXT;
  v_groups TEXT[];
  v_actor_role TEXT;
  v_changes TEXT[] := ARRAY[]::TEXT[];
  v_workplace BOOLEAN := FALSE;
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

  v_employee_id := CASE WHEN v_is_admin THEN coalesce(nullif(trim(p_employee_id), ''), v_prof.employee_id) ELSE v_prof.employee_id END;
  v_designation := CASE WHEN v_is_admin THEN coalesce(nullif(trim(p_designation), ''), v_prof.designation) ELSE v_prof.designation END;
  v_category := CASE WHEN v_is_admin THEN coalesce(nullif(trim(p_category), ''), v_prof.category) ELSE v_prof.category END;
  v_dob := coalesce(p_dob, v_prof.dob);
  v_office := coalesce(nullif(trim(p_office_employed), ''), v_prof.office_employed);
  v_division := coalesce(nullif(trim(p_division), ''), v_prof.division);
  v_circle := coalesce(nullif(trim(p_circle), ''), v_prof.circle);
  v_avatar := CASE WHEN p_avatar_url IS NULL THEN v_prof.avatar_url
                   WHEN trim(p_avatar_url) = '' THEN NULL
                   ELSE trim(p_avatar_url) END;

  IF v_avatar IS NOT NULL AND v_avatar IS DISTINCT FROM v_prof.avatar_url
     AND NOT valid_avatar_url(v_avatar, v_prof.user_id) THEN
    RAISE EXCEPTION 'Avatar must be a bundled preset or your own uploaded photo';
  END IF;

  IF v_division IS NOT NULL AND v_circle IS NOT NULL THEN
    PERFORM ensure_geo_path(v_prof.tenant_id, v_division, v_circle, 'India');
  END IF;

  -- Association (category) decides which channels and audiences a member can
  -- read through in_audience(), so only administrators may change it.
  IF v_is_admin AND v_category IS NOT NULL AND v_category IS DISTINCT FROM v_prof.category THEN
    INSERT INTO functional_groups (id, tenant_id, name, category, geographic_scope)
    VALUES (v_prof.tenant_id || '-grp-' || slugify(v_category), v_prof.tenant_id, v_category, 'Affiliated Association', 'Organization-wide')
    ON CONFLICT (id) DO NOTHING;
    v_groups := ARRAY[v_category];
  ELSE
    v_groups := v_prof.groups;
  END IF;

  IF v_employee_id IS DISTINCT FROM v_prof.employee_id THEN
    v_changes := v_changes || ('Employee ID: ' || coalesce(v_prof.employee_id, '—') || ' → ' || coalesce(v_employee_id, '—'));
  END IF;
  IF v_designation IS DISTINCT FROM v_prof.designation THEN
    v_changes := v_changes || ('Designation: ' || coalesce(v_prof.designation, '—') || ' → ' || coalesce(v_designation, '—'));
  END IF;
  IF v_category IS DISTINCT FROM v_prof.category THEN
    v_changes := v_changes || ('Association: ' || coalesce(v_prof.category, '—') || ' → ' || coalesce(v_category, '—'));
  END IF;
  IF v_groups IS DISTINCT FROM v_prof.groups THEN
    v_changes := v_changes || ('Groups: ' || coalesce(array_to_string(v_prof.groups, ', '), '—') || ' → ' || coalesce(array_to_string(v_groups, ', '), '—'));
  END IF;
  IF v_dob IS DISTINCT FROM v_prof.dob THEN
    v_changes := v_changes || ('DOB: ' || coalesce(v_prof.dob::text, '—') || ' → ' || coalesce(v_dob::text, '—'));
  END IF;
  IF v_office IS DISTINCT FROM v_prof.office_employed THEN
    v_changes := v_changes || ('Office: ' || coalesce(v_prof.office_employed, '—') || ' → ' || coalesce(v_office, '—'));
  END IF;
  IF v_division IS DISTINCT FROM v_prof.division THEN
    v_changes := v_changes || ('Division: ' || coalesce(v_prof.division, '—') || ' → ' || coalesce(v_division, '—'));
    v_workplace := TRUE;
  END IF;
  IF v_circle IS DISTINCT FROM v_prof.circle THEN
    v_changes := v_changes || ('Circle: ' || coalesce(v_prof.circle, '—') || ' → ' || coalesce(v_circle, '—'));
    v_workplace := TRUE;
  END IF;
  IF v_avatar IS DISTINCT FROM v_prof.avatar_url THEN
    v_changes := v_changes || CASE WHEN v_avatar IS NULL THEN 'Profile photo cleared' ELSE 'Profile photo updated' END;
  END IF;

  IF cardinality(v_changes) = 0 THEN
    RETURN TRUE;
  END IF;

  UPDATE profiles
  SET
    employee_id = v_employee_id,
    designation = v_designation,
    category = v_category,
    dob = v_dob,
    office_employed = v_office,
    division = v_division,
    circle = v_circle,
    unit = coalesce(v_division, unit),
    region = coalesce(v_circle, region),
    avatar_url = v_avatar,
    groups = v_groups
  WHERE id = p_profile_id;

  v_actor_role := CASE WHEN is_platform_admin() THEN 'platform_admin' WHEN v_is_admin THEN 'org_admin' ELSE 'member' END;
  IF v_prof.user_id = auth.uid() AND NOT v_is_admin AND v_workplace THEN
    PERFORM write_audit(v_prof.tenant_id, v_actor_role, 'Workplace Transfer', 'profile', p_profile_id::text,
                        array_to_string(v_changes, '; '));
    PERFORM notify_org_admins(v_prof.tenant_id, 'security', 'Workplace change',
                              v_prof.name || ' updated their division/circle. Review the new workplace.',
                              '/manage/members', 'workplace-' || p_profile_id::text || '-' || extract(epoch FROM clock_timestamp())::bigint);
  ELSE
    PERFORM write_audit(v_prof.tenant_id, v_actor_role,
                        CASE WHEN v_is_admin AND v_prof.user_id <> auth.uid() THEN 'Update Member Profile' ELSE 'Update Profile' END,
                        'profile', p_profile_id::text, array_to_string(v_changes, '; '));
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Self-service avatar writes. An empty string clears the photo.
CREATE OR REPLACE FUNCTION update_my_avatar(p_avatar_url TEXT) RETURNS BOOLEAN AS $$
DECLARE
  v_new TEXT;
  v_prof RECORD;
  v_matched INT := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_avatar_url IS NULL THEN RETURN FALSE; END IF;
  v_new := NULLIF(trim(p_avatar_url), '');

  IF v_new IS NULL THEN
    UPDATE profiles SET avatar_url = NULL WHERE user_id = auth.uid();
    RETURN FOUND;
  END IF;

  FOR v_prof IN SELECT id, user_id, avatar_url FROM profiles WHERE user_id = auth.uid() LOOP
    IF v_new = v_prof.avatar_url THEN
      v_matched := v_matched + 1;
      CONTINUE;
    END IF;
    IF NOT valid_avatar_url(v_new, v_prof.user_id) THEN
      CONTINUE;
    END IF;
    UPDATE profiles SET avatar_url = v_new WHERE id = v_prof.id;
    v_matched := v_matched + 1;
  END LOOP;

  IF v_matched = 0 THEN
    RAISE EXCEPTION 'Avatar must be a bundled preset or your own uploaded photo';
  END IF;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Directory RPCs return only the fields the client uses. Internal notes and
--    notification preferences stay on the own/admin RPCs.
DROP FUNCTION IF EXISTS get_all_members(TEXT);
CREATE OR REPLACE FUNCTION get_all_members(p_tenant TEXT)
RETURNS TABLE (
  id UUID, tenant_id TEXT, member_number TEXT, name TEXT, email TEXT, phone TEXT,
  unit TEXT, region TEXT, country TEXT, groups TEXT[], roles TEXT[], status TEXT,
  created_at TIMESTAMPTZ, employee_id TEXT, designation TEXT, category TEXT, dob DATE,
  office_employed TEXT, division TEXT, circle TEXT, avatar_url TEXT
) AS $$
BEGIN
  IF NOT (is_member(p_tenant) OR is_platform_admin()) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;
  RETURN QUERY
    SELECT p.id, p.tenant_id, p.member_number, p.name, p.email, p.phone,
           p.unit, p.region, p.country,
           p.groups, p.roles, p.status, p.created_at, p.employee_id, p.designation, p.category,
           p.dob, p.office_employed, p.division, p.circle, p.avatar_url
    FROM profiles p
    WHERE p.tenant_id = p_tenant AND p.status = 'verified'
    ORDER BY p.name ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

DROP FUNCTION IF EXISTS admin_list_members(TEXT);
CREATE OR REPLACE FUNCTION admin_list_members(p_tenant TEXT)
RETURNS TABLE (
  id UUID, user_id UUID, tenant_id TEXT, member_number TEXT, name TEXT, email TEXT, phone TEXT,
  unit TEXT, region TEXT, country TEXT, groups TEXT[], roles TEXT[], status TEXT,
  created_at TIMESTAMPTZ, employee_id TEXT, designation TEXT, category TEXT, dob DATE,
  office_employed TEXT, division TEXT, circle TEXT, avatar_url TEXT, status_reason TEXT
) AS $$
BEGIN
  IF NOT (is_platform_admin() OR has_tenant_role(p_tenant, 'org_admin', 'membership_admin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
    SELECT p.id, p.user_id, p.tenant_id, p.member_number, p.name, p.email, p.phone,
           p.unit, p.region, p.country, p.groups, p.roles, p.status, p.created_at,
           p.employee_id, p.designation, p.category, p.dob, p.office_employed,
           p.division, p.circle, p.avatar_url, p.status_reason
    FROM profiles p
    WHERE p.tenant_id = p_tenant
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 6. Retire the legacy broad avatar upload policy; keep only the canonical
--    path-scoped policies. A bucket-level policy is OR-ed with the others, so
--    leaving the legacy one in place would bypass the per-user path check.
DROP POLICY IF EXISTS "Users can update own avatar" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "avatars: public read" ON storage.objects;
DROP POLICY IF EXISTS "avatars: authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "avatars: authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "avatars: authenticated delete" ON storage.objects;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('avatars', 'avatars', TRUE, 5242880)
ON CONFLICT (id) DO UPDATE SET public = TRUE, file_size_limit = 5242880;

CREATE POLICY "avatars: public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars: authenticated upload" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (split_part(name, '/', 2) = auth.uid()::text OR is_platform_admin())
  );

CREATE POLICY "avatars: authenticated update" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (split_part(name, '/', 2) = auth.uid()::text OR is_platform_admin())
  );

CREATE POLICY "avatars: authenticated delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (split_part(name, '/', 2) = auth.uid()::text OR is_platform_admin())
  );

-- 7. Function privileges: nothing callable anonymously; internal helpers are
--    not callable by end users. Re-run at the end of every future migration.
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
                     'assign_random_avatar', 'valid_avatar_url') THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.sig);
    ELSE
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    END IF;
  END LOOP;
END $$;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

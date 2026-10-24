-- ==============================================================================
-- Audit fixes (2026-10-24): profile privacy, category self-grant, honest avatar
-- writes, same-minute announcement dedupe, and function privileges.
-- Safe to re-run on an existing database.
-- ==============================================================================

-- 1. Postal profile update: category/groups decide channel access, so only
--    admins may change them. An explicit empty avatar string clears the photo.
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

  -- Association (category) decides which channels and audiences a member can
  -- read through in_audience(), so only administrators may change it.
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
    -- NULL keeps the current photo; an explicit empty string clears it.
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

-- 2. Self-service avatar/phone writes. Direct profile writes stay revoked;
--    these are the only paths the client uses.
CREATE OR REPLACE FUNCTION update_my_avatar(p_avatar_url TEXT) RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE profiles SET avatar_url = NULLIF(trim(p_avatar_url), '') WHERE user_id = auth.uid();
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION update_my_phone(p_phone TEXT) RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE profiles SET phone = trim(p_phone) WHERE user_id = auth.uid();
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. One dedupe key per publish call. Identical announcements in the same
--    minute still notify; multi-audience calls dedupe per member.
CREATE OR REPLACE FUNCTION publish_post(
  p_tenant TEXT, p_kind TEXT, p_title TEXT, p_body TEXT, p_pinned BOOLEAN, p_audiences JSONB,
  p_notify BOOLEAN DEFAULT FALSE, p_expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS SETOF TEXT AS $$
DECLARE
  v_me profiles%ROWTYPE;
  a JSONB;
  v_id TEXT;
  v_role TEXT;
  r RECORD;
  v_batch TEXT;
  v_official BOOLEAN := p_kind IN ('official', 'committee');
BEGIN
  IF coalesce(trim(p_body), '') = '' THEN RAISE EXCEPTION 'Message is required'; END IF;
  IF jsonb_array_length(coalesce(p_audiences, '[]'::jsonb)) = 0 THEN RAISE EXCEPTION 'Choose an audience'; END IF;
  v_batch := md5(p_tenant || coalesce(p_title, '') || p_body || clock_timestamp()::text);
  SELECT * INTO v_me FROM profiles WHERE user_id = auth.uid() AND tenant_id = p_tenant AND status = 'verified';
  IF v_me.id IS NULL AND NOT is_platform_admin() THEN RAISE EXCEPTION 'Not a verified member'; END IF;
  IF NOT v_official AND (p_pinned OR p_notify) AND NOT has_tenant_role(p_tenant, 'org_admin') THEN
    RAISE EXCEPTION 'Only leaders can pin posts or notify an audience';
  END IF;
  v_role := CASE WHEN has_tenant_role(p_tenant, 'org_admin') THEN 'Organization admin'
                 WHEN v_official THEN 'Committee leadership' ELSE 'Member' END;

  FOR a IN SELECT * FROM jsonb_array_elements(p_audiences) LOOP
    IF NOT can_publish(p_tenant, p_kind, a ->> 'scope', a ->> 'value') THEN
      RAISE EXCEPTION 'You are not authorized to publish to "%"', coalesce(a ->> 'label', a ->> 'scope');
    END IF;
    INSERT INTO posts (tenant_id, kind, pinned, author_profile_id, author_name, author_role, source, title, body,
                       audience_scope, audience_value, audience_label, notify_push, expires_at)
    VALUES (p_tenant, p_kind, coalesce(p_pinned, FALSE), v_me.id, coalesce(v_me.name, 'Platform Super Admin'),
            CASE WHEN v_official THEN 'Official announcement' ELSE v_role END,
            coalesce(a ->> 'label', a ->> 'scope'), nullif(trim(p_title), ''), trim(p_body),
            a ->> 'scope', a ->> 'value', coalesce(a ->> 'label', a ->> 'scope'), coalesce(p_notify, FALSE), p_expires_at)
    RETURNING id INTO v_id;

    PERFORM write_audit(p_tenant, v_role, CASE WHEN v_official THEN 'Publish Announcement' ELSE 'Create Post' END, 'post', v_id,
                        'Published "' || coalesce(nullif(trim(p_title), ''), left(trim(p_body), 40)) || '" to ' ||
                        coalesce(a ->> 'label', a ->> 'scope') || ' (' || (a ->> 'scope') || coalesce(':' || (a ->> 'value'), '') || ')' ||
                        CASE WHEN p_notify THEN ' with push' ELSE '' END);

    IF p_notify THEN
      FOR r IN
        SELECT p.id FROM profiles p
        WHERE p.tenant_id = p_tenant AND p.status = 'verified' AND (p.user_id IS DISTINCT FROM auth.uid()) AND (
          (a ->> 'scope') = 'org'
          OR ((a ->> 'scope') = 'local' AND lower(p.unit) = lower(a ->> 'value'))
          OR ((a ->> 'scope') = 'region' AND lower(p.region) = lower(a ->> 'value'))
          OR ((a ->> 'scope') = 'group' AND lower(a ->> 'value') = ANY (SELECT lower(g) FROM unnest(p.groups) g))
          OR ((a ->> 'scope') = 'committee' AND EXISTS (SELECT 1 FROM committee_members cm
                WHERE cm.committee_id = (a ->> 'value') AND cm.profile_id = p.id AND cm.status = 'active')))
      LOOP
        PERFORM notify_profile(p_tenant, r.id, 'announcement', coalesce(nullif(trim(p_title), ''), 'New announcement'),
                               'Announcement · ' || coalesce(a ->> 'label', 'Organization'), '/post?id=' || v_id,
                               'announcement-' || v_batch);
      END LOOP;
    END IF;
    RETURN NEXT v_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Organization directory for verified members. Contact and postal fields
--    are intentionally shared; notification_prefs stays on own/admin RPCs.
DROP FUNCTION IF EXISTS get_all_members(TEXT);
CREATE OR REPLACE FUNCTION get_all_members(p_tenant TEXT)
RETURNS TABLE (
  id UUID, user_id UUID, tenant_id TEXT, member_number TEXT, name TEXT, email TEXT, phone TEXT,
  unit TEXT, region TEXT, country TEXT, groups TEXT[], roles TEXT[], status TEXT,
  created_at TIMESTAMPTZ, employee_id TEXT, designation TEXT, category TEXT, dob DATE,
  office_employed TEXT, division TEXT, circle TEXT, avatar_url TEXT, status_reason TEXT
) AS $$
BEGIN
  IF NOT (is_member(p_tenant) OR is_platform_admin()) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;
  RETURN QUERY
    SELECT p.id, p.user_id, p.tenant_id, p.member_number, p.name, p.email, p.phone,
           p.unit, p.region, p.country,
           p.groups, p.roles, p.status, p.created_at, p.employee_id, p.designation, p.category,
           p.dob, p.office_employed, p.division, p.circle, p.avatar_url, p.status_reason
    FROM profiles p
    WHERE p.tenant_id = p_tenant AND p.status = 'verified'
    ORDER BY p.name ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 5. Column-level profile reads only; remove the table-wide grant and any
--    legacy direct-avatar UPDATE policy/grant. Verified members see the
--    directory's contact columns; notification_prefs remains private.
REVOKE ALL ON profiles FROM anon, authenticated;
GRANT SELECT (
  id, user_id, tenant_id, member_number, name, email, phone, unit, region, country, groups, roles, status, created_at,
  employee_id, designation, category, dob, office_employed, division, circle, avatar_url, status_reason
) ON profiles TO authenticated;
DROP POLICY IF EXISTS "Users can update own avatar" ON profiles;

-- 6. Function privileges: nothing callable anonymously; internal helpers are
--    not callable by end users. Re-run this block at the end of every future
--    migration that creates functions.
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

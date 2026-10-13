-- ==============================================================================
-- COMMONS MULTI-TENANT MEMBERSHIP, COMMUNITY & ISSUE-MANAGEMENT PLATFORM
-- PostgreSQL Database Schema & Security Policies (PRD v1.2)
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. TENANTS (ORGANIZATION ISOLATION BOUNDARY)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  terminology JSONB NOT NULL DEFAULT '{
    "orgLabel": "Organization",
    "level1Label": "City",
    "level2Label": "State",
    "level3Label": "National",
    "groupLabel": "Functional Group",
    "caseLabel": "Issue"
  }'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. PROFILES / MEMBERS (LINKED TO AUTH.USERS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  unit TEXT NOT NULL,            -- Local/City unit
  region TEXT NOT NULL,          -- State/Region
  country TEXT NOT NULL DEFAULT 'India',
  groups TEXT[] NOT NULL DEFAULT '{}',
  roles TEXT[] NOT NULL DEFAULT '{"member"}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('verified', 'pending', 'suspended')),
  notification_prefs JSONB NOT NULL DEFAULT '{
    "announcements": true,
    "replies": true,
    "groupActivity": false,
    "caseUpdates": true
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- ==============================================================================
-- 3B. MOBILE OTP VERIFICATIONS & ADMIN ACCESS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS otp_verifications (
  phone TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_admins (
  phone TEXT PRIMARY KEY,
  name TEXT,
  setup_key TEXT NOT NULL DEFAULT 'UNION-ADMIN',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 4. GEOGRAPHIC ADMINISTRATIVE HIERARCHY
-- ==============================================================================
CREATE TABLE IF NOT EXISTS geo_units (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('country', 'state', 'city', 'local')),
  kind TEXT NOT NULL, -- e.g. "Country", "State", "City"
  parent_id TEXT REFERENCES geo_units(id) ON DELETE SET NULL,
  member_count INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 5. FUNCTIONAL TRADE GROUPS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS functional_groups (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'briefcase',
  geographic_scope TEXT,
  member_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 6. COMMITTEES & GOVERNANCE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS committees (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  scope TEXT NOT NULL,
  level INTEGER NOT NULL CHECK (level IN (1, 2, 3)), -- 1: City, 2: State, 3: National
  method TEXT NOT NULL, -- e.g. "Nomination & approval", "Election", "Appointment"
  term TEXT NOT NULL,
  responsibilities JSONB NOT NULL DEFAULT '{
    "handles": "Local grievances",
    "escalatesTo": "Regional committee",
    "publishScope": "Authorized membership"
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS committee_members (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  committee_id TEXT NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Chair', 'Secretary', 'Issue handler', 'Member')),
  formation_type TEXT NOT NULL CHECK (formation_type IN ('Appointment', 'Nomination & approval', 'Election', 'Eligibility-based selection')),
  method TEXT NOT NULL,
  since TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending', 'revoked')),
  is_override BOOLEAN NOT NULL DEFAULT FALSE,
  override_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 7. GRIEVANCES & ISSUES (PRIVATE WORKFLOW RECORDS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS issues (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  complainant_id TEXT NOT NULL,
  complainant_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  location TEXT NOT NULL,
  functional_group TEXT,
  committee_id TEXT REFERENCES committees(id) ON DELETE SET NULL,
  committee_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (
    status IN ('submitted', 'triage', 'assigned', 'acknowledged', 'in_progress', 'awaiting_member', 'awaiting_external', 'escalated', 'resolved', 'closed', 'reopened', 'rejected')
  ),
  status_label TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
  confidential BOOLEAN NOT NULL DEFAULT FALSE,
  affects_others BOOLEAN NOT NULL DEFAULT FALSE,
  level INTEGER NOT NULL DEFAULT 1 CHECK (level IN (1, 2, 3)),
  next_action TEXT NOT NULL DEFAULT 'Committee acknowledges issue',
  assignee_name TEXT,
  due TEXT,
  due_state TEXT NOT NULL DEFAULT 'ok' CHECK (due_state IN ('ok', 'soon', 'overdue')),
  opened_date TEXT NOT NULL DEFAULT 'Today',
  stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Internal notes are STRICTLY CONFIDENTIAL to committee members (PRD §9.6, §9.7)
CREATE TABLE IF NOT EXISTS internal_notes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Member replies & evidence uploads
CREATE TABLE IF NOT EXISTS member_replies (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  text TEXT NOT NULL,
  attachments TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 8. SOCIAL FEED & BROADCAST ANNOUNCEMENTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY DEFAULT ('p-' || gen_random_uuid()::text),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('official', 'member', 'committee')),
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  author_name TEXT NOT NULL,
  author_role TEXT,
  source TEXT NOT NULL,
  time_ago TEXT NOT NULL DEFAULT 'Just now',
  title TEXT,
  body TEXT NOT NULL,
  media TEXT,
  audience_scope TEXT NOT NULL CHECK (audience_scope IN ('local', 'group', 'region', 'org', 'private')),
  audience_label TEXT NOT NULL,
  likes INTEGER NOT NULL DEFAULT 0,
  notify_push BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY DEFAULT ('c-' || gen_random_uuid()::text),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id TEXT,
  author_name TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 9. NOTIFICATIONS (IN-APP RECORD & PUSH LOG)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT ('notif-' || gen_random_uuid()::text),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  recipient_id TEXT, -- Profile ID or NULL for broadcast
  group_name TEXT NOT NULL DEFAULT 'Today',
  kind TEXT NOT NULL CHECK (kind IN ('status', 'announcement', 'reply', 'escalation', 'security', 'appointment')),
  unread BOOLEAN NOT NULL DEFAULT TRUE,
  mandatory BOOLEAN NOT NULL DEFAULT FALSE,
  title TEXT NOT NULL,
  context TEXT NOT NULL,
  time_ago TEXT NOT NULL DEFAULT 'Just now',
  go_target TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 10. IMMUTABLE AUDIT LOG (PRD §5.11, §12.4, §17.15)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT ('aud-' || gen_random_uuid()::text),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tenant_name TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details TEXT NOT NULL,
  reason TEXT,
  is_super_admin_override BOOLEAN NOT NULL DEFAULT FALSE
);

-- ==============================================================================
-- 11. STORED PROCEDURES & BUSINESS LOGIC
-- ==============================================================================

-- Atomic routing & creation of grievances (PRD §9.1, §9.2)
CREATE OR REPLACE FUNCTION route_and_create_issue(
  p_tenant_id TEXT,
  p_complainant_id TEXT,
  p_complainant_name TEXT,
  p_title TEXT,
  p_description TEXT,
  p_category TEXT,
  p_location TEXT,
  p_group TEXT,
  p_priority TEXT,
  p_affects_others BOOLEAN
) RETURNS TEXT AS $$
DECLARE
  v_next_id TEXT;
  v_level INTEGER := 1;
  v_committee_name TEXT;
  v_committee_id TEXT;
  v_is_confidential BOOLEAN := FALSE;
  v_stages JSONB;
BEGIN
  IF p_tenant_id != get_auth_tenant_id() AND NOT auth_has_any_role('super_admin') THEN
    RAISE EXCEPTION 'Permission denied: cannot file grievance in other tenant';
  END IF;

  -- Determine sequence id
  v_next_id := 'CASE-' || floor(1000 + random() * 9000)::text;

  -- Routing rules per PRD §9.2
  IF lower(p_category) LIKE '%harassment%' OR lower(p_category) LIKE '%retaliation%' OR lower(p_category) LIKE '%confidential%' THEN
    v_is_confidential := TRUE;
    v_level := 2; -- Direct escalation for sensitive grievances
    v_committee_name := 'Confidential Grievance Handlers';
  ELSE
    v_committee_name := p_location || ' ' || coalesce(p_group, 'General') || ' Committee';
  END IF;

  -- Look up existing committee or executive committee for tenant
  SELECT id INTO v_committee_id FROM committees WHERE tenant_id = p_tenant_id AND level = v_level LIMIT 1;
  IF v_committee_id IS NULL THEN
    SELECT id, name INTO v_committee_id, v_committee_name FROM committees WHERE tenant_id = p_tenant_id LIMIT 1;
  END IF;

  -- Build initial stages JSON
  v_stages := jsonb_build_array(
    jsonb_build_object(
      'name', v_committee_name,
      'state', 'current',
      'levelShort', 'L' || v_level::text,
      'sub', 'Submitted and routed',
      'due', 'Within 2 days',
      'dueState', 'ok',
      'events', jsonb_build_array(
        jsonb_build_object(
          'time', 'Today',
          'text', 'Submitted and routed by rule: ' || p_category || ' -> ' || v_committee_name,
          'actor', p_complainant_name
        )
      )
    )
  );

  -- Insert issue
  INSERT INTO issues (
    id, tenant_id, complainant_id, complainant_name, title, description, category,
    location, functional_group, committee_id, committee_name, status, priority,
    confidential, affects_others, level, next_action, due, due_state, stages
  ) VALUES (
    v_next_id, p_tenant_id, p_complainant_id, p_complainant_name, p_title, p_description, p_category,
    p_location, p_group, v_committee_id, v_committee_name, 'submitted', p_priority,
    v_is_confidential, p_affects_others, v_level, 'Committee acknowledges your issue', 'Within 2 days', 'ok', v_stages
  );

  -- Insert audit log
  INSERT INTO audit_logs (
    tenant_id, tenant_name, actor_name, actor_role, action, entity_type, entity_id, details
  ) VALUES (
    p_tenant_id, (SELECT name FROM tenants WHERE id = p_tenant_id), p_complainant_name, 'member',
    'Create Issue', 'case', v_next_id, 'Created issue "' || p_title || '" [' || p_category || '] routed to ' || v_committee_name
  );

  -- Insert notification for complainant (Generic lockscreen copy per PRD §11.2)
  INSERT INTO notifications (
    tenant_id, recipient_id, group_name, kind, unread, mandatory, title, context, time_ago, go_target
  ) VALUES (
    p_tenant_id, p_complainant_id, 'Today', 'status', TRUE, FALSE,
    'There is an update to your case ' || v_next_id, 'Issues · ' || v_committee_name, 'Just now', v_next_id
  );

  RETURN v_next_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic escalation function (PRD §9.5, §17.11)
CREATE OR REPLACE FUNCTION escalate_issue_atomic(
  p_issue_id TEXT,
  p_reason TEXT,
  p_actor_name TEXT,
  p_is_auto BOOLEAN DEFAULT FALSE
) RETURNS VOID AS $$
DECLARE
  v_current_level INTEGER;
  v_new_level INTEGER;
  v_tenant_id TEXT;
  v_group TEXT;
  v_complainant_id TEXT;
  v_next_committee TEXT;
BEGIN
  SELECT level, tenant_id, functional_group, complainant_id
    INTO v_current_level, v_tenant_id, v_group, v_complainant_id
    FROM issues WHERE id = p_issue_id;

  IF v_tenant_id != get_auth_tenant_id() AND NOT auth_has_any_role('super_admin') THEN
    RAISE EXCEPTION 'Permission denied for case %', p_issue_id;
  END IF;

  v_new_level := least(3, v_current_level + 1);

  IF v_new_level = 2 THEN
    v_next_committee := 'Regional ' || coalesce(v_group, 'Trade') || ' Committee';
  ELSE
    v_next_committee := 'National Board';
  END IF;

  UPDATE issues
  SET level = v_new_level,
      status = 'escalated',
      committee_name = v_next_committee,
      next_action = 'Level ' || v_new_level::text || ' Committee Review',
      due = 'Review in 7 days',
      due_state = 'ok',
      updated_at = NOW()
  WHERE id = p_issue_id;

  -- Record in audit log
  INSERT INTO audit_logs (
    tenant_id, tenant_name, actor_name, actor_role, action, entity_type, entity_id, details, reason
  ) VALUES (
    v_tenant_id, (SELECT name FROM tenants WHERE id = v_tenant_id), p_actor_name,
    CASE WHEN p_is_auto THEN 'Escalation Engine' ELSE 'Officer' END,
    CASE WHEN p_is_auto THEN 'Auto-Escalate Case' ELSE 'Manual Escalate Case' END,
    'case', p_issue_id, 'Escalated ' || p_issue_id || ' to Tier ' || v_new_level::text, p_reason
  );

  -- Notify complainant
  INSERT INTO notifications (
    tenant_id, recipient_id, group_name, kind, unread, title, context, time_ago, go_target
  ) VALUES (
    v_tenant_id, v_complainant_id, 'Today', 'escalation', TRUE,
    'Your case ' || p_issue_id || ' moved to the next committee level', 'Issues · Escalation Policy', 'Just now', p_issue_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE functional_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE committees ENABLE ROW LEVEL SECURITY;
ALTER TABLE committee_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper functions to prevent RLS recursion and cleanly check roles
CREATE OR REPLACE FUNCTION get_auth_tenant_id() RETURNS TEXT AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_has_any_role(VARIADIC p_roles TEXT[]) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND roles && p_roles
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 1. Tenants policies
DROP POLICY IF EXISTS "Public read tenants" ON tenants;
CREATE POLICY "Public read tenants" ON tenants FOR SELECT USING (active = true);
DROP POLICY IF EXISTS "Allow tenant creation" ON tenants;
CREATE POLICY "Allow tenant creation" ON tenants FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow tenant updates" ON tenants;
CREATE POLICY "Allow tenant updates" ON tenants FOR UPDATE USING (true);

-- 2. Profiles policies
DROP POLICY IF EXISTS "View tenant profiles" ON profiles;
CREATE POLICY "View tenant profiles" ON profiles FOR SELECT
  USING (id = auth.uid() OR tenant_id = get_auth_tenant_id() OR auth_has_any_role('super_admin'));

DROP POLICY IF EXISTS "Insert own profile" ON profiles;
CREATE POLICY "Insert own profile" ON profiles FOR INSERT
  WITH CHECK (id = auth.uid() OR auth_has_any_role('super_admin', 'org_admin'));

DROP POLICY IF EXISTS "Update own profile" ON profiles;
CREATE POLICY "Update own profile" ON profiles FOR UPDATE
  USING (id = auth.uid() OR auth_has_any_role('super_admin', 'org_admin'))
  WITH CHECK (
    -- Non-admins cannot alter their own roles, status, or tenant_id
    (id = auth.uid() AND NOT auth_has_any_role('super_admin', 'org_admin')
     AND roles = (SELECT p.roles FROM profiles p WHERE p.id = auth.uid())
     AND status = (SELECT p.status FROM profiles p WHERE p.id = auth.uid())
     AND tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()))
    OR auth_has_any_role('super_admin', 'org_admin')
  );

-- 3. Issues policies (Strict privacy: confidential cases restricted to assigned handlers and complainant)
DROP POLICY IF EXISTS "View permitted issues" ON issues;
CREATE POLICY "View permitted issues" ON issues FOR SELECT
  USING (
    (tenant_id = get_auth_tenant_id() OR auth_has_any_role('super_admin')) AND (
      complainant_id = auth.uid()::text OR
      (confidential = false AND auth_has_any_role('handler', 'chair', 'org_admin', 'super_admin')) OR
      (confidential = true AND auth_has_any_role('chair', 'org_admin', 'super_admin'))
    )
  );

DROP POLICY IF EXISTS "Insert issues" ON issues;
CREATE POLICY "Insert issues" ON issues FOR INSERT
  WITH CHECK (tenant_id = get_auth_tenant_id() OR auth_has_any_role('super_admin'));

DROP POLICY IF EXISTS "Update issues" ON issues;
CREATE POLICY "Update issues" ON issues FOR UPDATE
  USING (
    (tenant_id = get_auth_tenant_id() OR auth_has_any_role('super_admin')) AND (
      complainant_id = auth.uid()::text OR
      auth_has_any_role('handler', 'chair', 'org_admin', 'super_admin')
    )
  );

-- 4. Internal notes policies: STRICT PRIVACY (Complainants CANNOT read internal notes!)
DROP POLICY IF EXISTS "Committee members only read internal notes" ON internal_notes;
CREATE POLICY "Committee members only read internal notes" ON internal_notes FOR SELECT
  USING (
    (tenant_id = get_auth_tenant_id() OR auth_has_any_role('super_admin')) AND
    auth_has_any_role('handler', 'chair', 'org_admin', 'super_admin')
  );

DROP POLICY IF EXISTS "Committee members insert internal notes" ON internal_notes;
CREATE POLICY "Committee members insert internal notes" ON internal_notes FOR INSERT
  WITH CHECK (
    (tenant_id = get_auth_tenant_id() OR auth_has_any_role('super_admin')) AND
    auth_has_any_role('handler', 'chair', 'org_admin', 'super_admin')
  );

-- 5. Audit logs policies (Admins and authorized reviewers only)
DROP POLICY IF EXISTS "Admins view audit logs" ON audit_logs;
CREATE POLICY "Admins view audit logs" ON audit_logs FOR SELECT
  USING (
    auth_has_any_role('super_admin') OR
    (auth_has_any_role('org_admin') AND tenant_id = get_auth_tenant_id())
  );

DROP POLICY IF EXISTS "Insert audit logs" ON audit_logs;
CREATE POLICY "Insert audit logs" ON audit_logs FOR INSERT
  WITH CHECK (tenant_id = get_auth_tenant_id() OR auth_has_any_role('super_admin', 'org_admin'));

-- 6. Geographic units and functional groups policies
DROP POLICY IF EXISTS "View tenant geo_units" ON geo_units;
CREATE POLICY "View tenant geo_units" ON geo_units FOR SELECT USING (true);
DROP POLICY IF EXISTS "Insert tenant geo_units" ON geo_units;
CREATE POLICY "Insert tenant geo_units" ON geo_units FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "View tenant functional_groups" ON functional_groups;
CREATE POLICY "View tenant functional_groups" ON functional_groups FOR SELECT USING (true);
DROP POLICY IF EXISTS "Insert tenant functional_groups" ON functional_groups;
CREATE POLICY "Insert tenant functional_groups" ON functional_groups FOR INSERT WITH CHECK (true);

-- 7. Committees and appointments
DROP POLICY IF EXISTS "View tenant committees" ON committees;
CREATE POLICY "View tenant committees" ON committees FOR SELECT USING (true);
DROP POLICY IF EXISTS "Insert tenant committees" ON committees;
CREATE POLICY "Insert tenant committees" ON committees FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "View tenant committee_members" ON committee_members;
CREATE POLICY "View tenant committee_members" ON committee_members FOR SELECT USING (true);
DROP POLICY IF EXISTS "Insert tenant committee_members" ON committee_members;
CREATE POLICY "Insert tenant committee_members" ON committee_members FOR INSERT WITH CHECK (true);

-- 8. Social feed posts & comments (Strict tenant-isolated)
DROP POLICY IF EXISTS "View tenant posts" ON posts;
CREATE POLICY "View tenant posts" ON posts FOR SELECT
  USING (tenant_id = get_auth_tenant_id() OR auth_has_any_role('super_admin'));

DROP POLICY IF EXISTS "Insert tenant posts" ON posts;
CREATE POLICY "Insert tenant posts" ON posts FOR INSERT
  WITH CHECK (tenant_id = get_auth_tenant_id() OR auth_has_any_role('super_admin'));

DROP POLICY IF EXISTS "Update tenant posts" ON posts;
CREATE POLICY "Update tenant posts" ON posts FOR UPDATE
  USING (tenant_id = get_auth_tenant_id() OR auth_has_any_role('super_admin'));

DROP POLICY IF EXISTS "Public comments read" ON comments;
CREATE POLICY "Public comments read" ON comments FOR SELECT
  USING (tenant_id = get_auth_tenant_id() OR auth_has_any_role('super_admin'));

DROP POLICY IF EXISTS "Public comments insert" ON comments;
CREATE POLICY "Public comments insert" ON comments FOR INSERT
  WITH CHECK (tenant_id = get_auth_tenant_id() OR auth_has_any_role('super_admin'));

-- 9. Notifications (Strict recipient & tenant-isolated)
DROP POLICY IF EXISTS "View own notifications" ON notifications;
CREATE POLICY "View own notifications" ON notifications FOR SELECT
  USING (
    (recipient_id = auth.uid()::text OR (recipient_id IS NULL AND tenant_id = get_auth_tenant_id()))
    OR auth_has_any_role('super_admin')
  );

DROP POLICY IF EXISTS "Insert notifications" ON notifications;
CREATE POLICY "Insert notifications" ON notifications FOR INSERT
  WITH CHECK (tenant_id = get_auth_tenant_id() OR auth_has_any_role('super_admin'));
-- 10. OTP & Platform Admins
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public otp access" ON otp_verifications;
CREATE POLICY "Public otp access" ON otp_verifications FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read platform_admins" ON platform_admins;
CREATE POLICY "Public read platform_admins" ON platform_admins FOR SELECT USING (active = true);

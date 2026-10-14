-- ==============================================================================
-- UNION MULTI-TENANT MEMBERSHIP, COMMUNITY & ISSUE-MANAGEMENT PLATFORM
-- PostgreSQL schema, Row Level Security and server-side business logic (PRD v1.2)
--
-- Security model (PRD §12, §15.1):
--   * The mobile/web client only ever holds the anon/publishable key and the
--     signed-in user's JWT. The service-role key is never shipped to clients.
--   * Clients may READ through RLS. Every WRITE that needs an authority check
--     goes through a SECURITY DEFINER function below that re-checks the caller
--     (auth.uid()) against tenant membership, committee appointments and roles.
--   * Platform Super Admin is a separate, platform-level role stored in
--     platform_admins. It is never a tenant role and is never inherited.
--
-- This file is idempotent: it can be run on a fresh project or re-run on the
-- previous version of this schema (it migrates columns, constraints and data).
-- ==============================================================================

-- gen_random_uuid() and md5() are built into PostgreSQL 13+; no extension needed.

-- ==============================================================================
-- 1. TENANTS (ORGANIZATION ISOLATION BOUNDARY)
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
  settings JSONB NOT NULL DEFAULT '{
    "autoApproveMembers": false,
    "reopenWindowDays": 30,
    "memberPosts": true
  }'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{
  "autoApproveMembers": false, "reopenWindowDays": 30, "memberPosts": true }'::jsonb;

-- ==============================================================================
-- 2. PLATFORM SUPER ADMINS (PRD §5.11) — platform-level, never a tenant role
-- ==============================================================================
-- Rows are inserted by the platform operator in the SQL editor, e.g.
--   INSERT INTO platform_admins (phone, name) VALUES ('+917995731200', 'Ops');
-- A user is a platform admin when their verified Supabase Auth phone matches.
CREATE TABLE IF NOT EXISTS platform_admins (
  phone TEXT PRIMARY KEY,
  name TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- The old client-checked "setup key" is removed entirely.
ALTER TABLE platform_admins DROP COLUMN IF EXISTS setup_key;

-- The old public OTP table let anyone read codes / mark them verified. Supabase
-- Auth phone OTP is used instead, so the table is dropped.
DROP TABLE IF EXISTS otp_verifications;

-- ==============================================================================
-- 3. MEMBERSHIPS / PROFILES
-- One row per (person, organization). A person may hold several memberships
-- (PRD §4.1). profiles.id is the membership id; profiles.user_id is the person.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT,
  unit TEXT NOT NULL,            -- Local/City unit
  region TEXT NOT NULL,          -- State/Region
  country TEXT NOT NULL DEFAULT 'India',
  groups TEXT[] NOT NULL DEFAULT '{}',
  roles TEXT[] NOT NULL DEFAULT '{"member"}',
  status TEXT NOT NULL DEFAULT 'pending',
  notification_prefs JSONB NOT NULL DEFAULT '{
    "announcements": true,
    "replies": true,
    "groupActivity": false,
    "caseUpdates": true
  }'::jsonb,
  status_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migrate the previous shape (id was the auth user id, one org per person).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status_reason TEXT;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
UPDATE profiles p SET user_id = p.id
  WHERE p.user_id IS NULL AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_tenant_uq ON profiles(user_id, tenant_id);

-- Tenant roles only. Committee authority comes from committee_members, and the
-- platform role lives in platform_admins (PRD §12.1: no inheritance).
UPDATE profiles SET roles = ARRAY(
  SELECT DISTINCT r FROM unnest(roles || ARRAY['member']) r
  WHERE r IN ('member', 'org_admin', 'membership_admin', 'moderator')
);
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_roles_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_roles_check
  CHECK (roles <@ ARRAY['member', 'org_admin', 'membership_admin', 'moderator']::text[]);
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('verified', 'pending', 'suspended', 'rejected', 'ended'));

-- ==============================================================================
-- 4. GEOGRAPHIC ADMINISTRATIVE HIERARCHY (PRD §4.2)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS geo_units (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('country', 'state', 'city', 'local')),
  kind TEXT NOT NULL,
  parent_id TEXT REFERENCES geo_units(id) ON DELETE SET NULL,
  member_count INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 5. FUNCTIONAL GROUPS (PRD §4.3)
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
-- 6. COMMITTEES & GOVERNANCE (PRD §4.4, §4.5)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS committees (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  scope TEXT NOT NULL,
  level INTEGER NOT NULL CHECK (level >= 1), -- Dynamic organizational level (unbounded, 1..N)
  functional_group TEXT,                              -- NULL = general / cross-functional
  geo_unit_id TEXT REFERENCES geo_units(id) ON DELETE SET NULL,
  escalates_to_id TEXT REFERENCES committees(id) ON DELETE SET NULL,
  method TEXT NOT NULL,
  term TEXT NOT NULL,
  response_hours INTEGER NOT NULL DEFAULT 48,
  resolution_hours INTEGER NOT NULL DEFAULT 336,
  responsibilities JSONB NOT NULL DEFAULT '{
    "handles": "Local grievances",
    "escalatesTo": "Next level committee",
    "publishScope": "Authorized membership"
  }'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE committees ADD COLUMN IF NOT EXISTS functional_group TEXT;
ALTER TABLE committees ADD COLUMN IF NOT EXISTS geo_unit_id TEXT REFERENCES geo_units(id) ON DELETE SET NULL;
ALTER TABLE committees ADD COLUMN IF NOT EXISTS escalates_to_id TEXT REFERENCES committees(id) ON DELETE SET NULL;
ALTER TABLE committees ADD COLUMN IF NOT EXISTS response_hours INTEGER NOT NULL DEFAULT 48;
ALTER TABLE committees ADD COLUMN IF NOT EXISTS resolution_hours INTEGER NOT NULL DEFAULT 336;
ALTER TABLE committees ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE committees ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- Appointment records with a full lifecycle (PRD §4.5 "Appointment record").
CREATE TABLE IF NOT EXISTS committee_members (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  committee_id TEXT NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  formation_type TEXT NOT NULL,
  method TEXT NOT NULL,
  since TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  initiated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_override BOOLEAN NOT NULL DEFAULT FALSE,
  override_reason TEXT,
  status_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE committee_members ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE committee_members ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
ALTER TABLE committee_members ADD COLUMN IF NOT EXISTS initiated_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE committee_members ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE committee_members ADD COLUMN IF NOT EXISTS status_reason TEXT;
ALTER TABLE committee_members DROP CONSTRAINT IF EXISTS committee_members_role_check;
ALTER TABLE committee_members ADD CONSTRAINT committee_members_role_check
  CHECK (role IN ('Chair', 'Secretary', 'Issue handler', 'Member'));
ALTER TABLE committee_members DROP CONSTRAINT IF EXISTS committee_members_formation_type_check;
ALTER TABLE committee_members ADD CONSTRAINT committee_members_formation_type_check
  CHECK (formation_type IN ('Appointment', 'Nomination & approval', 'Election', 'Eligibility-based selection', 'Platform admin override'));
ALTER TABLE committee_members DROP CONSTRAINT IF EXISTS committee_members_status_check;
ALTER TABLE committee_members ADD CONSTRAINT committee_members_status_check
  CHECK (status IN ('pending', 'active', 'suspended', 'expired', 'revoked', 'replaced'));
UPDATE committee_members SET start_date = created_at WHERE start_date IS NULL AND status = 'active';

-- ==============================================================================
-- 7. ISSUES (PRIVATE WORKFLOW RECORDS, PRD §9)
-- ==============================================================================
CREATE SEQUENCE IF NOT EXISTS issue_seq START 1001;
CREATE SEQUENCE IF NOT EXISTS member_seq START 1001;

CREATE TABLE IF NOT EXISTS issues (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  complainant_id TEXT NOT NULL,           -- profiles.id (membership) of the complainant
  complainant_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  location TEXT NOT NULL,
  functional_group TEXT,
  committee_id TEXT REFERENCES committees(id) ON DELETE SET NULL,
  committee_name TEXT NOT NULL,
  handled_committee_ids TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'submitted',
  status_label TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
  confidential BOOLEAN NOT NULL DEFAULT FALSE,
  affects_others BOOLEAN NOT NULL DEFAULT FALSE,
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  next_action TEXT NOT NULL DEFAULT 'Committee acknowledges issue',
  assignee_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assignee_name TEXT,
  due TEXT,
  due_state TEXT NOT NULL DEFAULT 'ok' CHECK (due_state IN ('ok', 'soon', 'overdue')),
  due_at TIMESTAMPTZ,
  reminded_at TIMESTAMPTZ,
  resolution_summary TEXT,
  last_reason TEXT,
  opened_date TEXT NOT NULL DEFAULT 'Today',
  stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);
ALTER TABLE issues ADD COLUMN IF NOT EXISTS handled_committee_ids TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE issues ADD COLUMN IF NOT EXISTS assignee_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS reminded_at TIMESTAMPTZ;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS resolution_summary TEXT;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS last_reason TEXT;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ;
ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_status_check;
ALTER TABLE issues ADD CONSTRAINT issues_status_check CHECK (
  status IN ('submitted', 'triage', 'assigned', 'acknowledged', 'in_progress', 'awaiting_member',
             'awaiting_external', 'escalated', 'resolved', 'closed', 'reopened', 'rejected')
);
CREATE INDEX IF NOT EXISTS issues_tenant_idx ON issues(tenant_id);
CREATE INDEX IF NOT EXISTS issues_due_idx ON issues(due_at) WHERE due_at IS NOT NULL;

-- Configurable routing rules (PRD §9.2). target_kind:
--   'group'     -> committee for the member's functional group at start_level
--   'general'   -> general (cross-functional) committee at start_level
--   'committee' -> the explicit target_committee_id
CREATE TABLE IF NOT EXISTS routing_rules (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  target_kind TEXT NOT NULL DEFAULT 'group' CHECK (target_kind IN ('group', 'general', 'committee')),
  target_committee_id TEXT REFERENCES committees(id) ON DELETE SET NULL,
  start_level INTEGER NOT NULL DEFAULT 1 CHECK (start_level >= 1),
  confidential BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 100,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, category)
);

-- Internal notes are confidential to authorized handlers (PRD §9.6, §9.7)
CREATE TABLE IF NOT EXISTS internal_notes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  author_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE internal_notes ADD COLUMN IF NOT EXISTS author_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Member replies (visible to the complainant and handlers)
CREATE TABLE IF NOT EXISTS member_replies (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  author_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  text TEXT NOT NULL,
  attachments TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE member_replies ADD COLUMN IF NOT EXISTS author_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Evidence / attachments stored in the private "evidence" bucket (PRD §9.1, §9.7)
CREATE TABLE IF NOT EXISTS issue_attachments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  internal BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 8. SOCIAL FEED, ANNOUNCEMENTS, CHAT (PRD §8)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY DEFAULT ('p-' || gen_random_uuid()::text),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('official', 'member', 'committee')),
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  author_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  author_role TEXT,
  source TEXT NOT NULL,
  time_ago TEXT NOT NULL DEFAULT 'Just now',
  title TEXT,
  body TEXT NOT NULL,
  media TEXT,
  audience_scope TEXT NOT NULL,
  audience_value TEXT,
  audience_label TEXT NOT NULL,
  likes INTEGER NOT NULL DEFAULT 0,
  notify_push BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  removed BOOLEAN NOT NULL DEFAULT FALSE,
  removed_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS author_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS audience_value TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS removed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS removed_reason TEXT;
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_audience_scope_check;
UPDATE posts SET audience_scope = 'org' WHERE audience_scope NOT IN ('local', 'group', 'region', 'org', 'committee');
ALTER TABLE posts ADD CONSTRAINT posts_audience_scope_check
  CHECK (audience_scope IN ('local', 'group', 'region', 'org', 'committee'));

-- Migrate comments: earlier schema created comments without tenant_id.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'comments') THEN
    ALTER TABLE comments ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE;
    ALTER TABLE comments ADD COLUMN IF NOT EXISTS author_id TEXT;
    ALTER TABLE comments ADD COLUMN IF NOT EXISTS removed BOOLEAN NOT NULL DEFAULT FALSE;
    UPDATE comments c SET tenant_id = p.tenant_id FROM posts p WHERE c.post_id = p.id AND c.tenant_id IS NULL;
    DELETE FROM comments WHERE tenant_id IS NULL;
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY DEFAULT ('c-' || gen_random_uuid()::text),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id TEXT,
  author_name TEXT NOT NULL,
  text TEXT NOT NULL,
  removed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE comments ADD COLUMN IF NOT EXISTS removed BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS post_likes (
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, profile_id)
);

CREATE TABLE IF NOT EXISTS post_reports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  reporter_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'actioned', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, reporter_profile_id)
);

-- Group chat for geographic, functional-group and committee spaces (PRD §8.2)
CREATE TABLE IF NOT EXISTS group_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel_scope TEXT NOT NULL CHECK (channel_scope IN ('local', 'group', 'region', 'org', 'committee')),
  channel_value TEXT,
  author_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS group_messages_channel_idx ON group_messages(tenant_id, channel_scope, channel_value, created_at);

-- ==============================================================================
-- 9. NOTIFICATIONS (IN-APP RECORD, PUSH OUTBOX, DEVICE TOKENS — PRD §11)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT ('notif-' || gen_random_uuid()::text),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  recipient_id TEXT,  -- profiles.id; every row is addressed (no NULL broadcasts)
  event_key TEXT,
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
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS event_key TEXT;
DELETE FROM notifications WHERE recipient_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS notifications_dedup_uq ON notifications(recipient_id, event_key);

CREATE TABLE IF NOT EXISTS device_tokens (
  token TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Durable push queue drained by the dispatch-push Edge Function (server side).
CREATE TABLE IF NOT EXISTS notification_outbox (
  id BIGSERIAL PRIMARY KEY,
  notification_id TEXT NOT NULL UNIQUE REFERENCES notifications(id) ON DELETE CASCADE,
  recipient_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  mandatory BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS notification_outbox_pending_idx ON notification_outbox(next_attempt_at) WHERE status = 'pending';

-- ==============================================================================
-- 10. APPEND-ONLY AUDIT LOG (PRD §5.11, §12.4)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT ('aud-' || gen_random_uuid()::text),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  tenant_name TEXT NOT NULL,
  actor_user_id UUID,
  actor_profile_id UUID,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details TEXT NOT NULL,
  reason TEXT,
  is_super_admin_override BOOLEAN NOT NULL DEFAULT FALSE
);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_user_id UUID;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_profile_id UUID;

CREATE OR REPLACE FUNCTION audit_logs_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS audit_logs_no_update ON audit_logs;
CREATE TRIGGER audit_logs_no_update BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_immutable();

-- ==============================================================================
-- 11. HELPER FUNCTIONS (SECURITY DEFINER, used by RLS and RPCs)
-- ==============================================================================
CREATE OR REPLACE FUNCTION slugify(p TEXT) RETURNS TEXT AS $$
  SELECT trim(both '-' from regexp_replace(lower(coalesce(p, '')), '[^a-z0-9]+', '-', 'g'));
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION digits_only(p TEXT) RETURNS TEXT AS $$
  SELECT regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g');
$$ LANGUAGE sql IMMUTABLE;

-- E.164 digits with the app's rule: a bare 10-digit number means India (+91).
CREATE OR REPLACE FUNCTION e164_digits(p TEXT) RETURNS TEXT AS $$
  SELECT CASE WHEN length(digits_only(p)) = 10 THEN '91' || digits_only(p) ELSE digits_only(p) END;
$$ LANGUAGE sql IMMUTABLE;

-- Platform Super Admin: the caller's verified auth phone is in platform_admins.
-- Exact match on the full number incl. country code ('+917995731200', '917995731200'
-- and '7995731200' are the same number; '+447995731200' is not).
CREATE OR REPLACE FUNCTION is_platform_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_admins pa
    JOIN auth.users u ON u.id = auth.uid()
    WHERE pa.active
      AND u.phone_confirmed_at IS NOT NULL
      AND e164_digits(pa.phone) = e164_digits(u.phone)
      AND length(digits_only(u.phone)) >= 10
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- The caller's membership (profile id) in a tenant, any status.
CREATE OR REPLACE FUNCTION my_profile_id(p_tenant TEXT) RETURNS UUID AS $$
  SELECT id FROM profiles WHERE user_id = auth.uid() AND tenant_id = p_tenant LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Verified (approved, not suspended) membership — the gate for tenant content.
CREATE OR REPLACE FUNCTION is_member(p_tenant TEXT) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND tenant_id = p_tenant AND status = 'verified'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION has_tenant_role(p_tenant TEXT, VARIADIC p_roles TEXT[]) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND tenant_id = p_tenant AND status = 'verified' AND roles && p_roles
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Active committee appointment for the caller (end date / suspension respected,
-- so leaving a committee removes access immediately — PRD §8.2, §4.5).
CREATE OR REPLACE FUNCTION committee_role(p_committee TEXT) RETURNS TEXT AS $$
  SELECT cm.role FROM committee_members cm
  JOIN profiles p ON p.id = cm.profile_id
  WHERE cm.committee_id = p_committee
    AND p.user_id = auth.uid() AND p.status = 'verified'
    AND cm.status = 'active'
    AND (cm.end_date IS NULL OR cm.end_date > NOW())
  ORDER BY CASE cm.role WHEN 'Chair' THEN 1 WHEN 'Secretary' THEN 2 WHEN 'Issue handler' THEN 3 ELSE 4 END
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_committee_member(p_committee TEXT) RETURNS BOOLEAN AS $$
  SELECT committee_role(p_committee) IS NOT NULL;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Can the caller handle (view queue item / act on) this issue?
CREATE OR REPLACE FUNCTION can_handle_issue(p_issue TEXT) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM issues i
    WHERE i.id = p_issue AND (
      is_platform_admin()
      -- Triage queue (no committee matched) belongs to org admins
      OR (i.committee_id IS NULL AND has_tenant_role(i.tenant_id, 'org_admin'))
      -- Non-confidential oversight for org admins
      OR (NOT i.confidential AND has_tenant_role(i.tenant_id, 'org_admin'))
      -- Current or previous committee in the escalation chain
      OR EXISTS (
        SELECT 1 FROM unnest(array_append(i.handled_committee_ids, i.committee_id)) c(cid)
        WHERE cid IS NOT NULL
          AND committee_role(cid) IS NOT NULL
          AND (NOT i.confidential OR committee_role(cid) IN ('Chair', 'Issue handler'))
      )
    )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_my_issue(p_issue TEXT) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM issues i JOIN profiles p ON p.id::text = i.complainant_id
    WHERE i.id = p_issue AND p.user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Is the caller in an audience (posts, chat channels)? PRD §8.1, §8.3
CREATE OR REPLACE FUNCTION in_audience(p_tenant TEXT, p_scope TEXT, p_value TEXT) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() AND p.tenant_id = p_tenant AND p.status = 'verified' AND (
      p_scope = 'org'
      OR (p_scope = 'local' AND lower(p.unit) = lower(coalesce(p_value, '')))
      OR (p_scope = 'region' AND lower(p.region) = lower(coalesce(p_value, '')))
      OR (p_scope = 'group' AND lower(coalesce(p_value, '')) = ANY (SELECT lower(g) FROM unnest(p.groups) g))
      OR (p_scope = 'committee' AND committee_role(p_value) IS NOT NULL)
    )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION can_view_post(p_post TEXT) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM posts po WHERE po.id = p_post AND (
      is_platform_admin()
      OR has_tenant_role(po.tenant_id, 'org_admin', 'moderator')
      OR (NOT po.removed AND (po.expires_at IS NULL OR po.expires_at > NOW())
          AND in_audience(po.tenant_id, po.audience_scope, po.audience_value))
    )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Append an event to the last stage of an issue timeline.
CREATE OR REPLACE FUNCTION stage_append_event(p_stages JSONB, p_text TEXT, p_actor TEXT) RETURNS JSONB AS $$
DECLARE
  v_last INTEGER := jsonb_array_length(coalesce(p_stages, '[]'::jsonb)) - 1;
  v_evt JSONB := jsonb_build_object('time', to_char(NOW(), 'DD Mon HH24:MI'), 'text', p_text, 'actor', p_actor);
BEGIN
  IF v_last < 0 THEN
    RETURN jsonb_build_array(jsonb_build_object('name', 'Case', 'state', 'current', 'events', jsonb_build_array(v_evt)));
  END IF;
  RETURN jsonb_set(p_stages, ARRAY[v_last::text, 'events'],
                   coalesce(p_stages -> v_last -> 'events', '[]'::jsonb) || jsonb_build_array(v_evt));
END;
$$ LANGUAGE plpgsql;

-- Audit writer used by every RPC. Never callable by clients directly.
CREATE OR REPLACE FUNCTION write_audit(
  p_tenant TEXT, p_actor_role TEXT, p_action TEXT, p_entity_type TEXT, p_entity_id TEXT,
  p_details TEXT, p_reason TEXT DEFAULT NULL, p_override BOOLEAN DEFAULT FALSE
) RETURNS VOID AS $$
DECLARE
  v_profile UUID := my_profile_id(p_tenant);
  v_name TEXT;
BEGIN
  SELECT name INTO v_name FROM profiles WHERE id = v_profile;
  IF v_name IS NULL THEN
    v_name := CASE WHEN auth.uid() IS NULL THEN 'Escalation engine'
                   WHEN is_platform_admin() THEN 'Platform Super Admin' ELSE 'Unknown' END;
  END IF;
  INSERT INTO audit_logs (tenant_id, tenant_name, actor_user_id, actor_profile_id, actor_name, actor_role,
                          action, entity_type, entity_id, details, reason, is_super_admin_override)
  VALUES (p_tenant, (SELECT name FROM tenants WHERE id = p_tenant), auth.uid(), v_profile, v_name, p_actor_role,
          p_action, p_entity_type, p_entity_id, p_details, p_reason, p_override);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- In-app notification (durable) + push outbox row when the member's preferences
-- allow it. Deduplicated by (recipient, event_key) — PRD §11.2, §11.3, AC #25.
CREATE OR REPLACE FUNCTION notify_profile(
  p_tenant TEXT, p_recipient UUID, p_kind TEXT, p_title TEXT, p_context TEXT,
  p_go_target TEXT, p_event_key TEXT, p_push BOOLEAN DEFAULT TRUE, p_mandatory BOOLEAN DEFAULT FALSE,
  p_push_body TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_id TEXT;
  v_prefs JSONB;
  v_pref_key TEXT;
BEGIN
  IF p_recipient IS NULL THEN RETURN; END IF;
  INSERT INTO notifications (tenant_id, recipient_id, event_key, kind, mandatory, title, context, go_target)
  VALUES (p_tenant, p_recipient::text, p_event_key, p_kind, p_mandatory, p_title, p_context, p_go_target)
  ON CONFLICT (recipient_id, event_key) DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL OR NOT p_push THEN RETURN; END IF;

  SELECT notification_prefs INTO v_prefs FROM profiles WHERE id = p_recipient;
  v_pref_key := CASE p_kind WHEN 'announcement' THEN 'announcements' WHEN 'reply' THEN 'replies'
                            WHEN 'status' THEN 'caseUpdates' WHEN 'escalation' THEN 'caseUpdates' ELSE NULL END;
  IF NOT p_mandatory AND v_pref_key IS NOT NULL AND coalesce((v_prefs ->> v_pref_key)::boolean, TRUE) = FALSE THEN
    RETURN;
  END IF;
  -- Lock-screen text never carries case details (PRD §11.2)
  INSERT INTO notification_outbox (notification_id, recipient_profile_id, title, body, data, mandatory)
  VALUES (v_id, p_recipient, 'Union',
          coalesce(p_push_body, CASE WHEN p_kind IN ('status', 'escalation', 'reply') THEN 'There is an update to your case.'
                                     ELSE p_title END),
          jsonb_build_object('url', p_go_target, 'tenant', p_tenant, 'kind', p_kind), p_mandatory)
  ON CONFLICT (notification_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION notify_committee(
  p_tenant TEXT, p_committee TEXT, p_kind TEXT, p_title TEXT, p_context TEXT, p_go_target TEXT, p_event_key TEXT,
  p_roles TEXT[] DEFAULT NULL
) RETURNS VOID AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT cm.profile_id FROM committee_members cm
    WHERE cm.committee_id = p_committee AND cm.status = 'active' AND cm.profile_id IS NOT NULL
      AND (cm.end_date IS NULL OR cm.end_date > NOW())
      AND (p_roles IS NULL OR cm.role = ANY (p_roles))
  LOOP
    PERFORM notify_profile(p_tenant, r.profile_id, p_kind, p_title, p_context, p_go_target, p_event_key, TRUE, TRUE,
                           'A case needs attention from your committee.');
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION notify_org_admins(
  p_tenant TEXT, p_kind TEXT, p_title TEXT, p_context TEXT, p_go_target TEXT, p_event_key TEXT
) RETURNS VOID AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM profiles WHERE tenant_id = p_tenant AND status = 'verified' AND roles && ARRAY['org_admin', 'membership_admin'] LOOP
    PERFORM notify_profile(p_tenant, r.id, p_kind, p_title, p_context, p_go_target, p_event_key, TRUE, TRUE,
                           'An item needs your review.');
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure city -> state -> country geo units exist for a membership.
CREATE OR REPLACE FUNCTION ensure_geo_path(p_tenant TEXT, p_city TEXT, p_region TEXT, p_country TEXT) RETURNS TEXT AS $$
DECLARE
  v_country TEXT := p_tenant || '-country-' || slugify(p_country);
  v_state TEXT := p_tenant || '-state-' || slugify(p_region);
  v_city TEXT := p_tenant || '-city-' || slugify(p_region) || '-' || slugify(p_city);
BEGIN
  INSERT INTO geo_units (id, tenant_id, name, type, kind, parent_id)
  VALUES (v_country, p_tenant, p_country, 'country', 'Country', NULL) ON CONFLICT (id) DO NOTHING;
  INSERT INTO geo_units (id, tenant_id, name, type, kind, parent_id)
  VALUES (v_state, p_tenant, p_region, 'state', 'State', v_country) ON CONFLICT (id) DO NOTHING;
  INSERT INTO geo_units (id, tenant_id, name, type, kind, parent_id)
  VALUES (v_city, p_tenant, p_city, 'city', 'City', v_state) ON CONFLICT (id) DO NOTHING;
  RETURN v_city;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION refresh_member_counts(p_tenant TEXT) RETURNS VOID AS $$
BEGIN
  UPDATE geo_units g SET member_count = (
    SELECT count(*) FROM profiles p WHERE p.tenant_id = g.tenant_id AND p.status = 'verified' AND (
      (g.type = 'city' AND lower(p.unit) = lower(g.name)) OR
      (g.type = 'state' AND lower(p.region) = lower(g.name)) OR
      (g.type = 'country' AND lower(p.country) = lower(g.name))))
  WHERE g.tenant_id = p_tenant;
  UPDATE functional_groups f SET member_count = (
    SELECT count(*) FROM profiles p WHERE p.tenant_id = f.tenant_id AND p.status = 'verified'
      AND lower(f.name) = ANY (SELECT lower(x) FROM unnest(p.groups) x))
  WHERE f.tenant_id = p_tenant;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Protect against removing the last active Platform Super Admin (PRD §5.11).
CREATE OR REPLACE FUNCTION platform_admins_keep_one() RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'DELETE' AND OLD.active) OR (TG_OP = 'UPDATE' AND OLD.active AND NOT NEW.active) THEN
    IF (SELECT count(*) FROM platform_admins WHERE active AND phone <> OLD.phone) = 0 THEN
      RAISE EXCEPTION 'Cannot remove the last active Platform Super Admin';
    END IF;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS platform_admins_keep_one ON platform_admins;
CREATE TRIGGER platform_admins_keep_one BEFORE UPDATE OR DELETE ON platform_admins
  FOR EACH ROW EXECUTE FUNCTION platform_admins_keep_one();

-- ==============================================================================
-- 12. RPCs — ONBOARDING, MEMBERSHIP, SETTINGS
-- ==============================================================================

-- All memberships of the signed-in person (full personal fields, own rows only).
CREATE OR REPLACE FUNCTION get_my_memberships() RETURNS SETOF profiles AS $$
  SELECT * FROM profiles WHERE user_id = auth.uid() ORDER BY created_at;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Join-by-code lookup without exposing the tenant list (PRD §6.1 step 1).
CREATE OR REPLACE FUNCTION find_org_by_code(p_code TEXT)
RETURNS TABLE (id TEXT, name TEXT, short_name TEXT, code TEXT, description TEXT, terminology JSONB) AS $$
  SELECT t.id, t.name, t.short_name, t.code, t.description, t.terminology
  FROM tenants t WHERE t.active AND upper(t.code) = upper(trim(p_code)) LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Organization creation — Platform Super Admin only (PRD §5.11, AC #1).
CREATE OR REPLACE FUNCTION create_organization(
  p_name TEXT, p_code TEXT, p_short TEXT, p_description TEXT, p_terminology JSONB,
  p_admin_name TEXT, p_admin_email TEXT, p_hq_city TEXT, p_hq_region TEXT, p_country TEXT DEFAULT 'India'
) RETURNS TEXT AS $$
DECLARE
  v_id TEXT := slugify(p_code);
  v_profile UUID;
  v_city TEXT;
  v_committee TEXT;
  v_phone TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Only a Platform Super Admin can create organizations';
  END IF;
  IF v_id = '' OR coalesce(trim(p_name), '') = '' THEN
    RAISE EXCEPTION 'Organization name and code are required';
  END IF;
  IF EXISTS (SELECT 1 FROM tenants WHERE id = v_id OR upper(code) = upper(p_code)) THEN
    RAISE EXCEPTION 'Organization code % is already taken', upper(p_code);
  END IF;

  INSERT INTO tenants (id, name, short_name, code, description, terminology)
  VALUES (v_id, trim(p_name), upper(coalesce(nullif(trim(p_short), ''), left(p_code, 4))), upper(trim(p_code)),
          p_description,
          '{"orgLabel":"Organization","level1Label":"City","level2Label":"State","level3Label":"National","groupLabel":"Functional Group","caseLabel":"Issue"}'::jsonb
            || coalesce(p_terminology, '{}'::jsonb));

  v_city := ensure_geo_path(v_id, coalesce(nullif(trim(p_hq_city), ''), 'Headquarters'),
                            coalesce(nullif(trim(p_hq_region), ''), 'Central'), coalesce(p_country, 'India'));

  SELECT phone INTO v_phone FROM auth.users WHERE id = auth.uid();
  INSERT INTO profiles (user_id, tenant_id, member_number, name, email, phone, unit, region, country, groups, roles, status)
  VALUES (auth.uid(), v_id, upper(p_code) || '-0001', trim(p_admin_name), coalesce(p_admin_email, ''), v_phone,
          coalesce(nullif(trim(p_hq_city), ''), 'Headquarters'), coalesce(nullif(trim(p_hq_region), ''), 'Central'),
          coalesce(p_country, 'India'), ARRAY['Administration'], ARRAY['member', 'org_admin'], 'verified')
  RETURNING id INTO v_profile;

  INSERT INTO committees (tenant_id, name, scope, level, method, term, responsibilities)
  VALUES (v_id, trim(p_name) || ' Executive Committee', 'Organization-wide', 3, 'Appointment', to_char(NOW(), 'YYYY') || ' – ' || to_char(NOW() + interval '2 years', 'YYYY'),
          '{"handles":"Organization-wide and escalated grievances","escalatesTo":"Final level","publishScope":"Whole organization"}'::jsonb)
  RETURNING id INTO v_committee;

  INSERT INTO committee_members (committee_id, tenant_id, profile_id, name, role, formation_type, method, since, status,
                                 start_date, initiated_by, approved_by, is_override, override_reason)
  VALUES (v_committee, v_id, v_profile, trim(p_admin_name), 'Chair', 'Platform admin override', 'Founding appointment by platform admin',
          to_char(NOW(), 'DD Mon YYYY'), 'active', NOW(), v_profile, v_profile, TRUE, 'Founding chair at organization creation');

  -- Default, editable routing rules (PRD §9.2)
  INSERT INTO routing_rules (tenant_id, category, target_kind, start_level, confidential, sort_order) VALUES
    (v_id, 'Wages', 'group', 1, FALSE, 10),
    (v_id, 'Working hours', 'group', 1, FALSE, 20),
    (v_id, 'Health & safety', 'group', 1, FALSE, 30),
    (v_id, 'Facilities', 'general', 1, FALSE, 40),
    (v_id, 'Harassment (confidential)', 'general', 2, TRUE, 50)
  ON CONFLICT DO NOTHING;

  PERFORM write_audit(v_id, 'platform_admin', 'Create Organization', 'tenant', v_id,
                      'Created organization "' || trim(p_name) || '" (' || upper(p_code) || ')', NULL, TRUE);
  PERFORM write_audit(v_id, 'platform_admin', 'Appoint Committee Member', 'committee_member', v_committee,
                      trim(p_admin_name) || ' appointed Chair of the Executive Committee by Platform Super Admin',
                      'Founding chair at organization creation', TRUE);
  PERFORM refresh_member_counts(v_id);
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Member application (PRD §6.1). Creates a PENDING membership for the caller.
CREATE OR REPLACE FUNCTION register_member(
  p_org_code TEXT, p_name TEXT, p_email TEXT, p_city TEXT, p_region TEXT, p_group TEXT, p_country TEXT DEFAULT 'India'
) RETURNS UUID AS $$
DECLARE
  v_tenant tenants%ROWTYPE;
  v_profile UUID;
  v_phone TEXT;
  v_status TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  SELECT * INTO v_tenant FROM tenants WHERE active AND upper(code) = upper(trim(p_org_code));
  IF v_tenant.id IS NULL THEN RAISE EXCEPTION 'No organization matches code %', upper(p_org_code); END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND tenant_id = v_tenant.id) THEN
    RAISE EXCEPTION 'You already have a membership in %', v_tenant.name;
  END IF;
  IF coalesce(trim(p_name), '') = '' OR coalesce(trim(p_city), '') = '' THEN
    RAISE EXCEPTION 'Name and location are required';
  END IF;

  v_status := CASE WHEN coalesce((v_tenant.settings ->> 'autoApproveMembers')::boolean, FALSE) THEN 'verified' ELSE 'pending' END;
  SELECT phone INTO v_phone FROM auth.users WHERE id = auth.uid();

  PERFORM ensure_geo_path(v_tenant.id, trim(p_city), coalesce(nullif(trim(p_region), ''), 'Central'), coalesce(p_country, 'India'));
  IF coalesce(trim(p_group), '') <> '' THEN
    INSERT INTO functional_groups (id, tenant_id, name, category, geographic_scope)
    VALUES (v_tenant.id || '-grp-' || slugify(p_group), v_tenant.id, trim(p_group), 'Functional group', 'Organization-wide')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  INSERT INTO profiles (user_id, tenant_id, member_number, name, email, phone, unit, region, country, groups, roles, status)
  VALUES (auth.uid(), v_tenant.id, v_tenant.code || '-' || lpad(nextval('member_seq')::text, 5, '0'), trim(p_name),
          coalesce(p_email, ''), v_phone, trim(p_city), coalesce(nullif(trim(p_region), ''), 'Central'),
          coalesce(p_country, 'India'), CASE WHEN coalesce(trim(p_group), '') = '' THEN '{}'::text[] ELSE ARRAY[trim(p_group)] END,
          ARRAY['member'], v_status)
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

-- Approve / reject / suspend / reactivate / end a membership (PRD §6.2)
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

  UPDATE profiles SET status = p_status, status_reason = p_reason WHERE id = p_profile;
  -- Suspended / ended members lose committee authority immediately (history kept)
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

CREATE OR REPLACE FUNCTION set_member_roles(p_profile UUID, p_roles TEXT[]) RETURNS VOID AS $$
DECLARE v_target profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_target FROM profiles WHERE id = p_profile;
  IF NOT (is_platform_admin() OR has_tenant_role(v_target.tenant_id, 'org_admin')) THEN
    RAISE EXCEPTION 'Only organization admins can change roles';
  END IF;
  IF v_target.user_id = auth.uid() AND NOT ('org_admin' = ANY (p_roles)) AND NOT is_platform_admin() THEN
    RAISE EXCEPTION 'You cannot remove your own admin role';
  END IF;
  UPDATE profiles SET roles = ARRAY(SELECT DISTINCT r FROM unnest(p_roles || ARRAY['member']) r) WHERE id = p_profile;
  PERFORM write_audit(v_target.tenant_id, 'org_admin', 'Change Roles', 'profile', p_profile::text,
                      'Roles for ' || v_target.name || ' set to ' || array_to_string(p_roles, ', '));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Admin directory with contact details (PRD §4.6: personal data for authorized users only)
CREATE OR REPLACE FUNCTION admin_list_members(p_tenant TEXT) RETURNS SETOF profiles AS $$
BEGIN
  IF NOT (is_platform_admin() OR has_tenant_role(p_tenant, 'org_admin', 'membership_admin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY SELECT * FROM profiles WHERE tenant_id = p_tenant ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION update_my_prefs(p_tenant TEXT, p_prefs JSONB) RETURNS VOID AS $$
BEGIN
  -- Mandatory categories cannot be switched off (PRD §11.3)
  UPDATE profiles SET notification_prefs = notification_prefs || p_prefs || '{"caseUpdates": true}'::jsonb
  WHERE user_id = auth.uid() AND tenant_id = p_tenant;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION update_tenant_config(p_tenant TEXT, p_terminology JSONB, p_settings JSONB) RETURNS VOID AS $$
BEGIN
  IF NOT (is_platform_admin() OR has_tenant_role(p_tenant, 'org_admin')) THEN
    RAISE EXCEPTION 'Only organization admins can change configuration';
  END IF;
  UPDATE tenants SET terminology = terminology || coalesce(p_terminology, '{}'::jsonb),
                     settings = settings || coalesce(p_settings, '{}'::jsonb)
  WHERE id = p_tenant;
  PERFORM write_audit(p_tenant, 'org_admin', 'Update Configuration', 'tenant', p_tenant,
                      'Terminology: ' || coalesce(p_terminology::text, '{}') || ' Settings: ' || coalesce(p_settings::text, '{}'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION upsert_routing_rule(
  p_tenant TEXT, p_category TEXT, p_target_kind TEXT, p_target_committee TEXT, p_start_level INTEGER,
  p_confidential BOOLEAN, p_sort INTEGER DEFAULT 100, p_active BOOLEAN DEFAULT TRUE
) RETURNS VOID AS $$
BEGIN
  IF NOT (is_platform_admin() OR has_tenant_role(p_tenant, 'org_admin')) THEN
    RAISE EXCEPTION 'Only organization admins can change routing';
  END IF;
  INSERT INTO routing_rules (tenant_id, category, target_kind, target_committee_id, start_level, confidential, sort_order, active)
  VALUES (p_tenant, trim(p_category), p_target_kind, p_target_committee, p_start_level, p_confidential, p_sort, p_active)
  ON CONFLICT (tenant_id, category) DO UPDATE SET
    target_kind = EXCLUDED.target_kind, target_committee_id = EXCLUDED.target_committee_id,
    start_level = EXCLUDED.start_level, confidential = EXCLUDED.confidential,
    sort_order = EXCLUDED.sort_order, active = EXCLUDED.active;
  PERFORM write_audit(p_tenant, 'org_admin', 'Update Routing Rule', 'routing_rule', trim(p_category),
                      'Category "' || trim(p_category) || '" -> ' || p_target_kind || ' L' || p_start_level ||
                      CASE WHEN p_confidential THEN ' (confidential)' ELSE '' END ||
                      CASE WHEN p_active THEN '' ELSE ' [disabled]' END);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ==============================================================================
-- 13. RPCs — COMMITTEES & APPOINTMENTS (PRD §4.4, §4.5, §5.11, AC #17-19)
-- ==============================================================================
CREATE OR REPLACE FUNCTION upsert_committee(
  p_tenant TEXT, p_id TEXT, p_name TEXT, p_scope TEXT, p_level INTEGER, p_functional_group TEXT,
  p_geo_unit TEXT, p_escalates_to TEXT, p_method TEXT, p_term TEXT,
  p_response_hours INTEGER DEFAULT 48, p_resolution_hours INTEGER DEFAULT 336
) RETURNS TEXT AS $$
DECLARE v_id TEXT := coalesce(nullif(p_id, ''), gen_random_uuid()::text);
BEGIN
  IF NOT (is_platform_admin() OR has_tenant_role(p_tenant, 'org_admin')) THEN
    RAISE EXCEPTION 'Only organization admins can create or change committees';
  END IF;
  IF p_escalates_to IS NOT NULL AND NOT EXISTS (SELECT 1 FROM committees WHERE id = p_escalates_to AND tenant_id = p_tenant) THEN
    RAISE EXCEPTION 'Escalation committee must belong to the same organization';
  END IF;
  INSERT INTO committees (id, tenant_id, name, scope, level, functional_group, geo_unit_id, escalates_to_id, method, term,
                          response_hours, resolution_hours)
  VALUES (v_id, p_tenant, trim(p_name), coalesce(nullif(trim(p_scope), ''), 'Organization-wide'), p_level,
          nullif(trim(p_functional_group), ''), nullif(p_geo_unit, ''), nullif(p_escalates_to, ''),
          coalesce(nullif(p_method, ''), 'Appointment'), coalesce(nullif(p_term, ''), to_char(NOW(), 'YYYY')),
          greatest(1, p_response_hours), greatest(1, p_resolution_hours))
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, scope = EXCLUDED.scope, level = EXCLUDED.level, functional_group = EXCLUDED.functional_group,
    geo_unit_id = EXCLUDED.geo_unit_id, escalates_to_id = EXCLUDED.escalates_to_id, method = EXCLUDED.method,
    term = EXCLUDED.term, response_hours = EXCLUDED.response_hours, resolution_hours = EXCLUDED.resolution_hours
  WHERE committees.tenant_id = p_tenant;
  PERFORM write_audit(p_tenant, CASE WHEN has_tenant_role(p_tenant, 'org_admin') THEN 'org_admin' ELSE 'platform_admin' END,
                      'Save Committee', 'committee', v_id, 'Saved committee "' || trim(p_name) || '" (L' || p_level || ')',
                      NULL, NOT has_tenant_role(p_tenant, 'org_admin'));
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Appoint / nominate / override-assign a member to a committee position.
CREATE OR REPLACE FUNCTION appoint_committee_member(
  p_committee TEXT, p_profile UUID, p_role TEXT, p_method TEXT, p_override BOOLEAN DEFAULT FALSE,
  p_reason TEXT DEFAULT NULL, p_end_date TIMESTAMPTZ DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
  v_c committees%ROWTYPE;
  v_p profiles%ROWTYPE;
  v_platform BOOLEAN := is_platform_admin();
  v_is_admin BOOLEAN;
  v_is_chair BOOLEAN;
  v_status TEXT;
  v_formation TEXT;
  v_id TEXT;
  v_actor UUID;
BEGIN
  SELECT * INTO v_c FROM committees WHERE id = p_committee;
  SELECT * INTO v_p FROM profiles WHERE id = p_profile;
  IF v_c.id IS NULL OR v_p.id IS NULL OR v_p.tenant_id <> v_c.tenant_id THEN
    RAISE EXCEPTION 'Committee and member must exist in the same organization';
  END IF;
  IF v_p.status <> 'verified' THEN RAISE EXCEPTION 'Only verified members can be appointed'; END IF;
  IF p_role NOT IN ('Chair', 'Secretary', 'Issue handler', 'Member') THEN RAISE EXCEPTION 'Invalid position'; END IF;

  v_is_admin := has_tenant_role(v_c.tenant_id, 'org_admin');
  v_is_chair := committee_role(p_committee) = 'Chair';
  v_actor := my_profile_id(v_c.tenant_id);

  IF p_override THEN
    -- Platform-admin override: explicit, reasoned and flagged (PRD §4.5, §5.11)
    IF NOT v_platform THEN RAISE EXCEPTION 'Only a Platform Super Admin can override the appointment workflow'; END IF;
    IF coalesce(trim(p_reason), '') = '' THEN RAISE EXCEPTION 'An override reason is required'; END IF;
    v_status := 'active'; v_formation := 'Platform admin override';
  ELSIF p_method = 'Appointment' THEN
    -- Appointment authority: org admin of this tenant (delegated scope = organization)
    IF NOT v_is_admin THEN RAISE EXCEPTION 'You do not hold appointment authority for this committee'; END IF;
    v_status := 'active'; v_formation := 'Appointment';
  ELSIF p_method = 'Nomination & approval' THEN
    -- Chairs and org admins may nominate; an org admin must approve
    IF NOT (v_is_admin OR v_is_chair) THEN RAISE EXCEPTION 'You cannot nominate members to this committee'; END IF;
    v_status := 'pending'; v_formation := 'Nomination & approval';
  ELSE
    RAISE EXCEPTION 'Formation method % is not available yet', p_method;
  END IF;

  INSERT INTO committee_members (committee_id, tenant_id, profile_id, name, role, formation_type, method, since, status,
                                 start_date, end_date, initiated_by, approved_by, is_override, override_reason)
  VALUES (p_committee, v_c.tenant_id, p_profile, v_p.name, p_role, v_formation,
          CASE WHEN p_override THEN 'Platform admin assignment' ELSE p_method END,
          CASE WHEN v_status = 'active' THEN to_char(NOW(), 'DD Mon YYYY') ELSE 'Pending' END, v_status,
          CASE WHEN v_status = 'active' THEN NOW() END, p_end_date, v_actor,
          CASE WHEN v_status = 'active' THEN v_actor END, p_override, CASE WHEN p_override THEN p_reason END)
  RETURNING id INTO v_id;

  PERFORM write_audit(v_c.tenant_id, CASE WHEN p_override THEN 'platform_admin' WHEN v_is_admin THEN 'org_admin' ELSE 'committee_chair' END,
                      CASE WHEN p_override THEN 'Platform Admin Assignment' WHEN v_status = 'pending' THEN 'Nominate Committee Member' ELSE 'Appoint Committee Member' END,
                      'committee_member', v_id,
                      v_p.name || ' → ' || p_role || ' of ' || v_c.name || ' (' || v_formation || ', ' || v_status || ')',
                      p_reason, p_override);
  PERFORM notify_profile(v_c.tenant_id, p_profile, 'appointment',
                         CASE WHEN v_status = 'pending' THEN 'You were nominated to ' ELSE 'You were appointed to ' END || v_c.name,
                         'Committee · ' || p_role, '/manage/committee?id=' || p_committee, 'appointment-' || v_id, TRUE, TRUE);
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Lifecycle: approve (pending→active), suspend, reinstate, revoke, replace, expire.
CREATE OR REPLACE FUNCTION set_appointment_status(p_appointment TEXT, p_action TEXT, p_reason TEXT DEFAULT NULL) RETURNS VOID AS $$
DECLARE
  v_a committee_members%ROWTYPE;
  v_platform BOOLEAN := is_platform_admin();
  v_is_admin BOOLEAN;
  v_new TEXT;
  v_override BOOLEAN;
BEGIN
  SELECT * INTO v_a FROM committee_members WHERE id = p_appointment;
  IF v_a.id IS NULL THEN RAISE EXCEPTION 'Appointment not found'; END IF;
  v_is_admin := has_tenant_role(v_a.tenant_id, 'org_admin');
  IF NOT (v_platform OR v_is_admin) THEN RAISE EXCEPTION 'Not authorized to change this appointment'; END IF;
  v_override := v_platform AND NOT v_is_admin;
  IF p_action <> 'approve' AND coalesce(trim(p_reason), '') = '' THEN RAISE EXCEPTION 'A reason is required'; END IF;

  v_new := CASE p_action
    WHEN 'approve' THEN CASE WHEN v_a.status = 'pending' THEN 'active' END
    WHEN 'suspend' THEN CASE WHEN v_a.status = 'active' THEN 'suspended' END
    WHEN 'reinstate' THEN CASE WHEN v_a.status = 'suspended' THEN 'active' END
    WHEN 'revoke' THEN CASE WHEN v_a.status IN ('active', 'suspended', 'pending') THEN 'revoked' END
    WHEN 'replace' THEN CASE WHEN v_a.status IN ('active', 'suspended') THEN 'replaced' END
    WHEN 'expire' THEN CASE WHEN v_a.status IN ('active', 'suspended') THEN 'expired' END
  END;
  IF v_new IS NULL THEN RAISE EXCEPTION 'Cannot % an appointment that is %', p_action, v_a.status; END IF;

  UPDATE committee_members SET
    status = v_new,
    status_reason = p_reason,
    approved_by = CASE WHEN p_action = 'approve' THEN my_profile_id(v_a.tenant_id) ELSE approved_by END,
    start_date = CASE WHEN p_action = 'approve' THEN NOW() ELSE start_date END,
    since = CASE WHEN p_action = 'approve' THEN to_char(NOW(), 'DD Mon YYYY') ELSE since END,
    end_date = CASE WHEN v_new IN ('revoked', 'replaced', 'expired') THEN NOW() ELSE end_date END
  WHERE id = p_appointment;

  PERFORM write_audit(v_a.tenant_id, CASE WHEN v_override THEN 'platform_admin' ELSE 'org_admin' END,
                      initcap(p_action) || ' Appointment', 'committee_member', p_appointment,
                      v_a.name || ' (' || v_a.role || ') ' || v_a.status || ' → ' || v_new, p_reason, v_override);
  PERFORM notify_profile(v_a.tenant_id, v_a.profile_id, 'appointment', 'Your committee appointment changed: ' || v_new,
                         'Committee · ' || v_a.role, '/manage/committee?id=' || v_a.committee_id,
                         'appointment-' || p_appointment || '-' || v_new, TRUE, TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ==============================================================================
-- 14. RPCs — ISSUES, ROUTING, WORKFLOW, ESCALATION (PRD §9)
-- ==============================================================================

-- Pick a committee for (tenant, level, functional group, member geography).
CREATE OR REPLACE FUNCTION find_committee(p_tenant TEXT, p_level INTEGER, p_group TEXT, p_city TEXT, p_region TEXT)
RETURNS TEXT AS $$
  SELECT c.id FROM committees c
  LEFT JOIN geo_units g ON g.id = c.geo_unit_id
  WHERE c.tenant_id = p_tenant AND c.active AND c.level = p_level
    AND ((p_group IS NULL AND c.functional_group IS NULL) OR lower(c.functional_group) = lower(p_group))
  ORDER BY
    CASE WHEN g.id IS NULL THEN 1
         WHEN (g.type = 'city' AND lower(g.name) = lower(p_city)) OR (g.type = 'state' AND lower(g.name) = lower(p_region)) THEN 0
         ELSE 2 END,
    c.created_at
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION due_label(p_due TIMESTAMPTZ) RETURNS TEXT AS $$
  SELECT CASE WHEN p_due IS NULL THEN '—'
              WHEN p_due < NOW() THEN 'Overdue'
              WHEN p_due < NOW() + interval '1 day' THEN 'Due within a day'
              ELSE 'Due ' || to_char(p_due, 'DD Mon') END;
$$ LANGUAGE sql STABLE;

-- Create + route an issue for the caller (PRD §9.1, §9.2, AC #9).
CREATE OR REPLACE FUNCTION create_issue(
  p_tenant TEXT, p_title TEXT, p_description TEXT, p_category TEXT,
  p_priority TEXT DEFAULT 'normal', p_affects_others BOOLEAN DEFAULT FALSE, p_confidential BOOLEAN DEFAULT FALSE
) RETURNS TEXT AS $$
DECLARE
  v_me profiles%ROWTYPE;
  v_tenant tenants%ROWTYPE;
  v_rule routing_rules%ROWTYPE;
  v_group TEXT;
  v_level INTEGER := 1;
  v_committee committees%ROWTYPE;
  v_confidential BOOLEAN := coalesce(p_confidential, FALSE);
  v_id TEXT;
  v_status TEXT;
  v_due TIMESTAMPTZ;
  v_rule_text TEXT;
BEGIN
  SELECT * INTO v_me FROM profiles WHERE user_id = auth.uid() AND tenant_id = p_tenant AND status = 'verified';
  IF v_me.id IS NULL THEN RAISE EXCEPTION 'Only verified members can raise issues in this organization'; END IF;
  IF coalesce(trim(p_title), '') = '' OR coalesce(trim(p_category), '') = '' THEN RAISE EXCEPTION 'Title and category are required'; END IF;
  IF p_priority NOT IN ('normal', 'high', 'urgent') THEN p_priority := 'normal'; END IF;
  SELECT * INTO v_tenant FROM tenants WHERE id = p_tenant;

  SELECT * INTO v_rule FROM routing_rules
  WHERE tenant_id = p_tenant AND active AND lower(category) = lower(trim(p_category))
  ORDER BY sort_order LIMIT 1;

  v_group := v_me.groups[1];
  IF v_rule.id IS NOT NULL THEN
    v_level := v_rule.start_level;
    v_confidential := v_confidential OR v_rule.confidential;
    IF v_rule.target_kind = 'committee' AND v_rule.target_committee_id IS NOT NULL THEN
      SELECT * INTO v_committee FROM committees WHERE id = v_rule.target_committee_id AND tenant_id = p_tenant AND active;
    ELSIF v_rule.target_kind = 'general' THEN
      SELECT * INTO v_committee FROM committees WHERE id = find_committee(p_tenant, v_level, NULL, v_me.unit, v_me.region);
    ELSE
      SELECT * INTO v_committee FROM committees WHERE id = find_committee(p_tenant, v_level, v_group, v_me.unit, v_me.region);
    END IF;
    v_rule_text := 'rule "' || v_rule.category || '" → ' || v_rule.target_kind || ' L' || v_level;
  ELSE
    SELECT * INTO v_committee FROM committees WHERE id = find_committee(p_tenant, 1, v_group, v_me.unit, v_me.region);
    v_rule_text := 'default rule → ' || coalesce(v_group, 'general') || ' L1';
  END IF;

  v_id := upper(v_tenant.code) || '-' || nextval('issue_seq')::text;
  IF v_committee.id IS NULL THEN
    -- No route matched: designated triage queue, never silently lost (PRD §9.2)
    v_status := 'triage';
    v_due := NOW() + interval '48 hours';
  ELSE
    v_status := 'submitted';
    v_level := v_committee.level;
    v_due := NOW() + make_interval(hours => v_committee.response_hours);
  END IF;

  INSERT INTO issues (id, tenant_id, complainant_id, complainant_name, title, description, category, location,
                      functional_group, committee_id, committee_name, status, status_label, priority, confidential,
                      affects_others, level, next_action, due, due_state, due_at, opened_date, stages)
  VALUES (v_id, p_tenant, v_me.id::text, v_me.name, trim(p_title), p_description, trim(p_category), v_me.unit, v_group,
          v_committee.id, coalesce(v_committee.name, 'Triage queue'), v_status,
          CASE WHEN v_status = 'triage' THEN 'Awaiting triage' END, p_priority, v_confidential, coalesce(p_affects_others, FALSE),
          v_level, CASE WHEN v_status = 'triage' THEN 'An administrator routes your issue' ELSE 'Committee acknowledges your issue' END,
          due_label(v_due), 'ok', v_due, to_char(NOW(), 'DD Mon YYYY'),
          jsonb_build_array(jsonb_build_object(
            'name', coalesce(v_committee.name, 'Triage queue'), 'state', 'current', 'levelShort', 'L' || v_level,
            'sub', CASE WHEN v_confidential THEN 'Confidential route' ELSE 'Submitted and routed' END,
            'due', due_label(v_due), 'dueState', 'ok',
            'events', jsonb_build_array(jsonb_build_object('time', to_char(NOW(), 'DD Mon HH24:MI'),
              'text', 'Submitted · ' || CASE WHEN v_status = 'triage' THEN 'no committee matched, sent to triage' ELSE 'routed by ' || v_rule_text END,
              'actor', v_me.name)))));

  PERFORM write_audit(p_tenant, 'member', 'Create Issue', 'case', v_id,
                      'Created "' || trim(p_title) || '" [' || trim(p_category) || '] → ' || coalesce(v_committee.name, 'triage') || ' via ' || v_rule_text);
  PERFORM notify_profile(p_tenant, v_me.id, 'status', 'Your case ' || v_id || ' was submitted', 'Issues · ' || coalesce(v_committee.name, 'Triage'),
                         v_id, 'issue-created-' || v_id);
  IF v_committee.id IS NOT NULL THEN
    PERFORM notify_committee(p_tenant, v_committee.id, 'status', 'New case ' || v_id || ' routed to your committee',
                             'Queue · ' || v_committee.name, '/manage/case?id=' || v_id, 'issue-routed-' || v_id,
                             CASE WHEN v_confidential THEN ARRAY['Chair', 'Issue handler'] END);
  ELSE
    PERFORM notify_org_admins(p_tenant, 'status', 'Case ' || v_id || ' needs triage', 'Triage queue', '/manage/case?id=' || v_id, 'issue-triage-' || v_id);
  END IF;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Controlled status transitions for handlers and complainants (PRD §9.3, §9.4, §9.6, AC #10, #13).
-- p_action: route | assign | acknowledge | start | request_info | await_external | resolve | close | reject
--           (handlers);  reply | confirm | reopen (complainant);  add_note (handlers, internal)
CREATE OR REPLACE FUNCTION issue_action(p_issue TEXT, p_action TEXT, p_payload JSONB DEFAULT '{}'::jsonb) RETURNS VOID AS $$
DECLARE
  i issues%ROWTYPE;
  v_handler BOOLEAN;
  v_owner BOOLEAN;
  v_actor TEXT;
  v_me UUID;
  v_text TEXT := nullif(trim(coalesce(p_payload ->> 'text', '')), '');
  v_assignee profiles%ROWTYPE;
  v_committee committees%ROWTYPE;
  v_new_status TEXT;
  v_next TEXT;
  v_due TIMESTAMPTZ;
  v_event TEXT;
  v_notify_member BOOLEAN := TRUE;
  v_window INTEGER;
BEGIN
  SELECT * INTO i FROM issues WHERE id = p_issue FOR UPDATE;
  IF i.id IS NULL THEN RAISE EXCEPTION 'Case not found'; END IF;
  v_handler := can_handle_issue(p_issue);
  v_owner := is_my_issue(p_issue);
  v_me := my_profile_id(i.tenant_id);
  SELECT name INTO v_actor FROM profiles WHERE id = v_me;
  v_actor := coalesce(v_actor, 'Platform Super Admin');

  IF p_action IN ('reply', 'confirm', 'reopen') THEN
    IF NOT v_owner THEN RAISE EXCEPTION 'Only the complainant can do this'; END IF;
  ELSIF NOT v_handler THEN
    RAISE EXCEPTION 'You are not authorized to act on this case';
  ELSIF v_owner AND NOT is_platform_admin() AND p_action <> 'add_note' THEN
    RAISE EXCEPTION 'You cannot handle your own case';
  END IF;

  v_due := i.due_at;
  CASE p_action
    WHEN 'add_note' THEN
      IF v_text IS NULL THEN RAISE EXCEPTION 'Note text is required'; END IF;
      INSERT INTO internal_notes (issue_id, tenant_id, author_profile_id, author_name, author_role, text)
      VALUES (p_issue, i.tenant_id, v_me, v_actor, coalesce(committee_role(i.committee_id), 'Officer'), v_text);
      PERFORM write_audit(i.tenant_id, 'handler', 'Add Internal Note', 'case', p_issue, 'Internal note added');
      RETURN;

    WHEN 'route' THEN
      IF i.status <> 'triage' THEN RAISE EXCEPTION 'Only triage cases can be routed'; END IF;
      SELECT * INTO v_committee FROM committees WHERE id = p_payload ->> 'committee_id' AND tenant_id = i.tenant_id AND active;
      IF v_committee.id IS NULL THEN RAISE EXCEPTION 'Choose a committee in this organization'; END IF;
      UPDATE issues SET committee_id = v_committee.id, committee_name = v_committee.name, level = v_committee.level,
        status = 'submitted', status_label = NULL, next_action = 'Committee acknowledges your issue',
        due_at = NOW() + make_interval(hours => v_committee.response_hours),
        stages = stages || jsonb_build_array(jsonb_build_object('name', v_committee.name, 'state', 'current',
          'levelShort', 'L' || v_committee.level, 'sub', 'Routed from triage', 'events', '[]'::jsonb))
      WHERE id = p_issue;
      SELECT * INTO i FROM issues WHERE id = p_issue;
      v_event := 'Routed from triage to ' || v_committee.name;
      PERFORM notify_committee(i.tenant_id, v_committee.id, 'status', 'Case ' || p_issue || ' routed to your committee',
                               'Queue · ' || v_committee.name, '/manage/case?id=' || p_issue, 'issue-routed-' || p_issue || '-' || v_committee.id);
      v_new_status := 'submitted'; v_next := 'Committee acknowledges your issue'; v_due := i.due_at;

    WHEN 'assign' THEN
      SELECT * INTO v_assignee FROM profiles WHERE id = (p_payload ->> 'profile_id')::uuid AND tenant_id = i.tenant_id AND status = 'verified';
      IF v_assignee.id IS NULL THEN RAISE EXCEPTION 'Assignee must be a verified member of this organization'; END IF;
      IF i.committee_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM committee_members WHERE committee_id = i.committee_id AND profile_id = v_assignee.id AND status = 'active'
          AND (NOT i.confidential OR role IN ('Chair', 'Issue handler'))) THEN
        RAISE EXCEPTION 'Assignee must be an active (authorized) member of the responsible committee';
      END IF;
      IF i.status IN ('resolved', 'closed', 'rejected') THEN RAISE EXCEPTION 'Case is %', i.status; END IF;
      UPDATE issues SET assignee_profile_id = v_assignee.id, assignee_name = v_assignee.name WHERE id = p_issue;
      v_new_status := 'assigned'; v_next := 'Handler review by ' || v_assignee.name;
      v_event := 'Assigned to ' || v_assignee.name;
      SELECT resolution_hours INTO v_window FROM committees WHERE id = i.committee_id;
      v_due := NOW() + make_interval(hours => coalesce(v_window, 336));
      PERFORM notify_profile(i.tenant_id, v_assignee.id, 'status', 'Case ' || p_issue || ' was assigned to you',
                             'Queue · ' || i.committee_name, '/manage/case?id=' || p_issue,
                             'issue-assigned-' || p_issue || '-' || v_assignee.id || '-' || extract(epoch FROM NOW())::bigint, TRUE, TRUE,
                             'A case was assigned to you.');

    WHEN 'acknowledge' THEN
      IF i.status NOT IN ('submitted', 'assigned', 'escalated', 'reopened') THEN RAISE EXCEPTION 'Cannot acknowledge a % case', i.status; END IF;
      v_new_status := 'acknowledged'; v_next := 'Committee is reviewing'; v_event := 'Acknowledged by ' || v_actor;
      SELECT resolution_hours INTO v_window FROM committees WHERE id = i.committee_id;
      v_due := NOW() + make_interval(hours => coalesce(v_window, 336));

    WHEN 'start' THEN
      IF i.status NOT IN ('assigned', 'acknowledged', 'escalated', 'reopened', 'awaiting_external') THEN RAISE EXCEPTION 'Cannot start a % case', i.status; END IF;
      v_new_status := 'in_progress'; v_next := coalesce(v_text, 'Committee is working on your issue'); v_event := 'Work started';

    WHEN 'request_info' THEN
      IF v_text IS NULL THEN RAISE EXCEPTION 'Say what information is needed'; END IF;
      IF i.status IN ('resolved', 'closed', 'rejected', 'awaiting_member') THEN RAISE EXCEPTION 'Cannot request info on a % case', i.status; END IF;
      v_new_status := 'awaiting_member'; v_next := v_text; v_event := 'Information requested from member';
      v_due := NOW() + interval '48 hours';

    WHEN 'await_external' THEN
      IF i.status NOT IN ('in_progress', 'acknowledged', 'assigned') THEN RAISE EXCEPTION 'Cannot wait on external action for a % case', i.status; END IF;
      v_new_status := 'awaiting_external'; v_next := coalesce(v_text, 'Waiting for an external party'); v_event := 'Awaiting external action';

    WHEN 'resolve' THEN
      IF v_text IS NULL THEN RAISE EXCEPTION 'A resolution summary is required'; END IF;
      IF i.status IN ('resolved', 'closed', 'rejected') THEN RAISE EXCEPTION 'Case is already %', i.status; END IF;
      UPDATE issues SET resolution_summary = v_text, resolved_at = NOW() WHERE id = p_issue;
      v_new_status := 'resolved'; v_next := 'Please confirm the resolution or reopen'; v_event := 'Resolved: ' || v_text; v_due := NULL;

    WHEN 'close' THEN
      IF i.status NOT IN ('resolved', 'rejected') THEN RAISE EXCEPTION 'Only resolved or rejected cases can be closed'; END IF;
      UPDATE issues SET closed_at = NOW() WHERE id = p_issue;
      v_new_status := 'closed'; v_next := 'Closed'; v_event := 'Closed by ' || v_actor; v_due := NULL;

    WHEN 'reject' THEN
      IF v_text IS NULL THEN RAISE EXCEPTION 'A reason is required to reject a case'; END IF;
      IF i.status IN ('resolved', 'closed', 'rejected') THEN RAISE EXCEPTION 'Case is already %', i.status; END IF;
      UPDATE issues SET last_reason = v_text WHERE id = p_issue;
      v_new_status := 'rejected'; v_next := 'Rejected / out of scope: ' || v_text; v_event := 'Rejected: ' || v_text; v_due := NULL;

    WHEN 'reply' THEN
      IF v_text IS NULL THEN RAISE EXCEPTION 'Reply text is required'; END IF;
      INSERT INTO member_replies (issue_id, tenant_id, author_profile_id, author_name, text)
      VALUES (p_issue, i.tenant_id, v_me, v_actor, v_text);
      v_new_status := CASE WHEN i.status = 'awaiting_member' THEN 'in_progress' ELSE i.status END;
      v_next := CASE WHEN i.status = 'awaiting_member' THEN 'Committee reviews your reply' ELSE i.next_action END;
      IF i.status = 'awaiting_member' THEN
        SELECT resolution_hours INTO v_window FROM committees WHERE id = i.committee_id;
        v_due := NOW() + make_interval(hours => coalesce(v_window, 336));
      END IF;
      v_event := 'Member replied'; v_notify_member := FALSE;
      IF i.assignee_profile_id IS NOT NULL THEN
        PERFORM notify_profile(i.tenant_id, i.assignee_profile_id, 'reply', 'Member replied on ' || p_issue, 'Queue · ' || i.committee_name,
                               '/manage/case?id=' || p_issue, 'issue-reply-' || p_issue || '-' || extract(epoch FROM NOW())::bigint);
      END IF;

    WHEN 'confirm' THEN
      IF i.status <> 'resolved' THEN RAISE EXCEPTION 'Only resolved cases can be confirmed'; END IF;
      UPDATE issues SET closed_at = NOW() WHERE id = p_issue;
      v_new_status := 'closed'; v_next := 'Closed — confirmed by member'; v_event := 'Member confirmed the resolution'; v_due := NULL;
      v_notify_member := FALSE;

    WHEN 'reopen' THEN
      IF i.status NOT IN ('resolved', 'closed', 'rejected') THEN RAISE EXCEPTION 'Only finished cases can be reopened'; END IF;
      v_window := coalesce((SELECT (settings ->> 'reopenWindowDays')::int FROM tenants WHERE id = i.tenant_id), 30);
      IF coalesce(i.closed_at, i.resolved_at, i.updated_at) < NOW() - make_interval(days => v_window) THEN
        RAISE EXCEPTION 'The reopen window of % days has passed', v_window;
      END IF;
      IF v_text IS NULL THEN RAISE EXCEPTION 'Say why the case should be reopened'; END IF;
      UPDATE issues SET last_reason = v_text, closed_at = NULL WHERE id = p_issue;
      v_new_status := 'reopened'; v_next := 'Committee reviews the reopened case'; v_event := 'Reopened by member: ' || v_text;
      SELECT response_hours INTO v_window FROM committees WHERE id = i.committee_id;
      v_due := NOW() + make_interval(hours => coalesce(v_window, 48));
      v_notify_member := FALSE;
      IF i.committee_id IS NOT NULL THEN
        PERFORM notify_committee(i.tenant_id, i.committee_id, 'status', 'Case ' || p_issue || ' was reopened', 'Queue · ' || i.committee_name,
                                 '/manage/case?id=' || p_issue, 'issue-reopened-' || p_issue || '-' || extract(epoch FROM NOW())::bigint);
      END IF;
    ELSE
      RAISE EXCEPTION 'Unknown action %', p_action;
  END CASE;

  UPDATE issues SET
    status = v_new_status,
    status_label = NULL,
    next_action = v_next,
    due_at = v_due,
    due = due_label(v_due),
    due_state = CASE WHEN v_due IS NULL THEN 'ok' WHEN v_due < NOW() THEN 'overdue' WHEN v_due < NOW() + interval '1 day' THEN 'soon' ELSE 'ok' END,
    reminded_at = NULL,
    first_response_at = CASE WHEN first_response_at IS NULL AND p_action IN ('assign', 'acknowledge', 'start', 'request_info', 'reject', 'resolve')
                             THEN NOW() ELSE first_response_at END,
    stages = stage_append_event(stages, v_event, v_actor),
    updated_at = NOW()
  WHERE id = p_issue;

  PERFORM write_audit(i.tenant_id, CASE WHEN p_action IN ('reply', 'confirm', 'reopen') THEN 'member' ELSE 'handler' END,
                      'Case ' || initcap(replace(p_action, '_', ' ')), 'case', p_issue, v_event,
                      CASE WHEN p_action IN ('reject', 'reopen') THEN v_text END);
  IF v_notify_member THEN
    PERFORM notify_profile(i.tenant_id, i.complainant_id::uuid, CASE WHEN p_action = 'request_info' THEN 'reply' ELSE 'status' END,
                           'There is an update to your case ' || p_issue, 'Issues · ' || i.committee_name, p_issue,
                           'issue-' || p_action || '-' || p_issue || '-' || extract(epoch FROM NOW())::bigint,
                           TRUE, p_action IN ('request_info', 'resolve', 'reject'));
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Escalation (manual with reason, or automatic). p_expected_level prevents duplicate /
-- conflicting escalations from two handlers or a retry (PRD §9.5, AC #11, #25).
CREATE OR REPLACE FUNCTION escalate_issue(p_issue TEXT, p_reason TEXT, p_expected_level INTEGER DEFAULT NULL, p_is_auto BOOLEAN DEFAULT FALSE)
RETURNS VOID AS $$
DECLARE
  i issues%ROWTYPE;
  v_cur committees%ROWTYPE;
  v_next committees%ROWTYPE;
  v_complainant profiles%ROWTYPE;
  v_new_level INTEGER;
  v_actor TEXT;
  v_due TIMESTAMPTZ;
BEGIN
  IF coalesce(trim(p_reason), '') = '' THEN RAISE EXCEPTION 'An escalation reason is required'; END IF;
  SELECT * INTO i FROM issues WHERE id = p_issue FOR UPDATE;
  IF i.id IS NULL THEN RAISE EXCEPTION 'Case not found'; END IF;

  IF p_is_auto THEN
    -- Only the scheduler (no end-user JWT) may run automatic escalations
    IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Automatic escalation is reserved for the scheduler'; END IF;
    v_actor := 'Escalation engine';
  ELSE
    IF NOT can_handle_issue(p_issue) OR is_my_issue(p_issue) THEN RAISE EXCEPTION 'You are not authorized to escalate this case'; END IF;
    SELECT name INTO v_actor FROM profiles WHERE id = my_profile_id(i.tenant_id);
    v_actor := coalesce(v_actor, 'Platform Super Admin');
  END IF;

  IF p_expected_level IS NOT NULL AND p_expected_level <> i.level THEN
    RAISE EXCEPTION 'Case % was already escalated to level % — refresh and try again', p_issue, i.level;
  END IF;
  IF i.status IN ('resolved', 'closed', 'rejected') THEN RAISE EXCEPTION 'Case is %', i.status; END IF;

  SELECT * INTO v_cur FROM committees WHERE id = i.committee_id;
  SELECT * INTO v_complainant FROM profiles WHERE id::text = i.complainant_id;

  IF v_cur.escalates_to_id IS NOT NULL THEN
    SELECT * INTO v_next FROM committees WHERE id = v_cur.escalates_to_id AND active;
  END IF;
  IF v_next.id IS NULL THEN
    DECLARE
      v_max_level INTEGER;
    BEGIN
      SELECT coalesce(max(level), i.level) INTO v_max_level FROM committees WHERE tenant_id = i.tenant_id AND active;
      IF i.level < v_max_level THEN
        SELECT * INTO v_next FROM committees WHERE id = coalesce(
          find_committee(i.tenant_id, i.level + 1, i.functional_group, v_complainant.unit, v_complainant.region),
          find_committee(i.tenant_id, i.level + 1, NULL, v_complainant.unit, v_complainant.region),
          CASE WHEN i.level + 1 < v_max_level THEN find_committee(i.tenant_id, v_max_level, NULL, NULL, NULL) END);
      END IF;
    END;
  END IF;
  IF v_next.id IS NULL THEN
    RAISE EXCEPTION 'No higher committee is configured for case % (level %)', p_issue, i.level;
  END IF;

  v_new_level := v_next.level;
  v_due := NOW() + make_interval(hours => v_next.response_hours);

  -- Ownership transfers, the previous assignee stays on record (accountability kept)
  UPDATE issues SET
    level = v_new_level,
    status = 'escalated',
    status_label = 'Escalated · L' || v_new_level,
    handled_committee_ids = CASE WHEN i.committee_id IS NULL THEN handled_committee_ids ELSE array_append(handled_committee_ids, i.committee_id) END,
    committee_id = v_next.id,
    committee_name = v_next.name,
    assignee_profile_id = NULL,
    assignee_name = NULL,
    last_reason = p_reason,
    next_action = v_next.name || ' reviews the escalated case',
    due_at = v_due,
    due = due_label(v_due),
    due_state = 'ok',
    reminded_at = NULL,
    stages = (
      SELECT jsonb_agg(CASE WHEN ord = jsonb_array_length(i.stages) THEN s || '{"state":"done"}'::jsonb ELSE s END ORDER BY ord)
      FROM jsonb_array_elements(stage_append_event(i.stages,
        'Escalated by ' || v_actor || CASE WHEN i.assignee_name IS NOT NULL THEN ' (previous assignee: ' || i.assignee_name || ')' ELSE '' END,
        v_actor)) WITH ORDINALITY AS t(s, ord)
    ) || jsonb_build_array(jsonb_build_object(
      'name', v_next.name, 'state', 'current', 'levelShort', 'L' || v_new_level, 'escalatedHere', TRUE,
      'reason', p_reason, 'sub', CASE WHEN p_is_auto THEN 'Automatic escalation · deadline missed' ELSE 'Manual escalation' END,
      'due', due_label(v_due), 'dueState', 'ok', 'events', '[]'::jsonb)),
    updated_at = NOW()
  WHERE id = p_issue;

  PERFORM write_audit(i.tenant_id, CASE WHEN p_is_auto THEN 'escalation_engine' ELSE 'handler' END,
                      CASE WHEN p_is_auto THEN 'Auto-Escalate Case' ELSE 'Manual Escalate Case' END,
                      'case', p_issue, 'Escalated ' || p_issue || ' from L' || i.level || ' (' || i.committee_name || ') to L' ||
                      v_new_level || ' (' || v_next.name || ')', p_reason);
  PERFORM notify_profile(i.tenant_id, v_complainant.id, 'escalation', 'Your case ' || p_issue || ' moved to the next committee level',
                         'Issues · ' || v_next.name, p_issue, 'issue-escalated-' || p_issue || '-L' || v_new_level);
  PERFORM notify_committee(i.tenant_id, v_next.id, 'escalation', 'Case ' || p_issue || ' was escalated to your committee',
                           'Queue · ' || v_next.name, '/manage/case?id=' || p_issue, 'issue-escalated-in-' || p_issue || '-L' || v_new_level,
                           CASE WHEN i.confidential THEN ARRAY['Chair', 'Issue handler'] END);
  IF i.assignee_profile_id IS NOT NULL THEN
    PERFORM notify_profile(i.tenant_id, i.assignee_profile_id, 'escalation', 'Case ' || p_issue || ' was escalated', 'Queue · ' || i.committee_name,
                           '/manage/case?id=' || p_issue, 'issue-escalated-out-' || p_issue || '-L' || v_new_level, TRUE, TRUE,
                           'A case you were handling was escalated.');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Scheduled work: reminders before deadlines and auto-escalation after (PRD §9.5, §14.2).
CREATE OR REPLACE FUNCTION process_issue_deadlines() RETURNS INTEGER AS $$
DECLARE
  r RECORD;
  v_count INTEGER := 0;
  v_chair UUID;
BEGIN
  IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Scheduler only'; END IF;

  -- 1. Reminders: due within 24h, not yet reminded
  FOR r IN SELECT * FROM issues
           WHERE due_at IS NOT NULL AND due_at > NOW() AND due_at < NOW() + interval '24 hours' AND reminded_at IS NULL
             AND status NOT IN ('resolved', 'closed', 'rejected', 'awaiting_member', 'awaiting_external')
  LOOP
    UPDATE issues SET due_state = 'soon', due = due_label(due_at), reminded_at = NOW() WHERE id = r.id;
    PERFORM notify_profile(r.tenant_id, r.assignee_profile_id, 'status', 'Deadline approaching on ' || r.id, 'Queue · ' || r.committee_name,
                           '/manage/case?id=' || r.id, 'deadline-soon-' || r.id || '-' || to_char(r.due_at, 'YYYYMMDDHH24MI'), TRUE, TRUE,
                           'A case deadline is approaching.');
    SELECT cm.profile_id INTO v_chair FROM committee_members cm
      WHERE cm.committee_id = r.committee_id AND cm.role = 'Chair' AND cm.status = 'active' LIMIT 1;
    PERFORM notify_profile(r.tenant_id, v_chair, 'status', 'Deadline approaching on ' || r.id, 'Queue · ' || r.committee_name,
                           '/manage/case?id=' || r.id, 'deadline-soon-chair-' || r.id || '-' || to_char(r.due_at, 'YYYYMMDDHH24MI'), TRUE, TRUE,
                           'A case deadline is approaching.');
  END LOOP;

  -- 2. Overdue: mark, then escalate per policy (idempotent through p_expected_level)
  FOR r IN SELECT * FROM issues
           WHERE due_at IS NOT NULL AND due_at <= NOW()
             AND status NOT IN ('resolved', 'closed', 'rejected', 'awaiting_member', 'awaiting_external')
  LOOP
    UPDATE issues SET due_state = 'overdue', due = 'Overdue' WHERE id = r.id;
    IF r.level < 3 AND r.committee_id IS NOT NULL THEN
      BEGIN
        PERFORM escalate_issue(r.id, 'Deadline missed at L' || r.level || ' (' || r.committee_name || ')', r.level, TRUE);
        v_count := v_count + 1;
      EXCEPTION WHEN OTHERS THEN
        -- No higher committee configured: keep accountability, alert org admins once
        PERFORM notify_org_admins(r.tenant_id, 'escalation', 'Overdue case ' || r.id || ' could not be escalated',
                                  SQLERRM, '/manage/case?id=' || r.id, 'overdue-stuck-' || r.id || '-L' || r.level);
      END;
    ELSE
      PERFORM notify_org_admins(r.tenant_id, 'escalation', 'Overdue case ' || r.id, 'Queue · ' || r.committee_name,
                                '/manage/case?id=' || r.id, 'overdue-final-' || r.id || '-' || to_char(r.due_at, 'YYYYMMDD'));
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Audit a view of a confidential case (PRD §12.4 "Complaint views ... for sensitive cases")
CREATE OR REPLACE FUNCTION log_case_view(p_issue TEXT) RETURNS VOID AS $$
DECLARE i issues%ROWTYPE;
BEGIN
  SELECT * INTO i FROM issues WHERE id = p_issue;
  IF i.id IS NULL OR NOT i.confidential OR NOT can_handle_issue(p_issue) THEN RETURN; END IF;
  PERFORM write_audit(i.tenant_id, CASE WHEN is_platform_admin() THEN 'platform_admin' ELSE 'handler' END,
                      'View Confidential Case', 'case', p_issue, 'Viewed confidential case ' || p_issue, NULL,
                      is_platform_admin() AND NOT has_tenant_role(i.tenant_id, 'org_admin'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION add_issue_attachment(p_issue TEXT, p_path TEXT, p_file_name TEXT, p_mime TEXT, p_size INTEGER, p_internal BOOLEAN DEFAULT FALSE)
RETURNS VOID AS $$
DECLARE i issues%ROWTYPE;
BEGIN
  SELECT * INTO i FROM issues WHERE id = p_issue;
  IF i.id IS NULL OR NOT (is_my_issue(p_issue) OR can_handle_issue(p_issue)) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF split_part(p_path, '/', 1) <> i.tenant_id OR split_part(p_path, '/', 2) <> p_issue THEN RAISE EXCEPTION 'Invalid path'; END IF;
  IF p_size > 15 * 1024 * 1024 THEN RAISE EXCEPTION 'File too large (max 15 MB)'; END IF;
  INSERT INTO issue_attachments (issue_id, tenant_id, storage_path, file_name, mime_type, size_bytes, uploaded_by, internal)
  VALUES (p_issue, i.tenant_id, p_path, p_file_name, p_mime, p_size, my_profile_id(i.tenant_id), p_internal AND can_handle_issue(p_issue));
  UPDATE issues SET stages = stage_append_event(stages, 'Evidence added: ' || p_file_name, coalesce((SELECT name FROM profiles WHERE id = my_profile_id(i.tenant_id)), 'Member')),
                    updated_at = NOW()
  WHERE id = p_issue AND NOT (p_internal AND can_handle_issue(p_issue));
  PERFORM write_audit(i.tenant_id, 'member', 'Add Attachment', 'case', p_issue, 'Attachment ' || p_file_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ==============================================================================
-- 15. RPCs — FEED, ANNOUNCEMENTS, MODERATION, NOTIFICATIONS (PRD §8, §11)
-- ==============================================================================

-- Can the caller publish to this audience? (PRD §8.3: only within permitted scope)
CREATE OR REPLACE FUNCTION can_publish(p_tenant TEXT, p_kind TEXT, p_scope TEXT, p_value TEXT) RETURNS BOOLEAN AS $$
DECLARE
  v_me profiles%ROWTYPE;
BEGIN
  IF is_platform_admin() OR has_tenant_role(p_tenant, 'org_admin') THEN RETURN TRUE; END IF;
  SELECT * INTO v_me FROM profiles WHERE user_id = auth.uid() AND tenant_id = p_tenant AND status = 'verified';
  IF v_me.id IS NULL THEN RETURN FALSE; END IF;

  IF p_kind IN ('official', 'committee') THEN
    -- Committee leaders: only audiences their committee covers
    RETURN EXISTS (
      SELECT 1 FROM committee_members cm JOIN committees c ON c.id = cm.committee_id
      LEFT JOIN geo_units g ON g.id = c.geo_unit_id
      WHERE cm.profile_id = v_me.id AND cm.status = 'active' AND cm.role IN ('Chair', 'Secretary')
        AND (cm.end_date IS NULL OR cm.end_date > NOW()) AND c.tenant_id = p_tenant AND (
          (p_scope = 'committee' AND p_value = c.id)
          OR (p_scope = 'group' AND c.functional_group IS NOT NULL AND lower(c.functional_group) = lower(p_value)
              AND (g.id IS NULL OR c.level = 3))
          OR (p_scope = 'local' AND g.type = 'city' AND lower(g.name) = lower(p_value))
          OR (p_scope = 'region' AND g.type = 'state' AND lower(g.name) = lower(p_value))
          OR (p_scope = 'org' AND c.level = 3 AND c.functional_group IS NULL)
        ));
  END IF;

  -- Member posts into their own spaces, if the organization allows them
  IF NOT coalesce((SELECT (settings ->> 'memberPosts')::boolean FROM tenants WHERE id = p_tenant), TRUE) THEN RETURN FALSE; END IF;
  RETURN in_audience(p_tenant, p_scope, p_value) AND p_scope IN ('local', 'group', 'committee');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION audience_count(p_tenant TEXT, p_scope TEXT, p_value TEXT) RETURNS INTEGER AS $$
  SELECT count(*)::int FROM profiles p
  WHERE p.tenant_id = p_tenant AND p.status = 'verified' AND (
    p_scope = 'org'
    OR (p_scope = 'local' AND lower(p.unit) = lower(p_value))
    OR (p_scope = 'region' AND lower(p.region) = lower(p_value))
    OR (p_scope = 'group' AND lower(p_value) = ANY (SELECT lower(g) FROM unnest(p.groups) g))
    OR (p_scope = 'committee' AND EXISTS (SELECT 1 FROM committee_members cm WHERE cm.committee_id = p_value
          AND cm.profile_id = p.id AND cm.status = 'active'))
  ) AND (is_member(p_tenant) OR is_platform_admin());
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- p_audiences: [{"scope":"group","value":"IT Workers","label":"IT Workers · Sector"}, ...]
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
  v_official BOOLEAN := p_kind IN ('official', 'committee');
BEGIN
  IF coalesce(trim(p_body), '') = '' THEN RAISE EXCEPTION 'Message is required'; END IF;
  IF jsonb_array_length(coalesce(p_audiences, '[]'::jsonb)) = 0 THEN RAISE EXCEPTION 'Choose an audience'; END IF;
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
      -- Server-side audience resolution, deduplicated per event+recipient (PRD §11.2, §11.3)
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
                               -- one notification per announcement batch per member, even across several audiences
                               'announcement-' || md5(p_tenant || coalesce(p_title, '') || p_body || to_char(NOW(), 'YYYYMMDDHH24MI')));
      END LOOP;
    END IF;
    RETURN NEXT v_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION toggle_like(p_post TEXT) RETURNS BOOLEAN AS $$
DECLARE
  v_tenant TEXT;
  v_me UUID;
BEGIN
  SELECT tenant_id INTO v_tenant FROM posts WHERE id = p_post;
  IF v_tenant IS NULL OR NOT can_view_post(p_post) THEN RAISE EXCEPTION 'Post not available'; END IF;
  v_me := my_profile_id(v_tenant);
  IF EXISTS (SELECT 1 FROM post_likes WHERE post_id = p_post AND profile_id = v_me) THEN
    DELETE FROM post_likes WHERE post_id = p_post AND profile_id = v_me;
    UPDATE posts SET likes = greatest(0, likes - 1) WHERE id = p_post;
    RETURN FALSE;
  END IF;
  INSERT INTO post_likes (post_id, profile_id, tenant_id) VALUES (p_post, v_me, v_tenant);
  UPDATE posts SET likes = likes + 1 WHERE id = p_post;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION add_comment(p_post TEXT, p_text TEXT) RETURNS TEXT AS $$
DECLARE
  v_post posts%ROWTYPE;
  v_me profiles%ROWTYPE;
  v_id TEXT;
BEGIN
  SELECT * INTO v_post FROM posts WHERE id = p_post;
  IF v_post.id IS NULL OR NOT can_view_post(p_post) THEN RAISE EXCEPTION 'Post not available'; END IF;
  IF coalesce(trim(p_text), '') = '' THEN RAISE EXCEPTION 'Comment is empty'; END IF;
  SELECT * INTO v_me FROM profiles WHERE user_id = auth.uid() AND tenant_id = v_post.tenant_id AND status = 'verified';
  IF v_me.id IS NULL THEN RAISE EXCEPTION 'Not a verified member'; END IF;
  INSERT INTO comments (tenant_id, post_id, author_id, author_name, text)
  VALUES (v_post.tenant_id, p_post, v_me.id::text, v_me.name, trim(p_text)) RETURNING id INTO v_id;
  IF v_post.author_profile_id IS NOT NULL AND v_post.author_profile_id <> v_me.id THEN
    PERFORM notify_profile(v_post.tenant_id, v_post.author_profile_id, 'reply', v_me.name || ' commented on your post',
                           'Feed · ' || v_post.source, '/post?id=' || p_post, 'comment-' || v_id);
  END IF;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION report_post(p_post TEXT, p_reason TEXT) RETURNS VOID AS $$
DECLARE v_tenant TEXT;
BEGIN
  SELECT tenant_id INTO v_tenant FROM posts WHERE id = p_post;
  IF v_tenant IS NULL OR NOT can_view_post(p_post) THEN RAISE EXCEPTION 'Post not available'; END IF;
  INSERT INTO post_reports (post_id, tenant_id, reporter_profile_id, reason)
  VALUES (p_post, v_tenant, my_profile_id(v_tenant), coalesce(nullif(trim(p_reason), ''), 'Reported'))
  ON CONFLICT (post_id, reporter_profile_id) DO NOTHING;
  PERFORM notify_org_admins(v_tenant, 'security', 'A post was reported', 'Moderation', '/post?id=' || p_post, 'report-' || p_post);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Moderation (PRD §5.9): pin / unpin / remove / restore, audited.
CREATE OR REPLACE FUNCTION moderate_post(p_post TEXT, p_action TEXT, p_reason TEXT DEFAULT NULL) RETURNS VOID AS $$
DECLARE v_post posts%ROWTYPE;
BEGIN
  SELECT * INTO v_post FROM posts WHERE id = p_post;
  IF v_post.id IS NULL THEN RAISE EXCEPTION 'Post not found'; END IF;
  IF NOT (is_platform_admin() OR has_tenant_role(v_post.tenant_id, 'org_admin', 'moderator')
          OR (p_action = 'remove' AND v_post.author_profile_id = my_profile_id(v_post.tenant_id))) THEN
    RAISE EXCEPTION 'Not authorized to moderate this post';
  END IF;
  IF p_action = 'remove' AND coalesce(trim(p_reason), '') = '' THEN RAISE EXCEPTION 'A reason is required'; END IF;
  UPDATE posts SET
    pinned = CASE p_action WHEN 'pin' THEN TRUE WHEN 'unpin' THEN FALSE ELSE pinned END,
    removed = CASE p_action WHEN 'remove' THEN TRUE WHEN 'restore' THEN FALSE ELSE removed END,
    removed_reason = CASE p_action WHEN 'remove' THEN p_reason WHEN 'restore' THEN NULL ELSE removed_reason END
  WHERE id = p_post;
  UPDATE post_reports SET status = 'actioned' WHERE post_id = p_post AND status = 'open' AND p_action = 'remove';
  PERFORM write_audit(v_post.tenant_id, 'moderator', 'Moderate Post: ' || p_action, 'post', p_post,
                      initcap(p_action) || ' post "' || coalesce(v_post.title, left(v_post.body, 40)) || '"', p_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION mark_notifications_read(p_ids TEXT[] DEFAULT NULL) RETURNS VOID AS $$
  UPDATE notifications SET unread = FALSE
  WHERE recipient_id IN (SELECT id::text FROM profiles WHERE user_id = auth.uid())
    AND (p_ids IS NULL OR id = ANY (p_ids));
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION register_device_token(p_token TEXT, p_platform TEXT) RETURNS VOID AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  -- Token rotation / device hand-over: the latest signed-in user owns the token
  INSERT INTO device_tokens (token, user_id, platform, updated_at) VALUES (p_token, auth.uid(), p_platform, NOW())
  ON CONFLICT (token) DO UPDATE SET user_id = auth.uid(), platform = EXCLUDED.platform, updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION unregister_device_token(p_token TEXT) RETURNS VOID AS $$
  DELETE FROM device_tokens WHERE token = p_token AND user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;


-- ==============================================================================
-- 16. ROW LEVEL SECURITY
-- Reads are policy-checked; writes happen only through the RPCs above unless a
-- policy below explicitly allows them. Any policy from earlier versions is dropped.
-- ==============================================================================
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Remove the old, unsafe functions from the previous schema version (after the policies
-- that referenced them are gone).
DROP FUNCTION IF EXISTS route_and_create_issue(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS escalate_issue_atomic(TEXT, TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS get_auth_tenant_id();
DROP FUNCTION IF EXISTS auth_has_any_role(TEXT[]);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE functional_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE committees ENABLE ROW LEVEL SECURITY;
ALTER TABLE committee_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Tenants: members (incl. pending applicants) see their own organizations only.
CREATE POLICY "tenants: own memberships" ON tenants FOR SELECT
  USING (is_platform_admin() OR EXISTS (SELECT 1 FROM profiles p WHERE p.tenant_id = tenants.id AND p.user_id = auth.uid()));

-- platform_admins: no client access at all (no policies).

-- Profiles: own memberships, the tenant directory for verified members, platform admin.
CREATE POLICY "profiles: own or tenant directory" ON profiles FOR SELECT
  USING (user_id = auth.uid() OR is_member(tenant_id) OR is_platform_admin());
-- Column privileges keep phone/email/prefs out of the shared directory (PRD §4.6, §12.3).
REVOKE ALL ON profiles FROM anon, authenticated;
GRANT SELECT (id, user_id, tenant_id, member_number, name, unit, region, country, groups, roles, status, created_at)
  ON profiles TO authenticated;

CREATE POLICY "geo_units: tenant members" ON geo_units FOR SELECT USING (is_member(tenant_id) OR is_platform_admin());
CREATE POLICY "functional_groups: tenant members" ON functional_groups FOR SELECT USING (is_member(tenant_id) OR is_platform_admin());
CREATE POLICY "committees: tenant members" ON committees FOR SELECT USING (is_member(tenant_id) OR is_platform_admin());
CREATE POLICY "committee_members: tenant members" ON committee_members FOR SELECT USING (is_member(tenant_id) OR is_platform_admin());
CREATE POLICY "routing_rules: tenant members" ON routing_rules FOR SELECT USING (is_member(tenant_id) OR is_platform_admin());

-- Issues: complainant, authorized handlers/oversight (PRD §9.7, AC #13, #14).
CREATE POLICY "issues: complainant or handler" ON issues FOR SELECT
  USING (is_my_issue(id) OR can_handle_issue(id));
CREATE POLICY "internal_notes: handlers only" ON internal_notes FOR SELECT USING (can_handle_issue(issue_id));
CREATE POLICY "member_replies: complainant or handler" ON member_replies FOR SELECT
  USING (is_my_issue(issue_id) OR can_handle_issue(issue_id));
CREATE POLICY "issue_attachments: same as case" ON issue_attachments FOR SELECT
  USING (can_handle_issue(issue_id) OR (is_my_issue(issue_id) AND NOT internal));

-- Feed
CREATE POLICY "posts: audience" ON posts FOR SELECT USING (can_view_post(id));
CREATE POLICY "comments: audience of post" ON comments FOR SELECT
  USING (can_view_post(post_id) AND (NOT removed OR has_tenant_role(tenant_id, 'org_admin', 'moderator')));
CREATE POLICY "post_likes: audience of post" ON post_likes FOR SELECT USING (can_view_post(post_id));
CREATE POLICY "post_reports: moderators" ON post_reports FOR SELECT
  USING (has_tenant_role(tenant_id, 'org_admin', 'moderator') OR is_platform_admin());

-- Chat: read/write only in channels the caller belongs to.
CREATE POLICY "group_messages: channel members read" ON group_messages FOR SELECT
  USING (in_audience(tenant_id, channel_scope, channel_value) OR is_platform_admin());
CREATE POLICY "group_messages: channel members write" ON group_messages FOR INSERT
  WITH CHECK (in_audience(tenant_id, channel_scope, channel_value)
              AND author_profile_id = my_profile_id(tenant_id)
              AND author_name = (SELECT name FROM profiles WHERE id = author_profile_id));

-- Notifications: addressed rows only; updates via mark_notifications_read().
CREATE POLICY "notifications: own" ON notifications FOR SELECT
  USING (recipient_id IN (SELECT id::text FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "device_tokens: own" ON device_tokens FOR SELECT USING (user_id = auth.uid());
-- notification_outbox: service role only (no policies).

-- Audit: org admins of the tenant and platform admins (PRD §12.4).
CREATE POLICY "audit_logs: admins" ON audit_logs FOR SELECT
  USING (is_platform_admin() OR has_tenant_role(tenant_id, 'org_admin'));

-- Belt and braces: clients cannot write any table directly (except chat inserts,
-- which are policy-checked above). Everything else goes through the RPCs.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM anon;
GRANT INSERT ON group_messages TO authenticated;
REVOKE ALL ON platform_admins, notification_outbox, device_tokens FROM authenticated;
GRANT SELECT ON device_tokens TO authenticated;

-- ==============================================================================
-- 17. STORAGE — private evidence bucket with case-scoped access (PRD §9.7, §12.3)
-- Path convention: <tenant_id>/<issue_id>/<uuid>-<file name>
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('evidence', 'evidence', FALSE, 15728640)
ON CONFLICT (id) DO UPDATE SET public = FALSE, file_size_limit = 15728640;

DROP POLICY IF EXISTS "evidence: read with case access" ON storage.objects;
CREATE POLICY "evidence: read with case access" ON storage.objects FOR SELECT
  USING (bucket_id = 'evidence' AND EXISTS (
    SELECT 1 FROM issue_attachments a WHERE a.storage_path = storage.objects.name
      AND (can_handle_issue(a.issue_id) OR (is_my_issue(a.issue_id) AND NOT a.internal))));
DROP POLICY IF EXISTS "evidence: upload with case access" ON storage.objects;
CREATE POLICY "evidence: upload with case access" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'evidence'
    AND (is_my_issue(split_part(name, '/', 2)) OR can_handle_issue(split_part(name, '/', 2)))
    AND split_part(name, '/', 1) = (SELECT tenant_id FROM issues WHERE id = split_part(name, '/', 2)));

-- ==============================================================================
-- 18. FUNCTION PRIVILEGES — nothing is callable anonymously; internal helpers and
-- the scheduler are not callable by end users at all.
-- ==============================================================================
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
                     'refresh_member_counts', 'process_issue_deadlines', 'audit_logs_immutable', 'platform_admins_keep_one') THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.sig);
    ELSE
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    END IF;
  END LOOP;
END $$;

-- ==============================================================================
-- 19. SCHEDULER — every 10 minutes: deadline reminders + automatic escalation.
-- Requires the pg_cron extension (Supabase: Database → Extensions → pg_cron).
-- ==============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'union-issue-deadlines';
    PERFORM cron.schedule('union-issue-deadlines', '*/10 * * * *', 'SELECT public.process_issue_deadlines();');
  ELSE
    RAISE NOTICE 'pg_cron not available: schedule SELECT public.process_issue_deadlines(); externally every 10 minutes';
  END IF;
END $$;

-- Realtime for live queues, feed and notifications
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE issues; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE posts; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE group_messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- Multi-level hierarchy: loosen level checks to unbounded positive integer (level >= 1)
DO $$
BEGIN
  ALTER TABLE committees DROP CONSTRAINT IF EXISTS committees_level_check;
  ALTER TABLE committees ADD CONSTRAINT committees_level_check CHECK (level >= 1);
  ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_level_check;
  ALTER TABLE issues ADD CONSTRAINT issues_level_check CHECK (level >= 1);
  ALTER TABLE routing_rules DROP CONSTRAINT IF EXISTS routing_rules_start_level_check;
  ALTER TABLE routing_rules ADD CONSTRAINT routing_rules_start_level_check CHECK (start_level >= 1);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

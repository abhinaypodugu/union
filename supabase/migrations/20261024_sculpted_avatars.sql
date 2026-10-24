-- ==============================================================================
-- Sculpted avatar set: assign a random bundled icon to members who have no
-- uploaded photo (or still carry an old preset icon). Idempotent; run after
-- 20261024_audit_fixes.sql.
-- ==============================================================================

-- New profiles without a chosen/uploaded photo get a random sculpted icon.
CREATE OR REPLACE FUNCTION assign_random_avatar() RETURNS TRIGGER AS $$
BEGIN
  IF coalesce(btrim(NEW.avatar_url), '') = '' THEN
    NEW.avatar_url := 'default:sculpted_' || lpad((1 + floor(random() * 16))::int::text, 2, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS profiles_assign_random_avatar ON profiles;
CREATE TRIGGER profiles_assign_random_avatar BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION assign_random_avatar();

-- Backfill existing members without an uploaded photo. Real storage/custom
-- photo URLs are preserved; the old DiceBear presets and old default:* icons
-- are replaced. Already-assigned sculpted icons are stable across re-runs.
UPDATE profiles
SET avatar_url = 'default:sculpted_' || lpad((1 + floor(random() * 16))::int::text, 2, '0')
WHERE avatar_url IS NULL
   OR btrim(avatar_url) = ''
   OR avatar_url LIKE '%api.dicebear.com/%'
   OR (avatar_url LIKE 'default:%' AND avatar_url NOT LIKE 'default:sculpted_%');

-- Function privileges: nothing callable anonymously; trigger helpers stay
-- internal. Re-run this block at the end of every future migration.
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

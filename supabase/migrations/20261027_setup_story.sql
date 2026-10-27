-- ==============================================================================
-- Interactive setup story (2026-10-27)
-- Adds a per-membership onboarding marker. New verified members start at 0 and
-- see the guided setup once; members who existed before this feature are
-- backfilled to 1 so they keep the normal app tour.
-- ==============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS setup_version INTEGER NOT NULL DEFAULT 0;

-- One-time rollout backfill. The fixed cutoff keeps this safe to re-run: members
-- created after the feature shipped are genuine new users and stay eligible.
UPDATE profiles
   SET setup_version = 1
 WHERE status = 'verified'
   AND setup_version = 0
   AND created_at < TIMESTAMPTZ '2026-10-27 16:00:00+00';

-- Return type changed with the new column, so the function must be recreated.
DROP FUNCTION IF EXISTS get_my_memberships();
CREATE OR REPLACE FUNCTION get_my_memberships() RETURNS SETOF profiles AS $$
  SELECT * FROM profiles WHERE user_id = auth.uid() ORDER BY created_at;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION get_my_memberships() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_my_memberships() TO authenticated;

CREATE OR REPLACE FUNCTION complete_setup_story(p_tenant TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_changed INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  UPDATE profiles
     SET setup_version = 1
   WHERE user_id = auth.uid()
     AND tenant_id = p_tenant
     AND status = 'verified'
     AND setup_version < 1;
  GET DIAGNOSTICS v_changed = ROW_COUNT;
  RETURN v_changed > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION complete_setup_story(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION complete_setup_story(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';

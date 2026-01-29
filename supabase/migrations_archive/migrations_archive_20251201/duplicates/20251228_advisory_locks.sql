-- Advisory Locks for AutoRenta
-- Migration: 20251228_advisory_locks
--
-- Provides PostgreSQL advisory lock functions for application-level locking.
-- Advisory locks are session-scoped and automatically released when connection closes.
--
-- Usage from frontend:
--   const { data } = await supabase.rpc('try_advisory_lock', { p_lock_key: 123456789 });
--   if (data === true) { /* lock acquired */ }
--
--   await supabase.rpc('release_advisory_lock', { p_lock_key: 123456789 });

-- ============================================================
-- Function: try_advisory_lock
-- ============================================================
-- Attempts to acquire a session-level advisory lock (non-blocking).
-- Returns true if lock acquired, false if lock is held by another session.
--
-- Parameters:
--   p_lock_key (bigint) - Unique lock identifier
--
-- Returns: boolean - true if lock acquired, false otherwise
-- ============================================================
CREATE OR REPLACE FUNCTION try_advisory_lock(p_lock_key BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- pg_try_advisory_lock returns true if lock acquired, false if not
  RETURN pg_try_advisory_lock(p_lock_key);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION try_advisory_lock(BIGINT) TO authenticated;

COMMENT ON FUNCTION try_advisory_lock IS
'Attempts to acquire a session-level advisory lock. Non-blocking.
Returns true if lock acquired, false if already held by another session.
Lock is automatically released when the session ends.';


-- ============================================================
-- Function: release_advisory_lock
-- ============================================================
-- Releases a session-level advisory lock.
-- Returns true if lock was released, false if lock was not held.
--
-- Parameters:
--   p_lock_key (bigint) - Unique lock identifier
--
-- Returns: boolean - true if lock released, false if not held
-- ============================================================
CREATE OR REPLACE FUNCTION release_advisory_lock(p_lock_key BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- pg_advisory_unlock returns true if lock was held and released
  RETURN pg_advisory_unlock(p_lock_key);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION release_advisory_lock(BIGINT) TO authenticated;

COMMENT ON FUNCTION release_advisory_lock IS
'Releases a session-level advisory lock.
Returns true if lock was held and released, false if lock was not held.';


-- ============================================================
-- Function: try_advisory_lock_shared
-- ============================================================
-- Attempts to acquire a shared advisory lock (non-blocking).
-- Multiple sessions can hold the same shared lock simultaneously.
-- Useful for read operations that should block exclusive writes.
--
-- Parameters:
--   p_lock_key (bigint) - Unique lock identifier
--
-- Returns: boolean - true if lock acquired, false otherwise
-- ============================================================
CREATE OR REPLACE FUNCTION try_advisory_lock_shared(p_lock_key BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN pg_try_advisory_lock_shared(p_lock_key);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION try_advisory_lock_shared(BIGINT) TO authenticated;

COMMENT ON FUNCTION try_advisory_lock_shared IS
'Attempts to acquire a shared advisory lock. Multiple sessions can hold same shared lock.';


-- ============================================================
-- Function: release_advisory_lock_shared
-- ============================================================
-- Releases a shared advisory lock.
--
-- Parameters:
--   p_lock_key (bigint) - Unique lock identifier
--
-- Returns: boolean - true if lock released, false if not held
-- ============================================================
CREATE OR REPLACE FUNCTION release_advisory_lock_shared(p_lock_key BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN pg_advisory_unlock_shared(p_lock_key);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION release_advisory_lock_shared(BIGINT) TO authenticated;

COMMENT ON FUNCTION release_advisory_lock_shared IS
'Releases a shared advisory lock.';


-- ============================================================
-- View: v_advisory_locks_held
-- ============================================================
-- Shows all advisory locks currently held in the database.
-- Useful for debugging and monitoring lock contention.
-- ============================================================
CREATE OR REPLACE VIEW v_advisory_locks_held AS
SELECT
  pid,
  locktype,
  objid AS lock_key,
  granted,
  mode,
  now() AS queried_at
FROM pg_locks
WHERE locktype = 'advisory'
ORDER BY pid, objid;

COMMENT ON VIEW v_advisory_locks_held IS
'Shows all advisory locks currently held. Useful for debugging lock contention.';


-- ============================================================
-- Log migration
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE 'Advisory lock functions created successfully';
  RAISE NOTICE 'Available functions: try_advisory_lock, release_advisory_lock';
  RAISE NOTICE 'Available functions: try_advisory_lock_shared, release_advisory_lock_shared';
  RAISE NOTICE 'View: v_advisory_locks_held';
END $$;

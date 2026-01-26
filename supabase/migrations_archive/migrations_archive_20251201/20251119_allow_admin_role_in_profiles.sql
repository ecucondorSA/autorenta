-- ============================================
-- MIGRATION: Allow 'admin' role in profiles
-- Fecha: 2025-11-19
-- Purpose: Fix E2E test admin authentication by allowing 'admin' as valid role
-- ============================================

-- Drop existing constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add new constraint allowing 'locatario', 'locador', and 'admin'
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('locatario', 'locador', 'admin'));

-- Comment for documentation
COMMENT ON CONSTRAINT profiles_role_check ON profiles IS
  'Allows roles: locatario (renter), locador (owner), admin (platform admin)';

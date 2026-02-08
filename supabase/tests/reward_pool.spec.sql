-- Test spec for Reward Pool System
-- Run this against your local database to verify logic.
-- Usage: psql -h localhost -d postgres -U postgres -f supabase/tests/reward_pool.spec.sql

BEGIN;

-- 1. Setup Test Data
-- Users
INSERT INTO auth.users (id, email, role, created_at) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin@test.local', 'authenticated', now()),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'owner@test.local', 'authenticated', now())
ON CONFLICT (id) DO NOTHING;

-- Profiles
INSERT INTO public.profiles (id, full_name, role, kyc, is_admin, created_at) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Test Admin', 'admin', 'approved', true, now()),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'Test Owner', 'locador', 'approved', false, now())
ON CONFLICT (id) DO UPDATE SET is_admin = EXCLUDED.is_admin;

-- Car (Perfect conditions)
-- NOTE: Cars schema evolved; this block adapts to either owner_id/user_id + daily_rate/price_per_day.
DO $$
DECLARE
  v_owner_col text;
  v_rate_col text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cars' AND column_name = 'user_id'
  ) THEN
    v_owner_col := 'user_id';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cars' AND column_name = 'owner_id'
  ) THEN
    v_owner_col := 'owner_id';
  ELSE
    RAISE EXCEPTION 'Cars table missing owner column (expected user_id or owner_id)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cars' AND column_name = 'daily_rate'
  ) THEN
    v_rate_col := 'daily_rate';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cars' AND column_name = 'price_per_day'
  ) THEN
    v_rate_col := 'price_per_day';
  ELSE
    v_rate_col := null;
  END IF;

  EXECUTE format(
    'INSERT INTO public.cars (id, %I, status, value_usd, created_at, year, brand, model, title, city, province, currency%s) ' ||
    'VALUES ($1, $2, ''active'', 20000, now(), 2022, ''Toyota'', ''Corolla'', ''Toyota Corolla 2022'', ''Buenos Aires'', ''Buenos Aires'', ''ARS''%s) ' ||
    'ON CONFLICT (id) DO NOTHING',
    v_owner_col,
    CASE WHEN v_rate_col IS NULL THEN '' ELSE ', ' || quote_ident(v_rate_col) END,
    CASE WHEN v_rate_col IS NULL THEN '' ELSE ', 50' END
  )
  USING
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c33'::uuid,
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22'::uuid;
END $$;

-- 2. Test Security Functions
DO $$
DECLARE
  v_is_admin boolean;
BEGIN
  -- Impersonate Admin
  -- Note: In pure SQL without extensions, we can't easily switch auth.uid() context for RLS checks 
  -- without setting request.jwt.claim.sub, which requires pg_net or similar setup.
  -- For this raw script, we strictly test the LOGIC of the functions by calling them directly 
  -- but since they rely on auth.uid(), we might just skip RLS verification in this raw script 
  -- and focus on the math functions.
  
  -- However, we can test calculate_daily_points logic which is PLPGSQL.
END$$;

-- 3. Test Daily Points Calculation
-- Clear previous points for today
DELETE FROM public.daily_car_points WHERE date = CURRENT_DATE;

-- Run Calculation
SELECT public.run_daily_points_calculation(CURRENT_DATE);

-- Verify Result
DO $$
DECLARE
  v_points integer;
  v_eligible boolean;
BEGIN
  SELECT points, is_eligible INTO v_points, v_eligible
  FROM public.daily_car_points
  WHERE car_id = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c33' AND date = CURRENT_DATE;

  IF v_points IS NULL THEN
    RAISE EXCEPTION 'Test Failed: No points record created';
  END IF;

  -- Base points 100 * value_factor (>1) * rep_factor (>0.7). Should be > 100.
  IF v_points < 100 THEN
    RAISE EXCEPTION 'Test Failed: Points % should be > 100 for a perfect car', v_points;
  END IF;

  IF v_eligible IS NOT TRUE THEN
    RAISE EXCEPTION 'Test Failed: Car should be eligible';
  END IF;

  RAISE NOTICE '✅ Test Passed: Valid car received % points', v_points;
END$$;

-- 4. Test Ineligible Car (Status != active)
UPDATE public.cars SET status = 'maintenance' WHERE id = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c33';
SELECT public.run_daily_points_calculation(CURRENT_DATE);

DO $$
DECLARE
  v_points integer;
BEGIN
  SELECT points INTO v_points
  FROM public.daily_car_points
  WHERE car_id = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c33' AND date = CURRENT_DATE;

  IF v_points != 0 THEN
    RAISE EXCEPTION 'Test Failed: Maintenance car should have 0 points, got %', v_points;
  END IF;

   RAISE NOTICE '✅ Test Passed: Maintenance car received 0 points';
END$$;

-- 5. Test Cooldown Logic
-- Add cooldown manually
INSERT INTO public.owner_cooldowns (owner_id, car_id, reason, starts_at, ends_at)
VALUES ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c33', 'manual_test', now(), now() + interval '1 day');

-- Check function
DO $$
BEGIN
  IF NOT public.is_in_cooldown('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c33') THEN
     RAISE EXCEPTION 'Test Failed: is_in_cooldown should return true';
  END IF;
  RAISE NOTICE '✅ Test Passed: Cooldown detected correctly';
END$$;


ROLLBACK; -- Always rollback changes
RAISE NOTICE 'All tests finished (rolled back).';

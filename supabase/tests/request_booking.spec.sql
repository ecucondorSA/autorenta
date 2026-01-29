-- Test spec for request_booking RPC
-- This is a lightweight SQL test script intended to be run against a local dev database
-- that has the project's schema already applied.

-- Prepare test data. These statements may need to be adjusted to match existing constraints
-- in your dev DB (roles, RLS, foreign keys). Run in a transaction or in psql session.

BEGIN;

-- Ensure auth.users entries (required because public.profiles.id references auth.users.id)
INSERT INTO auth.users (id, aud, role, email, created_at)
VALUES
('00000000-0000-0000-0000-000000000001'::uuid, 'authenticated', 'authenticated', 'owner@test.local', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.users (id, aud, role, email, created_at)
VALUES
('00000000-0000-0000-0000-000000000002'::uuid, 'authenticated', 'authenticated', 'renter@test.local', now())
ON CONFLICT (id) DO NOTHING;

-- Create corresponding profiles
INSERT INTO public.profiles (id, email, role, created_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'owner@test.local', 'locador', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, role, created_at)
VALUES ('00000000-0000-0000-0000-000000000002', 'renter@test.local', 'locatario', now())
ON CONFLICT (id) DO NOTHING;

-- Create a test car with required non-null columns
INSERT INTO public.cars (id, owner_id, title, price_per_day, status, created_at, location_lat, location_lng, city, province)
VALUES ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'Test Car', 100.00, 'active', now(), -34.6037, -58.3816, 'CABA', 'CABA')
ON CONFLICT (id) DO UPDATE SET price_per_day = EXCLUDED.price_per_day;

-- Clean up any existing bookings for the test car
DELETE FROM public.bookings WHERE car_id = '11111111-1111-1111-1111-111111111111';

-- Call the RPC for a simple 2-night booking
SELECT * FROM public.request_booking(
  '11111111-1111-1111-1111-111111111111'::uuid,
  '00000000-0000-0000-0000-000000000002'::uuid,
  now() + interval '2 days',
  now() + interval '4 days',
  'card'
);

-- Expect a pending booking exists
SELECT id, status, total_cents FROM public.bookings WHERE car_id = '11111111-1111-1111-1111-111111111111' LIMIT 1;

-- Test overlap: attempt another booking in the same range should error
DO $$
BEGIN
  PERFORM public.request_booking(
    '11111111-1111-1111-1111-111111111111'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    now() + interval '3 days',
    now() + interval '5 days',
    'card'
  );
  RAISE NOTICE 'ERROR: overlap was expected but not raised';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Expected error on overlap: %', SQLERRM;
END$$;

-- cleanup (optional)
-- DELETE FROM public.bookings WHERE car_id = '11111111-1111-1111-1111-111111111111';

COMMIT;

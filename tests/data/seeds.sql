-- AutoRenta E2E Test Seed Data
-- Run this before E2E tests to populate test users and data

-- ============================================
-- TEST USERS
-- ============================================

-- Insert test users into auth.users (Supabase Auth)
-- Passwords: All use "Test{Role}123!" format
--
-- NOTE: In production, run this via Supabase Dashboard or CLI
-- These are INSERT statements for the auth.users table

-- 1. Renter Test User
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  'e2e-renter-0000-0000-000000000001',
  'renter.test@autorenta.com',
  crypt('TestRenter123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 2. Owner Test User
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  'e2e-owner--0000-0000-000000000002',
  'owner.test@autorenta.com',
  crypt('TestOwner123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 3. Admin Test User
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  'e2e-admin--0000-0000-000000000003',
  'admin.test@autorenta.com',
  crypt('TestAdmin123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 4. Both (Renter + Owner) Test User
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  'e2e-both---0000-0000-000000000004',
  'both.test@autorenta.com',
  crypt('TestBoth123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PROFILES
-- ============================================

INSERT INTO profiles (
  id,
  full_name,
  phone,
  role,
  is_admin,
  created_at,
  updated_at
) VALUES
  (
    'e2e-renter-0000-0000-000000000001',
    'Test Renter User',
    '+5491112345678',
    'locatario',
    FALSE,
    NOW(),
    NOW()
  ),
  (
    'e2e-owner--0000-0000-000000000002',
    'Test Owner User',
    '+5491112345679',
    'locador',
    FALSE,
    NOW(),
    NOW()
  ),
  (
    'e2e-admin--0000-0000-000000000003',
    'Test Admin User',
    '+5491112345680',
    'ambos',
    TRUE,
    NOW(),
    NOW()
  ),
  (
    'e2e-both---0000-0000-000000000004',
    'Test Both User',
    '+5491112345681',
    'ambos',
    FALSE,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  is_admin = EXCLUDED.is_admin;

-- ============================================
-- WALLETS
-- ============================================

INSERT INTO user_wallets (
  user_id,
  balance,
  locked_funds,
  created_at,
  updated_at
) VALUES
  (
    'e2e-renter-0000-0000-000000000001',
    50000.00, -- 50,000 ARS
    0.00,
    NOW(),
    NOW()
  ),
  (
    'e2e-owner--0000-0000-000000000002',
    100000.00, -- 100,000 ARS
    0.00,
    NOW(),
    NOW()
  ),
  (
    'e2e-admin--0000-0000-000000000003',
    200000.00, -- 200,000 ARS (admin)
    0.00,
    NOW(),
    NOW()
  ),
  (
    'e2e-both---0000-0000-000000000004',
    75000.00, -- 75,000 ARS
    0.00,
    NOW(),
    NOW()
  )
ON CONFLICT (user_id) DO UPDATE SET
  balance = EXCLUDED.balance,
  locked_funds = 0.00;

-- ============================================
-- TEST CARS (Published by Owner)
-- ============================================

INSERT INTO cars (
  id,
  user_id,
  brand,
  model,
  year,
  plate,
  category,
  price_per_day,
  city,
  address,
  latitude,
  longitude,
  status,
  created_at,
  updated_at
) VALUES
  -- Economy Cars
  (
    'e2e-car-economy-000-000000000001',
    'e2e-owner--0000-0000-000000000002',
    'Toyota',
    'Corolla',
    2020,
    'AB123CD',
    'economy',
    15000.00,
    'Buenos Aires',
    'Av. Corrientes 1234',
    -34.6037,
    -58.3816,
    'active',
    NOW(),
    NOW()
  ),
  (
    'e2e-car-economy-000-000000000002',
    'e2e-owner--0000-0000-000000000002',
    'Volkswagen',
    'Polo',
    2021,
    'CD456EF',
    'economy',
    14000.00,
    'Buenos Aires',
    'Av. Santa Fe 5678',
    -34.5975,
    -58.3833,
    'active',
    NOW(),
    NOW()
  ),
  (
    'e2e-car-economy-000-000000000003',
    'e2e-owner--0000-0000-000000000002',
    'Chevrolet',
    'Onix',
    2022,
    'EF789GH',
    'economy',
    13000.00,
    'Córdoba',
    'Av. Colón 910',
    -31.4201,
    -64.1888,
    'active',
    NOW(),
    NOW()
  ),
  -- Premium Cars
  (
    'e2e-car-premium-000-000000000004',
    'e2e-owner--0000-0000-000000000002',
    'Audi',
    'A4',
    2021,
    'GH012IJ',
    'premium',
    35000.00,
    'Buenos Aires',
    'Av. del Libertador 1111',
    -34.5872,
    -58.4184,
    'active',
    NOW(),
    NOW()
  ),
  (
    'e2e-car-premium-000-000000000005',
    'e2e-both---0000-0000-000000000004',
    'BMW',
    '320i',
    2022,
    'IJ345KL',
    'premium',
    40000.00,
    'Buenos Aires',
    'Av. 9 de Julio 222',
    -34.6037,
    -58.3816,
    'active',
    NOW(),
    NOW()
  ),
  -- Luxury Car
  (
    'e2e-car-luxury--000-000000000006',
    'e2e-both---0000-0000-000000000004',
    'Tesla',
    'Model 3',
    2023,
    'KL678MN',
    'luxury',
    60000.00,
    'Rosario',
    'Av. Pellegrini 333',
    -32.9442,
    -60.6505,
    'active',
    NOW(),
    NOW()
  ),
  -- Pending Approval Car
  (
    'e2e-car-pending-000-000000000007',
    'e2e-owner--0000-0000-000000000002',
    'Ford',
    'Focus',
    2020,
    'MN901OP',
    'economy',
    12000.00,
    'Buenos Aires',
    'Av. Rivadavia 444',
    -34.6092,
    -58.3842,
    'pending',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  price_per_day = EXCLUDED.price_per_day;

-- ============================================
-- CAR PHOTOS
-- ============================================

INSERT INTO car_photos (
  id,
  car_id,
  url,
  stored_path,
  position,
  sort_order,
  created_at
) VALUES
  -- Corolla
  ('e2e-photo-0001', 'e2e-car-economy-000-000000000001', 'https://example.com/corolla-1.jpg', 'e2e-owner--0000-0000-000000000002/e2e-car-economy-000-000000000001/photo1.jpg', 0, 0, NOW()),
  ('e2e-photo-0002', 'e2e-car-economy-000-000000000001', 'https://example.com/corolla-2.jpg', 'e2e-owner--0000-0000-000000000002/e2e-car-economy-000-000000000001/photo2.jpg', 1, 1, NOW()),
  -- Polo
  ('e2e-photo-0003', 'e2e-car-economy-000-000000000002', 'https://example.com/polo-1.jpg', 'e2e-owner--0000-0000-000000000002/e2e-car-economy-000-000000000002/photo1.jpg', 0, 0, NOW()),
  -- Audi A4
  ('e2e-photo-0004', 'e2e-car-premium-000-000000000004', 'https://example.com/audi-1.jpg', 'e2e-owner--0000-0000-000000000002/e2e-car-premium-000-000000000004/photo1.jpg', 0, 0, NOW()),
  ('e2e-photo-0005', 'e2e-car-premium-000-000000000004', 'https://example.com/audi-2.jpg', 'e2e-owner--0000-0000-000000000002/e2e-car-premium-000-000000000004/photo2.jpg', 1, 1, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- CLEANUP FUNCTION
-- ============================================

-- Function to cleanup test data after E2E runs
CREATE OR REPLACE FUNCTION cleanup_e2e_test_data()
RETURNS void AS $$
BEGIN
  -- Delete test bookings
  DELETE FROM bookings WHERE user_id LIKE 'e2e-%';

  -- Delete test payments
  DELETE FROM payments WHERE user_id LIKE 'e2e-%';

  -- Delete test wallet transactions
  DELETE FROM wallet_transactions WHERE user_id LIKE 'e2e-%';

  -- Reset test wallets
  UPDATE user_wallets
  SET balance = CASE user_id
    WHEN 'e2e-renter-0000-0000-000000000001' THEN 50000.00
    WHEN 'e2e-owner--0000-0000-000000000002' THEN 100000.00
    WHEN 'e2e-admin--0000-0000-000000000003' THEN 200000.00
    WHEN 'e2e-both---0000-0000-000000000004' THEN 75000.00
  END,
  locked_funds = 0.00
  WHERE user_id LIKE 'e2e-%';

  -- Reset test cars to active status
  UPDATE cars
  SET status = 'active'
  WHERE id LIKE 'e2e-car-%' AND status != 'pending';

  RAISE NOTICE 'E2E test data cleaned up successfully';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- USAGE NOTES
-- ============================================

-- To seed data:
-- psql -U postgres -d autorenta -f tests/data/seeds.sql

-- To cleanup after tests:
-- SELECT cleanup_e2e_test_data();

-- Verify seeded data:
-- SELECT * FROM profiles WHERE id LIKE 'e2e-%';
-- SELECT * FROM user_wallets WHERE user_id LIKE 'e2e-%';
-- SELECT * FROM cars WHERE id LIKE 'e2e-car-%';

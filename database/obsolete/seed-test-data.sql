-- ============================================
-- SEED DATA COMPLETO PARA TESTING
-- Fecha: 2025-11-15
-- Propósito: Poblar TODAS las tablas críticas que la UI/servicios usan
-- ============================================

-- NOTA IMPORTANTE: Este script requiere que existan usuarios en auth.users
-- Primero debes crear usuarios mediante el signup de la app o Supabase Dashboard

BEGIN;

-- ============================================
-- PASO 1: VERIFICAR USUARIOS EXISTENTES
-- ============================================
-- Ejecuta primero: SELECT id, email FROM auth.users LIMIT 5;
-- Usa esos UUIDs en las variables de abajo

DO $$
DECLARE
  user1_id UUID;
  user2_id UUID;
  user3_id UUID;
  car1_id UUID;
  car2_id UUID;
  car3_id UUID;
  booking1_id UUID;
  booking2_id UUID;
BEGIN
  -- Obtener usuarios existentes (o crear si no existen en profiles)
  SELECT id INTO user1_id FROM profiles LIMIT 1 OFFSET 0;
  SELECT id INTO user2_id FROM profiles LIMIT 1 OFFSET 1;
  SELECT id INTO user3_id FROM profiles LIMIT 1 OFFSET 2;
  
  -- Si no hay usuarios, salir
  IF user1_id IS NULL THEN
    RAISE NOTICE 'No hay usuarios en profiles. Debes crear usuarios primero.';
    RETURN;
  END IF;

  RAISE NOTICE 'Usando usuarios: %, %, %', user1_id, user2_id, user3_id;

  -- ============================================
  -- PASO 2: AUTOS (3 autos de ejemplo)
  -- ============================================
  
  car1_id := gen_random_uuid();
  INSERT INTO cars (
    id, owner_id, title, brand, model, year, 
    price_per_day, currency, city, province, country,
    latitude, longitude, status, description,
    transmission, fuel_type, seats, doors,
    created_at, updated_at
  ) VALUES (
    car1_id, user1_id,
    'Toyota Corolla 2020 - Impecable',
    'Toyota', 'Corolla', 2020,
    15000, 'ARS',
    'Buenos Aires', 'CABA', 'AR',
    -34.6037, -58.3816,
    'active',
    'Auto ideal para ciudad, muy económico, aire acondicionado, dirección hidráulica.',
    'automatic', 'gasoline', 5, 4,
    NOW() - INTERVAL '30 days', NOW()
  ) ON CONFLICT DO NOTHING;

  car2_id := gen_random_uuid();
  INSERT INTO cars (
    id, owner_id, title, brand, model, year,
    price_per_day, currency, city, province, country,
    latitude, longitude, status, description,
    transmission, fuel_type, seats, doors,
    created_at, updated_at
  ) VALUES (
    car2_id, user1_id,
    'Honda City 2021 - Full',
    'Honda', 'City', 2021,
    18000, 'ARS',
    'Córdoba', 'Córdoba', 'AR',
    -31.4201, -64.1888,
    'active',
    'Sedán espacioso, perfecto para viajes largos. GPS incluido.',
    'automatic', 'gasoline', 5, 4,
    NOW() - INTERVAL '25 days', NOW()
  ) ON CONFLICT DO NOTHING;

  car3_id := gen_random_uuid();
  INSERT INTO cars (
    id, owner_id, title, brand, model, year,
    price_per_day, currency, city, province, country,
    latitude, longitude, status, description,
    transmission, fuel_type, seats, doors,
    created_at, updated_at
  ) VALUES (
    car3_id, user2_id,
    'VW Gol 2019 - Económico',
    'Volkswagen', 'Gol', 2019,
    12000, 'ARS',
    'Rosario', 'Santa Fe', 'AR',
    -32.9442, -60.6505,
    'active',
    'Ideal primer auto, bajo consumo, fácil de manejar.',
    'manual', 'gasoline', 5, 4,
    NOW() - INTERVAL '20 days', NOW()
  ) ON CONFLICT DO NOTHING;

  -- ============================================
  -- PASO 3: BOOKINGS (2 reservas de ejemplo)
  -- ============================================
  
  booking1_id := gen_random_uuid();
  INSERT INTO bookings (
    id, car_id, renter_id, owner_id,
    start_date, end_date, status,
    total_price, daily_price, currency,
    pickup_location, dropoff_location,
    created_at, updated_at
  ) VALUES (
    booking1_id, car1_id, user2_id, user1_id,
    NOW() + INTERVAL '5 days', NOW() + INTERVAL '8 days',
    'confirmed',
    45000, 15000, 'ARS',
    'Palermo, Buenos Aires', 'Palermo, Buenos Aires',
    NOW() - INTERVAL '2 days', NOW()
  ) ON CONFLICT DO NOTHING;

  booking2_id := gen_random_uuid();
  INSERT INTO bookings (
    id, car_id, renter_id, owner_id,
    start_date, end_date, status,
    total_price, daily_price, currency,
    pickup_location, dropoff_location,
    created_at, updated_at
  ) VALUES (
    booking2_id, car2_id, user3_id, user1_id,
    NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 days',
    'completed',
    54000, 18000, 'ARS',
    'Centro, Córdoba', 'Centro, Córdoba',
    NOW() - INTERVAL '10 days', NOW() - INTERVAL '2 days'
  ) ON CONFLICT DO NOTHING;

  -- ============================================
  -- PASO 4: PAYMENTS (pagos para las bookings)
  -- ============================================
  
  INSERT INTO payments (
    id, booking_id, user_id, amount, currency,
    status, payment_method, provider,
    created_at, updated_at
  ) VALUES
    (gen_random_uuid(), booking1_id, user2_id, 45000, 'ARS', 
     'approved', 'credit_card', 'mercadopago', NOW() - INTERVAL '2 days', NOW()),
    (gen_random_uuid(), booking2_id, user3_id, 54000, 'ARS',
     'approved', 'wallet', 'internal', NOW() - INTERVAL '10 days', NOW() - INTERVAL '2 days')
  ON CONFLICT DO NOTHING;

  -- ============================================
  -- PASO 5: REVIEWS (reviews para booking completada)
  -- ============================================
  
  INSERT INTO reviews (
    id, booking_id, reviewer_id, reviewed_id,
    rating, comment, type,
    created_at, updated_at
  ) VALUES (
    gen_random_uuid(), booking2_id, user3_id, user1_id,
    5, 'Excelente experiencia, auto en perfecto estado. El dueño muy amable.', 'owner',
    NOW() - INTERVAL '1 day', NOW()
  ), (
    gen_random_uuid(), booking2_id, user1_id, user3_id,
    5, 'Inquilino responsable, devolvió el auto limpio y en hora.', 'renter',
    NOW() - INTERVAL '1 day', NOW()
  ) ON CONFLICT DO NOTHING;

  -- ============================================
  -- PASO 6: BANK_ACCOUNTS (cuentas bancarias)
  -- ============================================
  
  INSERT INTO bank_accounts (
    id, user_id, account_holder_name, account_number,
    bank_name, account_type, currency, is_verified,
    created_at, updated_at
  ) VALUES (
    gen_random_uuid(), user1_id, 'Juan Pérez', '1234567890123456789012',
    'Banco Galicia', 'savings', 'ARS', true,
    NOW() - INTERVAL '15 days', NOW()
  ), (
    gen_random_uuid(), user2_id, 'María González', '9876543210987654321098',
    'Banco Nación', 'checking', 'ARS', true,
    NOW() - INTERVAL '10 days', NOW()
  ) ON CONFLICT DO NOTHING;

  -- ============================================
  -- PASO 7: USER_VERIFICATIONS (verificaciones)
  -- ============================================
  
  INSERT INTO user_verifications (
    id, user_id, verification_type, status,
    verified_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), user1_id, 'email', 'verified', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days', NOW()
  ), (
    gen_random_uuid(), user1_id, 'phone', 'verified', NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days', NOW()
  ), (
    gen_random_uuid(), user1_id, 'identity', 'verified', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days', NOW()
  ), (
    gen_random_uuid(), user2_id, 'email', 'verified', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days', NOW()
  ), (
    gen_random_uuid(), user2_id, 'phone', 'pending', NULL, NOW() - INTERVAL '2 days', NOW()
  ) ON CONFLICT DO NOTHING;

  -- ============================================
  -- PASO 8: REFERRAL_CODES (códigos de referidos)
  -- ============================================
  
  INSERT INTO referral_codes (
    id, user_id, code, max_uses, current_uses,
    expires_at, is_active, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), user1_id, 'JUAN2025', 10, 2,
    NOW() + INTERVAL '6 months', true, NOW() - INTERVAL '20 days', NOW()
  ), (
    gen_random_uuid(), user2_id, 'MARIA50', 5, 0,
    NOW() + INTERVAL '3 months', true, NOW() - INTERVAL '5 days', NOW()
  ) ON CONFLICT DO NOTHING;

  -- ============================================
  -- PASO 9: DRIVER_RISK_PROFILE (perfiles de riesgo)
  -- ============================================
  
  INSERT INTO driver_risk_profile (
    id, user_id, risk_score, driver_class,
    total_bookings, incidents_count, 
    created_at, updated_at
  ) VALUES (
    gen_random_uuid(), user2_id, 850, 'gold', 5, 0,
    NOW() - INTERVAL '30 days', NOW()
  ), (
    gen_random_uuid(), user3_id, 750, 'silver', 2, 0,
    NOW() - INTERVAL '10 days', NOW()
  ) ON CONFLICT DO NOTHING;

  -- ============================================
  -- PASO 10: BOOKING_WAITLIST (lista de espera)
  -- ============================================
  
  INSERT INTO booking_waitlist (
    id, car_id, user_id, desired_start_date, desired_end_date,
    status, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), car1_id, user3_id, 
    NOW() + INTERVAL '15 days', NOW() + INTERVAL '18 days',
    'waiting', NOW() - INTERVAL '3 days', NOW()
  ) ON CONFLICT DO NOTHING;

  -- ============================================
  -- PASO 11: USER_ONBOARDING_PLANS
  -- ============================================
  
  INSERT INTO user_onboarding_plans (
    id, user_id, template_id, status,
    current_step, completed_steps, total_steps,
    created_at, updated_at
  ) VALUES (
    gen_random_uuid(), user1_id, 
    (SELECT id FROM onboarding_plan_templates WHERE target_role = 'locador' LIMIT 1),
    'completed', 5, 5, 5,
    NOW() - INTERVAL '30 days', NOW() - INTERVAL '25 days'
  ), (
    gen_random_uuid(), user2_id,
    (SELECT id FROM onboarding_plan_templates WHERE target_role = 'locatario' LIMIT 1),
    'in_progress', 2, 2, 3,
    NOW() - INTERVAL '10 days', NOW()
  ) ON CONFLICT DO NOTHING;

  -- ============================================
  -- PASO 12: WALLET_TRANSACTIONS (transacciones wallet)
  -- ============================================
  
  INSERT INTO wallet_transactions (
    id, user_id, amount, currency, type, status,
    description, reference_id, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), user1_id, 100000, 'ARS', 'deposit', 'completed',
    'Depósito inicial', NULL, NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'
  ), (
    gen_random_uuid(), user2_id, 50000, 'ARS', 'deposit', 'completed',
    'Recarga de wallet', NULL, NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'
  ), (
    gen_random_uuid(), user2_id, -45000, 'ARS', 'payment', 'completed',
    'Pago booking #' || booking1_id::text, booking1_id, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'
  ) ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Seed data creado exitosamente!';
  RAISE NOTICE 'Autos creados: %, %, %', car1_id, car2_id, car3_id;
  RAISE NOTICE 'Bookings creados: %, %', booking1_id, booking2_id;

END $$;

COMMIT;

-- Script para crear reviews de prueba
-- Ejecutar con: psql -h localhost -U postgres -d postgres -f create-test-reviews.sql

-- Primero obtener algunos IDs existentes
DO $$
DECLARE
  v_user_id UUID;
  v_car_id UUID;
  v_booking_id UUID;
  v_review_id UUID;
BEGIN
  -- Obtener un usuario existente
  SELECT id INTO v_user_id FROM profiles LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No users found in profiles table';
  END IF;

  -- Obtener un auto existente
  SELECT id INTO v_car_id FROM cars LIMIT 1;
  IF v_car_id IS NULL THEN
    RAISE EXCEPTION 'No cars found in cars table';
  END IF;

  -- Crear una reserva de prueba si no existe ninguna
  INSERT INTO bookings (
    id, renter_id, car_id, start_at, end_at, total_price_cents,
    status, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    v_car_id,
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '27 days',
    50000, -- 500 ARS
    'completed',
    NOW() - INTERVAL '26 days',
    NOW() - INTERVAL '26 days'
  ) ON CONFLICT DO NOTHING
  RETURNING id INTO v_booking_id;

  -- Si no se creó una nueva, obtener una existente
  IF v_booking_id IS NULL THEN
    SELECT id INTO v_booking_id FROM bookings WHERE status = 'completed' LIMIT 1;
  END IF;

  IF v_booking_id IS NULL THEN
    RAISE EXCEPTION 'No completed bookings found';
  END IF;

  -- Crear una review de prueba
  INSERT INTO reviews (
    id,
    booking_id,
    reviewer_id,
    reviewee_id,
    car_id,
    review_type,
    rating_cleanliness,
    rating_communication,
    rating_accuracy,
    rating_location,
    rating_checkin,
    rating_value,
    comment_public,
    status,
    is_visible,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_booking_id,
    v_user_id,
    v_user_id, -- Para simplificar, el mismo usuario se califica a sí mismo
    v_car_id,
    'renter_to_owner',
    5, 4, 5, 4, 5, 4,
    'Excelente auto, muy limpio y bien cuidado. El propietario fue muy amable y comunicativo. Definitivamente lo recomiendo.',
    'approved',
    true,
    NOW() - INTERVAL '25 days',
    NOW() - INTERVAL '25 days'
  ) RETURNING id INTO v_review_id;

  RAISE NOTICE 'Review creada exitosamente con ID: %', v_review_id;
  RAISE NOTICE 'Para el auto ID: %', v_car_id;
  RAISE NOTICE 'Booking ID: %', v_booking_id;

END $$;


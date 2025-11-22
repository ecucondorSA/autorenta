-- Script de ejemplo para dejar exactamente 5 autos activos, 5 duenos y bookings para todo el ano.
-- Limpia los datos previos de autos y bookings, crea usuarios completos (duenos y locatarios),
-- marcas/modelos clave y genera reservas que cubren TODO 2026.

BEGIN;

TRUNCATE TABLE public.bookings CASCADE;
TRUNCATE TABLE public.cars CASCADE;
TRUNCATE TABLE public.car_photos;

-- 1. Usuarios autenticados (duenos y locatarios de la demo)
INSERT INTO auth.users (id, aud, role, email, created_at)
VALUES
  ('11111111-0000-0000-0000-000000000001'::uuid, 'authenticated', 'authenticated', 'alejandro@autorenta.app', NOW()),
  ('11111111-0000-0000-0000-000000000002'::uuid, 'authenticated', 'authenticated', 'camila@autorenta.app', NOW()),
  ('11111111-0000-0000-0000-000000000003'::uuid, 'authenticated', 'authenticated', 'santiago@autorenta.app', NOW()),
  ('11111111-0000-0000-0000-000000000004'::uuid, 'authenticated', 'authenticated', 'valeria@autorenta.app', NOW()),
  ('11111111-0000-0000-0000-000000000005'::uuid, 'authenticated', 'authenticated', 'luciano@autorenta.app', NOW()),
  ('22222222-0000-0000-0000-000000000001'::uuid, 'authenticated', 'authenticated', 'lucia@autorenta.app', NOW()),
  ('22222222-0000-0000-0000-000000000002'::uuid, 'authenticated', 'authenticated', 'mateo@autorenta.app', NOW()),
  ('22222222-0000-0000-0000-000000000003'::uuid, 'authenticated', 'authenticated', 'sofia@autorenta.app', NOW()),
  ('22222222-0000-0000-0000-000000000004'::uuid, 'authenticated', 'authenticated', 'martin@autorenta.app', NOW()),
  ('22222222-0000-0000-0000-000000000005'::uuid, 'authenticated', 'authenticated', 'amelia@autorenta.app', NOW())
ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;

-- 2. Perfiles completos para duenos y locatarios
INSERT INTO public.profiles (
  id, email, full_name, role, avatar_url, date_of_birth, phone, phone_verified, email_verified,
  created_at, updated_at, onboarding, preferred_search_radius_km, primary_goal,
  home_latitude, home_longitude, rating_avg, rating_count
)
VALUES
  ('11111111-0000-0000-0000-000000000001', 'alejandro@autorenta.app', 'Alejandro Fernandez', 'owner',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&w=640&h=640&q=80',
    '1985-04-12', '5491134567001', TRUE, TRUE, NOW(), NOW(), 'complete', 40, 'publish', -34.5971, -58.3633, 4.95, 152),
  ('11111111-0000-0000-0000-000000000002', 'camila@autorenta.app', 'Camila Rodriguez', 'owner',
    'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=facearea&w=640&h=640&q=80',
    '1992-09-08', '5491134567002', TRUE, TRUE, NOW(), NOW(), 'complete', 40, 'publish', -34.6083, -58.3712, 4.88, 134),
  ('11111111-0000-0000-0000-000000000003', 'santiago@autorenta.app', 'Santiago Martinez', 'owner',
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=facearea&w=640&h=640&q=80',
    '1988-06-05', '5491134567003', TRUE, TRUE, NOW(), NOW(), 'complete', 40, 'publish', -31.4201, -64.1888, 4.92, 189),
  ('11111111-0000-0000-0000-000000000004', 'valeria@autorenta.app', 'Valeria Castro', 'owner',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=facearea&w=640&h=640&q=80',
    '1994-11-22', '5491134567004', TRUE, TRUE, NOW(), NOW(), 'complete', 40, 'publish', -34.9215, -57.9545, 4.81, 98),
  ('11111111-0000-0000-0000-000000000005', 'luciano@autorenta.app', 'Luciano Alvarez', 'owner',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=facearea&w=640&h=640&q=80',
    '1982-02-19', '5491134567005', TRUE, TRUE, NOW(), NOW(), 'complete', 40, 'publish', -32.9468, -60.6393, 4.87, 141),
  ('22222222-0000-0000-0000-000000000001', 'lucia@autorenta.app', 'Lucia Silva', 'renter',
    'https://randomuser.me/api/portraits/women/68.jpg', '1993-07-21', '5491134568001', TRUE, TRUE, NOW(), NOW(),
    'complete', 25, 'rent', -34.6037, -58.3816, 4.8, 45),
  ('22222222-0000-0000-0000-000000000002', 'mateo@autorenta.app', 'Mateo Alvarez', 'renter',
    'https://randomuser.me/api/portraits/men/45.jpg', '1991-03-12', '5491134568002', TRUE, TRUE, NOW(), NOW(),
    'complete', 25, 'rent', -31.4201, -64.1888, 4.9, 60),
  ('22222222-0000-0000-0000-000000000003', 'sofia@autorenta.app', 'Sofia Lima', 'renter',
    'https://randomuser.me/api/portraits/women/21.jpg', '1995-01-30', '5491134568003', TRUE, TRUE, NOW(), NOW(),
    'complete', 25, 'rent', -34.9215, -57.9545, 4.6, 29),
  ('22222222-0000-0000-0000-000000000004', 'martin@autorenta.app', 'Martin Rojas', 'renter',
    'https://randomuser.me/api/portraits/men/37.jpg', '1989-10-18', '5491134568004', TRUE, TRUE, NOW(), NOW(),
    'complete', 25, 'rent', -32.9468, -60.6393, 4.85, 38),
  ('22222222-0000-0000-0000-000000000005', 'amelia@autorenta.app', 'Amelia Duarte', 'renter',
    'https://randomuser.me/api/portraits/women/65.jpg', '1992-05-27', '5491134568005', TRUE, TRUE, NOW(), NOW(),
    'complete', 25, 'rent', -34.6083, -58.3712, 4.7, 33)
ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    avatar_url = EXCLUDED.avatar_url,
    date_of_birth = EXCLUDED.date_of_birth,
    phone = EXCLUDED.phone,
    phone_verified = EXCLUDED.phone_verified,
    email_verified = EXCLUDED.email_verified,
    updated_at = NOW(),
    onboarding = EXCLUDED.onboarding,
    preferred_search_radius_km = EXCLUDED.preferred_search_radius_km,
    primary_goal = EXCLUDED.primary_goal,
    home_latitude = EXCLUDED.home_latitude,
    home_longitude = EXCLUDED.home_longitude,
    rating_avg = EXCLUDED.rating_avg,
    rating_count = EXCLUDED.rating_count;

-- 3. Marcas y modelos base
INSERT INTO car_brands (id, name, country, logo_url, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'Chevrolet', 'USA', 'https://upload.wikimedia.org/wikipedia/commons/4/4f/Chevrolet_logo.png', NOW(), NOW()),
  (gen_random_uuid(), 'Toyota', 'Japan', 'https://upload.wikimedia.org/wikipedia/commons/9/9d/Toyota_logo.png', NOW(), NOW()),
  (gen_random_uuid(), 'Volkswagen', 'Germany', 'https://upload.wikimedia.org/wikipedia/commons/3/3e/VW_logo.png', NOW(), NOW()),
  (gen_random_uuid(), 'Ford', 'USA', 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Ford_logo.svg', NOW(), NOW()),
  (gen_random_uuid(), 'Nissan', 'Japan', 'https://upload.wikimedia.org/wikipedia/commons/1/19/Nissan_logo.svg', NOW(), NOW())
ON CONFLICT (name) DO UPDATE
  SET country = EXCLUDED.country,
    logo_url = EXCLUDED.logo_url,
    updated_at = NOW();

INSERT INTO car_models (id, brand_id, name, category, seats, doors, created_at, updated_at)
SELECT gen_random_uuid(), b.id, 'Camaro SS', 'coupe', 4, 2, NOW(), NOW()
FROM car_brands b
WHERE b.name = 'Chevrolet'
ON CONFLICT (brand_id, name) DO UPDATE
  SET category = EXCLUDED.category,
    seats = EXCLUDED.seats,
    doors = EXCLUDED.doors,
    updated_at = NOW();

INSERT INTO car_models (id, brand_id, name, category, seats, doors, created_at, updated_at)
SELECT gen_random_uuid(), b.id, 'Corolla Hybrid', 'sedan', 5, 4, NOW(), NOW()
FROM car_brands b
WHERE b.name = 'Toyota'
ON CONFLICT (brand_id, name) DO UPDATE
  SET category = EXCLUDED.category,
    seats = EXCLUDED.seats,
    doors = EXCLUDED.doors,
    updated_at = NOW();

INSERT INTO car_models (id, brand_id, name, category, seats, doors, created_at, updated_at)
SELECT gen_random_uuid(), b.id, 'Tiguan Comfortline', 'suv', 5, 4, NOW(), NOW()
FROM car_brands b
WHERE b.name = 'Volkswagen'
ON CONFLICT (brand_id, name) DO UPDATE
  SET category = EXCLUDED.category,
    seats = EXCLUDED.seats,
    doors = EXCLUDED.doors,
    updated_at = NOW();

INSERT INTO car_models (id, brand_id, name, category, seats, doors, created_at, updated_at)
SELECT gen_random_uuid(), b.id, 'Ranger Limited', 'pickup', 5, 4, NOW(), NOW()
FROM car_brands b
WHERE b.name = 'Ford'
ON CONFLICT (brand_id, name) DO UPDATE
  SET category = EXCLUDED.category,
    seats = EXCLUDED.seats,
    doors = EXCLUDED.doors,
    updated_at = NOW();

INSERT INTO car_models (id, brand_id, name, category, seats, doors, created_at, updated_at)
SELECT gen_random_uuid(), b.id, 'Kicks Advance', 'suv', 5, 4, NOW(), NOW()
FROM car_brands b
WHERE b.name = 'Nissan'
ON CONFLICT (brand_id, name) DO UPDATE
  SET category = EXCLUDED.category,
    seats = EXCLUDED.seats,
    doors = EXCLUDED.doors,
    updated_at = NOW();

-- 4. Autos demo (5 autos en activo)
INSERT INTO public.cars (
  id, owner_id, title, description, brand_id, brand_text_backup, model_id, model_text_backup,
  price_per_day, currency, city, province, country, location_lat, location_lng,
  status, cancel_policy, transmission, fuel, deposit_required, deposit_amount,
  delivery_options, payment_methods, features, max_rental_days, min_rental_days,
  mileage, doors, seats, year, color, plate, rating_avg, rating_count,
  has_owner_insurance, insurance_included, terms_and_conditions, created_at, updated_at
)
VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Chevrolet Camaro SS 2022',
    'Muscle car argentino listo para eventos, con servicio pick up/drop off y asientos calefaccionados.',
    (SELECT id FROM car_brands WHERE name = 'Chevrolet'), 'Chevrolet',
    (SELECT id FROM car_models WHERE name = 'Camaro SS' AND brand_id = (SELECT id FROM car_brands WHERE name = 'Chevrolet')),
    'Camaro SS', 18000, 'ARS', 'CABA', 'Buenos Aires', 'Argentina', -34.5971, -58.3633,
    'active', 'moderate', 'automatic', 'nafta', TRUE, 80000,
    '{"home_delivery": true, "airport_pickup": true}'::jsonb,
    '["card", "mercadopago"]'::jsonb,
    '["gps", "air_conditioning", "wireless_charger", "heated_seats"]'::jsonb,
    365, 1, 12000, 2, 4, 2022, 'Rojo', 'AAA1234', 4.95, 120,
    TRUE, TRUE, 'Devuelve con tanque lleno; se controla limpieza y kilometraje.', NOW(), NOW()),
  ('a1b2c3d4-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000002', 'Toyota Corolla Hybrid 2024',
    'Sedan hibrido con bateria cargada y asistencia al conductor; ideal para ejecutivos.',
    (SELECT id FROM car_brands WHERE name = 'Toyota'), 'Toyota',
    (SELECT id FROM car_models WHERE name = 'Corolla Hybrid' AND brand_id = (SELECT id FROM car_brands WHERE name = 'Toyota')),
    'Corolla Hybrid', 12500, 'ARS', 'CABA', 'Buenos Aires', 'Argentina', -34.6083, -58.3712,
    'active', 'flex', 'automatic', 'hibrido', TRUE, 60000,
    '{"home_delivery": true}'::jsonb,
    '["card", "debito" ]'::jsonb,
    '["adaptive_cruise_control", "lane_assist", "blind_spot_monitor"]'::jsonb,
    365, 1, 6000, 4, 5, 2024, 'Blanco', 'BBB2345', 4.88, 99,
    TRUE, TRUE, 'No se permiten derrapes; devolucion con tanque lleno.', NOW(), NOW()),
  ('a1b2c3d4-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000003', 'Volkswagen Tiguan Comfortline 2021',
    'SUV con traccion 4MOTION y techo panoramico, disponible para escapadas de fin de semana.',
    (SELECT id FROM car_brands WHERE name = 'Volkswagen'), 'Volkswagen',
    (SELECT id FROM car_models WHERE name = 'Tiguan Comfortline' AND brand_id = (SELECT id FROM car_brands WHERE name = 'Volkswagen')),
    'Tiguan Comfortline', 14000, 'ARS', 'Cordoba', 'Cordoba', 'Argentina', -31.4201, -64.1888,
    'active', 'moderate', 'automatic', 'nafta', TRUE, 70000,
    '{"pickup_point": "Nueva Cordoba"}'::jsonb,
    '["card", "mercadopago"]'::jsonb,
    '["gps", "park_sensors", "climatizacion_automatica"]'::jsonb,
    365, 1, 42000, 4, 5, 2021, 'Gris', 'CCC3456', 4.92, 210,
    TRUE, TRUE, 'Control de presion de neumaticos activo.', NOW(), NOW()),
  ('a1b2c3d4-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000004', 'Ford Ranger Limited 2020',
    'Pick-up con caja cubierta, preparada para traslados de materiales livianos en el Gran La Plata.',
    (SELECT id FROM car_brands WHERE name = 'Ford'), 'Ford',
    (SELECT id FROM car_models WHERE name = 'Ranger Limited' AND brand_id = (SELECT id FROM car_brands WHERE name = 'Ford')),
    'Ranger Limited', 16000, 'ARS', 'La Plata', 'Buenos Aires', 'Argentina', -34.9215, -57.9545,
    'active', 'strict', 'automatic', 'gasoil', TRUE, 90000,
    '{"airport_pickup": true}'::jsonb,
    '["card", "transferencia"]'::jsonb,
    '["remote_start", "capota", "caja_inteligente"]'::jsonb,
    365, 1, 65000, 4, 5, 2020, 'Azul', 'DDD4567', 4.81, 84,
    TRUE, TRUE, 'Retorno con caja vacia y tanque lleno.', NOW(), NOW()),
  ('a1b2c3d4-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000005', 'Nissan Kicks Advance 2024',
    'SUV compacto con interior premium y camara 360. Cobertura de Rosario y zona sur santafesina.',
    (SELECT id FROM car_brands WHERE name = 'Nissan'), 'Nissan',
    (SELECT id FROM car_models WHERE name = 'Kicks Advance' AND brand_id = (SELECT id FROM car_brands WHERE name = 'Nissan')),
    'Kicks Advance', 11000, 'ARS', 'Rosario', 'Santa Fe', 'Argentina', -32.9468, -60.6393,
    'active', 'flex', 'automatic', 'nafta', TRUE, 55000,
    '{"home_delivery": true, "contactless_pickup": true}'::jsonb,
    '["card", "mercadopago"]'::jsonb,
    '["sensor_frontal", "wireless_charger", "asientos_deportivos"]'::jsonb,
    365, 1, 21000, 4, 5, 2024, 'Negro', 'EEE5678', 4.87, 162,
    TRUE, TRUE, 'Se verifica estado del neumatico de auxilio al devolver.', NOW(), NOW())
ON CONFLICT (id) DO UPDATE
  SET owner_id = EXCLUDED.owner_id,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    brand_id = EXCLUDED.brand_id,
    brand_text_backup = EXCLUDED.brand_text_backup,
    model_id = EXCLUDED.model_id,
    model_text_backup = EXCLUDED.model_text_backup,
    price_per_day = EXCLUDED.price_per_day,
    currency = EXCLUDED.currency,
    city = EXCLUDED.city,
    province = EXCLUDED.province,
    country = EXCLUDED.country,
    location_lat = EXCLUDED.location_lat,
    location_lng = EXCLUDED.location_lng,
    status = EXCLUDED.status,
    cancel_policy = EXCLUDED.cancel_policy,
    transmission = EXCLUDED.transmission,
    fuel = EXCLUDED.fuel,
    deposit_required = EXCLUDED.deposit_required,
    deposit_amount = EXCLUDED.deposit_amount,
    delivery_options = EXCLUDED.delivery_options,
    payment_methods = EXCLUDED.payment_methods,
    features = EXCLUDED.features,
    max_rental_days = EXCLUDED.max_rental_days,
    min_rental_days = EXCLUDED.min_rental_days,
    mileage = EXCLUDED.mileage,
    doors = EXCLUDED.doors,
    seats = EXCLUDED.seats,
    year = EXCLUDED.year,
    color = EXCLUDED.color,
    plate = EXCLUDED.plate,
    rating_avg = EXCLUDED.rating_avg,
    rating_count = EXCLUDED.rating_count,
    has_owner_insurance = EXCLUDED.has_owner_insurance,
    insurance_included = EXCLUDED.insurance_included,
    terms_and_conditions = EXCLUDED.terms_and_conditions,
    updated_at = NOW();

-- 5. Galeria minima (2 fotos por auto)
INSERT INTO public.car_photos (id, car_id, stored_path, url, position, sort_order, is_cover, created_at)
VALUES
  (gen_random_uuid(), 'a1b2c3d4-0000-0000-0000-000000000001', 'cars/a1b2c3d4-0000-0000-0000-000000000001/cover.jpg',
    'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=1200&q=80', 0, 0, TRUE, NOW()),
  (gen_random_uuid(), 'a1b2c3d4-0000-0000-0000-000000000001', 'cars/a1b2c3d4-0000-0000-0000-000000000001/side.jpg',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80', 1, 1, FALSE, NOW()),
  (gen_random_uuid(), 'a1b2c3d4-0000-0000-0000-000000000002', 'cars/a1b2c3d4-0000-0000-0000-000000000002/cover.jpg',
    'https://images.unsplash.com/photo-1511910849309-4f63d3174426?auto=format&fit=crop&w=1200&q=80', 0, 0, TRUE, NOW()),
  (gen_random_uuid(), 'a1b2c3d4-0000-0000-0000-000000000002', 'cars/a1b2c3d4-0000-0000-0000-000000000002/side.jpg',
    'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1200&q=80', 1, 1, FALSE, NOW()),
  (gen_random_uuid(), 'a1b2c3d4-0000-0000-0000-000000000003', 'cars/a1b2c3d4-0000-0000-0000-000000000003/cover.jpg',
    'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80', 0, 0, TRUE, NOW()),
  (gen_random_uuid(), 'a1b2c3d4-0000-0000-0000-000000000003', 'cars/a1b2c3d4-0000-0000-0000-000000000003/side.jpg',
    'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80', 1, 1, FALSE, NOW()),
  (gen_random_uuid(), 'a1b2c3d4-0000-0000-0000-000000000004', 'cars/a1b2c3d4-0000-0000-0000-000000000004/cover.jpg',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80', 0, 0, TRUE, NOW()),
  (gen_random_uuid(), 'a1b2c3d4-0000-0000-0000-000000000004', 'cars/a1b2c3d4-0000-0000-0000-000000000004/side.jpg',
    'https://images.unsplash.com/photo-1469479533373-2457d45f8a47?auto=format&fit=crop&w=1200&q=80', 1, 1, FALSE, NOW()),
  (gen_random_uuid(), 'a1b2c3d4-0000-0000-0000-000000000005', 'cars/a1b2c3d4-0000-0000-0000-000000000005/cover.jpg',
    'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1200&q=80', 0, 0, TRUE, NOW()),
  (gen_random_uuid(), 'a1b2c3d4-0000-0000-0000-000000000005', 'cars/a1b2c3d4-0000-0000-0000-000000000005/side.jpg',
    'https://images.unsplash.com/photo-1516972810927-80185027ca84?auto=format&fit=crop&w=1200&q=80', 1, 1, FALSE, NOW())
ON CONFLICT (id) DO UPDATE
  SET url = EXCLUDED.url,
    stored_path = EXCLUDED.stored_path,
    sort_order = EXCLUDED.sort_order,
    position = EXCLUDED.position,
    is_cover = EXCLUDED.is_cover,
    created_at = EXCLUDED.created_at;

-- 6. Bookings para cubrir 2026/2027
INSERT INTO public.bookings (
  id, car_id, renter_id, start_at, end_at, status, total_amount, currency,
  created_at, updated_at, days_count, total_cents, subtotal_cents, nightly_rate_cents,
  rental_amount_cents, metadata, payment_method, platform_fee, owner_confirmation_at,
  owner_confirmed_delivery, pickup_location, renter_confirmed_payment
)
VALUES
  ('b1c2d3e4-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001',
    '22222222-0000-0000-0000-000000000001', '2026-01-01T09:00:00-03'::timestamptz,
    '2027-01-01T09:00:00-03'::timestamptz, 'confirmed', 6570000, 'ARS', NOW(), NOW(),
    365, 657000000, 657000000, 1800000, 657000000,
    '{"demo": "full_year", "owner": "Alejandro Fernandez"}'::jsonb, 'card', 0,
    NOW(), TRUE, '{"city": "Buenos Aires", "address": "Recoleta"}'::jsonb, TRUE),
  ('b1c2d3e4-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000002',
    '22222222-0000-0000-0000-000000000002', '2026-01-01T09:00:00-03'::timestamptz,
    '2027-01-01T09:00:00-03'::timestamptz, 'confirmed', 4562500, 'ARS', NOW(), NOW(),
    365, 456250000, 456250000, 1250000, 456250000,
    '{"demo": "full_year", "owner": "Camila Rodriguez"}'::jsonb, 'card', 0,
    NOW(), TRUE, '{"city": "Buenos Aires", "address": "Palermo"}'::jsonb, TRUE),
  ('b1c2d3e4-0000-0000-0000-000000000003', 'a1b2c3d4-0000-0000-0000-000000000003',
    '22222222-0000-0000-0000-000000000003', '2026-01-01T09:00:00-03'::timestamptz,
    '2027-01-01T09:00:00-03'::timestamptz, 'confirmed', 5110000, 'ARS', NOW(), NOW(),
    365, 511000000, 511000000, 1400000, 511000000,
    '{"demo": "full_year", "owner": "Santiago Martinez"}'::jsonb, 'card', 0,
    NOW(), TRUE, '{"city": "Cordoba", "address": "Nueva Cordoba"}'::jsonb, TRUE),
  ('b1c2d3e4-0000-0000-0000-000000000004', 'a1b2c3d4-0000-0000-0000-000000000004',
    '22222222-0000-0000-0000-000000000004', '2026-01-01T09:00:00-03'::timestamptz,
    '2027-01-01T09:00:00-03'::timestamptz, 'confirmed', 5840000, 'ARS', NOW(), NOW(),
    365, 584000000, 584000000, 1600000, 584000000,
    '{"demo": "full_year", "owner": "Valeria Castro"}'::jsonb, 'card', 0,
    NOW(), TRUE, '{"city": "La Plata", "address": "Calle 10"}'::jsonb, TRUE),
  ('b1c2d3e4-0000-0000-0000-000000000005', 'a1b2c3d4-0000-0000-0000-000000000005',
    '22222222-0000-0000-0000-000000000005', '2026-01-01T09:00:00-03'::timestamptz,
    '2027-01-01T09:00:00-03'::timestamptz, 'confirmed', 4015000, 'ARS', NOW(), NOW(),
    365, 401500000, 401500000, 1100000, 401500000,
    '{"demo": "full_year", "owner": "Luciano Alvarez"}'::jsonb, 'card', 0,
    NOW(), TRUE, '{"city": "Rosario", "address": "Paseo del Siglo"}'::jsonb, TRUE)
ON CONFLICT (id) DO UPDATE
  SET car_id = EXCLUDED.car_id,
    renter_id = EXCLUDED.renter_id,
    start_at = EXCLUDED.start_at,
    end_at = EXCLUDED.end_at,
    status = EXCLUDED.status,
    total_amount = EXCLUDED.total_amount,
    currency = EXCLUDED.currency,
    updated_at = NOW(),
    days_count = EXCLUDED.days_count,
    total_cents = EXCLUDED.total_cents,
    subtotal_cents = EXCLUDED.subtotal_cents,
    nightly_rate_cents = EXCLUDED.nightly_rate_cents,
    rental_amount_cents = EXCLUDED.rental_amount_cents,
    metadata = EXCLUDED.metadata,
    payment_method = EXCLUDED.payment_method,
    platform_fee = EXCLUDED.platform_fee,
    owner_confirmation_at = EXCLUDED.owner_confirmation_at,
    owner_confirmed_delivery = EXCLUDED.owner_confirmed_delivery,
    pickup_location = EXCLUDED.pickup_location,
    renter_confirmed_payment = EXCLUDED.renter_confirmed_payment;

COMMIT;

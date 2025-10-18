-- ============================================================================
-- SEED DATA: Most Common Cars in Latin America
-- ============================================================================
-- This script populates car_brands and car_models tables with the most
-- popular vehicles in Latin American markets (Argentina, Uruguay, Brazil, Chile)
-- ============================================================================

-- Check existing data
DO $$
BEGIN
  RAISE NOTICE 'Current car_brands count: %', (SELECT COUNT(*) FROM car_brands);
  RAISE NOTICE 'Current car_models count: %', (SELECT COUNT(*) FROM car_models);
END $$;

-- ============================================================================
-- STEP 1: Insert Popular Brands (if not exist)
-- ============================================================================

INSERT INTO car_brands (id, name, country, logo_url, created_at, updated_at)
VALUES
  -- Top 10 brands in Latin America
  (gen_random_uuid(), 'Chevrolet', 'USA', NULL, NOW(), NOW()),
  (gen_random_uuid(), 'Volkswagen', 'Germany', NULL, NOW(), NOW()),
  (gen_random_uuid(), 'Ford', 'USA', NULL, NOW(), NOW()),
  (gen_random_uuid(), 'Toyota', 'Japan', NULL, NOW(), NOW()),
  (gen_random_uuid(), 'Nissan', 'Japan', NULL, NOW(), NOW()),
  (gen_random_uuid(), 'Renault', 'France', NULL, NOW(), NOW()),
  (gen_random_uuid(), 'Fiat', 'Italy', NULL, NOW(), NOW()),
  (gen_random_uuid(), 'Hyundai', 'South Korea', NULL, NOW(), NOW()),
  (gen_random_uuid(), 'Peugeot', 'France', NULL, NOW(), NOW()),
  (gen_random_uuid(), 'Honda', 'Japan', NULL, NOW(), NOW())
ON CONFLICT (name) DO UPDATE
SET updated_at = NOW();

RAISE NOTICE 'Brands inserted/updated';

-- ============================================================================
-- STEP 2: Insert Popular Models
-- ============================================================================

-- CHEVROLET Models
INSERT INTO car_models (id, brand_id, name, category, seats, doors, created_at, updated_at)
SELECT
  gen_random_uuid(),
  (SELECT id FROM car_brands WHERE name = 'Chevrolet'),
  model_name,
  category,
  seats,
  doors,
  NOW(),
  NOW()
FROM (VALUES
  ('Onix', 'sedan', 5, 4),
  ('Prisma', 'sedan', 5, 4),
  ('Cruze', 'sedan', 5, 4),
  ('S10', 'pickup', 5, 4),
  ('Tracker', 'suv', 5, 4),
  ('Spin', 'minivan', 7, 4),
  ('Joy', 'sedan', 5, 4),
  ('Montana', 'pickup', 2, 2),
  ('Equinox', 'suv', 5, 4),
  ('Trailblazer', 'suv', 7, 4)
) AS models(model_name, category, seats, doors)
ON CONFLICT DO NOTHING;

-- VOLKSWAGEN Models
INSERT INTO car_models (id, brand_id, name, category, seats, doors, created_at, updated_at)
SELECT
  gen_random_uuid(),
  (SELECT id FROM car_brands WHERE name = 'Volkswagen'),
  model_name,
  category,
  seats,
  doors,
  NOW(),
  NOW()
FROM (VALUES
  ('Gol', 'hatchback', 5, 4),
  ('Polo', 'hatchback', 5, 4),
  ('Virtus', 'sedan', 5, 4),
  ('T-Cross', 'suv', 5, 4),
  ('Amarok', 'pickup', 5, 4),
  ('Saveiro', 'pickup', 2, 2),
  ('Taos', 'suv', 5, 4),
  ('Tiguan', 'suv', 5, 4),
  ('Nivus', 'suv', 5, 4),
  ('Voyage', 'sedan', 5, 4)
) AS models(model_name, category, seats, doors)
ON CONFLICT DO NOTHING;

-- FORD Models
INSERT INTO car_models (id, brand_id, name, category, seats, doors, created_at, updated_at)
SELECT
  gen_random_uuid(),
  (SELECT id FROM car_brands WHERE name = 'Ford'),
  model_name,
  category,
  seats,
  doors,
  NOW(),
  NOW()
FROM (VALUES
  ('Ka', 'hatchback', 5, 4),
  ('Fiesta', 'hatchback', 5, 4),
  ('Focus', 'sedan', 5, 4),
  ('Ranger', 'pickup', 5, 4),
  ('EcoSport', 'suv', 5, 4),
  ('Territory', 'suv', 5, 4),
  ('Bronco Sport', 'suv', 5, 4),
  ('Maverick', 'pickup', 5, 4),
  ('F-150', 'pickup', 5, 4),
  ('Mustang', 'coupe', 4, 2)
) AS models(model_name, category, seats, doors)
ON CONFLICT DO NOTHING;

-- TOYOTA Models
INSERT INTO car_models (id, brand_id, name, category, seats, doors, created_at, updated_at)
SELECT
  gen_random_uuid(),
  (SELECT id FROM car_brands WHERE name = 'Toyota'),
  model_name,
  category,
  seats,
  doors,
  NOW(),
  NOW()
FROM (VALUES
  ('Corolla', 'sedan', 5, 4),
  ('Hilux', 'pickup', 5, 4),
  ('Yaris', 'sedan', 5, 4),
  ('RAV4', 'suv', 5, 4),
  ('Etios', 'sedan', 5, 4),
  ('SW4', 'suv', 7, 4),
  ('Camry', 'sedan', 5, 4),
  ('Prius', 'sedan', 5, 4),
  ('C-HR', 'suv', 5, 4),
  ('Land Cruiser', 'suv', 7, 4)
) AS models(model_name, category, seats, doors)
ON CONFLICT DO NOTHING;

-- NISSAN Models
INSERT INTO car_models (id, brand_id, name, category, seats, doors, created_at, updated_at)
SELECT
  gen_random_uuid(),
  (SELECT id FROM car_brands WHERE name = 'Nissan'),
  model_name,
  category,
  seats,
  doors,
  NOW(),
  NOW()
FROM (VALUES
  ('Versa', 'sedan', 5, 4),
  ('Sentra', 'sedan', 5, 4),
  ('X-Trail', 'suv', 7, 4),
  ('March', 'hatchback', 5, 4),
  ('Kicks', 'suv', 5, 4),
  ('Frontier', 'pickup', 5, 4),
  ('Altima', 'sedan', 5, 4),
  ('Pathfinder', 'suv', 7, 4),
  ('Note', 'hatchback', 5, 4),
  ('Qashqai', 'suv', 5, 4)
) AS models(model_name, category, seats, doors)
ON CONFLICT DO NOTHING;

-- RENAULT Models
INSERT INTO car_models (id, brand_id, name, category, seats, doors, created_at, updated_at)
SELECT
  gen_random_uuid(),
  (SELECT id FROM car_brands WHERE name = 'Renault'),
  model_name,
  category,
  seats,
  doors,
  NOW(),
  NOW()
FROM (VALUES
  ('Sandero', 'hatchback', 5, 4),
  ('Logan', 'sedan', 5, 4),
  ('Duster', 'suv', 5, 4),
  ('Kwid', 'hatchback', 5, 4),
  ('Captur', 'suv', 5, 4),
  ('Kangoo', 'minivan', 5, 4),
  ('Stepway', 'hatchback', 5, 4),
  ('Alaskan', 'pickup', 5, 4),
  ('Koleos', 'suv', 5, 4),
  ('Oroch', 'pickup', 5, 4)
) AS models(model_name, category, seats, doors)
ON CONFLICT DO NOTHING;

-- FIAT Models
INSERT INTO car_models (id, brand_id, name, category, seats, doors, created_at, updated_at)
SELECT
  gen_random_uuid(),
  (SELECT id FROM car_brands WHERE name = 'Fiat'),
  model_name,
  category,
  seats,
  doors,
  NOW(),
  NOW()
FROM (VALUES
  ('Argo', 'hatchback', 5, 4),
  ('Cronos', 'sedan', 5, 4),
  ('Toro', 'pickup', 5, 4),
  ('Mobi', 'hatchback', 5, 4),
  ('Strada', 'pickup', 2, 2),
  ('Uno', 'hatchback', 5, 4),
  ('Pulse', 'suv', 5, 4),
  ('Fastback', 'suv', 5, 4),
  ('Ducato', 'van', 3, 4),
  ('500', 'hatchback', 4, 2)
) AS models(model_name, category, seats, doors)
ON CONFLICT DO NOTHING;

-- HYUNDAI Models
INSERT INTO car_models (id, brand_id, name, category, seats, doors, created_at, updated_at)
SELECT
  gen_random_uuid(),
  (SELECT id FROM car_brands WHERE name = 'Hyundai'),
  model_name,
  category,
  seats,
  doors,
  NOW(),
  NOW()
FROM (VALUES
  ('HB20', 'hatchback', 5, 4),
  ('Creta', 'suv', 5, 4),
  ('Tucson', 'suv', 5, 4),
  ('i30', 'hatchback', 5, 4),
  ('Santa Fe', 'suv', 7, 4),
  ('Accent', 'sedan', 5, 4),
  ('Elantra', 'sedan', 5, 4),
  ('Venue', 'suv', 5, 4),
  ('Palisade', 'suv', 8, 4),
  ('Kona', 'suv', 5, 4)
) AS models(model_name, category, seats, doors)
ON CONFLICT DO NOTHING;

-- PEUGEOT Models
INSERT INTO car_models (id, brand_id, name, category, seats, doors, created_at, updated_at)
SELECT
  gen_random_uuid(),
  (SELECT id FROM car_brands WHERE name = 'Peugeot'),
  model_name,
  category,
  seats,
  doors,
  NOW(),
  NOW()
FROM (VALUES
  ('208', 'hatchback', 5, 4),
  ('2008', 'suv', 5, 4),
  ('3008', 'suv', 5, 4),
  ('308', 'hatchback', 5, 4),
  ('Partner', 'van', 5, 4),
  ('Expert', 'van', 3, 4),
  ('5008', 'suv', 7, 4),
  ('Rifter', 'minivan', 7, 4),
  ('Landtrek', 'pickup', 5, 4),
  ('408', 'sedan', 5, 4)
) AS models(model_name, category, seats, doors)
ON CONFLICT DO NOTHING;

-- HONDA Models
INSERT INTO car_models (id, brand_id, name, category, seats, doors, created_at, updated_at)
SELECT
  gen_random_uuid(),
  (SELECT id FROM car_brands WHERE name = 'Honda'),
  model_name,
  category,
  seats,
  doors,
  NOW(),
  NOW()
FROM (VALUES
  ('Civic', 'sedan', 5, 4),
  ('City', 'sedan', 5, 4),
  ('HR-V', 'suv', 5, 4),
  ('Fit', 'hatchback', 5, 4),
  ('CR-V', 'suv', 5, 4),
  ('Accord', 'sedan', 5, 4),
  ('WR-V', 'suv', 5, 4),
  ('Ridgeline', 'pickup', 5, 4),
  ('Pilot', 'suv', 8, 4),
  ('Odyssey', 'minivan', 8, 4)
) AS models(model_name, category, seats, doors)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show results
DO $$
DECLARE
  brand_count INT;
  model_count INT;
  brand_name TEXT;
  models_per_brand INT;
BEGIN
  SELECT COUNT(*) INTO brand_count FROM car_brands;
  SELECT COUNT(*) INTO model_count FROM car_models;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SEED DATA COMPLETED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total Brands: %', brand_count;
  RAISE NOTICE 'Total Models: %', model_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Models per Brand:';
  RAISE NOTICE '----------------------------------------';

  FOR brand_name, models_per_brand IN
    SELECT cb.name, COUNT(cm.id)
    FROM car_brands cb
    LEFT JOIN car_models cm ON cb.id = cm.brand_id
    GROUP BY cb.name
    ORDER BY cb.name
  LOOP
    RAISE NOTICE '  % : % models', RPAD(brand_name, 15), models_per_brand;
  END LOOP;

  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- SEED DATA PARA AUTORENTA
-- Generado: 2025-11-15
-- Propósito: Poblar tablas críticas vacías con datos de ejemplo
-- ============================================

-- 1. CAR BRANDS (Marcas de autos)
INSERT INTO car_brands (id, name) VALUES
  (gen_random_uuid(), 'Toyota'),
  (gen_random_uuid(), 'Honda'),
  (gen_random_uuid(), 'Volkswagen'),
  (gen_random_uuid(), 'Chevrolet'),
  (gen_random_uuid(), 'Ford'),
  (gen_random_uuid(), 'Fiat'),
  (gen_random_uuid(), 'Renault'),
  (gen_random_uuid(), 'Peugeot')
ON CONFLICT DO NOTHING;

-- 2. CAR MODELS (Modelos por marca)
DO $$
DECLARE
  toyota_id UUID;
  honda_id UUID;
  vw_id UUID;
BEGIN
  SELECT id INTO toyota_id FROM car_brands WHERE name = 'Toyota' LIMIT 1;
  SELECT id INTO honda_id FROM car_brands WHERE name = 'Honda' LIMIT 1;
  SELECT id INTO vw_id FROM car_brands WHERE name = 'Volkswagen' LIMIT 1;
  
  INSERT INTO car_models (id, brand_id, name) VALUES
    (gen_random_uuid(), toyota_id, 'Corolla'),
    (gen_random_uuid(), toyota_id, 'Hilux'),
    (gen_random_uuid(), toyota_id, 'Etios'),
    (gen_random_uuid(), honda_id, 'Civic'),
    (gen_random_uuid(), honda_id, 'City'),
    (gen_random_uuid(), honda_id, 'HR-V'),
    (gen_random_uuid(), vw_id, 'Gol'),
    (gen_random_uuid(), vw_id, 'Polo'),
    (gen_random_uuid(), vw_id, 'T-Cross')
  ON CONFLICT DO NOTHING;
END $$;

-- 3. VEHICLE CATEGORIES (Categorías de vehículos)
INSERT INTO vehicle_categories (id, name, description, min_value_usd, max_value_usd) VALUES
  (gen_random_uuid(), 'Economy', 'Autos económicos ideales para ciudad', 0, 15000),
  (gen_random_uuid(), 'Compact', 'Autos compactos cómodos', 15000, 25000),
  (gen_random_uuid(), 'Sedan', 'Sedanes medianos', 25000, 40000),
  (gen_random_uuid(), 'SUV', 'SUV y camionetas', 40000, 80000),
  (gen_random_uuid(), 'Premium', 'Autos de lujo', 80000, 999999)
ON CONFLICT DO NOTHING;

-- 4. PLATFORM_CONFIG (Configuración de plataforma)
INSERT INTO platform_config (id, key, value, category, description) VALUES
  (gen_random_uuid(), 'platform_fee_percentage', '15', 'payments', 'Comisión de plataforma (%)'),
  (gen_random_uuid(), 'min_booking_days', '1', 'bookings', 'Mínimo días de reserva'),
  (gen_random_uuid(), 'max_booking_days', '30', 'bookings', 'Máximo días de reserva'),
  (gen_random_uuid(), 'cancellation_fee_percentage', '10', 'bookings', 'Penalidad por cancelación (%)'),
  (gen_random_uuid(), 'insurance_daily_rate_ars', '2500', 'insurance', 'Seguro diario en ARS'),
  (gen_random_uuid(), 'min_wallet_balance_ars', '5000', 'wallet', 'Saldo mínimo requerido ARS')
ON CONFLICT (key) DO NOTHING;

-- 5. FGO_PARAMETERS (Parámetros del Fondo de Garantía Operativa)
INSERT INTO fgo_parameters (id, country_code, bucket, tier, risk_percentage, created_at) VALUES
  (gen_random_uuid(), 'AR', 'economy', 'low', 5.0, NOW()),
  (gen_random_uuid(), 'AR', 'economy', 'medium', 7.5, NOW()),
  (gen_random_uuid(), 'AR', 'economy', 'high', 10.0, NOW()),
  (gen_random_uuid(), 'AR', 'compact', 'low', 6.0, NOW()),
  (gen_random_uuid(), 'AR', 'compact', 'medium', 8.5, NOW()),
  (gen_random_uuid(), 'AR', 'compact', 'high', 12.0, NOW()),
  (gen_random_uuid(), 'AR', 'sedan', 'low', 7.0, NOW()),
  (gen_random_uuid(), 'AR', 'sedan', 'medium', 10.0, NOW()),
  (gen_random_uuid(), 'AR', 'sedan', 'high', 15.0, NOW())
ON CONFLICT DO NOTHING;

-- 6. EXCHANGE_RATES (Tasas de cambio)
INSERT INTO exchange_rates (id, from_currency, to_currency, rate, source, created_at, updated_at) VALUES
  (gen_random_uuid(), 'USD', 'ARS', 875.50, 'binance', NOW(), NOW()),
  (gen_random_uuid(), 'USD', 'BRL', 4.95, 'binance', NOW(), NOW()),
  (gen_random_uuid(), 'ARS', 'BRL', 0.00565, 'binance', NOW(), NOW()),
  (gen_random_uuid(), 'BRL', 'ARS', 176.87, 'binance', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 7. PRICING_CLASS_FACTORS (Factores de precios por clase)
INSERT INTO pricing_class_factors (id, driver_class, risk_multiplier, bonus_discount_pct, created_at) VALUES
  (gen_random_uuid(), 'bronze', 1.0, 0, NOW()),
  (gen_random_uuid(), 'silver', 0.95, 5, NOW()),
  (gen_random_uuid(), 'gold', 0.90, 10, NOW()),
  (gen_random_uuid(), 'platinum', 0.85, 15, NOW()),
  (gen_random_uuid(), 'diamond', 0.80, 20, NOW())
ON CONFLICT DO NOTHING;

-- 8. ONBOARDING_PLAN_TEMPLATES (Templates de onboarding)
INSERT INTO onboarding_plan_templates (id, name, description, target_role, steps, created_at) VALUES
  (gen_random_uuid(), 'Renter Basic', 'Onboarding básico para locatarios', 'locatario', 
   '["verify_email", "add_payment_method", "complete_profile"]', NOW()),
  (gen_random_uuid(), 'Owner Complete', 'Onboarding completo para propietarios', 'locador',
   '["verify_email", "verify_id", "add_bank_account", "publish_first_car", "connect_calendar"]', NOW())
ON CONFLICT DO NOTHING;

-- ============================================
-- DATOS DE PRUEBA PARA DESARROLLO
-- ============================================

-- Nota: Para crear autos, pagos y reservas de prueba,
-- necesitarás usuarios autenticados en auth.users.
-- Estos datos se pueden crear desde la app después
-- de que un usuario se registre.

-- Ejemplo de como crear un auto de prueba (requiere user_id):
-- INSERT INTO cars (id, owner_id, title, brand, model, year, price_per_day, city, province, country, status)
-- VALUES (
--   gen_random_uuid(),
--   '<USER_ID_FROM_AUTH>',
--   'Toyota Corolla 2020 - Impecable',
--   'Toyota',
--   'Corolla',
--   2020,
--   15000,
--   'Buenos Aires',
--   'CABA',
--   'AR',
--   'active'
-- );

COMMIT;

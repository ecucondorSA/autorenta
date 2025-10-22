-- AutoRenta E2E Test Seed Data (Fixed for actual schema)
-- Este script solo crea profiles y wallets para usuarios que ya existen en auth.users

-- NOTA IMPORTANTE:
-- Los usuarios deben ser creados primero via Supabase Dashboard o API
-- Este script solo llena profiles y wallets

-- ============================================
-- CLEANUP FIRST (optional)
-- ============================================

DO $$
BEGIN
  -- Delete test profiles if they exist
  DELETE FROM profiles WHERE full_name LIKE 'E2E Test %';
  DELETE FROM user_wallets WHERE user_id IN (
    SELECT id FROM auth.users WHERE email LIKE '%@e2e.autorenta.test'
  );
END $$;

-- ============================================
-- RESUMEN DE EJECUCIÓN
-- ============================================

SELECT 'Seed script ejecutado - Usuarios de prueba deben crearse manualmente via Supabase Dashboard' AS status;
SELECT 'Para crear usuarios: Dashboard > Authentication > Add User' AS instruccion;
SELECT 'Emails sugeridos: renter.test@autorenta.com, owner.test@autorenta.com, admin.test@autorenta.com' AS emails;

-- ============================================
-- FUNCIÓN DE AYUDA
-- ============================================

-- Función para crear perfil y wallet para un usuario existente
CREATE OR REPLACE FUNCTION create_test_user_profile(
  p_user_id UUID,
  p_full_name TEXT,
  p_phone TEXT,
  p_role user_role,
  p_is_admin BOOLEAN DEFAULT FALSE,
  p_balance NUMERIC DEFAULT 50000.00
)
RETURNS void AS $$
BEGIN
  -- Insert profile
  INSERT INTO profiles (
    id,
    full_name,
    phone,
    role,
    is_admin,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_full_name,
    p_phone,
    p_role,
    p_is_admin,
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    is_admin = EXCLUDED.is_admin;

  -- Insert wallet
  INSERT INTO user_wallets (
    user_id,
    available_balance,
    locked_balance,
    currency,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_balance,
    0.00,
    'ARS',
    NOW(),
    NOW()
  ) ON CONFLICT (user_id) DO UPDATE SET
    available_balance = EXCLUDED.available_balance,
    locked_balance = 0.00;

  RAISE NOTICE 'Profile and wallet created for user: %', p_full_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- EJEMPLO DE USO
-- ============================================

/*
-- Primero, obtener el UUID del usuario desde auth.users:
SELECT id, email FROM auth.users WHERE email = 'renter.test@autorenta.com';

-- Luego, ejecutar la función con el UUID:
SELECT create_test_user_profile(
  'tu-user-uuid-aqui'::UUID,
  'Test Renter User',
  '+5491112345678',
  'renter'::user_role,
  FALSE,
  50000.00
);
*/

-- ============================================
-- MANUAL INSTRUCTIONS
-- ============================================

-- PASO 1: Crear usuarios en Supabase Dashboard
-- -------------------------------------------
-- 1. Ir a Dashboard > Authentication > Users > Add User
-- 2. Crear 3 usuarios:
--    - Email: renter.test@autorenta.com, Password: TestRenter123!
--    - Email: owner.test@autorenta.com, Password: TestOwner123!
--    - Email: admin.test@autorenta.com, Password: TestAdmin123!

-- PASO 2: Obtener UUIDs
-- ----------------------
-- SELECT id, email FROM auth.users WHERE email LIKE '%@autorenta.com';

-- PASO 3: Crear profiles y wallets
-- ---------------------------------
-- Reemplazar los UUIDs con los obtenidos en el paso anterior:

/*
SELECT create_test_user_profile(
  'UUID-RENTER'::UUID,
  'E2E Test Renter',
  '+5491112345678',
  'renter'::user_role,
  FALSE,
  50000.00
);

SELECT create_test_user_profile(
  'UUID-OWNER'::UUID,
  'E2E Test Owner',
  '+5491112345679',
  'owner'::user_role,
  FALSE,
  100000.00
);

SELECT create_test_user_profile(
  'UUID-ADMIN'::UUID,
  'E2E Test Admin',
  '+5491112345680',
  'both'::user_role,
  TRUE,
  200000.00
);
*/

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar profiles creados
-- SELECT * FROM profiles WHERE full_name LIKE 'E2E Test %';

-- Verificar wallets creados
-- SELECT w.*, p.full_name
-- FROM user_wallets w
-- JOIN profiles p ON w.user_id = p.id
-- WHERE p.full_name LIKE 'E2E Test %';

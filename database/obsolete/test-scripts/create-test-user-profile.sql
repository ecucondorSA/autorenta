-- Crear perfil para usuario de prueba
INSERT INTO profiles (
  id,
  full_name,
  role,
  currency
)
VALUES (
  '0f023c37-fbf3-4be2-8d1a-95cdc6043fc5'::uuid,
  'Usuario de Prueba E2E',
  'renter',
  'ARS'
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  currency = EXCLUDED.currency;

-- Verificar que se creó
SELECT id, full_name, role, currency, created_at
FROM profiles
WHERE id = '0f023c37-fbf3-4be2-8d1a-95cdc6043fc5';

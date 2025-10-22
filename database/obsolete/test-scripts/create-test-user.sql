-- ========================================
-- Script para crear usuario de prueba
-- ========================================
-- Para ejecutar en Supabase SQL Editor
-- ========================================

-- Primero, verificar si el usuario ya existe
SELECT id, email, raw_user_meta_data->>'full_name' as full_name
FROM auth.users
WHERE email = 'test@autorenta.com';

-- Si no existe, crear el usuario manualmente
-- NOTA: Este script debe ejecutarse con privilegios de service_role

-- 1. Insertar en auth.users (tabla de autenticación)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test@autorenta.com',
  -- Password hash para 'Test123456!'
  -- Generado con: crypt('Test123456!', gen_salt('bf'))
  crypt('Test123456!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Usuario de Prueba","default_currency":"ARS"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
)
ON CONFLICT (email) DO NOTHING
RETURNING id, email;

-- 2. Crear perfil automáticamente (debería crearse por trigger, pero por si acaso)
-- El trigger handle_new_user debería hacer esto automáticamente

-- Verificar que el perfil se creó correctamente
SELECT
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.phone,
  p.default_currency,
  p.created_at
FROM profiles p
WHERE p.email = 'test@autorenta.com';

-- 3. Opcional: Actualizar datos del perfil si es necesario
UPDATE profiles
SET
  role = 'locatario',  -- o 'locador', 'ambos'
  phone = '+54 9 11 1234-5678',
  default_currency = 'ARS'
WHERE email = 'test@autorenta.com';

-- 4. Verificación final: Usuario completo
SELECT
  au.id as auth_id,
  au.email,
  au.email_confirmed_at,
  au.created_at as auth_created_at,
  p.id as profile_id,
  p.full_name,
  p.role,
  p.phone,
  p.default_currency
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.email = 'test@autorenta.com';

-- ========================================
-- ALTERNATIVA: Crear via función RPC
-- ========================================
-- Si prefieres usar la función de signup de Supabase:
/*
SELECT extensions.http_post(
  'https://your-project.supabase.co/auth/v1/signup',
  '{
    "email": "test@autorenta.com",
    "password": "Test123456!",
    "data": {
      "full_name": "Usuario de Prueba",
      "default_currency": "ARS"
    }
  }'::jsonb,
  'application/json'
);
*/

-- ========================================
-- LIMPIEZA (si necesitas borrar el usuario)
-- ========================================
/*
-- ⚠️ CUIDADO: Esto borrará el usuario completamente
DELETE FROM profiles WHERE email = 'test@autorenta.com';
DELETE FROM auth.users WHERE email = 'test@autorenta.com';
*/

-- Crear usuario de prueba para E2E tests
-- Email: test-renter@autorenta.com
-- Password: TestPassword123!

-- Primero verificar si el usuario ya existe
DO $$
DECLARE
  user_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'test-renter@autorenta.com'
  ) INTO user_exists;
  
  IF NOT user_exists THEN
    -- Crear el usuario
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
      'test-renter@autorenta.com',
      crypt('TestPassword123!', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );
    
    RAISE NOTICE 'Usuario de prueba creado exitosamente';
  ELSE
    RAISE NOTICE 'Usuario de prueba ya existe';
  END IF;
END $$;

-- Verificar que se creó correctamente
SELECT 
  id,
  email,
  email_confirmed_at IS NOT NULL as email_confirmed,
  created_at
FROM auth.users 
WHERE email = 'test-renter@autorenta.com';

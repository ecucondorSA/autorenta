-- Activar usuario Google Reviewer (demo.renter@autorenta.com)
-- ID: dd02a513-cb1a-4fc4-b2fd-5c3bf88ba849

BEGIN;

-- 1. Actualizar perfil con permisos y verificaciones
UPDATE public.profiles
SET 
  kyc = 'verified',
  onboarding = 'complete',
  id_verified = true,
  email_verified = true,
  phone_verified = true,
  role = 'renter'
WHERE id = 'dd02a513-cb1a-4fc4-b2fd-5c3bf88ba849';

-- 2. Confirmar email en auth.users (requiere permisos de superusuario/postgres)
UPDATE auth.users
SET email_confirmed_at = now()
WHERE id = 'dd02a513-cb1a-4fc4-b2fd-5c3bf88ba849';

COMMIT;

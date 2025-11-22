# 👥 Test Users Setup Guide

## Overview

Configuración de usuarios de prueba en Supabase Auth para testing E2E y CI/CD.

## Pre-Requisitos

```bash
# PostgreSQL client
psql --version

# O acceso a Supabase Dashboard
# https://supabase.com/dashboard/project/obxvffplochgeiclibng/auth/users

# Credenciales de DB
export PGPASSWORD=ECUCONDOR08122023
export DB_URL="postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres"
```

## Test Users Requeridos

### 1. Test Renter (Locatario)
- **Email**: test-renter@autorenta.com
- **Password**: TestPassword123!
- **Role**: renter
- **Purpose**: Tests de búsqueda y reserva de autos

### 2. Test Owner (Locador)
- **Email**: test-owner@autorenta.com
- **Password**: TestPassword123!
- **Role**: owner
- **Purpose**: Tests de publicación de autos y gestión de reservas

## Método 1: Via Supabase Dashboard (Recomendado)

### Crear Test Renter

1. **Ir a Auth Users**
   - https://supabase.com/dashboard/project/obxvffplochgeiclibng/auth/users

2. **Add User**
   - Click "Add user" button
   - Email: `test-renter@autorenta.com`
   - Password: `TestPassword123!`
   - Auto Confirm: ✅ **YES** (importante para tests)
   - Click "Create user"

3. **Copiar User ID**
   - Anotar el UUID generado (ej: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

4. **Crear Perfil en public.users**
   - Dashboard → SQL Editor
   - Ejecutar:
```sql
INSERT INTO public.users (id, email, role, created_at, updated_at)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890', -- User ID del paso 3
  'test-renter@autorenta.com',
  'renter',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  updated_at = NOW();
```

### Crear Test Owner

Repetir los mismos pasos con:
- Email: `test-owner@autorenta.com`
- Password: `TestPassword123!`
- Role: `'owner'` (en SQL del paso 4)

## Método 2: Via SQL (Alternativo)

Si el Dashboard no está disponible:

```sql
-- Conectar a DB
psql "$DB_URL"

-- 1. Crear test renter en Auth
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  role,
  aud,
  created_at,
  updated_at,
  confirmation_token,
  email_change_token_new,
  recovery_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'test-renter@autorenta.com',
  crypt('TestPassword123!', gen_salt('bf')),
  NOW(),
  'authenticated',
  'authenticated',
  NOW(),
  NOW(),
  '',
  '',
  ''
)
ON CONFLICT (email) DO UPDATE SET
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = NOW()
RETURNING id;

-- 2. Copiar el ID retornado y crear perfil
INSERT INTO public.users (id, email, role, created_at, updated_at)
SELECT 
  id, 
  email, 
  'renter', 
  NOW(), 
  NOW()
FROM auth.users 
WHERE email = 'test-renter@autorenta.com'
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  updated_at = NOW();

-- 3. Repetir para test owner
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  role,
  aud,
  created_at,
  updated_at,
  confirmation_token,
  email_change_token_new,
  recovery_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'test-owner@autorenta.com',
  crypt('TestPassword123!', gen_salt('bf')),
  NOW(),
  'authenticated',
  'authenticated',
  NOW(),
  NOW(),
  '',
  '',
  ''
)
ON CONFLICT (email) DO UPDATE SET
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = NOW()
RETURNING id;

INSERT INTO public.users (id, email, role, created_at, updated_at)
SELECT 
  id, 
  email, 
  'owner', 
  NOW(), 
  NOW()
FROM auth.users 
WHERE email = 'test-owner@autorenta.com'
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  updated_at = NOW();
```

## Verificación

```sql
-- Verificar que usuarios existen en auth
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email LIKE 'test-%@autorenta.com'
ORDER BY email;

-- Verificar perfiles en public
SELECT 
  u.id,
  u.email,
  p.role,
  p.created_at
FROM auth.users u
JOIN public.users p ON p.id = u.id
WHERE u.email LIKE 'test-%@autorenta.com'
ORDER BY u.email;

-- Resultado esperado:
-- | id (UUID)      | email                     | role   |
-- |----------------|---------------------------|--------|
-- | xxx-xxx-xxx    | test-owner@autorenta.com  | owner  |
-- | yyy-yyy-yyy    | test-renter@autorenta.com | renter |
```

## Configuración en Tests

### Playwright Config

```typescript
// tests/fixtures/auth.setup.ts
export const TEST_USERS = {
  renter: {
    email: 'test-renter@autorenta.com',
    password: 'TestPassword123!',
  },
  owner: {
    email: 'test-owner@autorenta.com',
    password: 'TestPassword123!',
  },
};

// Usar en tests
import { TEST_USERS } from './fixtures/auth.setup';

test('renter can make booking', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', TEST_USERS.renter.email);
  await page.fill('[name="password"]', TEST_USERS.renter.password);
  await page.click('button[type="submit"]');
  // ... resto del test
});
```

### GitHub Actions

```yaml
# .github/workflows/e2e-tests.yml
env:
  TEST_RENTER_EMAIL: test-renter@autorenta.com
  TEST_RENTER_PASSWORD: ${{ secrets.TEST_RENTER_PASSWORD }}
  TEST_OWNER_EMAIL: test-owner@autorenta.com
  TEST_OWNER_PASSWORD: ${{ secrets.TEST_OWNER_PASSWORD }}
```

Configurar secrets:
```bash
gh secret set TEST_RENTER_PASSWORD -b"TestPassword123!"
gh secret set TEST_OWNER_PASSWORD -b"TestPassword123!"
```

## Crear Auto de Test para Test Owner

Para que los tests de booking funcionen, el test owner necesita un auto publicado:

```sql
-- 1. Obtener ID del test owner
WITH owner AS (
  SELECT id FROM auth.users WHERE email = 'test-owner@autorenta.com'
)

-- 2. Crear auto de test
INSERT INTO cars (
  owner_id,
  brand,
  model,
  year,
  status,
  daily_price,
  currency,
  location,
  address,
  city,
  country,
  created_at,
  updated_at
)
SELECT
  id as owner_id,
  'Toyota',
  'Corolla Test',
  2023,
  'active',
  15000.00,
  'ARS',
  ST_SetSRID(ST_MakePoint(-58.3816, -34.6037), 4326), -- Buenos Aires
  'Av. Corrientes 1234',
  'Buenos Aires',
  'Argentina',
  NOW(),
  NOW()
FROM owner
RETURNING id;

-- 3. Anotar el car_id para usar en tests
```

## Data Seeding para Tests

Script completo de setup de datos de prueba:

```sql
-- test-data-seed.sql
BEGIN;

-- Test renter booking preferences
INSERT INTO user_preferences (user_id, preferred_currency, notifications_enabled)
SELECT 
  id,
  'ARS',
  true
FROM auth.users
WHERE email = 'test-renter@autorenta.com'
ON CONFLICT (user_id) DO NOTHING;

-- Test owner wallet balance
INSERT INTO wallet_balances (user_id, balance, currency)
SELECT 
  id,
  0.00,
  'ARS'
FROM auth.users
WHERE email = 'test-owner@autorenta.com'
ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW();

COMMIT;
```

## Cleanup de Datos de Test

Para limpiar datos generados durante tests (NO borrar usuarios):

```sql
-- cleanup-test-data.sql
BEGIN;

-- Borrar reservas de test
DELETE FROM bookings
WHERE renter_id IN (
  SELECT id FROM auth.users WHERE email LIKE 'test-%@autorenta.com'
);

-- Borrar transacciones de wallet de test
DELETE FROM wallet_ledger
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE 'test-%@autorenta.com'
);

-- Resetear balance de wallet
UPDATE wallet_balances
SET balance = 0.00, updated_at = NOW()
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE 'test-%@autorenta.com'
);

-- Marcar autos de test como inactivos (no borrar)
UPDATE cars
SET status = 'inactive', updated_at = NOW()
WHERE owner_id IN (
  SELECT id FROM auth.users WHERE email = 'test-owner@autorenta.com'
)
AND model LIKE '%Test%';

COMMIT;
```

## Troubleshooting

### Error: Email already exists

```sql
-- Ver usuario existente
SELECT * FROM auth.users WHERE email = 'test-renter@autorenta.com';

-- Actualizar password
UPDATE auth.users
SET 
  encrypted_password = crypt('TestPassword123!', gen_salt('bf')),
  email_confirmed_at = NOW(),
  updated_at = NOW()
WHERE email = 'test-renter@autorenta.com';
```

### Error: Invalid login credentials

Verificar:
1. Email confirmed: `email_confirmed_at IS NOT NULL`
2. Password correcto (rehash si necesario)
3. User no está banned
4. RLS policies permiten el login

### Tests fallan con "User not found"

```sql
-- Verificar que perfil existe en public.users
SELECT * FROM public.users 
WHERE email = 'test-renter@autorenta.com';

-- Si no existe, crear:
INSERT INTO public.users (id, email, role, created_at)
SELECT id, email, 'renter', NOW()
FROM auth.users
WHERE email = 'test-renter@autorenta.com';
```

## Best Practices

### ✅ HACER
- Usar emails claramente identificados como test
- Auto-confirmar usuarios de test
- Mantener passwords simples pero válidos
- Documentar qué usuario usar para qué tests
- Cleanup periódico de data generada en tests

### ❌ EVITAR
- Usar usuarios reales para tests
- Hardcodear passwords en tests (usar env vars)
- Borrar usuarios de test (solo limpiar sus datos)
- Mezclar datos de test con producción
- Commits con passwords de test expuestos

## Monitoreo

```sql
-- Ver actividad de usuarios de test
SELECT 
  u.email,
  COUNT(b.id) as bookings_count,
  MAX(b.created_at) as last_booking
FROM auth.users u
LEFT JOIN bookings b ON b.renter_id = u.id
WHERE u.email LIKE 'test-%@autorenta.com'
GROUP BY u.email;
```

## Checklist Post-Setup

- [ ] Test renter existe en auth.users
- [ ] Test owner existe en auth.users
- [ ] Ambos tienen email_confirmed_at
- [ ] Perfiles en public.users creados
- [ ] Test owner tiene al menos 1 auto activo
- [ ] Passwords configurados en GitHub Secrets
- [ ] Tests de login pasan
- [ ] Documentado en tests/README.md

## Referencias

- [Supabase Auth Admin](https://supabase.com/docs/guides/auth/managing-user-data)
- [PostgreSQL crypt](https://www.postgresql.org/docs/current/pgcrypto.html)
- [Playwright Auth Setup](https://playwright.dev/docs/auth)

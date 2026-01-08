-- Seed Test Users for AutoRenta (Fixed for actual schema)
-- Run with pooler: psql 'postgres://postgres.pisqjmoklivzpwufhscx:Ab.12345@aws-1-sa-east-1.pooler.supabase.com:6543/postgres' -f seed_test_users.sql

-- 1. Create Renter User
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated', 'authenticated',
    'renter@autorenta.test',
    crypt('Ab.12345', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Gene Renter"}',
    now(), now()
)
ON CONFLICT (id) DO UPDATE SET
    encrypted_password = crypt('Ab.12345', gen_salt('bf')),
    email_confirmed_at = now();

-- 2. Create Owner User
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated', 'authenticated',
    'owner@autorenta.test',
    crypt('Ab.12345', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Oscar Owner"}',
    now(), now()
)
ON CONFLICT (id) DO UPDATE SET
    encrypted_password = crypt('Ab.12345', gen_salt('bf')),
    email_confirmed_at = now();

-- 3. Create Admin User
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
    'authenticated', 'authenticated',
    'admin@autorenta.test',
    crypt('Ab.12345', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Admin User"}',
    now(), now()
)
ON CONFLICT (id) DO UPDATE SET
    encrypted_password = crypt('Ab.12345', gen_salt('bf')),
    email_confirmed_at = now();

-- 4. Create identities (required for email login)
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
VALUES
    ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
     '{"sub":"11111111-1111-1111-1111-111111111111","email":"renter@autorenta.test","email_verified":true}',
     'email', 'renter@autorenta.test', now(), now(), now()),
    ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
     '{"sub":"22222222-2222-2222-2222-222222222222","email":"owner@autorenta.test","email_verified":true}',
     'email', 'owner@autorenta.test', now(), now(), now()),
    ('33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333',
     '{"sub":"33333333-3333-3333-3333-333333333333","email":"admin@autorenta.test","email_verified":true}',
     'email', 'admin@autorenta.test', now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- 5. Update Profiles with real schema columns
UPDATE public.profiles SET
    full_name = 'Gene Renter',
    role = 'locatario',
    phone = '+5491111111111',
    phone_verified = true,
    id_verified = true,
    license_verified = true,
    kyc_level = 3,
    mercadopago_connected = true,
    mp_onboarding_completed = true
WHERE id = '11111111-1111-1111-1111-111111111111';

UPDATE public.profiles SET
    full_name = 'Oscar Owner',
    role = 'locador',
    phone = '+5491122222222',
    phone_verified = true,
    id_verified = true,
    license_verified = true,
    kyc_level = 3,
    mercadopago_connected = true,
    mp_onboarding_completed = true
WHERE id = '22222222-2222-2222-2222-222222222222';

UPDATE public.profiles SET
    full_name = 'Admin User',
    role = 'admin',
    phone = '+5491133333333',
    phone_verified = true,
    id_verified = true,
    license_verified = true,
    kyc_level = 3,
    mercadopago_connected = true,
    mp_onboarding_completed = true,
    is_admin = true
WHERE id = '33333333-3333-3333-3333-333333333333';

-- 6. Add Admin to admin_users table
INSERT INTO public.admin_users (user_id, role)
VALUES ('33333333-3333-3333-3333-333333333333', 'super_admin')
ON CONFLICT DO NOTHING;

-- 7. Create test car for Owner
INSERT INTO public.cars (id, owner_id, brand, model, year, price_per_day, city, status)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222',
        'Toyota', 'Corolla Hybrid', 2024, 4500000, 'Buenos Aires', 'active')
ON CONFLICT (id) DO NOTHING;

SELECT '✅ Test accounts created!' as result;

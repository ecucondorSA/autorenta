-- Create Super Admin Account for admin@autorentar.com
-- This migration grants full admin privileges to the specified user
-- Can be run multiple times safely (idempotent)

DO $$
DECLARE
    v_user_id UUID;
    v_user_exists BOOLEAN;
BEGIN
    -- Check if user exists in auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = 'admin@autorentar.com';

    IF v_user_id IS NULL THEN
        -- Create user with Supabase Auth
        -- Note: Password should be changed after first login
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_user_meta_data,
            raw_app_meta_data,
            created_at,
            updated_at,
            role,
            aud,
            confirmation_token
        ) VALUES (
            gen_random_uuid(),
            '00000000-0000-0000-0000-000000000000',
            'admin@autorentar.com',
            crypt('Admin2026!Temp', gen_salt('bf')),  -- Temporary password - CHANGE IMMEDIATELY
            now(),
            '{"full_name": "Super Administrador"}'::jsonb,
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            now(),
            now(),
            'authenticated',
            'authenticated',
            encode(gen_random_bytes(32), 'hex')
        )
        RETURNING id INTO v_user_id;

        RAISE NOTICE 'Created new user with ID: %', v_user_id;
    ELSE
        RAISE NOTICE 'User already exists with ID: %', v_user_id;
    END IF;

    -- Create or update profile
    INSERT INTO public.profiles (id, full_name, is_admin, role)
    VALUES (v_user_id, 'Super Administrador', true, 'ambos')
    ON CONFLICT (id) DO UPDATE
    SET is_admin = true,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

    RAISE NOTICE 'Profile updated with is_admin = true';

    -- Grant super_admin role (if not already granted)
    INSERT INTO admin_users (user_id, role, granted_by, notes)
    VALUES (v_user_id, 'super_admin', v_user_id, 'Initial super admin setup via migration')
    ON CONFLICT (user_id, role) DO UPDATE
    SET revoked_at = NULL,  -- Reactivate if previously revoked
        notes = 'Reactivated via migration on ' || now()::text
    WHERE admin_users.revoked_at IS NOT NULL;

    RAISE NOTICE 'Super admin role granted successfully';

    -- Log the action
    PERFORM log_admin_action(
        v_user_id,
        'GRANT_ADMIN_ROLE',
        'admin_users',
        v_user_id::text,
        jsonb_build_object(
            'role', 'super_admin',
            'method', 'migration',
            'timestamp', now()
        ),
        NULL,
        'Migration Script'
    );

    RAISE NOTICE '✅ Super Admin account created successfully!';
    RAISE NOTICE '   Email: admin@autorentar.com';
    RAISE NOTICE '   Temporary Password: Admin2026!Temp';
    RAISE NOTICE '   ⚠️  IMPORTANT: Change password immediately after first login!';
END $$;

-- Summary output
SELECT
    u.email,
    p.full_name,
    p.is_admin,
    array_agg(DISTINCT au.role) as admin_roles
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
LEFT JOIN admin_users au ON au.user_id = u.id AND au.revoked_at IS NULL
WHERE u.email = 'admin@autorentar.com'
GROUP BY u.email, p.full_name, p.is_admin;

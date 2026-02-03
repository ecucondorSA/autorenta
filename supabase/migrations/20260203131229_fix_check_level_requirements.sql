-- ============================================================================
-- FIX: check_level_requirements must check auth.users.email_confirmed_at
-- Date: 2026-02-03
-- Issue: RPC only checked profiles.email_verified, missing auth.users source
-- Impact: Users with verified email couldn't book/publish (both flows blocked)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_level_requirements(p_required_level INTEGER DEFAULT 1)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_auth_user RECORD;
    v_profile RECORD;
    v_identity_level RECORD;
    v_current_level INTEGER;
    v_email_verified BOOLEAN;
    v_phone_verified BOOLEAN;
    v_id_verified BOOLEAN;
    v_license_verified BOOLEAN;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RETURN json_build_object(
            'allowed', false,
            'current_level', 0,
            'required_level', p_required_level,
            'error', 'Usuario no autenticado'
        );
    END IF;

    -- Get auth.users data (primary source of truth for email/phone)
    SELECT email_confirmed_at, phone_confirmed_at
    INTO v_auth_user
    FROM auth.users
    WHERE id = v_user_id;

    -- Get profile verification status (secondary source)
    SELECT
        COALESCE(email_verified, false),
        COALESCE(phone_verified, false),
        COALESCE(id_verified, false)
    INTO v_email_verified, v_phone_verified, v_id_verified
    FROM public.profiles
    WHERE id = v_user_id;

    -- Get identity level data (tertiary source for Level 2+)
    SELECT email_verified_at, phone_verified_at, driver_license_verified_at
    INTO v_identity_level
    FROM public.user_identity_levels
    WHERE user_id = v_user_id;

    -- ========================================================================
    -- CRITICAL FIX: Check ALL sources for email/phone verification
    -- Priority: auth.users > profiles > user_identity_levels
    -- ========================================================================

    -- Email verified if ANY source confirms it
    v_email_verified := COALESCE(v_email_verified, false)
                        OR v_auth_user.email_confirmed_at IS NOT NULL
                        OR v_identity_level.email_verified_at IS NOT NULL;

    -- Phone verified if ANY source confirms it
    v_phone_verified := COALESCE(v_phone_verified, false)
                        OR v_auth_user.phone_confirmed_at IS NOT NULL
                        OR v_identity_level.phone_verified_at IS NOT NULL;

    -- License verified from identity levels
    v_license_verified := v_identity_level.driver_license_verified_at IS NOT NULL;

    -- ========================================================================
    -- Calculate current level
    -- Level 1: Email OR Phone verified (basic identity)
    -- Level 2: Level 1 + ID verified + License verified
    -- Level 3: Level 2 + Biometric (future)
    -- ========================================================================
    v_current_level := 0;

    IF v_email_verified OR v_phone_verified THEN
        v_current_level := 1;
    END IF;

    IF v_current_level >= 1 AND v_id_verified AND v_license_verified THEN
        v_current_level := 2;
    END IF;

    RETURN json_build_object(
        'allowed', v_current_level >= p_required_level,
        'current_level', v_current_level,
        'required_level', p_required_level,
        'email_verified', v_email_verified,
        'phone_verified', v_phone_verified,
        'id_verified', v_id_verified,
        'license_verified', v_license_verified,
        'message', CASE
            WHEN v_current_level >= p_required_level THEN 'Access granted'
            ELSE 'Verification level ' || p_required_level || ' required'
        END,
        'upgrade_url', CASE
            WHEN v_current_level < p_required_level THEN '/profile/verification'
            ELSE null
        END
    );
END;
$$;

-- Ensure permissions
GRANT EXECUTE ON FUNCTION public.check_level_requirements(INTEGER) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.check_level_requirements IS
'Checks if user meets required verification level. Level 1 = Email OR Phone. Level 2 = Level 1 + ID + License.';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

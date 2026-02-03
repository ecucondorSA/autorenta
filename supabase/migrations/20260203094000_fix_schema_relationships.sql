-- ============================================================================
-- FIX: Schema relationships and missing columns
-- Date: 2026-02-03
-- ============================================================================

-- ============================================================================
-- 1. Add missing columns to user_verifications
-- ============================================================================
ALTER TABLE public.user_verifications ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE public.user_verifications ADD COLUMN IF NOT EXISTS missing_docs TEXT[];
ALTER TABLE public.user_verifications ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================================
-- 2. Create foreign key from cars.owner_id to profiles.id
-- This enables PostgREST to do automatic JOINs like owner:profiles!cars_owner_id_fkey
-- ============================================================================

-- First check if profiles table exists and has id column
DO $$
BEGIN
    -- Add FK only if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'cars_owner_id_profiles_fkey'
        AND table_name = 'cars'
    ) THEN
        ALTER TABLE public.cars
        ADD CONSTRAINT cars_owner_id_profiles_fkey
        FOREIGN KEY (owner_id) REFERENCES public.profiles(id);
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not create FK cars_owner_id_profiles_fkey: %', SQLERRM;
END $$;

-- ============================================================================
-- 3. Create check_level_requirements RPC
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
    v_profile RECORD;
    v_current_level INTEGER;
    v_email_verified BOOLEAN;
    v_phone_verified BOOLEAN;
    v_id_verified BOOLEAN;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RETURN json_build_object(
            'allowed', false,
            'current_level', 0,
            'required_level', p_required_level,
            'reason', 'Usuario no autenticado'
        );
    END IF;

    -- Get profile verification status
    SELECT
        COALESCE(email_verified, false),
        COALESCE(phone_verified, false),
        COALESCE(id_verified, false)
    INTO v_email_verified, v_phone_verified, v_id_verified
    FROM public.profiles
    WHERE id = v_user_id;

    -- Calculate current level
    v_current_level := 0;
    IF v_email_verified OR v_phone_verified THEN
        v_current_level := 1;
    END IF;
    IF v_id_verified THEN
        v_current_level := 2;
    END IF;

    RETURN json_build_object(
        'allowed', v_current_level >= p_required_level,
        'current_level', v_current_level,
        'required_level', p_required_level,
        'email_verified', v_email_verified,
        'phone_verified', v_phone_verified,
        'id_verified', v_id_verified
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_level_requirements(INTEGER) TO authenticated;

-- ============================================================================
-- 4. Add rating_count to profiles if missing (for owner badge)
-- ============================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

-- ============================================================================
-- Notify PostgREST
-- ============================================================================
NOTIFY pgrst, 'reload schema';

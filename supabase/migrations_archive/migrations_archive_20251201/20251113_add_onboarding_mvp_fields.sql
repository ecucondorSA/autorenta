-- ============================================
-- MIGRATION: MVP Onboarding - Add primary_goal field
-- Date: 2025-11-13
-- Purpose: Track user's initial goal for personalized onboarding
-- ============================================

-- ============================================
-- 1. ADD primary_goal COLUMN TO profiles
-- ============================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS primary_goal TEXT
CHECK (primary_goal IN ('publish', 'rent', 'both'));

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_primary_goal
ON profiles(primary_goal)
WHERE primary_goal IS NOT NULL;

COMMENT ON COLUMN profiles.primary_goal IS 'Usuario inicial goal: publish (publicar auto), rent (alquilar auto), both (ambos)';

-- ============================================
-- 2. RPC: Set Primary Goal
-- ============================================

CREATE OR REPLACE FUNCTION set_primary_goal(p_goal TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_result JSON;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Usuario no autenticado'
    );
  END IF;

  -- Validate goal
  IF p_goal NOT IN ('publish', 'rent', 'both') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Goal inválido. Debe ser: publish, rent o both'
    );
  END IF;

  -- Update profile
  UPDATE profiles
  SET
    primary_goal = p_goal,
    updated_at = NOW()
  WHERE id = v_user_id;

  IF FOUND THEN
    v_result := json_build_object(
      'success', true,
      'message', 'Primary goal guardado exitosamente',
      'goal', p_goal
    );
  ELSE
    v_result := json_build_object(
      'success', false,
      'error', 'No se pudo actualizar el perfil'
    );
  END IF;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION set_primary_goal IS 'Guarda el objetivo principal del usuario (publish, rent, both)';

-- Grant permissions
GRANT EXECUTE ON FUNCTION set_primary_goal TO authenticated;

-- ============================================
-- 3. RPC: Get Onboarding Status (Hardcoded Logic)
-- ============================================

CREATE OR REPLACE FUNCTION get_onboarding_status()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_profile RECORD;
  v_has_cars BOOLEAN;
  v_has_bookings BOOLEAN;
  v_result JSON;
  v_locador_steps JSON;
  v_locatario_steps JSON;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Usuario no autenticado');
  END IF;

  -- Get profile data
  SELECT
    p.*,
    EXISTS(SELECT 1 FROM cars WHERE owner_id = p.id) as has_cars,
    EXISTS(SELECT 1 FROM bookings WHERE renter_id = p.id) as has_bookings
  INTO v_profile
  FROM profiles p
  WHERE p.id = v_user_id;

  -- Build locador checklist
  v_locador_steps := json_build_array(
    json_build_object(
      'key', 'profile_basic',
      'title', 'Completar perfil básico',
      'completed', (v_profile.full_name IS NOT NULL AND v_profile.phone IS NOT NULL),
      'action', '/profile'
    ),
    json_build_object(
      'key', 'mp_onboarding',
      'title', 'Vincular MercadoPago',
      'completed', COALESCE(v_profile.mp_onboarding_completed, false),
      'action', '/profile?connect_mp=true'
    ),
    json_build_object(
      'key', 'publish_car',
      'title', 'Publicar primer auto',
      'completed', v_profile.has_cars,
      'action', '/cars/publish'
    )
  );

  -- Build locatario checklist
  v_locatario_steps := json_build_array(
    json_build_object(
      'key', 'profile_basic',
      'title', 'Completar perfil básico',
      'completed', (v_profile.full_name IS NOT NULL AND v_profile.phone IS NOT NULL),
      'action', '/profile'
    ),
    json_build_object(
      'key', 'first_search',
      'title', 'Buscar autos disponibles',
      'completed', false,
      'action', '/marketplace'
    ),
    json_build_object(
      'key', 'first_booking',
      'title', 'Hacer primera reserva',
      'completed', v_profile.has_bookings,
      'action', '/marketplace'
    )
  );

  -- Build result based on role and primary_goal
  v_result := json_build_object(
    'userId', v_user_id,
    'role', v_profile.role,
    'primaryGoal', v_profile.primary_goal,
    'showInitialModal', (v_profile.primary_goal IS NULL),
    'onboardingStatus', v_profile.onboarding,
    'locadorSteps', v_locador_steps,
    'locatarioSteps', v_locatario_steps,
    'activeChecklist', CASE
      WHEN v_profile.primary_goal = 'publish' THEN 'locador'
      WHEN v_profile.primary_goal = 'rent' THEN 'locatario'
      WHEN v_profile.primary_goal = 'both' THEN 'both'
      ELSE NULL
    END
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_onboarding_status IS 'Obtiene estado del onboarding MVP (hardcoded checklist)';

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_onboarding_status TO authenticated;

-- ============================================
-- 4. MIGRATION DATA: Mark existing users as completed
-- ============================================

-- For existing users with cars, assume they chose 'publish'
UPDATE profiles
SET primary_goal = 'publish'
WHERE id IN (SELECT DISTINCT owner_id FROM cars)
AND primary_goal IS NULL;

-- For existing users with bookings but no cars, assume they chose 'rent'
UPDATE profiles
SET primary_goal = 'rent'
WHERE id IN (SELECT DISTINCT renter_id FROM bookings)
AND primary_goal IS NULL
AND id NOT IN (SELECT DISTINCT owner_id FROM cars);

-- ============================================
-- 5. VERIFICATION QUERIES
-- ============================================

-- Check distribution of primary_goal
SELECT
  primary_goal,
  COUNT(*) as count
FROM profiles
GROUP BY primary_goal
ORDER BY count DESC;

-- ============================================
-- END OF MIGRATION
-- ============================================

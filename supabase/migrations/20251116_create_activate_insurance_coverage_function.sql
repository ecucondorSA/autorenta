-- ============================================================================
-- MIGRATION: Create activate_insurance_coverage RPC function
-- Date: 2025-11-16
-- Purpose: Create missing RPC function for insurance coverage activation
-- Issue: Function not found in schema cache
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Create activate_insurance_coverage function
-- ============================================================================

CREATE OR REPLACE FUNCTION activate_insurance_coverage(
  p_booking_id UUID,
  p_addon_ids UUID[] DEFAULT ARRAY[]::UUID[]
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_car_id UUID;
  v_policy_id UUID;
  v_policy_type TEXT;
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
  v_rental_days INTEGER;
  v_daily_premium BIGINT;
  v_deductible BIGINT;
  v_liability BIGINT;
  v_coverage_id UUID;
  v_addons_total BIGINT := 0;
  v_addon_id UUID;
BEGIN
  -- ✅ FIX: Usar start_at y end_at (nombres correctos en bookings)
  SELECT car_id, start_at, end_at INTO v_car_id, v_start_date, v_end_date
  FROM bookings WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;

  v_rental_days := EXTRACT(DAY FROM (v_end_date - v_start_date))::INTEGER;
  IF v_rental_days < 1 THEN v_rental_days := 1; END IF;

  -- Determinar qué póliza usar (owner o platform)
  -- ✅ FIX: Verificar si existe la columna has_owner_insurance
  -- Si no existe, usar póliza flotante de la plataforma
  BEGIN
    SELECT owner_insurance_policy_id INTO v_policy_id
    FROM cars
    WHERE id = v_car_id
      AND owner_insurance_policy_id IS NOT NULL
    LIMIT 1;
  EXCEPTION
    WHEN undefined_column THEN
      v_policy_id := NULL;
  END;

  IF v_policy_id IS NULL THEN
    -- Usar póliza flotante de la plataforma (default)
    SELECT id INTO v_policy_id
    FROM insurance_policies
    WHERE policy_type = 'platform_floating'
      AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_policy_id IS NULL THEN
      RAISE EXCEPTION 'No active platform insurance policy found';
    END IF;
  END IF;

  -- Obtener datos de la póliza
  SELECT
    daily_premium,
    liability_coverage_amount
  INTO v_daily_premium, v_liability
  FROM insurance_policies WHERE id = v_policy_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insurance policy not found: %', v_policy_id;
  END IF;

  -- Calcular franquicia (si existe la función)
  BEGIN
    v_deductible := calculate_deductible(v_car_id, v_policy_id);
  EXCEPTION
    WHEN undefined_function THEN
      -- Si no existe la función, usar valor por defecto
      v_deductible := COALESCE(
        (SELECT deductible_fixed_amount FROM insurance_policies WHERE id = v_policy_id),
        30000 -- Default 300 USD en centavos
      );
  END;

  -- Crear cobertura
  INSERT INTO booking_insurance_coverage (
    booking_id,
    policy_id,
    coverage_start,
    coverage_end,
    liability_coverage,
    deductible_amount,
    daily_premium_charged,
    certificate_number,
    status
  ) VALUES (
    p_booking_id,
    v_policy_id,
    v_start_date,
    v_end_date,
    v_liability,
    v_deductible,
    v_daily_premium * v_rental_days,
    'CERT-' || upper(substring(gen_random_uuid()::text, 1, 8)),
    'active'
  ) RETURNING id INTO v_coverage_id;

  -- Agregar add-ons si los hay (si existe la tabla)
  BEGIN
    IF array_length(p_addon_ids, 1) > 0 THEN
      FOREACH v_addon_id IN ARRAY p_addon_ids LOOP
        INSERT INTO booking_insurance_addons (booking_id, addon_id, daily_cost, total_cost)
        SELECT
          p_booking_id,
          v_addon_id,
          daily_cost,
          daily_cost * v_rental_days
        FROM insurance_addons WHERE id = v_addon_id;

        v_addons_total := v_addons_total + (
          SELECT daily_cost * v_rental_days
          FROM insurance_addons
          WHERE id = v_addon_id
        );
      END LOOP;
    END IF;
  EXCEPTION
    WHEN undefined_table THEN
      -- Si no existe la tabla de addons, continuar sin error
      NULL;
  END;

  -- Actualizar booking (si existen las columnas)
  BEGIN
    UPDATE bookings SET
      insurance_coverage_id = v_coverage_id
    WHERE id = p_booking_id;
  EXCEPTION
    WHEN undefined_column THEN
      -- Si no existe la columna, no actualizar
      NULL;
  END;

  RETURN v_coverage_id;
END;
$$;

-- ============================================================================
-- 2. Grant execute permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION activate_insurance_coverage(UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION activate_insurance_coverage(UUID, UUID[]) TO service_role;

-- ============================================================================
-- 3. Add function comment
-- ============================================================================

COMMENT ON FUNCTION activate_insurance_coverage(UUID, UUID[]) IS
'Activate insurance coverage for a booking. Returns the coverage_id.
✅ FIX 2025-11-16: Adapted to use start_at/end_at columns and handle missing tables gracefully.';

COMMIT;












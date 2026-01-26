-- ============================================================================
-- DRIVER LICENSE & VEHICLE DOCUMENT VERIFICATION
-- Extends progressive verification system with:
-- 1. Driver's license validation (for renters/locatarios)
-- 2. Vehicle ownership documents (for owners/locadores)
-- ============================================================================

BEGIN;

-- ============================================================================
-- EXTEND: user_identity_levels
-- Add driver's license fields
-- ============================================================================

ALTER TABLE public.user_identity_levels
  -- Driver's License (required for Level 2 as RENTER)
  ADD COLUMN driver_license_url TEXT,
  ADD COLUMN driver_license_number TEXT,
  ADD COLUMN driver_license_category TEXT, -- A, B, C, D, E, etc.
  ADD COLUMN driver_license_expiry DATE,
  ADD COLUMN driver_license_country TEXT DEFAULT 'AR', -- AR, UY, BR, etc.
  ADD COLUMN driver_license_verified_at TIMESTAMPTZ,
  ADD COLUMN driver_license_ai_score NUMERIC(5,2) CHECK (driver_license_ai_score >= 0 AND driver_license_ai_score <= 100),
  ADD COLUMN driver_license_ai_metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.user_identity_levels.driver_license_category IS 'License category: A, B, C, D, E (Argentina/Mercosur)';
COMMENT ON COLUMN public.user_identity_levels.driver_license_expiry IS 'License expiration date - blocks new bookings if expired';
COMMENT ON COLUMN public.user_identity_levels.driver_license_country IS 'License country code: AR, UY, BR, PY, CL (Mercosur valid)';

-- ============================================================================
-- NEW TABLE: vehicle_documents
-- Stores ownership and authorization documents per vehicle
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.vehicle_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Ownership status
  is_owner BOOLEAN NOT NULL DEFAULT true,

  -- Cédula Verde (ownership document)
  green_card_url TEXT, -- Photo of cédula verde
  green_card_owner_name TEXT,
  green_card_vehicle_domain TEXT, -- Patente
  green_card_verified_at TIMESTAMPTZ,
  green_card_ai_score NUMERIC(5,2) CHECK (green_card_ai_score >= 0 AND green_card_ai_score <= 100),
  green_card_ai_metadata JSONB DEFAULT '{}'::jsonb,

  -- Cédula Azul (authorization for non-owners)
  blue_card_url TEXT, -- Photo of cédula azul or notarial authorization
  blue_card_authorized_name TEXT,
  blue_card_verified_at TIMESTAMPTZ,
  blue_card_ai_score NUMERIC(5,2) CHECK (blue_card_ai_score >= 0 AND blue_card_ai_score <= 100),
  blue_card_ai_metadata JSONB DEFAULT '{}'::jsonb,

  -- VTV (Technical Vehicle Verification)
  vtv_url TEXT,
  vtv_expiry DATE,
  vtv_verified_at TIMESTAMPTZ,

  -- Insurance
  insurance_url TEXT,
  insurance_expiry DATE,
  insurance_company TEXT,
  insurance_policy_number TEXT,
  insurance_verified_at TIMESTAMPTZ,

  -- Manual review
  manual_review_required BOOLEAN DEFAULT false,
  manual_reviewed_by UUID REFERENCES public.profiles(id),
  manual_reviewed_at TIMESTAMPTZ,
  manual_review_notes TEXT,
  manual_review_decision TEXT CHECK (manual_review_decision IN ('APPROVED', 'REJECTED', 'PENDING')),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT vehicle_documents_ownership_check CHECK (
    (is_owner = true AND green_card_url IS NOT NULL) OR
    (is_owner = false AND blue_card_url IS NOT NULL)
  )
);

COMMENT ON TABLE public.vehicle_documents IS 'Vehicle ownership and authorization documents for car listings';
COMMENT ON COLUMN public.vehicle_documents.is_owner IS 'True if user owns the vehicle, false if authorized by owner';
COMMENT ON COLUMN public.vehicle_documents.green_card_url IS 'Cédula Verde - proves vehicle ownership';
COMMENT ON COLUMN public.vehicle_documents.blue_card_url IS 'Cédula Azul or notarial authorization for non-owners';
COMMENT ON COLUMN public.vehicle_documents.vtv_expiry IS 'Technical Vehicle Verification expiration';
COMMENT ON COLUMN public.vehicle_documents.insurance_expiry IS 'Insurance policy expiration';

-- Indexes
CREATE INDEX idx_vehicle_docs_vehicle_id ON public.vehicle_documents(vehicle_id);
CREATE INDEX idx_vehicle_docs_user_id ON public.vehicle_documents(user_id);
CREATE INDEX idx_vehicle_docs_manual_review ON public.vehicle_documents(manual_review_required)
  WHERE manual_review_required = true;
CREATE INDEX idx_vehicle_docs_vtv_expiry ON public.vehicle_documents(vtv_expiry)
  WHERE vtv_expiry IS NOT NULL;
CREATE INDEX idx_vehicle_docs_insurance_expiry ON public.vehicle_documents(insurance_expiry)
  WHERE insurance_expiry IS NOT NULL;

-- Updated timestamp trigger
CREATE TRIGGER set_vehicle_documents_updated_at
  BEFORE UPDATE ON public.vehicle_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY - vehicle_documents
-- ============================================================================

ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;

-- Users can view their own vehicle documents
CREATE POLICY "Users can view own vehicle documents"
  ON public.vehicle_documents FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own vehicle documents
CREATE POLICY "Users can create own vehicle documents"
  ON public.vehicle_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own vehicle documents (limited fields)
CREATE POLICY "Users can update own vehicle documents"
  ON public.vehicle_documents FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    -- Users can only update upload fields, not verification status
    (green_card_url IS DISTINCT FROM OLD.green_card_url OR
     blue_card_url IS DISTINCT FROM OLD.blue_card_url OR
     vtv_url IS DISTINCT FROM OLD.vtv_url OR
     insurance_url IS DISTINCT FROM OLD.insurance_url)
  );

-- Service role can manage all vehicle documents
CREATE POLICY "Service role can manage vehicle documents"
  ON public.vehicle_documents FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Admins can view all vehicle documents
CREATE POLICY "Admins can view all vehicle documents"
  ON public.vehicle_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Admins can update manual review fields
CREATE POLICY "Admins can update vehicle document review"
  ON public.vehicle_documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ============================================================================
-- RPC FUNCTION: check_driver_license_valid
-- Validates if user has valid driver's license for booking
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_driver_license_valid(p_user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_license_expiry DATE;
  v_license_verified_at TIMESTAMPTZ;
  v_result JSONB;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Not authenticated'
    );
  END IF;

  -- Get license data
  SELECT driver_license_expiry, driver_license_verified_at
  INTO v_license_expiry, v_license_verified_at
  FROM public.user_identity_levels
  WHERE user_id = v_user_id;

  -- Check if license exists and is verified
  IF v_license_verified_at IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'NO_LICENSE',
      'message', 'Necesitás verificar tu licencia de conducir para reservar',
      'action_required', 'upload_license'
    );
  END IF;

  -- Check if license is expired
  IF v_license_expiry IS NULL OR v_license_expiry < CURRENT_DATE THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'LICENSE_EXPIRED',
      'message', 'Tu licencia de conducir está vencida. Actualizá tu licencia para continuar.',
      'expiry_date', v_license_expiry,
      'action_required', 'renew_license'
    );
  END IF;

  -- License is valid
  RETURN jsonb_build_object(
    'valid', true,
    'expiry_date', v_license_expiry,
    'days_until_expiry', v_license_expiry - CURRENT_DATE,
    'verified_at', v_license_verified_at
  );
END;
$$;

COMMENT ON FUNCTION public.check_driver_license_valid IS 'Validates if user has valid driver license for bookings';

GRANT EXECUTE ON FUNCTION public.check_driver_license_valid TO authenticated;

-- ============================================================================
-- RPC FUNCTION: check_vehicle_documents_valid
-- Validates if vehicle has all required documents
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_vehicle_documents_valid(p_vehicle_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc RECORD;
  v_car RECORD;
  v_issues JSONB := '[]'::jsonb;
  v_warnings JSONB := '[]'::jsonb;
BEGIN
  -- Get vehicle data
  SELECT * INTO v_car
  FROM public.cars
  WHERE id = p_vehicle_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Vehicle not found'
    );
  END IF;

  -- Get vehicle documents
  SELECT * INTO v_doc
  FROM public.vehicle_documents
  WHERE vehicle_id = p_vehicle_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'NO_DOCUMENTS',
      'message', 'Este vehículo no tiene documentación cargada',
      'action_required', 'upload_vehicle_documents'
    );
  END IF;

  -- Check ownership documents
  IF v_doc.is_owner = true THEN
    IF v_doc.green_card_url IS NULL OR v_doc.green_card_verified_at IS NULL THEN
      v_issues := v_issues || jsonb_build_object(
        'type', 'MISSING_GREEN_CARD',
        'message', 'Falta cédula verde o no está verificada'
      );
    END IF;
  ELSE
    IF v_doc.blue_card_url IS NULL OR v_doc.blue_card_verified_at IS NULL THEN
      v_issues := v_issues || jsonb_build_object(
        'type', 'MISSING_BLUE_CARD',
        'message', 'Falta cédula azul o autorización notarial'
      );
    END IF;
  END IF;

  -- Check VTV (required in Argentina)
  IF v_doc.vtv_expiry IS NULL THEN
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'NO_VTV',
      'message', 'No se cargó VTV (Verificación Técnica Vehicular)'
    );
  ELSIF v_doc.vtv_expiry < CURRENT_DATE THEN
    v_issues := v_issues || jsonb_build_object(
      'type', 'VTV_EXPIRED',
      'message', 'La VTV está vencida',
      'expiry_date', v_doc.vtv_expiry
    );
  ELSIF v_doc.vtv_expiry < CURRENT_DATE + INTERVAL '30 days' THEN
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'VTV_EXPIRING_SOON',
      'message', 'La VTV vence pronto',
      'expiry_date', v_doc.vtv_expiry,
      'days_until_expiry', v_doc.vtv_expiry - CURRENT_DATE
    );
  END IF;

  -- Check insurance
  IF v_doc.insurance_expiry IS NULL THEN
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'NO_INSURANCE',
      'message', 'No se cargó seguro del vehículo'
    );
  ELSIF v_doc.insurance_expiry < CURRENT_DATE THEN
    v_issues := v_issues || jsonb_build_object(
      'type', 'INSURANCE_EXPIRED',
      'message', 'El seguro del vehículo está vencido',
      'expiry_date', v_doc.insurance_expiry
    );
  ELSIF v_doc.insurance_expiry < CURRENT_DATE + INTERVAL '30 days' THEN
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'INSURANCE_EXPIRING_SOON',
      'message', 'El seguro vence pronto',
      'expiry_date', v_doc.insurance_expiry,
      'days_until_expiry', v_doc.insurance_expiry - CURRENT_DATE
    );
  END IF;

  -- Determine if vehicle is valid for rental
  IF jsonb_array_length(v_issues) > 0 THEN
    RETURN jsonb_build_object(
      'valid', false,
      'issues', v_issues,
      'warnings', v_warnings,
      'message', 'Este vehículo tiene problemas de documentación que deben resolverse'
    );
  ELSE
    RETURN jsonb_build_object(
      'valid', true,
      'warnings', v_warnings,
      'message', 'Vehículo con documentación válida',
      'is_owner', v_doc.is_owner,
      'vtv_expiry', v_doc.vtv_expiry,
      'insurance_expiry', v_doc.insurance_expiry
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION public.check_vehicle_documents_valid IS 'Validates vehicle has all required documents for rental';

GRANT EXECUTE ON FUNCTION public.check_vehicle_documents_valid TO authenticated;

-- ============================================================================
-- RPC FUNCTION: get_expiring_documents
-- Returns user's documents that are expiring soon (for notifications)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_expiring_documents(p_days_threshold INT DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_expiring JSONB := '[]'::jsonb;
  v_identity RECORD;
  v_vehicle RECORD;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Check driver's license
  SELECT * INTO v_identity
  FROM public.user_identity_levels
  WHERE user_id = v_user_id;

  IF v_identity.driver_license_expiry IS NOT NULL AND
     v_identity.driver_license_expiry <= CURRENT_DATE + (p_days_threshold || ' days')::interval THEN
    v_expiring := v_expiring || jsonb_build_object(
      'type', 'DRIVER_LICENSE',
      'expiry_date', v_identity.driver_license_expiry,
      'days_until_expiry', v_identity.driver_license_expiry - CURRENT_DATE,
      'is_expired', v_identity.driver_license_expiry < CURRENT_DATE,
      'message', CASE
        WHEN v_identity.driver_license_expiry < CURRENT_DATE THEN 'Tu licencia de conducir está vencida'
        ELSE 'Tu licencia de conducir vence pronto'
      END
    );
  END IF;

  -- Check vehicle documents (VTV and insurance) for user's cars
  FOR v_vehicle IN
    SELECT vd.*, c.brand, c.model, c.year, c.domain
    FROM public.vehicle_documents vd
    JOIN public.cars c ON c.id = vd.vehicle_id
    WHERE vd.user_id = v_user_id
  LOOP
    -- Check VTV
    IF v_vehicle.vtv_expiry IS NOT NULL AND
       v_vehicle.vtv_expiry <= CURRENT_DATE + (p_days_threshold || ' days')::interval THEN
      v_expiring := v_expiring || jsonb_build_object(
        'type', 'VTV',
        'vehicle_id', v_vehicle.vehicle_id,
        'vehicle_name', v_vehicle.brand || ' ' || v_vehicle.model || ' ' || v_vehicle.year,
        'vehicle_domain', v_vehicle.domain,
        'expiry_date', v_vehicle.vtv_expiry,
        'days_until_expiry', v_vehicle.vtv_expiry - CURRENT_DATE,
        'is_expired', v_vehicle.vtv_expiry < CURRENT_DATE,
        'message', CASE
          WHEN v_vehicle.vtv_expiry < CURRENT_DATE THEN 'VTV vencida para ' || v_vehicle.domain
          ELSE 'VTV próxima a vencer para ' || v_vehicle.domain
        END
      );
    END IF;

    -- Check insurance
    IF v_vehicle.insurance_expiry IS NOT NULL AND
       v_vehicle.insurance_expiry <= CURRENT_DATE + (p_days_threshold || ' days')::interval THEN
      v_expiring := v_expiring || jsonb_build_object(
        'type', 'INSURANCE',
        'vehicle_id', v_vehicle.vehicle_id,
        'vehicle_name', v_vehicle.brand || ' ' || v_vehicle.model || ' ' || v_vehicle.year,
        'vehicle_domain', v_vehicle.domain,
        'expiry_date', v_vehicle.insurance_expiry,
        'days_until_expiry', v_vehicle.insurance_expiry - CURRENT_DATE,
        'is_expired', v_vehicle.insurance_expiry < CURRENT_DATE,
        'message', CASE
          WHEN v_vehicle.insurance_expiry < CURRENT_DATE THEN 'Seguro vencido para ' || v_vehicle.domain
          ELSE 'Seguro próximo a vencer para ' || v_vehicle.domain
        END
      );
    END IF;
  END LOOP;

  RETURN v_expiring;
END;
$$;

COMMENT ON FUNCTION public.get_expiring_documents IS 'Returns user documents expiring within threshold (default 30 days)';

GRANT EXECUTE ON FUNCTION public.get_expiring_documents TO authenticated;

-- ============================================================================
-- UPDATE: get_verification_limits
-- Include driver license requirement for Level 2 renters
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_verification_limits(UUID);

CREATE OR REPLACE FUNCTION public.get_verification_limits(p_user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_current_level INT;
  v_has_valid_license BOOLEAN;
  v_limits JSONB;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  SELECT current_level INTO v_current_level
  FROM public.user_identity_levels
  WHERE user_id = v_user_id;

  -- Check if has valid driver's license
  SELECT (driver_license_verified_at IS NOT NULL AND
          (driver_license_expiry IS NULL OR driver_license_expiry >= CURRENT_DATE))
  INTO v_has_valid_license
  FROM public.user_identity_levels
  WHERE user_id = v_user_id;

  -- Default to Level 1 if not found
  v_current_level := COALESCE(v_current_level, 1);
  v_has_valid_license := COALESCE(v_has_valid_license, false);

  -- Define limits per level
  CASE v_current_level
    WHEN 1 THEN
      v_limits := jsonb_build_object(
        'level', 1,
        'level_name', 'Explorador',
        'can_publish_cars', false,
        'max_cars', 0,
        'can_book', false,
        'max_booking_days', 0,
        'max_booking_amount', 0,
        'can_deposit', false,
        'max_deposit_amount', 0,
        'can_withdraw', false,
        'max_withdraw_monthly', 0,
        'premium_insurance', false,
        'priority_support', false,
        'requires_driver_license', false,
        'features', jsonb_build_array(
          'Ver catálogo completo',
          'Filtrar búsquedas',
          'Ver perfiles de propietarios',
          'Agregar a favoritos',
          'Contactar soporte'
        )
      );
    WHEN 2 THEN
      v_limits := jsonb_build_object(
        'level', 2,
        'level_name', 'Participante',
        'can_publish_cars', true,
        'max_cars', 1,
        'can_book', v_has_valid_license, -- Requires valid license
        'max_booking_days', 7,
        'max_booking_amount', 50000, -- ARS
        'can_deposit', true,
        'max_deposit_amount', 100000, -- ARS
        'can_withdraw', true,
        'max_withdraw_monthly', 50000, -- ARS
        'premium_insurance', false,
        'priority_support', false,
        'requires_driver_license', true,
        'has_valid_driver_license', v_has_valid_license,
        'features', jsonb_build_array(
          'Publicar 1 auto (requiere cédula verde/azul)',
          'Reservas hasta 7 días (requiere licencia vigente)',
          'Transacciones hasta $50k ARS',
          'Retiros hasta $50k/mes',
          'Ver contacto en reservas confirmadas'
        )
      );
    WHEN 3 THEN
      v_limits := jsonb_build_object(
        'level', 3,
        'level_name', 'Verificado Full',
        'can_publish_cars', true,
        'max_cars', NULL, -- unlimited
        'can_book', v_has_valid_license, -- Still requires valid license
        'max_booking_days', NULL, -- unlimited
        'max_booking_amount', NULL, -- unlimited
        'can_deposit', true,
        'max_deposit_amount', NULL, -- unlimited
        'can_withdraw', true,
        'max_withdraw_monthly', NULL, -- unlimited
        'premium_insurance', true,
        'priority_support', true,
        'requires_driver_license', true,
        'has_valid_driver_license', v_has_valid_license,
        'features', jsonb_build_array(
          'Publicar autos ilimitados',
          'Reservas sin límite (requiere licencia vigente)',
          'Transacciones sin límite',
          'Retiros sin límite',
          'Seguros premium',
          'Soporte prioritario'
        )
      );
  END CASE;

  RETURN v_limits;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_verification_limits TO authenticated;

COMMIT;

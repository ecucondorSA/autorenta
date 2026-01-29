CREATE OR REPLACE FUNCTION public.get_renter_verification_for_owner(p_booking_id uuid)
RETURNS TABLE(
  renter_id uuid,
  full_name text,
  phone text,
  whatsapp text,
  gov_id_type text,
  gov_id_number text,
  driver_license_country text,
  driver_license_expiry text,
  driver_license_class text,
  driver_license_professional boolean,
  driver_license_points integer,
  email_verified boolean,
  phone_verified boolean,
  id_verified boolean,
  location_verified_at timestamptz,
  driver_license_verified_at timestamptz,
  driver_class integer,
  driver_score integer,
  fee_multiplier numeric,
  guarantee_multiplier numeric,
  class_description text,
  documents jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_owner_id uuid;
  v_renter_id uuid;
BEGIN
  SELECT c.owner_id, b.renter_id
    INTO v_owner_id, v_renter_id
  FROM bookings b
  JOIN cars c ON c.id = b.car_id
  WHERE b.id = p_booking_id;

  IF v_owner_id IS NULL OR v_renter_id IS NULL THEN
    RETURN;
  END IF;

  -- Si no es el owner, retornar vacío en lugar de error para evitar 400
  IF v_owner_id <> auth.uid() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id AS renter_id,
    p.full_name,
    p.phone,
    p.whatsapp,
    p.gov_id_type,
    p.gov_id_number,
    p.driver_license_country,
    p.driver_license_expiry,
    p.driver_license_class,
    p.driver_license_professional,
    p.driver_license_points,
    p.email_verified,
    p.phone_verified,
    p.id_verified,
    p.location_verified_at,
    uil.driver_license_verified_at,
    drp.class AS driver_class,
    drp.driver_score,
    pcf.fee_multiplier,
    pcf.guarantee_multiplier,
    pcf.description AS class_description,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'kind', d.kind,
            'status', d.status,
            'created_at', d.created_at,
            'reviewed_at', d.reviewed_at
          ) ORDER BY d.kind
        )
        FROM (
          SELECT DISTINCT ON (kind) kind, status, created_at, reviewed_at
          FROM user_documents
          WHERE user_id = p.id
          ORDER BY kind, created_at DESC
        ) d
      ),
      '[]'::jsonb
    ) AS documents
  FROM profiles p
  LEFT JOIN user_identity_levels uil ON uil.user_id = p.id
  LEFT JOIN driver_risk_profile drp ON drp.user_id = p.id
  LEFT JOIN pricing_class_factors pcf ON pcf.class = drp.class
  WHERE p.id = v_renter_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_renter_verification_for_owner(uuid) TO authenticated;

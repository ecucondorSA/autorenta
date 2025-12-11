-- Migration: Fix driver score update on claims
-- Date: 2025-12-03
-- Description: Updates the update_driver_class_on_event function to also reduce
--              driver_score when claims are filed (not just class)

-- Updated function that reduces driver_score based on claim severity
CREATE OR REPLACE FUNCTION public.update_driver_class_on_event(
  p_user_id uuid,
  p_claim_with_fault boolean,
  p_severity integer DEFAULT 1
)
RETURNS TABLE(old_class integer, new_class integer, class_change integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_profile RECORD;
  v_old_class INT;
  v_new_class INT;
  v_class_increase INT;
  v_score_penalty INT;
BEGIN
  -- Obtener perfil actual
  SELECT * INTO v_profile
  FROM driver_risk_profile
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil de conductor no encontrado para usuario %', p_user_id;
  END IF;

  v_old_class := v_profile.class;

  -- Calcular penalización de score basada en severidad
  IF p_claim_with_fault THEN
    v_score_penalty := CASE
      WHEN p_severity = 1 THEN 10  -- Leve: -10 puntos
      WHEN p_severity = 2 THEN 20  -- Moderado: -20 puntos
      WHEN p_severity = 3 THEN 30  -- Grave: -30 puntos
      ELSE 10
    END;
  ELSE
    v_score_penalty := 5; -- Sin culpa: -5 puntos (menor impacto)
  END IF;

  -- Actualizar contadores y score
  UPDATE driver_risk_profile
  SET
    total_claims = total_claims + 1,
    claims_with_fault = CASE
      WHEN p_claim_with_fault THEN claims_with_fault + 1
      ELSE claims_with_fault
    END,
    last_claim_at = NOW(),
    last_claim_with_fault = p_claim_with_fault,
    good_years = 0, -- Resetear años buenos
    driver_score = GREATEST(driver_score - v_score_penalty, 0), -- Reducir score (mínimo 0)
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Calcular aumento de clase solo si hay culpa
  IF p_claim_with_fault THEN
    v_class_increase := CASE
      WHEN p_severity = 1 THEN 1  -- Leve: +1 clase
      WHEN p_severity = 2 THEN 2  -- Moderado: +2 clases
      WHEN p_severity = 3 THEN 3  -- Grave: +3 clases
      ELSE 1
    END;

    -- Calcular nueva clase (máximo 10)
    v_new_class := LEAST(v_old_class + v_class_increase, 10);

    -- Actualizar clase
    UPDATE driver_risk_profile
    SET
      class = v_new_class,
      last_class_update = NOW(),
      updated_at = NOW()
    WHERE user_id = p_user_id;

    RAISE NOTICE 'Clase actualizada: % → % (Δ +%), Score -% puntos', v_old_class, v_new_class, v_class_increase, v_score_penalty;
  ELSE
    -- Sin culpa: no cambiar clase
    v_new_class := v_old_class;
    RAISE NOTICE 'Siniestro sin culpa registrado. Clase sin cambios: %, Score -% puntos', v_old_class, v_score_penalty;
  END IF;

  -- Retornar resultado
  RETURN QUERY SELECT v_old_class, v_new_class, (v_new_class - v_old_class);
END;
$function$;

COMMENT ON FUNCTION update_driver_class_on_event IS 'Actualiza clase y score del conductor cuando ocurre un siniestro.
Penalizaciones de score:
- Con culpa Leve (severity=1): -10 puntos, +1 clase
- Con culpa Moderado (severity=2): -20 puntos, +2 clases
- Con culpa Grave (severity=3): -30 puntos, +3 clases
- Sin culpa: -5 puntos, clase sin cambios';

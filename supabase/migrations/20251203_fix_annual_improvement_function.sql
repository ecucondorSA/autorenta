-- Migration: Fix Annual Improvement Function
-- Date: 2025-12-03
-- Description: Fixes ambiguous column references in improve_driver_class_annual function
--
-- Issue found during testing:
-- ERROR: column reference "good_years" is ambiguous
-- The function had conflicting names between RECORD fields and table columns

DROP FUNCTION IF EXISTS improve_driver_class_annual();

CREATE FUNCTION public.improve_driver_class_annual()
 RETURNS TABLE(user_id uuid, old_class integer, new_class integer, good_years integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rec RECORD;
  v_new_class INT;
BEGIN
  -- Iterar sobre todos los conductores
  FOR rec IN
    SELECT
      drp.user_id as uid,
      drp.class as current_class,
      drp.good_years as years_good,
      drp.last_claim_with_fault,
      drp.last_claim_at
    FROM driver_risk_profile drp
    WHERE
      -- Solo mejorar si no está en clase 0 (ya es excelente)
      drp.class > 0
      -- Solo mejorar si no tuvo siniestros con culpa en el último año
      AND (
        drp.last_claim_with_fault IS FALSE
        OR drp.last_claim_at IS NULL
        OR drp.last_claim_at < NOW() - INTERVAL '1 year'
      )
  LOOP
    -- Incrementar años buenos
    UPDATE driver_risk_profile drp2
    SET
      good_years = drp2.good_years + 1,
      updated_at = NOW()
    WHERE drp2.user_id = rec.uid;

    -- Bajar clase (mejorar) cada año sin siniestros
    v_new_class := GREATEST(rec.current_class - 1, 0);

    UPDATE driver_risk_profile drp3
    SET
      class = v_new_class,
      last_class_update = NOW(),
      updated_at = NOW()
    WHERE drp3.user_id = rec.uid;

    -- Retornar resultado
    RETURN QUERY SELECT
      rec.uid,
      rec.current_class,
      v_new_class,
      rec.years_good + 1;
  END LOOP;
END;
$function$;

COMMENT ON FUNCTION improve_driver_class_annual IS 'Mejora la clase de conductor para usuarios que han completado un año sin siniestros con culpa.
Esta función debería ejecutarse anualmente mediante un cron job.
Reglas:
- Solo afecta conductores con clase > 0
- Requiere que el último siniestro con culpa sea hace más de 1 año (o nunca)
- Reduce la clase en 1 (mejora) e incrementa good_years';

-- =============================================================================
-- Fix: Ambiguous Column Reference in select_authority_concept()
-- =============================================================================
-- Corrige el error "column reference term_name is ambiguous" calificando
-- todas las referencias de columna con el alias de tabla.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.select_authority_concept()
RETURNS TABLE (
  concept_id UUID,
  term_name TEXT,
  parenting_pain_point TEXT,
  financial_analogy TEXT,
  image_scene_concept TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_weight INT;
  random_weight INT;
  running_weight INT := 0;
  v_row RECORD;
  v_exploration_chance FLOAT := 0.20;
  v_use_exploration BOOLEAN;
BEGIN
  v_use_exploration := random() < v_exploration_chance;

  IF v_use_exploration THEN
    -- EXPLORACIÓN: Seleccionar completamente aleatorio
    RAISE NOTICE '[authority] Exploration mode: selecting random concept';

    FOR v_row IN
      SELECT
        mac.id,
        mac.term_name,
        mac.parenting_pain_point,
        mac.financial_analogy,
        mac.image_scene_concept
      FROM marketing_authority_concepts mac
      WHERE mac.is_active = true
      ORDER BY random()
      LIMIT 1
    LOOP
      UPDATE marketing_authority_concepts
      SET times_used = times_used + 1, last_used_at = now()
      WHERE id = v_row.id;

      RETURN QUERY
        SELECT
          v_row.id,
          v_row.term_name,
          v_row.parenting_pain_point,
          v_row.financial_analogy,
          v_row.image_scene_concept;
      RETURN;
    END LOOP;
  ELSE
    -- EXPLOTACIÓN: Selección ponderada por peso + performance
    RAISE NOTICE '[authority] Exploitation mode: selecting by performance-weighted random';

    SELECT COALESCE(SUM(
      mac.weight + COALESCE(mac.performance_score, 0)::int
    ), 0) INTO total_weight
    FROM marketing_authority_concepts mac
    WHERE mac.is_active = true;

    IF total_weight = 0 THEN
      RETURN;
    END IF;

    random_weight := floor(random() * total_weight);

    FOR v_row IN
      SELECT
        mac.id,
        mac.term_name,
        mac.parenting_pain_point,
        mac.financial_analogy,
        mac.image_scene_concept,
        (mac.weight + COALESCE(mac.performance_score, 0)::int) as effective_weight
      FROM marketing_authority_concepts mac
      WHERE mac.is_active = true
      ORDER BY (mac.weight + COALESCE(mac.performance_score, 0)::int) DESC
    LOOP
      running_weight := running_weight + v_row.effective_weight;
      IF running_weight > random_weight THEN
        UPDATE marketing_authority_concepts
        SET times_used = times_used + 1, last_used_at = now()
        WHERE id = v_row.id;

        RETURN QUERY
          SELECT
            v_row.id,
            v_row.term_name,
            v_row.parenting_pain_point,
            v_row.financial_analogy,
            v_row.image_scene_concept;
        RETURN;
      END IF;
    END LOOP;
  END IF;
END;
$$;

COMMENT ON FUNCTION select_authority_concept() IS
'Selecciona concepto de autoridad con estrategia ε-greedy:
- 20% exploración (aleatorio puro para probar conceptos poco usados)
- 80% explotación (ponderado por weight + performance_score)
Fixed: Qualified all column references with table alias to avoid ambiguity.';

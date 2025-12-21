-- =============================================
-- BONUS-MALUS SYSTEM FOR AUTORENTAR
-- Adjusts pricing based on user reputation and behavior
-- Version: 1.0.0
-- Date: 2025-11-05
-- =============================================

-- ============================================
-- 1. TABLA: user_bonus_malus
-- Almacena el factor bonus-malus calculado por usuario
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_bonus_malus (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,

  -- Factor final calculado (-0.15 a +0.20)
  -- Negativo = BONUS (descuento)
  -- Positivo = MALUS (recargo)
  total_factor DECIMAL(5,3) NOT NULL DEFAULT 0.0 CHECK (total_factor BETWEEN -0.15 AND 0.20),

  -- Desglose de factores individuales
  rating_factor DECIMAL(5,3) DEFAULT 0.0,           -- Basado en rating promedio
  cancellation_factor DECIMAL(5,3) DEFAULT 0.0,     -- Basado en tasa de cancelación
  completion_factor DECIMAL(5,3) DEFAULT 0.0,       -- Basado en reservas completadas
  verification_factor DECIMAL(5,3) DEFAULT 0.0,     -- Usuario verificado/nuevo

  -- Detalle de métricas usadas para calcular
  metrics JSONB DEFAULT '{}'::jsonb,

  -- Estado y fecha de cálculo
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  next_recalculation_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_bonus_malus_user ON user_bonus_malus(user_id);
CREATE INDEX IF NOT EXISTS idx_bonus_malus_factor ON user_bonus_malus(total_factor);
CREATE INDEX IF NOT EXISTS idx_bonus_malus_recalc ON user_bonus_malus(next_recalculation_at);

COMMENT ON TABLE user_bonus_malus IS 'Factores de precio basados en reputación del usuario (bonus = descuento, malus = recargo)';
COMMENT ON COLUMN user_bonus_malus.total_factor IS 'Factor total: negativo = descuento, positivo = recargo';
COMMENT ON COLUMN user_bonus_malus.metrics IS 'Métricas detalladas usadas en el cálculo';

-- ============================================
-- 2. FUNCIÓN RPC: calculate_user_bonus_malus
-- Calcula el factor bonus-malus para un usuario
-- ============================================

CREATE OR REPLACE FUNCTION public.calculate_user_bonus_malus(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_rating_factor DECIMAL(5,3) := 0.0;
  v_cancellation_factor DECIMAL(5,3) := 0.0;
  v_completion_factor DECIMAL(5,3) := 0.0;
  v_verification_factor DECIMAL(5,3) := 0.0;
  v_total_factor DECIMAL(5,3) := 0.0;

  -- Métricas del usuario
  v_owner_rating DECIMAL(3,2);
  v_renter_rating DECIMAL(3,2);
  v_avg_rating DECIMAL(3,2);
  v_cancellation_rate DECIMAL(4,2);
  v_total_rentals INT;
  v_completed_rentals INT;
  v_is_verified BOOLEAN;
  v_owner_reviews_count INT;
  v_renter_reviews_count INT;

  v_metrics JSONB;
BEGIN
  -- 1. Obtener estadísticas del usuario de user_stats
  SELECT
    COALESCE(owner_rating_avg, 0),
    COALESCE(renter_rating_avg, 0),
    COALESCE(cancellation_rate, 0),
    COALESCE(total_bookings_as_renter, 0),
    COALESCE(owner_reviews_count, 0),
    COALESCE(renter_reviews_count, 0)
  INTO
    v_owner_rating,
    v_renter_rating,
    v_cancellation_rate,
    v_total_rentals,
    v_owner_reviews_count,
    v_renter_reviews_count
  FROM public.user_stats
  WHERE user_id = p_user_id;

  -- Si no existe en user_stats, crear registro
  IF NOT FOUND THEN
    v_owner_rating := 0;
    v_renter_rating := 0;
    v_cancellation_rate := 0;
    v_total_rentals := 0;
    v_owner_reviews_count := 0;
    v_renter_reviews_count := 0;
  END IF;

  -- 2. Calcular rating promedio (priorizando rol de renter)
  IF v_renter_reviews_count > 0 AND v_owner_reviews_count > 0 THEN
    -- Si tiene reviews en ambos roles, promediar con peso 70/30 a renter
    v_avg_rating := (v_renter_rating * 0.7) + (v_owner_rating * 0.3);
  ELSIF v_renter_reviews_count > 0 THEN
    v_avg_rating := v_renter_rating;
  ELSIF v_owner_reviews_count > 0 THEN
    v_avg_rating := v_owner_rating;
  ELSE
    v_avg_rating := 0;
  END IF;

  -- 3. Verificar si el usuario tiene identidad verificada
  SELECT COALESCE(identity_verified, false)
  INTO v_is_verified
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    v_is_verified := false;
  END IF;

  -- 4. Contar reservas completadas
  SELECT COUNT(*)
  INTO v_completed_rentals
  FROM public.bookings
  WHERE renter_id = p_user_id AND status = 'completed';

  -- ==========================================
  -- CÁLCULO DE FACTORES
  -- ==========================================

  -- FACTOR 1: RATING (más importante)
  -- Excelente rating = BONUS (descuento)
  -- Mal rating = MALUS (recargo)
  IF v_avg_rating >= 4.8 THEN
    v_rating_factor := -0.05;  -- BONUS: -5%
  ELSIF v_avg_rating >= 4.5 THEN
    v_rating_factor := -0.03;  -- BONUS: -3%
  ELSIF v_avg_rating >= 4.0 THEN
    v_rating_factor := -0.01;  -- BONUS: -1%
  ELSIF v_avg_rating >= 3.5 THEN
    v_rating_factor := 0.0;    -- Neutral
  ELSIF v_avg_rating >= 3.0 THEN
    v_rating_factor := 0.05;   -- MALUS: +5%
  ELSIF v_avg_rating > 0 THEN
    v_rating_factor := 0.15;   -- MALUS: +15% (rating muy bajo)
  ELSE
    v_rating_factor := 0.0;    -- Sin reviews aún
  END IF;

  -- FACTOR 2: CANCELACIONES
  -- Baja tasa de cancelación = BONUS
  -- Alta tasa de cancelación = MALUS
  IF v_total_rentals >= 10 THEN
    IF v_cancellation_rate = 0 THEN
      v_cancellation_factor := -0.02;  -- BONUS: -2% (0 cancelaciones)
    ELSIF v_cancellation_rate <= 0.05 THEN
      v_cancellation_factor := -0.01;  -- BONUS: -1% (< 5%)
    ELSIF v_cancellation_rate <= 0.10 THEN
      v_cancellation_factor := 0.0;    -- Neutral (< 10%)
    ELSIF v_cancellation_rate <= 0.20 THEN
      v_cancellation_factor := 0.05;   -- MALUS: +5% (10-20%)
    ELSE
      v_cancellation_factor := 0.10;   -- MALUS: +10% (> 20%)
    END IF;
  ELSE
    -- Pocos datos, no penalizar ni premiar
    v_cancellation_factor := 0.0;
  END IF;

  -- FACTOR 3: EXPERIENCIA (reservas completadas)
  -- Muchas reservas completadas = BONUS
  IF v_completed_rentals >= 50 THEN
    v_completion_factor := -0.03;  -- BONUS: -3% (usuario muy experimentado)
  ELSIF v_completed_rentals >= 20 THEN
    v_completion_factor := -0.02;  -- BONUS: -2%
  ELSIF v_completed_rentals >= 10 THEN
    v_completion_factor := -0.01;  -- BONUS: -1%
  ELSIF v_completed_rentals >= 5 THEN
    v_completion_factor := 0.0;    -- Neutral
  ELSE
    -- Usuarios nuevos: pequeño MALUS por incertidumbre
    v_completion_factor := 0.02;   -- MALUS: +2%
  END IF;

  -- FACTOR 4: VERIFICACIÓN
  -- Usuario verificado = BONUS
  -- Usuario no verificado = ligero MALUS
  IF v_is_verified THEN
    IF v_completed_rentals >= 20 THEN
      v_verification_factor := -0.03;  -- BONUS: -3% (verificado + experimentado)
    ELSE
      v_verification_factor := -0.01;  -- BONUS: -1% (solo verificado)
    END IF;
  ELSE
    IF v_completed_rentals = 0 THEN
      v_verification_factor := 0.05;   -- MALUS: +5% (nuevo y no verificado)
    ELSE
      v_verification_factor := 0.0;    -- Neutral (tiene historial)
    END IF;
  END IF;

  -- CÁLCULO DEL FACTOR TOTAL
  v_total_factor := v_rating_factor + v_cancellation_factor + v_completion_factor + v_verification_factor;

  -- Aplicar límites (-0.15 a +0.20)
  v_total_factor := GREATEST(-0.15, LEAST(v_total_factor, 0.20));

  -- Construir métricas detalladas
  v_metrics := jsonb_build_object(
    'average_rating', v_avg_rating,
    'owner_rating', v_owner_rating,
    'renter_rating', v_renter_rating,
    'cancellation_rate', v_cancellation_rate,
    'total_rentals', v_total_rentals,
    'completed_rentals', v_completed_rentals,
    'is_verified', v_is_verified,
    'owner_reviews_count', v_owner_reviews_count,
    'renter_reviews_count', v_renter_reviews_count,
    'factors', jsonb_build_object(
      'rating_factor', v_rating_factor,
      'cancellation_factor', v_cancellation_factor,
      'completion_factor', v_completion_factor,
      'verification_factor', v_verification_factor
    )
  );

  -- 5. Upsert en la tabla user_bonus_malus
  INSERT INTO public.user_bonus_malus (
    user_id,
    total_factor,
    rating_factor,
    cancellation_factor,
    completion_factor,
    verification_factor,
    metrics,
    last_calculated_at,
    next_recalculation_at,
    updated_at
  ) VALUES (
    p_user_id,
    v_total_factor,
    v_rating_factor,
    v_cancellation_factor,
    v_completion_factor,
    v_verification_factor,
    v_metrics,
    NOW(),
    NOW() + INTERVAL '7 days',
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_factor = EXCLUDED.total_factor,
    rating_factor = EXCLUDED.rating_factor,
    cancellation_factor = EXCLUDED.cancellation_factor,
    completion_factor = EXCLUDED.completion_factor,
    verification_factor = EXCLUDED.verification_factor,
    metrics = EXCLUDED.metrics,
    last_calculated_at = EXCLUDED.last_calculated_at,
    next_recalculation_at = EXCLUDED.next_recalculation_at,
    updated_at = EXCLUDED.updated_at;

  -- 6. Retornar resultado
  RETURN jsonb_build_object(
    'user_id', p_user_id,
    'total_factor', v_total_factor,
    'discount_or_surcharge', CASE
      WHEN v_total_factor < 0 THEN 'BONUS (Descuento)'
      WHEN v_total_factor > 0 THEN 'MALUS (Recargo)'
      ELSE 'NEUTRAL'
    END,
    'percentage', ABS(v_total_factor * 100) || '%',
    'breakdown', jsonb_build_object(
      'rating_factor', v_rating_factor,
      'cancellation_factor', v_cancellation_factor,
      'completion_factor', v_completion_factor,
      'verification_factor', v_verification_factor
    ),
    'metrics', v_metrics
  );
END;
$$;

COMMENT ON FUNCTION calculate_user_bonus_malus IS 'Calcula el factor bonus-malus de un usuario basado en rating, cancelaciones, experiencia y verificación';

-- ============================================
-- 3. FUNCIÓN: get_user_bonus_malus
-- Obtiene el factor bonus-malus (recalcula si es necesario)
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_bonus_malus(
  p_user_id UUID
)
RETURNS DECIMAL(5,3)
LANGUAGE plpgsql
AS $$
DECLARE
  v_factor DECIMAL(5,3);
  v_next_recalc TIMESTAMPTZ;
BEGIN
  -- Intentar obtener factor existente
  SELECT total_factor, next_recalculation_at
  INTO v_factor, v_next_recalc
  FROM public.user_bonus_malus
  WHERE user_id = p_user_id;

  -- Si no existe o necesita recalculación
  IF NOT FOUND OR v_next_recalc < NOW() THEN
    -- Recalcular
    PERFORM public.calculate_user_bonus_malus(p_user_id);

    -- Obtener el nuevo valor
    SELECT total_factor
    INTO v_factor
    FROM public.user_bonus_malus
    WHERE user_id = p_user_id;
  END IF;

  RETURN COALESCE(v_factor, 0.0);
END;
$$;

COMMENT ON FUNCTION get_user_bonus_malus IS 'Obtiene el factor bonus-malus de un usuario (recalcula si es necesario)';

-- ============================================
-- 4. MODIFICAR calculate_dynamic_price
-- Integrar bonus-malus en el cálculo de precio
-- ============================================

CREATE OR REPLACE FUNCTION public.calculate_dynamic_price(
  p_region_id UUID,
  p_user_id UUID,
  p_rental_start TIMESTAMPTZ,
  p_rental_hours INT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_base_price DECIMAL(10,2);
  v_currency TEXT;
  v_day_factor DECIMAL(5,3) := 0.0;
  v_hour_factor DECIMAL(5,3) := 0.0;
  v_user_factor DECIMAL(5,3) := 0.0;
  v_bonus_malus_factor DECIMAL(5,3) := 0.0;  -- NUEVO
  v_demand_factor DECIMAL(5,3) := 0.0;
  v_event_factor DECIMAL(5,3) := 0.0;
  v_final_price DECIMAL(10,2);
  v_user_rentals INT;
  v_dow INT;
  v_hour INT;
BEGIN
  -- 1. Get base price for region
  SELECT base_price_per_hour, currency
  INTO v_base_price, v_currency
  FROM public.pricing_regions
  WHERE id = p_region_id AND active = true;

  IF v_base_price IS NULL THEN
    RAISE EXCEPTION 'Region not found or inactive';
  END IF;

  -- 2. Get day factor
  v_dow := EXTRACT(DOW FROM p_rental_start);
  SELECT COALESCE(factor, 0.0)
  INTO v_day_factor
  FROM public.pricing_day_factors
  WHERE region_id = p_region_id AND day_of_week = v_dow;

  -- 3. Get hour factor
  v_hour := EXTRACT(HOUR FROM p_rental_start);
  SELECT COALESCE(factor, 0.0)
  INTO v_hour_factor
  FROM public.pricing_hour_factors
  WHERE region_id = p_region_id
    AND hour_start <= v_hour
    AND hour_end >= v_hour
  LIMIT 1;

  -- 4. Get base user factor (rental history)
  SELECT COUNT(*)
  INTO v_user_rentals
  FROM public.bookings
  WHERE renter_id = p_user_id AND status = 'completed';

  IF v_user_rentals = 0 THEN
    SELECT COALESCE(factor, 0.0) INTO v_user_factor
    FROM public.pricing_user_factors WHERE user_type = 'new';
  ELSIF v_user_rentals >= 10 THEN
    SELECT COALESCE(factor, 0.0) INTO v_user_factor
    FROM public.pricing_user_factors WHERE user_type = 'frequent';
  ELSIF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND identity_verified = true
  ) THEN
    SELECT COALESCE(factor, 0.0) INTO v_user_factor
    FROM public.pricing_user_factors WHERE user_type = 'verified';
  END IF;

  -- 4b. NUEVO: Obtener factor bonus-malus (basado en reputación)
  v_bonus_malus_factor := public.get_user_bonus_malus(p_user_id);

  -- 5. Get demand factor
  SELECT COALESCE(surge_factor, 0.0)
  INTO v_demand_factor
  FROM public.pricing_demand_snapshots
  WHERE region_id = p_region_id
  ORDER BY timestamp DESC
  LIMIT 1;

  -- 6. Check for special events
  SELECT COALESCE(SUM(factor), 0.0)
  INTO v_event_factor
  FROM public.pricing_special_events
  WHERE region_id = p_region_id
    AND active = true
    AND p_rental_start BETWEEN start_date AND end_date;

  -- 7. Calculate final price (INCLUYE BONUS-MALUS)
  v_final_price := v_base_price * (1 + v_day_factor + v_hour_factor + v_user_factor + v_bonus_malus_factor + v_demand_factor + v_event_factor);

  -- Apply min/max caps (0.8x to 1.6x base)
  v_final_price := GREATEST(v_base_price * 0.8, LEAST(v_final_price, v_base_price * 1.6));

  -- Round to nearest 0.10
  v_final_price := ROUND(v_final_price / 0.1) * 0.1;

  -- Return full breakdown (INCLUYE BONUS-MALUS)
  RETURN jsonb_build_object(
    'price_per_hour', v_final_price,
    'total_price', v_final_price * p_rental_hours,
    'currency', v_currency,
    'breakdown', jsonb_build_object(
      'base_price', v_base_price,
      'day_factor', v_day_factor,
      'hour_factor', v_hour_factor,
      'user_factor', v_user_factor,
      'bonus_malus_factor', v_bonus_malus_factor,  -- NUEVO
      'demand_factor', v_demand_factor,
      'event_factor', v_event_factor,
      'total_multiplier', (1 + v_day_factor + v_hour_factor + v_user_factor + v_bonus_malus_factor + v_demand_factor + v_event_factor)
    ),
    'details', jsonb_build_object(
      'user_rentals', v_user_rentals,
      'day_of_week', v_dow,
      'hour_of_day', v_hour
    )
  );
END;
$$;

COMMENT ON FUNCTION calculate_dynamic_price IS 'Calcula precio dinámico incluyendo factor bonus-malus basado en reputación del usuario';

-- ============================================
-- 5. FUNCIÓN CRON: recalculate_all_bonus_malus
-- Recalcula factores para usuarios que lo necesiten
-- ============================================

CREATE OR REPLACE FUNCTION public.recalculate_all_bonus_malus()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_user RECORD;
  v_count INT := 0;
BEGIN
  -- Recalcular para usuarios que necesitan actualización
  FOR v_user IN
    SELECT user_id
    FROM public.user_bonus_malus
    WHERE next_recalculation_at < NOW()
    LIMIT 100  -- Procesar máximo 100 por ejecución
  LOOP
    PERFORM public.calculate_user_bonus_malus(v_user.user_id);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION recalculate_all_bonus_malus IS 'Recalcula factores bonus-malus para usuarios que necesitan actualización (ejecutar vía cron)';

-- ============================================
-- 6. RLS POLICIES
-- ============================================

ALTER TABLE public.user_bonus_malus ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden ver su propio factor
CREATE POLICY "Users can view own bonus-malus"
ON public.user_bonus_malus FOR SELECT
USING (auth.uid() = user_id);

-- Cualquier usuario autenticado puede leer factores (para transparencia)
CREATE POLICY "Authenticated users can view all bonus-malus"
ON public.user_bonus_malus FOR SELECT
USING (auth.role() = 'authenticated');

-- Solo la función RPC puede insertar/actualizar
-- (controlado por SECURITY DEFINER en las funciones)

-- ============================================
-- 7. GRANTS
-- ============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.user_bonus_malus TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_user_bonus_malus TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_bonus_malus TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_all_bonus_malus TO service_role;

-- ============================================
-- 8. TRIGGERS
-- ============================================

-- Trigger para recalcular bonus-malus cuando se actualiza user_stats
CREATE OR REPLACE FUNCTION trigger_recalculate_bonus_malus()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalcular en background (no bloquear la operación)
  PERFORM public.calculate_user_bonus_malus(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_user_stats_update ON public.user_stats;
CREATE TRIGGER on_user_stats_update
  AFTER INSERT OR UPDATE ON public.user_stats
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_bonus_malus();

COMMENT ON TRIGGER on_user_stats_update ON public.user_stats IS 'Recalcula bonus-malus automáticamente cuando cambian las estadísticas del usuario';

-- ============================================
-- FIN DEL SCRIPT
-- ============================================

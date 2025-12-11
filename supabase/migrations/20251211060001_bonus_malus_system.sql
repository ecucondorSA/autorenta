-- =============================================
-- FASE 7: Sistema Bonus-Malus
-- =============================================

-- 7.1 Crear tabla user_risk_scores para tracking de historial
CREATE TABLE IF NOT EXISTS user_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Métricas positivas
  total_rentals INTEGER DEFAULT 0,
  rentals_without_incidents INTEGER DEFAULT 0,
  disputes_won INTEGER DEFAULT 0,
  average_rating NUMERIC(3,2) DEFAULT 0,
  account_age_months INTEGER DEFAULT 0,

  -- Métricas negativas
  disputes_lost INTEGER DEFAULT 0,
  cancellations_late INTEGER DEFAULT 0,
  damages_reported INTEGER DEFAULT 0,
  traffic_infractions INTEGER DEFAULT 0,

  -- Score calculado
  current_score INTEGER DEFAULT 0, -- Entre -50 y +30
  score_percentage NUMERIC(5,2) DEFAULT 0, -- -50% a +30%

  -- Metadata
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_risk_scores_user ON user_risk_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_user_risk_scores_score ON user_risk_scores(current_score);

-- 7.2 Función para calcular bonus-malus de un usuario
CREATE OR REPLACE FUNCTION calculate_bonus_malus(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_stats RECORD;
  v_score INTEGER := 0;
  v_breakdown jsonb := '[]'::jsonb;
  v_total_rentals INTEGER;
  v_rentals_without_incidents INTEGER;
  v_disputes_won INTEGER;
  v_disputes_lost INTEGER;
  v_cancellations_late INTEGER;
  v_damages_reported INTEGER;
  v_average_rating NUMERIC;
  v_account_age_months INTEGER;
  v_traffic_infractions INTEGER;
BEGIN
  -- Obtener perfil
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario no encontrado');
  END IF;

  -- Calcular antigüedad de cuenta
  v_account_age_months := EXTRACT(MONTH FROM AGE(NOW(), v_profile.created_at))::INTEGER
                         + (EXTRACT(YEAR FROM AGE(NOW(), v_profile.created_at))::INTEGER * 12);

  -- Contar alquileres completados (como renter)
  SELECT
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'completed' AND id NOT IN (
      SELECT DISTINCT booking_id FROM disputes WHERE renter_id = p_user_id
    ) AND id NOT IN (
      SELECT DISTINCT booking_id FROM accident_reports WHERE reporter_id = p_user_id
    ) AND id NOT IN (
      SELECT DISTINCT booking_id FROM traffic_infractions WHERE renter_id = p_user_id
    ))
  INTO v_total_rentals, v_rentals_without_incidents
  FROM bookings
  WHERE renter_id = p_user_id;

  -- Contar disputas
  SELECT
    COUNT(*) FILTER (WHERE status = 'resolved_owner_favor'),
    COUNT(*) FILTER (WHERE status = 'resolved_renter_favor')
  INTO v_disputes_lost, v_disputes_won
  FROM disputes
  WHERE renter_id = p_user_id;

  -- Contar cancelaciones tardías (como renter, después de confirmado)
  SELECT COUNT(*)
  INTO v_cancellations_late
  FROM bookings
  WHERE renter_id = p_user_id
    AND status IN ('cancelled_renter')
    AND cancelled_at > created_at + INTERVAL '24 hours';

  -- Contar daños reportados
  SELECT COUNT(*)
  INTO v_damages_reported
  FROM accident_reports
  WHERE reporter_id != p_user_id -- Reportado por el owner
    AND booking_id IN (SELECT id FROM bookings WHERE renter_id = p_user_id);

  -- Contar infracciones de tránsito
  SELECT COUNT(*)
  INTO v_traffic_infractions
  FROM traffic_infractions
  WHERE renter_id = p_user_id
    AND status IN ('accepted', 'charged');

  -- Obtener rating promedio
  SELECT COALESCE(AVG(rating), 0)
  INTO v_average_rating
  FROM reviews
  WHERE reviewee_id = p_user_id;

  -- ========== CALCULAR SCORE ==========

  -- BONIFICACIONES (máximo +30%)

  -- +5% por cada 5 alquileres sin incidentes (máx +15%)
  IF v_rentals_without_incidents >= 5 THEN
    DECLARE bonus INTEGER := LEAST((v_rentals_without_incidents / 5) * 5, 15);
    BEGIN
      v_score := v_score + bonus;
      v_breakdown := v_breakdown || jsonb_build_object(
        'type', 'bonus',
        'reason', 'Alquileres sin incidentes',
        'value', bonus,
        'detail', v_rentals_without_incidents || ' alquileres limpios'
      );
    END;
  END IF;

  -- +10% por 10+ alquileres anuales
  IF v_total_rentals >= 10 THEN
    v_score := v_score + 10;
    v_breakdown := v_breakdown || jsonb_build_object(
      'type', 'bonus',
      'reason', 'Usuario frecuente',
      'value', 10,
      'detail', v_total_rentals || ' alquileres totales'
    );
  END IF;

  -- +5% por rating >= 4.8
  IF v_average_rating >= 4.8 THEN
    v_score := v_score + 5;
    v_breakdown := v_breakdown || jsonb_build_object(
      'type', 'bonus',
      'reason', 'Excelente reputación',
      'value', 5,
      'detail', 'Rating ' || ROUND(v_average_rating, 2)
    );
  ELSIF v_average_rating >= 4.5 THEN
    v_score := v_score + 3;
    v_breakdown := v_breakdown || jsonb_build_object(
      'type', 'bonus',
      'reason', 'Buena reputación',
      'value', 3,
      'detail', 'Rating ' || ROUND(v_average_rating, 2)
    );
  END IF;

  -- +5% por antigüedad >= 2 años
  IF v_account_age_months >= 24 THEN
    v_score := v_score + 5;
    v_breakdown := v_breakdown || jsonb_build_object(
      'type', 'bonus',
      'reason', 'Usuario veterano',
      'value', 5,
      'detail', (v_account_age_months / 12) || ' años en la plataforma'
    );
  ELSIF v_account_age_months >= 12 THEN
    v_score := v_score + 3;
    v_breakdown := v_breakdown || jsonb_build_object(
      'type', 'bonus',
      'reason', 'Usuario establecido',
      'value', 3,
      'detail', (v_account_age_months / 12) || ' año en la plataforma'
    );
  END IF;

  -- PENALIZACIONES (máximo -50%)

  -- -10% por cada disputa perdida
  IF v_disputes_lost > 0 THEN
    DECLARE penalty INTEGER := v_disputes_lost * 10;
    BEGIN
      v_score := v_score - penalty;
      v_breakdown := v_breakdown || jsonb_build_object(
        'type', 'malus',
        'reason', 'Disputas perdidas',
        'value', -penalty,
        'detail', v_disputes_lost || ' disputas'
      );
    END;
  END IF;

  -- -5% por cada cancelación tardía
  IF v_cancellations_late > 0 THEN
    DECLARE penalty INTEGER := v_cancellations_late * 5;
    BEGIN
      v_score := v_score - penalty;
      v_breakdown := v_breakdown || jsonb_build_object(
        'type', 'malus',
        'reason', 'Cancelaciones tardías',
        'value', -penalty,
        'detail', v_cancellations_late || ' cancelaciones'
      );
    END;
  END IF;

  -- -15% por cada daño reportado
  IF v_damages_reported > 0 THEN
    DECLARE penalty INTEGER := v_damages_reported * 15;
    BEGIN
      v_score := v_score - penalty;
      v_breakdown := v_breakdown || jsonb_build_object(
        'type', 'malus',
        'reason', 'Daños reportados',
        'value', -penalty,
        'detail', v_damages_reported || ' incidentes'
      );
    END;
  END IF;

  -- -5% por cada infracción de tránsito
  IF v_traffic_infractions > 0 THEN
    DECLARE penalty INTEGER := v_traffic_infractions * 5;
    BEGIN
      v_score := v_score - penalty;
      v_breakdown := v_breakdown || jsonb_build_object(
        'type', 'malus',
        'reason', 'Infracciones de tránsito',
        'value', -penalty,
        'detail', v_traffic_infractions || ' multas'
      );
    END;
  END IF;

  -- Limitar score entre -50 y +30
  v_score := GREATEST(-50, LEAST(30, v_score));

  -- Guardar o actualizar en user_risk_scores
  INSERT INTO user_risk_scores (
    user_id, total_rentals, rentals_without_incidents, disputes_won,
    disputes_lost, cancellations_late, damages_reported, traffic_infractions,
    average_rating, account_age_months, current_score, score_percentage,
    last_calculated_at, updated_at
  ) VALUES (
    p_user_id, v_total_rentals, v_rentals_without_incidents, v_disputes_won,
    v_disputes_lost, v_cancellations_late, v_damages_reported, v_traffic_infractions,
    v_average_rating, v_account_age_months, v_score, v_score,
    NOW(), NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_rentals = EXCLUDED.total_rentals,
    rentals_without_incidents = EXCLUDED.rentals_without_incidents,
    disputes_won = EXCLUDED.disputes_won,
    disputes_lost = EXCLUDED.disputes_lost,
    cancellations_late = EXCLUDED.cancellations_late,
    damages_reported = EXCLUDED.damages_reported,
    traffic_infractions = EXCLUDED.traffic_infractions,
    average_rating = EXCLUDED.average_rating,
    account_age_months = EXCLUDED.account_age_months,
    current_score = EXCLUDED.current_score,
    score_percentage = EXCLUDED.score_percentage,
    last_calculated_at = NOW(),
    updated_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'score', v_score,
    'score_percentage', v_score || '%',
    'breakdown', v_breakdown,
    'stats', jsonb_build_object(
      'total_rentals', v_total_rentals,
      'rentals_without_incidents', v_rentals_without_incidents,
      'disputes_won', v_disputes_won,
      'disputes_lost', v_disputes_lost,
      'cancellations_late', v_cancellations_late,
      'damages_reported', v_damages_reported,
      'traffic_infractions', v_traffic_infractions,
      'average_rating', ROUND(v_average_rating, 2),
      'account_age_months', v_account_age_months
    )
  );
END;
$$;

-- 7.3 Función para aplicar bonus-malus al depósito
CREATE OR REPLACE FUNCTION apply_bonus_malus_to_deposit(
  p_renter_id UUID,
  p_base_deposit_cents BIGINT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_risk_score RECORD;
  v_bonus_malus_result jsonb;
  v_adjustment_factor NUMERIC;
  v_adjusted_deposit BIGINT;
  v_discount_amount BIGINT;
BEGIN
  -- Calcular/actualizar bonus-malus
  v_bonus_malus_result := calculate_bonus_malus(p_renter_id);

  IF NOT (v_bonus_malus_result->>'success')::boolean THEN
    -- Si falla, usar depósito base sin ajuste
    RETURN jsonb_build_object(
      'success', true,
      'base_deposit', p_base_deposit_cents,
      'adjusted_deposit', p_base_deposit_cents,
      'adjustment_percentage', 0,
      'discount_amount', 0,
      'note', 'No se pudo calcular bonus-malus, usando depósito base'
    );
  END IF;

  -- Obtener score
  SELECT * INTO v_risk_score
  FROM user_risk_scores
  WHERE user_id = p_renter_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'base_deposit', p_base_deposit_cents,
      'adjusted_deposit', p_base_deposit_cents,
      'adjustment_percentage', 0,
      'discount_amount', 0,
      'note', 'Usuario nuevo, usando depósito base'
    );
  END IF;

  -- Calcular factor de ajuste
  -- Score positivo = descuento, Score negativo = aumento
  v_adjustment_factor := 1 - (v_risk_score.score_percentage / 100);

  -- Calcular depósito ajustado
  v_adjusted_deposit := ROUND(p_base_deposit_cents * v_adjustment_factor);

  -- Calcular monto de descuento/aumento
  v_discount_amount := p_base_deposit_cents - v_adjusted_deposit;

  RETURN jsonb_build_object(
    'success', true,
    'base_deposit', p_base_deposit_cents,
    'adjusted_deposit', v_adjusted_deposit,
    'adjustment_percentage', v_risk_score.score_percentage,
    'discount_amount', v_discount_amount,
    'is_discount', v_discount_amount > 0,
    'risk_score', v_risk_score.current_score,
    'breakdown', v_bonus_malus_result->'breakdown'
  );
END;
$$;

-- 7.4 Función para obtener el score de un usuario (lectura rápida)
CREATE OR REPLACE FUNCTION get_user_risk_score(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_risk_score RECORD;
BEGIN
  SELECT * INTO v_risk_score
  FROM user_risk_scores
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    -- Calcular si no existe
    RETURN calculate_bonus_malus(p_user_id);
  END IF;

  -- Si el score tiene más de 24 horas, recalcular
  IF v_risk_score.last_calculated_at < NOW() - INTERVAL '24 hours' THEN
    RETURN calculate_bonus_malus(p_user_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'score', v_risk_score.current_score,
    'score_percentage', v_risk_score.score_percentage || '%',
    'stats', jsonb_build_object(
      'total_rentals', v_risk_score.total_rentals,
      'rentals_without_incidents', v_risk_score.rentals_without_incidents,
      'disputes_won', v_risk_score.disputes_won,
      'disputes_lost', v_risk_score.disputes_lost,
      'cancellations_late', v_risk_score.cancellations_late,
      'damages_reported', v_risk_score.damages_reported,
      'average_rating', v_risk_score.average_rating
    ),
    'last_calculated_at', v_risk_score.last_calculated_at
  );
END;
$$;

-- RLS
ALTER TABLE user_risk_scores ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden ver su propio score
CREATE POLICY "Users can view own risk score"
  ON user_risk_scores
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Solo service_role puede modificar
CREATE POLICY "Service role can manage risk scores"
  ON user_risk_scores
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grants
GRANT SELECT ON user_risk_scores TO authenticated;
GRANT ALL ON user_risk_scores TO service_role;
GRANT EXECUTE ON FUNCTION calculate_bonus_malus(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION apply_bonus_malus_to_deposit(UUID, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_risk_score(UUID) TO authenticated;

COMMENT ON TABLE user_risk_scores IS 'Almacena el historial y score de riesgo de cada usuario para el sistema bonus-malus';
COMMENT ON FUNCTION calculate_bonus_malus(UUID) IS 'Calcula el score bonus-malus de un usuario basado en su historial';
COMMENT ON FUNCTION apply_bonus_malus_to_deposit(UUID, BIGINT) IS 'Aplica el descuento/aumento bonus-malus al depósito base';
COMMENT ON FUNCTION get_user_risk_score(UUID) IS 'Obtiene el score de riesgo de un usuario (con cache de 24h)';

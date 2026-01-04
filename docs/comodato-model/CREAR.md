# CREAR - Nuevos Elementos para Modelo Comodato

## Resumen
Este documento contiene todas las tablas, funciones, vistas y triggers **nuevos** que deben crearse para implementar el modelo "Comodato + Comunidad".

---

# 1. TABLAS NUEVAS

## 1.1 `community_memberships`
Membresía de owners en la comunidad.

```sql
CREATE TABLE community_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expelled')),
  tier TEXT DEFAULT 'standard' CHECK (tier IN ('standard', 'silver', 'gold', 'platinum')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  suspended_at TIMESTAMPTZ,
  suspension_reason TEXT,
  expulsion_reason TEXT,
  terms_accepted_at TIMESTAMPTZ,
  terms_version TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_community_memberships_owner ON community_memberships(owner_id);
CREATE INDEX idx_community_memberships_status ON community_memberships(status);

-- RLS
ALTER TABLE community_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own membership" ON community_memberships
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Admins can manage memberships" ON community_memberships
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
```

---

## 1.2 `community_rewards`
Rewards mensuales calculados por criterios de participación (NO correlacionados con bookings).

```sql
CREATE TABLE community_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id),
  period_year INT NOT NULL,
  period_month INT NOT NULL,

  -- Puntos por criterio (no correlacionados con bookings)
  availability_points INT DEFAULT 0,      -- días disponibles declarados
  rating_points INT DEFAULT 0,            -- por mantener rating alto
  seniority_points INT DEFAULT 0,         -- por antigüedad en comunidad
  referral_points INT DEFAULT 0,          -- por referidos activos
  response_time_points INT DEFAULT 0,     -- por responder rápido
  participation_points INT DEFAULT 0,     -- por actividad en comunidad
  bonus_points INT DEFAULT 0,             -- bonos especiales
  penalty_points INT DEFAULT 0,           -- penalizaciones

  -- Totales
  total_points INT GENERATED ALWAYS AS (
    availability_points + rating_points + seniority_points +
    referral_points + response_time_points + participation_points +
    bonus_points - penalty_points
  ) STORED,

  amount_cents BIGINT DEFAULT 0,
  currency TEXT DEFAULT 'ARS',

  -- Estado del reward
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'calculated', 'approved', 'paid', 'cancelled')),
  calculated_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id),
  paid_at TIMESTAMPTZ,
  wallet_transaction_id UUID REFERENCES wallet_transactions(id),

  -- Metadata
  calculation_details JSONB DEFAULT '{}',
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(owner_id, period_year, period_month)
);

CREATE INDEX idx_community_rewards_owner ON community_rewards(owner_id);
CREATE INDEX idx_community_rewards_period ON community_rewards(period_year, period_month);
CREATE INDEX idx_community_rewards_status ON community_rewards(status);

-- RLS
ALTER TABLE community_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own rewards" ON community_rewards
  FOR SELECT USING (auth.uid() = owner_id);
```

---

## 1.3 `reward_criteria_config`
Configuración de criterios para calcular rewards.

```sql
CREATE TABLE reward_criteria_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  criterion TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  points_per_unit NUMERIC(10,2) NOT NULL,
  max_points_per_month INT,
  weight_percentage NUMERIC(5,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  calculation_formula TEXT, -- fórmula para casos especiales
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Datos iniciales
INSERT INTO reward_criteria_config (criterion, display_name, description, points_per_unit, max_points_per_month, weight_percentage) VALUES
  ('availability', 'Disponibilidad', 'Puntos por día de disponibilidad declarada', 10, 300, 30),
  ('rating', 'Rating', 'Puntos por mantener rating >= 4.5', 100, 200, 20),
  ('seniority', 'Antigüedad', 'Puntos por mes de antigüedad en comunidad', 50, 600, 15),
  ('referral', 'Referidos', 'Puntos por referido activo', 200, NULL, 15),
  ('response_time', 'Tiempo de respuesta', 'Puntos por respuesta rápida (<1h)', 5, 150, 10),
  ('participation', 'Participación', 'Puntos por actividad en comunidad', 50, 100, 10);
```

---

## 1.4 `reward_pool`
Pool mensual de donde se pagan los rewards.

```sql
CREATE TABLE reward_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_year INT NOT NULL,
  period_month INT NOT NULL,

  -- Acumulación
  contributions_cents BIGINT DEFAULT 0,      -- % de cada booking
  adjustments_cents BIGINT DEFAULT 0,        -- ajustes manuales
  total_available_cents BIGINT GENERATED ALWAYS AS (contributions_cents + adjustments_cents) STORED,

  -- Distribución
  total_distributed_cents BIGINT DEFAULT 0,
  total_points_in_period INT DEFAULT 0,
  cents_per_point NUMERIC(10,4),             -- calculado al cierre

  -- Estado
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'calculating', 'distributed', 'closed')),
  closed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(period_year, period_month)
);
```

---

## 1.5 `owner_usage_limits`
Control de límites de uso mensual por vehículo (para reforzar carácter no-comercial).

```sql
CREATE TABLE owner_usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES cars(id),
  year INT NOT NULL,
  month INT NOT NULL,

  -- Contadores de uso compartido
  days_shared INT DEFAULT 0,
  max_days_allowed INT DEFAULT 24,
  consecutive_days_current INT DEFAULT 0,
  max_consecutive_allowed INT,

  -- Uso personal verificado
  personal_use_days INT DEFAULT 0,
  min_personal_days_required INT DEFAULT 10,

  -- Ganancias anuales (para límite de no-lucro)
  ytd_earnings_cents BIGINT DEFAULT 0,
  annual_expense_limit_cents BIGINT, -- copia del límite del auto

  -- Bloqueo
  is_blocked BOOLEAN DEFAULT false,
  blocked_at TIMESTAMPTZ,
  block_reason TEXT,
  unblocked_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(car_id, year, month)
);

CREATE INDEX idx_owner_usage_limits_car ON owner_usage_limits(car_id);
CREATE INDEX idx_owner_usage_limits_period ON owner_usage_limits(year, month);
CREATE INDEX idx_owner_usage_limits_blocked ON owner_usage_limits(is_blocked) WHERE is_blocked = true;
```

---

## 1.6 `personal_use_verifications`
Verificación de uso personal del vehículo (para demostrar que no es uso comercial exclusivo).

```sql
CREATE TABLE personal_use_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id),
  car_id UUID NOT NULL REFERENCES cars(id),
  verification_date DATE NOT NULL,

  -- Tipo de verificación
  verification_type TEXT NOT NULL CHECK (verification_type IN (
    'odometer_photo', 'gps_checkin', 'selfie_with_car', 'fuel_receipt', 'parking_receipt'
  )),

  -- Evidencia
  evidence_url TEXT,
  location_lat NUMERIC(10, 7),
  location_lng NUMERIC(10, 7),
  odometer_reading INT,

  -- Validación
  auto_validated BOOLEAN DEFAULT false,
  manual_validated BOOLEAN DEFAULT false,
  validated_by UUID REFERENCES profiles(id),
  validated_at TIMESTAMPTZ,
  rejection_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_personal_use_verifications_car ON personal_use_verifications(car_id);
CREATE INDEX idx_personal_use_verifications_date ON personal_use_verifications(verification_date);
```

---

## 1.7 `comodato_agreements`
Contratos de comodato (préstamo gratuito) - documento legal clave.

```sql
CREATE TABLE comodato_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) UNIQUE,

  -- Partes
  owner_id UUID NOT NULL REFERENCES profiles(id),
  borrower_id UUID NOT NULL REFERENCES profiles(id),
  car_id UUID NOT NULL REFERENCES cars(id),

  -- Período
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,

  -- Términos
  terms_version TEXT NOT NULL DEFAULT 'v1.0',
  terms_hash TEXT, -- hash del contrato para integridad

  -- Aceptación digital
  owner_accepted_at TIMESTAMPTZ,
  owner_ip TEXT,
  owner_user_agent TEXT,
  borrower_accepted_at TIMESTAMPTZ,
  borrower_ip TEXT,
  borrower_user_agent TEXT,

  -- Estado
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'owner_accepted', 'active', 'completed', 'cancelled', 'disputed'
  )),

  -- Devolución
  returned_at TIMESTAMPTZ,
  return_notes TEXT,
  return_condition TEXT CHECK (return_condition IN ('excellent', 'good', 'fair', 'poor', 'damaged')),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_comodato_agreements_booking ON comodato_agreements(booking_id);
CREATE INDEX idx_comodato_agreements_owner ON comodato_agreements(owner_id);
CREATE INDEX idx_comodato_agreements_status ON comodato_agreements(status);
```

---

## 1.8 `owner_availability`
Disponibilidad declarada por el owner (para calcular puntos de disponibilidad).

```sql
CREATE TABLE owner_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES cars(id),
  owner_id UUID NOT NULL REFERENCES profiles(id),
  date DATE NOT NULL,

  is_available BOOLEAN DEFAULT true,

  -- Si está ocupado
  occupied_by_booking_id UUID REFERENCES bookings(id),
  occupied_by_personal_use BOOLEAN DEFAULT false,

  -- Metadata
  declared_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(car_id, date)
);

CREATE INDEX idx_owner_availability_car ON owner_availability(car_id);
CREATE INDEX idx_owner_availability_date ON owner_availability(date);
CREATE INDEX idx_owner_availability_available ON owner_availability(is_available) WHERE is_available = true;
```

---

# 2. FUNCIONES NUEVAS

## 2.1 `calculate_monthly_community_rewards`
Calcula los puntos de un owner para un mes específico.

```sql
CREATE OR REPLACE FUNCTION calculate_monthly_community_rewards(
  p_owner_id UUID,
  p_year INT,
  p_month INT
) RETURNS community_rewards AS $$
DECLARE
  v_result community_rewards;
  v_availability_days INT;
  v_rating NUMERIC;
  v_seniority_months INT;
  v_referrals INT;
  v_avg_response_minutes INT;
  v_membership community_memberships;
BEGIN
  -- Verificar membresía activa
  SELECT * INTO v_membership
  FROM community_memberships
  WHERE owner_id = p_owner_id AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Owner no es miembro activo de la comunidad';
  END IF;

  -- Calcular días de disponibilidad
  SELECT COUNT(*) INTO v_availability_days
  FROM owner_availability oa
  JOIN cars c ON oa.car_id = c.id
  WHERE c.owner_id = p_owner_id
    AND EXTRACT(YEAR FROM oa.date) = p_year
    AND EXTRACT(MONTH FROM oa.date) = p_month
    AND oa.is_available = true;

  -- Obtener rating promedio
  SELECT COALESCE(rating_avg, 0) INTO v_rating
  FROM profiles WHERE id = p_owner_id;

  -- Calcular antigüedad en meses
  SELECT EXTRACT(MONTH FROM age(
    make_date(p_year, p_month, 1),
    v_membership.joined_at
  ))::INT INTO v_seniority_months;

  -- Contar referidos activos
  SELECT COUNT(*) INTO v_referrals
  FROM referrals r
  WHERE r.referrer_id = p_owner_id
    AND r.status = 'completed';

  -- Obtener tiempo promedio de respuesta
  SELECT COALESCE(avg_response_time_minutes, 999) INTO v_avg_response_minutes
  FROM profiles WHERE id = p_owner_id;

  -- Insertar o actualizar reward
  INSERT INTO community_rewards (
    owner_id, period_year, period_month,
    availability_points,
    rating_points,
    seniority_points,
    referral_points,
    response_time_points,
    status,
    calculated_at,
    calculation_details
  ) VALUES (
    p_owner_id, p_year, p_month,
    LEAST(v_availability_days * 10, 300),
    CASE WHEN v_rating >= 4.5 THEN 100
         WHEN v_rating >= 4.0 THEN 50
         ELSE 0 END,
    LEAST(v_seniority_months * 50, 600),
    LEAST(v_referrals * 200, 1000),
    CASE WHEN v_avg_response_minutes <= 60 THEN 100
         WHEN v_avg_response_minutes <= 180 THEN 50
         ELSE 0 END,
    'calculated',
    now(),
    jsonb_build_object(
      'availability_days', v_availability_days,
      'rating', v_rating,
      'seniority_months', v_seniority_months,
      'referrals', v_referrals,
      'avg_response_minutes', v_avg_response_minutes
    )
  )
  ON CONFLICT (owner_id, period_year, period_month)
  DO UPDATE SET
    availability_points = EXCLUDED.availability_points,
    rating_points = EXCLUDED.rating_points,
    seniority_points = EXCLUDED.seniority_points,
    referral_points = EXCLUDED.referral_points,
    response_time_points = EXCLUDED.response_time_points,
    calculated_at = now(),
    calculation_details = EXCLUDED.calculation_details,
    status = 'calculated'
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 2.2 `distribute_reward_pool`
Distribuye el pool mensual entre los owners según sus puntos.

```sql
CREATE OR REPLACE FUNCTION distribute_reward_pool(
  p_year INT,
  p_month INT
) RETURNS TABLE(owner_id UUID, amount_cents BIGINT) AS $$
DECLARE
  v_pool reward_pool;
  v_total_points INT;
  v_cents_per_point NUMERIC;
BEGIN
  -- Obtener pool del mes
  SELECT * INTO v_pool
  FROM reward_pool
  WHERE period_year = p_year AND period_month = p_month;

  IF NOT FOUND OR v_pool.status != 'open' THEN
    RAISE EXCEPTION 'Pool no disponible para distribución';
  END IF;

  -- Calcular total de puntos del mes
  SELECT COALESCE(SUM(total_points), 0) INTO v_total_points
  FROM community_rewards
  WHERE period_year = p_year
    AND period_month = p_month
    AND status = 'calculated'
    AND total_points > 0;

  IF v_total_points = 0 THEN
    RAISE EXCEPTION 'No hay puntos para distribuir';
  END IF;

  -- Calcular valor por punto
  v_cents_per_point := v_pool.total_available_cents::NUMERIC / v_total_points;

  -- Actualizar pool
  UPDATE reward_pool SET
    total_points_in_period = v_total_points,
    cents_per_point = v_cents_per_point,
    status = 'calculating'
  WHERE period_year = p_year AND period_month = p_month;

  -- Distribuir a cada owner
  UPDATE community_rewards cr SET
    amount_cents = FLOOR(cr.total_points * v_cents_per_point),
    status = 'approved'
  WHERE cr.period_year = p_year
    AND cr.period_month = p_month
    AND cr.status = 'calculated';

  -- Actualizar total distribuido
  UPDATE reward_pool SET
    total_distributed_cents = (
      SELECT COALESCE(SUM(amount_cents), 0)
      FROM community_rewards
      WHERE period_year = p_year AND period_month = p_month AND status = 'approved'
    ),
    status = 'distributed'
  WHERE period_year = p_year AND period_month = p_month;

  -- Retornar distribución
  RETURN QUERY
  SELECT cr.owner_id, cr.amount_cents
  FROM community_rewards cr
  WHERE cr.period_year = p_year
    AND cr.period_month = p_month
    AND cr.status = 'approved';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 2.3 `process_comodato_booking_payment`
Procesa el pago de un booking tipo comodato (owner = $0).

```sql
CREATE OR REPLACE FUNCTION process_comodato_booking_payment(
  p_booking_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_booking bookings;
  v_total_cents BIGINT;
  v_platform_fee_cents BIGINT;
  v_reward_pool_cents BIGINT;
  v_fgo_cents BIGINT;
  v_pool_id UUID;
BEGIN
  -- Obtener booking
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking no encontrado';
  END IF;

  IF v_booking.agreement_type != 'comodato' THEN
    RAISE EXCEPTION 'Este booking no es de tipo comodato';
  END IF;

  -- Calcular distribución (15% platform, 75% rewards, 10% FGO)
  v_total_cents := v_booking.total_cents;
  v_platform_fee_cents := FLOOR(v_total_cents * 0.15);
  v_reward_pool_cents := FLOOR(v_total_cents * 0.75);
  v_fgo_cents := v_total_cents - v_platform_fee_cents - v_reward_pool_cents;

  -- Actualizar booking
  UPDATE bookings SET
    owner_payment_amount = 0, -- CERO para comodato
    platform_fee = v_platform_fee_cents / 100.0,
    reward_pool_contribution_cents = v_reward_pool_cents,
    fgo_contribution_cents = v_fgo_cents
  WHERE id = p_booking_id;

  -- Contribuir al reward pool del mes
  INSERT INTO reward_pool (period_year, period_month, contributions_cents)
  VALUES (
    EXTRACT(YEAR FROM now())::INT,
    EXTRACT(MONTH FROM now())::INT,
    v_reward_pool_cents
  )
  ON CONFLICT (period_year, period_month)
  DO UPDATE SET
    contributions_cents = reward_pool.contributions_cents + v_reward_pool_cents,
    updated_at = now();

  -- Contribuir al FGO (integrar con fgo_subfunds existente)

  RETURN jsonb_build_object(
    'booking_id', p_booking_id,
    'total_cents', v_total_cents,
    'platform_fee_cents', v_platform_fee_cents,
    'reward_pool_cents', v_reward_pool_cents,
    'fgo_cents', v_fgo_cents,
    'owner_payment_cents', 0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 2.4 `check_and_update_usage_limits`
Verifica y actualiza los límites de uso (bloqueo si excede).

```sql
CREATE OR REPLACE FUNCTION check_and_update_usage_limits(
  p_car_id UUID,
  p_days_to_add INT DEFAULT 1
) RETURNS JSONB AS $$
DECLARE
  v_limits owner_usage_limits;
  v_car cars;
  v_year INT := EXTRACT(YEAR FROM now())::INT;
  v_month INT := EXTRACT(MONTH FROM now())::INT;
  v_is_blocked BOOLEAN := false;
  v_block_reason TEXT;
BEGIN
  -- Obtener o crear registro de límites
  INSERT INTO owner_usage_limits (car_id, year, month, annual_expense_limit_cents)
  SELECT p_car_id, v_year, v_month, annual_expense_estimate_cents
  FROM cars WHERE id = p_car_id
  ON CONFLICT (car_id, year, month) DO NOTHING;

  SELECT * INTO v_limits FROM owner_usage_limits
  WHERE car_id = p_car_id AND year = v_year AND month = v_month;

  SELECT * INTO v_car FROM cars WHERE id = p_car_id;

  -- Verificar límite mensual
  IF v_limits.days_shared + p_days_to_add > v_limits.max_days_allowed THEN
    v_is_blocked := true;
    v_block_reason := 'Límite mensual de días alcanzado (' || v_limits.max_days_allowed || ' días)';
  END IF;

  -- Verificar días consecutivos (si hay límite definido)
  IF v_limits.max_consecutive_allowed IS NOT NULL
     AND v_limits.max_consecutive_allowed > 0
     AND v_limits.consecutive_days_current + p_days_to_add > v_limits.max_consecutive_allowed THEN
    v_is_blocked := true;
    v_block_reason := COALESCE(v_block_reason || '; ', '') ||
      'Límite de días consecutivos alcanzado (' || v_limits.max_consecutive_allowed || ' días)';
  END IF;

  -- Verificar límite anual de ganancias
  IF v_limits.ytd_earnings_cents >= COALESCE(v_limits.annual_expense_limit_cents, v_car.annual_expense_estimate_cents) THEN
    v_is_blocked := true;
    v_block_reason := COALESCE(v_block_reason || '; ', '') ||
      'Límite anual de compensación alcanzado';
  END IF;

  -- Actualizar si hay bloqueo
  IF v_is_blocked THEN
    UPDATE owner_usage_limits SET
      is_blocked = true,
      blocked_at = now(),
      block_reason = v_block_reason
    WHERE car_id = p_car_id AND year = v_year AND month = v_month;

    UPDATE cars SET
      sharing_suspended_at = now(),
      sharing_suspension_reason = v_block_reason
    WHERE id = p_car_id;
  END IF;

  RETURN jsonb_build_object(
    'car_id', p_car_id,
    'is_blocked', v_is_blocked,
    'block_reason', v_block_reason,
    'days_shared', v_limits.days_shared,
    'max_days_allowed', v_limits.max_days_allowed,
    'consecutive_days', v_limits.consecutive_days_current,
    'ytd_earnings_cents', v_limits.ytd_earnings_cents
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 2.5 `payout_community_rewards`
Paga los rewards aprobados a los wallets de los owners.

```sql
CREATE OR REPLACE FUNCTION payout_community_rewards(
  p_year INT,
  p_month INT
) RETURNS INT AS $$
DECLARE
  v_reward community_rewards;
  v_count INT := 0;
  v_transaction_id UUID;
BEGIN
  FOR v_reward IN
    SELECT * FROM community_rewards
    WHERE period_year = p_year
      AND period_month = p_month
      AND status = 'approved'
      AND amount_cents > 0
  LOOP
    -- Crear transacción de wallet
    INSERT INTO wallet_transactions (
      user_id, type, amount, currency, status,
      description, reference_type, reference_id
    ) VALUES (
      v_reward.owner_id,
      'community_reward',
      v_reward.amount_cents,
      v_reward.currency,
      'completed',
      'Reward de comunidad ' || p_year || '-' || LPAD(p_month::TEXT, 2, '0'),
      'community_reward',
      v_reward.id
    ) RETURNING id INTO v_transaction_id;

    -- Actualizar balance del wallet
    UPDATE user_wallets SET
      balance_cents = balance_cents + v_reward.amount_cents,
      available_balance_cents = available_balance_cents + v_reward.amount_cents,
      community_rewards_balance_cents = community_rewards_balance_cents + v_reward.amount_cents,
      updated_at = now()
    WHERE user_id = v_reward.owner_id;

    -- Marcar reward como pagado
    UPDATE community_rewards SET
      status = 'paid',
      paid_at = now(),
      wallet_transaction_id = v_transaction_id
    WHERE id = v_reward.id;

    v_count := v_count + 1;
  END LOOP;

  -- Cerrar pool
  UPDATE reward_pool SET
    status = 'closed',
    closed_at = now()
  WHERE period_year = p_year AND period_month = p_month;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

# 3. VISTAS NUEVAS

## 3.1 `v_owner_community_status`
Estado de cada owner en la comunidad.

```sql
CREATE OR REPLACE VIEW v_owner_community_status AS
SELECT
  p.id as owner_id,
  p.full_name,
  p.email,
  cm.status as membership_status,
  cm.tier,
  cm.joined_at,
  EXTRACT(MONTH FROM age(now(), cm.joined_at))::INT as months_in_community,
  p.rating_avg,
  p.rating_count,
  COALESCE(
    (SELECT SUM(cr.amount_cents)
     FROM community_rewards cr
     WHERE cr.owner_id = p.id AND cr.status = 'paid'),
    0
  ) as total_rewards_earned_cents,
  COALESCE(
    (SELECT cr.amount_cents
     FROM community_rewards cr
     WHERE cr.owner_id = p.id
     ORDER BY cr.period_year DESC, cr.period_month DESC
     LIMIT 1),
    0
  ) as last_reward_cents
FROM profiles p
LEFT JOIN community_memberships cm ON p.id = cm.owner_id
WHERE EXISTS (SELECT 1 FROM cars WHERE owner_id = p.id);
```

---

## 3.2 `v_car_sharing_status`
Estado de compartición de cada vehículo.

```sql
CREATE OR REPLACE VIEW v_car_sharing_status AS
SELECT
  c.id as car_id,
  c.owner_id,
  c.title,
  c.sharing_mode,
  c.annual_expense_estimate_cents,
  c.ytd_earnings_cents,
  c.earnings_limit_reached,
  COALESCE(l.days_shared, 0) as days_shared_this_month,
  COALESCE(l.max_days_allowed, 24) as max_days_allowed,
  COALESCE(l.personal_use_days, 0) as personal_use_days_this_month,
  COALESCE(l.is_blocked, false) as is_blocked,
  l.block_reason,
  CASE
    WHEN c.ytd_earnings_cents >= c.annual_expense_estimate_cents THEN true
    ELSE false
  END as annual_limit_reached,
  c.sharing_suspended_at,
  c.sharing_suspension_reason
FROM cars c
LEFT JOIN owner_usage_limits l ON c.id = l.car_id
  AND l.year = EXTRACT(YEAR FROM now())::INT
  AND l.month = EXTRACT(MONTH FROM now())::INT
WHERE c.sharing_mode IN ('comodato', 'rental');
```

---

## 3.3 `v_reward_pool_status`
Estado del pool de rewards mensual.

```sql
CREATE OR REPLACE VIEW v_reward_pool_status AS
SELECT
  rp.period_year,
  rp.period_month,
  rp.contributions_cents,
  rp.total_available_cents,
  rp.total_distributed_cents,
  rp.total_points_in_period,
  rp.cents_per_point,
  rp.status,
  (SELECT COUNT(*) FROM community_rewards cr
   WHERE cr.period_year = rp.period_year
     AND cr.period_month = rp.period_month
     AND cr.status IN ('calculated', 'approved', 'paid')) as total_owners,
  (SELECT AVG(amount_cents) FROM community_rewards cr
   WHERE cr.period_year = rp.period_year
     AND cr.period_month = rp.period_month
     AND cr.amount_cents > 0) as avg_reward_cents
FROM reward_pool rp
ORDER BY rp.period_year DESC, rp.period_month DESC;
```

---

# 4. TRIGGERS NUEVOS

## 4.1 Trigger para actualizar días compartidos

```sql
CREATE OR REPLACE FUNCTION trg_update_sharing_days()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.agreement_type = 'comodato' THEN
    UPDATE owner_usage_limits SET
      days_shared = days_shared + NEW.days_count,
      consecutive_days_current = consecutive_days_current + NEW.days_count,
      updated_at = now()
    WHERE car_id = NEW.car_id
      AND year = EXTRACT(YEAR FROM NEW.end_at)::INT
      AND month = EXTRACT(MONTH FROM NEW.end_at)::INT;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_booking_update_sharing_days
AFTER UPDATE OF status ON bookings
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
EXECUTE FUNCTION trg_update_sharing_days();
```

---

## 4.2 Trigger para crear registro de límites

```sql
CREATE OR REPLACE FUNCTION trg_ensure_usage_limits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO owner_usage_limits (car_id, year, month, annual_expense_limit_cents)
  SELECT
    NEW.car_id,
    EXTRACT(YEAR FROM NEW.start_at)::INT,
    EXTRACT(MONTH FROM NEW.start_at)::INT,
    c.annual_expense_estimate_cents
  FROM cars c
  WHERE c.id = NEW.car_id
  ON CONFLICT (car_id, year, month) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_booking_ensure_limits
BEFORE INSERT ON bookings
FOR EACH ROW
WHEN (NEW.agreement_type = 'comodato')
EXECUTE FUNCTION trg_ensure_usage_limits();
```

---

# 5. DATOS INICIALES

## 5.1 Configuración de platform_fee para comodato

```sql
INSERT INTO platform_fee_config (name, fee_type, fee_value, applies_to, active, valid_from) VALUES
  ('Comodato - Platform Fee', 'percentage', 0.15, 'comodato_booking', true, now()),
  ('Comodato - Reward Pool', 'percentage', 0.75, 'comodato_reward_pool', true, now()),
  ('Comodato - FGO Contribution', 'percentage', 0.10, 'comodato_fgo', true, now());
```

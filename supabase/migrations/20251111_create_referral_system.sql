-- ============================================
-- REFERRAL SYSTEM (Sistema de Referidos)
-- ============================================
-- Permite a los usuarios invitar a otros a convertirse en Renters
-- y ganar bonos/recompensas cuando completan acciones específicas

-- Tabla: referral_codes
-- Códigos únicos de referido por usuario
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ, -- NULL = nunca expira
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_uses INT, -- NULL = usos ilimitados
  current_uses INT NOT NULL DEFAULT 0,

  -- Constraints
  CONSTRAINT unique_user_active_code UNIQUE (user_id, is_active)
);

-- Índices para búsqueda rápida
CREATE INDEX idx_referral_codes_user_id ON public.referral_codes(user_id);
CREATE INDEX idx_referral_codes_code ON public.referral_codes(code) WHERE is_active = true;

-- Tabla: referrals
-- Tracking de invitaciones y su estado
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relaciones
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Quien invitó
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Quien fue invitado
  referral_code_id UUID NOT NULL REFERENCES public.referral_codes(id) ON DELETE CASCADE,

  -- Estado del referido
  status TEXT NOT NULL DEFAULT 'registered' CHECK (
    status IN (
      'registered',      -- Se registró con el código
      'verified',        -- Verificó su identidad
      'first_car',       -- Publicó su primer auto
      'first_booking',   -- Recibió su primera reserva
      'reward_paid'      -- Recompensa pagada
    )
  ),

  -- Tracking de progreso
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ,
  first_car_at TIMESTAMPTZ,
  first_booking_at TIMESTAMPTZ,
  reward_paid_at TIMESTAMPTZ,

  -- Metadata
  source TEXT, -- 'web', 'mobile', 'landing', etc.
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  CONSTRAINT unique_referral UNIQUE (referrer_id, referred_id)
);

-- Índices
CREATE INDEX idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_referred_id ON public.referrals(referred_id);
CREATE INDEX idx_referrals_status ON public.referrals(status);
CREATE INDEX idx_referrals_code_id ON public.referrals(referral_code_id);

-- Tabla: referral_rewards
-- Recompensas ganadas por referidos
CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relaciones
  referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Quien recibe la recompensa

  -- Detalles de la recompensa
  reward_type TEXT NOT NULL CHECK (
    reward_type IN (
      'welcome_bonus',      -- Bono de bienvenida para el nuevo renter
      'referrer_bonus',     -- Bono para quien invitó
      'first_car_bonus',    -- Bono al publicar primer auto
      'milestone_bonus',    -- Bonus por milestone (ej: 5 referidos)
      'promotion'           -- Promoción especial
    )
  ),
  amount_cents INT NOT NULL, -- Monto en centavos
  currency TEXT NOT NULL DEFAULT 'ARS',

  -- Estado
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'paid', 'expired', 'cancelled')
  ),

  -- Wallet transaction
  wallet_transaction_id UUID REFERENCES public.wallet_transactions(id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- Las recompensas pueden expirar

  -- Notas
  notes TEXT,
  admin_notes TEXT
);

-- Índices
CREATE INDEX idx_referral_rewards_referral_id ON public.referral_rewards(referral_id);
CREATE INDEX idx_referral_rewards_user_id ON public.referral_rewards(user_id);
CREATE INDEX idx_referral_rewards_status ON public.referral_rewards(status);

-- ============================================
-- RLS POLICIES
-- ============================================

-- referral_codes: Los usuarios pueden ver y crear sus propios códigos
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referral codes"
  ON public.referral_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own referral codes"
  ON public.referral_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own referral codes"
  ON public.referral_codes FOR UPDATE
  USING (auth.uid() = user_id);

-- referrals: Los usuarios pueden ver sus propios referidos
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Users can create referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (true); -- Cualquiera puede registrarse con un código

-- referral_rewards: Los usuarios pueden ver sus propias recompensas
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rewards"
  ON public.referral_rewards FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Función: generate_referral_code
-- Genera un código único de referido para un usuario
CREATE OR REPLACE FUNCTION public.generate_referral_code(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
  v_attempts INT := 0;
  v_max_attempts INT := 10;
BEGIN
  -- Verificar que el usuario existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Verificar si ya tiene un código activo
  SELECT code INTO v_code
  FROM public.referral_codes
  WHERE user_id = p_user_id AND is_active = true
  LIMIT 1;

  IF FOUND THEN
    RETURN v_code;
  END IF;

  -- Generar código único (6 caracteres alfanuméricos)
  LOOP
    v_code := upper(substring(md5(random()::text || p_user_id::text) from 1 for 6));

    -- Verificar si el código ya existe
    SELECT EXISTS(
      SELECT 1 FROM public.referral_codes WHERE code = v_code
    ) INTO v_exists;

    EXIT WHEN NOT v_exists;

    v_attempts := v_attempts + 1;
    IF v_attempts >= v_max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique code after % attempts', v_max_attempts;
    END IF;
  END LOOP;

  -- Insertar código
  INSERT INTO public.referral_codes (user_id, code)
  VALUES (p_user_id, v_code);

  RETURN v_code;
END;
$$;

-- Función: apply_referral_code
-- Aplica un código de referido cuando un usuario se registra
CREATE OR REPLACE FUNCTION public.apply_referral_code(
  p_referred_user_id UUID,
  p_code TEXT,
  p_source TEXT DEFAULT 'web'
)
RETURNS UUID -- referral_id
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referral_code_id UUID;
  v_referrer_id UUID;
  v_referral_id UUID;
BEGIN
  -- Buscar código activo
  SELECT id, user_id INTO v_referral_code_id, v_referrer_id
  FROM public.referral_codes
  WHERE code = p_code
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR current_uses < max_uses)
  FOR UPDATE; -- Lock para evitar race conditions

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired referral code: %', p_code;
  END IF;

  -- No puede referirse a sí mismo
  IF v_referrer_id = p_referred_user_id THEN
    RAISE EXCEPTION 'Cannot use own referral code';
  END IF;

  -- Verificar si ya fue referido
  IF EXISTS (
    SELECT 1 FROM public.referrals WHERE referred_id = p_referred_user_id
  ) THEN
    RAISE EXCEPTION 'User already referred';
  END IF;

  -- Crear referral
  INSERT INTO public.referrals (
    referrer_id,
    referred_id,
    referral_code_id,
    status,
    source
  ) VALUES (
    v_referrer_id,
    p_referred_user_id,
    v_referral_code_id,
    'registered',
    p_source
  ) RETURNING id INTO v_referral_id;

  -- Incrementar contador de usos
  UPDATE public.referral_codes
  SET current_uses = current_uses + 1
  WHERE id = v_referral_code_id;

  -- Crear bono de bienvenida para el referido
  INSERT INTO public.referral_rewards (
    referral_id,
    user_id,
    reward_type,
    amount_cents,
    currency,
    status,
    expires_at
  ) VALUES (
    v_referral_id,
    p_referred_user_id,
    'welcome_bonus',
    50000, -- $500 ARS de bienvenida
    'ARS',
    'pending',
    now() + interval '30 days'
  );

  RETURN v_referral_id;
END;
$$;

-- Función: complete_referral_milestone
-- Actualiza el estado del referido cuando completa un milestone
CREATE OR REPLACE FUNCTION public.complete_referral_milestone(
  p_referred_user_id UUID,
  p_milestone TEXT -- 'verified', 'first_car', 'first_booking'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referral_id UUID;
  v_referrer_id UUID;
  v_current_status TEXT;
BEGIN
  -- Buscar referral
  SELECT id, referrer_id, status INTO v_referral_id, v_referrer_id, v_current_status
  FROM public.referrals
  WHERE referred_id = p_referred_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false; -- No fue referido
  END IF;

  -- Actualizar según milestone
  CASE p_milestone
    WHEN 'verified' THEN
      IF v_current_status = 'registered' THEN
        UPDATE public.referrals
        SET status = 'verified', verified_at = now()
        WHERE id = v_referral_id;
      END IF;

    WHEN 'first_car' THEN
      IF v_current_status IN ('registered', 'verified') THEN
        UPDATE public.referrals
        SET status = 'first_car', first_car_at = now()
        WHERE id = v_referral_id;

        -- Dar bono al referido por publicar
        INSERT INTO public.referral_rewards (
          referral_id,
          user_id,
          reward_type,
          amount_cents,
          currency,
          status
        ) VALUES (
          v_referral_id,
          p_referred_user_id,
          'first_car_bonus',
          100000, -- $1000 ARS por publicar primer auto
          'ARS',
          'approved'
        );

        -- Dar bono al referrer
        INSERT INTO public.referral_rewards (
          referral_id,
          user_id,
          reward_type,
          amount_cents,
          currency,
          status
        ) VALUES (
          v_referral_id,
          v_referrer_id,
          'referrer_bonus',
          150000, -- $1500 ARS por referir
          'ARS',
          'approved'
        );
      END IF;

    WHEN 'first_booking' THEN
      IF v_current_status IN ('registered', 'verified', 'first_car') THEN
        UPDATE public.referrals
        SET status = 'first_booking', first_booking_at = now()
        WHERE id = v_referral_id;
      END IF;

    ELSE
      RAISE EXCEPTION 'Invalid milestone: %', p_milestone;
  END CASE;

  RETURN true;
END;
$$;

-- ============================================
-- VIEWS
-- ============================================

-- Vista: referral_stats_by_user
-- Estadísticas de referidos por usuario
CREATE OR REPLACE VIEW public.referral_stats_by_user AS
SELECT
  rc.user_id,
  rc.code,
  COUNT(r.id) AS total_referrals,
  COUNT(r.id) FILTER (WHERE r.status = 'registered') AS registered_count,
  COUNT(r.id) FILTER (WHERE r.status = 'verified') AS verified_count,
  COUNT(r.id) FILTER (WHERE r.status = 'first_car') AS first_car_count,
  COUNT(r.id) FILTER (WHERE r.status = 'first_booking') AS first_booking_count,
  COALESCE(SUM(rw.amount_cents) FILTER (WHERE rw.status = 'paid'), 0) AS total_earned_cents,
  COALESCE(SUM(rw.amount_cents) FILTER (WHERE rw.status IN ('pending', 'approved')), 0) AS pending_cents
FROM public.referral_codes rc
LEFT JOIN public.referrals r ON r.referral_code_id = rc.id
LEFT JOIN public.referral_rewards rw ON rw.referral_id = r.id AND rw.user_id = rc.user_id
WHERE rc.is_active = true
GROUP BY rc.user_id, rc.code;

-- Comentarios
COMMENT ON TABLE public.referral_codes IS 'Códigos únicos de referido por usuario';
COMMENT ON TABLE public.referrals IS 'Tracking de invitaciones y su estado';
COMMENT ON TABLE public.referral_rewards IS 'Recompensas ganadas por referidos';
COMMENT ON FUNCTION public.generate_referral_code IS 'Genera un código único de referido';
COMMENT ON FUNCTION public.apply_referral_code IS 'Aplica un código cuando un usuario se registra';
COMMENT ON FUNCTION public.complete_referral_milestone IS 'Marca milestone completado y otorga recompensas';

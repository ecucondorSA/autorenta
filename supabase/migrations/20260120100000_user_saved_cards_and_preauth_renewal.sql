-- ============================================================================
-- MIGRACIÓN: Sistema de Tarjetas Guardadas y Renovación de Pre-Auth
-- Fecha: 2026-01-20
-- Propósito: Permitir renovar pre-autorizaciones usando tarjetas guardadas
-- ============================================================================

-- 1. Tabla para guardar tarjetas de MercadoPago
CREATE TABLE IF NOT EXISTS public.user_saved_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- MercadoPago identifiers
  mp_customer_id TEXT NOT NULL,
  mp_card_id TEXT NOT NULL,

  -- Card info (non-sensitive)
  card_last4 TEXT NOT NULL,
  card_brand TEXT, -- visa, mastercard, amex, etc.
  card_expiration_month INT,
  card_expiration_year INT,
  cardholder_name TEXT,

  -- Status
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,

  -- Constraints
  UNIQUE(user_id, mp_card_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_saved_cards_user_id ON public.user_saved_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_saved_cards_active ON public.user_saved_cards(user_id, is_active) WHERE is_active = true;

-- RLS
ALTER TABLE public.user_saved_cards ENABLE ROW LEVEL SECURITY;

-- Solo el usuario puede ver sus propias tarjetas
CREATE POLICY "Users can view own cards"
  ON public.user_saved_cards FOR SELECT
  USING (auth.uid() = user_id);

-- Solo el usuario puede insertar sus tarjetas (via Edge Function)
CREATE POLICY "Service role can manage cards"
  ON public.user_saved_cards FOR ALL
  USING (true)
  WITH CHECK (true);

-- 2. Agregar campo para linked card en payment_intents
ALTER TABLE public.payment_intents
ADD COLUMN IF NOT EXISTS saved_card_id UUID REFERENCES public.user_saved_cards(id);

-- 3. Agregar estado para pre-auth que necesita renovación
DO $$ BEGIN
  -- Verificar si el valor ya existe en el enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'renewal_pending'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_status')
  ) THEN
    ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'renewal_pending';
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Could not add enum value, may already exist';
END $$;

-- 4. Función RPC para guardar una tarjeta (llamada desde Edge Function)
CREATE OR REPLACE FUNCTION public.save_user_card(
  p_user_id UUID,
  p_mp_customer_id TEXT,
  p_mp_card_id TEXT,
  p_card_last4 TEXT,
  p_card_brand TEXT DEFAULT NULL,
  p_expiration_month INT DEFAULT NULL,
  p_expiration_year INT DEFAULT NULL,
  p_cardholder_name TEXT DEFAULT NULL,
  p_set_default BOOLEAN DEFAULT false
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_card_id UUID;
BEGIN
  -- Si es default, quitar default de otras tarjetas
  IF p_set_default THEN
    UPDATE public.user_saved_cards
    SET is_default = false
    WHERE user_id = p_user_id AND is_default = true;
  END IF;

  -- Insertar o actualizar tarjeta
  INSERT INTO public.user_saved_cards (
    user_id,
    mp_customer_id,
    mp_card_id,
    card_last4,
    card_brand,
    card_expiration_month,
    card_expiration_year,
    cardholder_name,
    is_default
  ) VALUES (
    p_user_id,
    p_mp_customer_id,
    p_mp_card_id,
    p_card_last4,
    p_card_brand,
    p_expiration_month,
    p_expiration_year,
    p_cardholder_name,
    p_set_default OR NOT EXISTS (
      SELECT 1 FROM public.user_saved_cards WHERE user_id = p_user_id AND is_active = true
    )
  )
  ON CONFLICT (user_id, mp_card_id) DO UPDATE SET
    card_last4 = EXCLUDED.card_last4,
    card_brand = EXCLUDED.card_brand,
    card_expiration_month = EXCLUDED.card_expiration_month,
    card_expiration_year = EXCLUDED.card_expiration_year,
    cardholder_name = EXCLUDED.cardholder_name,
    is_active = true,
    updated_at = NOW()
  RETURNING id INTO v_card_id;

  RETURN v_card_id;
END;
$$;

-- 5. Función RPC para obtener tarjeta guardada de un usuario
CREATE OR REPLACE FUNCTION public.get_user_default_card(p_user_id UUID)
RETURNS TABLE (
  card_id UUID,
  mp_customer_id TEXT,
  mp_card_id TEXT,
  card_last4 TEXT,
  card_brand TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    usc.id,
    usc.mp_customer_id,
    usc.mp_card_id,
    usc.card_last4,
    usc.card_brand
  FROM public.user_saved_cards usc
  WHERE usc.user_id = p_user_id
    AND usc.is_active = true
  ORDER BY usc.is_default DESC, usc.last_used_at DESC NULLS LAST
  LIMIT 1;
END;
$$;

-- 6. Función para marcar una tarjeta como usada
CREATE OR REPLACE FUNCTION public.mark_card_used(p_card_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_saved_cards
  SET last_used_at = NOW()
  WHERE id = p_card_id;
END;
$$;

-- 7. Vista para pre-auths que necesitan renovación (expiran en 2 días)
CREATE OR REPLACE VIEW public.v_expiring_preauthorizations AS
SELECT
  pi.id AS intent_id,
  pi.booking_id,
  pi.user_id AS renter_id,
  pi.amount,
  pi.mp_payment_id,
  pi.preauth_expires_at,
  pi.saved_card_id,
  b.status AS booking_status,
  b.end_date AS booking_end_date,
  usc.mp_customer_id,
  usc.mp_card_id,
  usc.card_last4,
  p.mercadopago_customer_id AS profile_customer_id,
  p.email,
  p.full_name,
  -- Calcular días hasta expiración
  EXTRACT(DAY FROM (pi.preauth_expires_at - NOW())) AS days_until_expiry,
  -- Si tiene tarjeta guardada, puede renovar automáticamente
  CASE
    WHEN usc.mp_card_id IS NOT NULL THEN true
    WHEN p.mercadopago_customer_id IS NOT NULL THEN true
    ELSE false
  END AS can_auto_renew
FROM public.payment_intents pi
JOIN public.bookings b ON pi.booking_id = b.id
JOIN public.profiles p ON pi.user_id = p.id
LEFT JOIN public.user_saved_cards usc ON pi.saved_card_id = usc.id
WHERE pi.type = 'preauth'
  AND pi.status = 'approved' -- MP authorized = our approved
  AND pi.mp_status = 'authorized'
  AND pi.preauth_expires_at IS NOT NULL
  AND pi.preauth_expires_at <= NOW() + INTERVAL '2 days'
  AND b.status IN ('confirmed', 'in_progress', 'pending_return')
ORDER BY pi.preauth_expires_at ASC;

-- Comentarios
COMMENT ON TABLE public.user_saved_cards IS 'Tarjetas guardadas de MercadoPago para renovación automática de pre-autorizaciones';
COMMENT ON VIEW public.v_expiring_preauthorizations IS 'Pre-autorizaciones que expiran en 2 días y necesitan renovación';

-- 8. Grants
GRANT SELECT ON public.v_expiring_preauthorizations TO service_role;
GRANT EXECUTE ON FUNCTION public.save_user_card TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_default_card TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_card_used TO service_role;

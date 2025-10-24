-- ============================================================================
-- PAYMENT INTENTS & PREAUTHORIZATION SYSTEM
-- ============================================================================
-- Sistema completo de preautorizaciones (holds) con Mercado Pago
-- Basado en Checkout API v1 con capture=false
-- ============================================================================

-- ============================================================================
-- TABLE: payment_intents
-- ============================================================================
-- Almacena intents de pago (preautorizaciones y cobros)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payment_intents (
  -- Identificación
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relaciones
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,

  -- Mercado Pago
  mp_payment_id text UNIQUE, -- ID del pago en MP
  mp_status text, -- authorized, captured, cancelled, expired, pending, approved, rejected
  mp_status_detail text,

  -- Tipo de intent
  intent_type text NOT NULL CHECK (intent_type IN ('preauth', 'charge', 'deposit')),

  -- Montos
  amount_usd numeric(12, 2) NOT NULL CHECK (amount_usd > 0),
  amount_ars numeric(12, 2) NOT NULL CHECK (amount_ars > 0),
  amount_captured_ars numeric(12, 2) DEFAULT 0 CHECK (amount_captured_ars >= 0),
  fx_rate numeric(12, 4) NOT NULL,

  -- Método de pago
  payment_method_id text, -- visa, master, etc
  card_last4 text,
  card_holder_name text,

  -- Preautorización específica
  is_preauth boolean DEFAULT false,
  preauth_expires_at timestamptz, -- authorized_at + 7 días

  -- Estado
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',       -- Creado, esperando autorización
    'authorized',    -- Preauth exitosa (hold activo)
    'captured',      -- Preauth capturada (cobrada)
    'cancelled',     -- Preauth cancelada (liberada)
    'expired',       -- Preauth expiró (7 días)
    'approved',      -- Cobro directo aprobado
    'rejected',      -- Rechazado
    'failed'         -- Error técnico
  )),

  -- Descripción
  description text,
  external_reference text, -- Para tracking

  -- Metadata
  metadata jsonb DEFAULT '{}',

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  authorized_at timestamptz,
  captured_at timestamptz,
  cancelled_at timestamptz,
  expired_at timestamptz
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_payment_intents_user_id ON public.payment_intents(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_booking_id ON public.payment_intents(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_mp_payment_id ON public.payment_intents(mp_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON public.payment_intents(status);
CREATE INDEX IF NOT EXISTS idx_payment_intents_intent_type ON public.payment_intents(intent_type);
CREATE INDEX IF NOT EXISTS idx_payment_intents_is_preauth ON public.payment_intents(is_preauth) WHERE is_preauth = true;
CREATE INDEX IF NOT EXISTS idx_payment_intents_preauth_expires ON public.payment_intents(preauth_expires_at) WHERE is_preauth = true AND status = 'authorized';

-- ============================================================================
-- TRIGGER: updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_payment_intents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_payment_intents_updated_at
  BEFORE UPDATE ON public.payment_intents
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_intents_updated_at();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

-- Users can view their own payment intents
CREATE POLICY "Users can view own payment intents"
  ON public.payment_intents FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own payment intents (via service/functions)
CREATE POLICY "Users can insert own payment intents"
  ON public.payment_intents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only service role can update payment intents (webhooks)
CREATE POLICY "Service role can update payment intents"
  ON public.payment_intents FOR UPDATE
  USING (auth.role() = 'service_role');

-- Admins can view all
CREATE POLICY "Admins can view all payment intents"
  ON public.payment_intents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- RPC: create_payment_authorization
-- ============================================================================
-- Crea un intent de preautorización
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_payment_authorization(
  p_user_id uuid,
  p_booking_id uuid,
  p_amount_usd numeric,
  p_amount_ars numeric,
  p_fx_rate numeric,
  p_description text DEFAULT 'Preautorización de garantía',
  p_external_reference text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_intent_id uuid;
  v_result jsonb;
BEGIN
  -- Insertar payment intent
  INSERT INTO public.payment_intents (
    user_id,
    booking_id,
    intent_type,
    is_preauth,
    amount_usd,
    amount_ars,
    fx_rate,
    status,
    description,
    external_reference
  ) VALUES (
    p_user_id,
    p_booking_id,
    'preauth',
    true,
    p_amount_usd,
    p_amount_ars,
    p_fx_rate,
    'pending',
    p_description,
    COALESCE(p_external_reference, 'preauth_' || gen_random_uuid()::text)
  )
  RETURNING id INTO v_intent_id;

  -- Retornar resultado
  SELECT jsonb_build_object(
    'success', true,
    'intent_id', v_intent_id,
    'external_reference', external_reference
  )
  INTO v_result
  FROM public.payment_intents
  WHERE id = v_intent_id;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- ============================================================================
-- RPC: update_payment_intent_status
-- ============================================================================
-- Actualiza estado de un intent (usado por webhooks)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_payment_intent_status(
  p_mp_payment_id text,
  p_mp_status text,
  p_mp_status_detail text DEFAULT NULL,
  p_payment_method_id text DEFAULT NULL,
  p_card_last4 text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_intent_id uuid;
  v_new_status text;
  v_timestamp_field text;
BEGIN
  -- Mapear mp_status a nuestro status interno
  v_new_status := CASE p_mp_status
    WHEN 'authorized' THEN 'authorized'
    WHEN 'approved' THEN 'captured'
    WHEN 'cancelled' THEN 'cancelled'
    WHEN 'expired' THEN 'expired'
    WHEN 'rejected' THEN 'rejected'
    WHEN 'pending' THEN 'pending'
    ELSE 'failed'
  END;

  -- Determinar campo timestamp a actualizar
  v_timestamp_field := CASE v_new_status
    WHEN 'authorized' THEN 'authorized_at'
    WHEN 'captured' THEN 'captured_at'
    WHEN 'cancelled' THEN 'cancelled_at'
    WHEN 'expired' THEN 'expired_at'
    ELSE NULL
  END;

  -- Actualizar intent
  UPDATE public.payment_intents
  SET
    mp_payment_id = p_mp_payment_id,
    mp_status = p_mp_status,
    mp_status_detail = p_mp_status_detail,
    status = v_new_status,
    payment_method_id = COALESCE(p_payment_method_id, payment_method_id),
    card_last4 = COALESCE(p_card_last4, card_last4),
    metadata = metadata || p_metadata,
    -- Actualizar timestamp correspondiente
    authorized_at = CASE WHEN v_timestamp_field = 'authorized_at' THEN now() ELSE authorized_at END,
    captured_at = CASE WHEN v_timestamp_field = 'captured_at' THEN now() ELSE captured_at END,
    cancelled_at = CASE WHEN v_timestamp_field = 'cancelled_at' THEN now() ELSE cancelled_at END,
    expired_at = CASE WHEN v_timestamp_field = 'expired_at' THEN now() ELSE expired_at END,
    -- Calcular preauth_expires_at si es autorización
    preauth_expires_at = CASE
      WHEN v_new_status = 'authorized' AND is_preauth THEN now() + interval '7 days'
      ELSE preauth_expires_at
    END
  WHERE mp_payment_id = p_mp_payment_id
  RETURNING id INTO v_intent_id;

  IF v_intent_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Payment intent not found'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'intent_id', v_intent_id,
    'new_status', v_new_status
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- ============================================================================
-- COMENTARIOS
-- ============================================================================

COMMENT ON TABLE public.payment_intents IS
'Almacena todos los intents de pago: preautorizaciones (holds), cobros directos y depósitos.
Para preauth: capture=false en MP, ventana de 7 días para capturar o cancelar.';

COMMENT ON COLUMN public.payment_intents.is_preauth IS
'true = preautorización con capture=false. false = cobro directo con capture=true';

COMMENT ON COLUMN public.payment_intents.preauth_expires_at IS
'Para preauth: authorized_at + 7 días. Después expira automáticamente.';

COMMENT ON FUNCTION public.create_payment_authorization IS
'Crea un intent de preautorización (hold) para garantía de booking.
Retorna intent_id y external_reference para usar con Mercado Pago.';

COMMENT ON FUNCTION public.update_payment_intent_status IS
'Actualiza estado de un payment intent desde webhook de Mercado Pago.
Mapea estados de MP a estados internos y actualiza timestamps.';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.payment_intents TO authenticated;
GRANT INSERT ON public.payment_intents TO authenticated;
GRANT ALL ON public.payment_intents TO service_role;

-- ============================================================================
-- FIN
-- ============================================================================

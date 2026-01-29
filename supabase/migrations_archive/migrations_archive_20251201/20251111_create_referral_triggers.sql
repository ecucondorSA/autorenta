-- ============================================
-- REFERRAL SYSTEM TRIGGERS
-- ============================================
-- Triggers automáticos para el sistema de referidos

-- Trigger: auto_generate_referral_code_on_first_car
-- Genera automáticamente un código de referido cuando un usuario publica su primer auto
CREATE OR REPLACE FUNCTION public.auto_generate_referral_code_on_first_car()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_first_car BOOLEAN;
BEGIN
  -- Solo para INSERTs de nuevos autos
  IF TG_OP = 'INSERT' THEN
    -- Verificar si es el primer auto del usuario
    SELECT COUNT(*) = 1 INTO v_is_first_car
    FROM public.cars
    WHERE owner_id = NEW.owner_id;

    IF v_is_first_car THEN
      -- Generar código si no existe
      PERFORM public.generate_referral_code(NEW.owner_id);

      -- Completar milestone si fue referido
      PERFORM public.complete_referral_milestone(NEW.owner_id, 'first_car');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Aplicar trigger a la tabla cars
DROP TRIGGER IF EXISTS trigger_auto_generate_referral_code ON public.cars;
CREATE TRIGGER trigger_auto_generate_referral_code
  AFTER INSERT ON public.cars
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_referral_code_on_first_car();

-- Trigger: auto_complete_first_booking_milestone
-- Marca el milestone cuando un Renter recibe su primera reserva
CREATE OR REPLACE FUNCTION public.auto_complete_first_booking_milestone()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_first_booking BOOLEAN;
  v_car_owner_id UUID;
BEGIN
  -- Solo para INSERTs con estado 'approved' o mayor
  IF TG_OP = 'INSERT' AND NEW.status IN ('approved', 'active', 'completed') THEN
    -- Obtener owner_id del auto
    SELECT owner_id INTO v_car_owner_id
    FROM public.cars
    WHERE id = NEW.car_id;

    -- Verificar si es la primera booking del owner
    SELECT COUNT(*) = 1 INTO v_is_first_booking
    FROM public.bookings b
    JOIN public.cars c ON c.id = b.car_id
    WHERE c.owner_id = v_car_owner_id
      AND b.status IN ('approved', 'active', 'completed');

    IF v_is_first_booking THEN
      -- Completar milestone
      PERFORM public.complete_referral_milestone(v_car_owner_id, 'first_booking');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Aplicar trigger a la tabla bookings
DROP TRIGGER IF EXISTS trigger_auto_complete_first_booking ON public.bookings;
CREATE TRIGGER trigger_auto_complete_first_booking
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_complete_first_booking_milestone();

-- Trigger: auto_payout_approved_rewards
-- Paga automáticamente las recompensas aprobadas a la wallet
CREATE OR REPLACE FUNCTION public.auto_payout_approved_rewards()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet_transaction_id UUID;
BEGIN
  -- Solo cuando cambia a 'approved' y no tiene wallet_transaction_id
  IF NEW.status = 'approved' AND OLD.status != 'approved' AND NEW.wallet_transaction_id IS NULL THEN
    -- Crear transacción en la wallet
    INSERT INTO public.wallet_transactions (
      user_id,
      type,
      amount,
      currency,
      status,
      description,
      reference_type,
      reference_id
    ) VALUES (
      NEW.user_id,
      'deposit',
      NEW.amount_cents / 100.0, -- Convertir centavos a unidad
      NEW.currency,
      'completed',
      CASE NEW.reward_type
        WHEN 'welcome_bonus' THEN 'Bono de bienvenida - Programa de referidos'
        WHEN 'referrer_bonus' THEN 'Bono por referir nuevo Renter'
        WHEN 'first_car_bonus' THEN 'Bono por publicar tu primer auto'
        WHEN 'milestone_bonus' THEN 'Bono por milestone de referidos'
        ELSE 'Bono del programa de referidos'
      END,
      'referral_reward',
      NEW.id::text
    ) RETURNING id INTO v_wallet_transaction_id;

    -- Actualizar el balance de la wallet
    INSERT INTO public.wallet_balance (user_id, balance, currency)
    VALUES (NEW.user_id, NEW.amount_cents / 100.0, NEW.currency)
    ON CONFLICT (user_id, currency)
    DO UPDATE SET
      balance = wallet_balance.balance + EXCLUDED.balance,
      updated_at = now();

    -- Actualizar la recompensa con el ID de la transacción
    UPDATE public.referral_rewards
    SET
      wallet_transaction_id = v_wallet_transaction_id,
      status = 'paid',
      paid_at = now()
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Aplicar trigger a la tabla referral_rewards
DROP TRIGGER IF EXISTS trigger_auto_payout_rewards ON public.referral_rewards;
CREATE TRIGGER trigger_auto_payout_rewards
  AFTER UPDATE ON public.referral_rewards
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_payout_approved_rewards();

-- Comentarios
COMMENT ON FUNCTION public.auto_generate_referral_code_on_first_car IS 'Auto-genera código de referido al publicar primer auto';
COMMENT ON FUNCTION public.auto_complete_first_booking_milestone IS 'Marca milestone cuando recibe primera reserva';
COMMENT ON FUNCTION public.auto_payout_approved_rewards IS 'Paga recompensas aprobadas automáticamente a wallet';

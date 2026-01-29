-- ============================================
-- UPDATE REFERRAL REWARDS TO USD
-- ============================================
-- Changes default currency from ARS to USD and updates reward amounts
-- New amounts (in cents):
--   - Welcome bonus: $10 USD (1000 cents)
--   - First car bonus: $20 USD (2000 cents)
--   - Referrer bonus: $25 USD (2500 cents)

-- 1. Change default currency to USD
ALTER TABLE public.referral_rewards
  ALTER COLUMN currency SET DEFAULT 'USD';

-- 2. Update the apply_referral_code function with new amounts
CREATE OR REPLACE FUNCTION public.apply_referral_code(
  p_referred_user_id UUID,
  p_code TEXT,
  p_source TEXT DEFAULT 'web'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referral_code_id UUID;
  v_referrer_id UUID;
  v_referral_id UUID;
BEGIN
  -- Find active code
  SELECT id, user_id INTO v_referral_code_id, v_referrer_id
  FROM public.referral_codes
  WHERE code = p_code
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR current_uses < max_uses)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired referral code: %', p_code;
  END IF;

  -- Cannot refer yourself
  IF v_referrer_id = p_referred_user_id THEN
    RAISE EXCEPTION 'Cannot use own referral code';
  END IF;

  -- Check if already referred
  IF EXISTS (
    SELECT 1 FROM public.referrals WHERE referred_id = p_referred_user_id
  ) THEN
    RAISE EXCEPTION 'User already referred';
  END IF;

  -- Create referral
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

  -- Increment usage counter
  UPDATE public.referral_codes
  SET current_uses = current_uses + 1
  WHERE id = v_referral_code_id;

  -- Create welcome bonus for the referred user ($10 USD)
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
    1000, -- $10 USD
    'USD',
    'pending',
    now() + interval '30 days'
  );

  RETURN v_referral_id;
END;
$$;

-- 3. Update the complete_referral_milestone function with new amounts
CREATE OR REPLACE FUNCTION public.complete_referral_milestone(
  p_referred_user_id UUID,
  p_milestone TEXT
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
  -- Find referral
  SELECT id, referrer_id, status INTO v_referral_id, v_referrer_id, v_current_status
  FROM public.referrals
  WHERE referred_id = p_referred_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Update based on milestone
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

        -- Bonus for referred user for publishing first car ($20 USD)
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
          2000, -- $20 USD
          'USD',
          'approved'
        );

        -- Bonus for referrer ($25 USD)
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
          2500, -- $25 USD
          'USD',
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

-- 4. Update existing pending rewards to USD (convert at approximate rate)
-- Only update rewards that haven't been paid yet
UPDATE public.referral_rewards
SET
  currency = 'USD',
  amount_cents = CASE reward_type
    WHEN 'welcome_bonus' THEN 1000      -- $10 USD
    WHEN 'first_car_bonus' THEN 2000    -- $20 USD
    WHEN 'referrer_bonus' THEN 2500     -- $25 USD
    ELSE amount_cents / 1000            -- Generic conversion for other types
  END
WHERE currency = 'ARS'
  AND status IN ('pending', 'approved');

-- Add comment
COMMENT ON FUNCTION public.apply_referral_code IS 'Applies referral code on registration. Rewards in USD: Welcome $10, First car $20, Referrer $25';
COMMENT ON FUNCTION public.complete_referral_milestone IS 'Marks milestone complete and grants USD rewards';

-- ============================================================================
-- FIX: generate_referral_code ON CONFLICT constraint mismatch
-- Problem: RPC uses ON CONFLICT (user_id) but actual constraint is
--          unique_user_active_code UNIQUE (user_id, is_active)
-- Fix: Use ON CONFLICT ON CONSTRAINT unique_user_active_code
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_referral_code(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  -- Check if user already has an active code
  SELECT code INTO new_code
  FROM public.referral_codes
  WHERE user_id = p_user_id AND is_active = true;

  IF new_code IS NOT NULL THEN
    RETURN new_code;
  END IF;

  -- Generate unique code
  LOOP
    new_code := upper(substring(md5(random()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM public.referral_codes WHERE code = new_code) INTO code_exists;
    IF NOT code_exists THEN
      INSERT INTO public.referral_codes (user_id, code, current_uses, is_active)
      VALUES (p_user_id, new_code, 0, true)
      ON CONFLICT ON CONSTRAINT unique_user_active_code
      DO UPDATE SET code = EXCLUDED.code;

      SELECT code INTO new_code FROM public.referral_codes WHERE user_id = p_user_id AND is_active = true;
      EXIT;
    END IF;
  END LOOP;

  RETURN new_code;
END;
$$;

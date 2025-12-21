-- =============================================
-- AUTORENTA SCORE & TIERS SYSTEM
-- Extends Bonus-Malus to implement "Sesame Credit" style tiers
-- Version: 1.0.0
-- =============================================

-- 1. Agregar columna 'tier' a user_bonus_malus si no existe
ALTER TABLE public.user_bonus_malus 
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'standard' CHECK (tier IN ('standard', 'trusted', 'elite'));

COMMENT ON COLUMN public.user_bonus_malus.tier IS 'Nivel de confianza del usuario: standard, trusted, elite';

-- 2. Función para calcular y actualizar el nivel basado en el total_factor y verificación
CREATE OR REPLACE FUNCTION public.update_user_tier()
RETURNS TRIGGER AS $$
BEGIN
  -- Lógica de Niveles:
  -- ELITE: Factor <= -0.05 (Bonus alto) Y Verificado
  -- TRUSTED: Factor <= 0.0 (Bonus/Neutral) Y Verificado
  -- STANDARD: Cualquier otro caso (Factor positivo o No verificado)
  
  -- Verificar si el usuario está verificado (usando la métrica guardada en jsonb o consultando profile)
  -- Asumimos que 'metrics'->>'is_verified' está actualizado por calculate_user_bonus_malus
  
  IF (NEW.metrics->>'is_verified')::boolean IS TRUE THEN
    IF NEW.total_factor <= -0.05 THEN
      NEW.tier := 'elite';
    ELSIF NEW.total_factor <= 0.0 THEN
      NEW.tier := 'trusted';
    ELSE
      NEW.tier := 'standard';
    END IF;
  ELSE
    NEW.tier := 'standard'; -- No verificado siempre es standard
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger para actualizar el tier automáticamente antes de guardar en user_bonus_malus
DROP TRIGGER IF EXISTS trg_update_user_tier ON public.user_bonus_malus;

CREATE TRIGGER trg_update_user_tier
  BEFORE INSERT OR UPDATE OF total_factor, metrics ON public.user_bonus_malus
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_tier();

-- 4. Función para determinar si requiere depósito
CREATE OR REPLACE FUNCTION public.requires_security_deposit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_tier TEXT;
BEGIN
  SELECT tier INTO v_tier
  FROM public.user_bonus_malus
  WHERE user_id = p_user_id;
  
  -- Elite users NO pagan depósito
  IF v_tier = 'elite' THEN
    RETURN FALSE;
  END IF;
  
  -- Trusted y Standard SI pagan (Trusted podría tener descuento, pero la lógica binaria es esta)
  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.requires_security_deposit IS 'Determina si un usuario debe pagar depósito de garantía basado en su nivel';

-- 5. Función para obtener el descuento de depósito (si aplica)
CREATE OR REPLACE FUNCTION public.get_deposit_discount_percentage(p_user_id UUID)
RETURNS DECIMAL(3,2)
LANGUAGE plpgsql
AS $$
DECLARE
  v_tier TEXT;
BEGIN
  SELECT tier INTO v_tier
  FROM public.user_bonus_malus
  WHERE user_id = p_user_id;
  
  IF v_tier = 'elite' THEN
    RETURN 1.00; -- 100% de descuento (gratis)
  ELSIF v_tier = 'trusted' THEN
    RETURN 0.50; -- 50% de descuento
  ELSE
    RETURN 0.00; -- 0% de descuento (paga full)
  END IF;
END;
$$;

COMMENT ON FUNCTION public.get_deposit_discount_percentage IS 'Devuelve el porcentaje de descuento en el depósito (0.0 a 1.0)';

-- Grants
GRANT EXECUTE ON FUNCTION public.requires_security_deposit TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_deposit_discount_percentage TO authenticated, anon;

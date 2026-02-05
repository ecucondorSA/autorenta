-- ============================================================================
-- FIX: Align remote_config with Comodato 15-70-15 Model
-- ============================================================================
-- Previous values were inconsistent with the comodato_split_model migration
-- This fixes PLATFORM_FEE_RATE and adds REWARD_POOL_RATE for clarity
-- ============================================================================

BEGIN;

-- Update PLATFORM_FEE_RATE from 10% to 15%
UPDATE public.remote_config
SET
  value = '0.15',
  description = 'Fee de la plataforma - Modelo Comodato (15%)'
WHERE key = 'PLATFORM_FEE_RATE';

-- Rename OWNER_COMMISSION_RATE to REWARD_POOL_RATE (more accurate for comodato)
UPDATE public.remote_config
SET
  key = 'REWARD_POOL_RATE',
  value = '0.70',
  description = 'Porcentaje al Reward Pool - Modelo Comodato (70%)'
WHERE key = 'OWNER_COMMISSION_RATE';

-- Add FGO_CONTRIBUTION_RATE if not exists
INSERT INTO public.remote_config (key, value, description, category, environment)
SELECT 'FGO_CONTRIBUTION_RATE', '0.15', 'Aporte al Fondo de Garantía - Modelo Comodato (15%)', 'business', 'production'
WHERE NOT EXISTS (
  SELECT 1 FROM public.remote_config WHERE key = 'FGO_CONTRIBUTION_RATE'
);

-- Add comment documenting the model
COMMENT ON TABLE public.remote_config IS
'Remote configuration values. Modelo Comodato: 15% platform, 70% reward pool, 15% FGO';

COMMIT;

-- Verify
SELECT key, value, description
FROM public.remote_config
WHERE key IN ('PLATFORM_FEE_RATE', 'REWARD_POOL_RATE', 'FGO_CONTRIBUTION_RATE')
ORDER BY key;

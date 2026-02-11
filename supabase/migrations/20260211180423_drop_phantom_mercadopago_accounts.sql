-- ============================================================================
-- Migration: Drop phantom mercadopago_accounts table
-- Date: 2026-02-11
-- Issue: Table was defined in phantom migration but never existed in production.
--        OAuth tokens live in profiles table (11 columns added in 180420).
--
-- Rule #0: Zero dead code.
-- ============================================================================

-- IF EXISTS handles both cases: table never created, or table exists but empty
DROP TABLE IF EXISTS public.mercadopago_accounts CASCADE;

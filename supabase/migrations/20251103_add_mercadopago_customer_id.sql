-- =============================================
-- Agregar campo mercadopago_customer_id a profiles
-- Fecha: 2025-11-03
-- Descripción: Campo para almacenar Customer ID de MercadoPago
-- =============================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mercadopago_customer_id TEXT;

COMMENT ON COLUMN public.profiles.mercadopago_customer_id IS 'Customer ID de MercadoPago para Customers API. Se crea automáticamente en el primer pago.';

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_profiles_mercadopago_customer_id 
  ON public.profiles(mercadopago_customer_id) 
  WHERE mercadopago_customer_id IS NOT NULL;





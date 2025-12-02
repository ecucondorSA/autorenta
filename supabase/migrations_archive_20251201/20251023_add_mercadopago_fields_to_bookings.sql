-- Migration: Add MercadoPago fields to bookings table
-- Purpose: Support MercadoPago payment integration for bookings
-- Date: 2025-10-23

-- Add MercadoPago preference tracking fields
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS mercadopago_preference_id TEXT,
ADD COLUMN IF NOT EXISTS mercadopago_init_point TEXT;

-- Add comments
COMMENT ON COLUMN bookings.mercadopago_preference_id IS 'ID de la preferencia creada en MercadoPago para este booking';
COMMENT ON COLUMN bookings.mercadopago_init_point IS 'URL de checkout de MercadoPago para completar el pago';

-- Create index for faster lookups by preference_id (used in webhook)
CREATE INDEX IF NOT EXISTS idx_bookings_mercadopago_preference
ON bookings(mercadopago_preference_id)
WHERE mercadopago_preference_id IS NOT NULL;

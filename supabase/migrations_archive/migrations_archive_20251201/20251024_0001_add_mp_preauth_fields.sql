-- migration_name: 0001_add_mp_preauth_fields
-- Up Migration

-- Add mp_order_id and mp_order_status to payment_intents
ALTER TABLE public.payment_intents
ADD COLUMN mp_order_id TEXT,
ADD COLUMN mp_order_status TEXT;

-- Add mp_security_deposit_order_id to bookings
ALTER TABLE public.bookings
ADD COLUMN mp_security_deposit_order_id TEXT;

-- Set default for existing rows if needed (or handle in app logic)
-- UPDATE public.payment_intents SET mp_order_id = NULL, mp_order_status = NULL WHERE mp_order_id IS NULL;
-- UPDATE public.bookings SET mp_security_deposit_order_id = NULL WHERE mp_security_deposit_order_id IS NULL;

-- Down Migration
-- ALTER TABLE public.payment_intents
-- DROP COLUMN mp_order_id,
-- DROP COLUMN mp_order_status;

-- ALTER TABLE public.bookings
-- DROP COLUMN mp_security_deposit_order_id;

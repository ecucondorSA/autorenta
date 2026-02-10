-- Add missing FK constraints identified in DB audit
-- Pre-verified: columns exist and zero orphan records

BEGIN;

-- bookings.wallet_lock_id → wallet_transactions(id)
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_wallet_lock_id_fkey
  FOREIGN KEY (wallet_lock_id) REFERENCES public.wallet_transactions(id) ON DELETE SET NULL;

-- user_stats.user_id → profiles(id)
ALTER TABLE public.user_stats
  ADD CONSTRAINT user_stats_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

COMMIT;

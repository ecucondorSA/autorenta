-- Create view for renew-preauthorizations Edge Function
-- Returns payment_intents with is_preauth=true that expire within 2 days
-- Joins bookings, profiles, and auth.users for context needed by renewal logic

CREATE OR REPLACE VIEW public.v_expiring_preauthorizations AS
SELECT
  pi.id                       AS intent_id,
  pi.booking_id,
  pi.user_id                  AS renter_id,
  pi.amount,
  pi.provider_payment_id      AS mp_payment_id,
  pi.preauth_expires_at,
  NULL::uuid                  AS saved_card_id,
  b.status::text              AS booking_status,
  b.end_at                    AS booking_end_date,
  NULL::text                  AS mp_customer_id,
  NULL::text                  AS mp_card_id,
  pi.card_last4,
  NULL::text                  AS profile_customer_id,
  au.email,
  COALESCE(p.full_name, '')   AS full_name,
  EXTRACT(day FROM pi.preauth_expires_at - now())::int AS days_until_expiry,
  false                       AS can_auto_renew
FROM payment_intents pi
JOIN bookings b    ON b.id  = pi.booking_id
JOIN profiles p    ON p.id  = pi.user_id
JOIN auth.users au ON au.id = pi.user_id
WHERE pi.is_preauth = true
  AND pi.status = 'succeeded'
  AND pi.preauth_expires_at IS NOT NULL
  AND pi.preauth_expires_at > now()
  AND pi.preauth_expires_at <= now() + interval '2 days';

-- Grant access to service_role (Edge Functions use this role)
GRANT SELECT ON public.v_expiring_preauthorizations TO service_role;

COMMENT ON VIEW public.v_expiring_preauthorizations IS
  'Pre-authorizations expiring within 2 days. Used by renew-preauthorizations Edge Function.';

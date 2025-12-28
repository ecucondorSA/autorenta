-- ============================================================================
-- FIX: function_search_path_mutable Security Warning
-- ============================================================================
-- This migration fixes the Supabase linter warning about functions with
-- mutable search_path. Setting search_path = '' prevents search path hijacking
-- attacks where a malicious schema could intercept function calls.
--
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
-- ============================================================================

-- Helper: For each function, we ALTER it to set search_path = ''
-- This is the safest option as it requires explicit schema qualification

-- ============================================================================
-- PUBLIC SCHEMA FUNCTIONS
-- ============================================================================

ALTER FUNCTION public.report_renter_no_show SET search_path = '';
ALTER FUNCTION public.send_booking_reminders SET search_path = '';
ALTER FUNCTION public.compute_cancel_fee SET search_path = '';
ALTER FUNCTION public.set_credit_expiration SET search_path = '';
ALTER FUNCTION public.expire_pending_approvals SET search_path = '';
ALTER FUNCTION public.get_expiring_locks SET search_path = '';
ALTER FUNCTION public.send_welcome_notification SET search_path = '';
ALTER FUNCTION public.auto_update_price_per_day SET search_path = '';
ALTER FUNCTION public.measure_execution_time SET search_path = '';
ALTER FUNCTION public.send_car_views_milestone_notification SET search_path = '';
ALTER FUNCTION public.send_renter_tips SET search_path = '';
ALTER FUNCTION public.report_owner_no_show SET search_path = '';
ALTER FUNCTION public.maintenance_run_full_cleanup SET search_path = '';
ALTER FUNCTION public.process_binance_response SET search_path = '';
ALTER FUNCTION public.get_admin_roles SET search_path = '';
ALTER FUNCTION public.update_transactions_updated_at SET search_path = '';
ALTER FUNCTION public.pay_booking_extension SET search_path = '';
ALTER FUNCTION public.update_car_blocked_dates_updated_at SET search_path = '';
ALTER FUNCTION public.update_p2p_orders_updated_at SET search_path = '';
-- quote_booking has multiple overloads
ALTER FUNCTION public.quote_booking(p_car_id uuid, p_start date, p_end date, p_promo text) SET search_path = '';
ALTER FUNCTION public.quote_booking(p_car_id uuid, p_start timestamp with time zone, p_end timestamp with time zone, p_promo_code text, p_user_lat numeric, p_user_lng numeric, p_delivery_required boolean) SET search_path = '';
ALTER FUNCTION public.calculate_late_return_penalty SET search_path = '';
ALTER FUNCTION public.complete_checkout SET search_path = '';
ALTER FUNCTION public.update_feature_flags_updated_at SET search_path = '';
ALTER FUNCTION public.log_feature_flag_changes SET search_path = '';
ALTER FUNCTION public.generate_device_fingerprint SET search_path = '';
ALTER FUNCTION public.complete_pending_review_bookings SET search_path = '';
ALTER FUNCTION public.calculate_user_bonus_malus SET search_path = '';
ALTER FUNCTION public.sync_email_verification SET search_path = '';
ALTER FUNCTION public.send_inactive_owner_reminders SET search_path = '';
ALTER FUNCTION public.maintenance_cleanup_orphaned_car_photos SET search_path = '';
ALTER FUNCTION public.send_nearby_cars_notifications SET search_path = '';
ALTER FUNCTION public.wallet_lock_funds_with_expiration SET search_path = '';
ALTER FUNCTION public.maintenance_cleanup_old_notifications SET search_path = '';
ALTER FUNCTION public.update_support_ticket_timestamp SET search_path = '';
ALTER FUNCTION public.prevent_locked_identity_changes SET search_path = '';
ALTER FUNCTION public.send_optimization_tips SET search_path = '';
ALTER FUNCTION public.apply_late_return_penalty SET search_path = '';
ALTER FUNCTION public.notify_price_drop SET search_path = '';
ALTER FUNCTION public.autoclose_tracking_if_returned SET search_path = '';
ALTER FUNCTION public.release_mp_preauth_order SET search_path = '';
ALTER FUNCTION public.update_p2p_config_updated_at SET search_path = '';
ALTER FUNCTION public.sync_profile_verification_status SET search_path = '';
ALTER FUNCTION public.send_car_recommendations SET search_path = '';
ALTER FUNCTION public.p2p_get_next_order SET search_path = '';
ALTER FUNCTION public.send_document_expiry_reminders SET search_path = '';
ALTER FUNCTION public.sync_phone_verification SET search_path = '';
ALTER FUNCTION public.maintenance_get_data_health_report SET search_path = '';
ALTER FUNCTION public.update_facturas_recibidas_updated_at SET search_path = '';
ALTER FUNCTION public.maintenance_cleanup_draft_cars SET search_path = '';
ALTER FUNCTION public.cleanup_old_performance_logs SET search_path = '';
ALTER FUNCTION public.enforce_renter_checkin_before_in_progress SET search_path = '';
ALTER FUNCTION public.respond_to_extension SET search_path = '';
ALTER FUNCTION public.maintenance_identify_test_accounts SET search_path = '';
ALTER FUNCTION public.trigger_calculate_platform_fee SET search_path = '';
-- is_admin has multiple overloads
ALTER FUNCTION public.is_admin() SET search_path = '';
ALTER FUNCTION public.is_admin(check_user_id uuid) SET search_path = '';
ALTER FUNCTION public.log_admin_action SET search_path = '';
ALTER FUNCTION public.validate_contract_clauses_accepted SET search_path = '';
ALTER FUNCTION public.send_pending_requests_reminder SET search_path = '';
ALTER FUNCTION public.send_verification_notification SET search_path = '';
ALTER FUNCTION public.encrypt_message SET search_path = '';
ALTER FUNCTION public.maintenance_cleanup_old_conversion_events SET search_path = '';
ALTER FUNCTION public.update_payment_references_updated_at SET search_path = '';
ALTER FUNCTION public.update_updated_at_column SET search_path = '';
ALTER FUNCTION public.update_booking_contracts_updated_at SET search_path = '';
ALTER FUNCTION public.wallet_deposit_funds_admin SET search_path = '';
ALTER FUNCTION public.request_booking_extension SET search_path = '';
ALTER FUNCTION public.cancel_with_fee SET search_path = '';
ALTER FUNCTION public.notify_owner_new_booking_request SET search_path = '';
ALTER FUNCTION public.capture_mp_preauth_order SET search_path = '';
ALTER FUNCTION public.prepare_booking_payment SET search_path = '';
ALTER FUNCTION public.release_expired_card_preauths SET search_path = '';
ALTER FUNCTION public.send_favorite_car_available SET search_path = '';
ALTER FUNCTION public.update_binance_rates SET search_path = '';
ALTER FUNCTION public.refresh_accounting_balances SET search_path = '';
ALTER FUNCTION public.check_fleet_bonus_eligibility SET search_path = '';
ALTER FUNCTION public.update_proveedores_updated_at SET search_path = '';
ALTER FUNCTION public.set_approval_expires_at SET search_path = '';
ALTER FUNCTION public.send_booking_completion_reminders SET search_path = '';
ALTER FUNCTION public.estimate_vehicle_value_usd SET search_path = '';
ALTER FUNCTION public.update_mp_onboarding_updated_at SET search_path = '';

-- ============================================================================
-- FUNCTIONS WITH OVERLOADS (handle carefully)
-- ============================================================================

-- wallet_lock_funds has multiple overloads, need to specify signature
-- Check existing signatures first, then apply
DO $$
BEGIN
  -- Try to alter all overloads of wallet_lock_funds
  -- wallet_lock_funds overloads
  BEGIN
    EXECUTE 'ALTER FUNCTION public.wallet_lock_funds(uuid, numeric, text) SET search_path = ''''';
  EXCEPTION WHEN undefined_function THEN NULL;
  END;
  BEGIN
    EXECUTE 'ALTER FUNCTION public.wallet_lock_funds(uuid, numeric) SET search_path = ''''';
  EXCEPTION WHEN undefined_function THEN NULL;
  END;
  BEGIN
    EXECUTE 'ALTER FUNCTION public.wallet_lock_funds(p_booking_id uuid, p_amount_cents bigint) SET search_path = ''''';
  EXCEPTION WHEN undefined_function THEN NULL;
  END;

  -- create_mp_preauth_order overloads
  BEGIN
    EXECUTE 'ALTER FUNCTION public.create_mp_preauth_order(p_intent_id uuid, p_amount_cents bigint, p_description text, p_booking_id uuid, p_token text) SET search_path = ''''';
  EXCEPTION WHEN undefined_function THEN NULL;
  END;
  BEGIN
    EXECUTE 'ALTER FUNCTION public.create_mp_preauth_order(p_intent_id uuid, p_amount_cents bigint, p_description text, p_booking_id uuid) SET search_path = ''''';
  EXCEPTION WHEN undefined_function THEN NULL;
  END;
END $$;

-- ============================================================================
-- PRIVATE SCHEMA FUNCTIONS
-- ============================================================================

ALTER FUNCTION private.get_mp_token SET search_path = '';

-- ============================================================================
-- EXTENSIONS IN PUBLIC SCHEMA
-- Note: Moving extensions requires careful handling. For postgis especially,
-- many functions depend on it being in public. This is a known Supabase issue.
--
-- The safest approach is to create the extensions schema and move if possible,
-- but for postgis this may break existing code. Leaving as documentation.
-- ============================================================================

-- Create extensions schema if not exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- For btree_gist, we can try to move it (less impactful than postgis)
-- Note: This may fail if objects depend on it in public schema
-- DO $$
-- BEGIN
--   ALTER EXTENSION btree_gist SET SCHEMA extensions;
-- EXCEPTION WHEN OTHERS THEN
--   RAISE NOTICE 'Could not move btree_gist to extensions schema: %', SQLERRM;
-- END $$;

-- ============================================================================
-- AUTH: Leaked Password Protection
-- ============================================================================
-- This setting must be enabled in Supabase Dashboard:
-- 1. Go to Authentication > Settings > Security
-- 2. Enable "Leaked Password Protection"
--
-- This cannot be done via SQL migration.
-- ============================================================================

-- Add comment to remind about this
COMMENT ON SCHEMA public IS 'Standard public schema. Note: Enable Leaked Password Protection in Supabase Dashboard > Authentication > Settings > Security';

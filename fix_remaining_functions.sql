-- ============================================================================
-- FIX REMAINING FUNCTION SEARCH PATH ISSUES (64 functions from CSV #3)
-- ============================================================================

DO $$
DECLARE
    func_record RECORD;
    func_def TEXT;
    new_def TEXT;
    fixed_count INT := 0;
    functions_to_fix TEXT[] := ARRAY[
        'config_get_string', 'get_current_fx_rate', 'get_car_price_in_currency',
        'config_get_boolean', 'config_get_public', 'booking_location_tracking_broadcast_trigger',
        'wallet_lock_funds', 'calculate_suggested_daily_rate', 'accounting_delivery_fee_after_update',
        'calculate_distance_km', 'get_effective_vehicle_value', 'request_booking',
        'calculate_payment_split', 'trigger_accounting_fgo_contribution', 'get_booking_distance',
        'accounting_wallet_deposit_after_insert', 'set_location_tracking_created_timestamp',
        'accounting_credit_issue_after_insert', 'capture_preauth', 'calculate_batch_dynamic_prices',
        'trigger_accounting_security_deposit', 'calculate_dynamic_price', 'fx_rate_needs_revalidation',
        'validate_mercadopago_oauth', 'accounting_cancellation_fee_after_update',
        'deactivate_previous_fx_rate', 'trigger_accounting_wallet_deposit', 'populate_car_estimates',
        'get_effective_daily_rate_pct', 'wallet_unlock_funds', 'wallet_refund',
        'wallet_transfer_to_owner', 'wallet_charge_rental', 'wallet_deposit_ledger',
        'set_updated_at', 'set_row_updated_at', 'update_messages_updated_at',
        'update_claims_updated_at', 'update_payment_intents_updated_at', 'update_fx_rates_updated_at',
        'update_accounting_journal_entries_updated_at', 'update_vehicle_categories_updated_at',
        'update_vehicle_pricing_models_updated_at', 'transfer_profit_to_equity',
        'trg_accounting_revenue_recognition', 'cleanup_expired_onboarding_states',
        'trigger_send_deposit_confirmation_email', 'check_user_pending_deposits_limit',
        'cleanup_old_pending_deposits', 'update_booking_payout', 'check_availability',
        'lock_price_for_booking', 'update_location', 'update_location_tracking_timestamp',
        'quote_booking', 'adjust_alpha_dynamic', 'get_next_available_date', 'get_car_blocked_dates',
        'update_calendar_sync_timestamp', 'calculate_trip_score', 'is_at_least_18',
        'calculate_age', 'estimate_vehicle_value_usd'
    ];
BEGIN
    -- Create temporary table to log results
    CREATE TEMP TABLE IF NOT EXISTS fix_results_remaining (
        function_name TEXT,
        status TEXT,
        error_msg TEXT DEFAULT NULL
    );

    -- Loop through all functions that need fixing
    FOR func_record IN
        SELECT
            p.proname as function_name,
            pg_catalog.pg_get_function_identity_arguments(p.oid) as arguments,
            pg_catalog.pg_get_functiondef(p.oid) as definition,
            p.oid
        FROM pg_catalog.pg_proc p
        LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
        AND p.proname = ANY(functions_to_fix)
        AND p.prosecdef = true  -- SECURITY DEFINER
        AND pg_catalog.pg_get_functiondef(p.oid) NOT ILIKE '%search_path%'  -- Needs fix
    LOOP
        BEGIN
            -- Get the function definition
            func_def := func_record.definition;

            -- Add SET search_path = 'public' after SECURITY DEFINER
            new_def := regexp_replace(
                func_def,
                '(SECURITY DEFINER)',
                '\1 SET search_path = ''public''',
                'i'
            );

            -- Execute the new definition
            EXECUTE new_def;

            -- Log success
            INSERT INTO fix_results_remaining(function_name, status)
            VALUES(func_record.function_name || '(' || func_record.arguments || ')', 'FIXED');

            fixed_count := fixed_count + 1;

        EXCEPTION WHEN OTHERS THEN
            -- Log error
            INSERT INTO fix_results_remaining(function_name, status, error_msg)
            VALUES(func_record.function_name || '(' || func_record.arguments || ')', 'ERROR', SQLERRM);
        END;
    END LOOP;

    -- Report results
    RAISE NOTICE '========================================';
    RAISE NOTICE 'REMAINING FUNCTIONS FIX COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Functions fixed: %', fixed_count;
    RAISE NOTICE '========================================';
END;
$$;

-- Show the results
SELECT * FROM fix_results_remaining ORDER BY status, function_name;

-- Verify the fix
SELECT
  'REMAINING FUNCTIONS VERIFICATION' as report,
  COUNT(*) as total_security_definer,
  COUNT(CASE WHEN pg_catalog.pg_get_functiondef(p.oid) ILIKE '%search_path%' THEN 1 END) as with_search_path,
  COUNT(CASE WHEN pg_catalog.pg_get_functiondef(p.oid) NOT ILIKE '%search_path%' THEN 1 END) as still_need_fix
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND p.prosecdef = true;
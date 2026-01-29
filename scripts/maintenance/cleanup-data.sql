-- =============================================================================
-- AUTORENTA - Data Cleanup Script
-- =============================================================================
-- This script provides functions to clean up test data and stale records.
-- Run with caution in production!
--
-- Usage:
--   1. First run in DRY_RUN mode (default) to see what would be cleaned
--   2. Set p_dry_run = false to actually delete
--
-- Created: 2025-12-28
-- =============================================================================

-- =============================================================================
-- FUNCTION: cleanup_old_notifications
-- Cleans up notifications older than specified days
-- =============================================================================
CREATE OR REPLACE FUNCTION maintenance_cleanup_old_notifications(
  p_days_old INTEGER DEFAULT 180,
  p_dry_run BOOLEAN DEFAULT true
) RETURNS JSONB AS $$
DECLARE
  v_count INTEGER;
  v_result JSONB;
BEGIN
  -- Count records to delete
  SELECT COUNT(*) INTO v_count
  FROM notifications
  WHERE created_at < NOW() - (p_days_old || ' days')::INTERVAL
    AND is_read = true;  -- Only delete read notifications

  IF p_dry_run THEN
    RETURN jsonb_build_object(
      'action', 'cleanup_old_notifications',
      'dry_run', true,
      'would_delete', v_count,
      'criteria', format('Read notifications older than %s days', p_days_old)
    );
  END IF;

  -- Perform actual deletion
  DELETE FROM notifications
  WHERE created_at < NOW() - (p_days_old || ' days')::INTERVAL
    AND is_read = true;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'action', 'cleanup_old_notifications',
    'dry_run', false,
    'deleted', v_count,
    'criteria', format('Read notifications older than %s days', p_days_old)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FUNCTION: cleanup_old_conversion_events
-- Archives/cleans up old conversion events for performance
-- =============================================================================
CREATE OR REPLACE FUNCTION maintenance_cleanup_old_conversion_events(
  p_days_old INTEGER DEFAULT 365,
  p_dry_run BOOLEAN DEFAULT true
) RETURNS JSONB AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Count records to archive
  SELECT COUNT(*) INTO v_count
  FROM conversion_events
  WHERE created_at < NOW() - (p_days_old || ' days')::INTERVAL;

  IF p_dry_run THEN
    RETURN jsonb_build_object(
      'action', 'cleanup_old_conversion_events',
      'dry_run', true,
      'would_delete', v_count,
      'criteria', format('Conversion events older than %s days', p_days_old)
    );
  END IF;

  -- Perform actual deletion
  DELETE FROM conversion_events
  WHERE created_at < NOW() - (p_days_old || ' days')::INTERVAL;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'action', 'cleanup_old_conversion_events',
    'dry_run', false,
    'deleted', v_count,
    'criteria', format('Conversion events older than %s days', p_days_old)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FUNCTION: identify_test_accounts
-- Identifies accounts that appear to be test accounts
-- =============================================================================
CREATE OR REPLACE FUNCTION maintenance_identify_test_accounts()
RETURNS TABLE(
  id UUID,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ,
  reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.created_at,
    CASE
      WHEN p.full_name ILIKE '%test%' THEN 'Name contains "test"'
      WHEN p.full_name ILIKE '%prueba%' THEN 'Name contains "prueba"'
      WHEN p.email ILIKE '%+test%' THEN 'Email contains "+test"'
      WHEN p.email ILIKE 'test@%' THEN 'Email starts with "test@"'
      WHEN p.email ILIKE '%@test.%' THEN 'Email domain is test'
      WHEN p.email ILIKE '%@example.%' THEN 'Email domain is example'
      ELSE 'Unknown'
    END as reason
  FROM profiles p
  WHERE p.full_name ILIKE '%test%'
    OR p.full_name ILIKE '%prueba%'
    OR p.email ILIKE '%+test%'
    OR p.email ILIKE 'test@%'
    OR p.email ILIKE '%@test.%'
    OR p.email ILIKE '%@example.%'
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- FUNCTION: cleanup_orphaned_car_photos
-- Removes car photos that reference non-existent cars
-- =============================================================================
CREATE OR REPLACE FUNCTION maintenance_cleanup_orphaned_car_photos(
  p_dry_run BOOLEAN DEFAULT true
) RETURNS JSONB AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM car_photos cp
  WHERE NOT EXISTS (SELECT 1 FROM cars c WHERE c.id = cp.car_id);

  IF p_dry_run THEN
    RETURN jsonb_build_object(
      'action', 'cleanup_orphaned_car_photos',
      'dry_run', true,
      'would_delete', v_count,
      'criteria', 'Photos referencing non-existent cars'
    );
  END IF;

  DELETE FROM car_photos cp
  WHERE NOT EXISTS (SELECT 1 FROM cars c WHERE c.id = cp.car_id);

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'action', 'cleanup_orphaned_car_photos',
    'dry_run', false,
    'deleted', v_count,
    'criteria', 'Photos referencing non-existent cars'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FUNCTION: cleanup_draft_cars
-- Removes cars in draft status older than specified days
-- =============================================================================
CREATE OR REPLACE FUNCTION maintenance_cleanup_draft_cars(
  p_days_old INTEGER DEFAULT 90,
  p_dry_run BOOLEAN DEFAULT true
) RETURNS JSONB AS $$
DECLARE
  v_count INTEGER;
  v_car_ids UUID[];
BEGIN
  -- Get IDs of draft cars to delete
  SELECT ARRAY_AGG(c.id) INTO v_car_ids
  FROM cars c
  WHERE c.status = 'draft'
    AND c.created_at < NOW() - (p_days_old || ' days')::INTERVAL
    AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.car_id = c.id);

  v_count := COALESCE(array_length(v_car_ids, 1), 0);

  IF p_dry_run THEN
    RETURN jsonb_build_object(
      'action', 'cleanup_draft_cars',
      'dry_run', true,
      'would_delete', v_count,
      'criteria', format('Draft cars older than %s days with no bookings', p_days_old)
    );
  END IF;

  IF v_count = 0 THEN
    RETURN jsonb_build_object(
      'action', 'cleanup_draft_cars',
      'dry_run', false,
      'deleted', 0,
      'message', 'No draft cars to delete'
    );
  END IF;

  -- Delete photos first (FK constraint)
  DELETE FROM car_photos WHERE car_id = ANY(v_car_ids);

  -- Delete blocked dates
  DELETE FROM blocked_dates WHERE car_id = ANY(v_car_ids);

  -- Delete the cars
  DELETE FROM cars WHERE id = ANY(v_car_ids);

  RETURN jsonb_build_object(
    'action', 'cleanup_draft_cars',
    'dry_run', false,
    'deleted', v_count,
    'criteria', format('Draft cars older than %s days with no bookings', p_days_old)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FUNCTION: get_data_health_report
-- Returns a comprehensive report of data health
-- =============================================================================
CREATE OR REPLACE FUNCTION maintenance_get_data_health_report()
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'generated_at', NOW(),
    'cars', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM cars),
      'active', (SELECT COUNT(*) FROM cars WHERE status = 'active'),
      'deleted', (SELECT COUNT(*) FROM cars WHERE status = 'deleted'),
      'without_photos', (SELECT COUNT(*) FROM cars c WHERE NOT EXISTS (SELECT 1 FROM car_photos cp WHERE cp.car_id = c.id))
    ),
    'bookings', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM bookings),
      'pending', (SELECT COUNT(*) FROM bookings WHERE status = 'pending'),
      'confirmed', (SELECT COUNT(*) FROM bookings WHERE status = 'confirmed'),
      'in_progress', (SELECT COUNT(*) FROM bookings WHERE status = 'in_progress'),
      'completed', (SELECT COUNT(*) FROM bookings WHERE status = 'completed'),
      'cancelled', (SELECT COUNT(*) FROM bookings WHERE status = 'cancelled'),
      'older_than_1_year', (SELECT COUNT(*) FROM bookings WHERE created_at < NOW() - INTERVAL '1 year')
    ),
    'profiles', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM profiles),
      'id_verified', (SELECT COUNT(*) FROM profiles WHERE id_verified = true),
      'test_accounts', (SELECT COUNT(*) FROM profiles WHERE full_name ILIKE '%test%' OR full_name ILIKE '%prueba%' OR email ILIKE '%+test%')
    ),
    'notifications', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM notifications),
      'unread', (SELECT COUNT(*) FROM notifications WHERE is_read = false),
      'read', (SELECT COUNT(*) FROM notifications WHERE is_read = true),
      'older_than_6_months', (SELECT COUNT(*) FROM notifications WHERE created_at < NOW() - INTERVAL '6 months')
    ),
    'conversion_events', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM conversion_events),
      'last_24h', (SELECT COUNT(*) FROM conversion_events WHERE created_at > NOW() - INTERVAL '24 hours'),
      'last_7d', (SELECT COUNT(*) FROM conversion_events WHERE created_at > NOW() - INTERVAL '7 days'),
      'older_than_1_year', (SELECT COUNT(*) FROM conversion_events WHERE created_at < NOW() - INTERVAL '1 year')
    ),
    'wallet', jsonb_build_object(
      'total_transactions', (SELECT COUNT(*) FROM wallet_transactions),
      'total_balance_cents', (SELECT COALESCE(SUM(available_balance_cents), 0) FROM user_wallets)
    ),
    'orphaned_data', jsonb_build_object(
      'car_photos_without_car', (SELECT COUNT(*) FROM car_photos cp WHERE NOT EXISTS (SELECT 1 FROM cars c WHERE c.id = cp.car_id))
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- FUNCTION: run_full_cleanup (orchestrator)
-- Runs all cleanup functions with dry_run option
-- =============================================================================
CREATE OR REPLACE FUNCTION maintenance_run_full_cleanup(
  p_dry_run BOOLEAN DEFAULT true
) RETURNS JSONB AS $$
DECLARE
  v_results JSONB := '[]'::JSONB;
BEGIN
  -- Run each cleanup and collect results
  v_results := v_results || jsonb_build_array(maintenance_cleanup_old_notifications(180, p_dry_run));
  v_results := v_results || jsonb_build_array(maintenance_cleanup_orphaned_car_photos(p_dry_run));
  v_results := v_results || jsonb_build_array(maintenance_cleanup_draft_cars(90, p_dry_run));

  -- Only cleanup old events if more than 1 year old and > 100k records
  IF (SELECT COUNT(*) FROM conversion_events WHERE created_at < NOW() - INTERVAL '1 year') > 100000 THEN
    v_results := v_results || jsonb_build_array(maintenance_cleanup_old_conversion_events(365, p_dry_run));
  END IF;

  RETURN jsonb_build_object(
    'executed_at', NOW(),
    'dry_run', p_dry_run,
    'results', v_results
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to service role
GRANT EXECUTE ON FUNCTION maintenance_cleanup_old_notifications TO service_role;
GRANT EXECUTE ON FUNCTION maintenance_cleanup_old_conversion_events TO service_role;
GRANT EXECUTE ON FUNCTION maintenance_identify_test_accounts TO service_role;
GRANT EXECUTE ON FUNCTION maintenance_cleanup_orphaned_car_photos TO service_role;
GRANT EXECUTE ON FUNCTION maintenance_cleanup_draft_cars TO service_role;
GRANT EXECUTE ON FUNCTION maintenance_get_data_health_report TO service_role;
GRANT EXECUTE ON FUNCTION maintenance_run_full_cleanup TO service_role;

-- Add comments
COMMENT ON FUNCTION maintenance_cleanup_old_notifications IS 'Cleans up read notifications older than specified days';
COMMENT ON FUNCTION maintenance_cleanup_old_conversion_events IS 'Archives old conversion events for performance';
COMMENT ON FUNCTION maintenance_identify_test_accounts IS 'Lists accounts that appear to be test accounts';
COMMENT ON FUNCTION maintenance_cleanup_orphaned_car_photos IS 'Removes photos referencing deleted cars';
COMMENT ON FUNCTION maintenance_cleanup_draft_cars IS 'Removes old draft cars with no bookings';
COMMENT ON FUNCTION maintenance_get_data_health_report IS 'Returns comprehensive data health report';
COMMENT ON FUNCTION maintenance_run_full_cleanup IS 'Orchestrates all cleanup functions';

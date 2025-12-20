-- =====================================================
-- CLEANUP: Remove Google Calendar Integration
-- =====================================================
-- This migration removes all Google Calendar related objects
-- that are no longer used in the application.
--
-- Objects removed:
-- - 3 tables: calendar_sync_log, car_google_calendars, google_calendar_tokens
-- - 3 functions: get_active_calendar_token, is_google_calendar_connected, update_calendar_sync_timestamp
-- - 9 RLS policies on the above tables
-- =====================================================

-- First drop the functions (they may depend on the tables)
DROP FUNCTION IF EXISTS get_active_calendar_token(uuid);
DROP FUNCTION IF EXISTS is_google_calendar_connected(uuid);
DROP FUNCTION IF EXISTS update_calendar_sync_timestamp(uuid, uuid);

-- Drop RLS policies before dropping tables
DROP POLICY IF EXISTS "Users can view their own sync logs" ON calendar_sync_log;

DROP POLICY IF EXISTS "Car owners can create car calendars" ON car_google_calendars;
DROP POLICY IF EXISTS "Car owners can delete their car calendars" ON car_google_calendars;
DROP POLICY IF EXISTS "Car owners can update their car calendars" ON car_google_calendars;
DROP POLICY IF EXISTS "Car owners can view their car calendars" ON car_google_calendars;

DROP POLICY IF EXISTS "Users can delete their own calendar tokens" ON google_calendar_tokens;
DROP POLICY IF EXISTS "Users can insert their own calendar tokens" ON google_calendar_tokens;
DROP POLICY IF EXISTS "Users can update their own calendar tokens" ON google_calendar_tokens;
DROP POLICY IF EXISTS "Users can view their own calendar tokens" ON google_calendar_tokens;

-- Drop the tables (CASCADE will handle any remaining dependencies)
DROP TABLE IF EXISTS calendar_sync_log CASCADE;
DROP TABLE IF EXISTS car_google_calendars CASCADE;
DROP TABLE IF EXISTS google_calendar_tokens CASCADE;

-- =====================================================
-- Summary of removed objects:
-- ✅ 3 tables removed
-- ✅ 3 functions removed
-- ✅ 9 RLS policies removed
-- =====================================================

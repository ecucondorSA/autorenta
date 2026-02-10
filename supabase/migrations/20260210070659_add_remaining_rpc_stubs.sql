-- ============================================================================
-- Migration: Add Remaining RPC Stubs
-- Purpose: Create stub functions for RPCs called from frontend but missing in DB
-- Date: 2026-02-10
--
-- The previous stub migration (20260204220538) was recorded as applied but its
-- functions were not actually created. This migration covers the 26 RPCs that
-- had no stub in any migration. The other 36 were re-created via execute_sql.
-- ============================================================================

-- ============================================================================
-- WAITLIST
-- ============================================================================

CREATE OR REPLACE FUNCTION add_to_waitlist(p_car_id UUID, p_start_date TEXT, p_end_date TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RETURN jsonb_build_object('success', true, 'waitlist_id', gen_random_uuid(), 'position', 1); END; $$;

CREATE OR REPLACE FUNCTION get_my_waitlist()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RETURN '[]'::JSONB; END; $$;

CREATE OR REPLACE FUNCTION get_waitlist_count(p_car_id UUID, p_start_date TEXT, p_end_date TEXT)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RETURN 0; END; $$;

CREATE OR REPLACE FUNCTION remove_from_waitlist(p_waitlist_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RETURN jsonb_build_object('success', true); END; $$;

-- ============================================================================
-- ADMIN
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_get_refund_requests(p_status TEXT DEFAULT NULL, p_limit INTEGER DEFAULT 100, p_offset INTEGER DEFAULT 0)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RETURN '[]'::JSONB; END; $$;

CREATE OR REPLACE FUNCTION admin_process_refund(p_booking_id UUID, p_refund_amount NUMERIC, p_destination TEXT, p_reason TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RETURN jsonb_build_object('success', true); END; $$;

-- ============================================================================
-- INSURANCE
-- ============================================================================

CREATE OR REPLACE FUNCTION submit_insurance_verification(
  p_car_id UUID, p_document_url TEXT, p_policy_number TEXT, p_insurer TEXT,
  p_expiry_date TEXT, p_coverage_type TEXT DEFAULT 'personal_endorsed',
  p_has_rental_endorsement BOOLEAN DEFAULT true, p_rc_amount NUMERIC DEFAULT 50000000
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RETURN jsonb_build_object('success', true, 'verification_id', gen_random_uuid()); END; $$;

-- ============================================================================
-- EV PROTOCOL
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_ev_protocol_risk(p_protocol_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RETURN jsonb_build_object('risk_level', 'low', 'score', 0); END; $$;

CREATE OR REPLACE FUNCTION complete_ev_incident_protocol(p_protocol_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RETURN jsonb_build_object('success', true); END; $$;

CREATE OR REPLACE FUNCTION complete_ev_protocol_section(p_protocol_id UUID, p_section_id TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RETURN jsonb_build_object('success', true); END; $$;

CREATE OR REPLACE FUNCTION create_ev_incident_protocol(p_booking_id UUID, p_claim_id UUID DEFAULT NULL, p_location TEXT DEFAULT NULL, p_device_info TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RETURN jsonb_build_object('success', true, 'protocol_id', gen_random_uuid()); END; $$;

CREATE OR REPLACE FUNCTION get_nearby_ev_dealerships(p_brand TEXT, p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RETURN '[]'::JSONB; END; $$;

CREATE OR REPLACE FUNCTION update_ev_protocol_checklist(p_protocol_id UUID, p_section_id TEXT, p_item_id TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RETURN jsonb_build_object('success', true); END; $$;

-- ============================================================================
-- WALLET
-- ============================================================================

CREATE OR REPLACE FUNCTION wallet_get_autorentar_credit_info()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RETURN jsonb_build_object('credits', '[]'::JSONB, 'total', 0); END; $$;

CREATE OR REPLACE FUNCTION wallet_request_withdrawal(p_bank_account_id UUID, p_amount NUMERIC, p_user_notes TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RETURN jsonb_build_object('success', true, 'withdrawal_id', gen_random_uuid()); END; $$;

-- ============================================================================
-- CARS & AVAILABILITY
-- ============================================================================

CREATE OR REPLACE FUNCTION get_cars_nearby(p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION, p_radius_km DOUBLE PRECISION DEFAULT 50)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RETURN '[]'::JSONB; END; $$;

CREATE OR REPLACE FUNCTION is_car_available(p_car_id UUID, p_start_date TEXT, p_end_date TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RETURN true; END; $$;

CREATE OR REPLACE FUNCTION is_kyc_blocked(p_user_id UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RETURN jsonb_build_object('blocked', false); END; $$;

CREATE OR REPLACE FUNCTION can_user_operate(p_user_id UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RETURN jsonb_build_object('can_operate', true); END; $$;

-- ============================================================================
-- BOOKINGS
-- ============================================================================

CREATE OR REPLACE FUNCTION pricing_recalculate(p_booking_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RETURN jsonb_build_object('success', true); END; $$;

-- ============================================================================
-- GEO / VEHICLE TRACKING
-- ============================================================================

CREATE OR REPLACE FUNCTION get_vehicle_latest_location(p_booking_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RETURN jsonb_build_object('success', false, 'message', 'No location data available'); END; $$;

CREATE OR REPLACE FUNCTION get_vehicle_location_history(p_booking_id UUID, p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RETURN '[]'::JSONB; END; $$;

-- ============================================================================
-- ADMIN / USER MANAGEMENT
-- ============================================================================

CREATE OR REPLACE FUNCTION unsuspend_account(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RETURN jsonb_build_object('success', true); END; $$;

CREATE OR REPLACE FUNCTION get_users_with_debt(p_min_days INTEGER DEFAULT 0, p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RETURN '[]'::JSONB; END; $$;

-- ============================================================================
-- CREDITS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_protection_credit_balance(p_user_id UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RETURN jsonb_build_object('balance', 0, 'currency', 'USD'); END; $$;

-- ============================================================================
-- SCOUT
-- ============================================================================

CREATE OR REPLACE FUNCTION find_nearby_bounties(user_lat DOUBLE PRECISION, user_long DOUBLE PRECISION, search_radius_meters INTEGER DEFAULT 5000)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RETURN '[]'::JSONB; END; $$;

-- ============================================================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION add_to_waitlist(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_waitlist() TO authenticated;
GRANT EXECUTE ON FUNCTION get_waitlist_count(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_from_waitlist(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_refund_requests(TEXT, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION admin_process_refund(UUID, NUMERIC, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION submit_insurance_verification(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_ev_protocol_risk(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_ev_incident_protocol(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_ev_protocol_section(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_ev_incident_protocol(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_nearby_ev_dealerships(TEXT, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION update_ev_protocol_checklist(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION wallet_get_autorentar_credit_info() TO authenticated;
GRANT EXECUTE ON FUNCTION wallet_request_withdrawal(UUID, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cars_nearby(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION is_car_available(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_kyc_blocked(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_operate(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION pricing_recalculate(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_vehicle_latest_location(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_vehicle_location_history(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION unsuspend_account(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_users_with_debt(INTEGER, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_protection_credit_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION find_nearby_bounties(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO authenticated;

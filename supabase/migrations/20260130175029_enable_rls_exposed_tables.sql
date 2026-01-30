-- ============================================================================
-- Migration: Enable RLS on exposed tables
-- Date: 2026-01-30
-- Issue: Security audit found 27 tables without RLS enabled
-- ============================================================================

-- IMPORTANT: This migration enables RLS and creates restrictive policies.
-- Service role (Edge Functions) will have full access.
-- Authenticated users will have NO access by default - add specific policies as needed.

BEGIN;

-- ============================================================================
-- 1. SENSITIVE DATA TABLES (user/vehicle data)
-- ============================================================================

-- Driver risk scores - contains sensitive user risk assessments
ALTER TABLE IF EXISTS public.driver_risk_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.driver_risk_scores
  FOR ALL USING (auth.role() = 'service_role');

-- Vehicle telemetry - real-time location data
ALTER TABLE IF EXISTS public.vehicle_telemetry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.vehicle_telemetry
  FOR ALL USING (auth.role() = 'service_role');

-- Vehicle risk categories
ALTER TABLE IF EXISTS public.vehicle_risk_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.vehicle_risk_categories
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Anyone can read risk categories" ON public.vehicle_risk_categories
  FOR SELECT USING (true);

-- ============================================================================
-- 2. IOT DEVICES (critical infrastructure)
-- ============================================================================

ALTER TABLE IF EXISTS public.iot_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.iot_devices
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE IF EXISTS public.iot_device_heartbeats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.iot_device_heartbeats
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- 3. EV (Electric Vehicle) TABLES
-- ============================================================================

ALTER TABLE IF EXISTS public.ev_appraisal_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.ev_appraisal_rules
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Anyone can read appraisal rules" ON public.ev_appraisal_rules
  FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.ev_appraisals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.ev_appraisals
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE IF EXISTS public.ev_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.ev_policies
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Anyone can read ev policies" ON public.ev_policies
  FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.ev_policy_violations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.ev_policy_violations
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- 4. OUTREACH / MARKETING TABLES
-- ============================================================================

ALTER TABLE IF EXISTS public.outreach_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.outreach_campaigns
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE IF EXISTS public.outreach_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.outreach_contacts
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE IF EXISTS public.outreach_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.outreach_messages
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE IF EXISTS public.outreach_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.outreach_referrals
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE IF EXISTS public.outreach_special_dates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.outreach_special_dates
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE IF EXISTS public.marketing_content_dlq ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.marketing_content_dlq
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- 5. PRICING TABLES
-- ============================================================================

ALTER TABLE IF EXISTS public.car_pricing_matrix ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.car_pricing_matrix
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Anyone can read pricing matrix" ON public.car_pricing_matrix
  FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.pricing_seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.pricing_seasons
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Anyone can read pricing seasons" ON public.pricing_seasons
  FOR SELECT USING (true);

-- ============================================================================
-- 6. REPAIR / SERVICE TABLES
-- ============================================================================

ALTER TABLE IF EXISTS public.authorized_repair_shops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.authorized_repair_shops
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Anyone can read repair shops" ON public.authorized_repair_shops
  FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.repair_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.repair_orders
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE IF EXISTS public.post_incident_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.post_incident_certificates
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- 7. SUPPORT / COMMUNICATION TABLES
-- ============================================================================

ALTER TABLE IF EXISTS public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.support_ticket_messages
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE IF EXISTS public.whatsapp_debounce ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.whatsapp_debounce
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE IF EXISTS public.whatsapp_registration ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.whatsapp_registration
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- 8. SYSTEM / AUDIT TABLES
-- ============================================================================

ALTER TABLE IF EXISTS public.playbook_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.playbook_executions
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE IF EXISTS public.signed_event_traces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.signed_event_traces
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE IF EXISTS public.cars_fipe_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.cars_fipe_history
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Anyone can read fipe history" ON public.cars_fipe_history
  FOR SELECT USING (true);

-- ============================================================================
-- NOTE: spatial_ref_sys is a PostGIS system table - DO NOT enable RLS
-- ============================================================================

COMMIT;

-- ============================================================================
-- VERIFICATION QUERY (run after migration):
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public' AND rowsecurity = false;
-- ============================================================================

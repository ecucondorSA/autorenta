-- Enable RLS on all remaining tables without it (26 tables)
-- Categorized by access pattern:
--   A) Admin/service-role only: RLS enabled, no policies (PostgREST blocked)
--   B) Public read-only: RLS + SELECT for authenticated users
--   C) User-scoped: RLS + user-specific policies

BEGIN;

-- ============================================================
-- A) ADMIN/SERVICE-ROLE ONLY (18 tables)
-- Enable RLS with no policies = blocked via PostgREST, only service_role can access
-- ============================================================

ALTER TABLE public.accounting_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_period_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_period_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cron_execution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ev_policy_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iot_device_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iot_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_content_dlq ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_captures_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playbook_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playbook_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_debounce ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_registration ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- B) PUBLIC READ-ONLY (7 tables)
-- Reference/config data that authenticated users need to read
-- ============================================================

-- notification_templates: frontend needs to read template definitions
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read notification templates"
  ON public.notification_templates FOR SELECT TO authenticated
  USING (true);

-- pricing_class_factors: pricing display in marketplace
ALTER TABLE public.pricing_class_factors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read pricing class factors"
  ON public.pricing_class_factors FOR SELECT TO authenticated
  USING (true);

-- pricing_seasons: seasonal pricing display
ALTER TABLE public.pricing_seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read pricing seasons"
  ON public.pricing_seasons FOR SELECT TO authenticated
  USING (true);

-- promos: promo code validation
ALTER TABLE public.promos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read promos"
  ON public.promos FOR SELECT TO authenticated
  USING (true);

-- subscription_plans: plan selection UI
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read subscription plans"
  ON public.subscription_plans FOR SELECT TO authenticated
  USING (true);

-- vehicle_pricing_models: pricing display
ALTER TABLE public.vehicle_pricing_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read vehicle pricing models"
  ON public.vehicle_pricing_models FOR SELECT TO authenticated
  USING (true);

-- vehicle_tier_config: tier display in marketplace
ALTER TABLE public.vehicle_tier_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read vehicle tier config"
  ON public.vehicle_tier_config FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- C) USER-SCOPED (1 table)
-- ============================================================

-- support_ticket_messages: users see messages for tickets they own
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages for their tickets"
  ON public.support_ticket_messages FOR SELECT
  USING (
    sender_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_ticket_messages.ticket_id
        AND t.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can send messages on their tickets"
  ON public.support_ticket_messages FOR INSERT
  WITH CHECK (
    sender_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_ticket_messages.ticket_id
        AND t.user_id = (select auth.uid())
    )
  );

GRANT SELECT ON public.support_ticket_messages TO authenticated;

COMMIT;

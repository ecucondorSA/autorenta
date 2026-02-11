-- Wrapper RPC: iterates all active vehicles and snapshots NAV for each.
-- Called by nav-snapshot.yml cron (every 3 days).
-- Uses purchase_price_cents as baseline market value; admin can override
-- by calling calculate_vehicle_nav() directly with a real appraisal value.

CREATE OR REPLACE FUNCTION public.snapshot_all_vehicle_navs()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_vehicle RECORD;
  v_period TEXT;
  v_result JSONB;
  v_results JSONB[] := '{}';
  v_count INTEGER := 0;
BEGIN
  v_period := to_char(now(), 'YYYY-MM');

  FOR v_vehicle IN
    SELECT id, asset_code, purchase_price_cents
    FROM public.vehicle_assets
    WHERE status IN ('fundraising', 'funded', 'operational')
  LOOP
    v_result := public.calculate_vehicle_nav(
      v_vehicle.id,
      v_period,
      v_vehicle.purchase_price_cents
    );
    v_results := array_append(v_results, jsonb_build_object(
      'asset_code', v_vehicle.asset_code,
      'result', v_result
    ));
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'period', v_period,
    'vehicles_processed', v_count,
    'details', to_jsonb(v_results)
  );
END;
$$;

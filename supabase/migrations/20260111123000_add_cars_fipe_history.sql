-- FIPE valuation history for cars

CREATE TABLE IF NOT EXISTS public.cars_fipe_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  value_usd NUMERIC(12, 2),
  value_brl INTEGER,
  value_ars NUMERIC(14, 2),
  fipe_code TEXT,
  reference_month TEXT,
  source TEXT DEFAULT 'fipe',
  is_changed BOOLEAN DEFAULT false,
  previous_value_usd NUMERIC(12, 2)
);

CREATE INDEX IF NOT EXISTS idx_cars_fipe_history_car_id
  ON public.cars_fipe_history(car_id);

CREATE INDEX IF NOT EXISTS idx_cars_fipe_history_synced_at
  ON public.cars_fipe_history(synced_at DESC);

CREATE INDEX IF NOT EXISTS idx_cars_fipe_history_car_synced
  ON public.cars_fipe_history(car_id, synced_at DESC);

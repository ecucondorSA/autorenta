-- Create car_stats table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.car_stats (
    car_id uuid PRIMARY KEY REFERENCES public.cars(id) ON DELETE CASCADE,
    views bigint DEFAULT 0,
    favorites bigint DEFAULT 0,
    last_viewed_at timestamptz DEFAULT now()
);

-- Enable RLS for car_stats
ALTER TABLE public.car_stats ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone for car_stats
CREATE POLICY "Allow public read access on car_stats"
    ON public.car_stats FOR SELECT
    USING (true);

-- Create car_blocked_dates table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.car_blocked_dates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    car_id uuid REFERENCES public.cars(id) ON DELETE CASCADE,
    start_date date NOT NULL,
    end_date date NOT NULL,
    reason text,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS for car_blocked_dates
ALTER TABLE public.car_blocked_dates ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone for car_blocked_dates
CREATE POLICY "Allow public read access on car_blocked_dates"
    ON public.car_blocked_dates FOR SELECT
    USING (true);

-- Allow owners to manage their blocked dates
CREATE POLICY "Allow owners to manage their blocked dates"
    ON public.car_blocked_dates FOR ALL
    USING (auth.uid() IN (
        SELECT owner_id FROM public.cars WHERE id = car_blocked_dates.car_id
    ));

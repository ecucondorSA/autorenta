
-- Create table for tracking background generation jobs
CREATE TABLE IF NOT EXISTS public.marketing_generation_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    result JSONB,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketing_generation_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything
CREATE POLICY "Admins can manage marketing jobs" ON public.marketing_generation_jobs
    FOR ALL
    USING (auth.role() = 'service_role' OR auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Trigger to update updated_at
CREATE TRIGGER update_marketing_jobs_modtime
    BEFORE UPDATE ON public.marketing_generation_jobs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- NOTE: The Webhook to trigger 'marketing-processor' must be configured in the Supabase Dashboard
-- pointing to the Edge Function URL.

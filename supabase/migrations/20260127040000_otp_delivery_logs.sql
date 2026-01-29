-- OTP Delivery Logs table for n8n integration
-- Tracks all OTP delivery attempts across channels (WhatsApp, SMS)

CREATE TABLE IF NOT EXISTS public.otp_delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'sms_fallback')),
    status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'failed', 'expired')),
    provider_message_id TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying by user
CREATE INDEX IF NOT EXISTS idx_otp_delivery_logs_user_id ON public.otp_delivery_logs(user_id);

-- Index for querying by phone
CREATE INDEX IF NOT EXISTS idx_otp_delivery_logs_phone ON public.otp_delivery_logs(phone);

-- Index for analytics (by channel and status)
CREATE INDEX IF NOT EXISTS idx_otp_delivery_logs_channel_status ON public.otp_delivery_logs(channel, status);

-- RLS policies
ALTER TABLE public.otp_delivery_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own OTP logs
CREATE POLICY "Users can view own OTP logs"
    ON public.otp_delivery_logs FOR SELECT
    USING (auth.uid() = user_id);

-- Service role can insert/update (from n8n via service key)
CREATE POLICY "Service role full access"
    ON public.otp_delivery_logs FOR ALL
    USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT ON public.otp_delivery_logs TO authenticated;
GRANT ALL ON public.otp_delivery_logs TO service_role;

COMMENT ON TABLE public.otp_delivery_logs IS 'Logs of OTP delivery attempts via n8n (WhatsApp/SMS)';

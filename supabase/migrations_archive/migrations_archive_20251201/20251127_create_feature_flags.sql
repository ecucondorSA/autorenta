-- =====================================================
-- Feature Flags System
-- Enables feature toggles without deployments
-- =====================================================

-- Create feature_flags table
CREATE TABLE IF NOT EXISTS public.feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT false,
    rollout_percentage INTEGER DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
    user_segments JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Add comment
COMMENT ON TABLE public.feature_flags IS 'Feature flags for controlling feature rollout without deployments';

-- Create indexes
CREATE INDEX idx_feature_flags_name ON public.feature_flags(name);
CREATE INDEX idx_feature_flags_enabled ON public.feature_flags(enabled);

-- Enable RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Everyone can read feature flags (needed for client-side evaluation)
CREATE POLICY "feature_flags_select_all" ON public.feature_flags
    FOR SELECT USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "feature_flags_insert_admin" ON public.feature_flags
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE user_id = auth.uid()
            AND role IN ('super_admin', 'operations')
        )
    );

CREATE POLICY "feature_flags_update_admin" ON public.feature_flags
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE user_id = auth.uid()
            AND role IN ('super_admin', 'operations')
        )
    );

CREATE POLICY "feature_flags_delete_admin" ON public.feature_flags
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE user_id = auth.uid()
            AND role = 'super_admin'
        )
    );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_feature_flags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_feature_flags_updated_at
    BEFORE UPDATE ON public.feature_flags
    FOR EACH ROW
    EXECUTE FUNCTION public.update_feature_flags_updated_at();

-- Create feature_flag_overrides table for user-specific overrides
CREATE TABLE IF NOT EXISTS public.feature_flag_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_flag_id UUID NOT NULL REFERENCES public.feature_flags(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(feature_flag_id, user_id)
);

-- Enable RLS on overrides
ALTER TABLE public.feature_flag_overrides ENABLE ROW LEVEL SECURITY;

-- Users can read their own overrides
CREATE POLICY "feature_flag_overrides_select_own" ON public.feature_flag_overrides
    FOR SELECT USING (user_id = auth.uid());

-- Admins can read all overrides
CREATE POLICY "feature_flag_overrides_select_admin" ON public.feature_flag_overrides
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE user_id = auth.uid()
        )
    );

-- Only admins can manage overrides
CREATE POLICY "feature_flag_overrides_insert_admin" ON public.feature_flag_overrides
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE user_id = auth.uid()
            AND role IN ('super_admin', 'operations')
        )
    );

CREATE POLICY "feature_flag_overrides_delete_admin" ON public.feature_flag_overrides
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE user_id = auth.uid()
            AND role IN ('super_admin', 'operations')
        )
    );

-- Create audit log for feature flag changes
CREATE TABLE IF NOT EXISTS public.feature_flag_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_flag_id UUID REFERENCES public.feature_flags(id) ON DELETE SET NULL,
    feature_flag_name TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'override_added', 'override_removed')),
    old_value JSONB,
    new_value JSONB,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.feature_flag_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit log
CREATE POLICY "feature_flag_audit_select_admin" ON public.feature_flag_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE user_id = auth.uid()
        )
    );

-- Create trigger for audit logging on feature_flags
CREATE OR REPLACE FUNCTION public.log_feature_flag_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.feature_flag_audit_log (feature_flag_id, feature_flag_name, action, new_value, changed_by)
        VALUES (NEW.id, NEW.name, 'created', to_jsonb(NEW), auth.uid());
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.feature_flag_audit_log (feature_flag_id, feature_flag_name, action, old_value, new_value, changed_by)
        VALUES (NEW.id, NEW.name, 'updated', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.feature_flag_audit_log (feature_flag_id, feature_flag_name, action, old_value, changed_by)
        VALUES (OLD.id, OLD.name, 'deleted', to_jsonb(OLD), auth.uid());
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_feature_flag_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.feature_flags
    FOR EACH ROW
    EXECUTE FUNCTION public.log_feature_flag_changes();

-- Insert default feature flags
INSERT INTO public.feature_flags (name, description, enabled, rollout_percentage) VALUES
    ('new_booking_flow', 'New booking flow with improved UX', false, 0),
    ('wallet_v2', 'New wallet interface with additional features', false, 0),
    ('ai_car_descriptions', 'AI-generated car descriptions', false, 10),
    ('dark_mode', 'Dark mode theme support', true, 100),
    ('push_notifications', 'Push notification support', true, 100),
    ('map_clustering', 'Map marker clustering for performance', true, 100)
ON CONFLICT (name) DO NOTHING;

-- Enable realtime for feature_flags
ALTER PUBLICATION supabase_realtime ADD TABLE public.feature_flags;

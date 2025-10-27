-- Tabla para estados de onboarding de Mercado Pago
CREATE TABLE IF NOT EXISTS public.mp_onboarding_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    state TEXT NOT NULL UNIQUE,
    redirect_uri TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_mp_onboarding_user_id ON public.mp_onboarding_states(user_id);
CREATE INDEX IF NOT EXISTS idx_mp_onboarding_state ON public.mp_onboarding_states(state);
CREATE INDEX IF NOT EXISTS idx_mp_onboarding_completed ON public.mp_onboarding_states(completed);

-- RLS policies
ALTER TABLE public.mp_onboarding_states ENABLE ROW LEVEL SECURITY;

-- Policy: Los usuarios pueden ver sus propios estados
CREATE POLICY "Users can view own onboarding states"
    ON public.mp_onboarding_states FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Los usuarios pueden insertar sus propios estados
CREATE POLICY "Users can insert own onboarding states"
    ON public.mp_onboarding_states FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Los usuarios pueden actualizar sus propios estados
CREATE POLICY "Users can update own onboarding states"
    ON public.mp_onboarding_states FOR UPDATE
    USING (auth.uid() = user_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_mp_onboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mp_onboarding_states_updated_at
    BEFORE UPDATE ON public.mp_onboarding_states
    FOR EACH ROW
    EXECUTE FUNCTION public.update_mp_onboarding_updated_at();

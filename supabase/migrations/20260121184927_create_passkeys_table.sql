-- ============================================
-- PASSKEYS (WebAuthn) TABLE
-- ============================================
-- Almacena las credenciales de passkeys/WebAuthn para cada usuario
-- Permite autenticación sin contraseña usando huella, Face ID, etc.

-- Crear tabla de passkeys
CREATE TABLE IF NOT EXISTS public.passkeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Credencial WebAuthn
    credential_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    counter BIGINT NOT NULL DEFAULT 0,

    -- Metadata del dispositivo
    device_type TEXT, -- 'platform' (built-in) o 'cross-platform' (security key)
    transports TEXT[], -- ['internal', 'usb', 'ble', 'nfc', 'hybrid']

    -- Información del dispositivo para UI
    device_name TEXT, -- Nombre amigable ej: "iPhone de Juan"
    last_used_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_passkeys_user_id ON public.passkeys(user_id);
CREATE INDEX IF NOT EXISTS idx_passkeys_credential_id ON public.passkeys(credential_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_passkeys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_passkeys_updated_at ON public.passkeys;
CREATE TRIGGER trigger_passkeys_updated_at
    BEFORE UPDATE ON public.passkeys
    FOR EACH ROW
    EXECUTE FUNCTION update_passkeys_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.passkeys ENABLE ROW LEVEL SECURITY;

-- Usuarios solo pueden ver sus propias passkeys
CREATE POLICY "Users can view own passkeys"
    ON public.passkeys FOR SELECT
    USING (auth.uid() = user_id);

-- Usuarios solo pueden insertar sus propias passkeys
CREATE POLICY "Users can insert own passkeys"
    ON public.passkeys FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Usuarios solo pueden actualizar sus propias passkeys
CREATE POLICY "Users can update own passkeys"
    ON public.passkeys FOR UPDATE
    USING (auth.uid() = user_id);

-- Usuarios solo pueden eliminar sus propias passkeys
CREATE POLICY "Users can delete own passkeys"
    ON public.passkeys FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- CHALLENGE STORE (temporal para WebAuthn flow)
-- ============================================
-- Los challenges son temporales y expiran rápido
CREATE TABLE IF NOT EXISTS public.passkey_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    challenge TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('registration', 'authentication')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para buscar challenges por usuario
CREATE INDEX IF NOT EXISTS idx_passkey_challenges_user_id ON public.passkey_challenges(user_id);

-- Limpiar challenges expirados automáticamente
CREATE OR REPLACE FUNCTION cleanup_expired_passkey_challenges()
RETURNS void AS $$
BEGIN
    DELETE FROM public.passkey_challenges WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- RLS para challenges
ALTER TABLE public.passkey_challenges ENABLE ROW LEVEL SECURITY;

-- Service role puede hacer todo (las Edge Functions usan service role)
CREATE POLICY "Service role full access to challenges"
    ON public.passkey_challenges FOR ALL
    USING (true)
    WITH CHECK (true);

-- Comentarios para documentación
COMMENT ON TABLE public.passkeys IS 'Almacena credenciales WebAuthn/Passkeys para autenticación sin contraseña';
COMMENT ON TABLE public.passkey_challenges IS 'Almacena challenges temporales para el flujo de WebAuthn';
COMMENT ON COLUMN public.passkeys.credential_id IS 'ID único de la credencial WebAuthn (base64url encoded)';
COMMENT ON COLUMN public.passkeys.public_key IS 'Clave pública de la credencial (base64url encoded)';
COMMENT ON COLUMN public.passkeys.counter IS 'Contador de uso para prevenir replay attacks';

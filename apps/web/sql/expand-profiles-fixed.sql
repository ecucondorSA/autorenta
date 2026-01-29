-- =============================================
-- EXPAND PROFILES - Migración Incremental CORREGIDA
-- Fecha: 2025-10-16
-- Descripción: Expande tabla profiles con campos
-- completos de perfil de usuario, KYC y onboarding
-- =============================================

-- 1. TIPOS ENUMERADOS
-- =============================================

-- Estados de verificación / KYC
DO $$ BEGIN
  CREATE TYPE kyc_status AS ENUM ('not_started', 'pending', 'verified', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Estados de onboarding
DO $$ BEGIN
  CREATE TYPE onboarding_status AS ENUM ('incomplete', 'complete');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tipos de documentos
DO $$ BEGIN
  CREATE TYPE document_kind AS ENUM (
    'gov_id_front',
    'gov_id_back',
    'driver_license',
    'utility_bill',
    'selfie'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. EXPANSIÓN DE COLUMNAS EN PROFILES
-- =============================================

-- Información de contacto
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- Documentos de identidad
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gov_id_type TEXT,
  ADD COLUMN IF NOT EXISTS gov_id_number TEXT,
  ADD COLUMN IF NOT EXISTS driver_license_number TEXT,
  ADD COLUMN IF NOT EXISTS driver_license_country TEXT,
  ADD COLUMN IF NOT EXISTS driver_license_expiry DATE;

-- Dirección
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT;

-- Preferencias de usuario
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Montevideo',
  ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'es-UY',
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'UYU';

-- Estados de verificación y onboarding
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS kyc kyc_status NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS onboarding onboarding_status NOT NULL DEFAULT 'incomplete';

-- Términos y condiciones
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tos_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN DEFAULT false;

-- Preferencias de notificaciones (JSONB)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notif_prefs JSONB DEFAULT jsonb_build_object(
    'email', jsonb_build_object('bookings', true, 'promotions', false),
    'push',  jsonb_build_object('bookings', true, 'promotions', false),
    'whatsapp', jsonb_build_object('bookings', true, 'promotions', false)
  );

-- Métricas de usuario
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS rating_avg NUMERIC(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

-- Flags de verificación
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_phone_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_driver_verified BOOLEAN DEFAULT false;

-- Campo is_admin (si no existe)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 3. TABLA DE DOCUMENTOS DE USUARIO
-- =============================================

CREATE TABLE IF NOT EXISTS public.user_documents (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind document_kind NOT NULL,
  storage_path TEXT NOT NULL,
  status kyc_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ
);

-- Índices para user_documents
CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON public.user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_status ON public.user_documents(status);

-- RLS para user_documents
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

-- El propietario puede ver sus documentos
DROP POLICY IF EXISTS "owner can see own documents" ON public.user_documents;
CREATE POLICY "owner can see own documents"
  ON public.user_documents FOR SELECT
  USING (auth.uid() = user_id);

-- El propietario puede insertar sus documentos
DROP POLICY IF EXISTS "owner can insert own documents" ON public.user_documents;
CREATE POLICY "owner can insert own documents"
  ON public.user_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin puede ver y actualizar todos los documentos
DROP POLICY IF EXISTS "admin can manage documents" ON public.user_documents;
CREATE POLICY "admin can manage documents"
  ON public.user_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 4. TABLA DE AUDITORÍA DE PERFIL
-- =============================================

CREATE TABLE IF NOT EXISTS public.profile_audit (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES public.profiles(id),
  changes JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para profile_audit
CREATE INDEX IF NOT EXISTS idx_profile_audit_user_id ON public.profile_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_audit_created_at ON public.profile_audit(created_at DESC);

-- RLS para profile_audit
ALTER TABLE public.profile_audit ENABLE ROW LEVEL SECURITY;

-- El usuario ve su propia auditoría
DROP POLICY IF EXISTS "user sees own audit" ON public.profile_audit;
CREATE POLICY "user sees own audit"
  ON public.profile_audit FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 5. FUNCIONES Y VISTAS
-- =============================================

-- Vista enriquecida del perfil del usuario actual
CREATE OR REPLACE VIEW public.me_profile AS
SELECT p.*,
  (p.role IN ('owner', 'both')) AS can_publish_cars,
  (p.role IN ('renter', 'both')) AS can_book_cars
FROM public.profiles p
WHERE p.id = auth.uid();

-- Función para actualizar perfil de forma segura (whitelist de campos)
CREATE OR REPLACE FUNCTION public.update_profile_safe(_payload JSONB)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _uid UUID := auth.uid();
  _allowed JSONB;
  _updated public.profiles;
  _old_data JSONB;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Obtener datos actuales para auditoría
  SELECT row_to_json(p)::JSONB INTO _old_data
  FROM public.profiles p WHERE id = _uid;

  -- Whitelist de campos editables (excluir campos del sistema)
  _allowed := _payload - ARRAY[
    'id',
    'rating_avg',
    'rating_count',
    'kyc',
    'onboarding',
    'is_email_verified',
    'is_phone_verified',
    'is_driver_verified',
    'is_admin',
    'created_at'
  ];

  -- Actualizar perfil
  UPDATE public.profiles p
  SET
    full_name = COALESCE(_allowed->>'full_name', p.full_name),
    role = COALESCE((_allowed->>'role')::TEXT, p.role),
    phone = COALESCE(_allowed->>'phone', p.phone),
    whatsapp = COALESCE(_allowed->>'whatsapp', p.whatsapp),
    gov_id_type = COALESCE(_allowed->>'gov_id_type', p.gov_id_type),
    gov_id_number = COALESCE(_allowed->>'gov_id_number', p.gov_id_number),
    driver_license_number = COALESCE(_allowed->>'driver_license_number', p.driver_license_number),
    driver_license_country = COALESCE(_allowed->>'driver_license_country', p.driver_license_country),
    driver_license_expiry = COALESCE((_allowed->>'driver_license_expiry')::DATE, p.driver_license_expiry),
    address_line1 = COALESCE(_allowed->>'address_line1', p.address_line1),
    address_line2 = COALESCE(_allowed->>'address_line2', p.address_line2),
    city = COALESCE(_allowed->>'city', p.city),
    state = COALESCE(_allowed->>'state', p.state),
    postal_code = COALESCE(_allowed->>'postal_code', p.postal_code),
    country = COALESCE(_allowed->>'country', p.country),
    locale = COALESCE(_allowed->>'locale', p.locale),
    timezone = COALESCE(_allowed->>'timezone', p.timezone),
    currency = COALESCE(_allowed->>'currency', p.currency),
    marketing_opt_in = COALESCE((_allowed->>'marketing_opt_in')::BOOLEAN, p.marketing_opt_in),
    notif_prefs = COALESCE((_allowed->>'notif_prefs')::JSONB, p.notif_prefs),
    tos_accepted_at = CASE
      WHEN (_allowed ? 'tos_accepted_at') AND (_allowed->>'tos_accepted_at')::BOOLEAN = true
      THEN now()
      ELSE p.tos_accepted_at
    END
  WHERE p.id = _uid
  RETURNING * INTO _updated;

  -- Registrar auditoría
  INSERT INTO public.profile_audit (user_id, changed_by, changes)
  VALUES (_uid, _uid, jsonb_build_object(
    'before', _old_data,
    'after', row_to_json(_updated)::JSONB,
    'payload', _allowed
  ));

  RETURN _updated;
END $$;

-- Función para setear avatar (luego de subir a Storage)
CREATE OR REPLACE FUNCTION public.set_avatar(_public_url TEXT)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  UPDATE public.profiles
  SET avatar_url = _public_url
  WHERE id = auth.uid();
$$;

-- Función helper para verificar si usuario es admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- 6. COMENTARIOS PARA DOCUMENTACIÓN
-- =============================================

COMMENT ON TABLE public.user_documents IS 'Documentos de verificación de identidad (KYC)';
COMMENT ON TABLE public.profile_audit IS 'Auditoría de cambios en perfiles de usuario';
COMMENT ON VIEW public.me_profile IS 'Vista enriquecida del perfil del usuario autenticado';
COMMENT ON FUNCTION public.update_profile_safe IS 'Actualización segura de perfil con whitelist de campos';
COMMENT ON FUNCTION public.set_avatar IS 'Actualiza URL del avatar del usuario';
COMMENT ON FUNCTION public.is_admin IS 'Verifica si el usuario actual es administrador';

-- =============================================
-- FIN DE MIGRACIÓN
-- =============================================

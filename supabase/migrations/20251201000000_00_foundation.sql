SET search_path = public, auth, extensions;
-- Setup script for public.profiles table with RLS policies

-- Crear tabla public.profiles si no existe
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  default_currency TEXT NOT NULL DEFAULT 'ARS',
  role TEXT NOT NULL DEFAULT 'locatario' CHECK (role IN ('locador', 'locatario', 'ambos')),
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver su propio perfil
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Política: Los usuarios pueden actualizar su propio perfil
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Política: Los usuarios pueden insertar su propio perfil
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Política: Los usuarios autenticados pueden ver perfiles de otros (para ver propietarios de autos)
DROP POLICY IF EXISTS "Authenticated users can view all public.profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view all public.profiles"
  ON public.profiles
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Función para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.public.profiles (id, full_name, default_currency, role, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'default_currency', 'ARS'),
    'locatario',
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para ejecutar la función al crear un nuevo usuario
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Crear bucket de storage para avatars si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Política de storage: Los usuarios pueden subir su propio avatar
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Política de storage: Los usuarios pueden actualizar su propio avatar
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Política de storage: Los usuarios pueden eliminar su propio avatar
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Política de storage: Todos pueden ver los avatars (bucket público)
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Anyone can view avatars"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');
-- =============================================
-- STORAGE SETUP - Documents Bucket
-- Fecha: 2025-10-16
-- Descripción: Configuración del bucket privado
-- para documentos de verificación KYC
-- =============================================

-- 1. CREAR BUCKET DE DOCUMENTOS (PRIVADO)
-- =============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- 2. POLÍTICAS RLS PARA BUCKET DOCUMENTS
-- =============================================

-- El propietario puede leer sus propios documentos
DROP POLICY IF EXISTS "owner read own documents" ON storage.objects;
CREATE POLICY "owner read own documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- El propietario puede subir sus propios documentos
DROP POLICY IF EXISTS "owner upload own documents" ON storage.objects;
CREATE POLICY "owner upload own documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- El propietario puede actualizar sus propios documentos
DROP POLICY IF EXISTS "owner update own documents" ON storage.objects;
CREATE POLICY "owner update own documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- El propietario puede eliminar sus propios documentos
DROP POLICY IF EXISTS "owner delete own documents" ON storage.objects;
CREATE POLICY "owner delete own documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admin puede ver todos los documentos
DROP POLICY IF EXISTS "admin read all documents" ON storage.objects;
CREATE POLICY "admin read all documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Admin puede gestionar todos los documentos
DROP POLICY IF EXISTS "admin manage all documents" ON storage.objects;
CREATE POLICY "admin manage all documents"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    bucket_id = 'documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- =============================================
-- NOTAS IMPORTANTES
-- =============================================
--
-- ESTRUCTURA DE PATHS:
-- - documents/{userId}/{uuid}-{filename}.{ext}
-- - Ejemplo: documents/550e8400-e29b-41d4-a716-446655440000/abc123-dni-front.jpg
--
-- NO incluir el nombre del bucket en el path:
-- ❌ INCORRECTO: documents/550e8400.../file.jpg
-- ✅ CORRECTO: 550e8400.../file.jpg
--
-- RLS valida que (storage.foldername(name))[1] = auth.uid()::text
--
-- =============================================

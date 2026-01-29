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

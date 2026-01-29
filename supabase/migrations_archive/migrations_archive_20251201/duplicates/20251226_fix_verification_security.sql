-- ============================================================================
-- Migración: Fix Verificación Seguridad
-- Fecha: 2025-12-26
-- Descripción: Corrige problemas críticos de seguridad en sistema de verificación
-- ============================================================================

-- ============================================================================
-- 1. RLS POLICIES PARA SERVICE_ROLE EN USER_DOCUMENTS
-- ============================================================================
-- El service_role necesita poder actualizar user_documents desde edge functions

-- Verificar si la política ya existe antes de crearla
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_documents'
    AND policyname = 'service_role_full_access'
  ) THEN
    CREATE POLICY "service_role_full_access"
      ON public.user_documents
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================================================
-- 2. RLS POLICIES PARA USER_VERIFICATIONS
-- ============================================================================
-- El service_role necesita INSERT, UPDATE, DELETE
-- Los admins necesitan SELECT para revisar verificaciones

-- Policy para service_role (INSERT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_verifications'
    AND policyname = 'service_role_insert'
  ) THEN
    CREATE POLICY "service_role_insert"
      ON public.user_verifications
      FOR INSERT
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- Policy para service_role (UPDATE)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_verifications'
    AND policyname = 'service_role_update'
  ) THEN
    CREATE POLICY "service_role_update"
      ON public.user_verifications
      FOR UPDATE
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- Policy para service_role (DELETE)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_verifications'
    AND policyname = 'service_role_delete'
  ) THEN
    CREATE POLICY "service_role_delete"
      ON public.user_verifications
      FOR DELETE
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Policy para admins (SELECT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_verifications'
    AND policyname = 'admins_view_verifications'
  ) THEN
    CREATE POLICY "admins_view_verifications"
      ON public.user_verifications
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

-- ============================================================================
-- 3. UNIQUE CONSTRAINT PARA DOCUMENTOS
-- ============================================================================
-- Prevenir que el mismo número de documento sea usado por múltiples usuarios
-- Esto previene fraude de identidad

-- Primero verificar si hay duplicados
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT document_number
    FROM public.user_identity_levels
    WHERE document_number IS NOT NULL
    GROUP BY document_number
    HAVING COUNT(*) > 1
  ) AS duplicates;

  IF duplicate_count > 0 THEN
    RAISE NOTICE 'ADVERTENCIA: Existen % números de documento duplicados. El índice único no se creará.', duplicate_count;
  END IF;
END $$;

-- Crear índice único solo si no hay duplicados
DO $$
BEGIN
  -- Verificar que no existan duplicados antes de crear el índice
  IF NOT EXISTS (
    SELECT 1
    FROM public.user_identity_levels
    WHERE document_number IS NOT NULL
    GROUP BY document_number
    HAVING COUNT(*) > 1
  ) THEN
    -- Eliminar índice no-único existente si existe
    DROP INDEX IF EXISTS idx_user_identity_levels_document_number;

    -- Crear índice único
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_identity_unique_document
      ON public.user_identity_levels(document_number)
      WHERE document_number IS NOT NULL;

    RAISE NOTICE 'Índice único idx_user_identity_unique_document creado exitosamente.';
  ELSE
    RAISE WARNING 'No se puede crear índice único: existen documentos duplicados.';
  END IF;
END $$;

-- ============================================================================
-- 4. TRIGGER PARA SINCRONIZAR user_identity_levels → user_verifications
-- ============================================================================
-- Cuando document_verified_at cambia, actualizar user_verifications automáticamente

CREATE OR REPLACE FUNCTION public.sync_identity_to_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_driver_verification BOOLEAN;
  v_has_owner_verification BOOLEAN;
BEGIN
  -- Solo procesar si document_verified_at cambió
  IF NEW.document_verified_at IS DISTINCT FROM OLD.document_verified_at THEN

    -- Verificar si tiene verificación como driver
    SELECT EXISTS (
      SELECT 1 FROM user_verifications
      WHERE user_id = NEW.user_id AND role = 'driver'
    ) INTO v_has_driver_verification;

    -- Verificar si tiene verificación como owner
    SELECT EXISTS (
      SELECT 1 FROM user_verifications
      WHERE user_id = NEW.user_id AND role = 'owner'
    ) INTO v_has_owner_verification;

    -- Si el documento fue verificado (document_verified_at no es NULL)
    IF NEW.document_verified_at IS NOT NULL THEN
      -- Actualizar verificación de driver si existe
      IF v_has_driver_verification THEN
        UPDATE user_verifications
        SET
          updated_at = NOW(),
          notes = COALESCE(notes, '') || ' | Documento verificado automáticamente ' || NOW()::TEXT
        WHERE user_id = NEW.user_id AND role = 'driver';
      END IF;

      -- Actualizar verificación de owner si existe
      IF v_has_owner_verification THEN
        UPDATE user_verifications
        SET
          updated_at = NOW(),
          notes = COALESCE(notes, '') || ' | Documento verificado automáticamente ' || NOW()::TEXT
        WHERE user_id = NEW.user_id AND role = 'owner';
      END IF;

      -- Actualizar profiles.id_verified si ambos documentos están verificados
      UPDATE profiles
      SET id_verified = TRUE
      WHERE id = NEW.user_id
        AND NEW.document_verified_at IS NOT NULL
        AND NEW.driver_license_verified_at IS NOT NULL;

    END IF;

  END IF;

  RETURN NEW;
END;
$$;

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS trg_sync_identity_verification ON public.user_identity_levels;
CREATE TRIGGER trg_sync_identity_verification
  AFTER UPDATE ON public.user_identity_levels
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_identity_to_verification();

-- ============================================================================
-- 5. ÍNDICES DE PERFORMANCE
-- ============================================================================
-- Índices para mejorar queries de verificación

-- Índice para user_documents (user_id, status)
CREATE INDEX IF NOT EXISTS idx_user_documents_user_status
  ON public.user_documents(user_id, status);

-- Índice para user_identity_levels (document_verified_at) donde no es null
CREATE INDEX IF NOT EXISTS idx_user_identity_levels_verified
  ON public.user_identity_levels(document_verified_at)
  WHERE document_verified_at IS NOT NULL;

-- Índice para vehicle_documents (vehicle_id, insurance_expiry)
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_expiry
  ON public.vehicle_documents(vehicle_id, insurance_expiry, vtv_expiry);

-- ============================================================================
-- 6. COMENTARIOS DE DOCUMENTACIÓN
-- ============================================================================
COMMENT ON POLICY "service_role_full_access" ON public.user_documents IS
  'Permite a edge functions (service_role) gestionar documentos de usuarios';

COMMENT ON TRIGGER trg_sync_identity_verification ON public.user_identity_levels IS
  'Sincroniza automáticamente cambios en document_verified_at con user_verifications y profiles';

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================
DO $$
DECLARE
  policy_count INTEGER;
  index_count INTEGER;
BEGIN
  -- Contar políticas en user_documents
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies WHERE tablename = 'user_documents';

  RAISE NOTICE 'Políticas en user_documents: %', policy_count;

  -- Contar políticas en user_verifications
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies WHERE tablename = 'user_verifications';

  RAISE NOTICE 'Políticas en user_verifications: %', policy_count;

  -- Contar índices en user_identity_levels
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes WHERE tablename = 'user_identity_levels';

  RAISE NOTICE 'Índices en user_identity_levels: %', index_count;
END $$;

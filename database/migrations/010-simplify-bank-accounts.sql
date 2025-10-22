-- =====================================================
-- Migration 010: Simplify Bank Accounts
-- =====================================================
-- Fecha: 2025-10-22
-- Propósito: Eliminar duplicación de datos entre profiles y bank_accounts
--
-- CAMBIOS:
-- 1. account_holder_document ya no es necesario (usar gov_id_number del perfil)
-- 2. account_holder_name se mantiene por flexibilidad (ej: cuentas de terceros)
-- =====================================================

-- =====================================================
-- 1. HACER account_holder_document OPCIONAL
-- =====================================================

-- Remover constraint NOT NULL si existe
ALTER TABLE bank_accounts
ALTER COLUMN account_holder_document DROP NOT NULL;

COMMENT ON COLUMN bank_accounts.account_holder_document IS
'⚠️ DEPRECATED: Usar profiles.gov_id_number en su lugar.
Se mantiene por backward compatibility pero no es requerido.
El sistema ahora obtiene el documento del perfil del usuario automáticamente.';

-- =====================================================
-- 2. AGREGAR VALIDACIÓN EN LA TABLA profiles
-- =====================================================

-- Asegurar que gov_id_number existe en profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles'
      AND column_name = 'gov_id_number'
  ) THEN
    ALTER TABLE profiles ADD COLUMN gov_id_number TEXT;

    COMMENT ON COLUMN profiles.gov_id_number IS
    'Número de documento de identidad gubernamental (DNI, CI, Pasaporte, etc).
    Requerido para operaciones financieras como retiros bancarios.';
  END IF;
END $$;

-- =====================================================
-- 3. FUNCIÓN PARA VALIDAR CUENTA BANCARIA
-- =====================================================

CREATE OR REPLACE FUNCTION validate_bank_account_with_profile()
RETURNS TRIGGER AS $$
DECLARE
  v_profile_name TEXT;
  v_gov_id TEXT;
BEGIN
  -- Obtener datos del perfil
  SELECT full_name, gov_id_number
  INTO v_profile_name, v_gov_id
  FROM profiles
  WHERE id = NEW.user_id;

  -- Validar que el usuario tenga nombre completo
  IF v_profile_name IS NULL OR TRIM(v_profile_name) = '' THEN
    RAISE EXCEPTION 'El usuario debe completar su nombre completo en el perfil antes de agregar una cuenta bancaria';
  END IF;

  -- Validar que el usuario tenga documento
  IF v_gov_id IS NULL OR TRIM(v_gov_id) = '' THEN
    RAISE EXCEPTION 'El usuario debe completar su número de documento en el perfil antes de agregar una cuenta bancaria';
  END IF;

  -- Si account_holder_name está vacío, usar el del perfil
  IF NEW.account_holder_name IS NULL OR TRIM(NEW.account_holder_name) = '' THEN
    NEW.account_holder_name := v_profile_name;
  END IF;

  -- Si account_holder_document está vacío o es el del perfil, limpiar
  IF NEW.account_holder_document IS NULL OR
     TRIM(NEW.account_holder_document) = '' OR
     NEW.account_holder_document = v_gov_id THEN
    NEW.account_holder_document := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. TRIGGER PARA VALIDACIÓN
-- =====================================================

DROP TRIGGER IF EXISTS tg_validate_bank_account_with_profile ON bank_accounts;

CREATE TRIGGER tg_validate_bank_account_with_profile
  BEFORE INSERT OR UPDATE ON bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION validate_bank_account_with_profile();

-- =====================================================
-- 5. VISTA MEJORADA PARA CUENTAS BANCARIAS
-- =====================================================

CREATE OR REPLACE VIEW v_bank_accounts_with_profile AS
SELECT
  ba.id,
  ba.user_id,
  ba.account_type,
  ba.account_number,
  ba.account_holder_name,
  -- Usar gov_id_number del perfil si account_holder_document es NULL
  COALESCE(ba.account_holder_document, p.gov_id_number) as account_holder_document,
  ba.bank_name,
  ba.is_verified,
  ba.verified_at,
  ba.verification_method,
  ba.is_active,
  ba.is_default,
  ba.created_at,
  ba.updated_at,
  -- Datos adicionales del perfil
  p.full_name as profile_full_name,
  p.gov_id_number as profile_gov_id_number,
  p.is_email_verified,
  p.is_phone_verified
FROM bank_accounts ba
JOIN profiles p ON ba.user_id = p.id;

COMMENT ON VIEW v_bank_accounts_with_profile IS
'Vista que combina bank_accounts con datos del perfil.
Usa profiles.gov_id_number cuando account_holder_document es NULL.';

-- =====================================================
-- 6. MIGRAR DATOS EXISTENTES (OPCIONAL)
-- =====================================================

-- Limpiar account_holder_document cuando coincide con gov_id_number
UPDATE bank_accounts ba
SET account_holder_document = NULL
FROM profiles p
WHERE ba.user_id = p.id
  AND ba.account_holder_document = p.gov_id_number;

-- Actualizar account_holder_name si está vacío
UPDATE bank_accounts ba
SET account_holder_name = p.full_name
FROM profiles p
WHERE ba.user_id = p.id
  AND (ba.account_holder_name IS NULL OR TRIM(ba.account_holder_name) = '');

-- =====================================================
-- 7. GRANTS
-- =====================================================

GRANT SELECT ON v_bank_accounts_with_profile TO authenticated;
GRANT SELECT ON v_bank_accounts_with_profile TO service_role;

-- =====================================================
-- 8. COMENTARIOS FINALES
-- =====================================================

COMMENT ON TABLE bank_accounts IS
'Cuentas bancarias de usuarios para retiros.

CAMBIOS EN ESTA VERSIÓN:
- account_holder_document es opcional (usar profiles.gov_id_number)
- Trigger valida datos del perfil antes de insertar
- Vista v_bank_accounts_with_profile combina ambas fuentes

MIGRACIÓN:
- Frontend ahora obtiene nombre y documento del perfil automáticamente
- Backend valida que el usuario tenga estos datos antes de permitir crear cuenta
';

-- =====================================================
-- FIN DE MIGRACIÓN 010
-- =====================================================

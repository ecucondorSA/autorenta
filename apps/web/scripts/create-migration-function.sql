-- 🔧 Función SQL para agregar 'both' al enum user_role
-- Ejecuta este archivo UNA VEZ en Supabase Dashboard → SQL Editor

-- Función para agregar el valor 'both' al enum user_role
CREATE OR REPLACE FUNCTION add_both_to_user_role_enum()
RETURNS jsonb AS $$
DECLARE
  enum_exists boolean;
  value_exists boolean;
BEGIN
  -- Verificar si el enum existe
  SELECT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'user_role'
  ) INTO enum_exists;

  IF NOT enum_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'El enum user_role no existe'
    );
  END IF;

  -- Verificar si 'both' ya existe
  SELECT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'both'
    AND enumtypid = 'user_role'::regtype
  ) INTO value_exists;

  IF value_exists THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'El valor "both" ya existe en el enum',
      'action', 'none'
    );
  END IF;

  -- Agregar el valor 'both' al enum
  BEGIN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'both';

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Valor "both" agregado exitosamente al enum user_role',
      'action', 'added'
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Error al agregar valor: ' || SQLERRM
    );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ejecutar la función inmediatamente
SELECT add_both_to_user_role_enum();

-- Verificar los valores del enum
SELECT enumlabel as role_value, enumsortorder as sort_order
FROM pg_enum
WHERE enumtypid = 'user_role'::regtype
ORDER BY enumsortorder;

-- ============================================
-- VERIFICACIÓN: Función wallet_initiate_deposit
-- ============================================
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Verificar si la función existe
SELECT
    proname as function_name,
    pg_get_function_arguments(oid) as arguments,
    pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'wallet_initiate_deposit';

-- 2. Ver la firma de la función
SELECT
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_name = 'wallet_initiate_deposit';

-- 3. Ver los parámetros
SELECT
    parameter_name,
    data_type,
    parameter_mode
FROM information_schema.parameters
WHERE specific_name IN (
    SELECT specific_name
    FROM information_schema.routines
    WHERE routine_name = 'wallet_initiate_deposit'
)
ORDER BY ordinal_position;

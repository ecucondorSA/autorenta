-- ============================================
-- VERIFICACIÓN: Tabla booking_risk_snapshots
-- ============================================
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Verificar si la tabla existe
SELECT COUNT(*) as total_snapshots
FROM booking_risk_snapshots;

-- 2. Ver estructura de la tabla
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'booking_risk_snapshots'
ORDER BY ordinal_position;

-- 3. Ver algunos registros de ejemplo
SELECT *
FROM booking_risk_snapshots
ORDER BY created_at DESC
LIMIT 5;

-- 4. Verificar índices
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'booking_risk_snapshots';

-- 5. Verificar políticas RLS
SELECT
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'booking_risk_snapshots';

-- =====================================================
-- Ajuste de limites de uso para comodato
-- - Maximo 24 dias/mes compartidos
-- - Sin limite de dias consecutivos
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'owner_usage_limits'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'owner_usage_limits' AND column_name = 'max_days_allowed'
    ) THEN
      ALTER TABLE owner_usage_limits
        ALTER COLUMN max_days_allowed SET DEFAULT 24;
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'owner_usage_limits' AND column_name = 'max_consecutive_allowed'
    ) THEN
      ALTER TABLE owner_usage_limits
        ALTER COLUMN max_consecutive_allowed DROP DEFAULT;
    END IF;

    UPDATE owner_usage_limits
    SET max_days_allowed = 24,
        max_consecutive_allowed = NULL
    WHERE max_days_allowed IS DISTINCT FROM 24
       OR max_consecutive_allowed IS NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- MIGRATION: Add location_geom column and GiST index to cars
-- Date: 2025-11-16
-- Purpose: Crear columna geometry(Point,4326) y un índice GiST para mejorar
-- performance de consultas espaciales (ST_DistanceSphere / ST_DWithin) usadas
-- por la función get_available_cars.
-- ============================================================================

BEGIN;

-- 1) Añadir columna location_geom si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cars' AND column_name = 'location_geom'
  ) THEN
    ALTER TABLE public.cars
    ADD COLUMN location_geom geometry(Point, 4326);
  END IF;
END$$;

-- 2) Poblamos location_geom a partir de location_lng/location_lat cuando estén presentes
UPDATE public.cars
SET location_geom = ST_SetSRID(ST_MakePoint(location_lng::double precision, location_lat::double precision), 4326)
WHERE location_geom IS NULL
  AND location_lat IS NOT NULL
  AND location_lng IS NOT NULL;

-- 3) Crear índice GiST concurrente (si la base de datos lo soporta en el entorno)
-- Use CREATE INDEX CONCURRENTLY in production to avoid locking writes; in some
-- managed environments CONCURRENTLY is not allowed inside a transaction block.
-- We'll attempt a safe approach: try concurrent outside transaction if possible.

COMMIT;

-- Create index concurrently (not in a transaction)
-- Note: CREATE INDEX CONCURRENTLY must run outside a transaction block. Many
-- managed migration runners execute files inside transactions by default.
-- Recommended approach:
-- 1) Run this file to add and populate the column (it ends with COMMIT above).
-- 2) Run the CONCURRENTLY index creation as a separate command in the environment
--    where you execute migrations (e.g., via psql, CI runner or maintenance job):
--
--    psql "<YOUR_DB_CONN_STRING>" -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cars_location_geom_gist ON public.cars USING GIST (location_geom);"
--
-- If your environment does not support CONCURRENTLY in an automated step, run the
-- non-concurrent fallback (this may acquire locks):
--
--    psql "<YOUR_DB_CONN_STRING>" -c "CREATE INDEX IF NOT EXISTS idx_cars_location_geom_gist ON public.cars USING GIST (location_geom);"


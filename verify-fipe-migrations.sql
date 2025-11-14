-- ============================================================================
-- VERIFICATION SCRIPT: Check if FIPE migrations were applied correctly
-- ============================================================================

-- 1. Check if vehicle_model_equivalents table exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'vehicle_model_equivalents'
    ) THEN '✅ Table vehicle_model_equivalents exists'
    ELSE '❌ Table vehicle_model_equivalents NOT found'
  END AS table_check;

-- 2. Check if value_brl column exists in cars table
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'cars' 
      AND column_name = 'value_brl'
    ) THEN '✅ Column value_brl exists in cars'
    ELSE '❌ Column value_brl NOT found in cars'
  END AS value_brl_check;

-- 3. Check if value_ars column exists in cars table
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'cars' 
      AND column_name = 'value_ars'
    ) THEN '✅ Column value_ars exists in cars'
    ELSE '❌ Column value_ars NOT found in cars'
  END AS value_ars_check;

-- 4. Check if find_brazil_model_equivalent function exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name = 'find_brazil_model_equivalent'
    ) THEN '✅ Function find_brazil_model_equivalent exists'
    ELSE '❌ Function find_brazil_model_equivalent NOT found'
  END AS function_check;

-- 5. Check if cars_multi_currency view exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name = 'cars_multi_currency'
    ) THEN '✅ View cars_multi_currency exists'
    ELSE '❌ View cars_multi_currency NOT found'
  END AS view_check;

-- 6. Count records in vehicle_model_equivalents
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'vehicle_model_equivalents'
    ) THEN (
      SELECT COUNT(*)::text || ' records in vehicle_model_equivalents'
      FROM vehicle_model_equivalents
    )
    ELSE 'Table does not exist'
  END AS record_count;







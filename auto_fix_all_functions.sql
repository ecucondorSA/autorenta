-- ============================================================================
-- AUTO-FIX ALL SECURITY DEFINER FUNCTIONS WITHOUT search_path
-- ============================================================================
-- This script automatically fixes all 111 functions that need search_path
-- ============================================================================

DO $$
DECLARE
    func_record RECORD;
    func_def TEXT;
    new_def TEXT;
    drop_stmt TEXT;
    create_stmt TEXT;
    fixed_count INT := 0;
    error_count INT := 0;
BEGIN
    -- Create temporary table to log results
    CREATE TEMP TABLE IF NOT EXISTS fix_results (
        function_name TEXT,
        status TEXT,
        error_msg TEXT DEFAULT NULL
    );

    -- Loop through all SECURITY DEFINER functions that need fixing
    FOR func_record IN
        SELECT
            p.proname as function_name,
            pg_catalog.pg_get_function_identity_arguments(p.oid) as arguments,
            pg_catalog.pg_get_functiondef(p.oid) as definition,
            p.oid
        FROM pg_catalog.pg_proc p
        LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
        AND p.prosecdef = true  -- SECURITY DEFINER
        AND pg_catalog.pg_get_functiondef(p.oid) NOT ILIKE '%search_path%'  -- Needs fix
        ORDER BY p.proname
    LOOP
        BEGIN
            -- Get the function definition
            func_def := func_record.definition;

            -- Add SET search_path = 'public' after SECURITY DEFINER
            new_def := regexp_replace(
                func_def,
                '(SECURITY DEFINER)',
                '\1 SET search_path = ''public''',
                'i'
            );

            -- Execute the new definition
            EXECUTE new_def;

            -- Log success
            INSERT INTO fix_results(function_name, status)
            VALUES(func_record.function_name || '(' || func_record.arguments || ')', 'FIXED');

            fixed_count := fixed_count + 1;

        EXCEPTION WHEN OTHERS THEN
            -- Log error
            INSERT INTO fix_results(function_name, status, error_msg)
            VALUES(func_record.function_name || '(' || func_record.arguments || ')', 'ERROR', SQLERRM);

            error_count := error_count + 1;
        END;
    END LOOP;

    -- Report results
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FUNCTION FIX COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Functions fixed: %', fixed_count;
    RAISE NOTICE 'Errors encountered: %', error_count;
    RAISE NOTICE '========================================';

    -- Show detailed results
    RAISE NOTICE 'Showing results:';
END;
$$;

-- Show the results
SELECT * FROM fix_results ORDER BY status, function_name;

-- Verify the fix
SELECT
  'VERIFICATION SUMMARY' as report,
  COUNT(*) as total_security_definer,
  COUNT(CASE WHEN pg_catalog.pg_get_functiondef(p.oid) ILIKE '%search_path%' THEN 1 END) as with_search_path,
  COUNT(CASE WHEN pg_catalog.pg_get_functiondef(p.oid) NOT ILIKE '%search_path%' THEN 1 END) as still_need_fix
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND p.prosecdef = true;
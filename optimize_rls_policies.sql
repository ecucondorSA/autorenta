-- ============================================================================
-- OPTIMIZE RLS POLICIES - Fix auth_rls_initplan issues (171 policies)
-- ============================================================================
-- Replace auth.uid() with (SELECT auth.uid()) for better performance
-- ============================================================================

DO $$
DECLARE
    policy_record RECORD;
    current_qual TEXT;
    new_qual TEXT;
    fixed_count INT := 0;
    error_count INT := 0;
BEGIN
    -- Create temporary table to log results
    CREATE TEMP TABLE IF NOT EXISTS rls_optimization_results (
        table_name TEXT,
        policy_name TEXT,
        status TEXT,
        error_msg TEXT DEFAULT NULL
    );

    -- Loop through all policies that need optimization
    FOR policy_record IN
        SELECT
            n.nspname as schema_name,
            c.relname as table_name,
            pol.polname as policy_name,
            pg_get_expr(pol.polqual, pol.polrelid) as policy_qual,
            pol.polcmd as policy_cmd
        FROM pg_policy pol
        JOIN pg_class c ON c.oid = pol.polrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
        AND pg_get_expr(pol.polqual, pol.polrelid) LIKE '%auth.uid()%'
        AND pg_get_expr(pol.polqual, pol.polrelid) NOT LIKE '%(SELECT auth.uid())%'
    LOOP
        BEGIN
            -- Get current policy definition
            current_qual := policy_record.policy_qual;

            -- Replace auth.uid() with (SELECT auth.uid())
            new_qual := regexp_replace(current_qual, '\bauth\.uid\(\)', '(SELECT auth.uid())', 'g');

            -- Drop and recreate the policy with optimized version
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                policy_record.policy_name,
                policy_record.schema_name,
                policy_record.table_name
            );

            -- Recreate policy with optimized qual
            IF policy_record.policy_cmd = 'r' THEN
                EXECUTE format('CREATE POLICY %I ON %I.%I FOR SELECT USING (%s)',
                    policy_record.policy_name,
                    policy_record.schema_name,
                    policy_record.table_name,
                    new_qual
                );
            ELSIF policy_record.policy_cmd = 'a' THEN
                EXECUTE format('CREATE POLICY %I ON %I.%I FOR INSERT WITH CHECK (%s)',
                    policy_record.policy_name,
                    policy_record.schema_name,
                    policy_record.table_name,
                    new_qual
                );
            ELSIF policy_record.policy_cmd = 'w' THEN
                EXECUTE format('CREATE POLICY %I ON %I.%I FOR UPDATE USING (%s)',
                    policy_record.policy_name,
                    policy_record.schema_name,
                    policy_record.table_name,
                    new_qual
                );
            ELSIF policy_record.policy_cmd = 'd' THEN
                EXECUTE format('CREATE POLICY %I ON %I.%I FOR DELETE USING (%s)',
                    policy_record.policy_name,
                    policy_record.schema_name,
                    policy_record.table_name,
                    new_qual
                );
            ELSE
                EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (%s)',
                    policy_record.policy_name,
                    policy_record.schema_name,
                    policy_record.table_name,
                    new_qual
                );
            END IF;

            -- Log success
            INSERT INTO rls_optimization_results(table_name, policy_name, status)
            VALUES(policy_record.table_name, policy_record.policy_name, 'OPTIMIZED');

            fixed_count := fixed_count + 1;

        EXCEPTION WHEN OTHERS THEN
            -- Log error
            INSERT INTO rls_optimization_results(table_name, policy_name, status, error_msg)
            VALUES(policy_record.table_name, policy_record.policy_name, 'ERROR', SQLERRM);

            error_count := error_count + 1;
        END;
    END LOOP;

    -- Report results
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RLS OPTIMIZATION COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Policies optimized: %', fixed_count;
    RAISE NOTICE 'Errors encountered: %', error_count;
    RAISE NOTICE '========================================';
END;
$$;

-- Show the results
SELECT * FROM rls_optimization_results
ORDER BY status, table_name, policy_name
LIMIT 50;

-- Count by status
SELECT
    status,
    COUNT(*) as count
FROM rls_optimization_results
GROUP BY status;

-- Verify optimization
SELECT
    'RLS OPTIMIZATION VERIFICATION' as report,
    COUNT(*) FILTER (WHERE pg_get_expr(pol.polqual, pol.polrelid) LIKE '%auth.uid()%'
                      AND pg_get_expr(pol.polqual, pol.polrelid) NOT LIKE '%(SELECT auth.uid())%') as need_optimization,
    COUNT(*) FILTER (WHERE pg_get_expr(pol.polqual, pol.polrelid) LIKE '%(SELECT auth.uid())%') as already_optimized
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public';
-- ============================================================================
-- OPTIMIZACIÓN FINAL DE POLÍTICAS RLS
-- ============================================================================
-- Este script optimiza TODAS las políticas que usan auth.uid()
-- Cambia de auth.uid() a (SELECT auth.uid()) para usar InitPlan
-- ============================================================================

DO $$
DECLARE
    policy_record RECORD;
    new_qual TEXT;
    new_check TEXT;
    total_fixed INT := 0;
    total_errors INT := 0;
BEGIN
    -- Crear tabla temporal para logging
    CREATE TEMP TABLE IF NOT EXISTS rls_final_optimization (
        table_name TEXT,
        policy_name TEXT,
        status TEXT,
        error_msg TEXT DEFAULT NULL
    );

    -- Procesar todas las políticas que necesitan optimización
    FOR policy_record IN
        SELECT
            c.relname as table_name,
            pol.polname as policy_name,
            pol.polcmd as policy_cmd,
            pg_get_expr(pol.polqual, pol.polrelid) as policy_qual,
            pg_get_expr(pol.polwithcheck, pol.polrelid) as policy_check
        FROM pg_policy pol
        JOIN pg_class c ON c.oid = pol.polrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
        AND (
            (pg_get_expr(pol.polqual, pol.polrelid) LIKE '%auth.uid()%'
             AND pg_get_expr(pol.polqual, pol.polrelid) NOT LIKE '%(SELECT auth.uid())%')
            OR
            (pg_get_expr(pol.polwithcheck, pol.polrelid) LIKE '%auth.uid()%'
             AND pg_get_expr(pol.polwithcheck, pol.polrelid) NOT LIKE '%(SELECT auth.uid())%')
        )
        ORDER BY c.relname, pol.polname
    LOOP
        BEGIN
            -- Optimizar USING clause si existe
            IF policy_record.policy_qual IS NOT NULL THEN
                new_qual := regexp_replace(
                    policy_record.policy_qual,
                    '\bauth\.uid\(\)',
                    '(SELECT auth.uid())',
                    'g'
                );
            ELSE
                new_qual := NULL;
            END IF;

            -- Optimizar WITH CHECK clause si existe
            IF policy_record.policy_check IS NOT NULL THEN
                new_check := regexp_replace(
                    policy_record.policy_check,
                    '\bauth\.uid\(\)',
                    '(SELECT auth.uid())',
                    'g'
                );
            ELSE
                new_check := NULL;
            END IF;

            -- Eliminar política existente
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
                policy_record.policy_name,
                policy_record.table_name
            );

            -- Recrear política con versión optimizada
            IF policy_record.policy_cmd = 'r' THEN
                -- SELECT
                EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (%s)',
                    policy_record.policy_name,
                    policy_record.table_name,
                    new_qual
                );
            ELSIF policy_record.policy_cmd = 'a' THEN
                -- INSERT
                IF new_check IS NOT NULL THEN
                    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (%s)',
                        policy_record.policy_name,
                        policy_record.table_name,
                        new_check
                    );
                ELSE
                    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (%s)',
                        policy_record.policy_name,
                        policy_record.table_name,
                        new_qual
                    );
                END IF;
            ELSIF policy_record.policy_cmd = 'w' THEN
                -- UPDATE
                IF new_check IS NOT NULL THEN
                    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (%s) WITH CHECK (%s)',
                        policy_record.policy_name,
                        policy_record.table_name,
                        new_qual,
                        new_check
                    );
                ELSE
                    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (%s)',
                        policy_record.policy_name,
                        policy_record.table_name,
                        new_qual
                    );
                END IF;
            ELSIF policy_record.policy_cmd = 'd' THEN
                -- DELETE
                EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE USING (%s)',
                    policy_record.policy_name,
                    policy_record.table_name,
                    new_qual
                );
            ELSIF policy_record.policy_cmd = '*' THEN
                -- ALL
                IF new_check IS NOT NULL THEN
                    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (%s) WITH CHECK (%s)',
                        policy_record.policy_name,
                        policy_record.table_name,
                        new_qual,
                        new_check
                    );
                ELSE
                    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (%s)',
                        policy_record.policy_name,
                        policy_record.table_name,
                        new_qual
                    );
                END IF;
            END IF;

            -- Log success
            INSERT INTO rls_final_optimization (table_name, policy_name, status)
            VALUES (policy_record.table_name, policy_record.policy_name, 'OPTIMIZED');

            total_fixed := total_fixed + 1;

        EXCEPTION WHEN OTHERS THEN
            -- Log error
            INSERT INTO rls_final_optimization (table_name, policy_name, status, error_msg)
            VALUES (policy_record.table_name, policy_record.policy_name, 'ERROR', SQLERRM);

            total_errors := total_errors + 1;
            RAISE WARNING 'Error optimizando %.%: %',
                policy_record.table_name, policy_record.policy_name, SQLERRM;
        END;
    END LOOP;

    -- Mostrar resumen
    RAISE NOTICE '========================================';
    RAISE NOTICE 'OPTIMIZACIÓN RLS COMPLETA';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Políticas optimizadas: %', total_fixed;
    RAISE NOTICE 'Errores encontrados: %', total_errors;
    RAISE NOTICE '========================================';
END;
$$;

-- Mostrar resultados detallados
SELECT
    status,
    COUNT(*) as count,
    STRING_AGG(table_name || '.' || policy_name, ', ' ORDER BY table_name) as policies
FROM rls_final_optimization
GROUP BY status;

-- Verificación final
SELECT
    'VERIFICACIÓN FINAL' as reporte,
    COUNT(*) as total_policies,
    COUNT(*) FILTER (WHERE
        pg_get_expr(pol.polqual, pol.polrelid) LIKE '%(SELECT auth.uid())%'
        OR pg_get_expr(pol.polwithcheck, pol.polrelid) LIKE '%(SELECT auth.uid())%'
    ) as optimized,
    COUNT(*) FILTER (WHERE
        (pg_get_expr(pol.polqual, pol.polrelid) LIKE '%auth.uid()%'
         AND pg_get_expr(pol.polqual, pol.polrelid) NOT LIKE '%(SELECT auth.uid())%')
        OR
        (pg_get_expr(pol.polwithcheck, pol.polrelid) LIKE '%auth.uid()%'
         AND pg_get_expr(pol.polwithcheck, pol.polrelid) NOT LIKE '%(SELECT auth.uid())%')
    ) as needs_optimization
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public';

-- Mostrar algunas políticas optimizadas como ejemplo
SELECT
    c.relname as table_name,
    pol.polname as policy_name,
    CASE pol.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
    END as operation,
    CASE
        WHEN pg_get_expr(pol.polqual, pol.polrelid) LIKE '%(SELECT auth.uid())%' THEN '✅ OPTIMIZED'
        WHEN pg_get_expr(pol.polwithcheck, pol.polrelid) LIKE '%(SELECT auth.uid())%' THEN '✅ OPTIMIZED'
        ELSE '⚠️ NEEDS OPTIMIZATION'
    END as status
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
AND (pg_get_expr(pol.polqual, pol.polrelid) LIKE '%auth.uid()%'
     OR pg_get_expr(pol.polwithcheck, pol.polrelid) LIKE '%auth.uid()%')
ORDER BY status DESC, c.relname, pol.polname
LIMIT 20;
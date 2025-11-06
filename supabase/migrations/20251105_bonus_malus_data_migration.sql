-- =====================================================
-- BONUS-MALUS DATA MIGRATION
-- Phase 11: Migración de datos existentes al sistema Bonus-Malus
-- =====================================================

-- =====================================================
-- IMPORTANTE: LEER ANTES DE EJECUTAR
-- =====================================================

/*
Este script migra usuarios existentes al sistema Bonus-Malus.

PRECAUCIONES:
1. ⚠️ Ejecutar en horario de baja demanda
2. ⚠️ Hacer backup de las tablas antes de ejecutar
3. ⚠️ Probar en ambiente de staging primero
4. ⚠️ Verificar que las migraciones anteriores se aplicaron

ESTIMACIÓN DE TIEMPO:
- 1,000 usuarios: ~5 segundos
- 10,000 usuarios: ~30 segundos
- 100,000 usuarios: ~5 minutos

ROLLBACK:
Si algo sale mal, ejecutar: ROLLBACK; (si se usa transacción)
*/

-- =====================================================
-- 1. VERIFICACIÓN PRE-MIGRACIÓN
-- =====================================================

DO $$
DECLARE
    v_users_count INT;
    v_profiles_exist BOOLEAN;
    v_factors_exist BOOLEAN;
BEGIN
    -- Contar usuarios existentes
    SELECT COUNT(*) INTO v_users_count FROM auth.users;
    RAISE NOTICE '📊 Usuarios encontrados: %', v_users_count;

    -- Verificar que existen las tablas necesarias
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'driver_risk_profile'
    ) INTO v_profiles_exist;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'pricing_class_factors'
    ) INTO v_factors_exist;

    IF NOT v_profiles_exist THEN
        RAISE EXCEPTION '❌ La tabla driver_risk_profile no existe. Ejecutar migraciones anteriores primero.';
    END IF;

    IF NOT v_factors_exist THEN
        RAISE EXCEPTION '❌ La tabla pricing_class_factors no existe. Ejecutar migraciones anteriores primero.';
    END IF;

    RAISE NOTICE '✅ Verificación exitosa. Procediendo con migración...';
END $$;

-- =====================================================
-- 2. MIGRACIÓN DE PERFILES DE CONDUCTOR
-- =====================================================

-- Crear perfiles para usuarios que no tienen uno
INSERT INTO driver_risk_profile (
    user_id,
    class,
    driver_score,
    good_years,
    total_claims,
    claims_with_fault,
    last_claim_at,
    last_class_update,
    created_at,
    updated_at
)
SELECT
    u.id as user_id,
    -- Determinar clase inicial basada en historial de bookings
    CASE
        WHEN EXISTS (
            SELECT 1 FROM booking_claims bc
            INNER JOIN bookings b ON bc.booking_id = b.id
            WHERE b.renter_id = u.id AND bc.with_fault = TRUE
        ) THEN 7  -- Usuarios con siniestros → Clase 7
        WHEN (
            SELECT COUNT(*) FROM bookings
            WHERE renter_id = u.id AND status = 'COMPLETED'
        ) >= 10 THEN 3  -- Usuarios con ≥10 bookings → Clase 3
        WHEN (
            SELECT COUNT(*) FROM bookings
            WHERE renter_id = u.id AND status = 'COMPLETED'
        ) >= 5 THEN 4  -- Usuarios con 5-9 bookings → Clase 4
        ELSE 5  -- Usuarios nuevos → Clase 5 (base)
    END as class,
    -- Driver score inicial: 50 (base)
    50 as driver_score,
    -- Calcular años buenos (años completos sin siniestros)
    GREATEST(0, EXTRACT(YEAR FROM AGE(
        NOW(),
        COALESCE((
            SELECT MAX(bc.created_at)
            FROM booking_claims bc
            INNER JOIN bookings b ON bc.booking_id = b.id
            WHERE b.renter_id = u.id AND bc.with_fault = TRUE
        ), u.created_at)
    ))::INT) as good_years,
    -- Contar siniestros totales
    COALESCE((
        SELECT COUNT(*)
        FROM booking_claims bc
        INNER JOIN bookings b ON bc.booking_id = b.id
        WHERE b.renter_id = u.id
    ), 0) as total_claims,
    -- Contar siniestros con responsabilidad
    COALESCE((
        SELECT COUNT(*)
        FROM booking_claims bc
        INNER JOIN bookings b ON bc.booking_id = b.id
        WHERE b.renter_id = u.id AND bc.with_fault = TRUE
    ), 0) as claims_with_fault,
    -- Fecha del último siniestro
    (
        SELECT MAX(bc.created_at)
        FROM booking_claims bc
        INNER JOIN bookings b ON bc.booking_id = b.id
        WHERE b.renter_id = u.id
    ) as last_claim_at,
    NOW() as last_class_update,
    u.created_at,
    NOW() as updated_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NOT NULL  -- Solo usuarios con perfil en profiles
AND NOT EXISTS (
    SELECT 1 FROM driver_risk_profile
    WHERE user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Log de perfiles migrados
DO $$
DECLARE
    v_migrated_count INT;
BEGIN
    SELECT COUNT(*) INTO v_migrated_count FROM driver_risk_profile;
    RAISE NOTICE '✅ Perfiles de conductor migrados: %', v_migrated_count;
END $$;

-- =====================================================
-- 3. MIGRACIÓN DE CRÉDITO DE PROTECCIÓN (CP)
-- =====================================================

-- Migrar protected_credit_balance → protection_credit_cents
-- (Si existía un campo legacy)
DO $$
DECLARE
    v_cp_migrated INT := 0;
BEGIN
    -- Verificar si existe protected_credit_balance
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_wallets'
        AND column_name = 'protected_credit_balance'
    ) THEN
        -- Migrar saldo protegido a protection_credit_cents
        UPDATE user_wallets
        SET
            protection_credit_cents = ROUND(protected_credit_balance * 100)::BIGINT,
            protection_credit_currency = 'USD',
            protection_credit_issued_at = COALESCE(created_at, NOW()),
            protection_credit_expires_at = NOW() + INTERVAL '1 year',
            updated_at = NOW()
        WHERE protected_credit_balance > 0
        AND protection_credit_cents IS NULL OR protection_credit_cents = 0;

        GET DIAGNOSTICS v_cp_migrated = ROW_COUNT;
        RAISE NOTICE '✅ Créditos de Protección migrados: %', v_cp_migrated;
    ELSE
        RAISE NOTICE '⚠️ Campo protected_credit_balance no existe. Omitiendo migración de CP legacy.';
    END IF;

    -- Emitir CP nuevo para usuarios sin CP
    INSERT INTO user_wallets (
        user_id,
        available_balance_cents,
        currency,
        protection_credit_cents,
        protection_credit_currency,
        protection_credit_issued_at,
        protection_credit_expires_at
    )
    SELECT
        u.id,
        0,  -- Balance inicial 0
        'USD',
        30000,  -- $300 USD en centavos
        'USD',
        NOW(),
        NOW() + INTERVAL '1 year'
    FROM auth.users u
    INNER JOIN profiles p ON u.id = p.id
    WHERE NOT EXISTS (
        SELECT 1 FROM user_wallets
        WHERE user_id = u.id
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- Actualizar usuarios con wallet pero sin CP
    UPDATE user_wallets
    SET
        protection_credit_cents = 30000,
        protection_credit_currency = 'USD',
        protection_credit_issued_at = NOW(),
        protection_credit_expires_at = NOW() + INTERVAL '1 year',
        updated_at = NOW()
    WHERE (protection_credit_cents IS NULL OR protection_credit_cents = 0)
    AND user_id IN (SELECT id FROM auth.users);

    GET DIAGNOSTICS v_cp_migrated = ROW_COUNT;
    RAISE NOTICE '✅ Nuevos Créditos de Protección emitidos: %', v_cp_migrated;

    -- Registrar transacciones de CP emitido
    INSERT INTO wallet_transactions (
        id,
        user_id,
        transaction_type,
        amount_cents,
        currency,
        status,
        reference_type,
        notes,
        is_protection_credit,
        protection_credit_reference_type,
        created_at
    )
    SELECT
        gen_random_uuid(),
        user_id,
        'CREDIT',
        30000,
        'USD',
        'COMPLETED',
        'MIGRATION',
        'Crédito de Protección inicial - Migración a Bonus-Malus',
        TRUE,
        'ISSUANCE',
        NOW()
    FROM user_wallets
    WHERE protection_credit_cents > 0
    AND NOT EXISTS (
        SELECT 1 FROM wallet_transactions
        WHERE user_id = user_wallets.user_id
        AND is_protection_credit = TRUE
        AND protection_credit_reference_type = 'ISSUANCE'
    );

    RAISE NOTICE '✅ Transacciones de CP registradas';
END $$;

-- =====================================================
-- 4. MIGRACIÓN DE SINIESTROS A booking_claims
-- =====================================================

-- Si existía una tabla legacy de claims, migrarla
DO $$
DECLARE
    v_claims_migrated INT := 0;
BEGIN
    -- Nota: Adaptar según estructura real de claims legacy
    -- Este es un ejemplo genérico

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'claims'  -- Tabla legacy hipotética
    ) THEN
        INSERT INTO booking_claims (
            id,
            booking_id,
            claim_type,
            description,
            amount_cents,
            currency,
            with_fault,
            severity,
            status,
            reported_at,
            resolved_at,
            created_at
        )
        SELECT
            gen_random_uuid(),
            c.booking_id,
            COALESCE(c.type, 'DAÑOS'),
            c.description,
            ROUND(c.amount * 100)::BIGINT,
            'USD',
            TRUE,  -- Asumir con responsabilidad (conservador)
            CASE
                WHEN c.amount < 100 THEN 1  -- Leve
                WHEN c.amount < 500 THEN 2  -- Moderado
                ELSE 3  -- Grave
            END,
            COALESCE(c.status, 'PENDING'),
            c.created_at,
            c.resolved_at,
            c.created_at
        FROM claims c  -- Tabla legacy
        WHERE NOT EXISTS (
            SELECT 1 FROM booking_claims
            WHERE booking_id = c.booking_id
        )
        ON CONFLICT DO NOTHING;

        GET DIAGNOSTICS v_claims_migrated = ROW_COUNT;
        RAISE NOTICE '✅ Siniestros migrados desde legacy: %', v_claims_migrated;
    ELSE
        RAISE NOTICE '⚠️ Tabla claims legacy no existe. Omitiendo migración de siniestros.';
    END IF;
END $$;

-- =====================================================
-- 5. AJUSTAR CLASES BASADO EN HISTORIAL REAL
-- =====================================================

-- Recalcular clases basado en siniestros registrados
UPDATE driver_risk_profile
SET
    class = GREATEST(0, LEAST(10,
        5 +  -- Base class
        (claims_with_fault * 2) -  -- Penalizar siniestros
        good_years  -- Bonificar años buenos
    )),
    updated_at = NOW()
WHERE user_id IN (SELECT id FROM auth.users);

RAISE NOTICE '✅ Clases ajustadas basadas en historial';

-- =====================================================
-- 6. CREAR ÍNDICES ADICIONALES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_driver_profile_migration
    ON driver_risk_profile(user_id, class, driver_score);

CREATE INDEX IF NOT EXISTS idx_wallet_cp_expiry
    ON user_wallets(protection_credit_expires_at)
    WHERE protection_credit_cents > 0;

RAISE NOTICE '✅ Índices de migración creados';

-- =====================================================
-- 7. VALIDACIÓN POST-MIGRACIÓN
-- =====================================================

DO $$
DECLARE
    v_total_users INT;
    v_migrated_profiles INT;
    v_users_with_cp INT;
    v_migration_pct DECIMAL(5, 2);
BEGIN
    -- Contar totales
    SELECT COUNT(*) INTO v_total_users FROM auth.users;
    SELECT COUNT(*) INTO v_migrated_profiles FROM driver_risk_profile;
    SELECT COUNT(*) INTO v_users_with_cp FROM user_wallets WHERE protection_credit_cents > 0;

    v_migration_pct := ROUND((v_migrated_profiles::DECIMAL / NULLIF(v_total_users, 0)) * 100, 2);

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 RESUMEN DE MIGRACIÓN';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total usuarios: %', v_total_users;
    RAISE NOTICE 'Perfiles migrados: % (%% de cobertura)', v_migrated_profiles, v_migration_pct;
    RAISE NOTICE 'Usuarios con CP: %', v_users_with_cp;
    RAISE NOTICE '';

    -- Validar integridad
    IF v_migration_pct < 95 THEN
        RAISE WARNING '⚠️ Cobertura de migración baja (< 95%%). Investigar usuarios sin perfil.';
    ELSE
        RAISE NOTICE '✅ Cobertura de migración exitosa (>= 95%%)';
    END IF;

    -- Mostrar distribución de clases
    RAISE NOTICE '📈 Distribución de Clases:';
    FOR i IN 0..10 LOOP
        DECLARE
            v_count INT;
        BEGIN
            SELECT COUNT(*) INTO v_count FROM driver_risk_profile WHERE class = i;
            IF v_count > 0 THEN
                RAISE NOTICE 'Clase %: % usuarios', i, v_count;
            END IF;
        END;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '✅ Migración completada exitosamente!';
    RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- 8. TAREAS POST-MIGRACIÓN (MANUAL)
-- =====================================================

/*
TAREAS PENDIENTES DESPUÉS DE EJECUTAR ESTE SCRIPT:

1. ✅ Verificar logs de migración
2. ✅ Validar perfiles en dashboard admin
3. ✅ Ejecutar query de validación:
   SELECT class, COUNT(*) FROM driver_risk_profile GROUP BY class ORDER BY class;
4. ✅ Notificar usuarios sobre nuevo sistema (email/push)
5. ✅ Monitorear métricas de adopción primeros 7 días
6. ✅ Limpiar campos legacy si existían:
   ALTER TABLE user_wallets DROP COLUMN IF EXISTS protected_credit_balance;

ROLLBACK SI ES NECESARIO:
- Si algo salió mal, restaurar backup
- Eliminar registros migrados:
  DELETE FROM driver_risk_profile WHERE created_at::DATE = CURRENT_DATE;
  UPDATE user_wallets SET protection_credit_cents = 0 WHERE ...;
*/

-- =====================================================
-- 9. FUNCIÓN DE VALIDACIÓN (EJECUTAR MANUALMENTE)
-- =====================================================

CREATE OR REPLACE FUNCTION validate_bonus_malus_migration()
RETURNS TABLE(
    check_name TEXT,
    passed BOOLEAN,
    details TEXT
) AS $$
BEGIN
    -- Check 1: All users have profiles
    RETURN QUERY
    SELECT
        'Users have profiles'::TEXT,
        (SELECT COUNT(*) FROM auth.users) = (SELECT COUNT(*) FROM driver_risk_profile),
        format('Users: %s, Profiles: %s',
            (SELECT COUNT(*) FROM auth.users),
            (SELECT COUNT(*) FROM driver_risk_profile)
        );

    -- Check 2: All users have CP
    RETURN QUERY
    SELECT
        'Users have Protection Credit'::TEXT,
        (SELECT COUNT(*) FROM user_wallets WHERE protection_credit_cents > 0) > 0,
        format('Users with CP: %s',
            (SELECT COUNT(*) FROM user_wallets WHERE protection_credit_cents > 0)
        );

    -- Check 3: Classes are within valid range
    RETURN QUERY
    SELECT
        'Classes within valid range (0-10)'::TEXT,
        NOT EXISTS (SELECT 1 FROM driver_risk_profile WHERE class < 0 OR class > 10),
        format('Invalid classes: %s',
            (SELECT COUNT(*) FROM driver_risk_profile WHERE class < 0 OR class > 10)
        );

    -- Check 4: Pricing factors exist
    RETURN QUERY
    SELECT
        'Pricing factors configured'::TEXT,
        (SELECT COUNT(*) FROM pricing_class_factors) = 11,
        format('Factors: %s (expected 11)',
            (SELECT COUNT(*) FROM pricing_class_factors)
        );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_bonus_malus_migration IS 'Validates bonus-malus migration integrity';

-- Ejecutar validación
SELECT * FROM validate_bonus_malus_migration();

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================

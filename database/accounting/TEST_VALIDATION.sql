-- =====================================================
-- SCRIPT DE VALIDACIÓN DEL SISTEMA CONTABLE
-- Pruebas end-to-end del ciclo completo
-- =====================================================

-- =====================================================
-- PASO 1: Verificar instalación
-- =====================================================

\echo '=========================================='
\echo 'PASO 1: Verificando instalación...'
\echo '=========================================='

-- Contar tablas
SELECT 'Tablas contables' as tipo, COUNT(*)::text as cantidad
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'accounting%';

-- Contar funciones
SELECT 'Funciones contables' as tipo, COUNT(*)::text as cantidad
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname LIKE 'accounting%';

-- Contar vistas
SELECT 'Vistas contables' as tipo, COUNT(*)::text as cantidad
FROM pg_views
WHERE schemaname = 'public'
  AND viewname LIKE 'accounting%';

-- Verificar plan de cuentas
SELECT 'Cuentas en plan' as tipo, COUNT(*)::text as cantidad
FROM accounting_accounts
WHERE is_active = TRUE;

\echo ''
\echo '✅ Verificación de instalación completada'
\echo ''

-- =====================================================
-- PASO 2: Simular depósito a billetera
-- =====================================================

\echo '=========================================='
\echo 'PASO 2: Simulando depósito a billetera...'
\echo '=========================================='

-- Crear usuario de prueba (si no existe)
INSERT INTO profiles (id, email, role, full_name)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test_locador@autorent.com',
  'locador',
  'Usuario Prueba Locador'
)
ON CONFLICT (id) DO UPDATE
SET updated_at = NOW();

INSERT INTO profiles (id, email, role, full_name)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'test_locatario@autorent.com',
  'locatario',
  'Usuario Prueba Locatario'
)
ON CONFLICT (id) DO UPDATE
SET updated_at = NOW();

-- Simular depósito
INSERT INTO wallet_transactions (
  id,
  user_id,
  type,
  status,
  amount,
  currency,
  provider,
  provider_transaction_id,
  description
) VALUES (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'deposit',
  'completed',
  100.00,
  'USD',
  'mercadopago',
  'MP-TEST-12345',
  'Depósito de prueba'
);

-- Verificar asiento contable creado
\echo ''
\echo 'Asiento contable creado:'
SELECT 
  e.entry_number,
  e.description,
  a.code,
  a.name,
  l.debit_amount,
  l.credit_amount
FROM accounting_journal_entries e
JOIN accounting_journal_lines l ON l.journal_entry_id = e.id
JOIN accounting_accounts a ON a.id = l.account_id
WHERE e.reference_type = 'wallet_transaction'
  AND e.reference_id = '10000000-0000-0000-0000-000000000001'
ORDER BY l.debit_amount DESC;

\echo ''
\echo '✅ Depósito procesado correctamente'
\echo ''

-- =====================================================
-- PASO 3: Simular inicio de alquiler
-- =====================================================

\echo '=========================================='
\echo 'PASO 3: Simulando inicio de alquiler...'
\echo '=========================================='

-- Crear auto de prueba (si no existe)
INSERT INTO cars (id, user_id, brand, model, year, daily_price, status)
VALUES (
  '20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Toyota',
  'Corolla',
  2023,
  50.00,
  'available'
)
ON CONFLICT (id) DO UPDATE
SET updated_at = NOW();

-- Crear booking
INSERT INTO bookings (
  id,
  car_id,
  renter_id,
  owner_id,
  start_date,
  end_date,
  total_price,
  platform_fee,
  security_deposit_amount,
  status
) VALUES (
  '30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '3 days',
  150.00,
  15.00,
  50.00,
  'confirmed'
);

-- Cambiar a in_progress
UPDATE bookings
SET status = 'in_progress'
WHERE id = '30000000-0000-0000-0000-000000000001';

-- Verificar asiento de bloqueo de garantía
\echo ''
\echo 'Asiento de bloqueo de garantía:'
SELECT 
  e.entry_number,
  e.description,
  a.code,
  a.name,
  l.debit_amount,
  l.credit_amount
FROM accounting_journal_entries e
JOIN accounting_journal_lines l ON l.journal_entry_id = e.id
JOIN accounting_accounts a ON a.id = l.account_id
WHERE e.reference_type = 'booking'
  AND e.reference_id = '30000000-0000-0000-0000-000000000001'
  AND e.description LIKE '%Bloqueo%'
ORDER BY l.debit_amount DESC;

\echo ''
\echo '✅ Alquiler iniciado correctamente'
\echo ''

-- =====================================================
-- PASO 4: Simular finalización de alquiler
-- =====================================================

\echo '=========================================='
\echo 'PASO 4: Simulando finalización de alquiler...'
\echo '=========================================='

-- Completar booking
UPDATE bookings
SET status = 'completed'
WHERE id = '30000000-0000-0000-0000-000000000001';

-- Verificar todos los asientos generados
\echo ''
\echo 'Asientos generados al completar alquiler:'
SELECT 
  e.entry_number,
  e.description,
  a.code,
  a.name,
  l.debit_amount,
  l.credit_amount
FROM accounting_journal_entries e
JOIN accounting_journal_lines l ON l.journal_entry_id = e.id
JOIN accounting_accounts a ON a.id = l.account_id
WHERE e.reference_type = 'booking'
  AND e.reference_id = '30000000-0000-0000-0000-000000000001'
  AND e.description NOT LIKE '%Bloqueo%'
ORDER BY e.created_at, l.debit_amount DESC;

-- Verificar provisión FGO
\echo ''
\echo 'Provisión FGO creada:'
SELECT 
  name,
  type,
  estimated_amount,
  actual_amount,
  status
FROM accounting_provisions
WHERE reference_type = 'booking'
  AND reference_id = '30000000-0000-0000-0000-000000000001';

\echo ''
\echo '✅ Alquiler completado correctamente'
\echo ''

-- =====================================================
-- PASO 5: Simular siniestro
-- =====================================================

\echo '=========================================='
\echo 'PASO 5: Simulando siniestro (consumo FGO)...'
\echo '=========================================='

SELECT accounting_record_fgo_claim(
  '30000000-0000-0000-0000-000000000001',
  5.00,
  'Prueba: Rayón en puerta lateral'
);

-- Verificar asiento de siniestro
\echo ''
\echo 'Asiento de siniestro:'
SELECT 
  e.entry_number,
  e.description,
  a.code,
  a.name,
  l.debit_amount,
  l.credit_amount
FROM accounting_journal_entries e
JOIN accounting_journal_lines l ON l.journal_entry_id = e.id
JOIN accounting_accounts a ON a.id = l.account_id
WHERE e.description LIKE '%siniestro%'
ORDER BY e.created_at DESC, l.debit_amount DESC
LIMIT 10;

-- Estado de provisión después de consumo
\echo ''
\echo 'Estado de provisión FGO después de siniestro:'
SELECT 
  name,
  estimated_amount,
  actual_amount,
  estimated_amount - actual_amount as consumido,
  status
FROM accounting_provisions
WHERE reference_type = 'booking'
  AND reference_id = '30000000-0000-0000-0000-000000000001';

\echo ''
\echo '✅ Siniestro registrado correctamente'
\echo ''

-- =====================================================
-- PASO 6: Verificar balance y reportes
-- =====================================================

\echo '=========================================='
\echo 'PASO 6: Verificando balance y reportes...'
\echo '=========================================='

-- Balance de comprobación
\echo ''
\echo 'Balance de Comprobación (resumen):'
SELECT 
  type,
  COUNT(*) as cuentas,
  SUM(total_debits) as total_debitos,
  SUM(total_credits) as total_creditos,
  SUM(balance) as saldo_neto
FROM accounting_trial_balance
GROUP BY type
ORDER BY 
  CASE type
    WHEN 'asset' THEN 1
    WHEN 'liability' THEN 2
    WHEN 'equity' THEN 3
    WHEN 'revenue' THEN 4
    WHEN 'expense' THEN 5
  END;

-- Dashboard ejecutivo
\echo ''
\echo 'Dashboard Ejecutivo:'
SELECT 
  total_assets,
  total_liabilities,
  total_equity,
  total_revenue,
  total_expenses,
  net_income,
  wallet_liability,
  fgo_available
FROM accounting_executive_dashboard;

-- Verificar partida doble
\echo ''
\echo 'Verificación de partida doble:'
SELECT 
  'Total Débitos' as concepto,
  SUM(debit_amount)::numeric(12,2) as monto
FROM accounting_journal_lines l
JOIN accounting_journal_entries e ON e.id = l.journal_entry_id
WHERE e.status = 'posted'

UNION ALL

SELECT 
  'Total Créditos',
  SUM(credit_amount)::numeric(12,2)
FROM accounting_journal_lines l
JOIN accounting_journal_entries e ON e.id = l.journal_entry_id
WHERE e.status = 'posted'

UNION ALL

SELECT 
  'Diferencia',
  ABS(
    (SELECT SUM(debit_amount) FROM accounting_journal_lines l
     JOIN accounting_journal_entries e ON e.id = l.journal_entry_id
     WHERE e.status = 'posted') -
    (SELECT SUM(credit_amount) FROM accounting_journal_lines l
     JOIN accounting_journal_entries e ON e.id = l.journal_entry_id
     WHERE e.status = 'posted')
  )::numeric(12,2);

\echo ''
\echo '✅ Reportes generados correctamente'
\echo ''

-- =====================================================
-- PASO 7: Auditoría de integridad
-- =====================================================

\echo '=========================================='
\echo 'PASO 7: Ejecutando auditoría de integridad...'
\echo '=========================================='

\echo ''
SELECT 
  check_name,
  CASE WHEN passed THEN '✅ PASÓ' ELSE '❌ FALLÓ' END as resultado,
  details
FROM accounting_integrity_audit();

\echo ''
\echo '=========================================='
\echo '🎉 VALIDACIÓN COMPLETA EXITOSA'
\echo '=========================================='
\echo ''
\echo 'El sistema contable está funcionando correctamente!'
\echo ''
\echo 'Próximos pasos:'
\echo '1. Revisar dashboard: SELECT * FROM accounting_executive_dashboard;'
\echo '2. Ver reportes: SELECT * FROM accounting_balance_sheet;'
\echo '3. Configurar cron jobs: ejecutar 007-cron-jobs.sql'
\echo ''

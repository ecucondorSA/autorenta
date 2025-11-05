-- ===========================================================================
-- AutoRenta - Auditoría de RLS Policies
-- ===========================================================================
-- Ejecutar con: psql $DATABASE_URL -f scripts/audit_rls_policies.sql
-- ===========================================================================

\echo '=== 1. TODAS LAS POLICIES POR TABLA ==='
\echo ''

select
  schemaname,
  tablename,
  polname,
  roles::text as roles,
  cmd,
  permissive,
  qual as using_clause,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd, polname;

\echo ''
\echo '=== 2. POLICIES DUPLICADAS (múltiples permissive=true para mismo rol/cmd) ==='
\echo ''

select
  tablename,
  cmd,
  roles::text,
  count(*) as policy_count,
  array_agg(polname) as policy_names
from pg_policies
where
  schemaname = 'public'
  and permissive = true
group by tablename, cmd, roles
having count(*) > 1
order by policy_count desc, tablename;

\echo ''
\echo '=== 3. TABLAS SIN RLS HABILITADO ==='
\echo ''

select
  schemaname,
  tablename,
  rowsecurity as rls_enabled
from pg_tables
where
  schemaname = 'public'
  and tablename in (
    'profiles', 'cars', 'car_photos', 'bookings',
    'payments', 'payment_intents', 'wallets',
    'wallet_transactions', 'ledger_entries',
    'payouts', 'deposits', 'availability',
    'car_features', 'booking_contracts', 'insurance_policies'
  )
  and rowsecurity = false
order by tablename;

\echo ''
\echo '=== 4. TABLAS CORE CON RLS HABILITADO ==='
\echo ''

select
  t.schemaname,
  t.tablename,
  t.rowsecurity as rls_enabled,
  count(p.polname) as policy_count
from pg_tables t
left join pg_policies p on
  p.schemaname = t.schemaname
  and p.tablename = t.tablename
where
  t.schemaname = 'public'
  and t.tablename in (
    'profiles', 'cars', 'car_photos', 'bookings',
    'payments', 'payment_intents', 'wallets',
    'wallet_transactions', 'ledger_entries',
    'payouts', 'deposits', 'availability'
  )
group by t.schemaname, t.tablename, t.rowsecurity
order by t.tablename;

\echo ''
\echo '=== 5. FUNCIONES CON SECURITY DEFINER (deben tener search_path fijo) ==='
\echo ''

select
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as is_security_definer,
  p.proconfig as config_settings
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where
  n.nspname = 'public'
  and p.prosecdef = true
order by p.proname;

\echo ''
\echo '=== 6. POLICIES POR TIPO DE COMANDO ==='
\echo ''

select
  cmd,
  count(*) as policy_count,
  count(distinct tablename) as tables_affected
from pg_policies
where schemaname = 'public'
group by cmd
order by cmd;

\echo ''
\echo '=== 7. BOOKINGS POLICIES (detalle) ==='
\echo ''

select
  polname,
  cmd,
  roles::text,
  permissive,
  qual as using_clause
from pg_policies
where
  schemaname = 'public'
  and tablename = 'bookings'
order by cmd, polname;

\echo ''
\echo '=== 8. PAYMENTS/WALLETS POLICIES (detalle) ==='
\echo ''

select
  tablename,
  polname,
  cmd,
  roles::text,
  permissive
from pg_policies
where
  schemaname = 'public'
  and tablename in ('payments', 'payment_intents', 'wallets', 'wallet_transactions')
order by tablename, cmd, polname;

\echo ''
\echo '=== 9. TABLAS PÚBLICAS (sin autenticación requerida) ==='
\echo ''

select distinct
  tablename
from pg_policies
where
  schemaname = 'public'
  and (
    roles::text like '%anon%'
    or roles::text like '%public%'
  )
order by tablename;

\echo ''
\echo '=== 10. RECOMENDACIONES ==='
\echo ''
\echo '✅ Todas las tablas core deben tener RLS habilitado (rowsecurity = true)'
\echo '✅ Consolidar policies duplicadas (máximo 1 permissive por rol/cmd)'
\echo '✅ Funciones SECURITY DEFINER deben tener: SET search_path = public, pg_temp'
\echo '✅ Policies de SELECT deben usar auth.uid() para filtrar por usuario'
\echo '✅ Policies de INSERT/UPDATE deben validar ownership en WITH CHECK'
\echo ''
\echo '⚠️ Tablas sin RLS: revisar si deben ser públicas o falta habilitarlo'
\echo '⚠️ Policies duplicadas: consolidar con OR en USING clause'
\echo '⚠️ Funciones sin search_path: riesgo de search_path hijacking'
\echo ''
\echo '=== FIN DE AUDITORÍA ==='

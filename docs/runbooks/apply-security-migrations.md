# Runbook: Aplicar Migraciones de Seguridad P0/P1

**Fecha**: 2025-11-18  
**Severity**: P0 CRÍTICO  
**Tiempo estimado**: 30-45 minutos  
**Requiere**: Acceso admin a Supabase

---

## 📋 Pre-requisitos

- [ ] Backup de base de datos completo
- [ ] Acceso a Supabase Dashboard (project: obxvffplochgeiclibng)
- [ ] Supabase CLI instalado y autenticado
- [ ] Branch `tech-debt-remediation` merged o en staging

---

## 🚨 Migraciones a Aplicar

### 1. `20251118_enable_rls_wallets_p0_critical.sql`
**CVSS**: 9.1/10 (CRÍTICO)  
**Fix**: Habilita Row Level Security en wallets  
**Impacto**: Sin esto, cualquier usuario puede leer balances de otros

### 2. `20251118_wallet_constraints_and_admin_validation_p0.sql`
**CVSS**: 7.65/10 (P0/P1)  
**Fix**: Constraints + validación de rol admin  
**Impacto**: Previene balances negativos y bypass de permisos

### 3. `20251118_test_wallet_security_fixes.sql`
**Tipo**: Tests automatizados  
**Validación**: 10 tests de seguridad

---

## 📝 Procedimiento

### Paso 1: Verificar Estado Actual

```bash
# Conectar a Supabase
supabase login

# Link al proyecto
supabase link --project-ref obxvffplochgeiclibng

# Ver migraciones pendientes
supabase db diff
```

**Output esperado**: Debe mostrar las 3 migraciones nuevas

---

### Paso 2: Backup de Base de Datos

```bash
# Backup automático (Supabase Dashboard)
# Settings → Database → Backups → Create backup

# O manual via pg_dump
pg_dump "postgresql://postgres:[PASSWORD]@db.obxvffplochgeiclibng.supabase.co:5432/postgres" \
  > backup_before_security_fixes_$(date +%Y%m%d_%H%M%S).sql
```

**Verificar**: Archivo .sql creado con tamaño > 0

---

### Paso 3: Aplicar en Staging (Opcional)

Si tienes ambiente staging:

```bash
# Aplicar migraciones
supabase db push --project-ref [staging-project-ref]

# Ejecutar tests
psql "postgresql://postgres:[PASSWORD]@[staging-url]:5432/postgres" \
  < supabase/migrations/20251118_test_wallet_security_fixes.sql
```

**Resultado esperado**:
```
✅ TEST 1 PASS: RLS habilitado en user_wallets
✅ TEST 2 PASS: RLS habilitado en wallet_transactions
...
✅ TODOS LOS TESTS PASARON
```

---

### Paso 4: Aplicar en Producción

⚠️ **IMPORTANTE**: Ejecutar durante horario de bajo tráfico

```bash
# 1. Aplicar migraciones
supabase db push --project-ref obxvffplochgeiclibng

# 2. Ejecutar tests de validación
psql "postgresql://postgres:[PASSWORD]@db.obxvffplochgeiclibng.supabase.co:5432/postgres" \
  < supabase/migrations/20251118_test_wallet_security_fixes.sql
```

**Tiempo estimado**: 2-3 minutos

---

### Paso 5: Validación Post-Aplicación

#### 5.1. Verificar RLS Habilitado

```sql
-- En SQL Editor de Supabase Dashboard
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('user_wallets', 'wallet_transactions');
```

**Output esperado**:
```
tablename              | rowsecurity
-----------------------+------------
user_wallets           | t
wallet_transactions    | t
```

#### 5.2. Verificar Policies Creadas

```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('user_wallets', 'wallet_transactions')
ORDER BY tablename, policyname;
```

**Output esperado**: 6 policies listadas

#### 5.3. Verificar Constraints

```sql
SELECT conname, contype 
FROM pg_constraint 
WHERE conname LIKE '%wallet%'
  AND conname LIKE 'check%'
ORDER BY conname;
```

**Output esperado**: 4 constraints

---

### Paso 6: Tests Funcionales

#### 6.1. Test RLS - Usuario NO puede ver wallet de otro

```sql
-- Simular usuario A intentando ver wallet de usuario B
SET LOCAL "request.jwt.claims" = '{"sub": "user-a-uuid"}';
SELECT * FROM user_wallets WHERE user_id = 'user-b-uuid';
-- Expected: 0 rows
```

#### 6.2. Test Constraint - Balance negativo rechazado

```sql
-- Intentar balance negativo (debe fallar)
UPDATE user_wallets SET available_balance = -100 WHERE user_id = 'test-uuid';
-- Expected: ERROR: new row for relation "user_wallets" violates check constraint
```

#### 6.3. Test Admin Validation

Intentar confirmar depósito como usuario no-admin:

```sql
-- Como usuario regular (NO admin)
SELECT * FROM wallet_confirm_deposit_admin(
  'user-uuid',
  'transaction-uuid',
  'provider-tx-id',
  '{}'::jsonb
);
-- Expected: success=false, message='Solo administradores pueden confirmar depósitos'
```

---

## 🚨 Rollback (Si algo sale mal)

### Opción 1: Rollback Automático (Supabase Dashboard)

1. Settings → Database → Backups
2. Seleccionar backup anterior
3. Restore

### Opción 2: Rollback Manual

```sql
-- 1. Deshabilitar RLS
ALTER TABLE user_wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions DISABLE ROW LEVEL SECURITY;

-- 2. Drop policies
DROP POLICY IF EXISTS user_wallets_select_own ON user_wallets;
DROP POLICY IF EXISTS user_wallets_update_own ON user_wallets;
DROP POLICY IF EXISTS user_wallets_insert_via_rpc ON user_wallets;
DROP POLICY IF EXISTS wallet_transactions_select_own ON wallet_transactions;
DROP POLICY IF EXISTS wallet_transactions_insert_via_rpc ON wallet_transactions;
DROP POLICY IF EXISTS wallet_transactions_update_via_rpc ON wallet_transactions;

-- 3. Drop constraints
ALTER TABLE user_wallets DROP CONSTRAINT IF EXISTS check_available_balance_non_negative;
ALTER TABLE user_wallets DROP CONSTRAINT IF EXISTS check_locked_balance_non_negative;
ALTER TABLE user_wallets DROP CONSTRAINT IF EXISTS check_non_withdrawable_floor_non_negative;
ALTER TABLE user_wallets DROP CONSTRAINT IF EXISTS check_non_withdrawable_floor_within_available;

-- 4. Restaurar función original (si tienes backup)
-- (Ejecutar versión anterior de wallet_confirm_deposit_admin)
```

---

## 📊 Monitoreo Post-Aplicación

### Métricas a vigilar (primeras 24 horas):

1. **Errores de RLS**:
```sql
-- Logs de errores de policies
SELECT * FROM auth.audit_log_entries 
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND payload->>'error' LIKE '%policy%'
ORDER BY created_at DESC;
```

2. **Errores de Constraints**:
```bash
# En Supabase Dashboard → Logs
# Filtrar por: "violates check constraint"
```

3. **Latencia de Queries**:
```sql
-- Queries lentas después de RLS
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%user_wallets%' OR query LIKE '%wallet_transactions%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## ✅ Checklist Final

- [ ] Backup creado y verificado
- [ ] Migraciones aplicadas sin errores
- [ ] Tests SQL pasaron (10/10)
- [ ] RLS habilitado en ambas tablas
- [ ] 6 policies creadas
- [ ] 4 constraints creados
- [ ] Test funcional RLS pasó
- [ ] Test funcional constraint pasó
- [ ] Test admin validation pasó
- [ ] Monitoreo configurado (primeras 24h)
- [ ] Equipo notificado de cambios

---

## 📞 Contactos de Escalación

**Si algo falla**:
1. Ejecutar rollback inmediatamente
2. Notificar en Slack #tech-alerts
3. Crear incident en GitHub Issues
4. Contactar DevOps lead

---

## 📚 Referencias

- [Auditoría de Seguridad](../SECURITY_AUDIT_WALLET_BOOKINGS.md)
- [Migraciones SQL](../../supabase/migrations/)
- [Supabase RLS Docs](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)

---

**Última actualización**: 2025-11-18  
**Autor**: Claude Code (Tech Debt Remediation)

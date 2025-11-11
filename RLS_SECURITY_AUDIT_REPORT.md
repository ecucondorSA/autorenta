# RLS Security Audit Report - AutoRenta
**Fecha**: 2025-11-11
**Auditor**: Claude Code
**Branch**: `claude/fix-rls-security-issues-011CV1U26pqHVjfF8N5KcnKh`

## Estado del Proyecto

### Migraciones de Seguridad Previas

1. **20251027_security_fixes_p0_critical.sql**
   - ✅ Habilitó RLS en `platform_config`
   - ✅ Revocó acceso público a `spatial_ref_sys`
   - ✅ Corrigió `v_payment_authorizations` (eliminó SECURITY DEFINER, removió auth.users)
   - ⚠️ Reportó "27 SECURITY DEFINER views" pendientes

2. **20251105_fix_rls_security_issues.sql**
   - ✅ Habilitó RLS en `exchange_rate_sync_log`
   - ✅ Habilitó RLS en `messages_backup` (si existe)
   - ✅ Habilitó RLS en `spatial_ref_sys` (PostGIS)

## Problemas Identificados por Categoría

### 1. TABLAS SIN RLS - CRÍTICO 🔴

#### Tablas de Accounting (Sistema Contable)
**Severidad**: Alta - Pueden exponer datos financieros sensibles

| Tabla | Estado RLS | Políticas | Prioridad | Notas |
|-------|-----------|-----------|-----------|-------|
| `accounting_accounts` | ❌ OFF | 0 | **P0** | Plan de cuentas - solo admins |
| `accounting_audit_log` | ❌ OFF | 0 | **P0** | Logs de auditoría - solo admins |
| `accounting_chart_of_accounts` | ❌ OFF | 0 | **P0** | Catálogo contable - solo admins |
| `accounting_period_balances` | ❌ OFF | 0 | **P1** | Balances periódicos - solo admins |
| `accounting_period_closures` | ❌ OFF | 0 | **P1** | Cierres contables - solo admins |

**Tablas accounting_ con RLS**:
- ✅ `accounting_journal_entries` - RLS habilitado
- ✅ `accounting_ledger` - RLS habilitado
- ✅ `accounting_provisions` - RLS habilitado
- ✅ `accounting_revenue_recognition` - RLS habilitado
- ✅ `accounting_wallet_liabilities` - RLS habilitado

#### Tablas de Wallet (Sistema de Billetera)
**Severidad**: Crítica - Exposición directa de saldos y transacciones

| Tabla | Estado RLS | Políticas | Prioridad | Notas |
|-------|-----------|-----------|-----------|-------|
| `wallet_audit_log` | ❌ OFF | 0 | **P0** | Logs de auditoría - solo admins |
| `wallet_transaction_backups` | ❌ OFF | 0 | **P0** | Backups diarios - solo admins |

**Tablas wallet con RLS**:
- ✅ `wallet_split_config` - RLS habilitado
- ✅ `user_wallets` - RLS habilitado (asumido de core tables)
- ✅ `wallet_transactions` - RLS habilitado (asumido de core tables)

#### Otras Tablas Críticas
Pendiente de identificación completa.

---

### 2. FUNCIONES CON SECURITY DEFINER SIN search_path - ALTO RIESGO ⚠️

**Problema**: 81 archivos de migración contienen "SECURITY DEFINER"
**Riesgo**: Vulnerabilidad a inyección SQL si search_path no está fijado

#### Categorías Identificadas

| Categoría | Archivos | Funciones Estimadas | Prioridad |
|-----------|----------|---------------------|-----------|
| Pricing RPCs | ~6 archivos | ~24 funciones | **P0** |
| Bonus/Malus RPCs | ~5 archivos | ~20 funciones | **P0** |
| Payment RPCs | ~4 archivos | ~16 funciones | **P0** |
| Telemetry RPCs | ~3 archivos | ~12 funciones | **P1** |
| Driver Profile RPCs | ~3 archivos | ~12 funciones | **P1** |
| Protection RPCs | ~2 archivos | ~8 funciones | **P1** |
| Wallet RPCs | ~2 archivos | ~8 funciones | **P0** |
| Otros | ~56 archivos | ??? | **P2** |

**Ejemplo de función vulnerable**:
```sql
CREATE OR REPLACE FUNCTION public.compute_fee_with_class(...)
LANGUAGE plpgsql
SECURITY DEFINER  -- ⚠️ Sin SET search_path
AS $function$
...
```

**Solución requerida**:
```sql
CREATE OR REPLACE FUNCTION public.compute_fee_with_class(...)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog  -- ✅ Fijado
AS $function$
...
```

---

### 3. VISTAS CON SECURITY DEFINER - MEDIO RIESGO ⚠️

**Status**: No encontradas en búsqueda inicial
**Nota**: La migración 20251027 reportó "27 SECURITY DEFINER views" pero no se encontraron en grep actual.

**Acción**: Verificar con consulta SQL directa en Supabase:
```sql
SELECT
  schemaname,
  viewname,
  definition
FROM pg_views
WHERE schemaname = 'public'
  AND definition ILIKE '%SECURITY DEFINER%';
```

---

### 4. LEAKED PASSWORD PROTECTION - INFO ℹ️

**Status**: Deshabilitado
**Prioridad**: P2 (mejora de seguridad)
**Acción**: Habilitar en Supabase Auth Dashboard

---

### 5. MATERIALIZED VIEWS EXPUESTAS - BAJO RIESGO 🟡

**Ejemplo conocido**:
- `accounting_provisions_report` - potencialmente expuesta a anon/authenticated

**Acción**: Verificar con consulta SQL:
```sql
SELECT schemaname, matviewname
FROM pg_matviews
WHERE schemaname = 'public';
```

---

## Plan de Acción Propuesto

### Fase 1: Tablas Críticas (P0) - URGENTE

**Objetivo**: Asegurar tablas de accounting, wallet y payment que no tienen RLS

1. **Accounting Tables** (5 tablas)
   - `accounting_accounts`
   - `accounting_audit_log`
   - `accounting_chart_of_accounts`
   - `accounting_period_balances`
   - `accounting_period_closures`

   **Política sugerida**: Solo `service_role` y admins

2. **Wallet Tables** (pendiente listar)
   - `wallet_audit_log`
   - Otras tablas wallet_ sin RLS

3. **Otras tablas críticas** (pendiente identificar)

**Entregable**: Migration `20251111_fix_rls_accounting_and_critical_tables.sql`

---

### Fase 2: Funciones SECURITY DEFINER (P0-P1)

**Objetivo**: Fijar `search_path` en todas las funciones SECURITY DEFINER

**Estrategia**:
1. Priorizar funciones de pricing, payment, wallet (P0)
2. Luego bonus/malus, telemetry (P1)
3. Finalmente resto de funciones (P2)

**Entregables**:
- Migration `20251111_fix_pricing_functions_search_path.sql` (P0)
- Migration `20251111_fix_payment_wallet_functions_search_path.sql` (P0)
- Migration `20251111_fix_other_functions_search_path.sql` (P1-P2)

---

### Fase 3: Vistas y Otros (P1-P2)

1. Identificar y corregir vistas SECURITY DEFINER restantes
2. Revisar materialized views
3. Habilitar leaked password protection
4. Testing completo con roles anon, authenticated, service_role

---

## Herramientas de Auditoría Creadas

### 1. Script SQL de Auditoría
**Archivo**: `audit_rls_security.sql`

Contiene 8 queries para auditar:
1. Todas las tablas con estado RLS
2. Todas las políticas RLS existentes
3. Tablas con RLS OFF pero con políticas (inconsistencia)
4. Tablas sin RLS ni políticas (expuestas)
5. Vistas con SECURITY DEFINER
6. Funciones sin search_path fijado
7. Tablas críticas (wallet, booking, payment, etc.)
8. Materialized views expuestas

**Uso**: Ejecutar manualmente en Supabase SQL Editor

---

## Próximos Pasos Inmediatos

1. ✅ **COMPLETADO**: Auditar estado RLS general
2. ✅ **COMPLETADO**: Identificar tablas críticas sin RLS
3. ✅ **COMPLETADO**: Crear migration para habilitar RLS en tablas críticas
4. ✅ **COMPLETADO**: Crear políticas RLS seguras
5. 🔄 **EN PROGRESO**: Fijar search_path en funciones SECURITY DEFINER

## Archivos Creados

### Migrations
- ✅ `supabase/migrations/20251111_fix_rls_accounting_and_critical_tables.sql`
  - Habilita RLS en 7 tablas críticas
  - Crea políticas restrictivas (solo admins + service_role)
  - Incluye verificación automática al finalizar

### Reportes y Auditoría
- ✅ `audit_rls_security.sql` - Script SQL con 8 queries de auditoría
- ✅ `RLS_SECURITY_AUDIT_REPORT.md` - Este reporte completo

---

## Notas de Implementación

### Patrón de Política RLS para Tablas de Accounting

```sql
-- Solo admins pueden ver
CREATE POLICY "accounting_table_select_admin"
ON public.accounting_table_name
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Solo service_role puede insertar/modificar
CREATE POLICY "accounting_table_modify_system"
ON public.accounting_table_name
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

### Patrón para Funciones SECURITY DEFINER

```sql
CREATE OR REPLACE FUNCTION public.function_name(...)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog  -- ✅ CRÍTICO
AS $function$
BEGIN
  -- Función implementation
END;
$function$;
```

---

## Referencias

- Migración anterior: `20251105_fix_rls_security_issues.sql`
- Migración anterior: `20251027_security_fixes_p0_critical.sql`
- Documentación: `docs/reports/SUPABASE_SECURITY_LINTER_ISSUES.md` (si existe)
- CLAUDE.md: Sección "Common Pitfalls"

---

**Fin del reporte**
**Siguiente acción**: Ejecutar `audit_rls_security.sql` manualmente en Supabase para obtener datos precisos del estado actual de la base de datos en producción.

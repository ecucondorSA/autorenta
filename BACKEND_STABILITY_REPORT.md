# 🚨 REPORTE DE ESTABILIDAD DEL BACKEND - AutoRenta

**Fecha**: 2025-11-19
**Estado Actual**: ⚠️ **INESTABLE - RIESGO ALTO**
**Tiempo Estimado para Estabilización**: **12-16 horas** de trabajo enfocado

---

## 📊 RESUMEN EJECUTIVO

Tu backend **NO está cerca del colapso**, pero tiene **deuda técnica crítica** que debe resolverse **ANTES de producción**. Los problemas principales son:

### 🔴 Problemas Críticos (P0)
1. **164 funciones SECURITY_DEFINER sin auditar** (45 críticas)
2. **27 tablas SIN Row Level Security (RLS)**
3. **146+ tests deshabilitados** (test.skip/xdescribe)
4. **Falta constraints de integridad** en tablas críticas

### 🟡 Problemas Importantes (P1)
5. **25 tablas con RLS incompleto**
6. **8 tablas con +100k sequential scans** (performance)
7. **Falta validación de roles** en funciones críticas

---

## 🎯 QUÉ FALTA PARA ESTABILIZAR (PRIORIZADO)

### FASE 1: SEGURIDAD CRÍTICA (4-6 horas)

#### 1.1. ✅ Constraints en Tablas Críticas (HECHO PARCIALMENTE)
**Estado**: ✅ `user_wallets` tiene constraints
**Falta**: `bookings`, `payment_intents`, `wallet_transactions`

```sql
-- FALTA AGREGAR:
ALTER TABLE bookings
  ADD CONSTRAINT check_end_date_after_start_date
  CHECK (end_date > start_date);

ALTER TABLE bookings
  ADD CONSTRAINT check_total_amount_positive
  CHECK (total_amount_cents > 0);

ALTER TABLE wallet_transactions
  ADD CONSTRAINT check_amount_positive
  CHECK (amount > 0);
```

**Impacto**: Sin estos constraints, puedes tener:
- Bookings con fechas inválidas (end < start)
- Transacciones con montos negativos
- Datos corruptos en producción

---

#### 1.2. ❌ Auditar Funciones SECURITY_DEFINER (CRÍTICO)

**Problema**: Tienes **45 funciones CRÍTICAS** que pueden ejecutarse con privilegios elevados sin validación.

**Ejemplo de vulnerabilidad**:
```sql
-- Función SIN validación de rol
CREATE FUNCTION wallet_confirm_deposit_admin(...)
SECURITY DEFINER  -- ⚠️ Se ejecuta como postgres
AS $$
BEGIN
  -- CUALQUIER usuario puede llamar esto
  UPDATE user_wallets SET available_balance = ...
END;
$$;
```

**Solución aplicada en 1 función**:
```sql
-- ✅ CORRECTO (ya aplicado en wallet_confirm_deposit_admin)
IF v_caller_role IS NULL OR v_caller_role != 'admin' THEN
  RETURN QUERY SELECT FALSE, 'Solo administradores...';
END IF;
```

**Acción requerida**:
```bash
# Usar MCP Auditor para identificar funciones críticas
@autorenta-platform Audita SECURITY_DEFINER crítico

# Aplicar validación de roles en las 45 funciones críticas
```

**Tiempo estimado**: 4-6 horas (10 min por función)

---

#### 1.3. ❌ Habilitar RLS en 27 Tablas (CRÍTICO)

**Tablas SIN RLS** (ejemplos críticos):
- `wallet_transactions` ⚠️ (CRÍTICO - datos financieros)
- `payment_intents` ⚠️ (CRÍTICO - pagos)
- `booking_claims` ⚠️ (ALTO - reclamos)
- `bank_accounts` ⚠️ (CRÍTICO - datos bancarios)

**Riesgo actual**:
```typescript
// ❌ SIN RLS: Cualquier usuario puede ver TODAS las transacciones
const { data } = await supabase
  .from('wallet_transactions')
  .select('*');
// Retorna: TODAS las transacciones de TODOS los usuarios 🚨
```

**Solución**:
```sql
-- Habilitar RLS
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Política: Solo ver tus propias transacciones
CREATE POLICY "Users can view own transactions"
  ON wallet_transactions FOR SELECT
  USING (user_id = auth.uid());
```

**Acción requerida**:
```bash
# Generar políticas RLS automáticamente
@autorenta-platform Genera RLS policies para wallet_transactions
@autorenta-platform Genera RLS policies para payment_intents
@autorenta-platform Genera RLS policies para bank_accounts
```

**Tiempo estimado**: 2-3 horas (27 tablas × 5 min)

---

### FASE 2: TESTS Y VALIDACIÓN (4-6 horas)

#### 2.1. ❌ Habilitar Tests Críticos (URGENTE)

**Problema**: **146+ tests deshabilitados** con `test.skip()` o `xdescribe()`

**Tests críticos deshabilitados**:
```typescript
// tests/critical/04-ledger-consistency.spec.ts
test.skip('Pendiente de implementación');  // ⚠️ 9 tests críticos

// tests/payments/complete-payment-flow-e2e.spec.ts
test.skip('Usuario no autenticado');  // ⚠️ 7 tests de pagos

// tests/wallet/01-wallet-ui.spec.ts
test.skip('should display wallet balance');  // ⚠️ 12 tests de wallet
```

**Impacto**:
- **No sabes si el sistema funciona** (tests deshabilitados)
- **Riesgo de regresiones** en producción
- **Imposible validar cambios** de forma segura

**Acción requerida**:
1. Habilitar tests de `critical/04-ledger-consistency.spec.ts` (9 tests)
2. Habilitar tests de `payments/complete-payment-flow-e2e.spec.ts` (7 tests)
3. Habilitar tests de `wallet/01-wallet-ui.spec.ts` (12 tests)

```bash
# Ejecutar tests críticos
npm run test:e2e -- tests/critical/04-ledger-consistency.spec.ts
npm run test:e2e -- tests/payments/complete-payment-flow-e2e.spec.ts
```

**Tiempo estimado**: 4-6 horas (debugging + fixes)

---

#### 2.2. ❌ Validar Flujos Críticos E2E

**Flujos sin validación E2E**:
- ✅ Renter journey (corriendo ahora)
- ❌ Wallet deposit → booking → payout (CRÍTICO)
- ❌ Split payment a owner (CRÍTICO)
- ❌ Refund flow (CRÍTICO)

**Acción requerida**:
```bash
# Crear/habilitar tests E2E para flujos críticos
npm run test:e2e -- tests/e2e/booking-flow-wallet-payment.spec.ts
npm run test:e2e -- tests/critical/03-webhook-payments.spec.ts
```

---

### FASE 3: PERFORMANCE Y OPTIMIZACIÓN (2-4 horas)

#### 3.1. ❌ Agregar Índices Faltantes

**Problema**: **8 tablas con +100k sequential scans** (lentitud)

**Tablas críticas**:
- `wallet_transactions` (87k seq_scans)
- `bookings` (120k seq_scans)
- `payment_intents` (65k seq_scans)

**Solución**:
```sql
-- Índices sugeridos
CREATE INDEX idx_wallet_transactions_user_status
  ON wallet_transactions(user_id, status);

CREATE INDEX idx_bookings_car_dates
  ON bookings(car_id, start_date, end_date);
```

**Acción requerida**:
```bash
@autorenta-platform Analiza performance
@autorenta-platform Genera índices para wallet_transactions
```

**Tiempo estimado**: 2-3 horas

---

## 📋 PLAN DE ACCIÓN COMPLETO (12-16 HORAS)

### DÍA 1: Seguridad (6-8 horas)

#### Mañana (4 horas)
```bash
# 1. Agregar constraints faltantes (1 hora)
@autorenta-platform Genera constraints para bookings
@autorenta-platform Genera constraints para payment_intents

# 2. Auditar funciones SECURITY_DEFINER (3 horas)
@autorenta-platform Audita SECURITY_DEFINER crítico
# Aplicar validación de roles en top 10 funciones críticas
```

#### Tarde (4 horas)
```bash
# 3. Habilitar RLS en tablas críticas (4 horas)
@autorenta-platform Genera RLS policies para wallet_transactions
@autorenta-platform Genera RLS policies para payment_intents
@autorenta-platform Genera RLS policies para bank_accounts
@autorenta-platform Genera RLS policies para booking_claims

# Aplicar SQL generado en Supabase
# Verificar con queries de prueba
```

---

### DÍA 2: Tests y Validación (6-8 horas)

#### Mañana (4 horas)
```bash
# 4. Habilitar tests críticos (4 horas)
# Habilitar tests de ledger-consistency
# Habilitar tests de payment-flow
# Habilitar tests de wallet-ui
# Ejecutar y corregir errores
```

#### Tarde (2-4 horas)
```bash
# 5. Validar flujos E2E (2-4 horas)
npm run test:e2e -- tests/critical/
npm run test:e2e -- tests/e2e/booking-flow-wallet-payment.spec.ts

# 6. Agregar índices de performance (1 hora)
@autorenta-platform Genera índices para tablas críticas
```

---

## ✅ CRITERIOS DE ÉXITO (BACKEND ESTABLE)

### Seguridad
- [ ] **0 tablas sin RLS** (actualmente: 27)
- [ ] **45 funciones SECURITY_DEFINER auditadas** con validación de roles
- [ ] **Constraints agregados** en bookings, payment_intents, wallet_transactions

### Tests
- [ ] **0 tests críticos deshabilitados** (actualmente: 146+)
- [ ] **Flujos E2E críticos pasando**: wallet deposit, booking, payout, refund
- [ ] **Coverage >80%** en módulos críticos (wallet, payments, bookings)

### Performance
- [ ] **Índices agregados** en tablas con +100k seq_scans
- [ ] **Queries críticas <100ms** (wallet balance, booking availability)

---

## 🚀 QUICK WINS (2-3 HORAS)

Si solo tienes **2-3 horas hoy**, enfócate en:

### 1. RLS en Tablas Financieras (1 hora)
```bash
@autorenta-platform Genera RLS policies para wallet_transactions
@autorenta-platform Genera RLS policies para payment_intents
# Aplicar SQL en Supabase
```

### 2. Constraints en Bookings (30 min)
```sql
ALTER TABLE bookings
  ADD CONSTRAINT check_end_date_after_start_date
  CHECK (end_date > start_date);
```

### 3. Habilitar 1 Test Crítico (1 hora)
```bash
# Habilitar tests/critical/04-ledger-consistency.spec.ts
# Ejecutar y corregir errores
```

---

## 📈 MÉTRICAS DE PROGRESO

### Antes (Hoy)
- ❌ 27 tablas sin RLS
- ❌ 45 funciones críticas sin validación
- ❌ 146+ tests deshabilitados
- ❌ 0 constraints en bookings
- ⚠️ **Riesgo: ALTO**

### Después (Meta en 2 días)
- ✅ 0 tablas sin RLS
- ✅ 45 funciones auditadas
- ✅ 0 tests críticos deshabilitados
- ✅ Constraints completos
- ✅ **Riesgo: BAJO**

---

## 🛠️ HERRAMIENTAS DISPONIBLES

### MCP Auditor (YA INSTALADO)
```bash
# Reporte completo
@autorenta-platform Genera reporte de auditoría completo

# Auditorías específicas
@autorenta-platform Audita SECURITY_DEFINER crítico
@autorenta-platform Audita RLS coverage
@autorenta-platform Analiza performance

# Generación de soluciones
@autorenta-platform Genera RLS policies para [tabla]
@autorenta-platform Genera índices para [tabla]
```

### Scripts Disponibles
```bash
# Tests
npm run test:e2e -- tests/critical/
npm run test:quick

# Sincronización
npm run sync:types

# Auditoría
./tools/audit-before-code.sh wallet_transactions
```

---

## 💡 RECOMENDACIONES

### 1. **NO entrar en pánico**
- El backend **NO está colapsando**
- Tienes **deuda técnica manejable**
- Con **12-16 horas** de trabajo enfocado, estarás estable

### 2. **Prioriza seguridad sobre features**
- **Primero**: RLS en tablas financieras
- **Segundo**: Validación de roles en funciones críticas
- **Tercero**: Tests E2E de flujos críticos

### 3. **Usa el MCP Auditor**
- Ya está instalado y configurado
- Genera SQL automáticamente
- Ahorra 60-70% del tiempo

### 4. **Documenta mientras arreglas**
- Cada función auditada → comentario en código
- Cada RLS policy → comentario explicativo
- Cada constraint → razón de negocio

---

## 🎯 PRÓXIMOS PASOS INMEDIATOS

### Ahora mismo (30 min)
```bash
# 1. Generar reporte completo
@autorenta-platform Genera reporte de auditoría completo

# 2. Revisar hallazgos
# 3. Crear GitHub Issues para cada item crítico
```

### Hoy (2-3 horas)
```bash
# Quick Wins (ver sección arriba)
1. RLS en wallet_transactions y payment_intents
2. Constraints en bookings
3. Habilitar 1 test crítico
```

### Esta semana (12-16 horas)
```bash
# Seguir plan de 2 días (ver arriba)
Día 1: Seguridad (6-8h)
Día 2: Tests y validación (6-8h)
```

---

## ❓ PREGUNTAS FRECUENTES

### "¿Está mi backend cerca del colapso?"
**No**. Tienes deuda técnica crítica, pero el sistema funciona. El riesgo es **lanzar a producción sin resolver estos issues**.

### "¿Cuánto tiempo necesito?"
**12-16 horas** de trabajo enfocado en 2 días. Con MCP Auditor, puedes reducirlo a **8-12 horas**.

### "¿Qué pasa si lanzo a producción ahora?"
**Riesgos**:
- Usuarios pueden ver datos de otros usuarios (sin RLS)
- Funciones críticas sin validación de roles
- Datos corruptos (sin constraints)
- No puedes validar cambios (tests deshabilitados)

### "¿Por dónde empiezo?"
**Orden de prioridad**:
1. RLS en tablas financieras (1 hora)
2. Constraints en bookings (30 min)
3. Auditar top 10 funciones SECURITY_DEFINER (3 horas)
4. Habilitar tests críticos (4 horas)

---

**Generado**: 2025-11-19 19:20
**Herramienta**: Claude Code + MCP Auditor
**Próxima revisión**: Después de completar Fase 1 (Día 1)

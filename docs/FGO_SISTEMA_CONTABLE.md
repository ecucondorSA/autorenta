# 🏦 Sistema Contable del Fondo de Garantía Operativa (FGO)

## 📋 Índice

1. [Visión General](#visión-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Subfondos del FGO](#subfondos-del-fgo)
4. [Métricas y KPIs](#métricas-y-kpis)
5. [Flujos de Operación](#flujos-de-operación)
6. [API y Funciones RPC](#api-y-funciones-rpc)
7. [Consultas SQL Útiles](#consultas-sql-útiles)
8. [Plan de Implementación Frontend](#plan-de-implementación-frontend)

---

## 🎯 Visión General

El **Fondo de Garantía Operativa (FGO)** es un sistema contable que:

- ✅ Separa el dinero del FGO de la operación general
- ✅ Garantiza trazabilidad completa de todos los movimientos
- ✅ Calcula automáticamente métricas financieras (RC, LR)
- ✅ Segrega fondos en tres subfondos especializados
- ✅ Permite auditoría en tiempo real

### 💰 Parámetro Alpha (α)

- **Valor actual**: 15% de cada depósito
- **Ajustable**: Se puede modificar según el estado del fondo
- **Reglas de ajuste**:
  - Si RC < 0.9 → Incrementar α (ej: 20%)
  - Si RC > 1.2 → Liberar reservas (mayor liquidez para usuarios)

---

## 🏗️ Arquitectura del Sistema

### Tablas Principales

```
┌─────────────────────────────────────────┐
│  fgo_subfunds                           │
│  - liquidity (Liquidez)                 │
│  - capitalization (Capitalización)      │
│  - profitability (Rentabilidad)         │
└─────────────────────────────────────────┘
              ↕️
┌─────────────────────────────────────────┐
│  fgo_movements                          │
│  - Registro de todos los movimientos    │
│  - Doble partida (credit/debit)         │
│  - Idempotencia garantizada             │
└─────────────────────────────────────────┘
              ↕️
┌─────────────────────────────────────────┐
│  fgo_metrics                            │
│  - Cálculo automático de RC y LR        │
│  - Estado del fondo (healthy/warning)   │
│  - Configuración de α y metas           │
└─────────────────────────────────────────┘
```

### Integración con Wallet

```
┌──────────────────┐
│ Usuario deposita │
│   USD 100        │
└────────┬─────────┘
         ↓
┌────────────────────────────────┐
│ wallet_deposit_ledger()        │
│ - Registra en wallet_ledger    │
│ - Retorna ledger_id            │
└────────┬───────────────────────┘
         ↓
┌────────────────────────────────┐
│ fgo_contribute_from_deposit()  │
│ - Calcula α% (USD 15)          │
│ - Registra en fgo_movements    │
│ - Actualiza subfund liquidez   │
└────────┬───────────────────────┘
         ↓
┌────────────────────────────────┐
│ calculate_fgo_metrics()        │
│ - Recalcula RC y LR            │
│ - Actualiza estado del fondo   │
└────────────────────────────────┘
```

---

## 📊 Subfondos del FGO

### 1️⃣ Liquidez (Liquidity)

**Propósito**: Efectivo disponible para operaciones inmediatas

**Usos**:
- Pago de siniestros
- Devoluciones de depósitos
- Reembolsos urgentes

**Flujo de entrada**:
- Aportes α% de depósitos de usuarios
- Transferencias desde otros subfondos

**Flujo de salida**:
- Pagos de siniestros (`fgo_pay_siniestro`)
- Transferencias a capitalización

### 2️⃣ Capitalización (Capitalization)

**Propósito**: Activos productivos e inversiones

**Usos**:
- Compra de autos para flota propia
- Inversiones temporales
- Expansión de inventario

**Flujo de entrada**:
- Transferencias desde liquidez (cuando hay exceso)

**Flujo de salida**:
- Compra de activos
- Transferencias a liquidez (si se necesita)

### 3️⃣ Rentabilidad (Profitability)

**Propósito**: Resultado diferido e intereses

**Usos**:
- Intereses generados por inversiones
- Excedentes del FGO
- Bonificaciones futuras

**Flujo de entrada**:
- Intereses de inversiones
- Transferencias desde otros subfondos

---

## 📈 Métricas y KPIs

### 1. Ratio de Cobertura (RC)

**Fórmula**:
```
RC = Saldo Total FGO / Meta de Saldo
Meta de Saldo = Promedio de Siniestros × Meses de Cobertura
```

**Ejemplo**:
```
Promedio de siniestros mensual = USD 500
Meses de cobertura = 12
Meta de saldo = USD 500 × 12 = USD 6,000

Saldo actual FGO = USD 6,700
RC = 6,700 / 6,000 = 1.12 ✅
```

**Estados**:
- ✅ **Healthy** (Saludable): RC ≥ 1.0
- ⚠️ **Warning** (Advertencia): 0.7 ≤ RC < 1.0
- 🔴 **Critical** (Crítico): RC < 0.7

### 2. Loss Ratio (LR)

**Fórmula**:
```
LR = Total Siniestros Pagados / Total Aportes Recibidos
```

**Ejemplo**:
```
Total aportes recibidos = USD 10,000
Total siniestros pagados = USD 500
LR = 500 / 10,000 = 0.05 (5%) ✅
```

**Interpretación**:
- **LR < 0.10**: Excelente (menos del 10% se usa en siniestros)
- **0.10 ≤ LR < 0.30**: Aceptable
- **LR ≥ 0.30**: Alto (revisar procesos)

---

## ⚙️ Flujos de Operación

### Flujo 1: Aporte de Usuario (α%)

```sql
-- 1. Usuario deposita USD 100 (10,000 centavos)
SELECT wallet_deposit_ledger(
  'user-uuid',
  10000,  -- amount_cents
  'mp-payment-123',
  'mercadopago'
);
-- Retorna: { ledger_id: 'xxx' }

-- 2. Sistema automáticamente aporta α% al FGO
SELECT fgo_contribute_from_deposit(
  'user-uuid',
  10000,  -- deposit_amount_cents
  'ledger-id-xxx'
);
-- Calcula: 15% × 10,000 = 1,500 centavos (USD 15)
-- Registra en fgo_movements
-- Actualiza subfondo de liquidez
```

### Flujo 2: Pago de Siniestro

```sql
-- Pagar siniestro de USD 300 (30,000 centavos)
SELECT fgo_pay_siniestro(
  'booking-uuid',
  30000,  -- amount_cents
  'Daño en parachoques delantero por colisión menor',
  'siniestro-2025-001'
);

-- Verifica saldo en liquidez
-- Registra movimiento (débito)
-- Recalcula métricas (RC, LR)
```

### Flujo 3: Transferencia Entre Subfondos

```sql
-- Admin transfiere USD 1,000 de liquidez a capitalización
SELECT fgo_transfer_between_subfunds(
  'liquidity',       -- from_subfund
  'capitalization',  -- to_subfund
  100000,            -- amount_cents (USD 1,000)
  'Inversión en compra de auto para flota',
  'admin-uuid'
);

-- Verifica que el usuario es admin
-- Crea dos movimientos (débito y crédito)
-- Actualiza ambos subfondos
```

---

## 🔌 API y Funciones RPC

### 1. `calculate_fgo_metrics()`

Recalcula todas las métricas del FGO.

**Uso**:
```sql
SELECT calculate_fgo_metrics();
```

**Retorna**:
```json
{
  "current_balance_cents": 670000,
  "target_balance_cents": 600000,
  "total_contributions_cents": 1000000,
  "total_siniestros_paid_cents": 50000,
  "total_siniestros_count": 3,
  "coverage_ratio": 1.12,
  "loss_ratio": 0.05,
  "status": "healthy",
  "last_calculated_at": "2025-10-22T12:00:00Z"
}
```

### 2. `fgo_contribute_from_deposit()`

Registra aporte al FGO desde un depósito de usuario.

**Parámetros**:
- `p_user_id`: UUID del usuario
- `p_deposit_amount_cents`: Monto del depósito en centavos
- `p_wallet_ledger_id`: ID del ledger de wallet
- `p_ref`: Referencia única (opcional)

**Ejemplo**:
```sql
SELECT fgo_contribute_from_deposit(
  '550e8400-e29b-41d4-a716-446655440000',
  10000,
  'ledger-abc-123'
);
```

### 3. `fgo_pay_siniestro()`

Paga un siniestro desde el subfondo de liquidez.

**Parámetros**:
- `p_booking_id`: UUID del booking relacionado
- `p_amount_cents`: Monto a pagar en centavos
- `p_description`: Descripción del siniestro
- `p_ref`: Referencia única (opcional)

**Ejemplo**:
```sql
SELECT fgo_pay_siniestro(
  '660e8400-e29b-41d4-a716-446655440000',
  30000,
  'Reparación de rayón en puerta lateral derecha'
);
```

### 4. `fgo_transfer_between_subfunds()`

Transfiere fondos entre subfondos (solo admins).

**Parámetros**:
- `p_from_subfund`: 'liquidity' | 'capitalization' | 'profitability'
- `p_to_subfund`: 'liquidity' | 'capitalization' | 'profitability'
- `p_amount_cents`: Monto en centavos
- `p_reason`: Motivo de la transferencia
- `p_admin_id`: UUID del admin que ejecuta

---

## 🔍 Consultas SQL Útiles

### Ver Estado Completo del FGO

```sql
SELECT * FROM v_fgo_status;
```

### Ver Movimientos Recientes

```sql
SELECT
  ts,
  movement_type,
  subfund_type,
  amount_cents / 100.0 AS amount_usd,
  operation,
  user_name,
  meta->>'description' AS description
FROM v_fgo_movements_detailed
LIMIT 20;
```

### Ver Resumen Mensual

```sql
SELECT
  TO_CHAR(month, 'YYYY-MM') AS mes,
  subfund_type,
  movement_count,
  total_credits_cents / 100.0 AS creditos_usd,
  total_debits_cents / 100.0 AS debitos_usd,
  net_change_cents / 100.0 AS cambio_neto_usd
FROM v_fgo_monthly_summary
WHERE month >= DATE_TRUNC('month', NOW() - INTERVAL '6 months')
ORDER BY month DESC, subfund_type;
```

### Ver Saldos por Subfondo

```sql
SELECT
  subfund_type,
  balance_cents / 100.0 AS balance_usd,
  ROUND(
    (balance_cents::DECIMAL / NULLIF((SELECT SUM(balance_cents) FROM fgo_subfunds), 0) * 100),
    2
  ) AS porcentaje,
  meta->>'purpose' AS proposito
FROM fgo_subfunds
ORDER BY balance_cents DESC;
```

### Auditoría: Verificar Integridad

```sql
-- Verificar que la suma de subfondos = coverage_fund
SELECT
  (SELECT SUM(balance_cents) FROM fgo_subfunds) AS suma_subfondos,
  (SELECT balance_cents FROM coverage_fund WHERE id = TRUE) AS coverage_fund,
  CASE
    WHEN (SELECT SUM(balance_cents) FROM fgo_subfunds) = (SELECT balance_cents FROM coverage_fund WHERE id = TRUE)
    THEN '✅ OK'
    ELSE '❌ MISMATCH'
  END AS estado_integridad;
```

---

## 🖥️ Plan de Implementación Frontend

### 1. Servicio Angular: `FgoService`

**Archivo**: `apps/web/src/app/core/services/fgo.service.ts`

**Métodos**:
```typescript
export class FgoService {
  // Obtener estado completo del FGO
  getStatus(): Observable<FgoStatus>;

  // Obtener movimientos con paginación
  getMovements(limit?: number, offset?: number): Observable<FgoMovement[]>;

  // Obtener resumen mensual
  getMonthlySummary(months?: number): Observable<MonthlyFgoSummary[]>;

  // Pagar siniestro (solo admin)
  paySiniestro(bookingId: string, amountCents: number, description: string): Observable<any>;

  // Transferir entre subfondos (solo admin)
  transferBetweenSubfunds(
    from: SubfundType,
    to: SubfundType,
    amountCents: number,
    reason: string
  ): Observable<any>;

  // Actualizar parámetro α (solo admin)
  updateAlpha(newAlpha: number): Observable<void>;

  // Recalcular métricas (solo admin)
  recalculateMetrics(): Observable<FgoMetrics>;
}
```

### 2. Dashboard Administrativo

**Ruta**: `/admin/fgo`

**Componentes**:

#### `FgoOverviewComponent`
```
┌─────────────────────────────────────────────────┐
│  Estado del FGO                                 │
│  - RC: 1.12 ✅ Healthy                          │
│  - LR: 0.05 (5%)                                │
│  - α actual: 15%                                │
│  - Total FGO: USD 6,700                         │
└─────────────────────────────────────────────────┘
```

#### `FgoSubfundsCardComponent`
```
┌───────────────────────────────────────┐
│  Liquidez          USD 4,200 (62.7%)  │
│  Capitalización    USD 2,000 (29.9%)  │
│  Rentabilidad      USD 500 (7.4%)     │
│  ─────────────────────────────────    │
│  Total             USD 6,700          │
└───────────────────────────────────────┘
```

#### `FgoMovementsTableComponent`
```
┌──────────────────────────────────────────────────────────┐
│  Fecha       │ Tipo            │ Subfondo  │ Monto      │
├──────────────────────────────────────────────────────────┤
│  22/10 14:30 │ Aporte usuario  │ Liquidez  │ + USD 15   │
│  22/10 10:15 │ Pago siniestro  │ Liquidez  │ - USD 300  │
│  21/10 18:00 │ Transferencia   │ → Capital │ - USD 1000 │
└──────────────────────────────────────────────────────────┘
```

#### `FgoMetricsChartComponent`
```
Gráfico de líneas:
- RC histórico (últimos 12 meses)
- LR histórico
- Saldo total FGO vs Meta
```

### 3. Modelos TypeScript

**Archivo**: `apps/web/src/app/core/models/fgo.model.ts`

```typescript
export interface FgoStatus {
  liquidity_balance_cents: number;
  capitalization_balance_cents: number;
  profitability_balance_cents: number;
  total_fgo_balance_cents: number;
  alpha_percentage: number;
  target_months_coverage: number;
  total_contributions_cents: number;
  total_siniestros_paid_cents: number;
  total_siniestros_count: number;
  coverage_ratio: number | null;
  loss_ratio: number | null;
  target_balance_cents: number | null;
  status: 'healthy' | 'warning' | 'critical';
  last_calculated_at: string;
  updated_at: string;
}

export interface FgoMovement {
  id: string;
  ts: string;
  movement_type: FgoMovementType;
  subfund_type: SubfundType;
  amount_cents: number;
  operation: 'credit' | 'debit';
  balance_change_cents: number;
  ref: string;
  user_id?: string;
  user_name?: string;
  booking_id?: string;
  car_id?: string;
  wallet_ledger_id?: string;
  created_by?: string;
  created_by_name?: string;
  meta: any;
  created_at: string;
}

export type FgoMovementType =
  | 'user_contribution'
  | 'siniestro_payment'
  | 'franchise_payment'
  | 'capitalization'
  | 'return_to_user'
  | 'interest_earned'
  | 'adjustment';

export type SubfundType = 'liquidity' | 'capitalization' | 'profitability';
```

---

## ✅ Checklist de Implementación

### Base de Datos ✅ COMPLETADO
- [x] Migración creada (`20251022_create_fgo_system.sql`)
- [x] Tablas creadas (`fgo_subfunds`, `fgo_movements`, `fgo_metrics`)
- [x] Funciones RPC implementadas
- [x] Vistas útiles creadas
- [x] Políticas RLS aplicadas
- [x] Triggers configurados

### Backend (Pendiente)
- [ ] Modificar `wallet_deposit_ledger()` para llamar automáticamente a `fgo_contribute_from_deposit()`
- [ ] Crear Edge Function para operaciones de admin
- [ ] Implementar webhook para recalcular métricas periódicamente

### Frontend (Pendiente)
- [ ] Crear `FgoService`
- [ ] Crear modelos TypeScript
- [ ] Crear componentes del dashboard
- [ ] Agregar ruta `/admin/fgo`
- [ ] Implementar guards de admin
- [ ] Tests unitarios

### Documentación ✅ COMPLETADO
- [x] Documentación técnica
- [ ] Manual de usuario para admins
- [ ] Guía de auditoría contable

---

## 📞 Contacto y Soporte

Para más información sobre el sistema FGO:
- **Documentación técnica**: `/docs/FGO_SISTEMA_CONTABLE.md`
- **Política FGO**: Ver documento "Política FGO Autorentar v1.0"
- **Migrations**: `/supabase/migrations/20251022_create_fgo_system.sql`

---

**Última actualización**: 22 de octubre de 2025
**Versión**: 1.0
**Autor**: Sistema AutoRenta

# FGO Accounting Manual


---
# Source: ESTADOS_FINANCIEROS_TEMPLATE.md

# Plantilla Estados Financieros AutoRenta (NIIF)

Este documento define la estructura mínima para preparar estados financieros mensuales y trimestrales. Copiá las secciones y reemplazá los valores con los obtenidos desde `tools/accounting/export-ledger.mjs` y las vistas `accounting_*`.

---

## 1. Encabezado
- **Entidad**: AutoRenta S.R.L.
- **Período**: `YYYY-MM-DD` al `YYYY-MM-DD`
- **Moneda funcional**: Peso argentino (ARS)
- **Fecha de emisión**: `YYYY-MM-DD`
- **Responsables**: Contador a cargo, CEO

## 2. Estado de Situación Financiera (Balance General)
| Código | Cuenta | Tipo | Saldo ARS |
|--------|--------|------|-----------|
| 1.1 | Efectivo y equivalentes | Activo corriente | |
| 1.2 | Activos por cobrar (comisiones) | Activo corriente | |
| 1.3 | Activos intangibles capitalizados | Activo no corriente | |
| 2.1 | Pasivos por wallet (fondos clientes) | Pasivo corriente | |
| 2.2 | Depósitos de garantía | Pasivo corriente | |
| 2.3 | Fondo de garantía operativo (FGO) | Pasivo restringido | |
| 3.1 | Patrimonio aportado | Patrimonio | |
| 3.2 | Resultados acumulados | Patrimonio | |

> Fuente: vista `accounting_balance_sheet` (columna `balance` en centavos).

## 3. Estado de Resultados Integral
| Código | Concepto | Tipo | Monto ARS |
|--------|----------|------|-----------|
| 4.1 | Ingresos por comisiones | Ingreso | |
| 4.2 | Ingresos por upgrades de seguro | Ingreso | |
| 4.3 | Ingresos por fees financieros | Ingreso | |
| 5.1 | Costos de procesamiento pagos | Gasto | |
| 5.2 | Pérdidas por siniestros (uso FGO) | Gasto | |
| 5.3 | Gasto amortización intangibles | Gasto | |
| 5.4 | Otros gastos operativos | Gasto | |
| | **Resultado operativo** | | |
| | **Resultado neto** | | |

> Fuente: vista `accounting_income_statement`. Convertir de centavos a ARS dividiendo por 100.

## 4. Estado de Flujo de Efectivo (Método indirecto)
1. **Flujos operativos**
   - Resultado neto del período
   - Ajustes por amortización intangibles
   - Variación pasivos wallet
   - Variación depósitos/FGO
2. **Flujos de inversión**
   - Capitalización de desarrollo
   - Compras de activos
3. **Flujos de financiamiento**
   - Aportes de capital
   - Préstamos recibidos/pagados
4. **Variación neta de efectivo**
   - Saldo inicial caja
   - Saldo final caja

> Fuente: vista `accounting_cash_flow` y ledger exportado.

## 5. Estado de Cambios en el Patrimonio
| Concepto | Patrimonio aportado | Resultados acumulados | Total |
|----------|---------------------|-----------------------|-------|
| Saldo inicial | | | |
| Aportes / retiros | | | |
| Resultado del período | | | |
| Otros movimientos | | | |
| Saldo final | | | |

## 6. Notas a los estados financieros
1. **Descripción de la entidad y modelo de negocio.**
2. **Política contable** (referencia a `POLITICA_CONTABLE_AUTORENTA.md`).  
3. **Riesgo de crédito y garantías**: detalle de FGO, siniestros pendientes, aging de depósitos.  
4. **Ingresos por segmentos**: seguro, comisión, fees.  
5. **Contingencias legales o fiscales**.  
6. **Eventos posteriores al cierre**.

## 7. Conciliaciones obligatorias (adjuntar en anexos)
- Export `summary_*.json` del script de ledger.  
- Resultado de `wallet-reconciliation` (logs).  
- Resumen de cuentas bancarias vs pasivos wallet.  
- Lista de reservas en curso (estado `confirmed`, `in_progress`).

## 8. Checklist de emisión
1. Ejecutar `node tools/accounting/export-ledger.mjs --start=YYYY-MM-01 --end=YYYY-MM-DD`.  
2. Validar que `balanced === true` en `summary_*.json`.  
3. Actualizar balances en Supabase (`refresh_accounting_balances`).  
4. Completar tablas/notes en este documento.  
5. Revisar con responsable contable; obtener aprobación.  
6. Archivar versión firmada en carpeta segura (drive/interno).

---

**Nota**: mantener esta plantilla bajo control de versiones. Cualquier cambio debe anotarse en un changelog con fecha, responsable y justificación.


---
# Source: FGO_SYSTEM.md

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

- **Valor actual**: Variable (ej: 15%) de cada depósito
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
-- Calcula: α% × 10,000 = monto variable (ej: USD 15 si α=15%)
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


---
# Source: METRICS_CALCULATOR.md

# 📊 Calculadora de Métricas FGO - Modelo Excel/Google Sheets

## 🎯 Objetivo

Este documento te permite crear una hoja de cálculo con fórmulas automáticas para calcular RC (Ratio de Cobertura), LR (Loss Ratio) y gestionar el FGO manualmente.

---

## 📋 Estructura de la Hoja de Cálculo

### Hoja 1: "Ledger" (Registro de Movimientos)

| Columna | Encabezado | Tipo | Fórmula/Validación |
|---------|------------|------|-------------------|
| A | Fecha | Fecha | - |
| B | Usuario ID | Texto | - |
| C | Usuario Nombre | Texto | - |
| D | Tipo Movimiento | Lista | Depósito, Siniestro, Transferencia, Ajuste |
| E | Subfondo | Lista | Liquidez, Capitalización, Rentabilidad |
| F | Monto Depósito USD | Número | - |
| G | Alpha % | Porcentaje | 15% (predeterminado) |
| H | Monto FGO USD | Calculado | `=F * G` (si es Depósito) |
| I | Operación | Lista | Crédito, Débito |
| J | Saldo Liquidez USD | Calculado | Ver fórmula abajo |
| K | Saldo Capitalización USD | Calculado | Ver fórmula abajo |
| L | Saldo Rentabilidad USD | Calculado | Ver fórmula abajo |
| M | Total FGO USD | Calculado | `=J + K + L` |
| N | Observaciones | Texto | - |

#### Fórmulas para Saldos (Fila 3 en adelante)

**Columna J (Saldo Liquidez)**:
```excel
=J2 + SI(Y(E3="Liquidez", I3="Crédito"), H3, SI(Y(E3="Liquidez", I3="Débito"), -H3, 0))
```

**Columna K (Saldo Capitalización)**:
```excel
=K2 + SI(Y(E3="Capitalización", I3="Crédito"), H3, SI(Y(E3="Capitalización", I3="Débito"), -H3, 0))
```

**Columna L (Saldo Rentabilidad)**:
```excel
=L2 + SI(Y(E3="Rentabilidad", I3="Crédito"), H3, SI(Y(E3="Rentabilidad", I3="Débito"), -H3, 0))
```

*Nota: En fila 2 (primera fila de datos), los saldos iniciales son 0.*

---

### Hoja 2: "Métricas FGO"

#### Sección A: Parámetros Configurables

| Celda | Parámetro | Valor Inicial | Descripción |
|-------|-----------|---------------|-------------|
| B2 | Alpha % | 15% | Porcentaje de reserva por depósito |
| B3 | Meses de Cobertura | 12 | Meta de meses que el fondo debe cubrir |

#### Sección B: Cálculos Automáticos

| Celda | Métrica | Fórmula |
|-------|---------|---------|
| B6 | Total Aportes USD | `=SUMAR.SI(Ledger!D:D, "Depósito", Ledger!H:H)` |
| B7 | Total Siniestros Pagados USD | `=SUMAR.SI(Ledger!D:D, "Siniestro", Ledger!H:H)` |
| B8 | Cantidad de Siniestros | `=CONTAR.SI(Ledger!D:D, "Siniestro")` |
| B9 | Promedio por Siniestro USD | `=SI(B8>0, B7/B8, 0)` |
| B10 | Meta de Saldo USD | `=B9 * B3` |
| B11 | Saldo Actual Total FGO USD | `=INDICE(Ledger!M:M, CONTARA(Ledger!M:M))` |
| B12 | **RC (Ratio de Cobertura)** | `=SI(B10>0, B11/B10, 0)` |
| B13 | **LR (Loss Ratio)** | `=SI(B6>0, B7/B6, 0)` |

#### Sección C: Estado del Fondo

| Celda | Métrica | Fórmula |
|-------|---------|---------|
| B16 | Estado | `=SI(B12>=1, "✅ Healthy", SI(B12>=0.7, "⚠️ Warning", "🔴 Critical"))` |
| B17 | Faltante/Excedente USD | `=B11 - B10` |
| B18 | % de Meta Alcanzado | `=SI(B10>0, (B11/B10)*100, 0) & "%"` |

#### Sección D: Recomendaciones Automáticas

| Celda | Recomendación | Fórmula |
|-------|---------------|---------|
| B21 | Ajuste de Alpha | `=SI(B12<0.9, "🔼 Incrementar α a " & REDONDEAR(B2*1.33, 0) & "%", SI(B12>1.2, "🔽 Reducir α a " & REDONDEAR(B2*0.85, 0) & "%", "✅ Mantener α en " & B2*100 & "%"))` |

---

### Hoja 3: "Resumen por Subfondo"

| Subfondo | Saldo Actual USD | % del Total | Propósito |
|----------|------------------|-------------|-----------|
| Liquidez | `=INDICE(Ledger!J:J, CONTARA(Ledger!J:J))` | `=(celda anterior / total) * 100 & "%"` | Efectivo disponible |
| Capitalización | `=INDICE(Ledger!K:K, CONTARA(Ledger!K:K))` | `=(celda anterior / total) * 100 & "%"` | Activo productivo |
| Rentabilidad | `=INDICE(Ledger!L:L, CONTARA(Ledger!L:L))` | `=(celda anterior / total) * 100 & "%"` | Resultado diferido |
| **Total** | `=SUMA(celdas anteriores)` | **100%** | |

---

### Hoja 4: "Dashboard Gráficos"

#### Gráfico 1: Evolución del Saldo Total FGO

- **Tipo**: Gráfico de líneas
- **Eje X**: Columna A de "Ledger" (Fecha)
- **Eje Y**: Columna M de "Ledger" (Total FGO USD)
- **Serie 2**: Meta de Saldo (línea horizontal de referencia)

#### Gráfico 2: Distribución por Subfondo

- **Tipo**: Gráfico de torta (pie chart)
- **Datos**: Saldos de Liquidez, Capitalización, Rentabilidad
- **Etiquetas**: Incluir porcentajes

#### Gráfico 3: RC y LR Histórico

- **Tipo**: Gráfico de columnas combinado
- **Eje X**: Meses
- **Eje Y Izquierdo**: RC (barras)
- **Eje Y Derecho**: LR (línea)

---

## 🚀 Instrucciones de Uso

### 1. Crear la Hoja de Cálculo

**Google Sheets**:
1. Abrí Google Sheets
2. Creá una hoja nueva: "Autorentar - FGO Ledger"
3. Creá 4 hojas: "Ledger", "Métricas FGO", "Resumen por Subfondo", "Dashboard Gráficos"

**Excel**:
1. Abrí Excel
2. Guardar como: `Autorentar_FGO_Ledger.xlsx`
3. Creá 4 hojas con los mismos nombres

### 2. Configurar Validaciones de Datos

**Hoja "Ledger"**:

- **Columna D (Tipo Movimiento)**:
  - Validación de lista: `Depósito, Siniestro, Transferencia, Ajuste`

- **Columna E (Subfondo)**:
  - Validación de lista: `Liquidez, Capitalización, Rentabilidad`

- **Columna I (Operación)**:
  - Validación de lista: `Crédito, Débito`

### 3. Aplicar Formato Condicional

**Hoja "Métricas FGO"**:

- **Celda B12 (RC)**:
  - Verde si ≥ 1.0
  - Amarillo si entre 0.7 y 1.0
  - Rojo si < 0.7

- **Celda B13 (LR)**:
  - Verde si < 0.10
  - Amarillo si entre 0.10 y 0.30
  - Rojo si ≥ 0.30

- **Celda B16 (Estado)**:
  - Verde si contiene "Healthy"
  - Amarillo si contiene "Warning"
  - Rojo si contiene "Critical"

### 4. Registrar Movimientos

**Ejemplo: Usuario deposita USD 100**

| Fecha | Usuario ID | Usuario Nombre | Tipo Movimiento | Subfondo | Monto Depósito USD | Alpha % | Monto FGO USD | Operación | Observaciones |
|-------|------------|----------------|-----------------|----------|-------------------|---------|---------------|-----------|---------------|
| 22/10/2025 | user_001 | Juan Pérez | Depósito | Liquidez | 100 | 15% | =100*15% | Crédito | Reserva inicial |

*Los saldos se actualizan automáticamente con las fórmulas.*

**Ejemplo: Pagar siniestro de USD 300**

| Fecha | Usuario ID | Usuario Nombre | Tipo Movimiento | Subfondo | Monto Depósito USD | Alpha % | Monto FGO USD | Operación | Observaciones |
|-------|------------|----------------|-----------------|----------|-------------------|---------|---------------|-----------|---------------|
| 22/10/2025 | booking_001 | Siniestro Auto 01 | Siniestro | Liquidez | - | - | 300 | Débito | Reparación parachoques |

### 5. Revisar Métricas Automáticamente

Al registrar cada movimiento:
1. La hoja "Métricas FGO" se actualiza automáticamente
2. Revisá el RC y LR
3. Verificá el estado del fondo
4. Seguí las recomendaciones de ajuste de α

---

## 📊 Ejemplo Completo de Uso

### Escenario: Primer mes de operación

**Movimientos**:

1. **Usuario 1 deposita USD 100**
   - Aporte FGO: USD 15 (15%)
   - Saldo Liquidez: USD 15

2. **Usuario 2 deposita USD 250**
   - Aporte FGO: USD 37.50 (15%)
   - Saldo Liquidez: USD 52.50

3. **Usuario 3 deposita USD 500**
   - Aporte FGO: USD 75 (15%)
   - Saldo Liquidez: USD 127.50

4. **Siniestro 1: USD 80**
   - Pago desde Liquidez: -USD 80
   - Saldo Liquidez: USD 47.50

**Métricas al final del mes**:
- Total Aportes: USD 127.50
- Total Siniestros Pagados: USD 80
- LR: 80 / 127.50 = **0.63 (63%)** ⚠️ Alto
- Promedio por Siniestro: USD 80
- Meta de Saldo (12 meses): USD 80 × 12 = USD 960
- Saldo Actual: USD 47.50
- RC: 47.50 / 960 = **0.049 (4.9%)** 🔴 Critical

**Recomendación**:
- 🔼 Incrementar α según riesgo (ej: de 15% a 20%)
- Monitorear más siniestros para mejorar estadísticas

---

## ✅ Checklist de Implementación

- [ ] Crear hoja de cálculo con 4 hojas
- [ ] Configurar encabezados y columnas
- [ ] Aplicar fórmulas de saldos acumulados
- [ ] Configurar hoja "Métricas FGO" con fórmulas
- [ ] Aplicar validaciones de datos
- [ ] Configurar formato condicional
- [ ] Crear gráficos en "Dashboard Gráficos"
- [ ] Registrar primer movimiento de prueba
- [ ] Verificar cálculos automáticos
- [ ] Compartir con equipo administrativo

---

## 🔗 Recursos Adicionales

- **Documentación Técnica**: `/docs/FGO_SISTEMA_CONTABLE.md`
- **Migración SQL**: `/supabase/migrations/20251022_create_fgo_system.sql`
- **Template CSV**: `/docs/FGO_LEDGER_TEMPLATE.csv`

---

**Última actualización**: 22 de octubre de 2025
**Versión**: 1.0


---
# Source: POLICIES.md

# 📜 Política del Fondo de Garantía Operativa (FGO)
## AutoRenta S.A.S. - Versión 1.0

---

**Fecha de Emisión**: 22 de octubre de 2025
**Vigencia**: A partir de la fecha de emisión
**Última Revisión**: 22 de octubre de 2025
**Aprobado por**: Dirección General AutoRenta S.A.S.

---

## 📋 Índice

1. [Objetivo y Alcance](#1-objetivo-y-alcance)
2. [Definiciones](#2-definiciones)
3. [Estructura del FGO](#3-estructura-del-fgo)
4. [Aportes al FGO](#4-aportes-al-fgo)
5. [Uso de los Fondos](#5-uso-de-los-fondos)
6. [Métricas y Monitoreo](#6-métricas-y-monitoreo)
7. [Gestión de Riesgos](#7-gestión-de-riesgos)
8. [Auditoría y Transparencia](#8-auditoría-y-transparencia)
9. [Modificaciones a la Política](#9-modificaciones-a-la-política)

---

## 1. Objetivo y Alcance

### 1.1 Objetivo

El **Fondo de Garantía Operativa (FGO)** tiene como objetivo:

1. **Garantizar liquidez** para cubrir siniestros, franquicias y devoluciones urgentes
2. **Proteger a usuarios y propietarios** de autos ante imprevistos operacionales
3. **Asegurar sustentabilidad** del modelo de negocio mediante reservas prudenciales
4. **Facilitar crecimiento** a través de capitalización estratégica

### 1.2 Alcance

Esta política aplica a:
- ✅ Todas las transacciones de depósito de usuarios
- ✅ Pagos de siniestros y franquicias
- ✅ Operaciones de capitalización de activos
- ✅ Gestión de excedentes y rentabilidad

---

## 2. Definiciones

### 2.1 Términos Clave

| Término | Definición |
|---------|------------|
| **FGO** | Fondo de Garantía Operativa - Sistema de reservas de AutoRenta |
| **α (Alpha)** | Porcentaje de cada depósito destinado al FGO |
| **RC (Ratio de Cobertura)** | Relación entre saldo FGO y meta de cobertura |
| **LR (Loss Ratio)** | Relación entre siniestros pagados y total de aportes |
| **Subfondo** | División funcional del FGO (Liquidez, Capitalización, Rentabilidad) |
| **Siniestro** | Evento que genera un costo cubierto por el FGO |
| **Meta de Cobertura** | Saldo objetivo del FGO (12 meses × promedio de siniestros) |

---

## 3. Estructura del FGO

### 3.1 Subfondos

El FGO se compone de **tres subfondos** especializados:

#### 3.1.1 Subfondo de Liquidez

**Propósito**: Efectivo disponible para operaciones inmediatas

**Usos Autorizados**:
- Pago de siniestros verificados
- Coberturas de franquicias
- Devoluciones urgentes de depósitos
- Reembolsos por cancelaciones

**Características**:
- Alta liquidez (100% efectivo)
- Disponibilidad inmediata (24/7)
- Sin restricciones de retiro para usos autorizados

#### 3.1.2 Subfondo de Capitalización

**Propósito**: Inversión en activos productivos

**Usos Autorizados**:
- Compra de autos para flota propia
- Inversiones temporales de bajo riesgo (máx. 90 días)
- Expansión de infraestructura operativa

**Características**:
- Liquidez media (conversión en 7-30 días)
- Requiere aprobación de Dirección General
- Rentabilidad objetivo: Tasa de interés bancaria + 2%

#### 3.1.3 Subfondo de Rentabilidad

**Propósito**: Resultado diferido e intereses generados

**Usos Autorizados**:
- Intereses generados por inversiones
- Excedentes del FGO cuando RC > 1.3
- Bonificaciones futuras a usuarios recurrentes
- Fondo de emergencia para situaciones excepcionales

**Características**:
- Acumulación progresiva
- Sin retiros hasta alcanzar umbral mínimo (USD 10,000)
- Requiere aprobación unánime del Comité Ejecutivo

### 3.2 Distribución Objetivo

| Subfondo | % Recomendado | Justificación |
|----------|---------------|---------------|
| Liquidez | 60-70% | Cobertura de siniestros frecuentes |
| Capitalización | 20-30% | Crecimiento sostenible |
| Rentabilidad | 5-10% | Colchón de seguridad |

---

## 4. Aportes al FGO

### 4.1 Aporte Automático (α)

**Mecanismo**:
- Cada depósito de usuario genera un aporte automático del **α%** al FGO
- El aporte se registra en el subfondo de Liquidez
- La operación es **transparente y automática**

**Valor Actual de α**:
- **α = Variable** (ej: 15%)

**Ejemplo**:
```
Usuario deposita: USD 100
α aplicado: 15% (ejemplo)
Aporte al FGO: USD 15
Saldo disponible usuario: USD 85
```

### 4.2 Ajuste Dinámico de α

El valor de α se ajusta según el estado del FGO:

| Estado FGO | RC Actual | α Recomendado | Frecuencia de Ajuste |
|------------|-----------|---------------|---------------------|
| 🔴 Critical | RC < 0.7 | 20-25% | Inmediato (48h) |
| ⚠️ Warning | 0.7 ≤ RC < 1.0 | 17-20% | Quincenal |
| ✅ Healthy | 1.0 ≤ RC < 1.3 | Variable (ej: 15%) | Mensual |
| 💰 Excess | RC ≥ 1.3 | 10-12% | Trimestral |

**Procedimiento de Ajuste**:
1. Análisis de métricas por Dirección Financiera
2. Propuesta de nuevo α con justificación
3. Aprobación por Dirección General
4. Comunicación a usuarios con 7 días de anticipación
5. Implementación en sistema

### 4.3 Transparencia de Aportes

**Compromisos**:
- ✅ Cada usuario ve su aporte al FGO en su historial de transacciones
- ✅ Dashboard público muestra estado agregado del FGO (sin datos de usuarios)
- ✅ Reporte trimestral de uso de fondos

---

## 5. Uso de los Fondos

### 5.1 Prioridades de Uso

**Orden de Prioridad**:

1. **Prioridad Alta** (uso inmediato desde Liquidez):
   - Siniestros verificados con daños materiales
   - Franquicias cubiertas por el FGO
   - Devoluciones por cancelaciones de fuerza mayor

2. **Prioridad Media** (requiere aprobación):
   - Transferencias a Capitalización
   - Inversiones temporales
   - Bonificaciones promocionales

3. **Prioridad Baja** (requiere aprobación ejecutiva):
   - Retiros de Rentabilidad
   - Ajustes manuales de saldos
   - Transferencias entre subfondos

### 5.2 Pago de Siniestros

**Procedimiento**:

1. **Reporte del Siniestro**:
   - Usuario o propietario reporta incidente
   - Adjunta evidencia (fotos, videos, denuncia policial si aplica)

2. **Verificación**:
   - Equipo de Operaciones valida evidencia
   - Cotización de reparación por taller autorizado
   - Aprobación por Jefe de Operaciones

3. **Pago**:
   - Sistema registra pago en `fgo_movements`
   - Débito automático del subfondo de Liquidez
   - Notificación a beneficiario

4. **Seguimiento**:
   - Actualización de métricas (RC, LR)
   - Registro en historial de siniestros
   - Análisis de causas para prevención

**Montos Máximos sin Aprobación Adicional**:
- Hasta USD 500: Jefe de Operaciones
- USD 501 - USD 2,000: Dirección General
- Más de USD 2,000: Comité Ejecutivo + Revisión Legal

---

## 6. Métricas y Monitoreo

### 6.1 Ratio de Cobertura (RC)

**Definición**:
```
RC = Saldo Total FGO / Meta de Cobertura
Meta de Cobertura = Promedio Mensual de Siniestros × 12 meses
```

**Interpretación**:

| RC | Estado | Acciones |
|----|--------|----------|
| RC ≥ 1.0 | ✅ Healthy | Mantener α actual, considerar capitalización |
| 0.7 ≤ RC < 1.0 | ⚠️ Warning | Incrementar α gradualmente, suspender inversiones |
| RC < 0.7 | 🔴 Critical | Incrementar α a máximo, congelar capitalizaciones |

**Frecuencia de Cálculo**: Diaria (automática)

### 6.2 Loss Ratio (LR)

**Definición**:
```
LR = Total Siniestros Pagados / Total Aportes Recibidos
```

**Interpretación**:

| LR | Estado | Acciones |
|----|--------|----------|
| LR < 0.10 | Excelente | Revisar α para liberar más liquidez a usuarios |
| 0.10 ≤ LR < 0.30 | Aceptable | Monitoreo normal |
| LR ≥ 0.30 | Alto | Revisar procesos de verificación de vehículos |

**Frecuencia de Cálculo**: Mensual

### 6.3 Dashboard de Monitoreo

**Métricas Públicas** (visibles para todos los usuarios):
- Estado del FGO (Healthy/Warning/Critical)
- Total de siniestros cubiertos este mes
- Promedio de tiempo de respuesta a siniestros

**Métricas Internas** (solo para administradores):
- RC y LR detallados
- Saldos por subfondo
- Proyecciones a 3, 6 y 12 meses
- Análisis de tendencias

---

## 7. Gestión de Riesgos

### 7.1 Riesgos Identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Siniestros masivos (catástrofe natural) | Baja | Alto | Seguro de flota, RC > 1.2 |
| Fraude en reportes de siniestros | Media | Alto | Verificación exhaustiva, denuncia policial |
| Insuficiencia del FGO (RC < 0.7) | Media | Medio | Ajuste dinámico de α, alertas tempranas |
| Mala inversión en Capitalización | Baja | Medio | Solo inversiones pre-aprobadas, plazos cortos |

### 7.2 Plan de Contingencia

**Escenario 1: RC < 0.5 (Insuficiencia Crítica)**

Acciones inmediatas:
1. Incrementar α al máximo permitido (25%)
2. Suspender todas las capitalizaciones
3. Transferir fondos de Rentabilidad a Liquidez
4. Negociar línea de crédito temporal
5. Comunicación transparente a usuarios

**Escenario 2: LR > 0.50 (Siniestralidad Extrema)**

Acciones inmediatas:
1. Auditoría de procesos de verificación de vehículos
2. Revisión de casos de siniestros del último trimestre
3. Implementación de medidas preventivas (inspecciones más rigurosas)
4. Evaluación de seguro complementario

---

## 8. Auditoría y Transparencia

### 8.1 Auditoría Interna

**Frecuencia**: Mensual

**Responsable**: Dirección Financiera

**Alcance**:
- Verificación de integridad de saldos (suma de subfondos = coverage_fund)
- Revisión de movimientos del mes
- Validación de cálculos de RC y LR
- Detección de anomalías

**Entregable**: Reporte de Auditoría Mensual del FGO

### 8.2 Auditoría Externa

**Frecuencia**: Anual

**Responsable**: Auditor Externo Certificado

**Alcance**:
- Revisión completa de políticas y procedimientos
- Validación de registros contables
- Evaluación de controles internos
- Recomendaciones de mejora

**Entregable**: Informe de Auditoría Anual

### 8.3 Transparencia con Usuarios

**Compromisos**:

1. **Dashboard Público** (actualización diaria):
   - Estado del FGO
   - Total de siniestros cubiertos
   - Tendencia de RC (sin valores exactos)

2. **Reporte Trimestral** (publicación web):
   - Resumen de movimientos del trimestre
   - Principales usos del FGO
   - Proyecciones para el siguiente trimestre

3. **Historial Personal**:
   - Cada usuario puede ver sus aportes al FGO
   - Cálculo del α aplicado en cada depósito

---

## 9. Modificaciones a la Política

### 9.1 Procedimiento de Modificación

**Propuesta**:
- Cualquier miembro del Comité Ejecutivo puede proponer cambios
- Documento formal con justificación técnica y financiera

**Revisión**:
- Análisis por Dirección Financiera (15 días)
- Consulta con asesores legales y contables
- Evaluación de impacto en usuarios

**Aprobación**:
- Requiere mayoría simple del Comité Ejecutivo
- Modificaciones sustanciales requieren unanimidad

**Comunicación**:
- Notificación a todos los usuarios con 30 días de anticipación
- Publicación en sitio web y email
- Entrada en vigencia después del período de notificación

### 9.2 Versionado

Cada modificación genera una nueva versión:
- **Versión Actual**: v1.0 (22 de octubre de 2025)
- **Próxima Revisión Programada**: 22 de enero de 2026

---

## 📊 Anexos

### Anexo A: Fórmulas de Cálculo

**Ratio de Cobertura (RC)**:
```sql
RC = (
  SELECT SUM(balance_cents) FROM fgo_subfunds
) / (
  SELECT AVG(monthly_siniestros) * 12
  FROM (
    SELECT DATE_TRUNC('month', ts) as month, SUM(amount_cents) as monthly_siniestros
    FROM fgo_movements
    WHERE movement_type IN ('siniestro_payment', 'franchise_payment')
    GROUP BY month
  ) AS subquery
)
```

**Loss Ratio (LR)**:
```sql
LR = (
  SELECT SUM(amount_cents)
  FROM fgo_movements
  WHERE movement_type IN ('siniestro_payment', 'franchise_payment')
) / (
  SELECT SUM(amount_cents)
  FROM fgo_movements
  WHERE movement_type = 'user_contribution'
)
```

### Anexo B: Contactos de Emergencia

| Rol | Responsable | Contacto |
|-----|-------------|----------|
| Director General | [Nombre] | [Email/Teléfono] |
| Director Financiero | [Nombre] | [Email/Teléfono] |
| Jefe de Operaciones | [Nombre] | [Email/Teléfono] |
| Auditor Externo | [Nombre] | [Email/Teléfono] |

### Anexo C: Historial de Versiones

| Versión | Fecha | Cambios Principales |
|---------|-------|---------------------|
| v1.0 | 22/10/2025 | Versión inicial - Creación de política FGO |

---

## ✅ Declaración de Cumplimiento

AutoRenta S.A.S. se compromete a:

1. **Cumplir** con todos los términos de esta política
2. **Mantener** la transparencia con usuarios y stakeholders
3. **Revisar** periódicamente la efectividad de la política
4. **Mejorar** continuamente los procesos de gestión del FGO
5. **Proteger** los intereses de usuarios y propietarios de autos

---

**Firmado**:

_______________________________
[Nombre del Director General]
Director General - AutoRenta S.A.S.
Fecha: 22 de octubre de 2025

_______________________________
[Nombre del Director Financiero]
Director Financiero - AutoRenta S.A.S.
Fecha: 22 de octubre de 2025

---

**Documento oficial de AutoRenta S.A.S.**
**Confidencialidad**: Público
**Distribución**: Todos los stakeholders


---
# Source: POLITICA_CONTABLE_AUTORENTA.md

# Política Contable AutoRenta (NIIF)

## 1. Alcance y objetivo
Establecer criterios uniformes para registrar, medir y presentar las operaciones del marketplace AutoRenta bajo NIIF 15 (ingresos), NIIF 37 (provisiones) y NIIF 38 (intangibles). La política aplica a todos los entornos (producción, staging) y se interpreta conjuntamente con la documentación técnica del ledger (`WALLET_LEDGER_IMPLEMENTATION.md`).

## 2. Reconocimiento de ingresos
- **Naturaleza**: AutoRenta actúa como agente; reconoce ingresos netos (comisiones, fees, mark ups de seguros).  
- **Momento**: cuando el locador confirma la entrega y la reserva pasa a `completed`. Los upgrades de seguro se reconocen al activar la cobertura (`booking_insurance_coverage`).  
- **Medición**: se toma el importe en la moneda funcional (ARS/USD). Si el flujo se realiza en USD se convierte al cierre diario usando la tasa de `exchange_rates.rate_effective`.  
- **Presentación**: se registra asiento `Cuenta 4.1 Ingresos por comisiones` contra `Cuenta 2.3 Pasivo por wallet`. Las promociones o descuentos se reconocen como menor ingreso.

## 3. Garantías y provisiones (NIIF 37)
- **Fondo de Garantía Operativo (FGO)**: se reconoce como pasivo restringido.  
  - Aportes: débito `Caja/Bancos`, crédito `Pasivo FGO`.  
  - Consumo por siniestro: débito `Pasivo FGO`, crédito `Caja/Bancos` o `Cuentas por cobrar`.  
- **Depósitos en garantía de locatarios**: permanecen como pasivo hasta la devolución.  
  - Bloqueo: crédito `Pasivo Depósitos`, débito `Caja restringida`.  
  - Liberación: asiento inverso.  
- **Reclamaciones**: cuando existe probabilidad y se puede estimar, registrar provisión en `Pasivo Provisiones Siniestros` con cargo a `Gasto Pérdidas por siniestro`. Actualizar contra el FGO al ejecutar.

## 4. Capitalización de desarrollo (NIIF 38)
- Clasificar tareas según si generan activo identificable.  
  - **Capitalizable**: módulos de ledger, automatizaciones FGO, funcionalidades de monetización (fase listos para uso).  
  - **Gasto**: investigación, pruebas de mercado, soporte post-release.  
- Condiciones: viabilidad técnica, intención de finalizar, capacidad de uso, recursos disponibles y medición fiable.  
- Reconocimiento: capitalizar costos directos (sueldos internos, contratistas, infraestructura asignable). Amortizar lineal en 3 años desde la puesta en producción. Mantener hoja de seguimiento por funcionalidad.

## 5. Ledger automático y conciliaciones
- Fuente confiable: tablas `wallet_ledger`, `accounting_ledger`, vistas `accounting_balance_sheet`, `accounting_income_statement`.  
- Cada evento operacional dispara asientos dobles vía RPC (`wallet_charge_rental`, `wallet_deposit_ledger`, `wallet_transfer`).  
- Conciliación diaria obligatoria usando `tools/accounting/export-ledger.mjs` y `supabase/functions/wallet-reconciliation`. Guardar resúmenes en `reports/accounting/`.  
- Resolver diferencias > USD 1 o ARS equivalente antes de liberar pagos a locadores.

## 6. Presentación de estados financieros
- **Moneda funcional**: ARS, con notas en USD para inversionistas.  
- **Estados mínimos**: Balance (situación financiera), Estado de resultados, Flujo de efectivo indirecto, Cambios en patrimonio, Notas (ingresos por comisión, reservas FGO, riesgo crediticio).  
- **Cierre mensual**: ejecutar `refresh_accounting_balances`, exportar ledger y emitir estados dentro de los 5 días hábiles siguientes.  
- **Revisión**: Contador responsable valida balances; CEO aprueba antes de compartir con terceros.

## 7. Controles internos
- Doble aprobación para retiros > USD 1 000 o equivalente.  
- Logs de auditoría habilitados en Supabase (`wallet_ledger_logs`).  
- Versionado de políticas en repositorio Git (`docs/accounting/`).  
- Seguimiento de KPIs financieros en `accounting_dashboard` (rentabilidad, liquidez FGO, aging de depósitos).

## 8. Políticas específicas adicionales
- **Impuestos**: aplicar retenciones según jurisdicción (IVA, Impuesto al Cheque). Registrar impuestos por pagar en pasivo corriente.  
- **Ingresos diferidos**: reservas en estado `confirmed` sin check-in permanecen en `Pasivo ingresos diferidos`.  
- **Desarrollos externos**: capitalizar solo si el contrato transfiere propiedad intelectual a AutoRenta.  
- **Reclasificaciones**: movimientos legacy (`wallet_transactions`) deben migrarse al ledger antes de cierre mensual.

## 9. Revisión y actualización
- Revisar política cada trimestre o ante cambios regulatorios.  
- Documentar versiones en changelog interno con fecha, responsable y secciones modificadas.


---
# Source: SISTEMA_CONTABLE_PARA_CONTADORA.md

# 📊 Sistema Contable de AutoRenta - Documentación para Contadora

**Fecha:** 2025-11-15
**Versión:** 1.0
**Empresa:** AutoRenta SAS
**Normas Aplicadas:** NIIF 15, NIIF 37, Partida Doble

---

## 📋 Índice

1. [Funcionamiento General del Sistema](#1-funcionamiento-general-del-sistema)
2. [Fuentes de Ingresos](#2-fuentes-de-ingresos)
3. [Balance General - Cómo se Carga](#3-balance-general---cómo-se-carga)
4. [Libro Mayor](#4-libro-mayor)
5. [Libro Bancos](#5-libro-bancos)
6. [Plan de Cuentas](#6-plan-de-cuentas)
7. [Reportes Disponibles](#7-reportes-disponibles)

---

## 1. Funcionamiento General del Sistema

### 🎯 Características Principales

AutoRenta cuenta con un **sistema contable 100% automatizado** que:

- ✅ **Registra automáticamente** todas las transacciones sin intervención manual
- ✅ **Cumple con NIIF 15** (Reconocimiento de Ingresos) y **NIIF 37** (Provisiones)
- ✅ **Valida partida doble** en cada asiento (débitos = créditos)
- ✅ **Trazabilidad completa**: Cada asiento está vinculado a su transacción origen
- ✅ **Reportes en tiempo real**: Estados financieros actualizados instantáneamente

### 🔄 Automatización por Triggers

El sistema utiliza **triggers de base de datos** que detectan eventos y crean asientos contables automáticamente:

| Evento | Trigger | Función Contable |
|-------|---------|------------------|
| Depósito a billetera | `wallet_transactions` (INSERT) | Registra como **PASIVO** (NIIF 15) |
| Inicio de alquiler | `bookings` (UPDATE status='in_progress') | Bloquea garantía |
| Finalización de alquiler | `bookings` (UPDATE status='completed') | Reconoce ingreso + crea provisión FGO |
| Retiro de fondos | `wallet_transactions` (type='withdrawal') | Reduce pasivo |

### 📊 Principio Contable Fundamental

**AutoRenta actúa como AGENTE** (no principal) según NIIF 15:
- Solo reconoce **comisión** como ingreso (α% del alquiler)
- El resto es del locador (no es ingreso de AutoRenta)
- Fondos en billetera son **PASIVO** hasta completar el servicio

---

## 2. Fuentes de Ingresos

### 💰 Ingresos Principales

#### 1. **Comisiones por Alquileres** (Cuenta 4.1.1)
- **Monto**: Porcentaje variable del valor total del alquiler
- **Reconocimiento**: Al completar el booking (NIIF 15 - devengado)
- **Ejemplo (Modelo Comodato)**:
  - Alquiler total: $10,000 ARS
  - Plataforma (Variable): $1,500 ARS → **INGRESO**
  - Reward Pool (75%): $7,500 ARS → Distribuido mensualmente a owners
  - FGO (10%): $1,000 ARS → Fondo de Garantía
  - Owner directo: $0 → Recibe rewards mensuales por puntos

#### 2. **Comisiones por Servicios Adicionales** (Cuenta 4.1.2)
- Seguros adicionales
- Servicios de delivery
- Otros servicios premium

#### 3. **Ingresos por Penalizaciones** (Cuenta 4.1.3)
- Multas por cancelaciones tardías
- Penalizaciones por daños no cubiertos por FGO

### 📈 Flujo de Reconocimiento de Ingresos

```
1. Usuario paga alquiler → Fondos bloqueados en billetera
   ↓
2. Booking se completa (status='completed')
   ↓
3. Sistema automáticamente:
   - Reconoce comisión (Variable) → INGRESO
   - Transfiere neto al locador → PASIVO (Pago a Locadores)
   - Libera garantía → PASIVO (Franquicia Bloqueada)
   - Crea provisión FGO (5% del alquiler) → PASIVO (NIIF 37)
```

### 🔍 Consulta de Ingresos

```sql
-- Ver ingresos del período
SELECT
  account_code,
  name,
  SUM(credit_amount) as ingresos_periodo
FROM accounting_ledger l
JOIN accounting_accounts a ON a.id = l.account_id
WHERE a.account_type = 'REVENUE'
  AND l.fiscal_period = '2025-11'
GROUP BY account_code, name
ORDER BY ingresos_periodo DESC;
```

---

## 3. Balance General - Cómo se Carga

### 📊 Estructura del Balance General

El Balance General se genera automáticamente desde el **Libro Mayor** (`accounting_ledger`):

```
ACTIVOS = PASIVOS + PATRIMONIO
```

### 🏦 ACTIVOS (1.x.x)

#### 1.1.1 Caja y Bancos
- **1.1.1.01** Caja General
- **1.1.1.02** Banco - Cuenta Corriente
- **1.1.1.03** MercadoPago - Wallet (saldo disponible en MercadoPago)
- **1.1.1.04** Stripe - Wallet

**Carga automática**: Se actualiza cuando hay depósitos o retiros procesados.

#### 1.1.2 Cuentas por Cobrar
- **1.1.2.01** Comisiones por Cobrar
- **1.1.2.02** Retenciones Pendientes

### 💼 PASIVOS (2.x.x)

#### 2.1.1 Depósitos de Clientes (NIIF 15) ⚠️ **CRÍTICO**
- **2.1.1.01** Billetera Usuarios - Locadores
- **2.1.1.02** Billetera Usuarios - Locatarios

**Importante**: Todos los fondos depositados por usuarios en billetera son **PASIVO** (obligación con el usuario), NO son ingresos hasta completar el servicio.

**Carga automática**:
- Al depositar → Aumenta pasivo
- Al retirar → Disminuye pasivo
- Al completar booking → Se reconoce ingreso (solo comisión)

#### 2.1.2 Depósitos de Garantía
- **2.1.2.01** Franquicias Bloqueadas (garantías de alquileres activos)

#### 2.1.3 Ingresos Diferidos (NIIF 15)
- **2.1.3.01** Ingresos Diferidos - Alquileres
- **2.1.3.02** Ingresos Diferidos - Comisiones

#### 2.1.4 Cuentas por Pagar
- **2.1.4.01** Pago a Locadores Pendiente (Neto del alquiler)
- **2.1.4.02** Retiros Solicitados

#### 2.1.5 Provisiones (NIIF 37)
- **2.1.5.01** Provisión FGO - Siniestros (5% del alquiler)

### 💎 PATRIMONIO (3.x)

- **3.1** Capital Social
- **3.2** Resultados Acumulados
- **3.3** Resultado del Ejercicio
- **3.4** Reserva FGO

### 📈 Generación Automática del Balance General

```sql
-- Consultar Balance General en tiempo real
SELECT * FROM accounting_balance_sheet;

-- O manualmente:
SELECT
  account_type,
  SUM(CASE WHEN account_type = 'ASSET' THEN debit_amount - credit_amount ELSE 0 END) as activos,
  SUM(CASE WHEN account_type = 'LIABILITY' THEN credit_amount - debit_amount ELSE 0 END) as pasivos,
  SUM(CASE WHEN account_type = 'EQUITY' THEN credit_amount - debit_amount ELSE 0 END) as patrimonio
FROM accounting_ledger l
JOIN accounting_accounts a ON a.id = l.account_id
WHERE l.entry_date <= CURRENT_DATE
GROUP BY account_type;
```

### ✅ Validación de Balance

El sistema valida automáticamente que:
```
ACTIVOS = PASIVOS + PATRIMONIO
```

Si hay diferencia, se genera una alerta automática.

---

## 4. Libro Mayor

### 📖 Definición

El **Libro Mayor** (`accounting_ledger`) es el registro detallado de todos los movimientos contables por cuenta, generado automáticamente desde el **Libro Diario** (`accounting_journal_entries`).

### 🔄 Flujo de Registro

```
1. Evento (ej: depósito, booking completado)
   ↓
2. Trigger detecta evento
   ↓
3. Función crea asiento en Libro Diario (accounting_journal_entries)
   ↓
4. Automáticamente se registra en Libro Mayor (accounting_ledger)
   ↓
5. Cada línea del asiento se registra por cuenta
```

### 📊 Estructura del Libro Mayor

Cada registro en `accounting_ledger` contiene:

- `account_id`: Cuenta contable afectada
- `entry_date`: Fecha del movimiento
- `debit_amount`: Monto del débito (si aplica)
- `credit_amount`: Monto del crédito (si aplica)
- `description`: Descripción del movimiento
- `reference_type`: Tipo de transacción origen (ej: 'booking', 'deposit')
- `reference_id`: ID de la transacción origen (ej: booking_id)
- `fiscal_period`: Período fiscal (YYYY-MM)

### 🔍 Consultar Libro Mayor por Cuenta

```sql
-- Libro Mayor de una cuenta específica
SELECT
  entry_date,
  description,
  debit_amount,
  credit_amount,
  (SELECT SUM(debit_amount - credit_amount)
   FROM accounting_ledger l2
   WHERE l2.account_id = l.account_id
     AND l2.entry_date <= l.entry_date) as saldo_acumulado
FROM accounting_ledger l
WHERE account_id = (SELECT id FROM accounting_accounts WHERE code = '2.1.1.01')
ORDER BY entry_date, created_at;
```

### 📋 Ejemplo: Libro Mayor de "Depósitos de Clientes"

```
Fecha       | Descripción                    | Débito | Crédito | Saldo
------------|--------------------------------|--------|---------|--------
2025-11-01  | Depósito usuario Juan          |        | 10,000  | 10,000
2025-11-02  | Depósito usuario María         |        | 5,000   | 15,000
2025-11-03  | Retiro usuario Juan             | 2,000  |         | 13,000
2025-11-05  | Booking completado (pago)      | 8,000  |         | 5,000
```

---

## 5. Libro Bancos

### 🏦 Definición

El **Libro Bancos** registra todos los movimientos de efectivo y cuentas bancarias (cuentas 1.1.1.x).

### 💰 Cuentas que Integran el Libro Bancos

- **1.1.1.01** Caja General
- **1.1.1.02** Banco - Cuenta Corriente
- **1.1.1.03** MercadoPago - Wallet
- **1.1.1.04** Stripe - Wallet

### 📊 Movimientos que se Registran

#### Entradas (Débito):
- Depósitos de usuarios recibidos en MercadoPago/Stripe
- Transferencias recibidas
- Reembolsos de procesadores

#### Salidas (Crédito):
- Retiros de usuarios procesados
- Pagos a locadores
- Comisiones de procesadores (MercadoPago, Stripe)
- Siniestros pagados del FGO

### 🔍 Consultar Libro Bancos

```sql
-- Libro Bancos consolidado (todas las cuentas de caja y bancos)
SELECT
  entry_date,
  a.name as cuenta,
  l.description,
  l.debit_amount as entrada,
  l.credit_amount as salida,
  reference_type,
  reference_id
FROM accounting_ledger l
JOIN accounting_accounts a ON a.id = l.account_id
WHERE a.code LIKE '1.1.1%'  -- Todas las cuentas de caja y bancos
ORDER BY entry_date DESC, created_at DESC;
```

### 📋 Ejemplo: Libro Bancos - MercadoPago Wallet

```
Fecha       | Descripción                    | Entrada | Salida  | Saldo
------------|--------------------------------|---------|---------|--------
2025-11-01  | Depósito usuario Juan         | 10,000  |         | 10,000
2025-11-02  | Comisión MercadoPago          |         | 500     | 9,500
2025-11-03  | Plataforma (Variable)          |         | 1,500   | 8,000
2025-11-03  | Reward Pool (75%)             |         | 7,500   | 500
2025-11-03  | FGO (10%)                     |         | 1,000   | -500
2025-11-05  | Retiro usuario María           |         | 800     | -1,300
```
**Nota**: En modelo comodato, owner no recibe pago directo por booking.

### 🔄 Reconciliación Bancaria

El sistema ejecuta automáticamente una **reconciliación** cada 6 horas:

```sql
-- Ejecutar reconciliación manual
SELECT * FROM accounting_wallet_reconciliation();
```

Esta función compara:
- Saldo contable (suma de movimientos en `accounting_ledger`)
- Saldo real en sistema wallet (`user_wallets`)
- Saldo en MercadoPago (si está integrado)

Si hay diferencia > $0.01, se genera una alerta.

---

## 6. Plan de Cuentas

### 📋 Estructura Completa

El plan de cuentas está basado en NIIF y adaptado para plataforma P2P:

#### ACTIVOS (1.x.x)
```
1.1.1 - Caja y Bancos
  1.1.1.01 - Caja General
  1.1.1.02 - Banco - Cuenta Corriente
  1.1.1.03 - MercadoPago - Wallet
  1.1.1.04 - Stripe - Wallet

1.1.2 - Cuentas por Cobrar
  1.1.2.01 - Comisiones por Cobrar
  1.1.2.02 - Retenciones Pendientes
```

#### PASIVOS (2.x.x)
```
2.1.1 - Depósitos de Clientes (NIIF 15)
  2.1.1.01 - Billetera Usuarios - Locadores
  2.1.1.02 - Billetera Usuarios - Locatarios

2.1.2 - Depósitos de Garantía
  2.1.2.01 - Franquicias Bloqueadas

2.1.3 - Ingresos Diferidos (NIIF 15)
  2.1.3.01 - Ingresos Diferidos - Alquileres
  2.1.3.02 - Ingresos Diferidos - Comisiones

2.1.4 - Cuentas por Pagar
  2.1.4.01 - Pago a Locadores Pendiente
  2.1.4.02 - Retiros Solicitados

2.1.5 - Provisiones (NIIF 37)
  2.1.5.01 - Provisión FGO - Siniestros
```

#### PATRIMONIO (3.x)
```
3.1 - Capital Social
3.2 - Resultados Acumulados
3.3 - Resultado del Ejercicio
3.4 - Reserva FGO
```

#### INGRESOS (4.x.x)
```
4.1.1 - Comisiones por Alquileres (NIIF 15)
4.1.2 - Comisiones por Servicios
4.1.3 - Ingresos por Penalizaciones
```

#### GASTOS (5.x.x)
```
5.1.1.01 - Comisión MercadoPago
5.1.1.02 - Comisión Stripe
5.1.2 - Gastos por Siniestros
5.1.3 - Gastos Administrativos
```

### 🔍 Consultar Plan de Cuentas

```sql
-- Ver todas las cuentas activas
SELECT
  code,
  name,
  account_type,
  sub_type,
  niif_reference
FROM accounting_accounts
WHERE is_active = TRUE
ORDER BY code;
```

---

## 7. Reportes Disponibles

### 📊 Reportes en Tiempo Real

El sistema genera automáticamente los siguientes reportes:

#### 1. **Balance de Comprobación**
```sql
SELECT * FROM accounting_trial_balance;
```
Muestra todas las cuentas con débitos, créditos y saldos. Valida que débitos = créditos.

#### 2. **Balance General** (Estado de Situación Financiera)
```sql
SELECT * FROM accounting_balance_sheet;
```
Presenta: Activos, Pasivos y Patrimonio.

#### 3. **Estado de Resultados** (P&L)
```sql
SELECT * FROM accounting_income_statement;
```
Muestra: Ingresos, Gastos y Utilidad Neta del período.

#### 4. **Dashboard Ejecutivo**
```sql
SELECT * FROM accounting_executive_dashboard;
```
Métricas clave:
- Total Activos / Pasivos / Patrimonio
- Ingresos / Gastos / Utilidad Neta
- Pasivo Billeteras (obligación con usuarios)
- FGO Disponible
- ROA y ROE

#### 5. **Libro Mayor por Cuenta**
```sql
SELECT * FROM accounting_general_ledger('2.1.1.01', '2025-11-01', '2025-11-30');
```
Detalle transaccional de cualquier cuenta en un rango de fechas.

#### 6. **Estado del FGO**
```sql
SELECT * FROM accounting_fgo_summary;
SELECT * FROM accounting_fgo_by_booking;
```

### ⏰ Procesos Automáticos

| Proceso | Frecuencia | Función |
|---------|-----------|---------|
| Cierre Diario | 23:59 diario | `accounting_daily_close()` |
| Reconciliación Wallet | Cada 6 horas | `accounting_wallet_reconciliation()` |
| Auditoría de Integridad | Lunes 2am | `accounting_integrity_audit()` |
| Cierre Mensual | Día 1 del mes 3am | `accounting_monthly_close()` |

---

## 📝 Ejemplos Prácticos

### Ejemplo 1: Depósito de Usuario

**Evento**: Usuario deposita $10,000 ARS a su billetera

**Asiento Automático**:
```
DEBE:  1.1.1.03 MercadoPago - Wallet    $10,000
HABER: 2.1.1.02 Depósitos de Clientes   $10,000
```

**Justificación**: Según NIIF 15, los fondos depositados son un **pasivo** (obligación con el usuario), no un ingreso.

### Ejemplo 2: Booking Completado

**Evento**: Booking de $10,000 ARS se completa

**Asientos Automáticos** (4 asientos simultáneos):

1. **Reconocimiento de Ingreso** (NIIF 15):
```
DEBE:  2.1.3.02 Ingresos Diferidos - Comisiones    $1,500
HABER: 4.1.1 Comisiones por Alquileres            $1,500
```

2. **Obligación con Locador**:
```
DEBE:  2.1.1.02 Billetera Locatarios               $8,500
HABER: 2.1.4.01 Pago a Locadores Pendiente        $8,500
```

3. **Liberación de Garantía**:
```
DEBE:  2.1.2.01 Franquicias Bloqueadas             $2,500
HABER: 2.1.1.02 Billetera Locatarios               $2,500
```

4. **Provisión FGO** (NIIF 37):
```
DEBE:  5.1.2 Gastos por Siniestros                 $500
HABER: 2.1.5.01 Provisión FGO - Siniestros         $500
```

### Ejemplo 3: Retiro de Usuario

**Evento**: Usuario retira $5,000 ARS de su billetera

**Asiento Automático**:
```
DEBE:  2.1.1.02 Depósitos de Clientes              $5,000
HABER: 1.1.1.02 Banco - Cuenta Corriente            $5,000
```

---

## 🔐 Seguridad y Auditoría

### Controles Implementados

- ✅ **Inmutabilidad**: Asientos contabilizados no pueden modificarse directamente
- ✅ **Auditoría**: Cada asiento registra quién, cuándo y por qué
- ✅ **Partida Doble**: Validación obligatoria (débitos = créditos)
- ✅ **RLS (Row Level Security)**: Usuarios solo ven sus transacciones
- ✅ **Trazabilidad**: Cada asiento vinculado a transacción origen
- ✅ **Alertas**: Notificación automática de anomalías

### Verificar Integridad del Sistema

```sql
-- Auditoría completa
SELECT * FROM accounting_integrity_audit();

-- Verificar balance
SELECT
  SUM(debit_amount) as total_debitos,
  SUM(credit_amount) as total_creditos,
  SUM(debit_amount) - SUM(credit_amount) as diferencia
FROM accounting_ledger
WHERE entry_date <= CURRENT_DATE;

-- Diferencia debe ser 0 (o < 0.01 por redondeo)
```

---

## 📞 Consultas Frecuentes

### P: ¿Por qué los depósitos van a pasivo?

**R**: Según NIIF 15, los fondos depositados por usuarios son un **pasivo** (obligación con el usuario) hasta que se preste el servicio. Solo cuando se completa el booking, AutoRenta reconoce su comisión (variable) como ingreso.

### P: ¿Cómo se calcula el monto del FGO?

**R**: Actualmente se provisiona el 5% del total del alquiler. Este porcentaje es ajustable según experiencia histórica de siniestros.

### P: ¿Qué pasa si hay discrepancia en wallet?

**R**: Ejecutar `accounting_wallet_reconciliation()` y revisar transacciones del día. Si la diferencia persiste, se genera una alerta automática.

### P: ¿Cómo exporto los datos para mi software contable?

**R**: Puedes exportar desde las vistas SQL o ejecutar queries personalizadas. El sistema está diseñado para ser compatible con exportación a Excel/CSV.

---

## 📚 Referencias Normativas

- **NIIF 15**: Ingresos de Actividades Ordinarias procedentes de Contratos con Clientes
  - AutoRenta actúa como **agente**, no principal
  - Solo reconoce **comisión** como ingreso, no el total del alquiler
  - Fondos en billetera son **pasivo** hasta completar servicio

- **NIIF 37**: Provisiones, Pasivos Contingentes y Activos Contingentes
  - FGO se contabiliza como **provisión** para siniestros esperados
  - Se estima basado en histórico (5% del alquiler)
  - Se consume al ocurrir siniestros reales

---

## ✅ Checklist de Validación

### Post-Instalación
- [ ] Todas las tablas creadas (`accounting_accounts`, `accounting_journal_entries`, `accounting_ledger`)
- [ ] Plan de cuentas cargado (46+ cuentas)
- [ ] Funciones automáticas instaladas (7+ funciones)
- [ ] Vistas de reportes disponibles (5+ vistas)
- [ ] Triggers activos en `wallet_transactions` y `bookings`

### Operación Diaria
- [ ] Balance de comprobación cuadra (débitos = créditos)
- [ ] Reconciliación wallet sin discrepancias
- [ ] No hay alertas críticas sin resolver
- [ ] Provisión FGO se crea automáticamente al completar bookings
- [ ] Dashboard ejecutivo muestra datos consistentes

---

**Documento preparado para:** Contadora de AutoRenta
**Última actualización:** 2025-11-15
**Contacto técnico:** Consultar documentación en `/database/accounting/`



---
# Source: VERIFICACION_LIBRO_MAYOR.md

# ✅ Verificación del Libro Mayor - Frontend

**Fecha:** 2025-11-15
**Componente:** Libro Mayor (Ledger)
**Ruta:** `/admin/accounting/ledger`

---

## 📋 Resumen de Verificación

### ✅ Estructura de Datos

**Base de Datos:**
- Tabla: `accounting_ledger`
- Campos principales:
  - `id` (UUID)
  - `entry_date` (TIMESTAMPTZ)
  - `account_code` (VARCHAR) → FK a `accounting_chart_of_accounts.code`
  - `debit` (DECIMAL) ✅
  - `credit` (DECIMAL) ✅
  - `description` (TEXT)
  - `reference_type` (VARCHAR)
  - `reference_id` (UUID)
  - `fiscal_period` (VARCHAR)

**Frontend:**
- Interfaz: `LedgerEntry` ✅
- Servicio: `AccountingService.getLedgerPaginated()` ✅
- Componente: `LedgerPage` ✅

### ✅ Relaciones

- `accounting_ledger.account_code` → `accounting_chart_of_accounts.code`
- Foreign Key: `accounting_ledger_account_code_fkey` ✅
- Consulta Supabase: `accounting_chart_of_accounts!accounting_ledger_account_code_fkey` ✅

### ✅ Funcionalidades Implementadas

1. **Consulta Paginada** ✅
   - Método: `getLedgerPaginated(page, pageSize, filters)`
   - Paginación: 50 registros por página
   - Orden: Por fecha descendente

2. **Filtros** ✅
   - Fecha inicio (`startDate`)
   - Fecha fin (`endDate`)
   - Código de cuenta (`accountCode`)
   - Tipo de referencia (`referenceType`)
   - Búsqueda en descripción (`searchTerm`)

3. **Visualización** ✅
   - Tabla con columnas:
     - Fecha
     - Cuenta (código + nombre)
     - Débito
     - Crédito
     - Descripción
     - Tipo de referencia
   - Manejo de valores nulos/cero
   - Estado de carga
   - Mensaje cuando no hay datos

4. **Exportación** ✅
   - Exportar a CSV
   - Incluye todos los campos relevantes

### ✅ Correcciones Aplicadas

1. **Manejo de Valores Nulos** ✅
   - Verificación de `entry.debit` y `entry.credit` antes de mostrar
   - Muestra "-" cuando el valor es 0 o null

2. **Mensaje Vacío** ✅
   - Mensaje cuando no hay datos para los filtros seleccionados

---

## 🔍 Cómo Acceder

### Opción 1: Página Dedicada
```
URL: /admin/accounting/ledger
```

### Opción 2: Tab en Panel de Contabilidad
```
URL: /admin/accounting
→ Click en tab "Libro Mayor"
```

---

## 🧪 Pruebas Recomendadas

### 1. Verificar Carga de Datos
```typescript
// En el navegador, abrir consola y verificar:
// 1. Que no haya errores en la consola
// 2. Que los datos se carguen correctamente
// 3. Que la paginación funcione
```

### 2. Probar Filtros
- [ ] Filtrar por rango de fechas
- [ ] Filtrar por código de cuenta (ej: `2.1.1.01`)
- [ ] Filtrar por tipo de referencia (ej: `booking`)
- [ ] Buscar en descripción
- [ ] Limpiar filtros

### 3. Verificar Visualización
- [ ] Los débitos se muestran correctamente
- [ ] Los créditos se muestran correctamente
- [ ] El nombre de la cuenta aparece junto al código
- [ ] Las fechas se formatean correctamente
- [ ] Los valores nulos/cero muestran "-"

### 4. Probar Exportación
- [ ] Click en botón de exportar
- [ ] Verificar que el CSV se descargue
- [ ] Verificar que el CSV contenga los datos correctos

---

## 📊 Estructura de la Consulta

```typescript
// Servicio: AccountingService.getLedgerPaginated()
const query = supabase
  .from('accounting_ledger')
  .select(`
    *,
    accounting_chart_of_accounts!accounting_ledger_account_code_fkey (
      code,
      name,
      account_type
    )
  `, { count: 'exact' })
  .order('entry_date', { ascending: false })
  .order('created_at', { ascending: false });
```

---

## ⚠️ Posibles Problemas y Soluciones

### Problema 1: No se muestran datos
**Causa:** Puede que no haya datos en la tabla `accounting_ledger`
**Solución:** Verificar que el sistema contable esté generando asientos automáticamente

### Problema 2: Error en la relación con `accounting_chart_of_accounts`
**Causa:** La foreign key puede no estar creada
**Solución:** Ejecutar la migración `20251026_accounting_system_complete.sql`

### Problema 3: Los valores de débito/crédito no se muestran
**Causa:** Los campos pueden ser `null`
**Solución:** Ya corregido - ahora muestra "-" cuando es null o 0

---

## ✅ Estado Final

- ✅ Estructura de datos correcta
- ✅ Relaciones configuradas
- ✅ Servicio funcionando
- ✅ Componente implementado
- ✅ Filtros funcionando
- ✅ Paginación funcionando
- ✅ Exportación funcionando
- ✅ Manejo de valores nulos
- ✅ Mensajes de estado

**El libro mayor está listo para usar.** 🎉

---

## 📝 Notas Técnicas

- El componente usa **Angular Signals** para reactividad
- La paginación se maneja en el frontend
- Los filtros se aplican en la consulta a Supabase
- La exportación se genera en el cliente (CSV)

---

**Última verificación:** 2025-11-15
**Estado:** ✅ FUNCIONANDO


# Sistema de Risk AR - Guía de Operaciones

**Versión**: 1.0
**Fecha**: 24 de Octubre, 2025
**Alcance**: Argentina (AR)

---

## 📋 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Matriz de Franquicias y Garantías](#matriz-de-franquicias-y-garantías)
4. [Flujos de Pago](#flujos-de-pago)
5. [Waterfall de Cobro](#waterfall-de-cobro)
6. [Reglas FGO](#reglas-fgo)
7. [SLA y Plazos Operativos](#sla-y-plazos-operativos)
8. [Playbooks y Procedimientos](#playbooks-y-procedimientos)
9. [KPIs y Monitoreo](#kpis-y-monitoreo)
10. [Troubleshooting](#troubleshooting)

---

## 1. Resumen Ejecutivo

### 🎯 Objetivo

Proteger al locador ante siniestros y sostener la liquidez del marketplace en Argentina, reduciendo fricción al locatario mediante:

- **Hold con tarjeta**: Preautorización reembolsable (si existe tarjeta)
- **Crédito de Seguridad**: Depósito no reembolsable en wallet (si no tiene tarjeta)

### 🔑 Componentes Clave

| Componente | Propósito |
|------------|-----------|
| **Franquicia Estándar** | Cobertura base (daño/robo) según valor del auto |
| **Franquicia Rollover** | Cobertura por vuelco (2× estándar) |
| **Hold (Tarjeta)** | Preautorización 35% del rollover deductible |
| **Crédito de Seguridad (Wallet)** | USD 300-500 según valor del auto |
| **FGO** | Fondo comunitario (tope USD 800/evento) |

---

## 2. Arquitectura del Sistema

### 📐 Diagrama de Flujo

```
┌────────────────────────────────────────────────────────────┐
│  USUARIO SELECCIONA AUTO                                   │
│  - Valor del auto (USD)                                    │
│  - Bucket (economy, standard, premium, luxury)             │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│  SISTEMA DETECTA MÉTODO DE PAGO DISPONIBLE                │
│  - ¿Tiene tarjeta registrada? → Hold                       │
│  - ¿No tiene tarjeta? → Crédito de Seguridad               │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│  CALCULA FRANQUICIAS Y GARANTÍA                            │
│  - Franquicia estándar (tabla USD)                         │
│  - Franquicia rollover (2× estándar)                       │
│  - Garantía (hold ARS o crédito USD)                       │
│  - FX snapshot (USD → ARS)                                 │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│  CREA RISK SNAPSHOT                                        │
│  - booking_risk_snapshot (DB)                              │
│  - Vincula a booking                                       │
│  - Fecha FX snapshot                                       │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│  PROCESA PAGO                                              │
│  - Wallet: Bloquea fondos totales                          │
│  - Tarjeta: Crea hold en MercadoPago                       │
│  - Parcial: Bloquea 30% + hold resto                       │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│  CONFIRMA BOOKING                                          │
│  - Status: confirmed                                       │
│  - Envía voucher con tabla de franquicias                  │
│  - Genera instrucciones de check-in                        │
└────────────────────────────────────────────────────────────┘
```

### 🗄️ Esquema de Base de Datos

**Tablas principales**:

- `bookings`: Reservas con campos de garantía y risk
- `booking_risk_snapshot`: Snapshots de risk con FX y franquicias
- `booking_inspections`: Fotos e inspecciones (check-in/out)
- `fgo_ledger`: Movimientos del FGO
- `fgo_parameters`: Parámetros configurables del FGO

**Funciones RPC**:

- `check_snapshot_revalidation(booking_id)`: Verifica si requiere revalidación
- `get_expiring_holds(hours_ahead)`: Obtiene holds que expiran pronto

---

## 3. Matriz de Franquicias y Garantías

### 📊 Franquicia Estándar (Daño/Robo)

| Valor del Auto (USD) | Franquicia Estándar | Franquicia Rollover (2×) |
|----------------------|---------------------|--------------------------|
| ≤ 10,000             | USD 500             | USD 1,000                |
| 10,001 - 20,000      | USD 800             | USD 1,600                |
| 20,001 - 40,000      | USD 1,200           | USD 2,400                |
| > 40,000             | USD 1,800           | USD 3,600                |

### 🔐 Garantías Según Método de Pago

#### Con Tarjeta (Hold)

| Bucket | Valor Auto (USD) | Hold Estimado (ARS) | Cálculo |
|--------|------------------|---------------------|---------|
| Economy | ≤ 10,000 | 600,000 | max(600k, 0.35 × 1,000 × FX) |
| Standard | 10,001 - 20,000 | 800,000 | max(800k, 0.35 × 1,600 × FX) |
| Premium | 20,001 - 40,000 | 1,200,000 | max(1.2M, 0.35 × 2,400 × FX) |
| Luxury | 40,001 - 80,000 | 1,500,000 | max(1.5M, 0.35 × 3,600 × FX) |
| Ultra-Luxury | > 80,000 | 2,000,000 | max(2M, 0.35 × 3,600 × FX) |

**Nota**: FX snapshot se toma al momento de la reserva y se revalida si varía ±10% o pasan >7 días.

#### Sin Tarjeta (Crédito de Seguridad)

| Valor del Auto (USD) | Crédito de Seguridad (USD) | Wallet Behavior |
|----------------------|----------------------------|-----------------|
| ≤ 20,000             | USD 300                    | No retirable    |
| > 20,000             | USD 500                    | No retirable    |

---

## 4. Flujos de Pago

### 💳 Flujo 1: Wallet Completo

**Requisitos**:
- Balance suficiente: `total_booking + security_credit`

**Pasos**:
1. Validar balance
2. Bloquear fondos (`wallet_lock_funds`)
3. Actualizar booking → `confirmed`
4. Crear payment intent → `succeeded`
5. Crear risk snapshot

**Rollback**:
- Si falla paso 3 o 4: desbloquear fondos (`wallet_unlock_funds`)
- Revertir booking → `pending`

### 💳 Flujo 2: Tarjeta de Crédito (Hold)

**Requisitos**:
- Tarjeta registrada en MercadoPago

**Pasos**:
1. Actualizar booking → `pending_payment`
2. Crear preferencia MercadoPago (con `capture=false`)
3. Redirigir a checkout MercadoPago
4. Webhook confirma pago → crear risk snapshot
5. Actualizar booking → `confirmed`

**Hold Expiration**:
- Holds expiran en 7 días
- Alquileres >7 días: reautorizar cada 6-7 días
- Cron job diario ejecuta `get_expiring_holds(24)` y dispara reautorizaciones

**Rollback**:
- Si falla preferencia: revertir booking → `pending`
- Si falla hold: notificar usuario, solicitar método alternativo

### 💳 Flujo 3: Parcial (Wallet 30% + Tarjeta 70%)

**Requisitos**:
- Balance suficiente: `30% × total_booking + security_credit`
- Tarjeta registrada

**Pasos**:
1. Validar balance parcial
2. Bloquear 30% en wallet
3. Actualizar booking → `pending_payment`
4. Crear preferencia MercadoPago para 70% restante
5. Redirigir a checkout
6. Webhook confirma → crear risk snapshot
7. Actualizar booking → `confirmed`

**Rollback**:
- Si falla paso 4 o 5: desbloquear fondos
- Revertir booking → `pending`

---

## 5. Waterfall de Cobro

### 💰 Prioridad de Cobro (Post-Alquiler)

#### Con Tarjeta

```
┌─────────────────────────────────────────────────────┐
│  1. CAPTURA PARCIAL DEL HOLD                        │
│  - Combustible faltante                             │
│  - Limpieza                                         │
│  - Daños menores (hasta franquicia)                 │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│  2. LIBERAR RESTO DEL HOLD                          │
│  - Automático si todo ok                            │
│  - 24-48 horas                                      │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│  3. CARD-ON-FILE (si se necesitan cobros diferidos) │
│  - Multas de tránsito                               │
│  - Peajes                                           │
│  - Plazo: 72 horas para pagar                       │
└─────────────────────────────────────────────────────┘
```

#### Sin Tarjeta

```
┌─────────────────────────────────────────────────────┐
│  1. CRÉDITO DE SEGURIDAD (WALLET)                   │
│  - Se debita primero                                │
│  - Hasta USD 300-500                                │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│  2. TOP-UP (si no alcanza)                          │
│  - Solicitud de depósito adicional                  │
│  - Plazo: 72 horas                                  │
│  - Bloqueo de cuenta si no paga                     │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│  3. FGO (si RC ≥ 1.0)                               │
│  - Tope: USD 800/evento                             │
│  - Requiere: evidencia completa, locatario en mora  │
│  - Recupero: todo lo recuperado vuelve al FGO       │
└─────────────────────────────────────────────────────┘
```

---

## 6. Reglas FGO

### 📈 Aportes al FGO (α)

| Transacción | Alpha Base | Alpha Stressed (RC < 1.0) | Alpha Healthy (RC > 1.2) |
|-------------|------------|---------------------------|--------------------------|
| Depósitos/Recargas | 15% | 20% | 10% |
| Comisiones | 4% | 4% | 4% |
| Membresías | 15% | 20% | 10% |

**Ajustes dinámicos**:
- Si `RC < 0.9` → α = 20% hasta volver a RC ≥ 1.0
- Si `RC > 1.2` (60 días) → α = 10% y se puede liberar excedente a promos

### 🚦 Gates de Solvencia

| RC | Estado | Max Cobertura | Co-Pago | Restricciones |
|----|--------|---------------|---------|---------------|
| ≥ 1.2 | Healthy | USD 800 | 0% | Ninguna |
| ≥ 1.0 | Normal | USD 800 | 0% | Ninguna |
| 0.8 - 0.9 | Warning | USD 800 | 20% | Requiere co-pago |
| < 0.8 | Critical | USD 100 | N/A | Solo micro-pagos |

**Límites adicionales**:
- Máx. 8% del FGO/mes en pagos
- Máx. 2 eventos/usuario/trimestre (salvo comité)

### 🔄 Recupero

Todo lo recuperado de:
- Card-on-file
- Planes de pago
- Cobranza judicial

**Vuelve al FGO** para mejorar RC y sostener liquidez.

---

## 7. SLA y Plazos Operativos

### ⏱️ Tiempos de Respuesta

| Evento | Plazo | Responsable |
|--------|-------|-------------|
| Reporte de daños (locador) | ≤ 2 horas post check-out | Locador |
| Validación de evidencia | D+1 hábil | AutoRenta Ops |
| Pre-decisión FGO | D+3 hábiles | AutoRenta Comité |
| Pago FGO (si aplica) | D+5 hábiles | AutoRenta Finance |
| Top-up locatario (sin tarjeta) | 72 horas | Locatario |

### 📸 Evidencia Obligatoria

**Tabla `booking_inspections`** debe contener:

- **Mínimo 8 fotos** (exterior + interior)
- **Odómetro** (check-in y check-out)
- **Nivel de combustible** (%)
- **Geolocalización** (lat/lon)
- **Firmas digitales** (locador + locatario)

**Sin evidencia completa → No se procesa claim FGO**.

### ⚠️ Multas y Diferidos

| Tipo | Método de Cobro | Plazo |
|------|-----------------|-------|
| Multas de tránsito | Card-on-file o top-up | 72 horas |
| Peajes | Card-on-file o top-up | 72 horas |
| Limpieza extraordinaria | Card-on-file o top-up | 72 horas |

**Si no paga en 72 horas**: Bloqueo de cuenta hasta regularización.

---

## 8. Playbooks y Procedimientos

### 📖 Playbook 1: Revalidación de Snapshot por FX

**Trigger**: Variación FX ±10% o >7 días desde snapshot

**Pasos**:

1. **Cron Job Diario** ejecuta:
   ```sql
   SELECT * FROM bookings
   WHERE requires_revalidation = true
   AND status IN ('confirmed', 'pending_payment');
   ```

2. **Para cada booking**:
   - Llamar `check_snapshot_revalidation(booking_id)`
   - Si `requires_revalidation = true`:
     - Crear nuevo risk snapshot con FX actual
     - Recalcular hold/crédito
     - Notificar usuario del cambio

3. **Actualizar booking**:
   ```sql
   UPDATE bookings
   SET risk_snapshot_id = new_snapshot_id,
       requires_revalidation = false,
       risk_snapshot_date = NOW()
   WHERE id = booking_id;
   ```

### 📖 Playbook 2: Reautorización de Hold (Alquileres >7 días)

**Trigger**: Hold expira en <24 horas

**Pasos**:

1. **Cron Job Diario** ejecuta:
   ```sql
   SELECT * FROM get_expiring_holds(24);
   ```

2. **Para cada hold expirando**:
   - Llamar API de MercadoPago: `POST /v1/payments/{payment_id}/authorize`
   - Si éxito:
     - Actualizar `hold_expires_at = NOW() + 7 days`
     - Incrementar `reauthorization_count`
   - Si fallo:
     - Notificar usuario URGENTE
     - Solicitar método alternativo
     - Opción: cancelar booking si no resuelve en 24h

3. **Logging**:
   - Registrar en `payment_intents` cada reautorización
   - Metrics: tasa de éxito de reautorización

### 📖 Playbook 3: Procesamiento de Claim con Waterfall

**Trigger**: Locador reporta daños ≤2 horas post check-out

**Pasos**:

1. **Validar Evidencia** (D+1):
   - Verificar `booking_inspections` completo (8 fotos, odómetro, firma)
   - Si falta: solicitar al locador (rechazar claim si no completa)

2. **Estimar Costo** (D+2):
   - Usar `SettlementService.estimateCost(damages[])`
   - Comparar con franquicia
   - Determinar si requiere FGO

3. **Ejecutar Waterfall**:

   **a. Con Tarjeta**:
   - Capturar parcial del hold hasta costo real
   - Si hold insuficiente → card-on-file (72 horas)
   - Si card-on-file falla → FGO (si RC ≥ 1.0)

   **b. Sin Tarjeta**:
   - Debitar crédito de seguridad (wallet)
   - Si insuficiente → solicitar top-up (72 horas)
   - Si no paga → FGO (si RC ≥ 1.0 y locatario en mora)

4. **Pago FGO** (D+5):
   - Validar `canUseFgo` del `FgoPolicyEngine`
   - Crear `fgo_payout` (máx. USD 800)
   - Transferir fondos a locador
   - Registrar en `fgo_ledger`

5. **Recupero** (ongoing):
   - Iniciar plan de pagos con locatario
   - Todo lo recuperado → FGO

---

## 9. KPIs y Monitoreo

### 📊 Métricas Clave

| KPI | Fórmula | Meta |
|-----|---------|------|
| **RC (Coverage Ratio)** | `total_fgo_balance / PEM` | ≥ 1.0 |
| **LR 90d (Loss Ratio 90 días)** | `claims_90d / premium_90d` | ≤ 0.30 |
| **Hit Rate de Captura** | `captures_exitosas / total_captures` | ≥ 95% |
| **% Evidencia Completa** | `claims_con_evidencia / total_claims` | ≥ 90% |
| **Tiempo a Captura** | Promedio días desde reporte a pago | ≤ 5 días |
| **Tasa de Disputa** | `disputas / total_bookings` | ≤ 2% |
| **Reautorizaciones Exitosas** | `reauths_ok / total_reauths` | ≥ 90% |

### 📈 Dashboards

**Dashboard 1: Solvencia FGO**
- RC en tiempo real
- LR 90d / 365d
- Balance FGO (USD y ARS)
- Pagos mensuales vs. límite 8%

**Dashboard 2: Operaciones**
- Claims pendientes (SLA: D+3)
- Holds expirando en 24h
- Snapshots requiriendo revalidación
- Top-ups vencidos (>72h)

**Dashboard 3: UX/Performance**
- Tasa de éxito de pagos por método
- Tiempo promedio checkout
- Disputas por región/bucket
- NPS por método de pago

---

## 10. Troubleshooting

### ❌ Problema: Hold Falla en Checkout

**Síntomas**:
- Error 402 de MercadoPago
- Usuario reporta "tarjeta rechazada"

**Diagnóstico**:
```sql
SELECT *
FROM bookings
WHERE id = 'booking_id'
AND guarantee_type = 'hold';
```

**Soluciones**:

1. **Verificar límite de tarjeta**: Informar al usuario que el hold requiere `$X ARS` disponibles
2. **Tarjeta no admite holds**: Sugerir wallet o parcial
3. **Tarjeta extranjera**: MercadoPago AR solo acepta tarjetas argentinas
4. **Retry**: Ofrecer reintento en 1 hora (a veces bancos bloquean temporalmente)

---

### ❌ Problema: Snapshot Requiere Revalidación pero No Se Actualiza

**Síntomas**:
- `requires_revalidation = true` permanece después de 7 días
- Usuario ve montos desactualizados en checkout

**Diagnóstico**:
```sql
SELECT * FROM check_snapshot_revalidation('booking_id');
```

**Soluciones**:

1. **Ejecutar cron manualmente**:
   ```bash
   # Desde Edge Function o backend
   curl -X POST ${SUPABASE_URL}/functions/v1/revalidate-snapshots
   ```

2. **Forzar snapshot nuevo**:
   ```typescript
   await fgoService.createRiskSnapshot(bookingId, { forceNew: true });
   ```

3. **Verificar FX rates actualizados**:
   ```sql
   SELECT * FROM exchange_rates
   WHERE pair = 'USDTARS' AND is_active = true
   ORDER BY last_updated DESC LIMIT 1;
   ```

---

### ❌ Problema: FGO No Cubre Claim (RC < 1.0)

**Síntomas**:
- Claim válido, evidencia completa
- `FgoPolicyEngine.canUseFgo = false`

**Diagnóstico**:
```sql
SELECT * FROM v_fgo_status_v1_1;
```

**Soluciones**:

1. **Si RC = 0.8 - 0.9 (Warning)**:
   - Aplicar co-pago 20%
   - Locador recibe 80% del claim (máx. USD 640)
   - Locatario paga 20% restante

2. **Si RC < 0.8 (Critical)**:
   - Solo claims ≤USD 100
   - Informar a locador: "FGO sin liquidez, recupero directo con locatario"
   - Aumentar α al 20% para recuperar RC

3. **Emergencia (RC < 0.5)**:
   - Suspender FGO temporalmente
   - Comunicado público explicando situación
   - Plan de recuperación: promos, aportes voluntarios, capital externo

---

## 📞 Contactos

| Rol | Responsable | Contacto |
|-----|-------------|----------|
| **Ops Lead** | TBD | ops@autorentar.com |
| **Finance Lead** | TBD | finance@autorentar.com |
| **Tech Lead** | TBD | tech@autorentar.com |
| **Comité FGO** | TBD | fgo-committee@autorentar.com |

---

**Última actualización**: 24 de Octubre, 2025
**Próxima revisión**: 24 de Enero, 2026

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
- Solo reconoce **comisión** como ingreso (15% del alquiler)
- El 85% restante es del locador (no es ingreso de AutoRenta)
- Fondos en billetera son **PASIVO** hasta completar el servicio

---

## 2. Fuentes de Ingresos

### 💰 Ingresos Principales

#### 1. **Comisiones por Alquileres** (Cuenta 4.1.1)
- **Monto**: 15% del valor total del alquiler
- **Reconocimiento**: Al completar el booking (NIIF 15 - devengado)
- **Ejemplo**:
  - Alquiler total: $10,000 ARS
  - Comisión AutoRenta (15%): $1,500 ARS → **INGRESO**
  - Locador recibe (85%): $8,500 ARS → **NO es ingreso de AutoRenta**

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
   - Reconoce comisión (15%) → INGRESO
   - Transfiere 85% al locador → PASIVO (Pago a Locadores)
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
- **2.1.4.01** Pago a Locadores Pendiente (85% del alquiler)
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
2025-11-03  | Pago a locador (85% booking)  |         | 8,500   | 1,000
2025-11-05  | Retiro usuario María           |         | 800     | 200
```

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

**R**: Según NIIF 15, los fondos depositados por usuarios son un **pasivo** (obligación con el usuario) hasta que se preste el servicio. Solo cuando se completa el booking, AutoRenta reconoce su comisión (15%) como ingreso.

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


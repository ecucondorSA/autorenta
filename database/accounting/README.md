# Sistema Contable Automático para AutoRenta

## 📋 Descripción General

Sistema contable completamente automatizado basado en **NIIF 15** (Reconocimiento de Ingresos) y **NIIF 37** (Provisiones), diseñado específicamente para la plataforma P2P de alquiler de vehículos AutoRenta.

## 🎯 Características Principales

### ✅ Cumplimiento Normativo
- **NIIF 15**: Reconocimiento de ingresos solo sobre comisiones (rol de agente)
- **NIIF 37**: Provisiones para el Fondo de Garantía Operativa (FGO)
- **Partida doble**: Validación automática de balance débito/crédito
- **Trazabilidad completa**: Cada asiento vinculado a su transacción origen

### 🤖 Automatización Completa
- ✅ Registro automático de depósitos a billetera como **pasivo**
- ✅ Bloqueo/liberación de garantías contabilizado automáticamente
- ✅ Reconocimiento de ingreso solo al completar servicio
- ✅ Provisiones FGO creadas y gestionadas automáticamente
- ✅ Cierre diario, mensual y reconciliaciones automáticas

## 📂 Estructura de Archivos

```
database/accounting/
├── 001-accounting-tables.sql       # Tablas base del sistema contable
├── 002-chart-of-accounts.sql       # Plan de cuentas completo
├── 003-automated-functions.sql     # Funciones de registro automático
├── 004-fgo-management.sql          # Gestión del FGO (NIIF 37)
├── 005-reports-views.sql           # Reportes y estados financieros
├── 006-periodic-processes.sql      # Procesos de cierre y auditoría
└── README.md                        # Este archivo
```

## 🗂️ Plan de Cuentas

### 1. ACTIVOS (1.x.x)
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

### 2. PASIVOS (2.x.x)
```
2.1.1 - Depósitos de Clientes (NIIF 15)
  2.1.1.01 - Billetera Usuarios - Locadores
  2.1.1.02 - Billetera Usuarios - Locatarios

2.1.2 - Depósitos de Garantía
  2.1.2.01 - Franquicias Bloqueadas
  2.1.2.02 - Garantías Pendientes Liberación

2.1.3 - Ingresos Diferidos (NIIF 15)
  2.1.3.01 - Ingresos Diferidos - Alquileres
  2.1.3.02 - Ingresos Diferidos - Comisiones

2.1.4 - Cuentas por Pagar
  2.1.4.01 - Pago a Locadores Pendiente
  2.1.4.02 - Retiros Solicitados

2.1.5 - Provisiones (NIIF 37)
  2.1.5.01 - Provisión FGO - Siniestros
  2.1.5.02 - Provisión Contingencias Legales
  2.1.5.03 - Provisión Cuentas Incobrables
```

### 3. PATRIMONIO (3.x)
```
3.1 - Capital Social
3.2 - Resultados Acumulados
3.3 - Resultado del Ejercicio
3.4 - Reserva FGO
```

### 4. INGRESOS (4.x.x)
```
4.1.1 - Comisiones por Alquileres (NIIF 15)
4.1.2 - Comisiones por Servicios
4.1.3 - Ingresos por Penalizaciones
4.2.1 - Intereses Ganados
4.2.2 - Diferencias de Cambio Positivas
```

### 5. GASTOS (5.x.x)
```
5.1.1.01 - Comisión MercadoPago
5.1.1.02 - Comisión Stripe
5.1.2 - Gastos por Siniestros
5.1.3 - Gastos Administrativos
5.1.4 - Gastos de Marketing
5.2.1 - Intereses Pagados
5.2.2 - Diferencias de Cambio Negativas
```

## 🔄 Flujos Automáticos

### 1. Depósito a Billetera
```sql
DEBE: Caja/MercadoPago (Activo ↑)
HABER: Depósitos de Clientes (Pasivo ↑)
```
**Trigger**: Al completar `wallet_transaction` con `type='deposit'`

### 2. Inicio de Alquiler
```sql
DEBE: Billetera Usuarios (Pasivo ↓)
HABER: Franquicias Bloqueadas (Pasivo ↑)
```
**Trigger**: Al cambiar `booking.status` a `'in_progress'`

### 3. Finalización de Alquiler

#### a) Reconocimiento de Comisión (NIIF 15)
```sql
DEBE: Ingresos Diferidos (Pasivo ↓)
HABER: Comisiones por Alquileres (Ingreso ↑)
```

#### b) Obligación con Locador
```sql
DEBE: Billetera Inquilino (Pasivo ↓)
HABER: Pago a Locadores Pendiente (Pasivo ↑)
```

#### c) Liberación de Garantía
```sql
DEBE: Franquicias Bloqueadas (Pasivo ↓)
HABER: Billetera Inquilino (Pasivo ↑)
```

#### d) Provisión FGO (NIIF 37)
```sql
DEBE: Gastos por Siniestros (Gasto ↑)
HABER: Provisión FGO (Pasivo ↑)
```

**Trigger**: Al cambiar `booking.status` a `'completed'`

### 4. Siniestro (Consumo FGO)
```sql
DEBE: Provisión FGO (Pasivo ↓)
HABER: Banco (Activo ↓)
```
**Función**: `accounting_record_fgo_claim(booking_id, amount)`

## 📊 Reportes Disponibles

### Estados Financieros
- ✅ **Balance de Comprobación** (`accounting_trial_balance`)
- ✅ **Balance General** (`accounting_balance_sheet`)
- ✅ **Estado de Resultados** (`accounting_income_statement`)
- ✅ **Dashboard Ejecutivo** (`accounting_executive_dashboard`)

### Reportes Operativos
- ✅ **Libro Mayor por Cuenta** (`accounting_general_ledger(account_code)`)
- ✅ **Estado FGO** (`accounting_fgo_summary`)
- ✅ **FGO por Booking** (`accounting_fgo_by_booking`)
- ✅ **Reconciliación Wallet** (`accounting_wallet_reconciliation()`)

## 🔧 Funciones Administrativas

### Crear Asiento Manual
```sql
SELECT create_accounting_entry(
  p_description := 'Descripción del asiento',
  p_entry_date := '2025-01-15',
  p_reference_type := 'manual',
  p_reference_id := NULL,
  p_lines := '[
    {"account_code": "1.1.1.02", "debit": 100, "description": "Ingreso"},
    {"account_code": "4.1.1", "credit": 100, "description": "Comisión"}
  ]'::jsonb,
  p_auto_post := TRUE
);
```

### Registrar Siniestro FGO
```sql
SELECT accounting_record_fgo_claim(
  p_booking_id := 'uuid-del-booking',
  p_claim_amount := 150.00,
  p_description := 'Rayón en puerta lateral'
);
```

### Liberar Provisión FGO
```sql
SELECT accounting_release_fgo_provision(
  p_booking_id := 'uuid-del-booking'
);
```

## ⏰ Procesos Periódicos

### Cierre Diario (Automatizar con Cron)
```sql
SELECT * FROM accounting_daily_close();
```
**Ejecutar**: Todos los días a las 23:59

### Cierre Mensual
```sql
SELECT * FROM accounting_monthly_close(2025, 1);
```
**Ejecutar**: Primer día de cada mes

### Auditoría de Integridad
```sql
SELECT * FROM accounting_integrity_audit();
```
**Ejecutar**: Semanalmente o después de migraciones

### Reconciliación Wallet
```sql
SELECT * FROM accounting_wallet_reconciliation();
```
**Ejecutar**: Diariamente

## 📖 Instalación

```bash
# 1. Crear tablas base
psql -f 001-accounting-tables.sql

# 2. Cargar plan de cuentas
psql -f 002-chart-of-accounts.sql

# 3. Instalar funciones automáticas
psql -f 003-automated-functions.sql

# 4. Configurar gestión FGO
psql -f 004-fgo-management.sql

# 5. Crear vistas de reportes
psql -f 005-reports-views.sql

# 6. Configurar procesos periódicos
psql -f 006-periodic-processes.sql
```

## 🔐 Seguridad

### Row Level Security (RLS)
- ✅ Usuarios solo ven sus propias transacciones
- ✅ Solo admins acceden a reportes completos
- ✅ Funciones críticas con `SECURITY DEFINER`

### Validaciones
- ✅ Partida doble obligatoria (débitos = créditos)
- ✅ Cuentas activas validadas antes de uso
- ✅ Auditoría automática de integridad

## 📈 Métricas del Dashboard

```sql
SELECT * FROM accounting_executive_dashboard;
```

Retorna:
- Total Activos
- Total Pasivos
- Total Patrimonio
- Ingresos del Período
- Gastos del Período
- Utilidad Neta
- Pasivo Billeteras
- FGO Disponible
- ROA (Return on Assets)
- ROE (Return on Equity)

## 🧪 Testing

### Verificar Balance
```sql
-- Debe retornar 0 diferencia
SELECT 
  SUM(debit_amount) - SUM(credit_amount) as difference
FROM accounting_journal_lines l
JOIN accounting_journal_entries e ON e.id = l.journal_entry_id
WHERE e.status = 'posted';
```

### Verificar Wallet vs Contabilidad
```sql
SELECT * FROM accounting_wallet_reconciliation();
-- Status debe ser 'balanced'
```

### Auditoría Completa
```sql
SELECT * FROM accounting_integrity_audit();
-- Todos los checks deben pasar (passed = true)
```

## 📚 Referencias Normativas

- **NIIF 15**: Ingresos de Actividades Ordinarias procedentes de Contratos con Clientes
  - AutoRenta actúa como **agente**, no principal
  - Solo reconoce **comisión** como ingreso, no el total del alquiler
  - Fondos en billetera son **pasivo** hasta completar servicio

- **NIIF 37**: Provisiones, Pasivos Contingentes y Activos Contingentes
  - FGO se contabiliza como **provisión** para siniestros esperados
  - Se estima basado en histórico (ejemplo: 5% del alquiler)
  - Se consume al ocurrir siniestros reales

## 🆘 Soporte

### Consultas Comunes

**P: ¿Por qué los depósitos van a pasivo?**
R: Según NIIF 15, son fondos de clientes que aún no representan ingresos devengados.

**P: ¿Cómo se calcula el monto del FGO?**
R: Actualmente 5% del total del alquiler. Ajustable en `trigger_create_fgo_provision`.

**P: ¿Qué pasa si hay discrepancia en wallet?**
R: Ejecutar `accounting_wallet_reconciliation()` y revisar transacciones del día.

## 📝 Changelog

### v1.0.0 (2025-10-26)
- ✅ Sistema completo implementado
- ✅ Automatización total de flujos
- ✅ Cumplimiento NIIF 15 y NIIF 37
- ✅ Reportes y dashboards integrados
- ✅ Procesos periódicos configurados

## 👥 Créditos

Sistema diseñado para **AutoRenta** por Claude Code siguiendo las mejores prácticas contables internacionales y adaptado a las necesidades específicas de plataformas P2P de alquiler de vehículos.

---

**¿Preguntas?** Revisa la documentación de funciones con:
```sql
SELECT 
  routine_name,
  routine_type,
  obj_description(oid, 'pg_proc') as description
FROM information_schema.routines r
JOIN pg_proc p ON p.proname = r.routine_name
WHERE routine_schema = 'public'
  AND routine_name LIKE 'accounting%'
ORDER BY routine_name;
```

# 🔄 SISTEMA CONTABLE CÍCLICO AUTOMATIZADO - AUTORENTAR

## 📊 RESUMEN EJECUTIVO

Sistema contable **100% automatizado** basado en **NIIF 15** (Reconocimiento de Ingresos) y **NIIF 37** (Provisiones), con partida doble y ciclos automáticos diarios/mensuales.

### ✅ **Características Principales**

| Característica | Estado | Automatización |
|---|---|---|
| Partida Doble Automática | ✅ Activo | 100% |
| Triggers en Transacciones | ✅ Activo | 100% |
| Cierre Mensual | ✅ Activo | 100% Automático |
| Refresh Diario Balances | ✅ Activo | 100% Automático |
| Conciliación Wallet | ✅ Activo | Automático Diario |
| Provisiones NIIF 37 | ✅ Activo | 100% |
| Dashboard Ejecutivo | ✅ Activo | Actualización Diaria |

---

## 🏗️ ARQUITECTURA DEL SISTEMA

### **1. Componentes Principales**

```
┌─────────────────────────────────────────────────────────────┐
│                  CAPA DE TRANSACCIONES                      │
│  (Wallet, Bookings, FGO, MercadoPago)                      │
└────────────────────┬────────────────────────────────────────┘
                     │ TRIGGERS AUTOMÁTICOS
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              MOTOR CONTABLE AUTOMATIZADO                    │
│  • create_journal_entry()                                   │
│  • Validación Partida Doble                                │
│  • Asientos Automáticos                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
    [JOURNAL]  [LEDGER]  [PROVISIONS]
    Libro      Libro      Provisiones
    Diario     Mayor      NIIF 37
          │          │          │
          └──────────┴──────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              VISTAS MATERIALIZADAS                          │
│  • Balance Sheet (Situación Financiera)                    │
│  • Income Statement (Estado de Resultados)                 │
│  • Dashboard Ejecutivo                                      │
│  • Conciliación Wallet                                     │
└────────────────────┬────────────────────────────────────────┘
                     │ CRON: Refresh 00:01 diario
                     │ CRON: Cierre 01:00 día 1 mes
                     ▼
           [REPORTES Y ANÁLISIS]
```

---

## 💡 PLAN DE CUENTAS NIIF

### **Activos (1xxx)**
```
1100 - Caja y Bancos (Control)
  1101 - Cuenta Corriente Banco
  1102 - MercadoPago - Cuenta Disponible
  1103 - MercadoPago - Cuenta Retenida

1200 - Cuentas por Cobrar (Control)
  1201 - Comisiones por Cobrar
```

### **Pasivos (2xxx)**
```
2100 - Pasivos por Contratos con Clientes (NIIF 15)
  2101 - Depósitos de Clientes (Billetera) ⚠️ CRÍTICO
  2102 - Depósitos de Garantía (Franquicias)

2200 - Provisiones (NIIF 37)
  2201 - Provisión FGO - Fondo de Garantía ⚠️ CRÍTICO
  2202 - Provisión para Siniestros

2300 - Cuentas por Pagar
  2301 - Por Pagar a Propietarios
  2302 - Comisiones MercadoPago por Pagar
```

### **Patrimonio (3xxx)**
```
3100 - Capital Social
3200 - Reservas (Control)
  3201 - Reserva Legal
3300 - Resultados Acumulados
3400 - Resultado del Ejercicio
```

### **Ingresos (4xxx)** - Solo Comisiones (NIIF 15 - Agente)
```
4100 - Ingresos por Comisiones (Control)
  4101 - Comisión por Alquiler
  4102 - Comisión por Seguro

4200 - Otros Ingresos
  4201 - Intereses Generados
  4202 - Penalidades Cobradas
```

### **Gastos (5xxx)**
```
5100 - Gastos Operacionales
  5101 - Comisiones Pagadas (MercadoPago)
  5102 - Gastos de Verificación
  5103 - Gastos de Marketing

5200 - Gastos Administrativos
  5201 - Salarios y Honorarios
  5202 - Servicios Cloud (Supabase, etc)

5300 - Gastos por Siniestros
  5301 - Siniestros Cubiertos por FGO
```

---

## 🔄 FLUJOS CONTABLES AUTOMATIZADOS

### **1. Depósito en Billetera**
```sql
Usuario deposita $100 en su billetera
┌──────────────────────────────────────┐
│ TRIGGER: trigger_accounting_wallet_deposit() │
└──────────────────────────────────────┘

ASIENTO AUTOMÁTICO:
  Debe   1102 - MercadoPago Disponible     $100
  Haber  2101 - Depósitos de Clientes      $100

📌 NIIF 15: Pasivo por contrato (deuda con usuario)
```

### **2. Bloqueo de Depósito de Garantía**
```sql
Booking confirmado con depósito $50
┌──────────────────────────────────────┐
│ TRIGGER: trigger_accounting_security_deposit() │
└──────────────────────────────────────┘

ASIENTO AUTOMÁTICO:
  Debe   2101 - Depósitos de Clientes       $50
  Haber  2102 - Depósitos de Garantía       $50

+ Crea PROVISIÓN tipo 'SECURITY_DEPOSIT'
📌 NIIF 37: Provisión por obligación futura
```

### **3. Finalización de Alquiler (Reconocimiento de Ingreso)**
```sql
Booking completado: Base $200, Comisión $30, Fee MP $10
┌──────────────────────────────────────┐
│ TRIGGER: trigger_accounting_commission_income() │
└──────────────────────────────────────┘

ASIENTO AUTOMÁTICO:
  Debe   2101 - Depósitos de Clientes       $200
  Haber  4101 - Comisión por Alquiler        $30  ← INGRESO
  Haber  2301 - Por Pagar a Propietarios    $170
  
  Debe   5101 - Comisión MercadoPago         $10  ← GASTO
  Haber  2302 - Por Pagar a MercadoPago      $10

📌 NIIF 15: Como agente, solo reconocer comisión
```

### **4. Liberación de Depósito de Garantía**
```sql
Sin siniestros, liberar $50
┌──────────────────────────────────────┐
│ TRIGGER: trigger_accounting_release_deposit() │
└──────────────────────────────────────┘

ASIENTO AUTOMÁTICO:
  Debe   2102 - Depósitos de Garantía       $50
  Haber  2101 - Depósitos de Clientes       $50

+ Actualiza PROVISIÓN a 'RELEASED'
```

### **5. Aporte al FGO**
```sql
Usuario/Sistema aporta $20 al FGO
┌──────────────────────────────────────┐
│ TRIGGER: trigger_accounting_fgo_contribution() │
└──────────────────────────────────────┘

ASIENTO AUTOMÁTICO:
  Debe   2101 - Depósitos de Clientes       $20
  Haber  2201 - Provisión FGO                $20

+ Crea PROVISIÓN tipo 'FGO_RESERVE'
📌 NIIF 37: Fondo restringido para contingencias
```

### **6. Uso del FGO para Siniestro**
```sql
Siniestro aprobado: Total $150, FGO cubre $100
┌──────────────────────────────────────┐
│ TRIGGER: trigger_accounting_fgo_usage() │
└──────────────────────────────────────┘

ASIENTO AUTOMÁTICO:
  Debe   2201 - Provisión FGO               $100
  Debe   5301 - Gasto Siniestro              $50
  Haber  1102 - MercadoPago                 $150

+ Actualiza PROVISIÓN FGO (utilizada)
```

---

## ⏰ AUTOMATIZACIÓN CÍCLICA

### **Diaria (00:01 hrs)**
```sql
SELECT cron.schedule(
  'refresh-accounting-balances-daily',
  '1 0 * * *',
  $$ SELECT refresh_accounting_balances(); $$
);
```

**Acciones:**
1. Refresca `accounting_balance_sheet`
2. Refresca `accounting_income_statement`
3. Refresca `accounting_dashboard`
4. Refresca `accounting_wallet_reconciliation`
5. Refresca `accounting_commissions_report`
6. Refresca `accounting_provisions_report`

### **Mensual (Día 1, 01:00 hrs)**
```sql
SELECT cron.schedule(
  'close-accounting-period-monthly',
  '0 1 1 * *',
  $$ SELECT close_accounting_period(TO_CHAR(NOW() - INTERVAL '1 month', 'YYYY-MM')); $$
);
```

**Acciones:**
1. Calcula balances de cada cuenta del mes anterior
2. Guarda snapshot en `accounting_period_balances`
3. Cierra el período
4. Traslada resultado del ejercicio a patrimonio
5. Genera reportes mensuales

---

## 📈 REPORTES DISPONIBLES

### **1. Dashboard Ejecutivo**
```sql
SELECT * FROM accounting_dashboard;
```

```
┌─────────────────────────┬──────────┐
│ total_assets            │  $50,000 │
│ total_liabilities       │  $30,000 │
│ total_equity            │  $20,000 │
│ monthly_income          │   $5,000 │
│ monthly_expenses        │   $3,000 │
│ monthly_profit          │   $2,000 │
│ wallet_liability        │  $25,000 │
│ fgo_provision           │   $4,000 │
│ active_security_deposits│   $1,000 │
└─────────────────────────┴──────────┘
```

### **2. Balance General (Estado de Situación Financiera)**
```sql
SELECT * FROM accounting_balance_sheet ORDER BY code;
```

### **3. Estado de Resultados (P&L)**
```sql
SELECT * FROM accounting_income_statement
WHERE period = '2025-10'
ORDER BY code;
```

### **4. Conciliación Wallet vs Contabilidad**
```sql
SELECT * FROM accounting_wallet_reconciliation;
```

```
┌─────────────────────────────────┬──────────┐
│ Total en Billeteras (Sistema)   │ $25,000  │
│ Pasivo Contable (Depósitos)     │ $25,000  │
│ Diferencia (Debe ser 0)         │      $0  │ ✅
└─────────────────────────────────┴──────────┘
```

### **5. Reporte de Comisiones**
```sql
SELECT * FROM accounting_commissions_report
ORDER BY period DESC
LIMIT 12;
```

### **6. Libro Mayor (Ledger)**
```sql
SELECT 
  l.entry_date,
  l.transaction_type,
  a.code,
  a.name,
  l.debit_amount,
  l.credit_amount,
  l.description
FROM accounting_ledger l
JOIN accounting_accounts a ON a.id = l.account_id
WHERE l.entry_date >= '2025-10-01'
ORDER BY l.entry_date DESC;
```

---

## 🔍 VERIFICACIÓN DE INTEGRIDAD

```sql
SELECT * FROM verify_accounting_integrity();
```

```
┌──────────────────────┬────────┬──────────────────┐
│ test_name            │ passed │ details          │
├──────────────────────┼────────┼──────────────────┤
│ Asientos Balanceados │ ✅ true │ OK               │
│ Conciliación Wallet  │ ✅ true │ Diferencia: $0   │
│ Ecuación Contable    │ ✅ true │ Diferencia: $0   │
└──────────────────────┴────────┴──────────────────┘
```

**Tests Automáticos:**
1. ✅ Todos los asientos están balanceados (Debe = Haber)
2. ✅ Wallet sistema = Pasivo contable
3. ✅ Activo = Pasivo + Patrimonio

---

## 🚀 INSTALACIÓN

### **1. Ejecutar Migración**
```bash
cd /home/edu/autorenta
psql $DATABASE_URL -f supabase/migrations/20251026_accounting_automated_system.sql
```

### **2. Verificar Instalación**
```sql
-- Ver plan de cuentas
SELECT code, name, account_type FROM accounting_accounts ORDER BY code;

-- Ver cron jobs activos
SELECT * FROM cron.job WHERE jobname LIKE '%accounting%';

-- Ejecutar primer refresh manual
SELECT refresh_accounting_balances();
```

### **3. Integrar con Frontend**
```typescript
import { getAccountingService } from '@/core/services/accounting.service';

// En tu componente
const accountingService = getAccountingService(supabaseUrl, supabaseKey);

// Dashboard ejecutivo
const dashboard = await accountingService.getDashboard();
console.log('Profit este mes:', dashboard.monthly_profit);

// Balance general
const balanceSheet = await accountingService.getBalanceSheet();

// Estado de resultados
const incomeStatement = await accountingService.getIncomeStatement('2025-10');

// Verificar salud financiera
const health = await accountingService.checkFinancialHealth();
if (health.profitability === 'CRITICAL') {
  alert('¡Atención! Situación financiera crítica');
}
```

---

## 📊 EJEMPLO DE USO PRÁCTICO

### **Escenario: Usuario Alquila un Auto**

```
1. Usuario deposita $300 en billetera
   → TRIGGER automático crea asiento
   → Debe: MercadoPago $300
   → Haber: Depósitos Clientes $300

2. Usuario hace booking ($200 + $50 depósito)
   → TRIGGER automático bloquea depósito
   → Debe: Depósitos Clientes $50
   → Haber: Depósitos Garantía $50

3. Usuario completa alquiler (comisión 15%)
   → TRIGGER automático reconoce ingreso
   → Debe: Depósitos Clientes $200
   → Haber: Comisión Alquiler $30 (15%)
   → Haber: Por Pagar Propietario $170

4. Sin siniestros, liberar depósito
   → TRIGGER automático libera
   → Debe: Depósitos Garantía $50
   → Haber: Depósitos Clientes $50

RESULTADO FINAL:
- Ingreso reconocido: $30
- Usuario tiene $150 disponible ($300 - $200 + $50)
- Propietario por cobrar: $170
- Todo balanceado automáticamente ✅
```

---

## 🎯 BENEFICIOS CLAVE

| Beneficio | Impacto |
|---|---|
| **100% Automatizado** | Cero intervención manual en transacciones |
| **Cumplimiento NIIF** | Listo para auditorías internacionales |
| **Tiempo Real** | Balances actualizados cada 24h |
| **Trazabilidad Total** | Cada transacción genera asiento contable |
| **Conciliación Auto** | Wallet vs Contabilidad automática |
| **Cierre Mensual Auto** | El día 1 de cada mes sin intervención |
| **Provisiones NIIF 37** | FGO y depósitos correctamente provisionados |
| **Reportes Instantáneos** | Todos los reportes financieros en vistas |

---

## 🔐 SEGURIDAD

- ✅ **RLS (Row Level Security)** activado
- ✅ Solo ADMIN puede ver reportes financieros
- ✅ Solo service_role puede crear asientos manuales
- ✅ Triggers con `SECURITY DEFINER`
- ✅ Validación de partida doble en cada asiento

---

## 📞 SOPORTE Y MONITOREO

### **Verificar Salud del Sistema**
```sql
-- Dashboard rápido
SELECT * FROM accounting_dashboard;

-- Integridad
SELECT * FROM verify_accounting_integrity();

-- Últimos asientos
SELECT * FROM accounting_journal_entries
ORDER BY created_at DESC
LIMIT 10;

-- Conciliación wallet
SELECT * FROM accounting_wallet_reconciliation;
```

### **Alertas Automáticas**
El sistema genera alertas si:
- ❌ Wallet desbalanceado (diferencia > $0.01)
- ❌ FGO insuficiente (< 5% de depósitos activos)
- ❌ Pérdidas mensuales
- ❌ Margen < 5%

```typescript
const health = await accountingService.checkFinancialHealth();
console.log('Alerts:', health.alerts);
// ["FGO insuficiente: $3,500 (mínimo recomendado: $5,000)"]
```

---

## 🎓 CONCEPTOS NIIF APLICADOS

### **NIIF 15 - Reconocimiento de Ingresos**
✅ **AutoRenta como Agente**: Solo reconoce comisión, no el total del alquiler
✅ **Pasivo por Contrato**: Depósitos en billetera = pasivo hasta servicio prestado
✅ **Momento de Reconocimiento**: Al completar el servicio (booking COMPLETED)

### **NIIF 37 - Provisiones**
✅ **FGO**: Provisión para siniestros futuros
✅ **Depósitos Garantía**: Pasivo por obligación condicional
✅ **Estimación Razonable**: Basada en experiencia histórica

---

## 📅 ROADMAP FUTURO

- [ ] Integración con sistema tributario (DIAN/SUNAT)
- [ ] Generación automática de facturas electrónicas
- [ ] Reportes de flujo de caja proyectado
- [ ] Alertas por email en eventos críticos
- [ ] Dashboard web con gráficos interactivos
- [ ] Exportación a formatos contables estándar (XML, CSV)
- [ ] Integración con QuickBooks/Siigo

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [x] Plan de cuentas NIIF completo
- [x] Libro diario (journal) con partida doble
- [x] Libro mayor (ledger) detallado
- [x] Sistema de provisiones NIIF 37
- [x] Triggers para todas las transacciones
- [x] Vistas materializadas para reportes
- [x] Cron jobs diarios y mensuales
- [x] Función de cierre de período
- [x] Conciliación wallet automática
- [x] Verificación de integridad
- [x] Dashboard ejecutivo
- [x] RLS y seguridad
- [x] Servicio TypeScript para frontend
- [x] Documentación completa

---

## 🎉 CONCLUSIÓN

Este sistema contable es **completamente autónomo** y se ejecuta sin intervención humana. Cada transacción en AutoRenta genera automáticamente sus asientos contables, cumpliendo con NIIF 15 y 37. Los balances se actualizan diariamente y el cierre mensual es automático.

**¡Listo para producción!** 🚀

---

**Fecha de Creación**: 2025-10-26
**Versión**: 1.0
**Autor**: Sistema Automatizado AutoRenta
**Licencia**: Propietario

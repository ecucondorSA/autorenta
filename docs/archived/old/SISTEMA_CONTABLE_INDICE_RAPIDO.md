# 📊 ÍNDICE RÁPIDO - Sistema Contable AutoRenta

## 🚀 Inicio Rápido

### 1️⃣ Instalación en 1 Comando
```bash
cd /home/edu/autorenta
./scripts/install-accounting-system.sh
```

### 2️⃣ Verificación
```sql
-- Ver dashboard ejecutivo
SELECT * FROM accounting_dashboard;

-- Ver plan de cuentas
SELECT code, name, account_type, balance 
FROM accounting_balances 
ORDER BY code;

-- Verificar conciliación
SELECT * FROM accounting_wallet_reconciliation;
```

### 3️⃣ Integración Frontend
```typescript
import { AccountingService } from './core/services/accounting.service';

// En tu componente
const dashboard = await accountingService.getDashboard();
console.log('Utilidad del mes:', dashboard.monthly_profit);
```

---

## 📁 Estructura de Archivos

```
autorenta/
├── apps/web/database/accounting/
│   ├── 001-accounting-tables.sql          ⭐ Tablas base
│   ├── 002-accounting-seed-data.sql       ⭐ Plan de cuentas (26 cuentas)
│   ├── 003-accounting-automation-functions.sql  ⭐ Triggers automáticos
│   ├── 004-accounting-reports.sql         ⭐ 7 vistas de reportes
│   └── 005-accounting-cron-jobs.sql       ⭐ 5 jobs automáticos
│
├── apps/web/src/app/core/services/
│   └── accounting.service.ts              🔧 Servicio TypeScript
│
├── apps/web/src/app/features/admin/accounting-dashboard/
│   ├── accounting-dashboard.component.ts  📱 Componente Angular
│   ├── accounting-dashboard.component.html
│   └── accounting-dashboard.component.scss
│
├── scripts/
│   └── install-accounting-system.sh       🚀 Instalador automático
│
└── SISTEMA_CONTABLE_AUTOMATIZADO_COMPLETO.md  📖 Documentación completa
```

---

## 🎯 Flujos Automáticos Implementados

### ✅ Depósito en Billetera
```
Usuario deposita → Trigger automático ejecuta:
  DEBE:  MercadoPago $100
  HABER: Depósitos Clientes $100 (Pasivo NIIF 15)
```

### ✅ Creación de Reserva
```
Booking creado → Sistema automático registra:
  1. Bloqueo garantía (NIIF 37)
  2. Reconocimiento comisión 10% (NIIF 15 - Agente)
  3. Provisión FGO 3%
```

### ✅ Finalización de Reserva
```
Booking completado → Automáticamente:
  - Libera depósito de garantía
  - Devuelve fondos a billetera usuario
```

### ✅ Retiro de Billetera
```
Usuario retira → Contabiliza salida:
  DEBE:  Depósitos Clientes
  HABER: MercadoPago
```

---

## 📊 Reportes Disponibles (SQL Views)

| Vista | Descripción |
|-------|-------------|
| `accounting_dashboard` | KPIs ejecutivos (activos, pasivos, P&L) |
| `accounting_balance_sheet` | Balance General completo |
| `accounting_income_statement` | Estado de Resultados por período |
| `accounting_provisions_report` | Provisiones activas (FGO, garantías) |
| `accounting_cash_flow` | Flujo de caja detallado |
| `accounting_wallet_reconciliation` | Conciliación wallet vs contabilidad |
| `accounting_commissions_report` | Comisiones ganadas por período |

---

## ⏰ Tareas Automáticas (Cron)

| Tarea | Frecuencia | Función |
|-------|------------|---------|
| Refrescar Balances | Cada hora | Actualiza vista materializada |
| Cierre Mensual | Día 1, 2 AM | Transfiere resultado a patrimonio |
| Provisiones Vencidas | Diario, 3 AM | Libera provisiones > 90 días |
| Conciliación Wallet | Diario, 4 AM | Verifica consistencia, alerta si difiere |
| Backup Semanal | Domingos, 5 AM | Respalda transacciones semana |

---

## 🎨 Plan de Cuentas (26 Cuentas)

### ACTIVOS (1xxx)
- `1115` MercadoPago - Saldo Disponible ⭐
- `1120` Binance - Wallet USDT
- `1305` Comisiones por Cobrar

### PASIVOS (2xxx)
- `2805` Depósitos de Clientes - Billetera ⭐ (NIIF 15)
- `2810` Depósitos de Garantía Bloqueados ⭐ (NIIF 37)
- `2815` Pagos a Propietarios Pendientes
- `2905` Provisión FGO ⭐ (NIIF 37)

### INGRESOS (4xxx)
- `4135` Comisiones - Alquileres ⭐ (Único ingreso operativo)
- `4140` Comisiones - Seguros
- `4160` Liberación Garantía por Daños

### GASTOS (5xxx)
- `5105` Comisión MercadoPago
- `5205` Gastos por Siniestros - FGO ⭐
- `5210` Reembolsos

[Ver lista completa en SISTEMA_CONTABLE_AUTOMATIZADO_COMPLETO.md]

---

## 🔧 API TypeScript (Ejemplos)

### Dashboard Ejecutivo
```typescript
const dashboard = await accountingService.getDashboard();
console.log('Utilidad del mes:', dashboard.monthly_profit);
console.log('Saldo billetera:', dashboard.wallet_liability);
console.log('Provisión FGO:', dashboard.fgo_provision);
```

### Balance General
```typescript
const balance = await accountingService.getBalanceSheet();
const activos = balance.filter(a => a.account_type === 'ASSET');
const pasivos = balance.filter(a => a.account_type === 'LIABILITY');
```

### Estado de Resultados
```typescript
const pl = await accountingService.getIncomeStatement('2025-10');
const ingresos = pl.filter(i => i.account_type === 'INCOME');
const gastos = pl.filter(i => i.account_type === 'EXPENSE');
```

### Health Check
```typescript
const health = await accountingService.checkFinancialHealth();
if (!health.walletReconciled) {
  console.error('Diferencia en conciliación wallet!');
}
if (health.profitability === 'CRITICAL') {
  console.error('Pérdidas en el mes!');
}
```

### Conciliación Automática
```typescript
const reconciliation = await accountingService.getWalletReconciliation();
const diff = reconciliation.find(r => r.source.includes('Diferencia'));
if (Math.abs(diff.amount) > 0.01) {
  alert('Error en conciliación: $' + diff.amount);
}
```

---

## 🔐 Cumplimiento Normativo

### NIIF 15 - Reconocimiento de Ingresos ✅
- [x] Rol de Agente: Solo comisión 10% como ingreso
- [x] Pasivo por Contrato: Fondos billetera = Pasivo
- [x] Ingresos Diferidos: Reservas no completadas

### NIIF 37 - Provisiones ✅
- [x] Provisión FGO: 3% de cada alquiler
- [x] Depósitos de Garantía: Provisión hasta liberación
- [x] Estimación de Reclamos: Provisión para reclamos

### IAS 1 - Presentación de Estados Financieros ✅
- [x] Balance General estructurado
- [x] Estado de Resultados por período
- [x] Ecuación contable balanceada

---

## 🆘 Comandos Útiles

### Refrescar Balances Manualmente
```sql
SELECT refresh_accounting_balances();
```

### Ver Últimos 20 Asientos
```sql
SELECT * FROM accounting_journal_entries 
ORDER BY entry_date DESC 
LIMIT 20;
```

### Verificar Balance de Partida Doble
```sql
SELECT entry_number, total_debit, total_credit, is_balanced
FROM accounting_journal_entries
WHERE is_balanced = FALSE;
```

### Ver Provisiones Activas
```sql
SELECT provision_type, SUM(current_balance) AS total
FROM accounting_provisions
WHERE status = 'ACTIVE'
GROUP BY provision_type;
```

### Backup Manual
```bash
pg_dump -t accounting_ledger -t accounting_journal_entries > backup.sql
```

---

## 📞 Soporte y Modificación

### Agregar Nueva Cuenta Contable
```sql
INSERT INTO accounting_accounts (code, name, account_type, sub_type, is_system, description)
VALUES ('5999', 'Gastos Varios', 'EXPENSE', 'OTHER_EXPENSE', false, 'Gastos misceláneos');
```

### Modificar Comisión AutoRenta
Editar línea en `003-accounting-automation-functions.sql`:
```sql
v_commission := v_rental_amount * 0.10; -- Cambiar 0.10 a nuevo %
```

### Agregar Nuevo Trigger
```sql
CREATE OR REPLACE FUNCTION accounting_on_nueva_transaccion()
RETURNS TRIGGER AS $$
BEGIN
  -- Tu lógica aquí
  PERFORM create_journal_entry(...);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_accounting_nueva_transaccion
AFTER INSERT ON tu_tabla
FOR EACH ROW EXECUTE FUNCTION accounting_on_nueva_transaccion();
```

---

## ✅ Checklist de Implementación

- [x] **Tablas contables creadas** (accounts, ledger, provisions)
- [x] **Plan de cuentas cargado** (26 cuentas NIIF)
- [x] **Triggers automáticos** (wallet, bookings)
- [x] **Vistas de reportes** (7 vistas SQL)
- [x] **Cron jobs** (5 tareas programadas)
- [x] **Servicio TypeScript** (AccountingService completo)
- [x] **Componente Angular** (Dashboard visual)
- [x] **Script de instalación** (install-accounting-system.sh)
- [x] **Documentación completa** (este archivo + MD detallado)

---

## 🎉 Próximos Pasos

1. **Ejecutar instalación**: `./scripts/install-accounting-system.sh`
2. **Verificar en Supabase**: Ver tablas y vistas creadas
3. **Probar API**: Hacer llamadas desde frontend
4. **Integrar dashboard**: Agregar ruta en app
5. **Monitorear alertas**: Configurar notificaciones para conciliación
6. **Exportar reportes**: Agregar PDF/Excel exports
7. **Auditoría mensual**: Revisar cierre automático

---

## 📖 Documentación Completa

Ver `SISTEMA_CONTABLE_AUTOMATIZADO_COMPLETO.md` para:
- Explicación detallada de cada tabla
- Diagramas de flujo contable
- Ejemplos de asientos para cada transacción
- Guía de troubleshooting
- Mejores prácticas contables

---

**✨ Sistema Contable 100% Automatizado y Listo para Producción**

Fecha de creación: 2025-10-26
Versión: 1.0.0
Estándar: NIIF 15 + NIIF 37

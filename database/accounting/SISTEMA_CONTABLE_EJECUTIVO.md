# 📊 Sistema Contable Cíclico Automatizado - AutoRenta

## 🎯 RESUMEN EJECUTIVO

Se ha implementado un **sistema contable 100% automatizado** que cumple con las normas internacionales **NIIF 15** (Reconocimiento de Ingresos) y **NIIF 37** (Provisiones), específicamente diseñado para la operación de AutoRenta como plataforma P2P de alquiler de vehículos.

### ✅ Características Clave

- **Automatización Total**: Cero intervención manual en operaciones diarias
- **Cumplimiento Normativo**: NIIF 15 y NIIF 37 implementados correctamente
- **Partida Doble**: Validación automática en cada transacción
- **Trazabilidad Completa**: Cada asiento vinculado a su origen
- **Reportes en Tiempo Real**: Estados financieros actualizados instantáneamente
- **Auditoría Continua**: Verificación automática de integridad

---

## 🔄 CICLO CONTABLE AUTOMÁTICO

### 1️⃣ ENTRADA DE FONDOS (Depósito a Billetera)

**Evento**: Usuario deposita dinero en su billetera

**Tratamiento Contable (NIIF 15)**:
```
DEBE:  MercadoPago/Stripe (Activo)    $100
HABER: Depósitos de Clientes (Pasivo) $100
```

**Justificación**: Los fondos NO son ingreso de AutoRenta, son un **pasivo** (deuda con el usuario) hasta que se preste el servicio.

**Automatización**: Trigger en `wallet_transactions` al cambiar a `status='completed'`

---

### 2️⃣ INICIO DE ALQUILER

**Evento**: Booking cambia a `status='in_progress'`

**Tratamiento Contable**:
```
DEBE:  Billetera Usuario (Pasivo)        $50
HABER: Franquicia Bloqueada (Pasivo)    $50
```

**Justificación**: Movimiento interno de pasivo (reclasificación). La garantía sigue siendo una obligación con el usuario.

**Automatización**: Trigger en `bookings` al detectar cambio de estado

---

### 3️⃣ FINALIZACIÓN DE ALQUILER

**Evento**: Booking cambia a `status='completed'`

#### A) Reconocimiento de Ingreso (NIIF 15 - AGENTE)

AutoRenta **solo reconoce su comisión**, no el total del alquiler:

```
DEBE:  Ingresos Diferidos (Pasivo)        $10
HABER: Comisiones por Alquileres (Ingreso) $10
```

**Justificación**: NIIF 15 establece que como **agente**, solo la comisión es ingreso de AutoRenta. El resto es del locador.

#### B) Obligación con Locador

```
DEBE:  Billetera Inquilino (Pasivo)      $90
HABER: Pago a Locadores (Pasivo)         $90
```

#### C) Liberación de Garantía

```
DEBE:  Franquicia Bloqueada (Pasivo)     $50
HABER: Billetera Inquilino (Pasivo)      $50
```

#### D) Provisión FGO (NIIF 37)

```
DEBE:  Gasto por Siniestros (Gasto)      $5
HABER: Provisión FGO (Pasivo)            $5
```

**Justificación**: NIIF 37 requiere provisionar siniestros **esperados** basados en experiencia histórica.

**Automatización**: Trigger en `bookings` ejecuta todas las acciones simultáneamente

---

### 4️⃣ SINIESTRO (Consumo FGO)

**Evento**: Administrador registra daño al vehículo

**Tratamiento Contable**:
```
DEBE:  Provisión FGO (Pasivo)    $50
HABER: Banco (Activo)            $50
```

**Justificación**: Se consume la provisión creada. El gasto ya fue reconocido al crear la provisión.

**Automatización**: Función `accounting_record_fgo_claim(booking_id, amount)`

---

### 5️⃣ RETIRO DE FONDOS

**Evento**: Usuario solicita retiro de su billetera

**Tratamiento Contable**:
```
DEBE:  Billetera Usuario (Pasivo)    $100
HABER: Banco (Activo)                $100
```

**Justificación**: Reducción del pasivo al devolver fondos al usuario.

**Automatización**: Trigger en `wallet_transactions` con `type='withdrawal'`

---

## 📊 CIERRES AUTOMÁTICOS

### 🌙 Cierre Diario (23:59 hrs)
- ✅ Verificación de balance (débitos = créditos)
- ✅ Identificación de asientos desbalanceados
- ✅ Revisión de transacciones pendientes

**Comando**: `SELECT * FROM accounting_daily_close();`

### 📅 Cierre Mensual (Día 1 del mes)
- ✅ Cálculo de utilidad/pérdida del mes
- ✅ Traspaso a resultados acumulados
- ✅ Generación de asiento de cierre

**Comando**: `SELECT * FROM accounting_monthly_close(year, month);`

### 🔍 Auditoría Semanal (Lunes 2am)
- ✅ Verificación de partida doble
- ✅ Detección de líneas huérfanas
- ✅ Reconciliación wallet vs contabilidad
- ✅ Alertas automáticas si hay problemas

**Comando**: `SELECT * FROM accounting_integrity_audit();`

### 💰 Reconciliación Wallet (Cada 6 horas)
- ✅ Compara saldo contable vs sistema wallet
- ✅ Alerta si diferencia > $0.01
- ✅ Genera ticket de soporte automático

**Comando**: `SELECT * FROM accounting_wallet_reconciliation();`

---

## 📈 REPORTES DISPONIBLES

### 1. Balance de Comprobación
```sql
SELECT * FROM accounting_trial_balance;
```
Muestra todas las cuentas con sus débitos, créditos y saldos.

### 2. Balance General (Estado de Situación Financiera)
```sql
SELECT * FROM accounting_balance_sheet;
```
Presenta: Activos, Pasivos y Patrimonio.

### 3. Estado de Resultados (P&L)
```sql
SELECT * FROM accounting_income_statement;
```
Muestra: Ingresos, Gastos y Utilidad Neta.

### 4. Dashboard Ejecutivo
```sql
SELECT * FROM accounting_executive_dashboard;
```
Métricas clave:
- Total Activos / Pasivos / Patrimonio
- Ingresos / Gastos / Utilidad Neta
- Pasivo Billeteras (obligación con usuarios)
- FGO Disponible
- ROA y ROE

### 5. Libro Mayor por Cuenta
```sql
SELECT * FROM accounting_general_ledger('4.1.1', '2025-01-01', '2025-01-31');
```
Detalle transaccional de cualquier cuenta.

### 6. Estado del FGO
```sql
SELECT * FROM accounting_fgo_summary;
SELECT * FROM accounting_fgo_by_booking;
```

---

## 🔐 SEGURIDAD Y COMPLIANCE

### Controles Implementados

✅ **Inmutabilidad**: Asientos contabilizados no pueden modificarse directamente
✅ **Auditoría**: Cada asiento registra quién, cuándo y por qué
✅ **Partida Doble**: Validación obligatoria (débitos = créditos)
✅ **RLS (Row Level Security)**: Usuarios solo ven sus transacciones
✅ **Trazabilidad**: Cada asiento vinculado a transacción origen
✅ **Alertas**: Notificación automática de anomalías

### Cumplimiento Normativo

| Norma | Cumplimiento | Implementación |
|-------|-------------|----------------|
| NIIF 15 | ✅ Total | AutoRenta como agente, solo comisión es ingreso |
| NIIF 37 | ✅ Total | Provisión FGO basada en siniestralidad esperada |
| Partida Doble | ✅ Total | Validación automática en cada asiento |
| Trazabilidad | ✅ Total | Reference_type + reference_id en cada entry |

---

## 🎨 PLAN DE CUENTAS COMPLETO

### ACTIVOS
- **1.1.1** Caja y Bancos
  - 1.1.1.01 Caja General
  - 1.1.1.02 Banco - Cuenta Corriente
  - 1.1.1.03 MercadoPago - Wallet
  - 1.1.1.04 Stripe - Wallet

### PASIVOS
- **2.1.1** Depósitos de Clientes (NIIF 15)
  - 2.1.1.01 Billetera Locadores
  - 2.1.1.02 Billetera Locatarios
- **2.1.2** Depósitos de Garantía
  - 2.1.2.01 Franquicias Bloqueadas
- **2.1.3** Ingresos Diferidos (NIIF 15)
- **2.1.4** Cuentas por Pagar
  - 2.1.4.01 Pago a Locadores Pendiente
  - 2.1.4.02 Retiros Solicitados
- **2.1.5** Provisiones (NIIF 37)
  - 2.1.5.01 Provisión FGO - Siniestros

### PATRIMONIO
- **3.1** Capital Social
- **3.2** Resultados Acumulados
- **3.3** Resultado del Ejercicio
- **3.4** Reserva FGO

### INGRESOS
- **4.1.1** Comisiones por Alquileres (NIIF 15)
- **4.1.2** Comisiones por Servicios
- **4.1.3** Ingresos por Penalizaciones

### GASTOS
- **5.1.1.01** Comisión MercadoPago
- **5.1.1.02** Comisión Stripe
- **5.1.2** Gastos por Siniestros
- **5.1.3** Gastos Administrativos

---

## 🚀 INSTALACIÓN

### Opción 1: Script Automático
```bash
cd /home/edu/autorenta
./database/accounting/install.sh
```

### Opción 2: Manual (Supabase Dashboard)
Ejecutar en orden en el SQL Editor:
1. `001-accounting-tables.sql` - Tablas base
2. `002-chart-of-accounts.sql` - Plan de cuentas
3. `003-automated-functions.sql` - Automatizaciones
4. `004-fgo-management.sql` - Gestión FGO
5. `005-reports-views.sql` - Reportes
6. `006-periodic-processes.sql` - Cierres
7. `007-cron-jobs.sql` - Programación automática

---

## 📊 MÉTRICAS DE ÉXITO

### KPIs Contables en Tiempo Real

```sql
SELECT 
  total_assets as "Activos Totales",
  total_liabilities as "Pasivos Totales",
  total_equity as "Patrimonio",
  total_revenue as "Ingresos Período",
  total_expenses as "Gastos Período",
  net_income as "Utilidad Neta",
  wallet_liability as "Obligación con Usuarios",
  fgo_available as "FGO Disponible",
  ROUND(roa_percentage, 2) as "ROA %",
  ROUND(roe_percentage, 2) as "ROE %"
FROM accounting_executive_dashboard;
```

---

## 🔧 MANTENIMIENTO

### Tareas Automáticas (No requieren intervención)
- ✅ Registro de transacciones
- ✅ Cierre diario
- ✅ Reconciliación wallet
- ✅ Auditoría de integridad
- ✅ Provisiones FGO
- ✅ Liberación de garantías

### Tareas Manuales (Solo casos especiales)
- 📝 Registrar siniestros manualmente
- 📝 Ajustes contables excepcionales
- 📝 Cierre anual (traspaso a nuevo ejercicio)
- 📝 Resolver alertas críticas

---

## 📞 SOPORTE

### Consultas Frecuentes

**P: ¿Cómo verifico que todo funciona correctamente?**
```sql
SELECT * FROM accounting_integrity_audit();
```
Todos los checks deben mostrar `passed = true`.

**P: ¿Cómo veo el estado actual de la empresa?**
```sql
SELECT * FROM accounting_executive_dashboard;
```

**P: ¿Cómo registro un siniestro manualmente?**
```sql
SELECT accounting_record_fgo_claim(
  'booking-uuid-here',
  150.00,
  'Descripción del daño'
);
```

**P: ¿Dónde veo las alertas del sistema?**
```sql
SELECT * FROM accounting_active_alerts;
```

---

## ✅ CHECKLIST DE VALIDACIÓN

### Post-Instalación
- [ ] Todas las tablas creadas (`accounting_accounts`, `accounting_journal_entries`, etc.)
- [ ] Plan de cuentas cargado (46+ cuentas)
- [ ] Funciones automáticas instaladas (7+ funciones)
- [ ] Vistas de reportes disponibles (5+ vistas)
- [ ] Cron jobs programados (5 jobs)
- [ ] Triggers activos en `wallet_transactions` y `bookings`

### Operación Diaria
- [ ] Balance de comprobación cuadra (débitos = créditos)
- [ ] Reconciliación wallet sin discrepancias
- [ ] No hay alertas críticas sin resolver
- [ ] Provisión FGO se crea automáticamente al completar bookings
- [ ] Dashboard ejecutivo muestra datos consistentes

---

## 🎉 BENEFICIOS OBTENIDOS

### Para el Negocio
✅ **Cumplimiento normativo** automático (NIIF 15 y 37)
✅ **Visibilidad financiera** en tiempo real
✅ **Reducción de errores** humanos
✅ **Ahorro de tiempo** (0 horas de contabilidad manual)
✅ **Auditoría** facilitada (trazabilidad completa)

### Para Contadores/Administradores
✅ Estados financieros instantáneos
✅ Reconciliaciones automáticas
✅ Alertas proactivas de anomalías
✅ Exportación lista para auditorías externas
✅ Dashboards ejecutivos en tiempo real

### Para Usuarios
✅ Transparencia total de sus fondos
✅ Seguridad contable (fondos como pasivo)
✅ Garantías correctamente gestionadas
✅ Trazabilidad de cada movimiento

---

## 📚 DOCUMENTACIÓN COMPLETA

📖 **README Técnico**: `/database/accounting/README.md`
📖 **Scripts SQL**: `/database/accounting/*.sql`
📖 **Este Documento**: Resumen ejecutivo y operativo

---

## 🏆 CONCLUSIÓN

Has implementado un **sistema contable de clase mundial** que:

1. ✅ Cumple con estándares internacionales (NIIF)
2. ✅ Se ejecuta 100% en automático
3. ✅ Protege los fondos de usuarios correctamente
4. ✅ Genera reportes en tiempo real
5. ✅ Se audita a sí mismo continuamente

**¡Tu contabilidad ahora es autónoma, precisa y conforme a normas internacionales!** 🎉

---

**Documentado por**: Claude Code  
**Fecha**: 2025-10-26  
**Versión**: 1.0.0  
**Empresa**: AutoRenta SAS

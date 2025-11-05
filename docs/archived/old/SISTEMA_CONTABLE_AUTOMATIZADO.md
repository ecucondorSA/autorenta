# 🏦 Sistema Contable Automático - AutoRenta

## 🎯 ¿Qué es esto?

Un **sistema contable completamente automatizado** que cumple con normas internacionales **NIIF 15** y **NIIF 37**, diseñado específicamente para AutoRenta como plataforma P2P de alquiler de vehículos.

## ✅ ¿Qué hace?

### Automatización Completa
- ✅ Registra automáticamente cada depósito a billetera como **pasivo** (no como ingreso)
- ✅ Bloquea y libera garantías contablemente
- ✅ Reconoce ingreso **solo sobre la comisión** de AutoRenta (NIIF 15)
- ✅ Crea provisiones automáticas para el FGO (NIIF 37)
- ✅ Genera reportes financieros en tiempo real
- ✅ Ejecuta cierres diarios, semanales y mensuales automáticamente
- ✅ Audita su propia integridad continuamente

### Cumplimiento Normativo
- ✅ **NIIF 15**: AutoRenta actúa como agente, solo reconoce comisión
- ✅ **NIIF 37**: Provisiones para siniestros esperados
- ✅ **Partida doble**: Validación automática (débitos = créditos)
- ✅ **Trazabilidad**: Cada asiento vinculado a su transacción origen

## 📂 Ubicación

```
/home/edu/autorenta/database/accounting/
```

## 📖 Documentación

### 🚀 EMPIEZA AQUÍ:
- **[INDEX.md](./database/accounting/INDEX.md)** - Índice general con toda la info
- **[SISTEMA_CONTABLE_EJECUTIVO.md](./database/accounting/SISTEMA_CONTABLE_EJECUTIVO.md)** - Guía para ejecutivos y administradores
- **[README.md](./database/accounting/README.md)** - Guía técnica para desarrolladores
- **[DIAGRAMA_FLUJO.md](./database/accounting/DIAGRAMA_FLUJO.md)** - Diagrama visual del sistema

## 🚀 Instalación Rápida

### Paso 1: Ejecutar instalador
```bash
cd /home/edu/autorenta
./database/accounting/install.sh
```

### Paso 2: Validar instalación
```bash
psql -f database/accounting/TEST_VALIDATION.sql
```

### Paso 3: Verificar dashboard
```sql
SELECT * FROM accounting_executive_dashboard;
```

**¡Listo!** Tu sistema contable está funcionando automáticamente.

## 📊 Reportes Principales

```sql
-- Dashboard ejecutivo con todas las métricas
SELECT * FROM accounting_executive_dashboard;

-- Balance General (Activos, Pasivos, Patrimonio)
SELECT * FROM accounting_balance_sheet;

-- Estado de Resultados (Ingresos, Gastos, Utilidad)
SELECT * FROM accounting_income_statement;

-- Estado del Fondo de Garantía Operativa
SELECT * FROM accounting_fgo_summary;

-- Reconciliación Wallet vs Contabilidad
SELECT * FROM accounting_wallet_reconciliation();

-- Auditoría de Integridad
SELECT * FROM accounting_integrity_audit();
```

## 🔄 Flujo Automático

### 1️⃣ Depósito a Billetera
```
Usuario deposita $100
↓
Sistema registra automáticamente:
DEBE: MercadoPago (Activo) $100
HABER: Depósitos Clientes (Pasivo) $100
↓
✅ Fondos registrados como pasivo (deuda con usuario)
```

### 2️⃣ Inicio de Alquiler
```
Booking cambia a in_progress
↓
Sistema bloquea garantía:
DEBE: Billetera Usuario $50
HABER: Franquicia Bloqueada $50
↓
✅ Garantía bloqueada contablemente
```

### 3️⃣ Finalización de Alquiler
```
Booking cambia a completed
↓
Sistema ejecuta 4 asientos automáticos:

A) Reconoce ingreso (solo comisión):
   DEBE: Ing. Diferidos $10
   HABER: Comisiones $10

B) Obligación con locador:
   DEBE: Billetera Inquilino $90
   HABER: Pago a Locadores $90

C) Libera garantía:
   DEBE: Franquicia Bloqueada $50
   HABER: Billetera Inquilino $50

D) Crea provisión FGO:
   DEBE: Gasto Siniestros $5
   HABER: Provisión FGO $5
↓
✅ Alquiler completado contablemente
```

### 4️⃣ Siniestro
```
Admin registra daño $50
↓
Sistema consume provisión:
DEBE: Provisión FGO $50
HABER: Banco $50
↓
✅ Siniestro pagado del FGO
```

## 🎯 Principios Clave

### NIIF 15 - Ingresos
> AutoRenta actúa como **AGENTE**, no principal. Por tanto, solo reconoce su **comisión** como ingreso, no el total del alquiler.

**Ejemplo**: 
- Alquiler total: $100
- Comisión AutoRenta: $10 (10%)
- Pago a locador: $90

**Contabilización**:
- ✅ Ingreso de AutoRenta: $10 (la comisión)
- ❌ NO se registra: $100 como ingreso

### NIIF 37 - Provisiones
> El FGO es una **provisión** para siniestros esperados. Se estima basado en experiencia histórica y se consume cuando ocurren siniestros reales.

**Ejemplo**:
- Se provisiona 5% de cada alquiler
- Alquiler: $100 → Provisión: $5
- Si hay siniestro: se consume de la provisión
- Si no hay siniestro: se libera a reserva acumulada

### Partida Doble
> Cada asiento contable tiene **DÉBITOS = CRÉDITOS**. El sistema valida automáticamente.

**Ejemplo**:
```
DEBE: Caja $100
HABER: Depósitos Clientes $100
✅ Balance: $100 = $100
```

## 📈 Métricas en Tiempo Real

El sistema calcula automáticamente:

| Métrica | Descripción |
|---------|-------------|
| Total Activos | Efectivo + Cuentas por cobrar |
| Total Pasivos | Billeteras + Garantías + Provisiones |
| Total Patrimonio | Capital + Resultados acumulados |
| Ingresos | Comisiones devengadas |
| Gastos | Siniestros + Comisiones bancarias + Admin |
| Utilidad Neta | Ingresos - Gastos |
| Pasivo Billeteras | Obligación con usuarios |
| FGO Disponible | Provisión disponible para siniestros |
| ROA | Retorno sobre activos |
| ROE | Retorno sobre patrimonio |

## 🔧 Funciones Administrativas

### Registrar Siniestro Manual
```sql
SELECT accounting_record_fgo_claim(
  'uuid-del-booking',
  150.00,
  'Descripción del daño'
);
```

### Crear Asiento Manual
```sql
SELECT create_accounting_entry(
  p_description := 'Ajuste contable',
  p_entry_date := CURRENT_DATE,
  p_reference_type := 'manual',
  p_reference_id := NULL,
  p_lines := '[
    {"account_code": "1.1.1.02", "debit": 100, "description": "Cargo"},
    {"account_code": "4.1.1", "credit": 100, "description": "Abono"}
  ]'::jsonb,
  p_auto_post := TRUE
);
```

### Cierre Mensual Manual
```sql
SELECT * FROM accounting_monthly_close(2025, 1);  -- Enero 2025
```

## ⏰ Procesos Automáticos

| Proceso | Frecuencia | Función |
|---------|-----------|---------|
| Cierre Diario | 23:59 | `accounting_daily_close()` |
| Reconciliación Wallet | Cada 6 horas | `accounting_wallet_reconciliation()` |
| Auditoría Integridad | Lunes 2am | `accounting_integrity_audit()` |
| Cierre Mensual | Día 1 3am | `accounting_monthly_close()` |
| Expirar FGO | Mensual | `accounting_release_fgo_provision()` |

## 🔐 Seguridad

- ✅ Asientos contabilizados son **inmutables**
- ✅ Solo admins acceden a reportes completos
- ✅ Usuarios solo ven sus transacciones
- ✅ Validación automática de partida doble
- ✅ Auditoría continua de integridad
- ✅ Alertas automáticas de anomalías

## 📊 Plan de Cuentas

### Resumen (46 cuentas)
- **Activos**: Caja, Bancos, MercadoPago, Stripe
- **Pasivos**: Billeteras usuarios, Garantías, Ingresos diferidos, Provisión FGO
- **Patrimonio**: Capital, Resultados, Reserva FGO
- **Ingresos**: Comisiones alquileres, Servicios, Penalizaciones
- **Gastos**: Comisiones bancarias, Siniestros, Admin, Marketing

Ver detalle en [SISTEMA_CONTABLE_EJECUTIVO.md](./database/accounting/SISTEMA_CONTABLE_EJECUTIVO.md)

## ✅ Validación

```sql
-- Verificar que todo funciona
SELECT * FROM accounting_integrity_audit();

-- Todos los checks deben mostrar: passed = TRUE
```

## 🆘 Soporte

### Si algo no funciona:

1. **Revisar instalación**:
   ```sql
   SELECT 'Tablas' as tipo, COUNT(*)::text FROM information_schema.tables 
   WHERE table_name LIKE 'accounting%';
   ```

2. **Ver alertas**:
   ```sql
   SELECT * FROM accounting_active_alerts;
   ```

3. **Ejecutar auditoría**:
   ```sql
   SELECT * FROM accounting_integrity_audit();
   ```

4. **Consultar documentación**: Ver [INDEX.md](./database/accounting/INDEX.md)

## 🎉 Beneficios

### Para el Negocio
- ✅ Cumplimiento normativo automático
- ✅ Cero errores contables
- ✅ Reportes instantáneos
- ✅ Auditoría facilitada

### Para Contadores
- ✅ Estados financieros en tiempo real
- ✅ Reconciliaciones automáticas
- ✅ Alertas proactivas
- ✅ Exportación lista para auditorías

### Para Usuarios
- ✅ Transparencia total
- ✅ Fondos protegidos correctamente
- ✅ Garantías bien gestionadas

## 📚 Archivos del Sistema

```
database/accounting/
├── 001-accounting-tables.sql          (Tablas base)
├── 002-chart-of-accounts.sql          (46 cuentas)
├── 003-automated-functions.sql        (Automatización)
├── 004-fgo-management.sql             (FGO NIIF 37)
├── 005-reports-views.sql              (Reportes)
├── 006-periodic-processes.sql         (Cierres)
├── 007-cron-jobs.sql                  (Programación)
├── TEST_VALIDATION.sql                (Pruebas)
├── install.sh                         (Instalador)
├── INDEX.md                           (Índice general)
├── SISTEMA_CONTABLE_EJECUTIVO.md      (Guía ejecutiva)
├── README.md                          (Guía técnica)
└── DIAGRAMA_FLUJO.md                  (Diagrama visual)
```

## 🏆 Conclusión

Has implementado un **sistema contable de clase mundial** que:

1. ✅ Se ejecuta 100% en automático
2. ✅ Cumple con NIIF 15 y NIIF 37
3. ✅ Protege fondos de usuarios
4. ✅ Genera reportes en tiempo real
5. ✅ Se audita continuamente

**¡Tu contabilidad ahora es autónoma, precisa y conforme a estándares internacionales!** 🎉

---

**📖 Documentación Completa**: Ver [database/accounting/INDEX.md](./database/accounting/INDEX.md)

**🚀 Instalación**: `./database/accounting/install.sh`

**✅ Validación**: `psql -f database/accounting/TEST_VALIDATION.sql`

---

**Versión**: 1.0.0 | **Fecha**: 2025-10-26 | **Empresa**: AutoRenta SAS

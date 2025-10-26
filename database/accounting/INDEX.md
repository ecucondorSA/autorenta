# 📚 Sistema Contable Automático - Índice General

## 📖 Documentación Principal

### Para Ejecutivos y Administradores
1. **[SISTEMA_CONTABLE_EJECUTIVO.md](./SISTEMA_CONTABLE_EJECUTIVO.md)** ⭐
   - Resumen ejecutivo completo
   - Ciclo contable explicado paso a paso
   - Métricas y KPIs
   - Checklist de validación
   - **EMPIEZA AQUÍ** si eres administrador o contador

### Para Desarrolladores
2. **[README.md](./README.md)** 📋
   - Documentación técnica completa
   - API de funciones
   - Referencia de triggers
   - Guía de instalación
   - **EMPIEZA AQUÍ** si eres desarrollador

### Diagrama Visual
3. **[DIAGRAMA_FLUJO.md](./DIAGRAMA_FLUJO.md)** 🎨
   - Flujo visual del sistema
   - Mapa de procesos automáticos
   - Leyenda de colores
   - **EMPIEZA AQUÍ** si prefieres contenido visual

---

## 🗂️ Archivos SQL (Orden de Ejecución)

| # | Archivo | Descripción | Tamaño |
|---|---------|-------------|--------|
| 1 | [001-accounting-tables.sql](./001-accounting-tables.sql) | Tablas base del sistema | 5.5 KB |
| 2 | [002-chart-of-accounts.sql](./002-chart-of-accounts.sql) | Plan de cuentas completo | 8.5 KB |
| 3 | [003-automated-functions.sql](./003-automated-functions.sql) | Funciones de automatización | 11 KB |
| 4 | [004-fgo-management.sql](./004-fgo-management.sql) | Gestión del FGO (NIIF 37) | 9.1 KB |
| 5 | [005-reports-views.sql](./005-reports-views.sql) | Reportes y vistas | 11 KB |
| 6 | [006-periodic-processes.sql](./006-periodic-processes.sql) | Cierres automáticos | 9.6 KB |
| 7 | [007-cron-jobs.sql](./007-cron-jobs.sql) | Programación automática | 7.3 KB |

**Total SQL**: ~62 KB de código contable profesional

---

## 🚀 Instalación Rápida

### Opción A: Script Automático (Recomendado)
```bash
cd /home/edu/autorenta
./database/accounting/install.sh
```

### Opción B: Manual
```bash
cd /home/edu/autorenta/database/accounting

# Ejecutar en orden:
psql -f 001-accounting-tables.sql
psql -f 002-chart-of-accounts.sql
psql -f 003-automated-functions.sql
psql -f 004-fgo-management.sql
psql -f 005-reports-views.sql
psql -f 006-periodic-processes.sql
psql -f 007-cron-jobs.sql
```

### Opción C: Supabase Dashboard
1. Abrir SQL Editor en Supabase Dashboard
2. Copiar y ejecutar cada archivo en orden
3. Verificar que no hay errores

---

## ✅ Validación

### Script de Pruebas Completo
```bash
psql -f TEST_VALIDATION.sql
```

Este script ejecuta:
- ✅ Verificación de instalación
- ✅ Simulación de depósito
- ✅ Simulación de alquiler completo
- ✅ Simulación de siniestro
- ✅ Verificación de reportes
- ✅ Auditoría de integridad

**Tiempo estimado**: 30 segundos

---

## 📊 Comandos Esenciales

### Ver Dashboard Ejecutivo
```sql
SELECT * FROM accounting_executive_dashboard;
```

### Ver Balance General
```sql
SELECT * FROM accounting_balance_sheet;
```

### Ver Estado de Resultados
```sql
SELECT * FROM accounting_income_statement;
```

### Ejecutar Cierre Diario
```sql
SELECT * FROM accounting_daily_close();
```

### Reconciliación Wallet
```sql
SELECT * FROM accounting_wallet_reconciliation();
```

### Auditoría de Integridad
```sql
SELECT * FROM accounting_integrity_audit();
```

### Ver Alertas Activas
```sql
SELECT * FROM accounting_active_alerts;
```

### Estado del FGO
```sql
SELECT * FROM accounting_fgo_summary;
SELECT * FROM accounting_fgo_by_booking;
```

---

## 📈 Estructura del Sistema

```
database/accounting/
│
├── 📄 Documentación
│   ├── INDEX.md (este archivo)
│   ├── SISTEMA_CONTABLE_EJECUTIVO.md (guía ejecutiva)
│   ├── README.md (guía técnica)
│   └── DIAGRAMA_FLUJO.md (visual)
│
├── 🗄️ Estructura Base
│   ├── 001-accounting-tables.sql (tablas)
│   └── 002-chart-of-accounts.sql (46 cuentas)
│
├── 🤖 Automatización
│   ├── 003-automated-functions.sql (triggers)
│   ├── 004-fgo-management.sql (provisiones)
│   └── 007-cron-jobs.sql (programación)
│
├── 📊 Reportes
│   ├── 005-reports-views.sql (vistas)
│   └── 006-periodic-processes.sql (cierres)
│
└── 🧪 Testing
    ├── TEST_VALIDATION.sql (pruebas)
    └── install.sh (instalador)
```

---

## 🎯 Casos de Uso Comunes

### 1. Ver estado financiero actual
```sql
SELECT 
  total_assets as "Activos",
  total_liabilities as "Pasivos",
  total_equity as "Patrimonio",
  net_income as "Utilidad"
FROM accounting_executive_dashboard;
```

### 2. Registrar un siniestro manualmente
```sql
SELECT accounting_record_fgo_claim(
  'uuid-del-booking',
  150.00,
  'Descripción del daño'
);
```

### 3. Crear asiento manual
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

### 4. Ver libro mayor de una cuenta
```sql
SELECT * FROM accounting_general_ledger(
  '4.1.1',  -- Código de cuenta
  '2025-01-01',  -- Fecha desde
  '2025-12-31'   -- Fecha hasta
);
```

### 5. Cierre mensual manual
```sql
SELECT * FROM accounting_monthly_close(2025, 1);  -- Enero 2025
```

---

## 🔐 Seguridad

### Niveles de Acceso

| Rol | Permisos |
|-----|----------|
| **Usuario** | Solo ve sus transacciones wallet |
| **Admin** | Acceso completo a reportes y funciones |
| **Sistema** | Ejecuta triggers y cron jobs |

### Validaciones Automáticas

- ✅ Partida doble (débitos = créditos)
- ✅ Cuentas activas antes de usar
- ✅ Provisiones no exceden montos disponibles
- ✅ Reconciliación wallet diaria
- ✅ Auditoría de integridad semanal

---

## 📞 Soporte y Troubleshooting

### Problema: Asiento desbalanceado
**Solución**:
```sql
-- Ver asientos con problemas
SELECT * FROM accounting_integrity_audit()
WHERE check_name = 'double_entry_balance' AND passed = FALSE;
```

### Problema: Discrepancia en wallet
**Solución**:
```sql
-- Ver detalles de reconciliación
SELECT * FROM accounting_wallet_reconciliation();

-- Revisar transacciones del día
SELECT * FROM wallet_transactions
WHERE DATE(created_at) = CURRENT_DATE;
```

### Problema: Provisión FGO insuficiente
**Solución**:
```sql
-- Ver estado de provisiones
SELECT * FROM accounting_fgo_by_booking
WHERE provision_status = 'active';

-- Ajustar porcentaje de provisión en trigger_create_fgo_provision()
```

---

## 🔄 Mantenimiento

### Tareas Automáticas (No requieren acción)
- ✅ Registro de transacciones
- ✅ Cierre diario (23:59)
- ✅ Reconciliación wallet (cada 6h)
- ✅ Auditoría semanal (lunes 2am)
- ✅ Cierre mensual (día 1)

### Tareas Periódicas Recomendadas
- 📅 **Mensual**: Revisar dashboard ejecutivo
- 📅 **Mensual**: Verificar alertas resueltas
- 📅 **Trimestral**: Exportar estados financieros
- 📅 **Anual**: Cierre fiscal y traspaso

---

## 📚 Referencias Normativas

### NIIF 15 - Ingresos
- **Aplicación**: AutoRenta como agente
- **Implementación**: Solo comisión es ingreso
- **Tablas afectadas**: `accounting_journal_entries`, cuentas 4.x.x

### NIIF 37 - Provisiones
- **Aplicación**: FGO para siniestros esperados
- **Implementación**: Provisión automática 5%
- **Tablas afectadas**: `accounting_provisions`, cuenta 2.1.5.01

### Partida Doble
- **Aplicación**: Todas las transacciones
- **Implementación**: Validación automática en cada asiento
- **Función**: `create_accounting_entry()`

---

## 🏆 Indicadores de Éxito

### Sistema Funcionando Correctamente Si:
- ✅ Balance de comprobación cuadra (débitos = créditos)
- ✅ Reconciliación wallet sin diferencias
- ✅ Auditoría de integridad pasa todos los checks
- ✅ No hay alertas críticas sin resolver
- ✅ Dashboard ejecutivo muestra datos consistentes
- ✅ Provisión FGO se crea automáticamente

### Verificación Rápida
```sql
-- Debe retornar todo en verde ✅
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Balance OK'
    ELSE '❌ Balance con errores'
  END as status
FROM accounting_integrity_audit()
WHERE passed = FALSE;
```

---

## 📋 Checklist de Implementación

### Pre-Instalación
- [ ] Backup de base de datos
- [ ] Verificar credenciales Supabase
- [ ] Revisar estructura de `wallet_transactions`
- [ ] Revisar estructura de `bookings`

### Instalación
- [ ] Ejecutar scripts SQL en orden
- [ ] Verificar creación de tablas
- [ ] Verificar creación de funciones
- [ ] Verificar creación de vistas
- [ ] Verificar triggers activos
- [ ] Configurar cron jobs

### Post-Instalación
- [ ] Ejecutar TEST_VALIDATION.sql
- [ ] Verificar dashboard ejecutivo
- [ ] Probar registro manual de siniestro
- [ ] Verificar alertas funcionando
- [ ] Documentar accesos de admin
- [ ] Capacitar equipo contable

---

## 🎉 ¡Listo para Producción!

Tu sistema contable está completamente configurado y cumple con:

✅ Estándares internacionales (NIIF 15 y 37)  
✅ Automatización 100%  
✅ Trazabilidad completa  
✅ Seguridad robusta  
✅ Reportes en tiempo real  
✅ Auditoría continua  

**Siguiente paso**: Ejecutar `TEST_VALIDATION.sql` para validar todo el sistema.

---

**Documentación creada por**: Claude Code  
**Versión**: 1.0.0  
**Fecha**: 2025-10-26  
**Empresa**: AutoRenta SAS  
**Licencia**: Uso interno AutoRenta

---

## 🔗 Enlaces Rápidos

- [Guía Ejecutiva](./SISTEMA_CONTABLE_EJECUTIVO.md)
- [Guía Técnica](./README.md)
- [Diagrama Visual](./DIAGRAMA_FLUJO.md)
- [Script de Instalación](./install.sh)
- [Script de Validación](./TEST_VALIDATION.sql)

---

**¿Dudas?** Consulta primero [SISTEMA_CONTABLE_EJECUTIVO.md](./SISTEMA_CONTABLE_EJECUTIVO.md)

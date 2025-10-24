# 🏦 Sistema de Fondo de Garantía Operativa (FGO) - AutoRenta

> Sistema contable completo para gestión de reservas, siniestros y capitalización

---

## 📊 Estado de Implementación

| Componente | Estado | Progreso |
|------------|--------|----------|
| **Backend (SQL)** | ✅ Completado | 100% |
| **Documentación** | ✅ Completado | 100% |
| **Pruebas** | ✅ Exitosas | 100% |
| **Frontend** | ⏳ Pendiente | 0% |

**Progreso Total**: 75% (Backend + Docs completado, Frontend pendiente)

---

## 🎯 ¿Qué es el FGO?

El **Fondo de Garantía Operativa (FGO)** es un sistema contable que:

- 💰 **Reserva automáticamente** el 15% (α) de cada depósito de usuario
- 🛡️ **Cubre siniestros** (daños a vehículos, franquicias, emergencias)
- 📈 **Capitaliza** para compra de autos e inversiones
- 📊 **Calcula métricas** financieras automáticas (RC, LR)
- 🔍 **Garantiza transparencia** con auditoría en tiempo real

---

## 📂 Documentación Disponible

### 📖 Para Desarrolladores

| Documento | Ubicación | Descripción |
|-----------|-----------|-------------|
| **Documentación Técnica** | [`/docs/FGO_SISTEMA_CONTABLE.md`](/docs/FGO_SISTEMA_CONTABLE.md) | Arquitectura, API, consultas SQL |
| **Resultados de Pruebas** | [`/docs/FGO_TEST_RESULTS.md`](/docs/FGO_TEST_RESULTS.md) | Validación del sistema |
| **Resumen Ejecutivo** | [`/docs/FGO_IMPLEMENTATION_SUMMARY.md`](/docs/FGO_IMPLEMENTATION_SUMMARY.md) | Estado y próximos pasos |
| **Migración SQL** | [`/supabase/migrations/20251022_create_fgo_system.sql`](/supabase/migrations/20251022_create_fgo_system.sql) | Script completo de BD |

### 📋 Para Administración

| Documento | Ubicación | Descripción |
|-----------|-----------|-------------|
| **Política FGO v1.0** | [`/docs/POLITICA_FGO_AUTORENTAR_V1.0.md`](/docs/POLITICA_FGO_AUTORENTAR_V1.0.md) | Política formal y procedimientos |
| **Calculadora de Métricas** | [`/docs/FGO_METRICS_CALCULATOR.md`](/docs/FGO_METRICS_CALCULATOR.md) | Guía para Excel/Google Sheets |
| **Template CSV** | [`/docs/FGO_LEDGER_TEMPLATE.csv`](/docs/FGO_LEDGER_TEMPLATE.csv) | Plantilla para importar |

---

## 🚀 Inicio Rápido

### Ver Estado del FGO

```sql
SELECT * FROM v_fgo_status;
```

**Resultado**:
```
Total FGO:      USD 47.50
Liquidez:       USD 47.50
Capitalización: USD 0.00
Rentabilidad:   USD 0.00
Alpha (α):      15%
Loss Ratio:     62.75%
Estado:         🔴 Crítico
```

### Consultar Movimientos Recientes

```sql
SELECT
  ts,
  movement_type,
  subfund_type,
  amount_cents / 100.0 AS amount_usd,
  operation
FROM v_fgo_movements_detailed
LIMIT 10;
```

### Recalcular Métricas

```sql
SELECT calculate_fgo_metrics();
```

---

## 📊 Estructura del Sistema

### Tablas Principales

```
fgo_subfunds
├── liquidity          (Liquidez - efectivo disponible)
├── capitalization     (Capitalización - inversiones)
└── profitability      (Rentabilidad - intereses)

fgo_movements
├── user_contribution  (Aportes de usuarios)
├── siniestro_payment  (Pagos de siniestros)
├── franchise_payment  (Pagos de franquicias)
├── capitalization     (Transferencias a inversión)
├── return_to_user     (Devoluciones)
├── interest_earned    (Intereses)
└── adjustment         (Ajustes manuales)

fgo_metrics
├── alpha_percentage         (α actual - default 15%)
├── coverage_ratio (RC)      (Cobertura del fondo)
├── loss_ratio (LR)          (Siniestralidad)
└── status                   (healthy/warning/critical)
```

### Funciones RPC

| Función | Descripción | Parámetros |
|---------|-------------|------------|
| `calculate_fgo_metrics()` | Recalcula RC, LR y estado | - |
| `fgo_contribute_from_deposit()` | Registra aporte desde depósito | user_id, amount, ledger_id |
| `fgo_pay_siniestro()` | Paga siniestro desde Liquidez | booking_id, amount, description |
| `fgo_transfer_between_subfunds()` | Transfiere entre subfondos | from, to, amount, reason, admin_id |

### Vistas SQL

| Vista | Descripción |
|-------|-------------|
| `v_fgo_status` | Estado completo del FGO |
| `v_fgo_movements_detailed` | Movimientos con joins (usuarios, bookings) |
| `v_fgo_monthly_summary` | Resumen mensual agregado |

---

## 📈 Métricas del Sistema

### Ratio de Cobertura (RC)

**Fórmula**:
```
RC = Saldo Total FGO / Meta de Cobertura
Meta = Promedio de Siniestros Mensual × 12
```

**Interpretación**:
- ✅ RC ≥ 1.0: **Healthy** (saludable)
- ⚠️ 0.7 ≤ RC < 1.0: **Warning** (advertencia)
- 🔴 RC < 0.7: **Critical** (crítico)

### Loss Ratio (LR)

**Fórmula**:
```
LR = Total Siniestros Pagados / Total Aportes Recibidos
```

**Interpretación**:
- LR < 10%: Excelente
- 10% ≤ LR < 30%: Aceptable
- LR ≥ 30%: Alto (revisar procesos)

---

## 🧪 Resultados de Pruebas

### Escenario de Prueba

**Aportes de 3 usuarios**:
- Usuario 1: USD 100 → Aporte USD 15 (15%)
- Usuario 2: USD 250 → Aporte USD 37.50 (15%)
- Usuario 3: USD 500 → Aporte USD 75 (15%)
- **Total aportes**: USD 127.50

**Pago de 1 siniestro**:
- Reparación parachoques: USD 80

### Resultados

| Métrica | Valor | Estado |
|---------|-------|--------|
| **Saldo Total FGO** | USD 47.50 | ✅ Correcto |
| **Total Aportes** | USD 127.50 | ✅ Correcto |
| **Total Siniestros** | USD 80.00 | ✅ Correcto |
| **Loss Ratio** | 62.75% | ⚠️ Alto |
| **Coverage Ratio** | 4.95% | 🔴 Crítico |
| **Estado** | Critical | ✅ Detección correcta |

**Conclusión**: ✅ Sistema funcionando correctamente

---

## 🛠️ Próximos Pasos: Frontend

### 1. Servicio Angular (4-6h)

**Archivo**: `apps/web/src/app/core/services/fgo.service.ts`

```typescript
export class FgoService {
  getStatus(): Observable<FgoStatus>;
  getMovements(limit?, offset?): Observable<FgoMovement[]>;
  paySiniestro(bookingId, amount, description): Observable<any>;
  transferBetweenSubfunds(from, to, amount, reason): Observable<any>;
}
```

### 2. Modelos TypeScript (2h)

**Archivo**: `apps/web/src/app/core/models/fgo.model.ts`

Interfaces: `FgoStatus`, `FgoMovement`, `FgoMetrics`, `SubfundBalance`

### 3. Dashboard Admin (12-16h)

**Ruta**: `/admin/fgo`

**Componentes**:
- `FgoOverviewComponent` - Vista general
- `FgoSubfundsCardComponent` - Tarjetas de subfondos
- `FgoMovementsTableComponent` - Tabla de movimientos
- `FgoMetricsChartComponent` - Gráficos de RC y LR
- `FgoActionsComponent` - Acciones de admin

**Estimación Total**: 5-7 días hábiles

---

## 📋 Checklist de Deployment

### Pre-Deployment ✅
- [x] Migración SQL creada y probada
- [x] Funciones RPC validadas
- [x] Vistas creadas
- [x] Políticas RLS aplicadas
- [x] Documentación completa
- [x] Pruebas de integración exitosas

### Deployment ⏳
- [ ] Backup de base de datos
- [ ] Ejecutar migración en producción
- [ ] Verificar integridad de datos
- [ ] Smoke tests
- [ ] Monitoreo 24h

### Post-Deployment ⏳
- [ ] Comunicar α% a usuarios
- [ ] Publicar política FGO en web
- [ ] Dashboard público del FGO
- [ ] Capacitación a equipo
- [ ] Primera auditoría (30 días)

---

## 🔐 Seguridad (RLS)

**Políticas Implementadas**:

- ✅ Solo **admins** pueden ver subfondos
- ✅ Solo **admins** pueden ver movimientos del FGO
- ✅ Solo **admins** pueden ver métricas
- ✅ Solo **service_role** puede ejecutar operaciones de escritura
- ✅ Usuarios normales solo ven estado agregado (público)

---

## 📞 Soporte

Para preguntas sobre el sistema FGO:

- **Documentación Técnica**: `/docs/FGO_SISTEMA_CONTABLE.md`
- **Política Formal**: `/docs/POLITICA_FGO_AUTORENTAR_V1.0.md`
- **Issues**: [GitHub Issues](https://github.com/autorenta/autorenta/issues)

---

## 📝 Notas Importantes

### Para Inversores

✅ Sistema contable **auditable** con métricas objetivas (RC, LR)
✅ Trazabilidad **completa** de todos los movimientos
✅ Segregación **clara** en subfondos especializados

### Para Aseguradoras

✅ Métricas de riesgo **calculadas automáticamente**
✅ Historial de siniestros **rastreable**
✅ Capacidad de cobertura **transparente**

### Para Contadores

✅ Plan contable **claro** con doble partida
✅ Balances **actualizados en tiempo real**
✅ Reportes mensuales **exportables**

---

## ✅ Estado del Proyecto

**Última actualización**: 23 de octubre de 2025
**Versión**: 1.0
**Estado**: ✅ Backend Operativo | ⏳ Frontend Pendiente

---

**Desarrollado por**: Equipo AutoRenta
**Licencia**: Privado - AutoRenta S.A.S.

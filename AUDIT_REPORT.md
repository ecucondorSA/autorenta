# 📊 REPORTE DE AUDITORÍA DE BASE DE DATOS
**Fecha:** 15 de noviembre de 2025  
**Base de datos:** Supabase Production (pisqjmoklivzpwufhscx)

---

## ✅ RESUMEN EJECUTIVO

| Métrica | Valor | Estado |
|---------|-------|--------|
| **Total de tablas** | 78 | ✅ |
| **Tablas con RLS** | 75 (96.2%) | ✅ |
| **Tablas sin RLS** | 3 (3.8%) | ⚠️ |
| **Columna `onboarding` en profiles** | **NO EXISTE** | ❌ CRÍTICO |

---

## ❌ PROBLEMAS CRÍTICOS

### 1. Columna `onboarding` faltante en tabla `profiles`

**Impacto:** ALTO - Bloquea flujo de onboarding de usuarios

**Columnas actuales en `profiles` (31 columnas):**
- ✅ `id`, `full_name`, `avatar_url`, `role`, `is_admin`
- ✅ `phone`, `email_verified`, `phone_verified`, `id_verified`
- ✅ `created_at`, `updated_at`
- ✅ `mp_onboarding_completed`, `mercadopago_collector_id`, `mp_onboarding_url`
- ✅ `rating_avg`, `rating_count`
- ✅ `home_latitude`, `home_longitude`, `location_verified_at`
- ✅ `preferred_search_radius_km`
- ✅ Campos encriptados: `phone_encrypted`, `whatsapp_encrypted`, `gov_id_number_encrypted`, `dni_encrypted`, `driver_license_number_encrypted`, `address_line1_encrypted`, `address_line2_encrypted`, `postal_code_encrypted`
- ✅ `email`, `date_of_birth`, `primary_goal`
- ❌ **`onboarding` - FALTA**

**Solución:**
```bash
./apply-onboarding-migration.sh
# O ejecutar SQL manualmente en Dashboard
```

---

## ⚠️ SEGURIDAD: Tablas sin RLS

### Tablas que NO tienen Row Level Security habilitado:

1. **`cron_execution_log`** - ⚠️ Logs de cron jobs
   - Justificación: Tabla interna, solo acceso service_role
   
2. **`onboarding_plan_templates`** - ⚠️ Templates de onboarding
   - Recomendación: Habilitar RLS si contiene datos sensibles
   
3. **`outbound_requests`** - ⚠️ Logs de requests salientes
   - Justificación: Tabla de auditoría interna

**Recomendación:** Revisar si estas tablas necesitan RLS según modelo de seguridad.

---

## ✅ CONVERSION_EVENTS: Políticas RLS Correctas

La tabla `conversion_events` tiene **4 políticas RLS** configuradas correctamente:

1. ✅ **"Authenticated users can insert their events"**
   - Rol: `authenticated`
   - Operación: `INSERT`
   
2. ✅ **"Service role can insert all events"**
   - Rol: `service_role`
   - Operación: `INSERT`
   
3. ✅ **"Service role can view all events"**
   - Rol: `service_role`
   - Operación: `SELECT`
   
4. ✅ **"Users can view their own events"**
   - Rol: `authenticated`
   - Operación: `SELECT`

---

## 📈 ESTADÍSTICAS GENERALES

### Distribución de tablas (primeras 50):

**Con RLS habilitado (47):**
- accounting_accounts, accounting_audit_log, accounting_chart_of_accounts
- accounting_ledger, accounting_period_balances, accounting_period_closures
- accounting_provisions, accounting_revenue_recognition
- bank_accounts, booking_claims, booking_location_tracking
- booking_risk_snapshot, booking_waitlist, **bookings**
- calendar_sync_log, car_brands, car_google_calendars
- car_models, car_photos, **cars**
- **conversion_events** ✅, driver_class_history, driver_protection_addons
- driver_risk_profile, driver_score_snapshots, driver_telemetry
- encryption_audit_log, encryption_keys
- exchange_rate_sync_log, exchange_rates
- fgo_metrics, fgo_parameters, fgo_subfunds, fx_rates
- google_calendar_tokens, messages
- monitoring_alerts, monitoring_performance_metrics
- mp_webhook_logs, notifications
- payment_intents, payment_issues, payment_splits, payments
- platform_config, pricing_calculations, pricing_class_factors
- *(y 28 más...)*

**Sin RLS (3):**
- ❌ cron_execution_log
- ❌ onboarding_plan_templates  
- ❌ outbound_requests

---

## 🎯 ACCIONES REQUERIDAS

### Prioridad ALTA

- [ ] **Aplicar migración de columna `onboarding`**
  - Archivo: `supabase/migrations/20251115071500_add_onboarding_to_profiles.sql`
  - Método: Dashboard SQL Editor o `./apply-onboarding-migration.sh`
  
### Prioridad MEDIA

- [ ] Revisar si `onboarding_plan_templates` necesita RLS
- [ ] Revisar si `outbound_requests` debería tener RLS

### Prioridad BAJA

- [ ] Documentar por qué `cron_execution_log` no tiene RLS
- [ ] Sincronizar historial de migraciones locales con producción

---

## 📝 NOTAS

- **Historial de migraciones:** Desincronizado (346 locales vs ~160 en producción)
- **Última migración aplicada:** 20251115071500 (marcada pero columna no existe)
- **Método de auditoría:** Supabase MCP + SQL directo
- **Estado general:** Base de datos sana, solo falta columna `onboarding`

---

## 🔗 REFERENCIAS

- Script de aplicación: `./apply-onboarding-migration.sh`
- SQL de auditoría: `audit-database.sql`
- Migración pendiente: `supabase/migrations/20251115071500_add_onboarding_to_profiles.sql`

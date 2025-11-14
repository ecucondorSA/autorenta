# Supabase - Estructura de Archivos

## 📁 Organización de Carpetas

```
supabase/
├── migrations/          # ✅ SOLO migraciones válidas (YYYYMMDDHHMMSS_name.sql)
├── helpers/             # 🛠️ Scripts SQL de ayuda y fixes manuales
├── tests/               # 🧪 Scripts SQL de testing y verificación
├── functions/           # ⚡ Edge Functions (Deno)
└── config.toml          # ⚙️ Configuración de Supabase
```

---

## 1. `/migrations/` - Migraciones de Base de Datos

**Propósito**: Contiene SOLO migraciones válidas que se aplican automáticamente.

**Formato requerido**: `YYYYMMDDHHMMSS_descriptive_name.sql`

**Ejemplos válidos**:
- ✅ `20251113_add_onboarding_mvp_fields.sql`
- ✅ `20251112_fix_exchange_rates_rls_and_seed.sql`
- ✅ `20251028_add_mercadopago_oauth_to_profiles.sql`

**Aplicar migraciones**:
```bash
# Aplicar todas las pendientes
supabase db push

# Aplicar una específica
supabase migration up 20251113_add_onboarding_mvp_fields
```

**REGLA**: ⚠️ NO agregar archivos que no sean migraciones SQL con timestamp.

---

## 2. `/helpers/` - Scripts SQL de Ayuda

**Propósito**: Scripts SQL para fixes manuales, mantenimiento o tareas ad-hoc.

**Archivos actuales**:
- `fix_messages_table.sql` - Fix manual para tabla de mensajes
- `apply-20251027-security-fixes.sh` - Script para aplicar múltiples fixes

**Uso típico**:
```bash
# Ejecutar un helper manualmente en Supabase SQL Editor
# 1. Abrir Supabase Dashboard → SQL Editor
# 2. Copiar contenido de supabase/helpers/fix_messages_table.sql
# 3. Pegar y ejecutar
```

**CUÁNDO USAR HELPERS**:
- ✅ Fix urgente que no debe ser migración permanente
- ✅ Script de mantenimiento one-off
- ✅ Limpieza de datos adhoc
- ❌ Cambios de schema (usar migrations/)

---

## 3. `/tests/` - Scripts SQL de Testing

**Propósito**: Scripts para testear funcionalidad de DB, queries complejas, o verificar migraciones.

**Archivos actuales**:
- `test_booking_detail_payment_integration.sql` - Test de integración de pagos
- `test_notification_realtime.sql` - Test de notificaciones realtime
- `verify_notifications_realtime.sql` - Verificación de notificaciones

**Uso típico**:
```bash
# Ejecutar test en Supabase SQL Editor
# 1. Copiar contenido de supabase/tests/test_*.sql
# 2. Pegar en SQL Editor
# 3. Ejecutar y verificar resultados
```

**CUÁNDO USAR TESTS**:
- ✅ Verificar que migración se aplicó correctamente
- ✅ Testear queries complejas antes de integrar en app
- ✅ Debugging de issues de DB en staging/prod
- ❌ Tests unitarios de frontend (usar apps/web/src/...)

---

## 4. `/functions/` - Edge Functions

**Propósito**: Serverless functions que corren en Deno runtime de Supabase.

**Estructura**:
```
functions/
├── mercadopago-webhook/
│   └── index.ts
├── process-payment-split/
│   └── index.ts
├── _shared/
│   ├── logger.ts
│   ├── cors.ts
│   └── rate-limiter.ts
└── ...
```

**Deploy edge functions**:
```bash
# Deploy todas
supabase functions deploy

# Deploy una específica
supabase functions deploy mercadopago-webhook

# Ver logs
supabase functions logs mercadopago-webhook
```

---

## Mejores Prácticas

### ✅ DO (Hacer)
- Crear migraciones con timestamp correcto
- Nombrar migraciones descriptivamente: `add_X`, `fix_Y`, `create_Z`
- Testear migraciones en local antes de push a prod
- Usar helpers/ para fixes adhoc
- Usar tests/ para verificación

### ❌ DON'T (No hacer)
- NO crear migraciones sin timestamp
- NO poner archivos .md, .sh en migrations/
- NO editar migraciones ya aplicadas en prod
- NO usar migraciones para data fixes (usar helpers/)

---

## Convenciones de Nombres

### Migraciones (migrations/)
```
20251113_add_onboarding_mvp_fields.sql          # Agregar campos
20251112_fix_exchange_rates_rls_and_seed.sql    # Fix + seed data
20251028_create_messages_table_complete.sql     # Crear tabla
20251027_update_pricing_use_config.sql          # Actualizar lógica
```

**Patrón**: `YYYYMMDD[HHMMSS]_<verb>_<noun>_<details>.sql`

Verbos comunes:
- `add` - Agregar columnas/campos
- `create` - Crear tablas/funciones/índices
- `fix` - Corregir bugs/issues
- `update` - Modificar lógica existente
- `migrate` - Migrar datos

### Helpers (helpers/)
```
fix_messages_table.sql                  # Fix adhoc
cleanup_orphaned_bookings.sql           # Limpieza de datos
apply-security-fixes.sh                 # Script de aplicación múltiple
```

### Tests (tests/)
```
test_booking_payment_integration.sql    # Test de integración
verify_notifications_realtime.sql       # Verificación
debug_rls_policies.sql                  # Debugging
```

---

## Troubleshooting

### Error: "file name must match pattern"
**Problema**: Archivo en migrations/ no tiene formato correcto
**Solución**: Mover a helpers/ o tests/, o renombrar con timestamp

### Error: "migration already applied"
**Problema**: Migración ya existe en tabla `supabase_migrations`
**Solución**: Crear nueva migración con timestamp más reciente

### ¿Cómo deshacer una migración?
**NO hay rollback automático**. Opciones:
1. Crear nueva migración con cambios inversos
2. Ejecutar script manual desde helpers/
3. Restaurar backup de DB (último recurso)

---

## Ver También

- [Docs oficiales Supabase Migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [docs/migrations/](../../docs/migrations/) - Documentación de migraciones específicas
- [CLAUDE_WORKFLOWS.md](../../CLAUDE_WORKFLOWS.md) - Workflows de desarrollo

---

**Última actualización**: 2025-11-13

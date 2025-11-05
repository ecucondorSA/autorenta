# 🔧 Runbook: Troubleshooting General - AutoRenta

**Última actualización**: 2025-11-03  
**Versión**: 1.0.0

## Índice Rápido

- [Síntomas Comunes](#síntomas-comunes)
- [Diagnóstico Rápido](#diagnóstico-rápido)
- [Problemas por Categoría](#problemas-por-categoría)
- [Herramientas de Diagnóstico](#herramientas-de-diagnóstico)
- [Escalación](#escalación)

---

## Síntomas Comunes

### 🚨 Críticos (Impacto Alto)

| Síntoma | Categoría | Runbook Específico |
|---------|-----------|-------------------|
| Pagos no llegan al locador | 💳 Payment | [split-payment-failure.md](./split-payment-failure.md) |
| Webhook de MercadoPago no responde | 🔔 Webhook | [Ver sección Webhooks](#webhooks) |
| Base de datos no responde | 🗄️ Database | [database-backup-restore.md](./database-backup-restore.md) |
| Aplicación no carga | 🌐 Frontend | [Ver sección Frontend](#frontend) |
| Usuarios no pueden autenticarse | 🔐 Auth | [Ver sección Autenticación](#autenticación) |

### ⚠️ Altos (Impacto Medio)

| Síntoma | Categoría | Acción |
|---------|-----------|--------|
| Autos no aparecen en el mapa | 🗺️ Maps | [Ver sección Mapbox](#mapbox) |
| Imágenes no cargan | 📸 Storage | [Ver sección Storage](#storage) |
| Reservas duplicadas | 📅 Bookings | [Ver sección Bookings](#bookings) |
| Performance lenta | ⚡ Performance | [Ver sección Performance](#performance) |

---

## Diagnóstico Rápido

### 1. Verificar Estado de Servicios

```bash
# Verificar Cloudflare Pages
curl -I https://autorenta-web.pages.dev

# Verificar Supabase
curl -I https://obxvffplochgeiclibng.supabase.co/rest/v1/

# Verificar Edge Functions
curl -I https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook
```

### 2. Verificar Logs de Cloudflare

```bash
# Ver logs de Pages (requiere Cloudflare API token)
wrangler pages deployment tail autorenta-web

# Ver logs de Workers (si está deployado)
wrangler tail payments_webhook
```

### 3. Verificar Logs de Supabase

```bash
# Ver logs de Edge Functions
supabase functions logs mercadopago-webhook --limit 50

# Ver logs de database (via Dashboard)
# https://supabase.com/dashboard/project/obxvffplochgeiclibng/logs
```

### 4. Verificar Estado de Base de Datos

```sql
-- Conectar a Supabase
export DB_URL="postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres"

-- Verificar conexiones activas
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE datname = 'postgres';

-- Verificar tamaño de DB
SELECT pg_size_pretty(pg_database_size('postgres')) as db_size;

-- Verificar últimas transacciones
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
ORDER BY n_tup_ins DESC
LIMIT 10;
```

---

## Problemas por Categoría

### 🔐 Autenticación

#### Problema: Usuarios no pueden iniciar sesión

**Síntomas**:
- Error 401 en `/auth/login`
- "Invalid credentials" en UI
- Supabase Auth retorna error

**Diagnóstico**:

```bash
# 1. Verificar configuración de Supabase
curl https://obxvffplochgeiclibng.supabase.co/rest/v1/ \
  -H "apikey: $(grep NG_APP_SUPABASE_ANON_KEY apps/web/.env.development.local | cut -d'=' -f2)"

# 2. Verificar usuarios en DB
psql "$DB_URL" -c "
  SELECT id, email, created_at, last_sign_in_at 
  FROM auth.users 
  ORDER BY created_at DESC 
  LIMIT 10;
"

# 3. Verificar políticas RLS
psql "$DB_URL" -c "
  SELECT tablename, policyname, permissive, roles, cmd
  FROM pg_policies 
  WHERE schemaname = 'public' 
  AND tablename = 'profiles';
"
```

**Soluciones**:

1. **Credenciales incorrectas**:
   - Verificar que usuario existe: `SELECT * FROM auth.users WHERE email = 'user@example.com';`
   - Resetear password: Dashboard → Authentication → Users → Reset Password

2. **RLS bloqueando acceso**:
   ```sql
   -- Verificar políticas activas
   SELECT * FROM pg_policies WHERE tablename = 'profiles';
   
   -- Deshabilitar temporalmente para debug (solo en dev)
   ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
   -- Luego re-habilitar
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
   ```

3. **Token expirado**:
   - Limpiar localStorage: `localStorage.clear()`
   - Re-login desde cero

**Referencia**: `apps/web/src/app/core/services/auth.service.ts`

---

### 💳 Payment & Webhooks

#### Problema: Webhook de MercadoPago no se ejecuta

**Síntomas**:
- Pago aprobado en MercadoPago pero booking sigue en `pending`
- Logs de Edge Function no muestran actividad
- Usuario reporta pago no procesado

**Diagnóstico**:

```bash
# 1. Verificar última ejecución del webhook
supabase functions logs mercadopago-webhook --limit 20

# 2. Verificar configuración en MercadoPago
# Dashboard MP → Configuración → Webhooks
# URL debe ser: https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook

# 3. Verificar bookings pendientes
psql "$DB_URL" -c "
  SELECT 
    b.id,
    b.transaction_id,
    b.payment_status,
    b.created_at,
    p.preference_id
  FROM bookings b
  LEFT JOIN payment_intents p ON p.booking_id = b.id
  WHERE b.payment_status = 'pending'
  AND b.created_at > NOW() - INTERVAL '24 hours'
  ORDER BY b.created_at DESC;
"
```

**Soluciones**:

1. **Webhook no configurado en MP**:
   - Ir a: https://www.mercadopago.com.ar/developers/panel/app
   - Configurar webhook URL
   - Verificar firma del webhook

2. **Edge Function caída**:
   ```bash
   # Verificar deployment
   supabase functions list
   
   # Re-deploy si es necesario
   supabase functions deploy mercadopago-webhook
   ```

3. **Re-ejecutar webhook manualmente**:
   ```bash
   # Obtener payment_id desde booking
   PAYMENT_ID="<payment_id_from_booking>"
   
   # Re-enviar desde MercadoPago (requiere API token)
   curl -X POST \
     "https://api.mercadopago.com/v1/payments/$PAYMENT_ID/webhook_retry" \
     -H "Authorization: Bearer $MERCADOPAGO_ACCESS_TOKEN"
   ```

**Referencia**: `supabase/functions/mercadopago-webhook/index.ts`

---

#### Problema: Split payment falla

Ver [split-payment-failure.md](./split-payment-failure.md)

---

### 🗄️ Database

#### Problema: Queries lentas o timeouts

**Síntomas**:
- Página carga lenta (> 5 segundos)
- Errores 504 Gateway Timeout
- Pool de conexiones agotado

**Diagnóstico**:

```sql
-- Verificar queries activas
SELECT 
  pid,
  usename,
  application_name,
  state,
  query_start,
  NOW() - query_start as duration,
  query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start;

-- Verificar conexiones
SELECT 
  count(*) as total_connections,
  count(*) FILTER (WHERE state = 'active') as active,
  count(*) FILTER (WHERE state = 'idle') as idle
FROM pg_stat_activity;

-- Verificar índices faltantes
SELECT 
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  CASE 
    WHEN seq_scan > 0 THEN (seq_tup_read / seq_scan)::numeric(10,2)
    ELSE 0
  END as avg_seq_read
FROM pg_stat_user_tables
WHERE seq_scan > idx_scan * 10
ORDER BY seq_tup_read DESC;
```

**Soluciones**:

1. **Queries sin índice**:
   ```sql
   -- Agregar índice según query problemática
   CREATE INDEX CONCURRENTLY idx_bookings_car_id_created 
   ON bookings(car_id, created_at DESC);
   ```

2. **Pool agotado**:
   - Aumentar pool size en Supabase Dashboard
   - O usar direct connection para operaciones pesadas

3. **N+1 queries**:
   - Verificar código de servicios
   - Usar JOINs o batch queries

**Referencia**: `docs/runbooks/database-backup-restore.md`

---

### 🌐 Frontend

#### Problema: Build falla en producción

**Síntomas**:
- GitHub Actions falla en step "Build"
- Errores de TypeScript
- Errores de linting

**Diagnóstico**:

```bash
# 1. Reproducir build localmente
cd apps/web
npm run build

# 2. Ver errores específicos
npm run build 2>&1 | tee build-errors.log

# 3. Verificar linting
npm run lint

# 4. Verificar tipos
npx tsc --noEmit
```

**Soluciones**:

1. **Errores TypeScript**:
   ```bash
   # Auto-fix si es posible
   npm run lint:fix
   
   # O corregir manualmente según error
   ```

2. **Dependencias faltantes**:
   ```bash
   # Reinstalar
   pnpm install --frozen-lockfile
   ```

3. **Variables de entorno faltantes**:
   ```bash
   # Verificar .env.development.local
   cat apps/web/.env.development.local
   
   # Generar si es necesario
   cd apps/web && node scripts/generate-env.js
   ```

**Referencia**: `.github/workflows/build-and-deploy.yml`

---

#### Problema: Aplicación no carga (white screen)

**Síntomas**:
- Página en blanco después de cargar
- Console muestra errores JavaScript
- Network tab muestra 404s

**Diagnóstico**:

```bash
# 1. Verificar deployment en Cloudflare
wrangler pages deployment list autorenta-web

# 2. Verificar build artifacts
curl -I https://autorenta-web.pages.dev/

# 3. Verificar console errors (en browser)
# Abrir DevTools → Console
```

**Soluciones**:

1. **Archivos estáticos no encontrados**:
   - Verificar paths en `angular.json`
   - Verificar base href en `index.html`

2. **Variables de entorno faltantes**:
   ```bash
   # Verificar env.js en producción
   curl https://autorenta-web.pages.dev/env.js
   
   # Debe contener: SUPABASE_URL, SUPABASE_ANON_KEY
   ```

3. **Rollback a versión anterior**:
   ```bash
   # Via Cloudflare Dashboard
   # O via wrangler
   wrangler pages deployment rollback autorenta-web --deployment-id=<id>
   ```

---

### 🗺️ Mapbox

#### Problema: Mapa no carga o no muestra marcadores

**Síntomas**:
- Mapa en blanco
- Marcadores no aparecen
- Error "Mapbox token invalid"

**Diagnóstico**:

```bash
# 1. Verificar token de Mapbox
grep MAPBOX_ACCESS_TOKEN apps/web/.env.development.local

# 2. Verificar en browser console
# Buscar errores de Mapbox API

# 3. Verificar autos en DB
psql "$DB_URL" -c "
  SELECT 
    id,
    title,
    latitude,
    longitude,
    status,
    created_at
  FROM cars
  WHERE status = 'active'
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL
  LIMIT 10;
"
```

**Soluciones**:

1. **Token inválido o expirado**:
   - Verificar en Mapbox Dashboard: https://account.mapbox.com/access-tokens/
   - Rotar token si es necesario
   - Actualizar en Supabase secrets y GitHub secrets

2. **Autos sin coordenadas**:
   ```sql
   -- Verificar autos sin ubicación
   SELECT COUNT(*) FROM cars 
   WHERE status = 'active' 
   AND (latitude IS NULL OR longitude IS NULL);
   ```

3. **Límite de requests alcanzado**:
   - Verificar uso en Mapbox Dashboard
   - Considerar upgrade de plan

**Referencia**: `apps/web/src/app/shared/components/map/map.component.ts`

---

### 📸 Storage

#### Problema: Imágenes no cargan (avatars, car photos)

**Síntomas**:
- Imágenes rotas (404)
- Error "Storage policy violation"
- Uploads fallan

**Diagnóstico**:

```sql
-- Verificar políticas de storage
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'storage'
ORDER BY tablename, policyname;

-- Verificar archivos en storage
-- Via Supabase Dashboard → Storage
```

**Soluciones**:

1. **RLS bloqueando acceso**:
   ```sql
   -- Verificar políticas (no deshabilitar en producción)
   -- Las políticas deben verificar: (storage.foldername(name))[1] = auth.uid()::text
   ```

2. **Path incorrecto**:
   ```typescript
   // ✅ CORRECTO - Sin bucket prefix
   const filePath = `${userId}/${filename}`;
   
   // ❌ INCORRECTO
   const filePath = `avatars/${userId}/${filename}`;
   ```

3. **Bucket no existe**:
   ```bash
   # Verificar buckets
   supabase storage list-buckets
   
   # Crear si falta
   supabase storage create-bucket avatars --public
   ```

**Referencia**: `CLAUDE.md` - Sección "Supabase Storage Architecture"

---

### 📅 Bookings

#### Problema: Reservas duplicadas

**Síntomas**:
- Múltiples bookings con mismo `transaction_id`
- Usuario reporta doble cobro
- Wallet muestra múltiples transacciones

**Diagnóstico**:

```sql
-- Encontrar duplicados
SELECT 
  transaction_id,
  COUNT(*) as count,
  array_agg(id) as booking_ids,
  array_agg(created_at) as created_times
FROM bookings
WHERE transaction_id IS NOT NULL
GROUP BY transaction_id
HAVING COUNT(*) > 1;

-- Verificar atomicidad
SELECT 
  id,
  transaction_id,
  status,
  payment_status,
  created_at
FROM bookings
WHERE id IN (<booking_ids_from_above>)
ORDER BY created_at;
```

**Soluciones**:

1. **Revertir booking duplicado**:
   ```sql
   BEGIN;
   
   -- Marcar como cancelado
   UPDATE bookings 
   SET status = 'cancelled',
       cancellation_reason = 'Duplicate booking'
   WHERE id = '<duplicate_booking_id>';
   
   -- Reembolsar si ya pagó
   -- (Ver runbook de split-payment para reversión)
   
   COMMIT;
   ```

2. **Prevenir futuros duplicados**:
   ```sql
   -- Agregar constraint único
   ALTER TABLE bookings 
   ADD CONSTRAINT unique_transaction_id 
   UNIQUE (transaction_id);
   ```

**Referencia**: `apps/web/src/app/core/services/bookings.service.ts`

---

### ⚡ Performance

#### Problema: Aplicación lenta

**Síntomas**:
- Tiempo de carga > 3 segundos
- Queries lentas
- Bundle size grande

**Diagnóstico**:

```bash
# 1. Verificar bundle size
cd apps/web
npm run build
ls -lh dist/web/

# 2. Analizar con Lighthouse
# Abrir DevTools → Lighthouse → Run audit

# 3. Verificar queries lentas (ver sección Database)
```

**Soluciones**:

1. **Bundle size grande**:
   ```bash
   # Analizar bundle
   npm run build -- --stats-json
   npx webpack-bundle-analyzer dist/web/stats.json
   
   # Optimizar imports
   # Usar lazy loading para features pesadas
   ```

2. **Queries N+1**:
   - Verificar servicios que hacen loops
   - Usar batch queries o JOINs

3. **Imágenes sin optimizar**:
   - Usar CDN para imágenes
   - Implementar lazy loading de imágenes
   - Comprimir imágenes antes de upload

---

## Herramientas de Diagnóstico

### Scripts Útiles

```bash
# Verificar estado completo del sistema
./tools/check-auth.sh

# Ver logs de todos los servicios
./tools/claude-workflows.sh status

# Backup antes de cambios
./docs/runbooks/database-backup-restore.sh
```

### Dashboards

- **Cloudflare**: https://dash.cloudflare.com/
- **Supabase**: https://supabase.com/dashboard/project/obxvffplochgeiclibng
- **MercadoPago**: https://www.mercadopago.com.ar/developers/panel
- **GitHub Actions**: https://github.com/ecucondorSA/autorenta/actions

---

## Escalación

### Niveles de Escalación

1. **Nivel 1 - Developer**: Problemas comunes (este runbook)
2. **Nivel 2 - Arquitecto**: Problemas de infraestructura o arquitectura
3. **Nivel 3 - Vendor Support**: Supabase, Cloudflare, MercadoPago

### Cuándo Escalar

- **Nivel 2**: Problemas que requieren cambios arquitectónicos
- **Nivel 3**: 
  - Incidentes de seguridad
  - Pérdida de datos
  - Downtime prolongado (> 1 hora)

### Contactos

- **Supabase Support**: https://supabase.com/support
- **Cloudflare Support**: https://dash.cloudflare.com/?to=/:account/support
- **MercadoPago Support**: https://www.mercadopago.com.ar/developers/es/support

---

## Checklist de Troubleshooting

Antes de escalar, verificar:

- [ ] ¿Se verificaron los logs de todos los servicios?
- [ ] ¿Se verificó el estado de la base de datos?
- [ ] ¿Se verificó la configuración de secrets?
- [ ] ¿Se intentaron las soluciones del runbook específico?
- [ ] ¿Se documentó el problema y solución?
- [ ] ¿Se creó backup antes de cambios?

---

## Referencias

- [Runbook: Split Payment Failure](./split-payment-failure.md)
- [Runbook: Database Backup & Restore](./database-backup-restore.md)
- [Runbook: Secret Rotation](./secret-rotation.md)
- [CLAUDE.md](../../CLAUDE.md) - Arquitectura del proyecto
- [Disaster Recovery Plan](../disaster-recovery-plan.md)

---

**Última revisión**: 2025-11-03  
**Mantenedor**: Equipo de Desarrollo AutoRenta






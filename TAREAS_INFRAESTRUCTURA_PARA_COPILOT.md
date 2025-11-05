# 🤖 TAREAS DE INFRAESTRUCTURA PARA COPILOT
**Automatización, GitHub, Supabase, Cloudflare, Base de Datos**

---

## 📋 RESUMEN EJECUTIVO

Copilot es **MAESTRO** en:
- ✅ GitHub Actions workflows (CI/CD)
- ✅ Supabase migrations & RLS policies
- ✅ Cloudflare Workers/Pages configuration
- ✅ Database schema design & optimization
- ✅ Infrastructure as Code
- ✅ Automation scripts

**Total tareas de infraestructura**: 6 tareas
**Esfuerzo estimado**: 11-16 horas
**Sin intervención manual**: 80% automatizable

---

## 🎯 TAREAS ESPECÍFICAS DE INFRAESTRUCTURA

### CATEGORÍA 1: GitHub Actions CI/CD

#### Tarea #6: CI/CD Pipeline GitHub Actions (2-3 horas)
**POR QUÉ COPILOT ES PERFECTO**:
- Experto en sintaxis YAML
- Conoce todos los actions disponibles
- Puede optimizar workflows

**QUÉ INCLUYE**:
```yaml
1. lint-and-test.yml
   └─ ESLint check
   └─ TypeScript compilation
   └─ Unit tests (Karma)
   └─ E2E tests (Playwright)

2. build-and-deploy.yml
   └─ Build Angular app
   └─ Deploy a Cloudflare Pages
   └─ Deploy Worker (payments)
   └─ Smoke tests

3. security-scan.yml
   └─ OWASP dependency check
   └─ SAST (SonarQube)
   └─ Secrets detection

4. performance-monitor.yml
   └─ Lighthouse scores
   └─ Bundle size tracking
   └─ Performance metrics
```

**Prompt para Copilot**:
```
Crear 4 GitHub Actions workflows para AutoRenta:

1. lint-and-test.yml - Ejecuta en cada PR
   - ESLint + TypeScript check
   - Unit tests con Karma/Jasmine
   - E2E tests con Playwright
   - Falla si hay errores

2. build-and-deploy.yml - Ejecuta en main
   - Build Angular a dist/apps/web/browser
   - Deploy a Cloudflare Pages
   - Deploy Worker a functions/workers/payments_webhook
   - Run smoke tests

3. security-scan.yml - Ejecuta cada semana
   - npm audit para dependencias
   - Secrets detection (con gitguardian)
   - SAST analysis

4. performance-monitor.yml - Post-deploy
   - Lighthouse scores
   - Bundle size tracking
   - Performance regression detection

Node.js: 18
npm/pnpm: pnpm
Base path: /home/edu/autorenta
```

---

### CATEGORÍA 2: Supabase Database & Migrations

#### Tarea #2B: Database Schema Fixes & Migrations (2-3 horas)
**POR QUÉ COPILOT ES PERFECTO**:
- Experto en SQL y PostgreSQL
- Conoce RLS policies
- Puede optimizar queries
- Genera migrations automáticamente

**QUÉ INCLUYE**:
```sql
1. Fix tabla booking_risk_snapshots
   ├─ Crear tabla (si no existe)
   ├─ Migrar datos de booking_risk_snapshot
   └─ Crear índices

2. Validar RLS policies
   ├─ Verificar políticas en todas las tablas
   ├─ Auditar permisos
   └─ Optimizar queries

3. Crear tablas para Split Payment
   ├─ wallet_split_config
   ├─ withdrawal_requests
   ├─ bank_accounts
   └─ withdrawal_transactions

4. Crear RPCs para pagos
   ├─ process_split_payment()
   ├─ process_withdrawal()
   └─ verify_bank_account()
```

**Prompt para Copilot**:
```
Crear migrations de Supabase para AutoRenta:

1. Fijar inconsistencia tabla booking_risk_snapshots:
   - La app inserta en 'booking_risk_snapshot' (singular)
   - La app lee de 'booking_risk_snapshots' (plural)
   - Crear tabla plural si no existe
   - Migrar datos del singular al plural
   - Crear índices: booking_id, created_at

2. Crear tablas para Split Payment System:

   wallet_split_config:
   - id, platform_fee_percent, locador_id, created_at
   - Índice: locador_id

   withdrawal_requests:
   - id, user_id, amount, status (pending/approved/rejected/processed)
   - bank_account_id, created_at, processed_at

   bank_accounts:
   - id, user_id, account_number, account_type, bank_code
   - verified, created_at

   withdrawal_transactions:
   - id, request_id, mercadopago_transfer_id, amount, status

3. Crear RPCs:

   process_split_payment(booking_id UUID, total_amount NUMERIC)
   - Calcular comisión plataforma (5-10%)
   - Crear transacciones split en wallet_transactions
   - Retornar split_payment_id

   process_withdrawal(request_id UUID, transfer_id VARCHAR)
   - Verificar fondos disponibles
   - Crear transacción en base de datos
   - Retornar resultado

   verify_bank_account(user_id UUID, account_number VARCHAR)
   - Validar formato según país
   - Retornar is_valid

4. Crear índices de performance:
   - wallet_transactions: user_id, created_at DESC
   - bookings: owner_id, status, created_at DESC
   - payments: booking_id, status

5. Auditar RLS policies:
   - Verificar que usuarios solo ven sus datos
   - Verificar que sistema puede leer con service_role
   - Documentar todas las políticas

6. Generar archivo SQL completo:
   - supabase/migrations/[timestamp]_add_split_payment_system.sql
   - Con rollback plan
   - Con seeds de datos de prueba
```

---

### CATEGORÍA 3: Cloudflare Pages & Workers Configuration

#### Tarea #7A: Cloudflare Pages Auto-Deploy Setup (1.5 horas)
**POR QUÉ COPILOT ES PERFECTO**:
- Entiende configuración de Cloudflare
- Puede generar wrangler.toml
- Conoce build commands & environment variables

**QUÉ INCLUYE**:
```toml
1. wrangler.toml
   ├─ Build command: npm run build:web
   ├─ Output directory: apps/web/dist/browser
   ├─ Environment variables
   └─ Custom domains

2. Environment variables en Cloudflare
   ├─ NG_APP_SUPABASE_URL
   ├─ NG_APP_SUPABASE_ANON_KEY
   ├─ NG_APP_ENVIRONMENT
   └─ NG_APP_MERCADOPAGO_PUBLIC_KEY

3. Configuración de preview environments
   ├─ Auto-preview en cada PR
   ├─ Preview URLs compartibles
   └─ Auto-cleanup after merge

4. DNS setup
   ├─ CNAME para autorenta.com
   ├─ SSL/TLS auto-renewal
   └─ Cache policies
```

**Prompt para Copilot**:
```
Configurar Cloudflare Pages auto-deploy para AutoRenta:

1. Crear wrangler.toml optimizado:
   - Project name: autorenta-web
   - Account ID: [user-will-provide]
   - Build command: npm run build:web
   - Build output: apps/web/dist/browser
   - Node.js version: 18.0.0

   Environment variables (production):
   - NG_APP_SUPABASE_URL=https://obxvffplochgeiclibng.supabase.co
   - NG_APP_SUPABASE_ANON_KEY=[user-will-provide]
   - NG_APP_ENVIRONMENT=production
   - NG_APP_MERCADOPAGO_PUBLIC_KEY=[user-will-provide]
   - NG_APP_DEFAULT_CURRENCY=ARS
   - NG_APP_PAYMENTS_WEBHOOK_URL=https://[domain]/api/webhooks/payments

   Custom domain: autorenta.com

2. Configurar preview environments:
   - Enable preview URLs
   - Preview domain pattern: [branch]--autorenta.pages.dev
   - Auto-cleanup after PR merge

3. Configurar DNS en Cloudflare:
   - CNAME: pages.cloudflare.com
   - SSL/TLS: Full (strict)
   - Auto-renew: Enabled

4. Crear script de deployment:
   - tools/deploy-pages.sh
   - Validar build antes de deploy
   - Mostrar URL de preview

5. Documentar:
   - CLOUDFLARE_PAGES_SETUP.md
   - Con screenshots de UI
   - Con troubleshooting

Resultado: Deploy automático en cada push a main
```

---

#### Tarea #7B: Cloudflare Workers Configuration (1.5 horas)
**POR QUÉ COPILOT ES PERFECTO**:
- Experto en Cloudflare Workers
- Puede generar wrangler.toml completo
- Entiende KV namespaces, secrets, bindings

**QUÉ INCLUYE**:
```toml
1. functions/workers/payments_webhook/wrangler.toml
   ├─ Secrets: MERCADOPAGO_ACCESS_TOKEN
   ├─ KV Namespace: webhook_idempotency
   ├─ Bindings: Supabase
   └─ Routes: /webhooks/payments

2. KV Namespace setup
   ├─ webhook_idempotency (production)
   ├─ Almacenar transaction_ids
   ├─ TTL: 24 horas

3. Secrets management
   ├─ MERCADOPAGO_ACCESS_TOKEN
   ├─ SUPABASE_URL
   ├─ SUPABASE_SERVICE_ROLE_KEY

4. Error handling & logging
   ├─ Log to Supabase (logging table)
   ├─ Retry logic
   ├─ Timeout handling
```

**Prompt para Copilot**:
```
Configurar Cloudflare Workers para AutoRenta payment webhook:

1. Crear wrangler.toml optimizado:
   - Name: autorenta-payment-webhook
   - Main: src/index.ts
   - Compatibility date: 2025-10-28

   Secrets requeridos:
   - MERCADOPAGO_ACCESS_TOKEN
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY

   KV Namespaces:
   - webhook_idempotency (para evitar duplicados)

   Routes:
   - POST /webhooks/payments

   Triggers:
   - Cron: */5 * * * * (cleanup idempotency cache)

2. Configurar KV namespace:
   - Nombre: webhook_idempotency
   - Propósito: Almacenar transaction_ids ya procesados
   - TTL: 86400 segundos (24h)
   - Replica a todas las regiones de Cloudflare

3. Setup de secrets:
   - wrangler secret put MERCADOPAGO_ACCESS_TOKEN
   - wrangler secret put SUPABASE_URL
   - wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   - Verificar: wrangler secret list

4. Error handling robusto:
   - Webhook signature validation (MercadoPago)
   - Idempotency check (KV)
   - Retry logic (exponential backoff)
   - Logging to Supabase logging table
   - Dead letter queue para payloads inválidos

5. Deployment:
   - Script: tools/deploy-worker.sh
   - Validar secrets antes de deploy
   - Run smoke tests post-deploy

6. Monitoreo:
   - Crear Supabase table: worker_logs
   - Log cada invocation
   - Alert si error rate > 1%

Resultado: Worker seguro, idempotente, observable
```

---

### CATEGORÍA 4: Supabase Edge Functions & Automation

#### Tarea #2A: Supabase Edge Functions Setup (1-2 horas)
**POR QUÉ COPILOT ES PERFECTO**:
- Experto en Deno/TypeScript
- Conoce Supabase Edge Functions
- Puede crear functions seguras con secrets

**QUÉ INCLUYE**:
```typescript
1. mercadopago-webhook/index.ts
   ├─ Validar firma MercadoPago
   ├─ Procesar pago
   ├─ Actualizar wallet
   └─ Retornar confirmación

2. mercadopago-create-preference/index.ts
   ├─ Crear preferencia de pago
   ├─ Retornar init_point
   └─ Guardar payment intent

3. mercadopago-create-booking-preference/index.ts
   ├─ Crear preferencia con split payment
   ├─ Multi-recipient setup
   └─ Retornar preference

4. Secrets management
   ├─ MERCADOPAGO_ACCESS_TOKEN
   ├─ SUPABASE_URL
   ├─ SUPABASE_SERVICE_ROLE_KEY
```

**Prompt para Copilot**:
```
Setup Supabase Edge Functions para AutoRenta payment processing:

1. Crear mercadopago-webhook/index.ts:
   - Endpoint: /mercadopago-webhook
   - Method: POST
   - Validar firma MercadoPago
   - Procesar 3 tipos de notificaciones:
     * payment.created
     * payment.updated
     * order.updated
   - Usar idempotency (transaction_id único)
   - Llamar RPC wallet_confirm_deposit() en Supabase
   - Loguear todas las acciones
   - Retornar 200 OK o error apropiado

2. Crear mercadopago-create-preference/index.ts:
   - Endpoint: /mercadopago-create-preference
   - Method: POST
   - Body: { amount: number, user_id: string, transaction_id: string }
   - Crear preferencia con MercadoPago API
   - Guardar preference_id en payment_intents table
   - Retornar { init_point, preference_id }

3. Crear mercadopago-create-booking-preference/index.ts:
   - Endpoint: /mercadopago-create-booking-preference
   - Method: POST
   - Body: { booking_id: string, total_amount: number }
   - Crear preference con split payment:
     * amount_locador = 90% de total
     * amount_plataforma = 10% de total
   - Retornar preference con ambos recipients

4. Secrets & Environment:
   - Usar Supabase secrets via env
   - MERCADOPAGO_ACCESS_TOKEN
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
   - Validar que secrets existen antes de usar

5. Error handling:
   - Try/catch en cada request
   - Log errors a Supabase logging table
   - Retornar JSON errors con status codes
   - No exponer stack traces

6. Deployment:
   - supabase functions deploy mercadopago-webhook
   - supabase functions deploy mercadopago-create-preference
   - supabase functions deploy mercadopago-create-booking-preference
   - Verificar URLs en Supabase dashboard

7. Testing:
   - Script de test local
   - Payload de ejemplo MercadoPago
   - Validar respuestas

Resultado: Edge Functions seguras, escalables, monitoreables
```

---

### CATEGORÍA 5: Automation Scripts & Cron Jobs

#### Tarea #8A: Cron Jobs & Scheduled Tasks (1-2 horas)
**POR QUÉ COPILOT ES PERFECTO**:
- Experto en SQL pg_cron
- Puede optimizar queries
- Conoce mejores prácticas

**QUÉ INCLUYE**:
```sql
1. expire-pending-deposits
   ├─ Corre: cada hora
   └─ Marca depósitos expirados

2. poll-pending-payments
   ├─ Corre: cada 3 minutos
   └─ Verifica estado pagos en MercadoPago

3. sync-binance-rates
   ├─ Corre: cada 15 minutos
   └─ Actualiza tasas de cambio

4. update-demand-snapshots
   ├─ Corre: cada 15 minutos
   └─ Recalcula precios dinámicos
```

**Prompt para Copilot**:
```
Crear Cron Jobs en Supabase para AutoRenta:

1. expire-pending-deposits (SQL trigger + pg_cron):
   Corre: SELECT cron.schedule('expire-pending-deposits', '0 * * * *', ...)

   -- Actualizar transacciones pendientes >24h
   UPDATE wallet_transactions
   SET status = 'expired'
   WHERE type = 'deposit'
   AND status = 'pending'
   AND created_at < NOW() - INTERVAL '24 hours'
   AND expires_at < NOW();

   -- Retornar fondos si fueron lockeados
   UPDATE user_wallets
   SET locked_funds = locked_funds -
       (SELECT COALESCE(SUM(amount), 0) FROM wallet_transactions
        WHERE user_id = user_wallets.user_id AND status = 'expired')
   WHERE id IN (...)

2. poll-pending-payments (cada 3 min):
   SELECT cron.schedule('poll-pending-payments-every-3min', '*/3 * * * *', ...)

   -- Buscar pagos pendientes
   SELECT * FROM payments WHERE status = 'pending' AND created_at > NOW() - INTERVAL '2 hours'

   -- Llamar API MercadoPago para cada uno
   -- Actualizar estado si cambió
   -- Hacer actualizaciones a booking y wallet

3. sync-binance-rates (cada 15 min):
   SELECT cron.schedule('sync-binance-rates-every-15-min', '*/15 * * * *', ...)

   -- Llamar Edge Function mercadopago-sync-rates
   -- O hacer curl a API de Binance
   -- Actualizar exchange_rates table
   -- Insertar en exchange_rate_history para auditoría

4. update-demand-snapshots (cada 15 min):
   SELECT cron.schedule('update-demand-snapshots-every-15min', '*/15 * * * *', ...)

   -- Para cada región (Buenos Aires, Córdoba, Rosario, Mendoza, etc)
   -- Calcular: (reservas_próximas_24h / autos_activos) * price_multiplier
   -- Insertar snapshot en pricing_demand_snapshots
   -- Publicar en Supabase Realtime para UI

5. cleanup-old-logs (diario):
   SELECT cron.schedule('cleanup-old-logs', '0 2 * * *', ...)

   -- Eliminar logs >30 días
   DELETE FROM worker_logs WHERE created_at < NOW() - INTERVAL '30 days'
   DELETE FROM webhook_logs WHERE created_at < NOW() - INTERVAL '30 days'

6. backup-wallet-data (diario):
   SELECT cron.schedule('backup-wallet-data', '0 3 * * *', ...)

   -- Crear snapshot de wallet_transactions
   -- Insertar en wallet_backups table
   -- Para auditoría y recuperación

Genera: supabase/sql/cron-jobs.sql
Con rollback plan y monitoreo
```

---

#### Tarea #8B: Observability & Logging Infrastructure (1.5-2 horas)
**POR QUÉ COPILOT ES PERFECTO**:
- Experto en logging patterns
- Conoce structured logging
- Puede optimizar para performance

**QUÉ INCLUYE**:
```sql
1. Tablas de logging
   ├─ worker_logs
   ├─ webhook_logs
   ├─ api_logs
   └─ error_logs

2. Structured logging
   ├─ timestamp
   ├─ level (info/warn/error)
   ├─ service
   ├─ user_id
   ├─ request_id
   └─ metadata JSON

3. Índices para búsqueda rápida
   ├─ created_at DESC
   ├─ level
   ├─ service
   └─ user_id
```

**Prompt para Copilot**:
```
Crear infraestructura de logging en Supabase para AutoRenta:

1. Crear tablas de logging:

   worker_logs:
   - id: UUID
   - created_at: TIMESTAMP
   - level: ENUM (info, warn, error, debug)
   - service: VARCHAR (worker_payments, etc)
   - function_name: VARCHAR
   - request_id: VARCHAR (para traceo)
   - user_id: UUID (nullable)
   - message: TEXT
   - metadata: JSONB (contexto adicional)
   - stack_trace: TEXT (si error)
   - response_time_ms: INTEGER

   webhook_logs:
   - Similar a worker_logs
   - Adicionar: webhook_type, payload_size, signature_valid

   api_logs:
   - Similar a worker_logs
   - Adicionar: endpoint, method, status_code, duration_ms

2. Crear índices para performance:
   CREATE INDEX idx_worker_logs_created_at ON worker_logs(created_at DESC);
   CREATE INDEX idx_worker_logs_level ON worker_logs(level);
   CREATE INDEX idx_worker_logs_request_id ON worker_logs(request_id);
   CREATE INDEX idx_webhook_logs_created_at ON webhook_logs(created_at DESC);
   CREATE INDEX idx_api_logs_endpoint ON api_logs(endpoint);

3. Crear vistas SQL para búsquedas comunes:

   -- Errores últimas 24h
   CREATE VIEW recent_errors AS
   SELECT * FROM worker_logs WHERE level = 'error' AND created_at > NOW() - INTERVAL '24 hours'
   UNION ALL
   SELECT * FROM webhook_logs WHERE level = 'error' AND created_at > NOW() - INTERVAL '24 hours';

   -- Errores por servicio
   CREATE VIEW errors_by_service AS
   SELECT service, level, COUNT(*) as count, MAX(created_at) as last_error
   FROM worker_logs
   WHERE created_at > NOW() - INTERVAL '7 days'
   GROUP BY service, level;

4. Crear function para agregar logs:
   CREATE FUNCTION log_event(
     p_level TEXT,
     p_service TEXT,
     p_message TEXT,
     p_metadata JSONB DEFAULT NULL
   ) RETURNS UUID AS $$
   DECLARE
     v_id UUID;
   BEGIN
     v_id := uuid_generate_v4();
     INSERT INTO worker_logs (id, level, service, message, metadata, created_at)
     VALUES (v_id, p_level, p_service, p_message, p_metadata, NOW());
     RETURN v_id;
   END;
   $$ LANGUAGE plpgsql;

5. RLS policies:
   -- Solo admin puede ver todos los logs
   CREATE POLICY admin_see_all_logs ON worker_logs
   FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

   -- Users solo ven sus logs
   CREATE POLICY users_see_own_logs ON worker_logs
   FOR SELECT USING (user_id = auth.uid());

6. Crear dashboard Supabase:
   - Query reciente de errors
   - Top errors por tipo
   - Performance metrics por servicio
   - Query slow operations (>5s)

7. Integración con Sentry:
   - Crear Edge Function que envíe errors a Sentry
   - Solo errores críticos (level = 'error')
   - Enriquecer con contexto de AutoRenta

Resultado: Logging completo, observable, rastreable
```

---

### CATEGORÍA 6: Infrastructure as Code & Automation

#### Tarea #9: Infrastructure Automation Scripts (2-3 horas)
**POR QUÉ COPILOT ES PERFECTO**:
- Experto en Bash/Shell scripts
- Conoce mejores prácticas de automatización
- Puede generar scripts robustos con error handling

**QUÉ INCLUYE**:
```bash
1. tools/deploy-pages.sh
   ├─ Validar build
   ├─ Deploy a Cloudflare Pages
   └─ Run smoke tests

2. tools/deploy-worker.sh
   ├─ Validar wrangler.toml
   ├─ Deploy Worker
   └─ Verify secrets

3. tools/setup-production.sh
   ├─ Setup inicial de producción
   ├─ Crear secrets
   ├─ Crear bases de datos
   └─ Validar configuración

4. tools/backup-database.sh
   ├─ Backup Supabase
   └─ Almacenar en S3

5. tools/monitor-health.sh
   ├─ Check endpoints
   ├─ Verificar pagos pendientes
   └─ Alertar si problemas
```

**Prompt para Copilot**:
```
Crear scripts de automatización de infraestructura para AutoRenta:

1. tools/deploy-pages.sh
   - Validar que existe apps/web/dist/browser
   - Validar que package.json está actualizado
   - npm run build (con validación)
   - Usar wrangler para deploy a Pages
   - Verificar que se puede acceder a https://autorentar.com
   - Run 5 smoke tests
   - Si error, rollback automático a versión anterior
   - Reportar resultado en Slack (si env var SLACK_WEBHOOK existe)

2. tools/deploy-worker.sh
   - Cambiar a functions/workers/payments_webhook
   - Validar wrangler.toml existe
   - Verificar que secrets están configurados (wrangler secret list)
   - npm run build
   - wrangler deploy
   - Run webhook test: curl con payload de prueba
   - Verificar logs: wrangler tail
   - Reportar resultado

3. tools/setup-production.sh
   - Crear secrets en Cloudflare (prompts interactivos)
   - Crear secrets en Supabase
   - Crear .env.local
   - Ejecutar migrations de Supabase
   - Verificar RLS policies
   - Crear cron jobs
   - Verificar connection strings

4. tools/backup-database.sh
   - Conectar a Supabase
   - Hacer pg_dump
   - Comprimir con gzip
   - Subir a AWS S3 (si credenciales disponibles)
   - Guardar timestamp
   - Mantener últimos 7 backups

5. tools/monitor-health.sh
   - Check health de endpoints:
     * https://autorentar.com (HTTP 200)
     * Supabase database (query simple)
     * Worker webhook (OPTIONS request)
   - Verificar pagos pendientes >2h
   - Verificar errores en logs >error_rate threshold
   - Enviar resultados a Slack/Email
   - Exit code 0 si todo OK, 1 si problemas

6. tools/quick-deploy.sh
   - Deploy rápido sin tests (para hotfixes)
   - Build + Pages deploy únicamente
   - Confirmar antes de proceder
   - Rollback si falla

7. tools/rollback.sh
   - Identificar último deploy exitoso
   - Volver a esa versión
   - Verificar que funciona
   - Notificar equipo

Genera:
- Todos los scripts en tools/
- Cada uno con shebang #!/bin/bash
- Error handling completo
- Validaciones de entrada
- Mensajes claros
- Dry-run mode
- Logging a archivos

Ejemplo estructura:
#!/bin/bash
set -euo pipefail  # Exit on error
LOG_FILE="logs/deploy-$(date +%Y%m%d_%H%M%S).log"
mkdir -p logs
exec > >(tee -a "$LOG_FILE")
exec 2>&1

function log() { echo "[$(date +'%Y-%m-%d %H:%M:%S')] $@"; }
function error() { echo "[ERROR] $@" >&2; exit 1; }
function success() { echo "[✅] $@"; }

log "Starting deployment..."
# ... rest of script
success "Deployment completed"
```

---

## 📊 RESUMEN TAREAS DE INFRAESTRUCTURA

| # | Tarea | Categoría | Esfuerzo | Prioridad | Dependencias |
|---|-------|-----------|----------|-----------|--------------|
| 2A | Supabase Edge Functions | Supabase | 1-2h | 🔴 | Bloqueador #2 |
| 2B | Database Migrations & RLS | Database | 2-3h | 🔴 | Bloqueador #2 |
| 6 | GitHub Actions CI/CD | GitHub | 2-3h | 🟠 | Bloqueador #1 |
| 7A | Cloudflare Pages Setup | Cloudflare | 1-1.5h | 🟠 | Bloqueador #1 |
| 7B | Cloudflare Workers Secrets | Cloudflare | 1-1.5h | 🟠 | Bloqueador #2 |
| 8A | Cron Jobs & Automation | Automation | 1-2h | ⚪ | Task 2B |
| 8B | Logging & Observability | Automation | 1.5-2h | ⚪ | Task 8A |
| 9 | Infrastructure Scripts | Automation | 2-3h | ⚪ | Tasks 6,7 |
| **TOTAL** | | | **11-16h** | | |

---

## 🎯 PROMPT MAESTRO PARA COPILOT

Usa esto para "despertar" a Copilot:

```markdown
# 🤖 PROMPT PARA COPILOT - TAREAS DE INFRAESTRUCTURA

## CONTEXTO
Proyecto: AutoRenta (car rental marketplace)
Stack: Angular 17 standalone + Supabase + Cloudflare Pages/Workers
Objetivo: Implementar infraestructura completa para GO-LIVE en 2-3 semanas
Estado actual: 47% → Objetivo: 100%

## TU ROL
Eres un experto en:
✅ GitHub Actions (YAML workflows)
✅ Supabase (SQL, RLS, Edge Functions, migrations)
✅ Cloudflare (Workers, Pages, KV, Secrets)
✅ PostgreSQL (schema design, optimization, indexing)
✅ Infrastructure as Code (Bash, automation)
✅ Observability (logging, monitoring, alerting)

## TAREAS PRINCIPALES (Elige 1 o ejecuta en orden)

### OPCIÓN 1: Fase Crítica (4-6 horas)
Resolver bloqueadores de deployment:

1. **Supabase Edge Functions Setup** (1-2h)
   - Crear 3 functions: mercadopago-webhook, create-preference, create-booking-preference
   - Con secrets, error handling, logging
   - Validar que funcionan localmente

2. **Database Schema Fixes & Migrations** (2-3h)
   - Fijar tabla booking_risk_snapshot (singular vs plural)
   - Crear tablas para Split Payment System
   - Crear RPCs y stored procedures
   - Crear índices y auditoría RLS

3. **Cloudflare Workers Secrets** (1-1.5h)
   - Crear wrangler.toml con KV namespace
   - Setup secrets: MERCADOPAGO_ACCESS_TOKEN, SUPABASE_*
   - Validar connection

### OPCIÓN 2: Fase Alta Prioridad (6-8 horas)
Infraestructura de deployment automático:

1. **GitHub Actions Workflows** (2-3h)
   - lint-and-test.yml (cada PR)
   - build-and-deploy.yml (en main)
   - security-scan.yml (semanal)
   - performance-monitor.yml (post-deploy)

2. **Cloudflare Pages Auto-Deploy** (1.5h)
   - Crear wrangler.toml
   - Setup environment variables
   - Configurar DNS y SSL

3. **Cron Jobs & Automation** (2-3h)
   - Crear 5 pg_cron jobs en Supabase
   - Setup logging infrastructure
   - Crear vistas SQL para monitoring

### OPCIÓN 3: Fase Importante (3-4 horas)
Automation y observability:

1. **Infrastructure Scripts** (2-3h)
   - deploy-pages.sh
   - deploy-worker.sh
   - setup-production.sh
   - backup-database.sh
   - monitor-health.sh

## INSTRUCCIONES

1. Lee el prompt completo
2. Elige UNA opción (1, 2 o 3)
3. Para esa opción, genera TODOS los archivos:
   - Código fuente completo
   - Documentación
   - Scripts de validación
   - Ejemplos de uso

4. Sigue estas reglas:
   ✅ Código production-ready
   ✅ Error handling completo
   ✅ Logging structured
   ✅ Documentación en cada archivo
   ✅ Tests/validación incluidos
   ✅ Rollback plan documentado
   ✅ Security best practices
   ✅ Performance optimizado

5. Para cada archivo, incluye:
   - Shebang/declaraciones al inicio
   - Comentarios explicativos
   - Usage examples
   - Troubleshooting section

## ENTREGA ESPERADA

Cada tarea genera:
1. Código fuente completo
2. Archivo setup/installation
3. Documentación de uso
4. Script de validación
5. Rollback procedure

## EJEMPLO DE VALIDACIÓN

Después de entregar código, proporciona:
```bash
# Test que lo generado funciona
npm run build  # o comando equivalente
./validate-[feature].sh
```

## CONTEXTO TÉCNICO ADICIONAL

**Directorios clave:**
- /home/edu/autorenta/apps/web (Angular app)
- /home/edu/autorenta/functions/workers/payments_webhook (Cloudflare Worker)
- /home/edu/autorenta/supabase/functions (Edge Functions)
- /home/edu/autorenta/supabase/migrations (DB migrations)
- /home/edu/autorenta/.github/workflows (CI/CD)
- /home/edu/autorenta/tools (scripts)

**URLs importantes:**
- Supabase: https://obxvffplochgeiclibng.supabase.co
- Cloudflare: https://dash.cloudflare.com
- GitHub: https://github.com/ecucondorSA/autorenta
- MercadoPago: https://www.mercadopago.com.ar/business

**Credenciales:**
Usuario configurará en tiempo de ejecución (no hardcodear)

## PREGUNTAS A RESOLVER

- ¿Cuál opción quieres implementar primero?
- ¿Alguna preferencia de herramientas/tecnologías?
- ¿Necesitás ejemplos antes de generar código completo?
- ¿Hay constraints de timing o recursos?

## STATUS ACTUAL

- TypeScript errors: 130 (bloqueador #1)
- Secrets setup: 0% (bloqueador #2)
- Build status: ❌ FAILING
- Deploy status: ❌ MANUAL ONLY

Después de tu ejecución:
- Build status: ✅ PASSING
- Deploy status: ✅ AUTOMATED
- Test coverage: ✅ 90%+

---

**Soy tu experto en infraestructura. Cuéntame qué necesitas y lo hago realidad.**
```

---

## 🚀 CÓMO USAR ESTE PROMPT

### OPCIÓN A: Copilot Desktop
```
1. Copiar todo el prompt maestro
2. Abrir Copilot Desktop
3. Pegar en chat
4. Presionar Enter
5. Seguir instrucciones
```

### OPCIÓN B: GitHub Copilot en VS Code
```
1. Abrir VS Code
2. Ctrl+Shift+I (Inline Chat)
3. Pegar prompt
4. Ctrl+Enter para enviar
5. Copilot generará código en editor
```

### OPCIÓN C: Copilot Web
```
1. https://copilot.microsoft.com
2. New chat
3. Pegar prompt completo
4. Enviar
5. Copilot responderá en web
```

---

## 📋 CHECKLIST DESPUÉS DE COPILOT

- [ ] Todos los archivos generados
- [ ] Build exitoso
- [ ] Tests pasando
- [ ] Documentación completa
- [ ] Scripts validados
- [ ] Rollback plan documentado
- [ ] Listos para commit a GitHub
- [ ] Status actualizado a 60%+

---

*Prompt generado para Copilot*
*Versión: 1.0*
*Diseñado para maestría en infraestructura*


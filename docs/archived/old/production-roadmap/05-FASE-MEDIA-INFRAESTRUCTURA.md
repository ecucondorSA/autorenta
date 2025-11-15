# 🏗️ Fase 05: Infraestructura y Operaciones

**Prioridad:** 🟡 MEDIA  
**Duración estimada:** 7 días  
**Dependencias:** Fases 01-04 ✅  
**Bloqueante para:** Producción

---

## 📋 Índice

1. [Objetivo](#objetivo)
2. [Staging Environment](#staging-environment)
3. [CI/CD Pipelines](#cicd-pipelines)
4. [Monitoring y Observability](#monitoring-y-observability)
5. [Backups y Disaster Recovery](#backups-y-disaster-recovery)
6. [Performance y Escalabilidad](#performance-y-escalabilidad)

---

## 🎯 Objetivo

Establecer infraestructura production-ready con:
- Ambiente de staging espejado a producción
- Deployments automatizados y seguros
- Monitoreo 24/7 con alertas
- Backups automatizados y recovery plan
- Performance optimizado

---

## 🌍 Staging Environment

### Arquitectura

```
Production Stack:
├─ Frontend: Cloudflare Pages (autorenta.com.ar)
├─ Backend: Supabase (obxvffplochgeiclibng)
├─ Workers: Cloudflare Workers (3 workers)
├─ DB: PostgreSQL (Supabase)
└─ Payments: MercadoPago

Staging Stack:
├─ Frontend: Cloudflare Pages (staging.autorenta.com.ar)
├─ Backend: Supabase Project separado (staging-autorenta)
├─ Workers: Cloudflare Workers (staging-*)
├─ DB: PostgreSQL (Supabase staging)
└─ Payments: MercadoPago Sandbox
```

### Setup de Staging

#### 1. Crear Proyecto Supabase Staging

```bash
# Via Supabase Dashboard
# 1. Crear nuevo proyecto: "autorenta-staging"
# 2. Copiar credenciales

# Guardar en .env.staging
SUPABASE_URL_STAGING=https://staging-xxx.supabase.co
SUPABASE_ANON_KEY_STAGING=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY_STAGING=eyJhbGciOi...
DATABASE_URL_STAGING=postgresql://postgres:...
```

#### 2. Migrar Schema a Staging

```bash
#!/bin/bash
# scripts/setup-staging-db.sh

set -e

echo "🗄️  Migrando schema a staging..."

# Load staging credentials
source .env.staging

# Apply all migrations
for migration in supabase/migrations/*.sql; do
  echo "Aplicando: $migration"
  psql "$DATABASE_URL_STAGING" -f "$migration"
done

# Seed with test data
echo "📦 Seeding test data..."
psql "$DATABASE_URL_STAGING" -f supabase/seed-staging.sql

echo "✅ Staging DB listo"
```

**seed-staging.sql:**
```sql
-- Test users
INSERT INTO auth.users (id, email) VALUES
('11111111-1111-1111-1111-111111111111', 'test-owner@staging.com'),
('22222222-2222-2222-2222-222222222222', 'test-renter@staging.com');

-- Test cars
INSERT INTO cars (id, owner_id, brand, model, year, daily_rate, status) VALUES
('car-test-001', '11111111-1111-1111-1111-111111111111', 'Toyota', 'Corolla', 2023, 5000, 'active'),
('car-test-002', '11111111-1111-1111-1111-111111111111', 'Honda', 'Civic', 2024, 6000, 'active');

-- Test bookings
INSERT INTO bookings (id, car_id, renter_id, start_date, end_date, total_amount, status) VALUES
('booking-test-001', 'car-test-001', '22222222-2222-2222-2222-222222222222', '2025-11-01', '2025-11-05', 20000, 'confirmed');
```

#### 3. Deploy Workers a Staging

```bash
# functions/workers/payments_webhook/wrangler.staging.toml
name = "staging-payments-webhook"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[env.staging]
vars = { ENVIRONMENT = "staging" }

[[env.staging.unsafe.bindings]]
name = "SUPABASE_URL"
type = "secret_text"

[[env.staging.unsafe.bindings]]
name = "MERCADOPAGO_ACCESS_TOKEN"
type = "secret_text"
```

```bash
# Deploy
cd functions/workers/payments_webhook
wrangler deploy --env staging

# Set secrets
echo "$SUPABASE_URL_STAGING" | wrangler secret put SUPABASE_URL --env staging
echo "$MERCADOPAGO_TEST_ACCESS_TOKEN" | wrangler secret put MERCADOPAGO_ACCESS_TOKEN --env staging
```

#### 4. Deploy Frontend a Staging

```bash
# Cloudflare Pages: staging branch
# 1. Create new Pages project: "autorenta-staging"
# 2. Connect to git branch: "staging"
# 3. Build settings:
#    - Build command: npm run build
#    - Build output: apps/web/dist/web/browser
#    - Root directory: /

# Environment variables en Cloudflare
NG_APP_SUPABASE_URL=$SUPABASE_URL_STAGING
NG_APP_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY_STAGING
NG_APP_MAPBOX_ACCESS_TOKEN=$MAPBOX_ACCESS_TOKEN
NG_APP_MERCADOPAGO_PUBLIC_KEY=$MERCADOPAGO_TEST_PUBLIC_KEY
NG_APP_PAYMENTS_WEBHOOK_URL=https://staging-payments-webhook.workers.dev
```

---

## 🔄 CI/CD Pipelines

### GitHub Actions Workflows

#### 1. Pull Request Checks

```yaml
# .github/workflows/pr-checks.yml
name: PR Checks

on:
  pull_request:
    branches: [main, staging]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
  
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:ci
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
  
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build
      - name: Check build size
        run: |
          SIZE=$(du -sm apps/web/dist | cut -f1)
          if [ $SIZE -gt 50 ]; then
            echo "::error::Build size too large: ${SIZE}MB"
            exit 1
          fi
  
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm audit --audit-level=high
      - run: ./scripts/validate-no-secrets.sh
```

#### 2. Deploy to Staging

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy Staging

on:
  push:
    branches: [staging]

jobs:
  deploy-db:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run migrations
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL_STAGING }}
        run: |
          for migration in supabase/migrations/*.sql; do
            psql "$DATABASE_URL" -f "$migration"
          done
  
  deploy-workers:
    runs-on: ubuntu-latest
    needs: deploy-db
    steps:
      - uses: actions/checkout@v4
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: 'functions/workers/payments_webhook'
          command: deploy --env staging
  
  deploy-frontend:
    runs-on: ubuntu-latest
    needs: [deploy-db, deploy-workers]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - name: Build
        env:
          NG_APP_SUPABASE_URL: ${{ secrets.SUPABASE_URL_STAGING }}
          NG_APP_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY_STAGING }}
        run: npm run build
      - uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: autorenta-staging
          directory: apps/web/dist/web/browser
  
  smoke-tests:
    runs-on: ubuntu-latest
    needs: deploy-frontend
    steps:
      - uses: actions/checkout@v4
      - name: Health check
        run: |
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://staging.autorenta.com.ar)
          if [ "$STATUS" != "200" ]; then
            echo "::error::Staging site is down"
            exit 1
          fi
      - name: Run E2E smoke tests
        run: npm run test:e2e:smoke
```

#### 3. Deploy to Production

```yaml
# .github/workflows/deploy-production.yml
name: Deploy Production

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  verify-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:ci
      - name: E2E tests
        run: npm run test:e2e
      - name: Fail if coverage < 60%
        run: |
          COVERAGE=$(jq '.total.lines.pct' coverage/coverage-summary.json)
          if (( $(echo "$COVERAGE < 60" | bc -l) )); then
            echo "::error::Coverage too low: ${COVERAGE}%"
            exit 1
          fi
  
  create-backup:
    runs-on: ubuntu-latest
    steps:
      - name: Backup production DB
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          BACKUP_BUCKET: ${{ secrets.BACKUP_BUCKET }}
        run: |
          TIMESTAMP=$(date +%Y%m%d_%H%M%S)
          pg_dump "$DATABASE_URL" | gzip > backup_${TIMESTAMP}.sql.gz
          # Upload to S3/R2
          aws s3 cp backup_${TIMESTAMP}.sql.gz s3://$BACKUP_BUCKET/
  
  deploy:
    runs-on: ubuntu-latest
    needs: [verify-tests, create-backup]
    environment: production
    steps:
      - uses: actions/checkout@v4
      # Similar a staging pero con env de producción
      - name: Deploy DB migrations
        run: # ...
      - name: Deploy workers
        run: # ...
      - name: Deploy frontend
        run: # ...
  
  verify-deployment:
    runs-on: ubuntu-latest
    needs: deploy
    steps:
      - name: Smoke tests
        run: |
          # Verificar que producción responde
          curl -f https://autorenta.com.ar || exit 1
      - name: Notify success
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -d '{"text":"✅ Deploy to production successful"}'
```

---

## 📊 Monitoring y Observability

### 1. Logging Centralizado

**Cloudflare Workers Logs:**
```typescript
// functions/workers/payments_webhook/src/logger.ts

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, any>;
  error?: Error;
}

export class Logger {
  constructor(private env: Env) {}
  
  async log(entry: LogEntry) {
    // Log to console
    console.log(JSON.stringify(entry));
    
    // Send to logging service (e.g., Axiom, Datadog)
    if (this.env.AXIOM_TOKEN) {
      await fetch('https://api.axiom.co/v1/datasets/logs/ingest', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.AXIOM_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([{
          ...entry,
          service: 'payments-webhook'
        }])
      });
    }
  }
  
  info(message: string, context?: Record<string, any>) {
    return this.log({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context
    });
  }
  
  error(message: string, error?: Error, context?: Record<string, any>) {
    return this.log({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      error: error ? {
        message: error.message,
        stack: error.stack
      } : undefined,
      context
    });
  }
}
```

### 2. Métricas y Alertas

**Supabase Monitoring:**
```sql
-- Create monitoring views
CREATE VIEW v_system_health AS
SELECT
  (SELECT COUNT(*) FROM bookings WHERE status = 'pending_payment' AND created_at < NOW() - INTERVAL '1 hour') as stale_bookings,
  (SELECT COUNT(*) FROM bookings WHERE created_at > NOW() - INTERVAL '1 hour') as recent_bookings,
  (SELECT COUNT(*) FROM wallet_transactions WHERE status = 'pending' AND created_at < NOW() - INTERVAL '15 minutes') as stale_transactions,
  (SELECT COUNT(*) FROM cars WHERE status = 'active') as active_cars,
  (SELECT AVG(total_amount) FROM bookings WHERE created_at > NOW() - INTERVAL '24 hours') as avg_booking_amount_24h;

-- Function to check health and send alerts
CREATE OR REPLACE FUNCTION check_system_health()
RETURNS void AS $$
DECLARE
  health_metrics v_system_health%ROWTYPE;
  alert_message TEXT;
BEGIN
  SELECT * INTO health_metrics FROM v_system_health;
  
  -- Alert if too many stale bookings
  IF health_metrics.stale_bookings > 5 THEN
    alert_message := format('⚠️ %s bookings pending payment for >1hr', health_metrics.stale_bookings);
    PERFORM pg_notify('system_alerts', alert_message);
  END IF;
  
  -- Alert if no recent bookings (possible downtime)
  IF health_metrics.recent_bookings = 0 THEN
    alert_message := '🔴 No bookings in last hour - possible downtime';
    PERFORM pg_notify('system_alerts', alert_message);
  END IF;
  
  -- Alert if stale transactions
  IF health_metrics.stale_transactions > 3 THEN
    alert_message := format('⚠️ %s transactions stuck in pending', health_metrics.stale_transactions);
    PERFORM pg_notify('system_alerts', alert_message);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Run every 5 minutes
SELECT cron.schedule('check-health', '*/5 * * * *', 'SELECT check_system_health()');
```

**Alert Handler (Cloudflare Worker):**
```typescript
// functions/workers/alert-handler/src/index.ts

export default {
  async scheduled(event: ScheduledEvent, env: Env) {
    // Check metrics from Supabase
    const { data: health } = await supabase
      .from('v_system_health')
      .select('*')
      .single();
    
    const alerts = [];
    
    if (health.stale_bookings > 5) {
      alerts.push({
        severity: 'warning',
        message: `${health.stale_bookings} stale bookings`
      });
    }
    
    if (health.stale_transactions > 3) {
      alerts.push({
        severity: 'warning',
        message: `${health.stale_transactions} stuck transactions`
      });
    }
    
    // Send alerts to Slack
    if (alerts.length > 0) {
      await fetch(env.SLACK_WEBHOOK, {
        method: 'POST',
        body: JSON.stringify({
          text: '🚨 System Health Alerts',
          blocks: alerts.map(alert => ({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${alert.severity}:* ${alert.message}`
            }
          }))
        })
      });
    }
  }
};
```

### 3. Dashboards

**Grafana Dashboard (ejemplo config):**
```json
{
  "dashboard": {
    "title": "AutoRenta - Production Metrics",
    "panels": [
      {
        "title": "Bookings per Hour",
        "targets": [{
          "expr": "SELECT COUNT(*) FROM bookings WHERE created_at > NOW() - INTERVAL '1 hour' GROUP BY date_trunc('hour', created_at)"
        }]
      },
      {
        "title": "Payment Success Rate",
        "targets": [{
          "expr": "SELECT status, COUNT(*) FROM bookings WHERE created_at > NOW() - INTERVAL '24 hours' GROUP BY status"
        }]
      },
      {
        "title": "Average Booking Value",
        "targets": [{
          "expr": "SELECT AVG(total_amount) FROM bookings WHERE created_at > NOW() - INTERVAL '24 hours'"
        }]
      },
      {
        "title": "Active Users",
        "targets": [{
          "expr": "SELECT COUNT(DISTINCT user_id) FROM bookings WHERE created_at > NOW() - INTERVAL '24 hours'"
        }]
      }
    ]
  }
}
```

---

## 💾 Backups y Disaster Recovery

### Backup Strategy

**Automated Daily Backups:**
```bash
#!/bin/bash
# scripts/backup-production.sh

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="autorenta_backup_${TIMESTAMP}.sql.gz"

echo "📦 Starting backup..."

# 1. Dump database
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"

# 2. Upload to Cloudflare R2 (S3-compatible)
wrangler r2 object put "autorenta-backups/$BACKUP_FILE" \
  --file "$BACKUP_FILE"

# 3. Keep only last 30 days
wrangler r2 object list autorenta-backups \
  | jq -r '.[] | select(.uploaded < (now - 2592000) | .key' \
  | xargs -I {} wrangler r2 object delete autorenta-backups/{}

# 4. Verify backup
echo "✅ Backup completed: $BACKUP_FILE"
echo "📊 Size: $(du -h $BACKUP_FILE | cut -f1)"

# 5. Test restore (on staging)
if [ "$TEST_RESTORE" = "true" ]; then
  echo "🧪 Testing restore on staging..."
  gunzip < "$BACKUP_FILE" | psql "$DATABASE_URL_STAGING"
  echo "✅ Restore test successful"
fi

# Cleanup local file
rm "$BACKUP_FILE"
```

**Automated in CI/CD:**
```yaml
# .github/workflows/daily-backup.yml
name: Daily Backup

on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM UTC daily

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run backup
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        run: ./scripts/backup-production.sh
      - name: Notify
        if: failure()
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -d '{"text":"❌ Daily backup failed!"}'
```

### Disaster Recovery Plan

**RTO (Recovery Time Objective):** 4 hours  
**RPO (Recovery Point Objective):** 24 hours (backups diarios)

**Recovery Procedure:**
```bash
#!/bin/bash
# scripts/disaster-recovery.sh

set -e

echo "🚨 DISASTER RECOVERY PROCEDURE"
echo "================================"
echo ""

# 1. Get latest backup
echo "1️⃣  Fetching latest backup..."
LATEST_BACKUP=$(wrangler r2 object list autorenta-backups \
  --json | jq -r 'sort_by(.uploaded) | last | .key')

echo "   Latest backup: $LATEST_BACKUP"

wrangler r2 object get "autorenta-backups/$LATEST_BACKUP" \
  --file latest_backup.sql.gz

# 2. Restore to new database
echo "2️⃣  Restoring database..."
gunzip < latest_backup.sql.gz | psql "$NEW_DATABASE_URL"

# 3. Run migrations if needed
echo "3️⃣  Running pending migrations..."
for migration in supabase/migrations/*.sql; do
  psql "$NEW_DATABASE_URL" -f "$migration" || true
done

# 4. Verify data integrity
echo "4️⃣  Verifying data integrity..."
psql "$NEW_DATABASE_URL" -c "
  SELECT 
    COUNT(*) as total_users,
    (SELECT COUNT(*) FROM cars) as total_cars,
    (SELECT COUNT(*) FROM bookings) as total_bookings
  FROM auth.users
"

# 5. Update connection strings
echo "5️⃣  Update connection strings in:"
echo "   - Cloudflare Workers"
echo "   - Supabase Edge Functions"
echo "   - Frontend env variables"

echo ""
echo "✅ Recovery complete"
echo "⚠️  Remember to:"
echo "   1. Update DNS if needed"
echo "   2. Verify webhooks are working"
echo "   3. Test critical flows"
```

---

## ⚡ Performance y Escalabilidad

### Database Optimization

**Indexes Críticos:**
```sql
-- supabase/migrations/performance_indexes.sql

-- Bookings lookups
CREATE INDEX CONCURRENTLY idx_bookings_renter_id_status 
  ON bookings(renter_id, status);

CREATE INDEX CONCURRENTLY idx_bookings_car_id_dates 
  ON bookings(car_id, start_date, end_date);

-- Cars search
CREATE INDEX CONCURRENTLY idx_cars_location 
  ON cars USING GIST(location);

CREATE INDEX CONCURRENTLY idx_cars_status_brand 
  ON cars(status, brand);

-- Wallet transactions
CREATE INDEX CONCURRENTLY idx_wallet_user_created 
  ON wallet_transactions(user_id, created_at DESC);

-- Optimize queries
ANALYZE bookings;
ANALYZE cars;
ANALYZE wallet_transactions;
```

### Caching Strategy

```typescript
// apps/web/src/app/core/services/cache.service.ts

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  private cache = new Map<string, { data: any; expiry: number }>();
  
  set(key: string, data: any, ttlSeconds: number = 300) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + (ttlSeconds * 1000)
    });
  }
  
  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  invalidate(pattern: string) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

// Usage
async getAvailableCars(filters: CarFilters) {
  const cacheKey = `cars:available:${JSON.stringify(filters)}`;
  
  let cars = this.cacheService.get(cacheKey);
  
  if (!cars) {
    cars = await this.fetchCarsFromDB(filters);
    this.cacheService.set(cacheKey, cars, 60); // 1 min TTL
  }
  
  return cars;
}
```

---

## ✅ Criterios de Aceptación

### Fase 05 Completa Cuando:

1. **Environments Setup**
   - ✅ Staging environment funcional
   - ✅ Espejado de producción
   - ✅ Datos de prueba cargados

2. **CI/CD Funcionando**
   - ✅ PR checks automáticos
   - ✅ Deploy a staging automatizado
   - ✅ Deploy a production con aprobación

3. **Monitoring Activo**
   - ✅ Logs centralizados
   - ✅ Métricas en dashboard
   - ✅ Alertas configuradas

4. **Backups Automatizados**
   - ✅ Backups diarios funcionando
   - ✅ Restore procedure probado
   - ✅ DR plan documentado

5. **Performance Optimizado**
   - ✅ Indexes creados
   - ✅ Queries optimizadas
   - ✅ Caching implementado

---

## 🔄 Siguiente Fase

**→ Fase 06: Polish y Preparación para Lanzamiento**

---

**Última actualización:** 2025-10-28  
**Estado:** 🟡 Pendiente de implementación

# 🤖 COPILOT - TAREAS DE MAESTRÍA
**Infraestructura que Copilot hace de forma PERFECTA**

---

## ⚡ QUICK START

**Copilot es MEJOR que Claude Code para:**
- ✅ GitHub Actions YAML
- ✅ Supabase SQL/RLS/Edge Functions
- ✅ Cloudflare configuration
- ✅ Database schema design
- ✅ Bash automation scripts
- ✅ Infrastructure as Code

**Total: 6 tareas, 11-16 horas, 80% automatizable**

---

## 🎯 TAREAS DE COPILOT (Solo infraestructura)

### TAREA #2A: Supabase Edge Functions (1-2 horas)
**Copilot generará:**
- `supabase/functions/mercadopago-webhook/index.ts`
- `supabase/functions/mercadopago-create-preference/index.ts`
- `supabase/functions/mercadopago-create-booking-preference/index.ts`

**Características:**
- Validación de firma MercadoPago
- Error handling robusto
- Logging structured
- Secrets management

---

### TAREA #2B: Database Migrations (2-3 horas)
**Copilot generará:**
- Fijar tabla `booking_risk_snapshots`
- Crear tablas Split Payment
- RPC functions para procesar pagos
- Índices optimizados
- RLS audit

**SQL a generar:**
```sql
-- booking_risk_snapshots fix
-- wallet_split_config table
-- withdrawal_requests table
-- bank_accounts table
-- RPCs: process_split_payment(), process_withdrawal()
-- Índices de performance
```

---

### TAREA #6: GitHub Actions CI/CD (2-3 horas)
**Copilot generará 4 workflows:**

1. **lint-and-test.yml** (en cada PR)
   - ESLint + TypeScript check
   - Unit tests
   - E2E tests

2. **build-and-deploy.yml** (en main)
   - Build Angular
   - Deploy Pages
   - Deploy Worker
   - Smoke tests

3. **security-scan.yml** (semanal)
   - OWASP check
   - Secrets detection
   - SAST analysis

4. **performance-monitor.yml** (post-deploy)
   - Lighthouse
   - Bundle size
   - Performance regression

---

### TAREA #7A: Cloudflare Pages Setup (1-1.5 horas)
**Copilot generará:**
- `wrangler.toml` optimizado
- Environment variables config
- DNS setup
- Preview environments

---

### TAREA #7B: Cloudflare Workers Config (1-1.5 horas)
**Copilot generará:**
- `functions/workers/payments_webhook/wrangler.toml`
- KV namespace setup
- Secrets configuration
- Error handling & logging

---

### TAREA #8A: Cron Jobs & Automation (1-2 horas)
**Copilot generará SQL:**
- `expire-pending-deposits` (cada hora)
- `poll-pending-payments` (cada 3 min)
- `sync-binance-rates` (cada 15 min)
- `update-demand-snapshots` (cada 15 min)
- `cleanup-old-logs` (diario)

---

### TAREA #8B: Logging Infrastructure (1.5-2 horas)
**Copilot generará:**
- Tablas de logging
- Índices optimizados
- Vistas SQL para búsqueda
- RLS policies
- Sentry integration

---

### TAREA #9: Infrastructure Scripts (2-3 horas)
**Copilot generará:**
- `tools/deploy-pages.sh`
- `tools/deploy-worker.sh`
- `tools/setup-production.sh`
- `tools/backup-database.sh`
- `tools/monitor-health.sh`
- `tools/rollback.sh`

---

## 📊 RESUMEN RÁPIDO

| Tarea | Tipo | Esfuerzo | Copilot |
|-------|------|----------|---------|
| #2A | Supabase Functions | 1-2h | ✅ 100% |
| #2B | Database Migrations | 2-3h | ✅ 100% |
| #6 | GitHub Actions | 2-3h | ✅ 100% |
| #7A | Cloudflare Pages | 1-1.5h | ✅ 100% |
| #7B | Cloudflare Workers | 1-1.5h | ✅ 100% |
| #8A | Cron Jobs | 1-2h | ✅ 100% |
| #8B | Logging | 1.5-2h | ✅ 100% |
| #9 | Scripts | 2-3h | ✅ 100% |
| **TOTAL** | | **11-16h** | **✅ MAESTRÍA** |

---

## 🚀 CÓMO DESPERTAR A COPILOT

### Opción 1: Copilot Desktop (RECOMENDADO)
```
1. Descargar: https://copilot.microsoft.com/copilotpro
2. Abrir aplicación
3. New Chat
4. Copiar PROMPT_PARA_COPILOT (ver abajo)
5. Pegar y enviar
6. Copilot genera código completo
```

### Opción 2: VS Code Copilot Chat
```
1. Ctrl+Shift+I (Inline Chat)
2. Copiar PROMPT_PARA_COPILOT
3. Pegar
4. Ctrl+Enter
5. Genera en editor
```

### Opción 3: GitHub Copilot Web
```
1. https://copilot.microsoft.com
2. New Chat
3. Pegar PROMPT_PARA_COPILOT
4. Enviar
5. Copilot responde
```

---

## 💬 PROMPT OPTIMIZADO PARA COPILOT

```markdown
# TAREAS DE INFRAESTRUCTURA - AUTORENTA

Eres experto en: GitHub Actions, Supabase, Cloudflare, SQL, Bash

## TAREA 1: Supabase Edge Functions (1-2h)

Crear 3 functions en TypeScript/Deno:

1. mercadopago-webhook/index.ts
   - Recibe POST /mercadopago-webhook
   - Valida firma MercadoPago
   - Procesa payment.created, payment.updated, order.updated
   - Llama RPC wallet_confirm_deposit()
   - Usa idempotency (KV o DB)
   - Logging structured
   - Retorna 200 OK

2. mercadopago-create-preference/index.ts
   - Recibe: amount, user_id, transaction_id
   - Crea preferencia MercadoPago
   - Guarda en payment_intents table
   - Retorna init_point

3. mercadopago-create-booking-preference/index.ts
   - Split payment para locador (90%) + plataforma (10%)
   - Crea preference con multiple recipients
   - Retorna preference_id

Incluye:
- Error handling robusto
- Secrets management (env vars)
- Logging to Supabase
- TypeScript types

---

## TAREA 2: Database Migrations (2-3h)

Generar SQL migration con:

1. Fijar tabla booking_risk_snapshots
   - Tabla plural (la app lee de aquí)
   - Migrar datos si existe singular

2. Crear tablas Split Payment:
   - wallet_split_config
   - withdrawal_requests
   - bank_accounts
   - withdrawal_transactions

3. Crear RPCs:
   - process_split_payment(booking_id, amount)
   - process_withdrawal(request_id, transfer_id)
   - verify_bank_account(user_id, account)

4. Crear índices:
   - wallet_transactions: (user_id, created_at DESC)
   - bookings: (owner_id, status, created_at DESC)

5. Auditar RLS policies

6. Archivo: supabase/migrations/[timestamp]_add_split_payment.sql

---

## TAREA 3: GitHub Actions (2-3h)

Generar 4 workflows en .github/workflows/:

1. lint-and-test.yml
   - Trigger: on: [push, pull_request]
   - ESLint check
   - TypeScript build
   - Karma tests
   - Playwright E2E

2. build-and-deploy.yml
   - Trigger: on: [push main]
   - Build Angular
   - Deploy Pages
   - Deploy Worker
   - Smoke tests

3. security-scan.yml
   - Trigger: schedule: cron '0 0 * * 0'
   - npm audit
   - Secret scan
   - Dependency check

4. performance-monitor.yml
   - Trigger: post-deploy
   - Lighthouse scores
   - Bundle size analysis
   - Performance metrics

---

## TAREA 4: Cloudflare Pages (1-1.5h)

Generar wrangler.toml + docs:

- Build command: npm run build:web
- Output: apps/web/dist/browser
- Environment vars para production
- Custom domain: autorenta.com
- Preview environments

---

## TAREA 5: Cloudflare Workers (1-1.5h)

Generar para functions/workers/payments_webhook:

- wrangler.toml con KV namespace
- Secrets: MERCADOPAGO_ACCESS_TOKEN, SUPABASE_*
- KV para idempotency
- Error handling
- Logging

---

## TAREA 6: Cron Jobs (1-2h)

Generar SQL para pg_cron:

1. expire-pending-deposits (0 * * * *)
2. poll-pending-payments (*/3 * * * *)
3. sync-binance-rates (*/15 * * * *)
4. update-demand-snapshots (*/15 * * * *)
5. cleanup-old-logs (0 2 * * *)

Cada uno con:
- Lógica SQL completa
- Error handling
- Logging
- Rollback plan

---

## TAREA 7: Logging Infrastructure (1.5-2h)

Generar SQL + functions:

Tables: worker_logs, webhook_logs, api_logs
- structured logging schema
- Índices de performance
- Vistas SQL para búsqueda
- RLS policies
- Cleanup cron

---

## TAREA 8: Infrastructure Scripts (2-3h)

Generar en tools/:

1. deploy-pages.sh
2. deploy-worker.sh
3. setup-production.sh
4. backup-database.sh
5. monitor-health.sh
6. rollback.sh

Cada uno:
- Error handling completo
- Validaciones
- Logging
- Mensajes claros
- Dry-run mode

---

## INSTRUCCIONES

- Código production-ready
- Documentación completa
- Tests/validación incluidos
- Rollback plan
- Security best practices
- Performance optimizado

Genera TODO completo, no solo esqueletos.
```

---

## ✅ QUÉ ESPERAR DE COPILOT

Cuando envíes el prompt, Copilot generará:

✅ Código fuente completo (no templates)
✅ Archivos listos para usar
✅ Documentación incluida
✅ Ejemplos de uso
✅ Error handling robusto
✅ Security best practices
✅ Performance optimizado

---

## 📋 DESPUÉS DE COPILOT

**Copilot genera → Vos validás → Git commit**

```bash
# 1. Recibir código de Copilot
# 2. Copiar archivos a proyecto
# 3. Validar que compila/funciona
# 4. Commitear

git add -A
git commit -m "feat: Add infrastructure automation (Copilot)

Generated by Copilot:
- Edge Functions (Supabase)
- Database migrations
- GitHub Actions workflows
- Cloudflare configuration
- Cron jobs setup
- Logging infrastructure
- Deployment scripts

Ready for production deployment"

git push origin main
```

---

## 🎯 TIMELINE CON COPILOT

**Hoy (28 Oct):**
- Despierta a Copilot con prompt
- Copilot genera código (1-2h)
- Vos validas (1-2h)
- Resultado: 11-16 horas de trabajo = HECHO en 2-4h

**Mañana (29 Oct):**
- Deploy infraestructura
- Tests de humo
- Status: 60% → 80%

**Fin de semana:**
- Go-live ready

---

## 🔗 ARCHIVO COMPLETO

**Para referencias completas, ver:**
- `TAREAS_INFRAESTRUCTURA_PARA_COPILOT.md` (completo, detallado)

**Este archivo:**
- `COPILOT_MAESTRIA.md` (versión corta, accionable)

---

## 🚀 COMIENZA AHORA

1. Copiar prompt arriba ↑
2. Abrir Copilot
3. Pegar prompt
4. **"Hacer esto para AutoRenta"**
5. Copilot genera infraestructura completa
6. ✅ 11-16 horas de trabajo = HECHO

---

**Status después de Copilot:**
- 47% → 80% (o más)
- Build: ✅ Passing
- Deploy: ✅ Automated
- Tests: ✅ Running
- Logs: ✅ Observable

🎉 **Listo para GO-LIVE**


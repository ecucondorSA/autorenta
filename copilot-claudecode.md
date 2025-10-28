# 🎯 CLAUDE CODE PRODUCTION ROADMAP - FASE 1: DOCUMENTACIÓN Y SECRETOS

**PROYECTO**: AutoRenta - Camino al 100% Production Ready  
**FECHA INICIO**: 2025-10-28  
**SESIÓN**: Non-interactive mode con monitoreo Copilot  
**DATABASE PASSWORD**: ECUCONDOR08122023

---

## 📋 CONTEXTO CRÍTICO

Actualmente estamos al **40% production-ready**. Los gaps críticos identificados:

1. **Seguridad y secretos** (0%) - Credenciales expuestas en código
2. **Sistema de cobro del locador** (30%) - Split payments incompletos
3. **Checkout locatario** (50%) - Bugs en risk snapshots y success page
4. **Tests y CI/CD** (40%) - Tests golpean producción
5. **Infraestructura** (40%) - Sin staging, sin IaC, sin monitoring

---

## 🎯 TU MISIÓN - FASE 1: FUNDAMENTOS (NO DUPLICAR CON COPILOT)

**Copilot está trabajando en**: Implementaciones de código, fixes de bugs, integraciones

**Tú trabajarás en**: Documentación, secretos, configuración, runbooks operativos

---

## 📝 FASE 1: DOCUMENTACIÓN Y SECRETS MANAGEMENT (PRIORIDAD INMEDIATA)

### ✅ PASO 1.1: Crear Sistema de Secrets (HAZLO AHORA)

```bash
# Crear estructura de secrets
mkdir -p /home/edu/autorenta/config/secrets
mkdir -p /home/edu/autorenta/config/environments
mkdir -p /home/edu/autorenta/docs/runbooks
```

**Archivo 1**: `/home/edu/autorenta/config/secrets/README.md`
```markdown
# 🔐 Secrets Management Guide

## Production Secrets (NUNCA en Git)
- SUPABASE_URL
- SUPABASE_ANON_KEY  
- SUPABASE_SERVICE_ROLE_KEY
- MERCADOPAGO_PROD_ACCESS_TOKEN
- MERCADOPAGO_PROD_PUBLIC_KEY
- MAPBOX_ACCESS_TOKEN
- DATABASE_URL (con password: ECUCONDOR08122023)

## Test Secrets
- MERCADOPAGO_TEST_ACCESS_TOKEN
- MERCADOPAGO_TEST_PUBLIC_KEY

## Dónde configurar:
1. GitHub Actions: Settings → Secrets → Actions
2. Cloudflare Workers: wrangler.toml (usar wrangler secret put)
3. Supabase Edge Functions: supabase secrets set
4. Local dev: .env.local (en .gitignore)

## Rotación de secretos:
Ver: docs/runbooks/secret-rotation.md
```

**Archivo 2**: `/home/edu/autorenta/config/environments/.env.production.template`
```bash
# Production Environment Variables Template
# NEVER commit real values - this is just structure

# Supabase
SUPABASE_URL=https://obxvffplochgeiclibng.supabase.co
SUPABASE_ANON_KEY=<SET_IN_GITHUB_SECRETS>
SUPABASE_SERVICE_ROLE_KEY=<SET_IN_GITHUB_SECRETS>
DATABASE_URL=postgresql://postgres.obxvffplochgeiclibng:<PASSWORD>@aws-1-us-east-2.pooler.supabase.com:6543/postgres

# Mercado Pago
MERCADOPAGO_PROD_ACCESS_TOKEN=<SET_IN_GITHUB_SECRETS>
MERCADOPAGO_PROD_PUBLIC_KEY=<SET_IN_GITHUB_SECRETS>

# Mapbox
MAPBOX_ACCESS_TOKEN=<SET_IN_GITHUB_SECRETS>

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=<SET_IN_GITHUB_SECRETS>
CLOUDFLARE_API_TOKEN=<SET_IN_GITHUB_SECRETS>
```

**Archivo 3**: `/home/edu/autorenta/config/environments/.env.test.template`
```bash
# Test Environment Variables Template

# Supabase (puede ser mismo de prod con RLS)
SUPABASE_URL=https://obxvffplochgeiclibng.supabase.co
SUPABASE_ANON_KEY=<SET_IN_GITHUB_SECRETS>

# Mercado Pago TEST
MERCADOPAGO_TEST_ACCESS_TOKEN=TEST-INVESTIGAR-KEY
MERCADOPAGO_TEST_PUBLIC_KEY=TEST-INVESTIGAR-KEY

# Test Users
TEST_RENTER_EMAIL=test-renter@autorenta.com
TEST_RENTER_PASSWORD=TestPassword123!
TEST_OWNER_EMAIL=test-owner@autorenta.com
TEST_OWNER_PASSWORD=TestPassword123!
```

---

### ✅ PASO 1.2: Auditar y Limpiar Secrets Expuestos

**Archivo 4**: `/home/edu/autorenta/docs/SECURITY_AUDIT.md`

Audita estos archivos y documenta qué secrets encontraste:
- `apps/web/public/env.js:5-11`
- `apply_migration.sh:8-19`
- `verify-real-payments.sh:6`
- Cualquier otro `.sh`, `.ts`, `.js` con tokens hardcodeados

**Formato del documento**:
```markdown
# Security Audit - Exposed Secrets

## Archivos con Secrets Hardcodeados

### apps/web/public/env.js
- **Líneas**: 5-11
- **Secrets encontrados**: [listar]
- **Nivel de riesgo**: CRÍTICO / ALTO / MEDIO
- **Acción requerida**: [describir]

### apply_migration.sh
- **Líneas**: 8-19
- **Secrets encontrados**: [listar]
- **Nivel de riesgo**: CRÍTICO / ALTO / MEDIO
- **Acción requerida**: [describir]

## Plan de Remediación
1. [ ] Mover a .env.local
2. [ ] Agregar a .gitignore
3. [ ] Actualizar GitHub Secrets
4. [ ] Modificar scripts para leer de env vars
5. [ ] Rotar secrets expuestos
```

---

### ✅ PASO 1.3: Crear Runbooks Operativos

**Archivo 5**: `/home/edu/autorenta/docs/runbooks/split-payment-failure.md`
```markdown
# 🚨 Runbook: Split Payment Failure

## Síntomas
- Reserva creada pero locador no recibe su porcentaje
- Wallet de plataforma tiene fondos pero no se distribuyeron

## Diagnóstico
```sql
-- Verificar split payments pendientes
SELECT 
  b.id,
  b.total_price,
  b.status,
  c.owner_id,
  u.email as owner_email
FROM bookings b
JOIN cars c ON c.id = b.car_id
JOIN users u ON u.id = c.owner_id
WHERE b.payment_status = 'approved'
  AND b.created_at > NOW() - INTERVAL '24 hours'
ORDER BY b.created_at DESC;
```

## Solución Manual
1. Conectar a Supabase: `postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@...`
2. Ejecutar release manual:
```sql
-- [Instrucciones paso a paso]
```

## Prevención
- Verificar webhook de MP está activo
- Monitorear tabla wallet_ledger
- Alertas automáticas (TODO)
```

**Archivo 6**: `/home/edu/autorenta/docs/runbooks/database-backup-restore.md`
```markdown
# 💾 Runbook: Database Backup & Restore

## Backup Manual
```bash
# Conexión
export PGPASSWORD=ECUCONDOR08122023
export DB_URL="postgresql://postgres.obxvffplochgeiclibng@aws-1-us-east-2.pooler.supabase.com:6543/postgres"

# Full backup
pg_dump $DB_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup específico (solo datos)
pg_dump -a $DB_URL > backup_data_only.sql
```

## Restore desde Backup
```bash
psql $DB_URL < backup_YYYYMMDD_HHMMSS.sql
```

## Backup Supabase Dashboard
1. Dashboard → Settings → Database
2. Use daily auto-backups (incluido en plan)
3. Point-in-time recovery: últimas 24hrs

## Frecuencia Recomendada
- Manual: Antes de migraciones grandes
- Automático: Diario (configurado por Supabase)
```

**Archivo 7**: `/home/edu/autorenta/docs/runbooks/secret-rotation.md`
```markdown
# 🔄 Runbook: Secret Rotation

## Cuándo Rotar
- Cada 90 días (calendario)
- Inmediatamente si se expone en Git
- Después de offboarding de miembro del equipo

## Mercado Pago Access Token

1. **Generar nuevo token**:
   - Login a Mercado Pago
   - Credenciales → Crear nuevo Access Token
   - Copiar token

2. **Actualizar GitHub Secrets**:
   ```bash
   gh secret set MERCADOPAGO_PROD_ACCESS_TOKEN -b"<new_token>"
   ```

3. **Actualizar Cloudflare Worker**:
   ```bash
   cd apps/workers/mercadopago
   wrangler secret put MERCADOPAGO_ACCESS_TOKEN
   # Pegar nuevo token cuando pida
   ```

4. **Verificar funcionamiento**:
   ```bash
   ./verify-real-payments.sh
   ```

5. **Revocar token anterior** en dashboard MP

## Supabase Keys
- Anon key: Regenerar en Dashboard → API Settings
- Service role: Solo rotar si comprometido
- Actualizar en todos los secrets stores

## Checklist Post-Rotación
- [ ] GitHub Actions passing
- [ ] Cloudflare Worker responde
- [ ] Supabase Edge Functions activos
- [ ] Test payment exitoso
```

---

### ✅ PASO 1.4: GitHub Actions Secrets Setup

**Archivo 8**: `/home/edu/autorenta/docs/GITHUB_SECRETS_SETUP.md`
```markdown
# ⚙️ GitHub Actions Secrets Configuration

## Secrets Requeridos

### 1. Supabase
```bash
gh secret set SUPABASE_URL -b"https://obxvffplochgeiclibng.supabase.co"
gh secret set SUPABASE_ANON_KEY -b"<BUSCAR_EN_SUPABASE_DASHBOARD>"
gh secret set SUPABASE_SERVICE_ROLE_KEY -b"<BUSCAR_EN_SUPABASE_DASHBOARD>"
gh secret set DATABASE_URL -b"postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres"
```

### 2. Mercado Pago
```bash
gh secret set MERCADOPAGO_PROD_ACCESS_TOKEN -b"<BUSCAR_EN_MP_DASHBOARD>"
gh secret set MERCADOPAGO_TEST_ACCESS_TOKEN -b"<INVESTIGAR_TEST_KEY>"
```

### 3. Mapbox
```bash
gh secret set MAPBOX_ACCESS_TOKEN -b"<BUSCAR_EN_MAPBOX_DASHBOARD>"
```

### 4. Cloudflare
```bash
gh secret set CLOUDFLARE_ACCOUNT_ID -b"<TU_ACCOUNT_ID>"
gh secret set CLOUDFLARE_API_TOKEN -b"<TU_API_TOKEN>"
```

## Verificar Secrets
```bash
gh secret list
```

## Usar en Workflows
```yaml
env:
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```
```

---

### ✅ PASO 1.5: Crear Test Users en Supabase

**Archivo 9**: `/home/edu/autorenta/docs/TEST_USERS_SETUP.md`
```markdown
# 👥 Test Users Configuration

## Crear Test Renter

1. **Conectar a Supabase**:
```bash
export PGPASSWORD=ECUCONDOR08122023
psql postgresql://postgres.obxvffplochgeiclibng@aws-1-us-east-2.pooler.supabase.com:6543/postgres
```

2. **Crear usuario**:
```sql
-- Via Supabase Auth (preferido)
-- Dashboard → Authentication → Users → Add User
-- Email: test-renter@autorenta.com
-- Password: TestPassword123!
-- Auto Confirm: Yes

-- O via SQL (si Dashboard no funciona)
INSERT INTO auth.users (
  email,
  encrypted_password,
  email_confirmed_at,
  role,
  created_at,
  updated_at
) VALUES (
  'test-renter@autorenta.com',
  crypt('TestPassword123!', gen_salt('bf')),
  NOW(),
  'authenticated',
  NOW(),
  NOW()
);
```

3. **Crear perfil**:
```sql
INSERT INTO public.users (id, email, role, created_at)
SELECT id, email, 'renter', NOW()
FROM auth.users 
WHERE email = 'test-renter@autorenta.com';
```

## Crear Test Owner

Repetir proceso con:
- Email: test-owner@autorenta.com
- Password: TestPassword123!
- Role: 'owner'

## Verificar
```sql
SELECT u.email, p.role 
FROM auth.users u
JOIN public.users p ON p.id = u.id
WHERE u.email LIKE 'test-%';
```

## Uso en Tests
```typescript
// tests/fixtures/auth.setup.ts
const TEST_USERS = {
  renter: {
    email: 'test-renter@autorenta.com',
    password: 'TestPassword123!'
  },
  owner: {
    email: 'test-owner@autorenta.com',
    password: 'TestPassword123!'
  }
};
```
```

---

### ✅ PASO 1.6: Documentar Estado Actual (Baseline)

**Archivo 10**: `/home/edu/autorenta/docs/PRODUCTION_READINESS_BASELINE.md`
```markdown
# 📊 Production Readiness - Estado Actual (Baseline)

**Fecha**: 2025-10-28  
**Evaluación Global**: 40% Production Ready

## Categorías Evaluadas

### 1. Seguridad y Secretos: 0% ❌
- [x] Credenciales expuestas en código
- [ ] Secrets en GitHub Actions
- [ ] Secrets en Cloudflare Workers
- [ ] Secrets en Supabase Edge Functions
- [ ] .env.local configurado
- [ ] .gitignore actualizado
- [ ] Secrets rotados

**Bloqueante para producción**: SÍ

### 2. Sistema de Cobro Locador: 30% 🟡
- [x] Auto publicado aunque MP onboarding incompleto
- [x] Split payment no automático
- [ ] Validación estado MP antes de activar auto
- [ ] Webhook split payments configurado
- [ ] Runbook manual splits

**Bloqueante para producción**: SÍ

### 3. Checkout Locatario: 50% 🟡
- [x] Bug: booking_risk_snapshots (plural) inexistente
- [x] Bug: getCarName() retorna literal
- [ ] Risk snapshot corregido
- [ ] Success page muestra datos reales
- [ ] Tests E2E validados

**Bloqueante para producción**: PARCIAL

### 4. Tests y CI/CD: 40% 🟡
- [x] Tests golpean producción
- [x] sessionStorage.getItem no seteado
- [ ] Tests usan test environment
- [ ] Mock de MP callbacks
- [ ] Storage states en Git
- [ ] Tests pasan en CI

**Bloqueante para producción**: SÍ (tests no confiables)

### 5. Infraestructura: 40% 🟡
- [x] Sin staging real
- [x] Sin IaC (Infrastructure as Code)
- [x] Scripts manuales para deploy
- [ ] Staging environment
- [ ] Terraform/Pulumi config
- [ ] Monitoring (Sentry, etc)
- [ ] Logs centralizados

**Bloqueante para producción**: PARCIAL

## Próximos Pasos Críticos (Orden de Prioridad)

1. ✅ **FASE 1**: Secrets y documentación (TÚ - Claude Code)
2. 🔄 **FASE 2**: Fixes de bugs críticos (Copilot)
3. 🔄 **FASE 3**: Tests environment separation (Ambos)
4. 🔄 **FASE 4**: Staging + IaC (Ambos)
5. 🔄 **FASE 5**: Monitoring + runbooks (TÚ)

## Métricas de Éxito

| Categoría | Actual | Objetivo | Gap |
|-----------|--------|----------|-----|
| Seguridad | 0% | 100% | 100% |
| Cobro Locador | 30% | 95% | 65% |
| Checkout | 50% | 95% | 45% |
| Tests/CI | 40% | 90% | 50% |
| Infra | 40% | 85% | 45% |
| **TOTAL** | **40%** | **93%** | **53%** |
```

---

## 🔍 SISTEMA DE MONITOREO (Cómo Copilot te supervisa)

Copilot está monitoreando tu trabajo cada 3 segundos via TMUX:
- Cambios en archivos (últimos 2 minutos)
- Procesos claude activos
- Output de tus comandos

**Si Copilot detecta un error**, actualizará este archivo con:
```markdown
## ⚠️ CORRECCIÓN REQUERIDA [2025-10-28 10:XX]

**Archivo**: /ruta/al/archivo.md
**Problema**: [Descripción del error]
**Corrección**: [Qué debes hacer]
```

**Tú debes**:
1. Leer la sección `CORRECCIÓN REQUERIDA`
2. Aplicar el fix
3. Responder aquí: `✅ CORREGIDO: [descripción breve]`

---

## 📊 PROGRESO - FASE 1

Actualiza este checklist a medida que completes:

- [x] ✅ 1.1: Estructura de directorios creada
- [x] ✅ 1.1: README.md de secrets
- [x] ✅ 1.1: .env.production.template
- [x] ✅ 1.1: .env.test.template
- [x] ✅ 1.2: SECURITY_AUDIT.md completo
- [x] ✅ 1.3: split-payment-failure.md runbook
- [x] ✅ 1.3: database-backup-restore.md runbook
- [x] ✅ 1.3: secret-rotation.md runbook
- [x] ✅ 1.4: GITHUB_SECRETS_SETUP.md
- [x] ✅ 1.5: TEST_USERS_SETUP.md
- [x] ✅ 1.6: PRODUCTION_READINESS_BASELINE.md
- [ ] ⏳ 1.7: Ejecutar scripts de setup (GitHub secrets, test users)

---

## 🚀 FASE 2 (SIGUIENTE - Esperar a que Copilot termine su parte)

Una vez completes FASE 1, reporta aquí:
```
✅ FASE 1 COMPLETA - [timestamp]
Archivos creados: [número]
Secrets auditados: [número]
Runbooks creados: [número]
```

Luego esperaremos sincronización con Copilot para:
- Aplicar fixes de secrets en código
- Implementar validaciones MP onboarding
- Corregir bugs de checkout
- Separar test environment

---

## 📝 NOTAS Y OBSERVACIONES

[Usa esta sección para anotar dudas, problemas, o descubrimientos importantes]

---

## 🆘 SI NECESITAS AYUDA

1. **No estés seguro de algo**: Anótalo en NOTAS y continúa con lo siguiente
2. **Error bloqueante**: Escribe `🚨 BLOQUEADO: [razón]` y espera corrección de Copilot
3. **Task ambigua**: Escribe `❓ CLARIFICACIÓN: [pregunta]`

---

**IMPORTANTE**: 
- NO modifiques código TypeScript/JavaScript (eso es de Copilot)
- SÍ puedes crear scripts SQL, bash de setup
- SÍ puedes crear toda la documentación
- NO dupliques archivos que ya existen
- SÍ puedes mejorar/expandir documentación existente

**COMIENZA AHORA CON PASO 1.1** 🚀

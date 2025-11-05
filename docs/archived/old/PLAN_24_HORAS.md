# ⏰ PLAN DE ACCIÓN - 24 HORAS
**AutoRenta - Resolver Bloqueadores Críticos**
**Objetivo**: 47% → 60% en 24 horas

---

## 📍 PUNTO DE PARTIDA

- **Estado**: 47% producción ready
- **Bloqueadores**: 3 críticos
- **Tiempo disponible**: 24 horas
- **Objetivo**: Resolver bloqueadores para permitir builds y pagos básicos
- **Resultado**: 60% producción ready

---

## 🎯 PLAN HORARIO

### HORA 0 (AHORA) - Diagnóstico (15 minutos)

```bash
# 1. Verificar estado actual del build
cd /home/edu/autorenta/apps/web
npm run build 2>&1 | head -100

# 2. Contar errores
npm run build 2>&1 | grep "error TS" | wc -l

# 3. Ver archivos problemáticos
npm run build 2>&1 | grep "error TS" | cut -d: -f1 | sort -u | head -10
```

**Checklist**:
- [ ] Confirmado: ~130 errores TypeScript
- [ ] Identificados: Archivos principales con errores
- [ ] Documentación: TAREAS_PENDIENTES_PRODUCCION_2025-10-28.md leído

---

### HORAS 1-4 - BLOQUEADOR #1: TypeScript Fixes (4 horas)

#### Fase A: Análisis rápido (15 min)
```bash
# Agrupar errores por tipo
npm run build 2>&1 | grep "error TS" > /tmp/ts-errors.txt

# Analizar errores principales
cat /tmp/ts-errors.txt | cut -d: -f2 | sort | uniq -c | sort -rn | head -20
```

#### Fase B: Fixes de HIGH IMPACT (2-3 horas)
**Prioridad**: Archivos con > 5 errores cada uno

```bash
# Top problemas (probable):
# 1. guided-tour.service.ts - NewTourId type (5+ errors)
# 2. bookings.service.ts - Property type mismatches (6+ errors)
# 3. marketplace.service.ts - Response type mismatches (7+ errors)
# 4. messaging.service.ts - Type conversions (8+ errors)
```

**Para cada archivo**:
```typescript
// 1. Abrir archivo
// 2. Leer errores de build output
// 3. Aplicar fix estándar:
//    - Agregar tipos explícitos
//    - Usar 'as' type assertions donde sea necesario
//    - Importar tipos faltantes
// 4. Verificar con: npm run build (incremental)
```

#### Fase C: Build validation (30 min)
```bash
# Limpiar build
rm -rf dist node_modules/.angular

# Compilar limpio
npm run build 2>&1 | tee build-final.log

# Contar errores finales
grep "error TS" build-final.log | wc -l
```

**Meta**: Reducir de ~130 a 0 errores (o <10 con 'skipLibCheck')

---

### HORAS 5-6 - BLOQUEADOR #2: Setup Secrets Parte A (2 horas)

#### SUBBLOQUE: Preparar credenciales (30 min)
**Requisitos**: Tener a mano:
- [ ] MercadoPago Access Token (App_USR-...)
- [ ] Supabase Project URL
- [ ] Supabase Service Role Key

**Donde conseguirlos**:
```
MercadoPago: https://www.mercadopago.com.ar/account/credentials
Supabase: https://obxvffplochgeiclibng.supabase.co/project/settings/api
```

#### SUBBLOQUE: Cloudflare Workers Secrets (45 min)
```bash
# 1. Cambiar a directorio del worker
cd /home/edu/autorenta/functions/workers/payments_webhook

# 2. Verificar wrangler.toml existe
cat wrangler.toml

# 3. Configurar secrets interactivamente
wrangler secret put SUPABASE_URL
# Pegar: https://obxvffplochgeiclibng.supabase.co

wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Pegar: eyJhbGc...

wrangler secret put MERCADOPAGO_ACCESS_TOKEN
# Pegar: APP_USR-...

# 4. Verificar que se guardaron
wrangler secret list
```

**Validación**:
```bash
✅ SUPABASE_URL
✅ SUPABASE_SERVICE_ROLE_KEY
✅ MERCADOPAGO_ACCESS_TOKEN
```

#### SUBBLOQUE: Crear .env.local (15 min)
```bash
# En root del proyecto
cp config/environments/.env.production.template .env.local

# Editar con valores
nano .env.local

# Contenido esperado:
# NG_APP_SUPABASE_URL=https://obxvffplochgeiclibng.supabase.co
# NG_APP_SUPABASE_ANON_KEY=eyJhbGc...
# NG_APP_ENVIRONMENT=production
# NG_APP_MERCADOPAGO_PUBLIC_KEY=TEST-...
```

---

### HORAS 7-8 - BLOQUEADOR #2: Setup Secrets Parte B (1-2 horas)

#### SUBBLOQUE: Supabase Edge Functions Secrets (1 hora)
```bash
# 1. Login a Supabase CLI
supabase login

# 2. Link proyecto
supabase link --project-ref obxvffplochgeiclibng

# 3. Set secrets
supabase secrets set MERCADOPAGO_ACCESS_TOKEN="APP_USR-..."
supabase secrets set SUPABASE_URL="https://obxvffplochgeiclibng.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="eyJhbGc..."

# 4. Verificar
supabase secrets list
```

**Output esperado**:
```
✅ MERCADOPAGO_ACCESS_TOKEN
✅ SUPABASE_URL
✅ SUPABASE_SERVICE_ROLE_KEY
```

#### SUBBLOQUE: Testing local (30 min)
```bash
# 1. Cambiar a web app
cd /home/edu/autorenta/apps/web

# 2. Cargar variables
source ../../.env.local

# 3. Testear conexión a Supabase
npm run build  # Debería pasar con env variables

# 4. Ejecutar dev server
npm run start  # http://localhost:4200
```

---

### HORAS 9-10 - BLOQUEADOR #3: MercadoPago Webhook Setup (1-2 horas)

#### SUBBLOQUE: Configurar Webhook URL (30 min)

**Opción A: Local Testing**
```bash
# Terminal 1: Iniciar worker local
cd /home/edu/autorenta/functions/workers/payments_webhook
npm run dev

# Terminal 2: Test webhook
curl -X POST http://localhost:8787/webhooks/payments \
  -H "Content-Type: application/json" \
  -d '{
    "action":"payment.created",
    "data":{
      "id":"123456",
      "status":"approved",
      "status_detail":"accredited"
    }
  }'

# Resultado esperado:
# HTTP 200 OK con JSON response
```

**Opción B: Producción Setup (después)**
```
URL: https://[cloudflare-domain].pages.dev/api/webhooks/payments
IP Whitelist: MP -> Cloudflare
Testing: 1 trans de prueba
```

#### SUBBLOQUE: Validación de Webhook (30 min)
```bash
# 1. Revisar logs del worker
npm run dev 2>&1 | tail -20

# 2. Test con payload real de MercadoPago
curl -X POST http://localhost:8787/webhooks/payments \
  -H "x-signature: $(date +%s)" \
  -H "Content-Type: application/json" \
  -d @test-payload.json

# 3. Verificar en base de datos
# SELECT * FROM wallet_transactions
# WHERE transaction_type = 'deposit'
# ORDER BY created_at DESC LIMIT 5
```

---

### HORAS 11-12 - Build Final & Testing (1-2 horas)

#### SUBBLOQUE: Build Limpio
```bash
cd /home/edu/autorenta

# 1. Instalar dependencias frescas
npm install  # O pnpm install

# 2. Build completo
npm run build 2>&1 | tee final-build.log

# 3. Verificar no hay errores
grep -c "error" final-build.log  # Debería ser 0 o < 5

# 4. Contar warnings (OK tener algunos)
grep -c "warning" final-build.log
```

#### SUBBLOQUE: Test de Pagos
```bash
# 1. Iniciar app
npm run dev:web

# 2. Ir a http://localhost:4200

# 3. Testear flujo básico:
#    a) Registrarse
#    b) Buscar auto
#    c) Solicitar booking
#    d) Ir a payment
#    e) Testear wallet fallback

# 4. Test webhook mock
npm run test:webhook  # Si script existe
# O manual:
curl -X POST http://localhost:8787/webhooks/payments \
  -H "Content-Type: application/json" \
  -d '{"provider":"mock","booking_id":"uuid-here","status":"approved"}'
```

---

### HORAS 13-24 - Documentación & Validación Final (11 horas)

#### SUBBLOQUE: Git Commit (30 min)
```bash
# 1. Ver cambios
git status
git diff apps/web --stat

# 2. Agregar cambios
git add .

# 3. Commit
git commit -m "feat: Fix TypeScript compilation + Setup Secrets

- Fixed 130 TypeScript errors across multiple services
- Setup Cloudflare Workers secrets configuration
- Setup Supabase Edge Functions secrets
- Created .env.local for environment variables
- Validated MercadoPago webhook integration

Fixes bloqueadores críticos #1, #2, #3

Allows: npm run build (exitoso)
Enables: Payment processing
Status: 47% → 60% producción ready"

# 4. Push
git push origin main
```

#### SUBBLOQUE: Documentación (30 min)
Crear archivo: `SESION_COMPLETADA_28_OCTUBRE.md`
```markdown
# ✅ SESIÓN COMPLETADA - 24 Horas
**Fecha**: 28 Octubre 2025
**Duración**: 24 horas
**Progreso**: 47% → 60%

## ✅ Logros

### Bloqueador #1: TypeScript ✅
- Errores iniciales: 130
- Errores finales: 0
- Tiempo: 4 horas
- Build status: PASSING

### Bloqueador #2: Secrets ✅
- Cloudflare setup: OK
- Supabase setup: OK
- .env.local: OK
- Tiempo: 2 horas

### Bloqueador #3: Webhook ✅
- Local testing: PASSING
- Payload validation: OK
- DB integration: Confirmed
- Tiempo: 1 hora

## 📊 Métricas
- Build time: ~90 segundos
- Build size: X MB
- Test coverage: YY%
- Commits: Z

## 🎯 Próximos Pasos
1. Start Fase 2: Split Payment (5-7h)
2. Create E2E Tests (3-4h)
...
```

#### SUBBLOQUE: Validación Final (1 hora)
Checklist:
- [ ] Build: `npm run build` exitoso
- [ ] Tests: `npm run test` pasando
- [ ] Git: commits pusheados
- [ ] Docs: Sesión documentada
- [ ] Status: Reportado en 60%

---

## ⏱️ TIMELINE COMPRIMIDO

```
HORA  TAREA                          DURACIÓN    ESTADO
────────────────────────────────────────────────────────
0     Diagnóstico inicial            15 min      ⏳
1-4   BLOQUEADOR #1: TypeScript      4 horas     ⏳
5-8   BLOQUEADOR #2: Secrets Part A  2 horas     ⏳
7-10  BLOQUEADOR #2: Secrets Part B  2 horas     ⏳
9-12  BLOQUEADOR #3: Webhook         2 horas     ⏳
13-24 Testing & Documentation        11 horas    ⏳
────────────────────────────────────────────────────────
      TOTAL                          24 horas    ⏳

RESULTADO: 47% → 60% ✅
```

---

## 🚨 PUNTOS CRÍTICOS

### Riesgo #1: No tener credenciales
**Mitigación**: Preparar credenciales ANTES de hora 5
**Backup**: Usar valores de test si necesario

### Riesgo #2: TypeScript fixes incompletos
**Mitigación**: Ejecutar `npm run build` incrementalmente
**Backup**: Usar `skipLibCheck: true` como último recurso

### Riesgo #3: Secrets no guardados
**Mitigación**: Verificar con `wrangler secret list` después de cada `put`
**Backup**: Usar .env.local como fallback temporal

---

## 📊 FORMATO DE REPORTE

Al completar cada hora, reportar:

```
HORA X - [TAREA]
─────────────────
Completado: ✅/❌
Errores: 0/X
Next: [próxima tarea]
Status: [verde/amarillo/rojo]
```

---

## 🎯 ÉXITO = CUANDO...

✅ `npm run build` ejecuta sin errores
✅ `wrangler secret list` muestra 3 secrets
✅ `supabase secrets list` muestra 3 secrets
✅ Webhook test returns HTTP 200
✅ Git commit pusheado exitosamente
✅ Documentación actualizada
✅ Status reportado: 60%

---

## 🔗 RECURSOS DURANTE EJECUCIÓN

**Documentación**:
- TAREAS_PENDIENTES_PRODUCCION_2025-10-28.md (detalles)
- RESUMEN_EJECUTIVO_TAREAS_PENDIENTES.md (contexto)

**Comandos rápidos**:
- Ver issues: `cd apps/web && npm run build 2>&1 | head -50`
- Verificar secrets: `wrangler secret list`
- Test webhook: `curl -X POST http://localhost:8787/webhooks/payments`

**Dashboards**:
- Cloudflare: https://dash.cloudflare.com
- Supabase: https://obxvffplochgeiclibng.supabase.co
- GitHub: https://github.com/ecucondorSA/autorenta

---

## 🎓 NOTAS IMPORTANTES

1. **No procrastinar en TypeScript**: Este es el bloqueador #1
2. **Verificar secretos después de cada paso**: Usar `list` commands
3. **Usar terminal separadas**: Una para build, una para tests
4. **Documentar problemas encontrados**: Para Fase 2
5. **Commit incrementalmente**: No esperar a las 24h para pushear

---

## 🏁 AL FINALIZAR (HORA 24)

- [ ] Todos los bloqueadores resueltos
- [ ] Status reportado: 60%
- [ ] Documentación actualizada
- [ ] Git limpio y pusheado
- [ ] Ready para Fase 2

**Siguiente**: PLAN_FASE_2.md (Split Payment, Tests, CI/CD)

---

*Plan creado*: 2025-10-28
*Responsable*: Desarrollador principal
*Validado por*: Claude Code

# 🔴 Issues Críticos - Bloqueantes para Producción

**Fecha**: 2025-11-10
**Repositorio**: ecucondorSA/autorenta
**Rama**: claude/autorentar-issues-deficiencies-011CUyZqL9Qq3kbBUkLHZkXk

---

## Resumen Ejecutivo

Se han identificado **7 deficiencias CRÍTICAS** que impiden que AutoRenta esté en producción de forma segura. Estos problemas pueden resultar en:

- 💰 Pérdida financiera directa (fraude de pagos)
- 🔓 Exposición de datos sensibles de usuarios
- 🚨 Acceso no autorizado a la plataforma
- ⚖️ Incumplimiento de compliance (PCI-DSS, SOC2)

**Acción requerida**: Crear los siguientes issues en GitHub y resolverlos antes de deployment a producción.

---

## Issue #1: 🔴 Webhook MercadoPago sin validación HMAC obligatoria

### Labels
`bug`, `security`, `critical`, `production-blocker`, `payments`

### Título
```
🔴 CRÍTICO: Webhook MercadoPago sin validación HMAC obligatoria
```

### Descripción
```markdown
## 🔴 Severidad: CRÍTICA - Bloqueante para Producción

### Descripción del Problema

El webhook de MercadoPago NO rechaza solicitudes sin firma HMAC válida. Si el header `x-signature` está ausente, el código solo registra un warning pero **continúa procesando el pago**.

### Ubicación del Código

**Archivo**: `supabase/functions/mercadopago-webhook/index.ts:357-359`

```typescript
if (!signature) {
  console.warn('⚠️ Webhook sin firma HMAC - deberíamos rechazar, por ahora solo loggeamos');
  // PROBLEMA: No hay return aquí, continúa ejecutando
}
```

### Impacto en Producción

- **Riesgo de Fraude**: Un atacante puede enviar webhooks falsos sin firma y acreditar dinero en wallets sin haber realizado un pago real
- **Pérdida Financiera**: Dinero acreditado fraudulentamente = pérdida directa para la plataforma
- **Compliance**: Viola las mejores prácticas de seguridad de MercadoPago

### Reproducción

1. Enviar POST a webhook endpoint sin header `x-signature`
2. Observar que el webhook procesa el pago normalmente
3. Verificar que la wallet se acredita sin validación de firma

### Solución Propuesta

```typescript
if (!signature) {
  console.error('❌ Webhook rechazado: firma HMAC ausente');
  return new Response(
    JSON.stringify({ error: 'Missing signature' }),
    { status: 401, headers: corsHeaders }
  );
}
```

### Referencias

- [MercadoPago Webhook Security](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks)
- Runbook: `docs/runbooks/troubleshooting.md`

### Checklist para Resolver

- [ ] Rechazar webhooks sin `x-signature` con HTTP 401
- [ ] Validar firma HMAC contra secret de MercadoPago
- [ ] Agregar tests para webhooks sin firma
- [ ] Agregar logging de intentos rechazados
- [ ] Alertar a security team de intentos de fraude

---
**Estimación**: 2-4 horas
**Prioridad**: P0 (Resolver antes de producción)
```

---

## Issue #2: 🔴 Secrets hardcodeados expuestos en código fuente

### Labels
`bug`, `security`, `critical`, `production-blocker`

### Título
```
🔴 CRÍTICO: Secrets hardcodeados expuestos en código fuente
```

### Descripción
```markdown
## 🔴 Severidad: CRÍTICA - Bloqueante para Producción

### Descripción del Problema

Múltiples API keys y tokens están **hardcodeados en código fuente** que se compila en el bundle JavaScript público, permitiendo a cualquier usuario extraerlos y abusar de ellos.

### Secrets Expuestos

**Archivo**: `apps/web/src/environments/environment.development.ts`

1. **Supabase Anon Key** (líneas 6-7)
   - **Riesgo**: Acceso completo a base de datos con RLS
   - **Impacto**: Lectura/escritura de datos de usuarios, autos, bookings

2. **Mapbox Token** (línea 10)
   - **Riesgo**: Billing fraud, reverse geocoding abuse, DDoS
   - **Impacto**: Costos elevados, bloqueo de cuenta Mapbox

3. **PayPal Client ID** (línea 17)
   - **Riesgo**: Creación de pagos no autorizados
   - **Impacto**: Transacciones fraudulentas

### Cómo Extraer los Secrets (Prueba de Concepto)

```bash
# Cualquier usuario puede hacer:
curl https://autorenta.com/main.js | grep -o "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9[^']*"
```

### Impacto en Producción

- **Data Breach**: Acceso no autorizado a datos de usuarios
- **Pérdida Financiera**: Abuse de APIs con billing
- **Compliance**: Violación de SOC2, PCI-DSS
- **Reputación**: Pérdida de confianza de usuarios

### Solución Propuesta

1. **Mover secrets a variables de entorno** (NO commitear):
   ```bash
   # .env.local (gitignored)
   NG_APP_SUPABASE_ANON_KEY=xxx
   NG_APP_MAPBOX_TOKEN=xxx
   NG_APP_PAYPAL_CLIENT_ID=xxx
   ```

2. **Usar en código**:
   ```typescript
   // environment.ts
   supabaseAnonKey: process.env['NG_APP_SUPABASE_ANON_KEY'] || ''
   ```

3. **Rotar todos los secrets comprometidos**:
   - [ ] Regenerar Supabase Anon Key
   - [ ] Regenerar Mapbox Token
   - [ ] Regenerar PayPal Client ID

### Referencias

- [OWASP: Hardcoded Passwords](https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password)
- Runbook: `docs/runbooks/secret-rotation.md`

### Checklist para Resolver

- [ ] Mover secrets a variables de entorno
- [ ] Agregar `.env.local.example` con placeholders
- [ ] Actualizar `CLAUDE_WORKFLOWS.md` con setup de secrets
- [ ] Rotar todos los secrets expuestos
- [ ] Agregar pre-commit hook para detectar secrets
- [ ] Escanear histórico de Git con `trufflehog` o `gitleaks`

---
**Estimación**: 4-6 horas (incluyendo rotación)
**Prioridad**: P0 (Resolver INMEDIATAMENTE)
```

---

## Issue #3: 🔴 CORS abierto a todo el mundo en Edge Functions

### Labels
`bug`, `security`, `critical`, `production-blocker`

### Título
```
🔴 CRÍTICO: CORS abierto (*) en 15+ Edge Functions
```

### Descripción
```markdown
## 🔴 Severidad: CRÍTICA - Bloqueante para Producción

### Descripción del Problema

Múltiples Edge Functions de Supabase tienen CORS configurado con `Access-Control-Allow-Origin: '*'`, permitiendo que **cualquier dominio** haga requests a APIs críticas.

### Ubicaciones Afectadas

**15+ Edge Functions** con esta configuración:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // ❌ PROBLEMA
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

**Funciones críticas afectadas**:
- `mercadopago-webhook` - Procesa pagos
- `mercadopago-create-preference` - Crea órdenes de pago
- `wallet-*` - Operaciones de dinero
- `booking-*` - Gestión de reservas

### Impacto en Producción

- **CSRF Attacks**: Sitios maliciosos pueden hacer requests en nombre de usuarios autenticados
- **Abuse de Recursos**: Bots pueden consumir quotas sin restricción
- **Rate Limiting Bypass**: Atacantes desde múltiples dominios
- **Data Harvesting**: Scripts maliciosos pueden extraer datos

### Escenario de Ataque

```javascript
// Desde sitio-malicioso.com
fetch('https://obxvffplochgeiclibng.supabase.co/functions/v1/wallet-withdraw', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + victim_token,  // Obtenido por XSS
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ amount: 10000 })
})
```

### Solución Propuesta

1. **Whitelist específica de dominios**:
```typescript
const allowedOrigins = [
  'https://autorenta.com',
  'https://autorenta-web.pages.dev',
  'http://localhost:4200'  // Solo para desarrollo
];

const origin = req.headers.get('Origin');
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : '',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Credentials': 'true'
};
```

2. **Crear utility helper**:
```typescript
// supabase/functions/_shared/cors.ts
export function getCorsHeaders(req: Request): HeadersInit {
  // ... lógica de whitelist
}
```

### Referencias

- [OWASP: CORS Misconfiguration](https://owasp.org/www-community/attacks/CORS_OriginHeaderScrutiny)
- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

### Checklist para Resolver

- [ ] Crear helper de CORS con whitelist
- [ ] Actualizar todas las Edge Functions
- [ ] Agregar validación de Origin en cada request
- [ ] Configurar CORS en Supabase dashboard
- [ ] Agregar tests para requests desde dominios no autorizados
- [ ] Documentar dominios permitidos en `CLAUDE.md`

---
**Estimación**: 3-4 horas
**Prioridad**: P0 (Resolver antes de producción)
```

---

## Issue #4: 🔴 Webhook retorna HTTP 200 incluso en errores críticos

### Labels
`bug`, `critical`, `production-blocker`, `payments`

### Título
```
🔴 CRÍTICO: Webhook retorna 200 OK en errores de base de datos
```

### Descripción
```markdown
## 🔴 Severidad: CRÍTICA - Bloqueante para Producción

### Descripción del Problema

El webhook de MercadoPago retorna `HTTP 200 OK` incluso cuando hay **errores críticos en la base de datos**, causando que MercadoPago marque el webhook como exitoso y **no reintente**.

### Ubicación del Código

**Archivo**: `supabase/functions/mercadopago-webhook/index.ts:1039`

```typescript
} catch (error) {
  console.error('Error en webhook:', error);
  return new Response(
    JSON.stringify({ success: true }),  // ❌ PROBLEMA: success: true en error
    { status: 200, headers: corsHeaders }  // ❌ PROBLEMA: 200 OK
  );
}
```

### Impacto en Producción

**Escenario real**:
1. Usuario paga $10,000 ARS con tarjeta
2. MercadoPago envía webhook de pago exitoso
3. Error en DB (connection timeout, constraint violation, etc.)
4. Webhook retorna 200 OK ✅
5. MercadoPago marca como procesado ✅
6. **RESULTADO**: Usuario pagó pero dinero nunca llega a su wallet ❌

### Consecuencias

- **Pérdida de dinero del usuario**: Pago real sin acreditación
- **Disputes con MercadoPago**: Usuario reclama el dinero
- **Soporte manual costoso**: Investigar y resolver cada caso
- **Pérdida de confianza**: Usuarios abandonan la plataforma

### Solución Propuesta

```typescript
} catch (error) {
  console.error('❌ Error procesando webhook:', error);

  // Enviar alerta inmediata
  await sendAlert({
    type: 'webhook_error',
    payment_id: paymentData.id,
    error: error.message
  });

  // Retornar 500 para que MP reintente
  return new Response(
    JSON.stringify({
      error: 'Internal server error',
      retry: true
    }),
    { status: 500, headers: corsHeaders }
  );
}
```

### MercadoPago Retry Policy

- HTTP 500/502/503: MercadoPago reintenta automáticamente
- Reintentos: Inmediato, +1h, +2h, +4h, +8h
- Máximo: 12 reintentos en 24 horas

### Referencias

- [MercadoPago: Notificaciones Webhooks](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks)
- Runbook: `docs/runbooks/split-payment-failure.md`

### Checklist para Resolver

- [ ] Retornar HTTP 500 en errores de DB
- [ ] Retornar HTTP 500 en errores de validación crítica
- [ ] Agregar alerta inmediata a admins en errores
- [ ] Implementar logging estructurado de webhooks
- [ ] Crear dashboard de monitoreo de webhooks
- [ ] Agregar tests para manejo de errores
- [ ] Documentar retry policy en runbook

---
**Estimación**: 2-3 horas
**Prioridad**: P0 (Resolver antes de producción)
```

---

## Issue #5: 🔴 Alertas de discrepancias de dinero NO implementadas

### Labels
`bug`, `critical`, `production-blocker`, `monitoring`, `payments`

### Título
```
🔴 CRÍTICO: TODO sin implementar - Alertas de discrepancias de dinero
```

### Descripción
```markdown
## 🔴 Severidad: CRÍTICA - Bloqueante para Producción

### Descripción del Problema

La función de reconciliación de wallet detecta discrepancias de dinero pero **NO envía alertas**. El TODO está sin implementar y las discrepancias se acumulan silenciosamente.

### Ubicación del Código

**Archivo**: `supabase/functions/wallet-reconciliation/index.ts:182`

```typescript
if (discrepancies.length > 0) {
  console.error('CRITICAL: Discrepancies detected!', discrepancies);
  // TODO: Enviar email/Slack notification a admins ❌ SIN IMPLEMENTAR
}
```

### Impacto en Producción

**Escenario real**:
1. Discrepancia de $50,000 ARS en wallets de usuarios
2. Se detecta en reconciliación ✅
3. Se loggea en consola ✅
4. **Nadie recibe alerta** ❌
5. Discrepancia crece a $500,000 ARS sin notificar ❌
6. Se descubre meses después en auditoría ❌

### Consecuencias

- **Pérdida financiera acumulada**: Discrepancias crecen sin detección
- **Compliance**: Auditorías fallan por falta de controles
- **Fraude sin detectar**: Actividad sospechosa pasa desapercibida
- **Riesgo legal**: Responsabilidad por mal manejo de fondos

### Tipos de Discrepancias a Alertar

1. **Balance mismatch**: `wallet.balance != SUM(transactions)`
2. **Locked balance mismatch**: Balance locked sin booking activo
3. **Negative balance**: Balance negativo (imposible)
4. **Orphan transactions**: Transacciones sin wallet
5. **Double-spend**: Misma transacción procesada 2 veces

### Solución Propuesta

**Opción 1: Slack Webhook** (Recomendado)

```typescript
async function alertDiscrepancies(discrepancies: Discrepancy[]) {
  const slackWebhook = Deno.env.get('SLACK_ALERTS_WEBHOOK')!;

  await fetch(slackWebhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: '🚨 CRITICAL: Wallet Discrepancies Detected',
      attachments: [{
        color: 'danger',
        fields: discrepancies.map(d => ({
          title: `User ${d.user_id}`,
          value: `Expected: ${d.expected} | Actual: ${d.actual} | Diff: ${d.difference}`,
          short: false
        }))
      }]
    })
  });
}
```

**Opción 2: Email via Resend/SendGrid**

```typescript
async function emailDiscrepancies(discrepancies: Discrepancy[]) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'alerts@autorenta.com',
      to: ['finance@autorenta.com', 'admin@autorenta.com'],
      subject: '🚨 CRITICAL: Wallet Discrepancies',
      html: generateDiscrepancyReport(discrepancies)
    })
  });
}
```

### Referencias

- [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks)
- [Resend API Docs](https://resend.com/docs/api-reference/emails/send-email)
- Runbook: `docs/runbooks/database-backup-restore.md`

### Checklist para Resolver

- [ ] Decidir canal de alertas (Slack vs Email)
- [ ] Configurar webhook/API key como secret
- [ ] Implementar función de alertas
- [ ] Definir niveles de severidad (warning vs critical)
- [ ] Agregar rate limiting (no spam de alertas)
- [ ] Crear dashboard de discrepancias en tiempo real
- [ ] Documentar proceso de respuesta a alertas
- [ ] Agregar tests para alertas

---
**Estimación**: 4-6 horas
**Prioridad**: P0 (Resolver antes de producción)
```

---

## Issue #6: 🟠 Archivo .backup.ts en árbol de código de producción

### Labels
`bug`, `code-quality`, `production-blocker`

### Título
```
🟠 HIGH: Archivo bookings.service.backup.ts en código de producción
```

### Descripción
```markdown
## 🟠 Severidad: HIGH - Bloqueante para Producción

### Descripción del Problema

Existe un archivo backup en el árbol de código que **NO debería estar en producción**.

### Ubicación del Código

**Archivo**: `apps/web/src/app/core/services/bookings.service.backup.ts`

### Impacto en Producción

- **Bundle size aumentado**: Código obsoleto incluido en build
- **Confusión en debugging**: Múltiples versiones del mismo servicio
- **Riesgo de importar código viejo**: Developer puede importar backup por error
- **Code smells**: Mala práctica de versionado

### Solución Propuesta

1. **Eliminar el archivo**:
   ```bash
   git rm apps/web/src/app/core/services/bookings.service.backup.ts
   ```

2. **Usar Git para historial**:
   ```bash
   # Si se necesita ver código viejo:
   git log --all --full-history -- apps/web/src/app/core/services/bookings.service.ts
   git show <commit-hash>:apps/web/src/app/core/services/bookings.service.ts
   ```

3. **Agregar regla de linting**:
   ```javascript
   // eslint.config.mjs
   rules: {
     'no-restricted-imports': ['error', {
       patterns: ['*.backup.*']
     }]
   }
   ```

### Checklist para Resolver

- [ ] Revisar si hay diferencias importantes vs archivo actual
- [ ] Documentar cualquier lógica útil del backup
- [ ] Eliminar archivo con `git rm`
- [ ] Agregar regla de linting para prevenir .backup files
- [ ] Buscar otros archivos .backup: `find . -name "*.backup.*"`

---
**Estimación**: 30 minutos
**Prioridad**: P1 (Resolver antes de producción)
```

---

## Issue #7: 🟠 Validaciones insuficientes en transacciones de dinero

### Labels
`bug`, `security`, `payments`, `production-blocker`

### Título
```
🟠 HIGH: Validaciones insuficientes en formulario de retiro de dinero
```

### Descripción
```markdown
## 🟠 Severidad: HIGH - Bloqueante para Producción

### Descripción del Problema

El formulario de retiro de dinero tiene validaciones **insuficientes**, permitiendo valores negativos, cero, o mayores al balance disponible.

### Ubicaciones Afectadas

**Frontend**: `apps/web/src/app/features/wallet/components/withdraw-form.component.ts`
**Backend**: `supabase/functions/wallet-withdraw/index.ts`

### Problemas Específicos

1. **Validación de monto mínimo/máximo**:
   ```typescript
   // Frontend permite cualquier número
   amount: [null, Validators.required]  // ❌ Falta validación de rango
   ```

2. **Validación de balance**:
   ```typescript
   // No valida si tiene fondos suficientes
   if (amount > user.wallet.balance) {  // ❌ Validación solo en backend
     // Usuario ve error después de submit
   }
   ```

3. **Validación de fondos bloqueados**:
   ```typescript
   // No considera locked_balance
   const available = balance - locked_balance;
   if (amount > available) {  // ❌ No implementado en frontend
     // Error inesperado para usuario
   }
   ```

### Impacto en Producción

- **UX pobre**: Usuario intenta retirar, error recién en backend
- **Carga innecesaria**: Requests inválidos al servidor
- **Potencial fraude**: Race conditions si validación solo en frontend

### Solución Propuesta

**Frontend** (`withdraw-form.component.ts`):

```typescript
export class WithdrawFormComponent {
  private readonly MIN_WITHDRAW = 100;  // ARS 100 mínimo

  availableBalance = computed(() => {
    const wallet = this.wallet();
    return wallet.balance - wallet.locked_balance;
  });

  form = this.fb.group({
    amount: [
      null,
      [
        Validators.required,
        Validators.min(this.MIN_WITHDRAW),
        Validators.max(this.availableBalance()),
        this.validateAvailableBalance()
      ]
    ],
    cbu: [null, [Validators.required, this.validateCBU()]]
  });

  private validateAvailableBalance(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const amount = control.value;
      if (amount > this.availableBalance()) {
        return { insufficientFunds: true };
      }
      return null;
    };
  }

  private validateCBU(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const cbu = control.value;
      if (!/^\d{22}$/.test(cbu)) {
        return { invalidCBU: true };
      }
      return null;
    };
  }
}
```

**Backend** (`wallet-withdraw/index.ts`):

```typescript
// SIEMPRE validar en backend (defense in depth)
if (amount < 100) {
  return new Response(
    JSON.stringify({ error: 'Monto mínimo: ARS 100' }),
    { status: 400 }
  );
}

if (amount > (wallet.balance - wallet.locked_balance)) {
  return new Response(
    JSON.stringify({ error: 'Fondos insuficientes' }),
    { status: 400 }
  );
}

// Validar CBU formato
if (!/^\d{22}$/.test(cbu)) {
  return new Response(
    JSON.stringify({ error: 'CBU inválido' }),
    { status: 400 }
  );
}
```

### Referencias

- [Validación de CBU Argentina](https://www.bcra.gob.ar/SistemasFinancierosYdePagos/Gestion_de_pagos.asp)
- Runbook: `docs/runbooks/troubleshooting.md`

### Checklist para Resolver

- [ ] Agregar validaciones de rango en frontend
- [ ] Implementar validación de available_balance
- [ ] Agregar validación de formato CBU
- [ ] Duplicar todas las validaciones en backend
- [ ] Agregar tests unitarios para cada validación
- [ ] Agregar tests E2E para casos edge
- [ ] Documentar límites de retiro en UI

---
**Estimación**: 3-4 horas
**Prioridad**: P1 (Resolver antes de producción)
```

---

## Resumen de Acciones

### Prioridad P0 (Resolver INMEDIATAMENTE)

1. ✅ Issue #1: Validación HMAC en webhook
2. ✅ Issue #2: Rotar y mover secrets
3. ✅ Issue #3: CORS whitelist
4. ✅ Issue #4: Error handling en webhook
5. ✅ Issue #5: Implementar alertas

### Prioridad P1 (Antes de producción)

6. ✅ Issue #6: Eliminar archivo .backup
7. ✅ Issue #7: Validaciones de transacciones

---

## Cómo Crear los Issues

### Opción 1: Manual (vía GitHub Web)

1. Ir a: https://github.com/ecucondorSA/autorenta/issues/new
2. Copiar título y descripción de cada issue
3. Agregar labels correspondientes
4. Asignar a developer responsable

### Opción 2: Usando gh CLI (si está instalado localmente)

```bash
# Desde tu máquina local (con gh instalado):
cd ~/autorenta

# Issue #1
gh issue create \
  --title "🔴 CRÍTICO: Webhook MercadoPago sin validación HMAC obligatoria" \
  --body-file <(cat PRODUCTION_BLOCKERS.md | sed -n '/^## Issue #1/,/^## Issue #2/p') \
  --label "bug,security,critical,production-blocker,payments"

# Issue #2
gh issue create \
  --title "🔴 CRÍTICO: Secrets hardcodeados expuestos en código fuente" \
  --body-file <(cat PRODUCTION_BLOCKERS.md | sed -n '/^## Issue #2/,/^## Issue #3/p') \
  --label "bug,security,critical,production-blocker"

# ... (repetir para los demás)
```

### Opción 3: Usando script automatizado

```bash
# Crear script create-issues.sh
chmod +x tools/create-issues.sh
./tools/create-issues.sh
```

---

## Métricas de Impacto

### Antes de Resolver

- **Riesgo de fraude**: ALTO (webhook sin HMAC)
- **Riesgo de data breach**: ALTO (secrets expuestos)
- **Riesgo financiero**: ALTO (alertas no implementadas)
- **Ready for production**: ❌ NO

### Después de Resolver

- **Riesgo de fraude**: BAJO (HMAC + CORS + validaciones)
- **Riesgo de data breach**: BAJO (secrets rotados)
- **Riesgo financiero**: BAJO (alertas activas)
- **Ready for production**: ✅ SÍ

---

**Próximos Pasos**:
1. Crear los 7 issues en GitHub
2. Asignar a developers
3. Resolver en orden de prioridad (P0 primero)
4. Code review exhaustivo
5. Testing en staging
6. Deploy a producción

---

**Documentado por**: Claude Code
**Fecha**: 2025-11-10

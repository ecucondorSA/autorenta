#!/bin/bash

# Script para crear issues críticos de producción en GitHub
# Uso: ./tools/create-production-blockers.sh

set -e

echo "🔴 Creando issues críticos de producción en GitHub..."
echo ""

# Verificar que gh está instalado
if ! command -v gh &> /dev/null; then
    echo "❌ Error: gh CLI no está instalado"
    echo "Instalar con: brew install gh (macOS) o sudo apt install gh (Linux)"
    exit 1
fi

# Verificar autenticación
if ! gh auth status &> /dev/null; then
    echo "❌ Error: No estás autenticado en GitHub"
    echo "Ejecutar: gh auth login"
    exit 1
fi

echo "✅ gh CLI configurado correctamente"
echo ""

# Issue #1: Webhook HMAC
echo "📝 Creando Issue #1: Webhook HMAC..."
gh issue create \
  --title "🔴 CRÍTICO: Webhook MercadoPago sin validación HMAC obligatoria" \
  --label "bug,security,critical,production-blocker,payments" \
  --body "$(cat <<'EOF'
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

### Checklist para Resolver

- [ ] Rechazar webhooks sin `x-signature` con HTTP 401
- [ ] Validar firma HMAC contra secret de MercadoPago
- [ ] Agregar tests para webhooks sin firma
- [ ] Agregar logging de intentos rechazados

**Estimación**: 2-4 horas | **Prioridad**: P0
EOF
)"

echo "✅ Issue #1 creado"
echo ""

# Issue #2: Secrets hardcodeados
echo "📝 Creando Issue #2: Secrets hardcodeados..."
gh issue create \
  --title "🔴 CRÍTICO: Secrets hardcodeados expuestos en código fuente" \
  --label "bug,security,critical,production-blocker" \
  --body "$(cat <<'EOF'
## 🔴 Severidad: CRÍTICA - Bloqueante para Producción

### Descripción del Problema

Múltiples API keys y tokens están **hardcodeados en código fuente** que se compila en el bundle JavaScript público.

### Secrets Expuestos

**Archivo**: `apps/web/src/environments/environment.development.ts`

1. **Supabase Anon Key** (líneas 6-7)
2. **Mapbox Token** (línea 10)
3. **PayPal Client ID** (línea 17)

### Impacto en Producción

- **Data Breach**: Acceso no autorizado a datos de usuarios
- **Pérdida Financiera**: Abuse de APIs con billing
- **Compliance**: Violación de SOC2, PCI-DSS

### Solución Propuesta

1. Mover secrets a variables de entorno (.env.local gitignored)
2. Rotar todos los secrets comprometidos
3. Agregar pre-commit hook para detectar secrets

### Checklist para Resolver

- [ ] Mover secrets a variables de entorno
- [ ] Rotar Supabase Anon Key
- [ ] Rotar Mapbox Token
- [ ] Rotar PayPal Client ID
- [ ] Agregar .env.local.example
- [ ] Configurar pre-commit hook

**Estimación**: 4-6 horas | **Prioridad**: P0 (INMEDIATO)
EOF
)"

echo "✅ Issue #2 creado"
echo ""

# Issue #3: CORS abierto
echo "📝 Creando Issue #3: CORS abierto..."
gh issue create \
  --title "🔴 CRÍTICO: CORS abierto (*) en 15+ Edge Functions" \
  --label "bug,security,critical,production-blocker" \
  --body "$(cat <<'EOF'
## 🔴 Severidad: CRÍTICA - Bloqueante para Producción

### Descripción del Problema

15+ Edge Functions tienen CORS configurado con `Access-Control-Allow-Origin: '*'`, permitiendo que cualquier dominio haga requests.

### Impacto en Producción

- **CSRF Attacks**: Sitios maliciosos pueden hacer requests en nombre de usuarios
- **Abuse de Recursos**: Bots pueden consumir quotas sin restricción
- **Data Harvesting**: Scripts maliciosos pueden extraer datos

### Solución Propuesta

```typescript
const allowedOrigins = [
  'https://autorenta.com',
  'https://autorenta-web.pages.dev',
  'http://localhost:4200'
];

const origin = req.headers.get('Origin');
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : ''
};
```

### Checklist para Resolver

- [ ] Crear helper de CORS con whitelist
- [ ] Actualizar todas las Edge Functions
- [ ] Agregar tests para dominios no autorizados

**Estimación**: 3-4 horas | **Prioridad**: P0
EOF
)"

echo "✅ Issue #3 creado"
echo ""

# Issue #4: Webhook retorna 200 en errores
echo "📝 Creando Issue #4: Webhook error handling..."
gh issue create \
  --title "🔴 CRÍTICO: Webhook retorna 200 OK en errores de base de datos" \
  --label "bug,critical,production-blocker,payments" \
  --body "$(cat <<'EOF'
## 🔴 Severidad: CRÍTICA - Bloqueante para Producción

### Descripción del Problema

El webhook retorna HTTP 200 incluso en errores críticos, causando que MercadoPago no reintente y el pago se pierda.

### Ubicación del Código

**Archivo**: `supabase/functions/mercadopago-webhook/index.ts:1039`

```typescript
} catch (error) {
  return new Response(
    JSON.stringify({ success: true }),  // ❌ success en error
    { status: 200 }  // ❌ 200 OK
  );
}
```

### Impacto en Producción

Usuario paga pero dinero nunca llega a su wallet porque el error no se reinventó.

### Solución Propuesta

```typescript
} catch (error) {
  console.error('❌ Error procesando webhook:', error);
  return new Response(
    JSON.stringify({ error: 'Internal server error', retry: true }),
    { status: 500 }
  );
}
```

### Checklist para Resolver

- [ ] Retornar HTTP 500 en errores de DB
- [ ] Agregar alertas inmediatas
- [ ] Implementar logging estructurado
- [ ] Crear dashboard de monitoreo

**Estimación**: 2-3 horas | **Prioridad**: P0
EOF
)"

echo "✅ Issue #4 creado"
echo ""

# Issue #5: Alertas no implementadas
echo "📝 Creando Issue #5: Alertas de discrepancias..."
gh issue create \
  --title "🔴 CRÍTICO: TODO sin implementar - Alertas de discrepancias de dinero" \
  --label "bug,critical,production-blocker,monitoring,payments" \
  --body "$(cat <<'EOF'
## 🔴 Severidad: CRÍTICA - Bloqueante para Producción

### Descripción del Problema

La reconciliación detecta discrepancias pero NO envía alertas. Las discrepancias se acumulan silenciosamente.

### Ubicación del Código

**Archivo**: `supabase/functions/wallet-reconciliation/index.ts:182`

```typescript
if (discrepancies.length > 0) {
  console.error('CRITICAL: Discrepancies detected!');
  // TODO: Enviar email/Slack notification ❌ SIN IMPLEMENTAR
}
```

### Impacto en Producción

Discrepancias de dinero crecen sin detección hasta que se descubren en auditorías.

### Solución Propuesta

Implementar alertas via Slack webhook o email (Resend/SendGrid).

### Checklist para Resolver

- [ ] Decidir canal de alertas (Slack vs Email)
- [ ] Configurar webhook/API key como secret
- [ ] Implementar función de alertas
- [ ] Agregar rate limiting
- [ ] Crear dashboard de discrepancias

**Estimación**: 4-6 horas | **Prioridad**: P0
EOF
)"

echo "✅ Issue #5 creado"
echo ""

# Issue #6: Archivo .backup
echo "📝 Creando Issue #6: Archivo backup..."
gh issue create \
  --title "🟠 HIGH: Archivo bookings.service.backup.ts en código de producción" \
  --label "bug,code-quality,production-blocker" \
  --body "$(cat <<'EOF'
## 🟠 Severidad: HIGH - Bloqueante para Producción

### Descripción del Problema

Archivo backup en árbol de código que aumenta bundle size innecesariamente.

### Ubicación

**Archivo**: `apps/web/src/app/core/services/bookings.service.backup.ts`

### Solución Propuesta

```bash
git rm apps/web/src/app/core/services/bookings.service.backup.ts
```

Usar Git para historial en lugar de archivos .backup

### Checklist para Resolver

- [ ] Revisar diferencias vs archivo actual
- [ ] Eliminar archivo con git rm
- [ ] Agregar regla de linting para prevenir .backup files
- [ ] Buscar otros archivos .backup

**Estimación**: 30 minutos | **Prioridad**: P1
EOF
)"

echo "✅ Issue #6 creado"
echo ""

# Issue #7: Validaciones insuficientes
echo "📝 Creando Issue #7: Validaciones de retiro..."
gh issue create \
  --title "🟠 HIGH: Validaciones insuficientes en formulario de retiro de dinero" \
  --label "bug,security,payments,production-blocker" \
  --body "$(cat <<'EOF'
## 🟠 Severidad: HIGH - Bloqueante para Producción

### Descripción del Problema

Formulario de retiro con validaciones insuficientes: permite valores negativos, cero, o mayores al balance.

### Ubicaciones Afectadas

- Frontend: `apps/web/src/app/features/wallet/components/withdraw-form.component.ts`
- Backend: `supabase/functions/wallet-withdraw/index.ts`

### Solución Propuesta

Agregar validaciones de:
- Monto mínimo (ARS 100)
- Monto máximo (available balance)
- Formato CBU (22 dígitos)
- Duplicar validaciones en backend

### Checklist para Resolver

- [ ] Agregar validaciones de rango en frontend
- [ ] Implementar validación de available_balance
- [ ] Agregar validación de formato CBU
- [ ] Duplicar validaciones en backend
- [ ] Agregar tests unitarios y E2E

**Estimación**: 3-4 horas | **Prioridad**: P1
EOF
)"

echo "✅ Issue #7 creado"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Todos los issues han sido creados exitosamente"
echo ""
echo "Ver issues en: https://github.com/ecucondorSA/autorenta/issues"
echo ""
echo "Próximos pasos:"
echo "  1. Revisar y priorizar los issues"
echo "  2. Asignar a developers"
echo "  3. Resolver en orden P0 → P1"
echo "  4. Code review y testing"
echo "  5. Deploy a producción"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

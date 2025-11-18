# CLAUDE_MCP.md

Model Context Protocol (MCP) Integration para AutoRenta - Producción (autorentar.com).

## MCP Servers Principales - Producción

AutoRenta cuenta con **4 servidores MCP custom** para acceso real-time a la plataforma en producción:

### Custom MCP Servers (AutoRenta Específicos)

| Server | URL Local | Purpose | Uso en Producción |
|--------|-----------|---------|-------------------|
| **AutoRenta Platform** | `/home/edu/autorenta/mcp-server/dist/index.js` | Acceso real-time a cars, bookings, users, operaciones | Aprobar bookings, verificar disponibilidad, generar reportes |
| **Supabase** | Streaming HTTP | Database queries, schema management, Edge Functions | Ejecutar queries en BD, administrar functions |
| **MercadoPago** | Streaming HTTP | Integration con IA, documentación, optimización de pagos | Debugging de pagos, análisis de transacciones |
| **DevTools** | Streaming HTTP | Console, Network, DOM debugging en autorentar.com | Debugging de errores en producción, performance |

### Official Cloudflare Servers (Free Tier)

| Server | URL | Purpose | Use Cases |
|--------|-----|---------|-----------|
| **cloudflare-builds** | `https://builds.mcp.cloudflare.com/mcp` | Deploy y manage builds de Pages/Workers | Automatización de deploy, estado de builds, rollbacks |
| **cloudflare-docs** | `https://docs.mcp.cloudflare.com/mcp` | Referencia rápida de docs de Cloudflare | Lookups de API, ayuda de configuración |
| **cloudflare-bindings** | `https://bindings.mcp.cloudflare.com/mcp` | Manage bindings de Workers (R2, KV, D1, AI) | Futuro: KV para idempotency de webhooks |

### Recommended (Paid Plan)

| Server | URL | Purpose | Value for AutoRenta |
|--------|-----|---------|---------------------|
| **cloudflare-observability** | `https://observability.mcp.cloudflare.com/mcp` | Logs y analytics debugging | **CRÍTICO**: Debugging de payment webhook |
| **cloudflare-audit-logs** | `https://auditlogs.mcp.cloudflare.com/mcp` | Auditoría de seguridad y compliance | Track deployments, cambios de API |
| **cloudflare-graphql** | `https://graphql.mcp.cloudflare.com/mcp` | Acceso a datos de analytics | Performance metrics, Web Vitals |

## Authentication

Los servidores MCP usan autenticación OAuth con tu cuenta de Cloudflare:

1. Claude Code mostrará prompt para autenticación al acceder servidores MCP
2. Usa la misma cuenta de Cloudflare que hostea AutoRenta Pages y Workers
3. Otorga permisos solicitados (read-only para servidores free tier)

## Common MCP Workflows

### Deployment Management (cloudflare-builds)

```
"Muéstrame el último deployment de autorenta-web en Pages"
"Deploya mi web app a Cloudflare Pages"
"¿Cuál es el estado de mis últimos 5 deployments?"
"Rollback deployment de Pages a la versión anterior"
```

**Ejemplo de uso**:
```bash
# Via Claude Code con MCP
> "Muéstrame el último deployment de autorenta-web"

# Claude usará cloudflare-builds MCP para:
# 1. Listar deployments recientes
# 2. Mostrar status, timestamp, commit
# 3. Mostrar logs si hay errores
```

### Documentation Lookup (cloudflare-docs)

```
"¿Cómo configuro custom domains en Cloudflare Pages?"
"¿Cuáles son los límites del free tier de Cloudflare Workers?"
"Muéstrame ejemplos de uso de KV namespace para idempotency"
"¿Cómo configuro environment variables en Workers?"
```

**Ejemplo de uso**:
```bash
# Via Claude Code con MCP
> "Cómo configuro KV namespace para webhook idempotency?"

# Claude usará cloudflare-docs MCP para:
# 1. Buscar documentación relevante
# 2. Mostrar ejemplos de código
# 3. Sugerir best practices
```

### Bindings Management (cloudflare-bindings)

```
"Lista todos los KV namespaces en mi cuenta"
"Crea un nuevo KV namespace para webhook idempotency"
"Muéstrame los bindings configurados para mi payment webhook worker"
```

**Ejemplo de uso**:
```bash
# Via Claude Code con MCP
> "Crea KV namespace llamado WEBHOOK_IDEMPOTENCY"

# Claude usará cloudflare-bindings MCP para:
# 1. Crear KV namespace
# 2. Retornar ID del namespace
# 3. Sugerir cómo agregarlo a wrangler.toml
```

### Debugging Payment Webhook (cloudflare-observability - Paid)

```
"Muéstrame las últimas 10 invocaciones de payments_webhook con errores"
"¿Cuál es el tiempo de ejecución promedio de mi payment webhook hoy?"
"Encuentra todas las llamadas a webhook que resultaron en errores 500 en la última hora"
"Dame logs para invocación con error en 2025-10-18 15:30 UTC"
```

**Ejemplo de uso** (requiere paid plan):
```bash
# Via Claude Code con MCP
> "Muéstrame errores del webhook en las últimas 24 horas"

# Claude usará cloudflare-observability MCP para:
# 1. Query logs de payments_webhook
# 2. Filtrar por status code 500
# 3. Mostrar stack traces y contexto
# 4. Sugerir posibles causas
```

### Security Auditing (cloudflare-audit-logs - Paid)

```
"Muéstrame todas las creaciones de API keys en los últimos 7 días"
"Lista todos los cambios de configuración a mis Workers esta semana"
"¿Quién deployó a producción ayer?"
"Audit trail para cambios de configuración de payment webhook"
```

**Ejemplo de uso** (requiere paid plan):
```bash
# Via Claude Code con MCP
> "Audit trail de cambios en production en últimos 7 días"

# Claude usará cloudflare-audit-logs MCP para:
# 1. Query audit logs
# 2. Filtrar por environment=production
# 3. Mostrar usuario, acción, timestamp
# 4. Resaltar cambios críticos
```

## MCP Server Configuration

El archivo de configuración MCP está en `.claude/config.json`:

```json
{
  "mcpServers": {
    "cloudflare-builds": {
      "url": "https://builds.mcp.cloudflare.com/mcp",
      "transport": "streamble-http",
      "description": "Deploy and manage Cloudflare Pages and Workers builds"
    },
    "cloudflare-docs": {
      "url": "https://docs.mcp.cloudflare.com/mcp",
      "transport": "streamble-http",
      "description": "Quick reference for Cloudflare documentation"
    },
    "cloudflare-bindings": {
      "url": "https://bindings.mcp.cloudflare.com/mcp",
      "transport": "streamble-http",
      "description": "Manage Workers bindings (R2, KV, D1, AI, etc.)"
    }
  }
}
```

### Add Paid Servers (cuando estén disponibles)

Edita `.claude/config.json` y agrega:

```json
{
  "mcpServers": {
    // ... existing servers ...
    "cloudflare-observability": {
      "url": "https://observability.mcp.cloudflare.com/mcp",
      "transport": "streamble-http",
      "description": "Logs and analytics debugging for Workers"
    },
    "cloudflare-audit-logs": {
      "url": "https://auditlogs.mcp.cloudflare.com/mcp",
      "transport": "streamble-http",
      "description": "Security and compliance auditing"
    },
    "cloudflare-graphql": {
      "url": "https://graphql.mcp.cloudflare.com/mcp",
      "transport": "streamble-http",
      "description": "Analytics data access"
    }
  }
}
```

## Why Cloudflare MCP vs Others

AutoRenta eligió servidores MCP de Cloudflare sobre alternativas (ej. Vercel) porque:

- ✅ **100% Infrastructure Alignment**: Ya usa Cloudflare Pages + Workers
- ✅ **15 Official Servers**: vs 0 servidores oficiales de Vercel
- ✅ **Observability**: Crítico para debugging de payment webhook
- ✅ **Maturity**: 3k+ stars, 311 commits, mantenido activamente
- ✅ **Native Integration**: Construido para servicios de Cloudflare usados por AutoRenta

## Use Cases for AutoRenta

### 1. Debugging Payment Webhooks (CRITICAL)

**Problem**: Payment webhooks fallan sin logs visibles

**Solution con MCP**:
```bash
> "Muéstrame errores del mercadopago-webhook en últimas 24h"

# MCP cloudflare-observability retorna:
# - Timestamp de cada error
# - Stack trace completo
# - Request payload
# - Response status
# - Duración de ejecución
```

### 2. Deploy Automation

**Problem**: Deployments manuales propensos a errores

**Solution con MCP**:
```bash
> "Deploya autorenta-web a production con último commit"

# MCP cloudflare-builds:
# 1. Trigger deployment
# 2. Monitor build progress
# 3. Reportar success/failure
# 4. Mostrar deployment URL
```

### 3. KV Namespace Management

**Problem**: Necesitamos KV para idempotency de webhooks

**Solution con MCP**:
```bash
> "Crea KV namespace WEBHOOK_IDEMPOTENCY y configúralo en payments_webhook"

# MCP cloudflare-bindings:
# 1. Crear KV namespace
# 2. Agregar binding a wrangler.toml
# 3. Sugerir código para uso
```

### 4. Performance Monitoring

**Problem**: No sabemos si webhook está siendo lento

**Solution con MCP** (paid):
```bash
> "Analiza performance del payments_webhook en últimos 7 días"

# MCP cloudflare-graphql:
# 1. Query analytics data
# 2. Mostrar p50, p95, p99 latencies
# 3. Identificar invocaciones lentas
# 4. Sugerir optimizaciones
```

### 5. DevTools MCP: Debugging en Producción

**Problem**: Errores en autorentar.com sin logs visibles en consola

**Solution con DevTools MCP**:
```bash
> "Inspecciona la consola de autorentar.com y muéstrame los últimos errores"

# DevTools MCP retorna:
# - Console logs, warnings, errors
# - Network requests (API calls)
# - DOM inspector para verificar elementos
# - Performance metrics (load time, resources)
# - Application data (storage, cookies, service workers)
```

**Use Cases en Producción**:
1. **Console Debugging**: Ver errores de JavaScript en tiempo real
2. **API Monitoring**: Verificar llamadas a Supabase, MercadoPago
3. **Performance**: Identificar bottlenecks de carga
4. **PWA Issues**: Debugging de service worker, offline mode
5. **Storage Issues**: Verificar localStorage, IndexedDB

**Ejemplo de Flujo**:
```bash
# 1. Usuario reporta error en autorentar.com
> "¿Por qué está fallando el booking en autorentar.com?"

# 2. Claude usa DevTools MCP para:
#    - Inspeccionar consola
#    - Ver errores de network
#    - Analizar stack trace

# 3. Retorna:
#    - "Error: Supabase connection failed at [timestamp]"
#    - "Network request a supabase.co retornó 500"
#    - Stacktrace completo
#    - Sugerencia de fix

# 4. Luego puedes usar Supabase MCP para:
#    - Query error logs en la BD
#    - Verificar Edge Function status
#    - Implementar fix
```

### 6. Security Auditing

**Problem**: Necesitamos compliance trail

**Solution con MCP** (paid):
```bash
> "Audit trail de cambios en production en último mes"

# MCP cloudflare-audit-logs:
# 1. Listar todos los cambios
# 2. Agrupar por tipo (deploy, config, secrets)
# 3. Identificar cambios críticos
# 4. Exportar a CSV para compliance
```

## TOON Format Optimization

### ¿Qué es TOON?

**TOON** (Token-Oriented Object Notation) es un formato compacto diseñado para optimizar tokens en prompts de LLM. Reduce consumo de tokens **30-60% en arrays uniformes** comparado con JSON.

**Ejemplo**:
```json
// JSON (11 tokens por fila)
{"cars": [
  {"id": "1", "brand": "Toyota", "status": "active"},
  {"id": "2", "brand": "Honda", "status": "active"}
]}

// TOON (3-4 tokens por fila)
cars[2]{id,brand,status}:
 1,Toyota,active
 2,Honda,active
```

### Implementación en AutoRenta

AutoRenta usa TOON en **3 áreas específicas**:

#### 1. MCP Config Optimization

**Archivo**: `.claude/config.json` → `.claude/config.toon`

```bash
# Conversión automática
node tools/toon-convert.mjs .claude/config.json > .claude/config.toon
```

**Beneficio**: 14.6% reducción (1633 → 1394 bytes)

#### 2. Automatic Hook Conversion

**Ubicación**: `.claude/hooks/json-to-toon.mjs`

Automáticamente convierte JSON arrays grandes en prompts a TOON formato. Activado por defecto en `.claude/settings.json`.

```bash
# Configuración
toonOptimization:
  enabled: true
  minArrayLength: 5          # Solo arrays con 5+ items
  minReductionPercent: 20    # Solo si > 20% ahorro
  debug: false
```

#### 3. Reference Data File

**Ubicación**: `docs/REFERENCE_DATA.toon`

Contiene datos estructurados optimizados:
- Ambientes de deployment
- MCP Servers configurados
- Tablas de BD principales
- Flujos de pago
- Estados de objetos
- Endpoints críticos
- Errores comunes
- SLA targets

**Beneficio**: Documentación más compacta, reutilizable en prompts

### Cómo Usar TOON

#### Opción 1: Automático (Recomendado)

No requiere acción:
```bash
# El hook convierte automáticamente en prompts
> "Dame la lista de cars activos"
# Claude recibe TOON automáticamente
```

#### Opción 2: Manual

```bash
# Convertir JSON a TOON
node tools/toon-convert.mjs input.json output.toon

# Validar conversión (roundtrip)
node tools/toon-convert.mjs input.json output.toon --validate

# Ver estadísticas
node tools/toon-convert.mjs input.json output.toon --stats
```

#### Opción 3: En Documentación

Usar `docs/REFERENCE_DATA.toon` en lugar de duplicar tablas:

```markdown
# Ambientes de Deployment

Ver configuración en [docs/REFERENCE_DATA.toon](./docs/REFERENCE_DATA.toon#ambientes-y-configuración)
```

#### Opción 4: MCP Server Response Optimization (NEW)

**Ubicación**: `mcp-server/src/lib/server.ts`

Desde noviembre 2025, el servidor MCP autorenta-platform automáticamente convierte respuestas de array en formato TOON cuando:
- Array tiene 3+ items
- Conversión logra >15% reducción de tokens

**Endpoints Optimizados Automáticamente**:
- `autorenta://cars/available` - Array de 100+ autos → TOON (63.9% reducción)
- `autorenta://bookings/active` - Array de 50+ reservas → TOON (56.7% reducción)
- `autorenta://bookings/pending` - Array de reservas pendientes → TOON (56.7% reducción)
- `autorenta://search/cars` - Array de resultados búsqueda → TOON (63.9% reducción)
- Otros recursos con arrays uniformes → TOON automáticamente

**Ejemplo - Antes y Después**:
```
ANTES (Solo request optimization):
  Consulta usuario → Hook convierte a TOON ✓
  Servidor MCP responde en JSON ✗ (sin optimizar)

DESPUÉS (Request + Response optimization):
  Consulta usuario → Hook convierte a TOON ✓
  Servidor MCP responde en TOON ✓ (automático)
  Total ahorro: 60-70% en tokens de respuesta
```

**Configuración en Servidor** (mcp-server/src/lib/server.ts):
```typescript
private toonOptimization = {
  enabled: true,                // Activado por defecto
  minArrayLength: 3,            // Arrays de 3+ items
  minReductionPercent: 15,      // Threshold de reducción
};

private tryConvertToToon(data: any): { text: string; mimeType: string } {
  // Detecta arrays, calcula reducción, retorna TOON o JSON
  // Fallback seguro a JSON si conversion falla
}
```

**Testing**:
```bash
# Validar conversión MCP TOON
npm run -C mcp-server test

# Script de validación incluido
npx tsx mcp-server/test-toon-conversion.ts
```

### Beneficios para AutoRenta

| Caso | Tokens Ahorrados | Implementación | Estado |
|------|------------------|-----------------|--------|
| **MCP Config** | 300/session | tools/toon-convert.mjs | ✅ Activo |
| **Request Hook** | 2,000-5,000/session | .claude/hooks/json-to-toon.mjs | ✅ Activo |
| **Response Optimization** | 5,000-12,000/session | mcp-server/src/lib/server.ts | ✅ Nuevo! |
| **Documentation** | 2,000-3,000/session | docs/REFERENCE_DATA.toon | ✅ Activo |
| **TOTAL ACTUAL** | **9,300-20,300/session** | 4 capas de optimización | ✅ Implementado |

**ROI Estimado**: 3-4 meses @ 5 sesiones/semana (Haiku: $32-60/año vs setup: 4-6 horas)

### Limitaciones

- ❌ No ideal para datos no-uniformes (JSON mejor)
- ❌ Overhead pequeño en parsing/conversión
- ❌ Curva de aprendizaje para nuevo formato

### Recursos

**TOON Implementation**:
- **CLI Tool**: `tools/toon-convert.mjs` (manual conversion)
- **Request Hook**: `.claude/hooks/json-to-toon.mjs` (automatic prompt optimization)
- **MCP Server**: `mcp-server/src/lib/server.ts` (automatic response optimization) [NEW]
- **Tests**: `mcp-server/test-toon-conversion.ts` (validation suite)

**Configuration & Reference**:
- **Settings**: `.claude/settings.json::toonOptimization`
- **Reference Data**: `docs/REFERENCE_DATA.toon` (pre-optimized structured data)
- **Quick Start**: `docs/guides/TOON_QUICK_START.md` (comprehensive guide)

**External**:
- **Official Spec**: https://github.com/toon-format/toon
- **TOON Cheat Sheet**: [docs/DEVTOOLS_MCP_CHEAT_SHEET.md](./docs/DEVTOOLS_MCP_CHEAT_SHEET.md#toon-format-optimization)

## Future MCP Usage

Cuando upgradeemos a paid Cloudflare Workers plan:

### 1. Enable Observability Server

**Esencial para production webhook debugging**

```bash
# 1. Upgrade to Workers Paid ($5/month)
# 2. Add to .claude/config.json
# 3. Autenticar vía OAuth
# 4. Usar para real-time debugging
```

**Value**: Reducir tiempo de debugging de webhooks de horas a minutos

### 2. Setup Audit Logs

**Compliance y security tracking**

```bash
# 1. Enable audit logs en Cloudflare
# 2. Add MCP server
# 3. Configurar alertas para cambios críticos
```

**Value**: Cumplir requerimientos de compliance, track cambios

### 3. Configure GraphQL Analytics

**Performance monitoring y Web Vitals**

```bash
# 1. Add GraphQL MCP server
# 2. Query analytics data
# 3. Crear dashboards custom
```

**Value**: Data-driven optimization de performance

### 4. Add Browser Rendering

**E2E testing y screenshot generation**

```bash
# 1. Enable Browser Rendering en Cloudflare
# 2. Usar para E2E tests automatizados
# 3. Generar screenshots para visual regression
```

**Value**: Mejorar coverage de tests, detectar regressions visuales

## Best Practices

### 1. Use MCP for Repetitive Tasks

**Instead of**:
```bash
# Manual deployment cada vez
wrangler pages deploy dist/
```

**Use MCP**:
```bash
> "Deploya autorenta-web a production"
```

### 2. Debug with Context

**Instead of**:
```bash
# Buscar logs manualmente en dashboard
```

**Use MCP**:
```bash
> "Muéstrame errores del webhook relacionados con payment_id 123456"
```

### 3. Automate Compliance

**Instead of**:
```bash
# Export manual de audit logs
```

**Use MCP**:
```bash
> "Genera audit report de production para último mes"
```

### 4. Monitor Proactively

**Instead of**:
```bash
# Esperar a que usuarios reporten problemas
```

**Use MCP**:
```bash
> "Alerta si webhook tiene >5% error rate en últimos 15 minutos"
```

## Limitations

### Free Tier

- ✅ Builds management
- ✅ Documentation lookup
- ✅ Bindings management
- ❌ No observability (logs, analytics)
- ❌ No audit logs
- ❌ No GraphQL analytics

### Paid Tier ($5/month Workers Paid)

- ✅ Todo lo de free tier
- ✅ Observability (logs, tracing)
- ✅ Audit logs (compliance)
- ✅ GraphQL analytics (performance)
- ✅ Browser Rendering (E2E tests)

**Recommendation**: Upgrade cuando AutoRenta esté en production con tráfico real.

## Resources

- **DevTools MCP Cheat Sheet**: [docs/DEVTOOLS_MCP_CHEAT_SHEET.md](./docs/DEVTOOLS_MCP_CHEAT_SHEET.md) - Quick reference para on-call
- **GitHub**: [cloudflare/mcp-server-cloudflare](https://github.com/cloudflare/mcp-server-cloudflare)
- **Documentation**: [Cloudflare MCP Docs](https://developers.cloudflare.com/agents/model-context-protocol/)
- **All Servers**: 15 servidores disponibles, 3 configurados para free tier
- **Configuration**: `.claude/config.json` en root del proyecto
- **Last Updated**: 2025-11-18 (Production-focused, DevTools MCP agregado)

## Related Documentation

- **Architecture**: [CLAUDE_ARCHITECTURE.md](./CLAUDE_ARCHITECTURE.md)
- **Payments**: [CLAUDE_PAYMENTS.md](./CLAUDE_PAYMENTS.md) - Webhook debugging con MCP
- **Workflows**: [CLAUDE_WORKFLOWS.md](./CLAUDE_WORKFLOWS.md) - Deployment automation

## Runbooks que usan DevTools MCP

- **Troubleshooting General**: [docs/runbooks/troubleshooting.md](./docs/runbooks/troubleshooting.md#5-debugging-en-producción-con-devtools-mcp)
- **Split Payment Failure**: [docs/runbooks/split-payment-failure.md](./docs/runbooks/split-payment-failure.md#debugging-con-devtools-mcp)
- **On-Call Rotation**: [docs/runbooks/on-call-rotation.md](./docs/runbooks/on-call-rotation.md#debugging-rápido-con-devtools-mcp-on-call)
- **Auth Callback 404**: [docs/runbooks/fix-auth-callback-404.md](./docs/runbooks/fix-auth-callback-404.md#debugging-con-devtools-mcp)

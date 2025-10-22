# 🤖 Configuraciones YAML para IA - AutoRenta

Este directorio contiene configuraciones YAML que definen flujos de trabajo automatizados para IA (Claude Code, agentes autónomos, etc.).

## 📋 Archivos Disponibles

### 1️⃣ `test-runner-autorenta.yaml`
**Propósito**: Validación completa read-only del sistema (sin mutaciones)

**Casos de uso:**
- ✅ Auditorías de seguridad automatizadas
- ✅ Health checks pre-deployment
- ✅ Validación de integridad de datos
- ✅ Smoke tests de producción

**Secciones principales:**
- **env_check**: Validar Node, pnpm, dependencias
- **build_quality**: Lint, typecheck, build
- **smoke_web**: Tests HTTP de endpoints
- **security_headers**: Validación de headers de seguridad
- **db_basics**: Verificación RLS y políticas
- **wallet_integrity**: Integridad de wallets y withdrawals
- **deps_vulns**: Auditoría de vulnerabilidades
- **perf_quick**: Medición TTFB

**Gates de falla:**
- HTTP 500+
- Headers HSTS faltantes
- RLS deshabilitado
- Vulnerabilidades críticas en dependencias
- Desbalances en wallets

### 2️⃣ `local-mcp-playwright-autorenta.yaml`
**Propósito**: Testing E2E interactivo local con mutaciones permitidas

**Casos de uso:**
- ✅ Desarrollo local con tests automáticos
- ✅ Validación de flujos de usuario completos
- ✅ Testing de integración con MercadoPago
- ✅ Debugging de balances de wallet

**Secciones principales:**
- **env_check**: Validar variables críticas (Supabase, MercadoPago)
- **dev_server**: Levantar servidor de desarrollo
- **e2e_wallet**: Tests E2E de sistema de wallet
- **e2e_bookings**: Tests E2E de reservas y pagos
- **api_smoke**: Validación de APIs protegidas
- **wallet_balance_check**: Verificar balances negativos

**Variables de entorno requeridas:**
```bash
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
MERCADOPAGO_ACCESS_TOKEN
MERCADOPAGO_PUBLIC_KEY
```

## 🚀 Cómo Usar

### Con Claude Code CLI

```bash
# Ejecutar test runner completo
claude execute --config prompts/test-runner-autorenta.yaml

# Ejecutar tests E2E locales
claude execute --config prompts/local-mcp-playwright-autorenta.yaml
```

### Con Agentes Autónomos

```typescript
// Ejemplo de integración en sistema agentic
import { loadYAMLConfig } from './yaml-loader';

const config = loadYAMLConfig('prompts/test-runner-autorenta.yaml');
const agent = new TestRunnerAgent(config);
await agent.execute();
```

### Manualmente (entender los pasos)

```bash
# Seguir los steps de test-runner-autorenta.yaml manualmente
node -v
pnpm -v
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm build

# etc...
```

## 📊 Outputs Generados

Ambos archivos generan reportes en el directorio `generated-docs/`:

**test-runner-autorenta.yaml:**
- `TEST_RUN_REPORT.md` - Reporte principal
- `headers-app.txt` - Headers HTTP de la app
- `rls-table-status.txt` - Estado de RLS
- `wallet-integrity.txt` - Estado de wallets
- `pnpm-audit.json` - Auditoría de dependencias

**local-mcp-playwright-autorenta.yaml:**
- `LOCAL_E2E_REPORT.md` - Reporte principal
- `playwright-report.txt` - Resultados de Playwright
- `negative-balances.txt` - Wallets con balance negativo

## 🎯 Targets Configurados

### Production
- `https://autorenta.pages.dev` - App principal

### Local
- `http://localhost:3000` - Dev server

### Database
- Schema: `public`
- Tables críticas: `users`, `user_wallets`, `bookings`, `withdrawal_requests`

## 🔐 Seguridad

- ✅ **Read-only por defecto** en test-runner
- ✅ **Mutations controladas** solo en MCP local
- ✅ **Gates de seguridad** estrictos
- ✅ **Validación de RLS** en todas las tablas críticas
- ✅ **Auditoría de vulnerabilidades** automática

## 🛠️ Personalización

Para adaptar estos YAMLs a tus necesidades:

1. **Modificar targets**: Cambiar URLs en `targets.web`
2. **Agregar steps**: Añadir nuevos pasos en el array `steps`
3. **Customizar gates**: Ajustar condiciones de fallo en `gates.fail_on`
4. **Extender checks**: Agregar validaciones específicas

## 📚 Referencias

- **Formato YAML**: YAML 1.2 spec
- **MCP Protocol**: Model Context Protocol (Anthropic)
- **Playwright**: https://playwright.dev
- **Supabase**: https://supabase.com/docs

---

**Nota**: Estos archivos están inspirados en la configuración de AltaMedica y adaptados para AutoRenta.

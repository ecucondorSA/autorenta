# CLAUDE.md: AutoRenta Operating Manual (Compact)

> Fuente de verdad operativa para Claude en AutoRenta.
> Este archivo es compacto por diseño: reglas + checklists + enlaces.

## Size Budget
- Objetivo: `CLAUDE.md <= 700` líneas.
- Hard cap: `800` líneas.
- Si una sección supera el presupuesto: mover detalle a anexos y dejar aquí solo resumen + link.

## Índice Rápido
1. Reglas Inquebrantables
2. Contexto de Proyecto
3. Convenciones Técnicas
4. Supabase y DB Hardening
5. Flujo de Trabajo del Agente
6. Calidad y Gates
7. Insights Operativos
8. Referencias y Anexos

---

## 1) Reglas Inquebrantables

> **#0** Cero Código sin Integración · **#1** Workflows Orquestan, Edge Functions Ejecutan · **#2** Higiene de Repo · **#3** Validación Cross-Layer · **#4** Prohibido Stubs sobre Implementaciones · **#5** Todo se Hace AHORA

### REGLA #0: Cero Código sin Integración
- Prohibido generar código que no tenga consumidor real en el mismo PR/commit.
- Si al borrar ese código no se rompe nada, probablemente no debía existir.

Checklist:
- [ ] Hay al menos un consumidor real (UI, cron, webhook o servicio).
- [ ] Flujo completo trazable trigger -> resultado visible.
- [ ] El código nuevo no queda huérfano.

### REGLA #1: Workflows Orquestan, Edge Functions Ejecutan
- GitHub Actions: trigger/schedule/retry/alerta.
- Edge Functions: lógica de negocio, queries, cálculos, mutaciones.
- Prohibido duplicar lógica crítica en workflows.

Checklist:
- [ ] Workflow sin lógica de negocio inline.
- [ ] Constantes de negocio no hardcodeadas en CI.
- [ ] No hay duplicación workflow <-> edge.

### REGLA #3: Validación de Integración Cross-Layer (Antes / Durante / Después)

Generar código que compila en cada capa pero nunca se valida end-to-end es construir una casa de madera al lado de un volcán: se ve bien hasta que explota. **Nunca asumir que un nombre de columna, un RPC o una Edge Function en el repo coincide con lo que está en producción. Verificar contra prod ANTES de escribir una sola línea.**

Cada feature toca múltiples capas (DB → RPC → Edge Function → Service → UI).
Código que compila en cada capa pero no conecta entre capas = bug invisible.

**ANTES de codificar** (mapeo del flujo):
- [ ] Trazar ruta completa: trigger → cada capa intermedia → resultado visible al usuario.
- [ ] Verificar nombres reales de columnas en prod: `SELECT column_name FROM information_schema.columns WHERE table_name = '...'`.
- [ ] Verificar versión actual de RPCs en prod: `SELECT prosrc FROM pg_proc WHERE proname = '...'`.
- [ ] Verificar que Edge Functions deployadas matchean el código local (comparar con `supabase functions list`).
- [ ] Si una migración existe en el repo pero no se aplicó en prod → APLICARLA PRIMERO.

**DURANTE la codificación** (validación por capa):
- [ ] Cada write a DB usa nombres de columnas verificados contra `information_schema` (NUNCA asumir).
- [ ] Cross-reference explícito: si Edge Function escribe `col_x`, el RPC que lee debe leer `col_x` (mismo nombre exacto).
- [ ] Si el frontend lee un signal que viene de un RPC → verificar que el RPC retorna ese campo con ese nombre.
- [ ] CORS headers: incluir `baggage, sentry-trace` en toda Edge Function frontend-facing.

**DESPUÉS de codificar** (validación end-to-end):
- [ ] Ejecutar el flujo completo: trigger real → verificar estado en DB → verificar que UI refleja el cambio.
- [ ] Query de verificación SQL post-cambio: `SELECT [campos_relevantes] FROM [tabla] WHERE user_id = '...'`.
- [ ] Si el flujo involucra Edge Function: verificar logs en Supabase Dashboard o con `supabase functions logs`.
- [ ] Si hay deploy de Edge Function + migración: AMBOS deben aplicarse antes de declarar "listo".

> Si algún paso falla, NO avanzar al siguiente. Corregir la capa rota primero.

### REGLA #4: Prohibido Stubs que Sobrescriben Implementaciones Reales

**Problema real (Feb 2026):** Una migración de stubs usó `CREATE OR REPLACE FUNCTION is_kyc_blocked()` con `RETURN {blocked: false}`. Se aplicó DESPUÉS de la migración real con lógica KYC completa. Resultado: bloqueo KYC completamente nulo durante semanas, cero errores visibles.

Tres reglas concretas:
1. **NUNCA `CREATE OR REPLACE` para funciones que ya existen con lógica real.** Verificar antes: `SELECT proname, LEFT(prosrc, 100) FROM pg_proc WHERE proname = '...'`.
2. **Migraciones que recrean tablas DEBEN incluir TODAS las columnas** de migraciones anteriores. `DROP TABLE + CREATE TABLE` borra columnas agregadas por `ALTER TABLE ADD COLUMN` previos — silenciosamente.
3. **Post-migración: verificar que funciones y columnas existentes siguen intactas.** Query: `SELECT proname, pg_get_function_result(oid) FROM pg_proc WHERE proname IN (...)`.

### REGLA #2: Higiene de Repo (Nunca Regresivo)
- Root solo para runtime/config/docs core.
- Prohibido versionar ruido: `tmp-*`, logs, screenshots, `*.pid`, dumps, outputs ad-hoc.
- Outputs generados (`public/env.js`, `public/env.json`, etc.) no son target de commit salvo cambio explícito del mecanismo.
- Si aparece un nuevo patrón de ruido local, actualizar `.gitignore` en el mismo commit.

Checklist de higiene:
1. `git status --short` sin archivos fuera de lugar.
2. `pnpm lint && pnpm guardrails`.
3. Si hubo `git mv`, validar referencias con `rg`.
4. Si tocaste docs/reportes: `pnpm docs:ttl:check`.
5. Si hay rename/copy sospechoso (`C100`): `git log --follow --name-status <file>`.

---

## 2) Contexto de Proyecto

- Proyecto: `AutoRenta`
- Path: `/home/edu/autorenta`
- Frontend: Angular 18+ standalone + Signals + Ionic
- Backend: Supabase (Postgres, RLS, RPC, Edge Functions)
- PM: `pnpm` ONLY
- Supabase activo: `aceacpaockyxgogxsfyc`
- Supabase deprecado: `pisqjmoklivzpwufhscx`

Modelo operativo (resumen):
- Flujo financiero 15-70-15 (platform/reward-pool/FGO).
- UI sin wizard/modales intrusivos para flujos principales.

---

## 3) Convenciones Técnicas

- TypeScript estricto: no `any`; `unknown` solo con validación.
- API de Angular moderna: `inject()`, `@if`, `@for`, standalone components.
- Reglas de ownership:
  - Supabase solo en `apps/web/src/app/core/services/*.service.ts`.
  - `features/` y `shared/` no llaman `supabase.*` directamente.
- Dinero:
  - DB en integer minor units.
  - UI solo formatea, no define reglas financieras.

Estructura canónica:
- `apps/web/src/app/core`
- `apps/web/src/app/features`
- `apps/web/src/app/shared`
- `supabase/functions`
- `supabase/migrations`

---

## 4) Supabase y DB Hardening

### Dos Planos (obligatorio)
1. UI gating: guards/filtros/disabled/overlays/queries/routing.
2. DB enforcement: enum/constraints/triggers/RLS/RPC.

Reglas:
- Si algo “se guardó pero no se ve”, investigar RLS + filtros primero.
- Reglas críticas de negocio se enforcean en DB y se reflejan en UI.
- No asumir schema: validar con `database.types.ts` o `information_schema`.

### Auth Context Crítico
- `auth.uid()` requiere JWT de usuario reenviado en `Authorization`.
- RPC user-scoped no debe evaluarse con service role sin forwarded JWT.

### Deploy DB Definition of Done
- [ ] migración aplicada en prod.
- [ ] RLS/policies alineadas.
- [ ] queries/UI reflejan nuevos estados.
- [ ] verificación SQL post-deploy ejecutada.

### Autos (estado vigente)
- `car_status`: `draft`, `pending`, `active`, `paused`, `deleted`.
- Marketplace público: `active` + `pending`.
- `active` requiere `profiles.id_verified = true` (enforced en DB).
- `pending` visible, no reservable/no clickeable (overlay UI).

---

## 5) Flujo de Trabajo del Agente

### Ciclo mínimo por tarea
1. Entender alcance exacto (1 dominio por vez).
2. Cambios atómicos y verificables.
3. Validar local (lint/tests/build según impacto).
4. Confirmar no-regresión (incluye higiene de repo).
5. Documentar resultado con evidencia.

### Anti-regresión
- Evitar whack-a-mole: si un fix rompe otro dominio, frenar y re-scope.
- Commits pequeños como checkpoints.
- No mezclar pagos/bookings/auth en el mismo cambio sin motivo explícito.

### REGLA #5: Todo se Hace AHORA — Cero Deuda Diferida

Operar como senior significa que **nada queda para después**. Cada sesión entrega valor completo o escala explícitamente.

Prohibido:
- Diferir trabajo a "futuro", "próxima sesión", "sprint siguiente", "refactor posterior" o "TODO para después".
- Dejar TODOs, FIXMEs, `// HACK`, `// TEMP` ni "pendientes" sin resolver en el código.
- Declarar "listo" si falta migración, deploy, verificación o regeneración de tipos.
- Crear código que "funciona localmente" pero no está deployado en producción.

Obligatorio:
- Si se detecta un problema durante la tarea actual → corregirlo AHORA o escalar al usuario con contexto.
- Si no se puede resolver → documentar POR QUÉ (blocker técnico concreto) y pedir decisión. No abandonar.
- Cada tarea cierra completa: **código + migración + deploy + tipos + verificación post-deploy**.
- Si una auditoría encuentra hallazgos → arreglar todos los P0 en la misma sesión. P1/P2 documentar y empezar.

### Criterios para frenar y preguntar
- Mismo archivo tocado repetidamente sin converger.
- Cambio pequeño que deriva en múltiples dominios.
- Hallazgo de drift severo entre UI y DB.

---

## 6) Calidad y Gates

Comandos base:
- `pnpm lint`
- `pnpm test:unit`
- `pnpm build:web`

Pre-push recomendado:
- `pnpm lint && pnpm test:unit && pnpm build:web`

Checklist de entrega:
- [ ] Sin TODOs críticos nuevos.
- [ ] Sin archivos fuera de lugar en `git status`.
- [ ] Si hubo cambio de comportamiento: tests/validación actualizados.
- [ ] Si hubo cambio DB: verificación SQL explícita.

---

## 7) Insights Operativos

- **MCP migration drift:** `mcp__supabase__apply_migration` genera timestamps propios en `schema_migrations`. Si el repo tiene archivos con timestamps diferentes, `supabase db push` falla. Fix: alinear `supabase_migrations.schema_migrations` con los timestamps locales. Preferir siempre `db push` via CI.

- **Guardrails baseline:** Migraciones correctivas (`CREATE OR REPLACE`) duplican RPCs legítimamente. Agregar la función al array `rpcFunctions` en `scripts/maintenance/guardrails.baseline.json` para que `--strict` no falle.

- **PL/pgSQL lazy validation:** PostgreSQL NO valida nombres de columnas al crear funciones — solo al ejecutarlas. Una función con `INSERT INTO ... (metadata)` compila OK pero falla en runtime si la columna real es `provider_metadata`.

- **Supabase UPDATE sin WHERE:** Supabase bloquea `UPDATE tabla SET ...` sin `WHERE`. Fix: agregar `WHERE true` si el UPDATE es intencional sobre toda la tabla.

- **wallet_transactions columnas reales:** `provider_metadata` (no `metadata`), `reference_id` (no `booking_id`), `amount` es `numeric`. Verificar siempre contra `information_schema` antes de escribir RPCs.

- **FGO subfunds:** Fondos FGO viven en `fgo_subfunds` (3 pools: `liquidity`, `capitalization`, `profitability`), NO en `user_wallets`. Nunca buscar FGO en wallets de usuario.

- **Edge Function auth (ES256):** Tras migración ES256, todas las Edge Functions pueden necesitar `--no-verify-jwt`. Las que usan `auth.getUser()` internamente no necesitan verificación en el gateway.

---

## 8) Referencias y Anexos

### Referencias rápidas
- Política de higiene: `docs/ROOT_HYGIENE.md`
- Hardening extendido: `AGENTS-2.md`
- Guía principal para agentes: `AGENTS.md`
- Índice de anexos Claude: `docs/agents/claude/ANNEX_INDEX.md`

### Gemini Image Generation
- **Modelo**: `gemini-3-pro-image-preview` (Nano Banana Pro)
- **Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent`
- **Config**: `"generationConfig": {"responseModalities": ["TEXT","IMAGE"]}`
- **Output**: Base64 PNG en `candidates[0].content.parts[].inlineData`
- **Key env var**: `GEMINI_API_KEY`

### Snapshot histórico completo
- `docs/agents/claude/CLAUDE_REFERENCE_FULL_2026-02-12.md`

### Ingeniería
- `docs/engineering/MEMBERSHIP_SYSTEM.md`
- `docs/engineering/API_REFERENCE.md`
- `docs/engineering/DATABASE_SCHEMA.md`
- `docs/engineering/EDGE_FUNCTIONS.md`
- `docs/engineering/TESTING.md`
- `docs/engineering/DEPLOYMENT.md`
- `docs/engineering/TROUBLESHOOTING.md`

### Seguridad
- `docs/security/SECURITY.md`

---

## Nota Operativa
Si hay conflicto entre detalle histórico y reglas actuales, prevalece:
1. `AGENTS.md`
2. `AGENTS-2.md`
3. Este `CLAUDE.md` compacto
4. Snapshot histórico/anexos

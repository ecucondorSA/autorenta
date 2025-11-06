# Sistema Multi-Agente: Claude Code + Cursor

**Versión**: 1.0.0
**Fecha**: 2025-11-03
**Proyecto**: AutoRenta

---

## 🎯 Visión General

AutoRenta utiliza un **sistema multi-agente** donde dos IAs especializadas colaboran para maximizar velocidad y calidad de desarrollo:

- **Claude Code** (CLI): Agente de Arquitectura & Automatización
- **Cursor** (Editor): Agente de Desarrollo Iterativo

Cada agente tiene responsabilidades específicas y se comunican a través de archivos compartidos (`CLAUDE.md`, `.cursorrules`, código, y contexto del proyecto).

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PROYECTO AUTORENTA                            │
│                     (Shared Context Layer)                           │
│                                                                       │
│  📄 CLAUDE.md          - Arquitectura del proyecto                  │
│  📄 .cursorrules       - Reglas de Cursor                           │
│  📄 database.types.ts  - Tipos TypeScript                           │
│  📁 apps/web/src/      - Código fuente                              │
│  📁 supabase/          - Edge Functions, migrations                 │
└─────────────────────────────────────────────────────────────────────┘
                            ↓↑ (contexto compartido)
        ┌───────────────────────────────────────────────────┐
        │                                                     │
        ↓                                                     ↓
┌──────────────────────┐                        ┌──────────────────────┐
│   CLAUDE CODE CLI    │                        │       CURSOR         │
│   (Terminal Agent)   │ ←─── workflow ────→   │   (Editor Agent)     │
├──────────────────────┤                        ├──────────────────────┤
│                      │                        │                      │
│ 🧠 Arquitectura      │                        │ 💻 Implementación    │
│ 📊 Análisis Vertical │                        │ ⚡ Edición Rápida    │
│ 🚀 CI/CD Automation  │                        │ 🔍 Debugging Visual  │
│ 📝 Documentación     │                        │ ✨ Autocompletado    │
│ 🔒 Security Audits   │                        │ 🧪 Tests Locales     │
│                      │                        │                      │
└──────────────────────┘                        └──────────────────────┘
        ↓                                                     ↓
┌──────────────────────┐                        ┌──────────────────────┐
│   OUTPUT             │                        │   OUTPUT             │
├──────────────────────┤                        ├──────────────────────┤
│ • TODO lists         │                        │ • Código TypeScript  │
│ • Audit reports      │                        │ • Componentes        │
│ • Deployment logs    │                        │ • Servicios          │
│ • Architecture docs  │                        │ • Tests unitarios    │
│ • Migration scripts  │                        │ • Fixes rápidos      │
└──────────────────────┘                        └──────────────────────┘
```

---

## 🔄 Workflows Multi-Agente

### Workflow 1: Desarrollo de Nueva Feature

**Escenario**: Agregar sistema de reviews para autos

```
┌──────────────────────────────────────────────────────────────────────┐
│ FASE 1: PLANIFICACIÓN (Claude Code - 20-30 min)                      │
└──────────────────────────────────────────────────────────────────────┘

Developer en terminal:
  $ claude
  > "Necesito agregar un sistema de reviews para autos.
     Usuarios pueden dejar rating (1-5 estrellas) y comentario.
     Solo usuarios que alquilaron el auto pueden hacer review.
     Analiza arquitectura y dame plan completo."

Claude Code ejecuta:
  1. ✅ Analiza database schema existente
  2. ✅ Diseña tabla 'car_reviews' con foreign keys
  3. ✅ Crea RLS policies (solo locatarios con booking completado)
  4. ✅ Diseña ReviewsService con signals
  5. ✅ Planea componentes (car-reviews-list, add-review-modal)
  6. ✅ Genera TODO list detallada
  7. ✅ Crea migration SQL (setup-reviews.sql)
  8. ✅ Documenta en REVIEWS_IMPLEMENTATION_PLAN.md

Output:
  📄 REVIEWS_IMPLEMENTATION_PLAN.md
  📄 supabase/migrations/setup-reviews.sql
  ✅ TODO List (8 tareas)

┌──────────────────────────────────────────────────────────────────────┐
│ FASE 2: IMPLEMENTACIÓN (Cursor - 60-90 min)                          │
└──────────────────────────────────────────────────────────────────────┘

Developer abre Cursor:
  1. Lee REVIEWS_IMPLEMENTATION_PLAN.md
  2. Abre Composer (Cmd+I):
     > "Implementa ReviewsService según el plan de Claude.
        Usa signals para estado reactivo."

Cursor genera:
  ✅ apps/web/src/app/core/services/reviews.service.ts
     - fetchReviews(carId)
     - createReview(review)
     - canUserReview(userId, carId)
     - Signals para reviews$, loading$, error$

  3. Composer nuevamente:
     > "Crea componente car-reviews-list standalone"

Cursor genera:
  ✅ apps/web/src/app/shared/components/car-reviews-list/
     - Component con template y estilos
     - Integra ReviewsService
     - Rating stars con SVG
     - Loading skeleton

  4. Cmd+K inline para agregar botón "Dejar review" en car-detail:
     > "Agrega botón para abrir modal de review"

Cursor modifica:
  ✅ apps/web/src/app/features/cars/detail/car-detail.page.ts
     - Importa ReviewsService
     - Método openReviewModal()
     - Template con botón condicional (solo si canReview)

  5. Fix de TypeScript errors en tiempo real
  6. npm run test:quick para validar localmente

┌──────────────────────────────────────────────────────────────────────┐
│ FASE 3: VALIDACIÓN Y DEPLOY (Claude Code - 15 min)                   │
└──────────────────────────────────────────────────────────────────────┘

Developer en terminal:
  $ claude
  > "Ejecuta pipeline CI completo y despliega a staging si pasa"

Claude Code ejecuta:
  1. ✅ npm run ci
     - ESLint: PASSED
     - Tests: 23/23 PASSED
     - Build: SUCCESS (dist/ generado)

  2. ✅ Aplica migration a Supabase staging:
     npx supabase db push --db-url $STAGING_URL

  3. ✅ Deploy a Cloudflare Pages (staging):
     wrangler pages deploy dist/autorenta-web --project-name autorenta-staging

  4. ✅ Smoke tests:
     - GET https://autorenta-staging.pages.dev ✅
     - Reviews visible en car detail ✅

  5. ✅ Actualiza TODO list → All completed

  6. ✅ Genera commit:
     git add .
     git commit -m "feat(reviews): sistema de reviews para autos

     - Nueva tabla car_reviews con RLS
     - ReviewsService con signals
     - Componente car-reviews-list
     - Integración en car-detail

     🤖 Generated with Claude Code
     Co-Authored-By: Claude <noreply@anthropic.com>"

Output:
  ✅ Feature deployed to staging
  ✅ Commit creado
  ✅ TODO list completada
  📊 Deployment URL: https://autorenta-staging.pages.dev
```

**Timeline Total**: ~2 horas (vs 4-6 horas tradicional)

---

### Workflow 2: Bug Fixing

**Escenario**: Avatar upload falla con "RLS policy violation"

```
┌──────────────────────────────────────────────────────────────────────┐
│ INTENTO 1: FIX RÁPIDO (Cursor - 5 min)                               │
└──────────────────────────────────────────────────────────────────────┘

Developer en Cursor:
  1. Ve error en console: "new row violates row-level security policy"
  2. Abre profile.service.ts:97 (método uploadAvatar)
  3. Cmd+K inline:
     > "Fix this RLS policy error in avatar upload"

Cursor sugiere:
  - Agregar .single() al query
  - Verificar auth antes de upload

Developer prueba → ERROR PERSISTE ❌

┌──────────────────────────────────────────────────────────────────────┐
│ ANÁLISIS PROFUNDO (Claude Code - 20 min)                             │
└──────────────────────────────────────────────────────────────────────┘

Developer en terminal:
  $ claude
  > "Analiza por qué el upload de avatares falla con RLS policy error.
     Haz vertical stack debugging desde UI hasta RLS."

Claude Code ejecuta:
  1. ✅ Lee profile.page.ts:137 (UI handler) → OK
  2. ✅ Lee profile.service.ts:97 (uploadAvatar) → SOSPECHOSO
  3. ✅ Analiza path construction:
     const filePath = `avatars/${user.id}/${filename}`
                      ^^^^^^^^ ← PROBLEMA!
  4. ✅ Lee setup-profiles.sql:76 (RLS policy):
     (storage.foldername(name))[1] = auth.uid()::text

     Esperado: `user-id/file.jpg` → foldername[1] = 'user-id' ✅
     Actual: `avatars/user-id/file.jpg` → foldername[1] = 'avatars' ❌

  5. ✅ ROOT CAUSE IDENTIFICADO:
     Storage path incluye bucket prefix incorrectamente

  6. ✅ Genera PHOTO_UPLOAD_AUDIT.md con:
     - Layer-by-layer analysis (6 capas)
     - Root cause diagram
     - Fix implementation
     - Testing instructions

Output:
  📄 PHOTO_UPLOAD_AUDIT.md (análisis completo)
  💡 FIX: Remover 'avatars/' del path en uploadAvatar()

┌──────────────────────────────────────────────────────────────────────┐
│ APLICAR FIX (Cursor - 2 min)                                          │
└──────────────────────────────────────────────────────────────────────┘

Developer en Cursor:
  1. Abre profile.service.ts:97
  2. Cmd+K:
     > "Remove 'avatars/' prefix from filePath según audit"

Cursor modifica:
  - const filePath = `avatars/${user.id}/${filename}`;
  + const filePath = `${user.id}/${filename}`;

  3. npm run start → Prueba upload → ✅ SUCCESS!

┌──────────────────────────────────────────────────────────────────────┐
│ VALIDACIÓN (Claude Code - 5 min)                                     │
└──────────────────────────────────────────────────────────────────────┘

Developer en terminal:
  $ claude
  > "Ejecuta tests y crea commit con el fix"

Claude Code ejecuta:
  1. ✅ npm run test → PASSED
  2. ✅ git commit -m "fix(profile): storage path RLS violation en avatar upload"
  3. ✅ Actualiza PHOTO_UPLOAD_AUDIT.md con "FIXED" timestamp
```

**Timeline Total**: ~30 min (vs 2-4 horas de debugging manual)

---

### Workflow 3: Refactoring Global

**Escenario**: Migrar de BehaviorSubject a signals en todos los servicios

```
┌──────────────────────────────────────────────────────────────────────┐
│ CLAUDE CODE (30 min)                                                  │
└──────────────────────────────────────────────────────────────────────┘

Developer:
  $ claude
  > "Refactoriza todos los servicios para usar signals en vez de BehaviorSubject.
     Mantén consistencia de patterns y actualiza componentes que consumen."

Claude Code ejecuta:
  1. ✅ Escanea 12 servicios con BehaviorSubject
  2. ✅ Refactoriza en batch:
     - auth.service.ts
     - cars.service.ts
     - bookings.service.ts
     - payments.service.ts
     - profile.service.ts
     - ... (7 más)

  3. ✅ Actualiza 24 componentes consumidores:
     - Reemplaza .subscribe() por effect()
     - Usa .asReadonly() para exponer signals
     - Agrega computed() para valores derivados

  4. ✅ Ejecuta npm run lint:fix → Auto-fix imports
  5. ✅ Ejecuta npm run test → 3 tests fallan
  6. ✅ Genera SIGNALS_MIGRATION_REPORT.md

Output:
  ✅ 12 servicios migrados
  ✅ 24 componentes actualizados
  ⚠️ 3 tests fallidos (necesitan ajuste)
  📄 SIGNALS_MIGRATION_REPORT.md

┌──────────────────────────────────────────────────────────────────────┐
│ CURSOR (15 min)                                                       │
└──────────────────────────────────────────────────────────────────────┘

Developer en Cursor:
  1. Lee SIGNALS_MIGRATION_REPORT.md
  2. Abre los 3 test files fallidos
  3. Cmd+K inline en cada uno:
     > "Fix this test to work with signals instead of BehaviorSubject"

Cursor ajusta:
  - TestBed.inject(Service).data$ → .data()
  - expect(spy).toHaveBeenCalled() → expect(signal()).toBe(expected)

  4. npm run test → ✅ ALL PASSED

┌──────────────────────────────────────────────────────────────────────┐
│ CLAUDE CODE (5 min)                                                   │
└──────────────────────────────────────────────────────────────────────┘

Developer:
  $ claude
  > "Valida CI y crea commit del refactor"

Claude Code:
  1. ✅ npm run ci → PASSED
  2. ✅ git commit con mensaje detallado
  3. ✅ git push
```

**Timeline Total**: ~50 min (vs 4-8 horas manual con riesgo de inconsistencias)

---

### Workflow 4: Security Audit

**Escenario**: Auditar RLS policies de nuevas features

```
┌──────────────────────────────────────────────────────────────────────┐
│ CLAUDE CODE (45 min)                                                  │
└──────────────────────────────────────────────────────────────────────┘

Developer:
  $ claude
  > "Audita todas las RLS policies de la app.
     Verifica que no haya data leaks y documenta findings."

Claude Code ejecuta:
  1. ✅ Escanea supabase/migrations/*.sql
  2. ✅ Identifica 23 tablas con RLS
  3. ✅ Valida políticas:
     - ✅ profiles: Solo owner puede ver/editar
     - ✅ cars: Public read, owner write
     - ✅ bookings: Locador + locatario pueden ver
     - ⚠️ car_reviews: FALTA policy de DELETE
     - ❌ wallet_transactions: Permite SELECT sin auth!

  4. ✅ Prueba cada policy en Supabase SQL Editor:
     SET LOCAL "request.jwt.claims" = '{"sub": "user-uuid"}';
     SELECT * FROM wallet_transactions; -- ❌ RETURNS ALL!

  5. ✅ Genera RLS_SECURITY_AUDIT.md:
     - Executive summary
     - 2 CRITICAL issues found
     - 1 WARNING
     - Fix implementations
     - Testing procedures

  6. ✅ Implementa fixes:
     - Agrega DELETE policy a car_reviews
     - Restringe wallet_transactions SELECT a owner

  7. ✅ Re-ejecuta audit → ✅ ALL PASSED

Output:
  📄 RLS_SECURITY_AUDIT.md
  ✅ 2 critical vulnerabilities fixed
  ✅ Migrations actualizadas
```

**Timeline Total**: ~45 min (vs auditoría manual de días)

---

## 📊 Matriz de Decisión Rápida

| Tarea | Agente | Comando/Acción | Tiempo Estimado |
|-------|--------|----------------|-----------------|
| **Planear nueva feature** | Claude Code | `claude` > "Diseña feature X..." | 20-30 min |
| **Implementar componente** | Cursor | Composer: "Implementa X" | 15-30 min |
| **Fix de linting** | Cursor | Cmd+K inline | 1-5 min |
| **Bug simple (TypeScript)** | Cursor | Cmd+K inline | 2-10 min |
| **Bug complejo (RLS/auth)** | Claude Code | `claude` > "Analiza bug..." | 15-30 min |
| **Refactor 1 archivo** | Cursor | Cmd+K inline | 5-10 min |
| **Refactor 5+ archivos** | Claude Code | `claude` > "Refactoriza..." | 20-40 min |
| **Ejecutar tests** | Claude Code | `claude` > "npm run ci" | 3-5 min |
| **Deploy a staging** | Claude Code | `claude` > "Deploy to staging" | 10-15 min |
| **Deploy a producción** | Claude Code | `claude` > "Deploy to production" | 15-20 min |
| **Generar documentación** | Claude Code | `claude` > "Documenta feature X" | 10-20 min |
| **Security audit** | Claude Code | `claude` > "Audita RLS policies" | 30-60 min |
| **Performance optimization** | Claude Code | `claude` > "Analiza bundle size" | 20-40 min |
| **Database migration** | Claude Code | `claude` > "Crea migration para X" | 15-25 min |
| **Autocompletado en código** | Cursor | Tab (autocomplete) | Instantáneo |

---

## 🎓 Mejores Prácticas

### 1. Comunicación Entre Agentes

**CLAUDE.md como Fuente de Verdad**:
- Ambos agentes leen este archivo
- Documenta arquitectura, patterns, decisiones
- Actualiza cuando cambien decisiones importantes

**Cursor Rules (.cursorrules)**:
- Define responsabilidades de Cursor
- Indica cuándo delegar a Claude Code
- Mantiene consistencia de código

**TODO Lists**:
- Claude Code crea TODO lists para features grandes
- Cursor marca progreso mientras implementa
- Claude Code valida completitud

### 2. Division de Trabajo Óptima

```
┌───────────────────────────────────────────────────────────┐
│ CRITERIO: ¿Cuántos archivos afecta la tarea?             │
├───────────────────────────────────────────────────────────┤
│ 1-2 archivos    → Cursor (edición inline)                │
│ 3-5 archivos    → Cursor (Composer mode)                 │
│ 5+ archivos     → Claude Code (batch processing)         │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│ CRITERIO: ¿Requiere análisis vertical (múltiples capas)? │
├───────────────────────────────────────────────────────────┤
│ NO (single layer)  → Cursor                               │
│ SÍ (UI→Service→DB→RLS) → Claude Code                      │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│ CRITERIO: ¿Requiere ejecutar comandos largos (>2 min)?   │
├───────────────────────────────────────────────────────────┤
│ NO (compilación rápida) → Cursor terminal                │
│ SÍ (build, deploy, tests) → Claude Code (auto-background)│
└───────────────────────────────────────────────────────────┘
```

### 3. Documentación Automática

**Claude Code genera**:
- `*_AUDIT.md`: Análisis de debugging
- `*_IMPLEMENTATION_PLAN.md`: Planes de features
- `*_MIGRATION_REPORT.md`: Refactorings
- `CHANGELOG.md`: Updates automáticos

**Cursor consume**:
- Lee estos docs para contexto
- Implementa según planes
- No necesita generar docs extensos

### 4. Commits Inteligentes

**Claude Code**:
```bash
# Commits detallados con co-authorship
git commit -m "feat(reviews): sistema de reviews para autos

- Nueva tabla car_reviews con RLS
- ReviewsService con signals
- Componente car-reviews-list

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Cursor**:
```bash
# Commits rápidos para iteraciones
git commit -m "fix(reviews): typo en template"
```

### 5. Testing Strategy

**Cursor**:
- Tests unitarios específicos mientras desarrollas
- `npm run test:quick` para validación rápida
- Fix de tests fallidos en tiempo real

**Claude Code**:
- `npm run ci` completo antes de deploy
- Generación de tests con coverage >80%
- E2E tests con Playwright

---

## 🚀 Quick Start Guide

### Setup Inicial (Una sola vez)

```bash
# 1. Verifica que tienes ambos agentes instalados
which claude      # Claude Code CLI
which cursor      # Cursor editor

# 2. Verifica archivos de configuración
ls -la /home/edu/autorenta/.cursorrules  # ✅
cat /home/edu/autorenta/CLAUDE.md        # ✅

# 3. Configura authentication (si no está hecho)
./tools/setup-auth.sh    # GitHub, Supabase, Cloudflare
./tools/check-auth.sh    # Verifica estado

# 4. Instala dependencias
npm run install:all      # Root + web + worker
```

### Workflow Diario

#### Opción A: Feature Nueva (Plan → Code → Deploy)

```bash
# Terminal 1: Claude Code (siempre abierto)
$ claude
# Espera instrucciones...

# Terminal 2: Desarrollo
$ npm run dev    # Angular + Worker
# Cursor abierto en editor

# Flujo:
# 1. Pides plan a Claude Code: "Diseña feature X"
# 2. Implementas en Cursor según plan
# 3. Validas con Claude Code: "npm run ci && deploy"
```

#### Opción B: Bug Fix Rápido (Code → Test)

```bash
# Cursor abierto
# 1. Cmd+K inline para fix
# 2. npm run test:quick
# 3. Si funciona → commit
# 4. Si no funciona → Delegar a Claude Code para análisis
```

#### Opción C: Refactor Global (Automation)

```bash
$ claude
> "Refactoriza [descripción]"
# Claude Code hace todo el refactor
# Tú revisas en Cursor y ajustas detalles
```

---

## 📈 Métricas de Éxito

### Antes (Solo Developer)

- ⏱️ Feature nueva: 1-2 días
- 🐛 Bug complejo: 2-4 horas
- 🔄 Refactor global: 4-8 horas
- 🚀 Deploy manual: 30-60 min (con errores)
- 📝 Documentación: Casi nunca

### Después (Multi-Agente)

- ⏱️ Feature nueva: **2-3 horas** (60-70% reducción)
- 🐛 Bug complejo: **30-45 min** (75% reducción)
- 🔄 Refactor global: **45-60 min** (85% reducción)
- 🚀 Deploy automatizado: **15 min** (cero errores)
- 📝 Documentación: **Automática** (100% coverage)

### ROI Estimado

**Caso Real - Sprint de 2 semanas**:

| Tarea | Tiempo Tradicional | Tiempo Multi-Agente | Ahorro |
|-------|-------------------|---------------------|---------|
| 3 features nuevas | 6 días | 1.5 días | **4.5 días** |
| 8 bug fixes | 1 día | 4 horas | **4 horas** |
| 1 refactor global | 1 día | 1 hora | **7 horas** |
| Deployments (10x) | 8 horas | 2.5 horas | **5.5 horas** |
| Documentación | 0 horas | Automático | **∞** |

**Total Sprint**: 10 días → **4 días** = **60% más rápido**

---

## 🔧 Troubleshooting

### Problema: Cursor no entiende contexto de AutoRenta

**Solución**:
```bash
# Verifica que .cursorrules existe
cat .cursorrules

# Reinicia Cursor para cargar rules
# Cmd+Shift+P → "Reload Window"

# En Composer, menciona explícitamente:
> "Según CLAUDE.md, implementa [feature]..."
```

### Problema: Claude Code no encuentra archivos

**Solución**:
```bash
# Verifica working directory
$ claude
> "pwd"
# Debe ser /home/edu/autorenta

# Si no, reinicia:
$ cd /home/edu/autorenta
$ claude
```

### Problema: Conflictos entre ediciones

**Solución**:
1. Claude Code trabaja en branch separado para refactors grandes
2. Cursor trabaja en main/feature branches
3. Merge después de validación de CI

```bash
# Claude Code:
git checkout -b refactor/signals-migration
# ... hace cambios ...
git push origin refactor/signals-migration

# Cursor:
# Pull request review
# Merge después de CI ✅
```

### Problema: Timeouts en comandos largos

**Solución**:
```bash
# Verifica settings.json
cat .claude/settings.json
# Debe tener:
# "BASH_DEFAULT_TIMEOUT_MS": "600000"  (10 min)
# "BASH_MAX_TIMEOUT_MS": "1200000"     (20 min)

# O usa workflows automatizados:
npm run ci      # Aprovecha auto-background
npm run deploy  # No más timeouts
```

---

## 📚 Recursos Adicionales

### Documentación del Proyecto

- **CLAUDE.md**: Arquitectura completa
- **.cursorrules**: Configuración de Cursor
- **MULTI_AGENT_WORKFLOW.md**: Este documento
- **tools/claude-workflows.sh**: Scripts de automatización

### Ejemplos de Audits

- **PHOTO_UPLOAD_AUDIT.md**: Debugging vertical de RLS
- **WALLET_SYSTEM_DOCUMENTATION.md**: Sistema de wallet
- **CASH_DEPOSITS_NON_WITHDRAWABLE_FIX.md**: Payment types

### Comandos Útiles

```bash
# Ver status del proyecto
source tools/claude-workflows.sh && status

# Ver workflows disponibles
npm run workflows

# Health check completo
./tools/check-auth.sh && npm run ci
```

---

## 🎯 Próximos Pasos

### Para el Developer

1. ✅ Lee este documento completo
2. ✅ Prueba el Workflow 1 (feature pequeña)
3. ✅ Familiarízate con delegación Claude ↔ Cursor
4. ✅ Ajusta .cursorrules según tus preferencias
5. ⏳ Itera y optimiza el workflow

### Para el Proyecto

1. ⏳ Crear PATTERNS.md con code templates
2. ⏳ Configurar Claude Skills cuando estén disponibles
3. ⏳ Setup de MCP observability para debugging de webhooks
4. ⏳ Automatizar más workflows (backup DB, metrics, etc)

---

## 🤝 Contribuciones

Si descubres nuevos workflows o mejoras, documenta en:
- Este archivo (MULTI_AGENT_WORKFLOW.md)
- .cursorrules (si afecta a Cursor)
- CLAUDE.md (si es arquitectura)

**Formato de workflow nuevo**:
```markdown
### Workflow N: [Nombre]

**Escenario**: [Descripción]

[Diagrama de flujo con fases Claude/Cursor]

**Timeline Total**: X min/horas
```

---

**Versión**: 1.0.0
**Última actualización**: 2025-11-03
**Mantenedor**: @ecucondorSA
**Proyecto**: AutoRenta - Car Rental Marketplace (Argentina)

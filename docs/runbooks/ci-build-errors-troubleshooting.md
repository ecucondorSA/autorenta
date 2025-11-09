# CI Build Errors - Troubleshooting Runbook

**Creado:** 2025-11-09
**Caso de uso:** Tu PR falló en CI con errores de build
**Tiempo estimado:** 10-30 minutos (según severidad)

---

## 🚦 Quick Diagnosis

### Paso 1: Identifica el tipo de falla

```bash
# Ver logs del workflow fallido en GitHub Actions
gh run view <run-id> --log-failed

# O ejecutar build localmente
cd apps/web
pnpm build 2>&1 | tee build-errors.txt
```

### Paso 2: Clasifica los errores

```bash
# Contar errores por tipo
grep "ERROR" build-errors.txt | grep -o "TS[0-9]*" | sort | uniq -c | sort -rn
```

**Output esperado:**
```
     83 TS2339   # Property doesn't exist
     19 TS2353   # Object literal issues
     16 TS2307   # Module not found
     14 TS7006   # Implicit any
```

### Paso 3: Busca tu categoría abajo 👇

---

## 🔧 Error Categories & Solutions

### Category A: TS2339 - Property does not exist (50+ errores)

**Causa más común:** Tipos de Supabase desactualizados

**Ejemplo:**
```typescript
// TS2339: Property 'flag_status' does not exist on type 'Claim'
claim.flag_status = 'pending';
```

**Fix rápido:**
```bash
# Sincronizar tipos desde Supabase
npm run sync:types:remote

# Verificar cambios
git diff apps/web/src/app/core/types/database.types.ts

# Si hay cambios, commitear
git add apps/web/src/app/core/types/database.types.ts
git commit -m "chore: sync Supabase database types"
```

**Fix manual (si sync:types:remote falla):**
```bash
# Requiere Supabase CLI autenticado
supabase login
supabase gen types typescript \
  --project-id obxvffplochgeiclibng \
  > apps/web/src/app/core/types/database.types.ts
```

**Tiempo:** 2-5 minutos
**Prevención:** Sincronizar types después de cada migration

---

### Category B: TS2307 - Cannot find module (10+ errores)

**Causa:** Import paths incorrectos o módulos faltantes

**Ejemplo 1: Path incorrecto**
```typescript
// ❌ Error
import { SupabaseService } from './supabase.service';

// ✅ Fix
import { SupabaseClientService } from './supabase-client.service';
```

**Ejemplo 2: Dependencia faltante**
```typescript
// TS2307: Cannot find module 'flatpickr'
import flatpickr from 'flatpickr';

// Fix: Instalar dependencia
npm install --save-dev @types/flatpickr
```

**Comando de diagnóstico:**
```bash
# Encontrar todos los imports rotos
grep -A 2 "TS2307" build-errors.txt

# Verificar si archivo existe
find apps/web/src -name "supabase.service.ts"  # Debería estar vacío si no existe
```

**Tiempo:** 5-10 minutos
**Prevención:** Verificar imports antes de commit con `npm run build`

---

### Category C: TS7006 - Implicit 'any' type (10+ errores)

**Causa:** Parámetros sin tipo explícito

**Ejemplo:**
```typescript
// ❌ Error
items.filter((item) => item.status === 'active')
.subscribe({ error: (err) => console.error(err) })

// ✅ Fix
items.filter((item: Item) => item.status === 'active')
.subscribe({ error: (err: unknown) => console.error(err) })
```

**Comando de diagnóstico:**
```bash
# Ver archivos afectados
grep -B 5 "TS7006" build-errors.txt | grep "src/" | sort -u
```

**Fix pattern:**
1. Identificar el tipo correcto (Item, Booking, etc.)
2. Agregar `: TipoApropiado` a cada parámetro
3. Para errors: usar `err: unknown` o `err: Error`

**Tiempo:** 1-2 minutos por error
**Prevención:** Configurar ESLint rule `@typescript-eslint/no-explicit-any: error`

---

### Category D: TS2554 - Expected X arguments, but got Y

**Causa más común:** Toast service calls incorrectos

**Ejemplo:**
```typescript
// ❌ Error: Expected 2-3 arguments, but got 1
this.toastService.success('Operación exitosa');

// ✅ Fix
this.toastService.success('Operación exitosa', 'Los datos se guardaron correctamente');
```

**Comando de diagnóstico:**
```bash
# Encontrar toast calls con 1 parámetro
grep -rn "toastService\.\(success\|error\|warning\|info\)('[^,]*');" apps/web/src --include="*.ts"
```

**Fix rápido:**
```bash
# Usar sed para fix masivo (revisar después)
find apps/web/src -name "*.ts" -exec sed -i \
  "s/toastService\.success('\([^']*\)')/toastService.success('Éxito', '\1')/g" {} \;
```

**Tiempo:** 30 segundos por error
**Prevención:** Usar snippet de VS Code para toast calls

---

### Category E: TS2353 - Object literal may only specify known properties

**Causa:** Propiedades extra en object literals

**Ejemplo:**
```typescript
// ❌ Error
const booking: Booking = {
  id: '123',
  car_id: '456',
  invalid_property: 'value',  // ❌ No existe en tipo Booking
};

// ✅ Fix: Remover propiedad o ajustar tipo
const booking: Booking = {
  id: '123',
  car_id: '456',
};
```

**Comando de diagnóstico:**
```bash
# Ver propiedades problemáticas
grep -A 3 "TS2353" build-errors.txt
```

**Tiempo:** 1-2 minutos por error
**Prevención:** Usar type checking en desarrollo

---

### Category F: Template Parser Errors (100+ errores)

**Causa:** Template inline muy grande (>100 líneas)

**Síntomas:**
```
TS1434: Unexpected keyword or identifier
TS1005: ';' expected
Cannot find name 'div', 'rem', etc.
```

**Fix:**
```bash
# 1. Identificar componente problemático
grep -B 10 "TS1434" build-errors.txt | grep "\.ts:"

# 2. Extraer template a archivo separado
# Ejemplo: urgent-booking.page.ts

# Crear archivo HTML
touch apps/web/src/app/features/bookings/urgent-booking/urgent-booking.page.html

# Mover contenido del template: `...` al .html
# En el .ts, cambiar:
#   template: `...`
# Por:
#   templateUrl: './urgent-booking.page.html'
```

**Script automatizado:**
```bash
# Ver DEVELOPMENT_GUIDELINES.md sección "Fix 1: Encontrar templates inline grandes"
```

**Tiempo:** 2-3 minutos por componente
**Prevención:** Nunca usar template inline >50 líneas

---

## 🔍 Advanced Troubleshooting

### Scenario 1: Errores después de merge de main

**Causa probable:** main tiene cambios de DB que tu branch no tiene

**Fix:**
```bash
# 1. Merge o rebase de main
git checkout tu-branch
git pull origin main

# 2. Sincronizar tipos
npm run sync:types:remote

# 3. Rebuild
pnpm build
```

---

### Scenario 2: Build pasa localmente pero falla en CI

**Causas posibles:**
1. Lockfile desactualizado
2. Node version diferente
3. Cache de build corrupto

**Fix:**
```bash
# 1. Regenerar lockfile
rm pnpm-lock.yaml
pnpm install

# 2. Commit lockfile
git add pnpm-lock.yaml
git commit -m "chore: regenerate lockfile"

# 3. Verificar Node version
cat .nvmrc  # Debe coincidir con CI
node --version
```

---

### Scenario 3: 100+ errores repentinos

**Causa probable:** Dependencia rota o database.types.ts corrupto

**Fix:**
```bash
# 1. Verificar integridad de database.types.ts
head -20 apps/web/src/app/core/types/database.types.ts

# Si está vacío o mal formado:
git checkout HEAD~1 apps/web/src/app/core/types/database.types.ts
npm run sync:types:remote

# 2. Verificar dependencias
pnpm install --frozen-lockfile
```

---

## 📊 Error Priority Matrix

### Critical (bloquean deploy) - Fix ASAP
- ❌ Build failures (cualquier TS error)
- ❌ Lint failures que rompan CI
- ❌ Missing dependencies

### High (afectan otros developers) - Fix same day
- ⚠️ Tipos de Supabase desactualizados
- ⚠️ Import paths incorrectos
- ⚠️ Template parser errors

### Medium (técnica deuda) - Fix en sprint
- 🔸 Implicit any types
- 🔸 Toast service misuse
- 🔸 Arrow functions en templates

### Low (mejoras) - Backlog
- 🔹 Type assertions vs guards
- 🔹 Optimizaciones de performance
- 🔹 Refactoring de código legacy

---

## 🚀 Quick Reference Commands

```bash
# Diagnóstico completo
pnpm build 2>&1 | tee build.log
grep "ERROR" build.log | wc -l  # Total de errores
grep "ERROR" build.log | grep -o "TS[0-9]*" | sort | uniq -c | sort -rn  # Por tipo

# Fixes rápidos
npm run sync:types:remote        # Sync Supabase types
npm run lint:fix                 # Auto-fix lint
pnpm install --frozen-lockfile   # Reinstall deps

# Verificación
npm run ci                       # Full CI pipeline local
npm run test:quick               # Tests sin coverage
npm run build                    # Build sin tests
```

---

## 📞 Escalation Path

Si después de 30 minutos no resolviste:

1. **Buscar en historial:** `git log --all --grep="similar error"`
2. **Buscar en PRs cerrados:** Issues similares en GitHub
3. **Consultar CI_FIX_PROGRESS.md:** Casos documentados
4. **Consultar DEVELOPMENT_GUIDELINES.md:** Patrones comunes
5. **Pedir ayuda:** Slack #dev-support con:
   - Link al PR/workflow
   - Output de `pnpm build 2>&1 | head -50`
   - Lo que ya intentaste

---

## 📚 Related Documentation

- [DEVELOPMENT_GUIDELINES.md](../../DEVELOPMENT_GUIDELINES.md) - Prevención de errores
- [CI_FIX_PROGRESS.md](../../CI_FIX_PROGRESS.md) - Historia de 2,411 → 211 errores
- [CLAUDE_ARCHITECTURE.md](../../CLAUDE_ARCHITECTURE.md) - Arquitectura del proyecto
- [troubleshooting.md](./troubleshooting.md) - Troubleshooting general

---

**Última actualización:** 2025-11-09
**Casos resueltos:** 2,200+ errores (91.2% de 2,411 iniciales)
**Tiempo promedio de resolución:** 15 minutos

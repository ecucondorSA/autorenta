# Development Guidelines - AutoRenta

**Creado:** 2025-11-09

**Propósito:** Prevenir errores comunes encontrados durante CI fix (2,411 → 211 errores)

---

## 🚨 Common Pitfalls & How to Avoid Them

### 1. Template Inline vs External Files

**❌ EVITAR: Templates inline grandes (>50 líneas)**

```typescript
@Component({
  selector: 'app-example',
  template: `
    <div>
      <ion-card>
        <!-- 200+ líneas de HTML... -->
      </ion-card>
    </div>
  `,
})
```

**Problema:** TypeScript compiler parsea HTML/CSS como TypeScript → 2,008 errores

**✅ USAR: Archivo .html separado**

```typescript
@Component({
  selector: 'app-example',
  templateUrl: './example.component.html',
})
```

**Regla:** Si tu template tiene >50 líneas O contiene estilos complejos → usa archivo separado.

---

### 2. ToastService API

**❌ INCORRECTO: Un solo parámetro**

```typescript
this.toastService.success('Operación exitosa');
this.toastService.error('Error al guardar');
```

**Problema:** ToastService requiere 2-3 parámetros: (title, message, duration?)

**✅ CORRECTO: Título + Mensaje**

```typescript
this.toastService.success('Operación exitosa', 'Los datos se guardaron correctamente');
this.toastService.error('Error al guardar', 'Por favor intenta nuevamente');
```

**Patrón:**

- **Title:** 2-4 palabras, describe QUÉ pasó
- **Message:** Frase completa, explica contexto o próximos pasos

**Verificar antes de commit:**

```bash
# Buscar toast calls con un solo parámetro
grep -r "toastService\.\(success\|error\|warning\|info\)('[^']*');" apps/web/src --include="*.ts"
```

---

### 3. Implicit 'any' Types

**❌ EVITAR: Parámetros sin tipo**

```typescript
// TS7006: Parameter 'item' implicitly has an 'any' type
items.filter((item) => item.status === 'active');
items.reduce((sum, item) => sum + item.amount, 0);

// En callbacks de observables
.subscribe({
  next: (data) => this.items.set(data),
  error: (err) => console.error(err),
});
```

**✅ USAR: Tipos explícitos**

```typescript
items.filter((item: Item) => item.status === 'active');
items.reduce((sum: number, item: Item) => sum + item.amount, 0);

.subscribe({
  next: (data: Item[]) => this.items.set(data),
  error: (err: unknown) => console.error(err),
});
```

**Regla:** SIEMPRE tipar parámetros de:

- `.map()`, `.filter()`, `.reduce()`
- Callbacks de observables (`next`, `error`, `complete`)
- Event handlers
- Callbacks de funciones externas (flatpickr, etc.)

---

### 4. Arrow Functions in Templates

**❌ EVITAR: Lógica en templates**

```typescript
// Template
<div>{{ items().reduce((sum, i) => sum + i.price, 0) }}</div>
<div>{{ cars().filter(c => c.status === 'active').length }}</div>
```

**Problema:** Angular style guide desaconseja arrow functions en templates

**✅ USAR: Métodos en el componente**

```typescript
// Component
getTotalPrice(): number {
  return this.items().reduce((sum, i) => sum + i.price, 0);
}

getActiveCarsCount(): number {
  return this.cars().filter(c => c.status === 'active').length;
}

// Template
<div>{{ getTotalPrice() }}</div>
<div>{{ getActiveCarsCount() }}</div>
```

**Mejor aún: Usar `computed` signals**

```typescript
readonly totalPrice = computed(() =>
  this.items().reduce((sum, i) => sum + i.price, 0)
);

readonly activeCarsCount = computed(() =>
  this.cars().filter(c => c.status === 'active').length
);
```

---

### 5. Module Imports - Verificar Paths

**❌ COMÚN: Importar módulos inexistentes**

```typescript
import { SupabaseService } from './supabase.service';  // ❌ No existe
import { WithdrawalService } from '../../../withdrawal.service';  // ❌ Path incorrecto
```

**Problema:** TypeScript no detecta hasta build time

**✅ VERIFICAR: Módulos reales**

```typescript
import { SupabaseClientService } from './supabase-client.service';  // ✅ Existe
import { WithdrawalService } from '../../../core/services/withdrawal.service';  // ✅ Path correcto
```

**Pre-commit check:**

```bash
# Verificar que todos los imports existen
pnpm build --dry-run
```

**Módulos comunes en AutoRenta:**

```typescript
// Supabase
import { SupabaseClientService } from '@core/services/supabase-client.service';

// Toast
import { ToastService } from '@core/services/toast.service';

// Models
import { Car, Booking, User } from '@core/models';
import type { WithdrawalRequest } from '@core/models/wallet.model';
```

---

### 6. IonicModule - Always Import

**❌ COMÚN: Usar componentes Ionic sin importar módulo**

```typescript
@Component({
  standalone: true,
  imports: [CommonModule],  // ❌ Falta IonicModule
  template: `
    <ion-card>...</ion-card>  <!-- Error: 'ion-card' is not a known element -->
  `,
})
```

**✅ SIEMPRE: Importar IonicModule**

```typescript
@Component({
  standalone: true,
  imports: [CommonModule, IonicModule],  // ✅
  template: `
    <ion-card>...</ion-card>
  `,
})
```

**Regla:** Si tu template usa CUALQUIER componente `<ion-*>` → importa `IonicModule`

---

### 7. Supabase Types - Keep Synced

**⚠️ CRÍTICO: Types desactualizados causan 83+ errores**

**Problema:** Schemas de DB evolucionan, pero `database.types.ts` queda viejo

**Síntomas:**

```typescript
// TS2339: Property 'flag_status' does not exist
claim.flag_status  // ❌ Campo nuevo en DB, no en types

// TS2551: Property 'start_date' does not exist. Did you mean 'start_at'?
booking.start_date  // ❌ Campo renombrado en DB
```

**✅ SOLUCIÓN: Sync regular**

```bash
# Opción 1: Sync remoto (desde Supabase cloud)
npm run sync:types:remote

# Opción 2: Manual con CLI
npx supabase gen types typescript \
  --project-id obxvffplochgeiclibng \
  > apps/web/src/app/core/types/database.types.ts
```

**CUÁNDO sincronizar:**

- ✅ Después de cada migration en Supabase
- ✅ Al hacer checkout de una branch con cambios de DB
- ✅ Si ves errores TS2339 en propiedades que SABES que existen
- ✅ Semanalmente (preventivo)

**Agregar a pre-commit hook:**

```bash
# .husky/pre-commit
# Verificar que types están sincronizados
npm run sync:types:check || echo "⚠️  Considera sincronizar tipos de Supabase"
```

---

### 8. Type Assertions for Unknown Objects

**❌ COMÚN: No manejar tipos unknown**

```typescript
const result = await someAsyncCall();
result.property;  // TS2571: Object is of type 'unknown'
```

**✅ OPCIÓN 1: Type assertion (si confías en el tipo)**

```typescript
const result = (await someAsyncCall()) as MyType;
result.property;  // ✅
```

**✅ OPCIÓN 2: Type guard (más seguro)**

```typescript
const result = await someAsyncCall();
if (typeof result === 'object' && result !== null && 'property' in result) {
  result.property;  // ✅
}
```

**✅ OPCIÓN 3: Explicit interface**

```typescript
interface ApiResponse {
  property: string;
}

const result: ApiResponse = await someAsyncCall();
result.property;  // ✅
```

---

## 📋 Pre-Commit Checklist

Antes de hacer commit, verifica:

```bash
# 1. Lint pasa
npm run lint

# 2. Build exitoso
npm run build

# 3. Tests pasan (si aplica)
npm run test:quick

# 4. No hay TODOs sin ticket
grep -r "TODO" apps/web/src --include="*.ts" | grep -v "TODO(#[0-9]*)"
```

**Si agregaste/modificaste:**

- ✅ Template inline >50 líneas → extraer a .html
- ✅ Toast calls → verificar 2 parámetros
- ✅ Callbacks → agregar tipos explícitos
- ✅ Imports nuevos → verificar paths
- ✅ Componentes Ionic → importar IonicModule
- ✅ Cambios de DB → sincronizar types

---

## 🛠️ Quick Fixes

### Fix 1: Encontrar templates inline grandes

```bash
# Buscar componentes con templates >100 líneas
find apps/web/src -name "*.ts" -exec sh -c '
  lines=$(grep -A 1000 "template:" "$1" | grep -B 1 "styles:" | wc -l)
  if [ "$lines" -gt 100 ]; then
    echo "$1: $lines líneas"
  fi
' _ {} \;
```

### Fix 2: Verificar toast calls

```bash
# Buscar toast calls con 1 parámetro
grep -rn "toastService\.\(success\|error\|warning\|info\)('[^']*');" apps/web/src --include="*.ts"
```

### Fix 3: Encontrar implicit any

```bash
# Build y filtrar TS7006
pnpm build 2>&1 | grep "TS7006"
```

### Fix 4: Verificar imports rotos

```bash
# Build y filtrar TS2307
pnpm build 2>&1 | grep "TS2307: Cannot find module"
```

---

## 📊 Error Prevention Metrics

**Antes de estas guidelines:** 2,411 errores de build

**Después de aplicarlas:** 211 errores (91.2% reducción)

**Categorías de errores prevenibles:**

1. Template parsing: ~2,000 errores (83%)
2. Toast API misuse: ~44 errores (1.8%)
3. Implicit any: ~38 errores (1.6%)
4. Import paths: ~16 errores (0.7%)
5. Module imports: ~89 errores (3.7%)

**ROI:** 1 hora aplicando estas guidelines previene ~10 horas de debugging.

---

## 🎯 Team Adoption

### Para nuevos developers:

1. Leer esta guía completa
2. Revisar `CI_FIX_PROGRESS.md` para ver ejemplos reales
3. Hacer pair programming en primer PR

### Para code reviews:

- Verificar estos patrones en cada PR
- Usar checklist de Pre-Commit
- Rechazar PRs con errores prevenibles

### Para CI/CD:

```yaml
# .github/workflows/pr-validation.yml
- name: Verify development guidelines
  run: |
    npm run lint
    npm run build
    npm run test:quick
```

---

## 📚 Referencias

- [Angular Style Guide](https://angular.dev/style-guide)
- [TypeScript Do's and Don'ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [Ionic Angular Documentation](https://ionicframework.com/docs/angular/overview)
- [CI_FIX_PROGRESS.md](./CI_FIX_PROGRESS.md) - Historia completa de fixes

---

**Última actualización:** 2025-11-09

**Mantenido por:** DevOps / Tech Lead

**Revisar:** Cada vez que se encuentren nuevos patrones de errores comunes


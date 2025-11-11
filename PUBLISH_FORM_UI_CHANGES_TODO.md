# Cambios Pendientes: Publish Form Category Selector UI

## ✅ Completado:

### 1. Pricing Service (`apps/web/src/app/core/services/pricing.service.ts`)
**Status**: ✅ COMPLETADO Y FUNCIONANDO

Se agregaron 3 métodos nuevos:
- `getVehicleCategories()` - Obtiene categorías desde BD
- `estimateVehicleValue()` - Llama función SQL estimate_vehicle_value_usd
- `calculateSuggestedRate()` - Calcula precio diario sugerido

**Compilación**: ✅ Sin errores

---

## ⚠️ Pendiente:

### 2. PublishBasicInfoStepComponent
**Archivo**: `apps/web/src/app/features/cars/components/publish-basic-info-step/publish-basic-info-step.component.ts`

**Status**: ⚠️ CAMBIOS NO APLICADOS (error de formato en múltiples edits)

#### Cambios necesarios:

**A) Imports (línea 1):**
```typescript
// Cambiar:
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';

// Por:
import { Component, computed, effect, inject, input, output, signal, OnInit } from '@angular/core';
```

**B) Agregar nuevo import (después de línea 4):**
```typescript
import { PricingService } from '../../../../core/services/pricing.service';
```

**C) Cambiar clase (línea ~282):**
```typescript
// Cambiar:
export class PublishBasicInfoStepComponent {

// Por:
export class PublishBasicInfoStepComponent implements OnInit {
```

**D) Agregar servicio (después de definir la clase):**
```typescript
export class PublishBasicInfoStepComponent implements OnInit {
  // ==================== SERVICES ====================

  private readonly pricingService = inject(PricingService);

  // ... resto del código
```

**E) Reemplazar `availableCategories` (línea ~336):**
```typescript
// Cambiar:
availableCategories = [
  { value: 'economy', label: 'Económico' },
  { value: 'sedan', label: 'Sedán' },
  { value: 'suv', label: 'SUV' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'van', label: 'Van' },
  { value: 'luxury', label: 'Lujo' },
  { value: 'sports', label: 'Deportivo' },
];

// Por:
availableCategories = signal<Array<{
  id: string;
  name: string;
  description: string;
  base_rate_multiplier: number;
  depreciation_rate_annual: number;
}>>([]);

isLoadingCategories = signal<boolean>(false);
valueEstimation = signal<{
  estimated_value_usd: number;
  confidence: 'high' | 'medium' | 'low' | 'none';
  source: 'pricing_model' | 'category_fallback';
  category_id?: string;
  category_name?: string;
  suggested_daily_rate_usd?: number;
} | null>(null);
isEstimating = signal<boolean>(false);
```

**F) Agregar ngOnInit (antes del constructor):**
```typescript
// ==================== LIFECYCLE ====================

ngOnInit(): void {
  this.loadCategories();
}
```

**G) Agregar effect en constructor (después de los effects existentes):**
```typescript
constructor() {
  // ... effects existentes ...

  // Estimate value when brand/model/year change
  effect(() => {
    const brand = this.localData.brand;
    const model = this.localData.model;
    const year = this.localData.year;

    if (brand && model && year >= this.minYear && year <= this.maxYear) {
      this.estimateVehicleValue();
    } else {
      this.valueEstimation.set(null);
    }
  });
}
```

**H) Agregar métodos (antes del cierre de la clase):**
```typescript
async loadCategories(): Promise<void> {
  this.isLoadingCategories.set(true);
  try {
    const categories = await this.pricingService.getVehicleCategories();
    this.availableCategories.set(categories);
  } catch (err) {
    console.error('Error loading categories:', err);
  } finally {
    this.isLoadingCategories.set(false);
  }
}

async estimateVehicleValue(): Promise<void> {
  if (this.isEstimating()) return;

  this.isEstimating.set(true);
  try {
    const estimation = await this.pricingService.estimateVehicleValue({
      brand: this.localData.brand,
      model: this.localData.model,
      year: this.localData.year,
      country: 'AR',
    });

    this.valueEstimation.set(estimation);

    // Auto-select category if estimation found one
    if (estimation?.category_id && !this.localData.category) {
      this.localData.category = estimation.category_id;
    }
  } catch (err) {
    console.error('Error estimating value:', err);
    this.valueEstimation.set(null);
  } finally {
    this.isEstimating.set(false);
  }
}
```

**I) Actualizar select de categorías en template (línea ~110-120):**
```html
<!-- Category -->
<div class="form-field">
  <label for="category" class="field-label">
    Categoría <span class="required">*</span>
  </label>
  <select
    id="category"
    class="field-input"
    [(ngModel)]="localData.category"
    required
    [disabled]="isLoadingCategories()"
  >
    <option value="">
      {{ isLoadingCategories() ? 'Cargando...' : 'Seleccionar categoría' }}
    </option>
    @for (cat of availableCategories(); track cat.id) {
      <option [value]="cat.id">
        {{ cat.name }}
        @if (cat.description) {
          <span> - {{ cat.description }}</span>
        }
      </option>
    }
  </select>
</div>
```

**J) Agregar panel de estimación en template (después de la sección "Identificación del Vehículo", antes de "Especificaciones"):**

El template completo del panel está en:
`/home/edu/autorenta/apps/web/src/app/features/cars/components/publish-basic-info-step/publish-basic-info-step.component.ts.backup`

Líneas 110-169 del archivo backup.

**K) Agregar estilos CSS (al final del bloque de styles, antes del cierre):**

Los estilos completos están en el archivo backup, líneas 352-505.

---

## 🎯 Resumen de lo que hace:

1. **Carga categorías reales** desde `vehicle_categories` table (Economy, Standard, Premium, Luxury)
2. **Estima valor del vehículo** automáticamente cuando usuario completa marca/modelo/año
3. **Muestra panel de estimación** con:
   - Valor del vehículo en USD
   - Precio sugerido por día
   - Nivel de confianza (alta/media/baja)
   - Categoría sugerida
4. **Auto-selecciona categoría** si la estimación encuentra una coincidencia

---

## 📝 Notas:

- **Backend**: ✅ 100% completo (8 migraciones + FIPE + tasas Binance + funciones SQL)
- **Pricing Service**: ✅ 100% completo y compila
- **Componente UI**: ⚠️ 80% - falta aplicar cambios al archivo

El archivo backup tiene la versión completa pero con error de formato.
Los cambios listados arriba se pueden aplicar manualmente uno por uno.

---

## 🚀 Testing después de aplicar:

```bash
# 1. Verificar compilación
npm run lint
npm run build

# 2. Iniciar dev server
npm run dev

# 3. Probar:
# - Ir a /cars/publish
# - Completar marca/modelo/año
# - Verificar que aparece panel de estimación
# - Verificar que categorías se cargan desde BD
```

---

**Autor**: Claude Code
**Fecha**: 2025-11-11
**Estado**: Backend completo, UI 80% (cambios documentados arriba)

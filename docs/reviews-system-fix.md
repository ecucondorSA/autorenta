# Corrección del Sistema de Reseñas

## Problema Actual

El formulario de reseñas usa las **mismas categorías** para ambos tipos de evaluación:
- Renter → Owner (locatario califica al locador/auto)
- Owner → Renter (locador califica al locatario)

Esto es **incorrecto** porque cada rol evalúa aspectos diferentes de la experiencia.

---

## Categorías Actuales (Incorrectas para Owner→Renter)

| Categoría | Campo DB | Descripción | Renter→Owner | Owner→Renter |
|-----------|----------|-------------|--------------|--------------|
| Limpieza | `rating_cleanliness` | Estado de limpieza del vehículo | ✅ | ❌ |
| Comunicación | `rating_communication` | Rapidez y claridad | ✅ | ✅ |
| Precisión | `rating_accuracy` | Descripción vs realidad | ✅ | ❌ |
| Ubicación | `rating_location` | Punto de entrega | ✅ | ❌ |
| Check-in | `rating_checkin` | Proceso de entrega | ✅ | ⚠️ |
| Valor | `rating_value` | Relación precio-calidad | ✅ | ❌ |

---

## Propuesta de Categorías

### Renter → Owner (Califica al auto y al propietario)

| Categoría | Campo DB | Icono | Descripción |
|-----------|----------|-------|-------------|
| Limpieza | `rating_cleanliness` | 🧼 | Estado de limpieza del vehículo |
| Comunicación | `rating_communication` | 💬 | Rapidez y claridad del propietario |
| Precisión | `rating_accuracy` | ✓ | Descripción vs realidad del vehículo |
| Ubicación | `rating_location` | 📍 | Conveniencia del punto de entrega |
| Check-in | `rating_checkin` | 🔑 | Facilidad del proceso de entrega |
| Valor | `rating_value` | 💰 | Relación precio-calidad |

### Owner → Renter (Califica al arrendatario)

| Categoría | Campo DB | Icono | Descripción |
|-----------|----------|-------|-------------|
| Comunicación | `rating_communication` | 💬 | Claridad y respuesta del arrendatario |
| Puntualidad | `rating_punctuality` | ⏰ | Cumplimiento de horarios acordados |
| Cuidado | `rating_care` | 🚗 | Cómo cuidó y devolvió el vehículo |
| Reglas | `rating_rules` | 📋 | Respeto de las condiciones del alquiler |
| Recomendación | `rating_recommend` | ⭐ | ¿Alquilarías nuevamente a este usuario? |

---

## Cambios Requeridos

### 1. Base de Datos

```sql
-- Agregar nuevas columnas para reseñas de Owner→Renter
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS rating_punctuality INTEGER CHECK (rating_punctuality >= 1 AND rating_punctuality <= 5);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS rating_care INTEGER CHECK (rating_care >= 1 AND rating_care <= 5);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS rating_rules INTEGER CHECK (rating_rules >= 1 AND rating_rules <= 5);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS rating_recommend INTEGER CHECK (rating_recommend >= 1 AND rating_recommend <= 5);

-- Las columnas existentes se mantienen para Renter→Owner:
-- rating_cleanliness, rating_communication, rating_accuracy, rating_location, rating_checkin, rating_value
```

### 2. Modelo TypeScript

**Archivo:** `apps/web/src/app/core/models/review.model.ts`

```typescript
// Categorías comunes
interface BaseReviewRatings {
  rating_communication: number; // 1-5
}

// Renter califica al Owner/Auto
interface RenterToOwnerRatings extends BaseReviewRatings {
  rating_cleanliness: number;
  rating_accuracy: number;
  rating_location: number;
  rating_checkin: number;
  rating_value: number;
}

// Owner califica al Renter
interface OwnerToRenterRatings extends BaseReviewRatings {
  rating_punctuality: number;
  rating_care: number;
  rating_rules: number;
  rating_recommend: number;
}
```

### 3. Componente ReviewForm

**Archivo:** `apps/web/src/app/shared/components/review-form/review-form.component.ts`

- Agregar dos sets de categorías: `renterToOwnerCategories` y `ownerToRenterCategories`
- Usar `reviewType` para seleccionar qué categorías mostrar
- Ajustar el formulario dinámicamente según el tipo

### 4. Servicio de Reviews

**Archivo:** `apps/web/src/app/core/services/reviews/reviews.service.ts`

- Actualizar `CreateReviewParams` para soportar ambos tipos de ratings
- Validar que se envíen los campos correctos según el tipo de reseña

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `supabase/migrations/YYYYMMDD_review_categories.sql` | Agregar columnas nuevas |
| `apps/web/src/app/core/models/review.model.ts` | Actualizar interfaces |
| `apps/web/src/app/core/models/supabase.types.generated.ts` | Regenerar tipos |
| `apps/web/src/app/shared/components/review-form/review-form.component.ts` | Categorías dinámicas |
| `apps/web/src/app/shared/components/review-form/review-form.component.html` | Sin cambios (usa loop) |
| `apps/web/src/app/shared/components/review-card/review-card.component.ts` | Mostrar categorías correctas |
| `apps/web/src/app/shared/components/review-card/review-card.component.html` | Mostrar categorías correctas |

---

## Validaciones

- [ ] Renter solo puede enviar reseña tipo `renter_to_owner` con categorías de auto/owner
- [ ] Owner solo puede enviar reseña tipo `owner_to_renter` con categorías de renter
- [ ] Las categorías no aplicables deben ser NULL en la BD
- [ ] El promedio se calcula solo con las categorías aplicables
- [ ] La UI muestra solo las categorías relevantes al tipo de reseña

---

## Testing

1. Login como Renter → Completar booking → Dejar reseña → Verificar categorías de auto
2. Login como Owner → Booking completado → Dejar reseña → Verificar categorías de renter
3. Verificar que los promedios se calculen correctamente
4. Verificar que las cards muestren las categorías correctas

---

## Notas

- El campo `rating_communication` se comparte entre ambos tipos
- Las columnas existentes (`rating_cleanliness`, etc.) se mantienen para backwards compatibility
- Los reviews antiguos seguirán funcionando con las categorías originales

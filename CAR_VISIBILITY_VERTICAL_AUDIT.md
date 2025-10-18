# 🔍 CAR VISIBILITY VERTICAL AUDIT

**Date**: 2025-10-17
**Issue**: Autos publicados no aparecen en el mapa ni en la lista de disponibles
**Síntoma**: Después de publicar un auto correctamente, no aparece en `/cars`

---

## 📊 VERTICAL STACK ANALYSIS

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1: UI Component (Angular)                            │
│  File: publish-car-v2.page.ts                               │
│  Status: ⚠️ PROBLEMA ENCONTRADO                            │
│  Lines: 483-550                                             │
│  Notes:                                                     │
│  - onSubmit() NO está estableciendo status = 'active' ❌    │
│  - carData no incluye status field                         │
│  - DEFAULT en DB es 'draft' → auto queda invisible         │
│                                                             │
│  ❌ ISSUE #1: Falta establecer status = 'active'           │
└─────────────────────────────────────────────────────────────┘
              ↓↑
┌─────────────────────────────────────────────────────────────┐
│  LAYER 2: Service Layer                                     │
│  File: cars.service.ts                                      │
│  Status: ✅ CORRECTO                                        │
│  Lines: 12-24                                               │
│  Method: createCar(input: Partial<Car>)                     │
│  Notes:                                                     │
│  - Simplemente inserta lo que recibe del componente        │
│  - No tiene lógica de geocodificación                      │
│  - Responsabilidad del servicio es correcta                │
│                                                             │
│  ✅ Service layer trabaja correctamente                    │
└─────────────────────────────────────────────────────────────┘
              ↓↑
┌─────────────────────────────────────────────────────────────┐
│  LAYER 3: Geocoding Service                                 │
│  Status: ❌ NO IMPLEMENTADO                                 │
│  Expected: geocoding.service.ts                             │
│  Notes:                                                     │
│  - No existe servicio de geocodificación                   │
│  - Frontend debería geocodificar dirección antes de insertar│
│  - O backend debería hacerlo con trigger/function          │
│  - Sin coordenadas → sin marcador en mapa                  │
│                                                             │
│  ❌ ISSUE #2: Falta geocodificación de dirección           │
└─────────────────────────────────────────────────────────────┘
              ↓↑
┌─────────────────────────────────────────────────────────────┐
│  LAYER 4: Database INSERT                                    │
│  Table: cars                                                │
│  Status: ❌ DATOS INCOMPLETOS                               │
│  Notes:                                                     │
│  - status = 'draft' (DEFAULT)                              │
│  - location_lat = NULL                                     │
│  - location_lng = NULL                                     │
│  - Solo tiene location_city, location_country (texto)      │
│                                                             │
│  Actual data del auto publicado:                           │
│  id: 92359924-f921-4785-81a9-acee211f60fb                  │
│  title: "Chevrolet Cruze 2025"                             │
│  status: 'draft' ❌                                         │
│  location_lat: NULL ❌                                      │
│  location_lng: NULL ❌                                      │
│  location_city: "BUENOS AIRES"                             │
│  location_country: "AR"                                    │
│                                                             │
│  ❌ CRITICAL: Falta status y coordenadas                   │
└─────────────────────────────────────────────────────────────┘
              ↓↑
┌─────────────────────────────────────────────────────────────┐
│  LAYER 5: Query en /cars page                               │
│  File: cars-list.page.ts                                    │
│  Status: ⚠️ REQUIERE VERIFICACIÓN                          │
│  Notes:                                                     │
│  - Query probablemente filtra por status = 'active'        │
│  - Query puede filtrar por location_lat IS NOT NULL        │
│  - Por eso el auto no aparece                              │
│                                                             │
│  ⚠️ NEEDS VERIFICATION: Revisar filtros de query           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔎 ROOT CAUSES IDENTIFIED

### Issue #1: Status = 'draft' en vez de 'active'

**Descripción**: El formulario no establece `status: 'active'` al publicar

**Ubicación**: `publish-car-v2.page.ts:502-540`

**Código actual**:
```typescript
const carData: Partial<Car> = {
  brand_id: formValue.brand_id,
  model_id: formValue.model_id,
  // ... muchos otros campos
  // ❌ FALTA: status: 'active'
};
```

**Solución**:
```typescript
const carData: Partial<Car> = {
  brand_id: formValue.brand_id,
  model_id: formValue.model_id,
  // ... otros campos
  status: 'active', // ✅ NUEVO
};
```

---

### Issue #2: location_lat y location_lng son NULL

**Descripción**: Sin coordenadas geográficas, el auto no puede aparecer en el mapa

**Causas posibles**:
1. **No hay geocodificación** en el frontend antes de insertar
2. **No hay trigger/function** en el backend que geocodifique automáticamente
3. **Usuario no proporciona coordenadas** manualmente (ni debería)

**Ubicación del problema**: `publish-car-v2.page.ts:502-540`

**Datos actuales del formulario**:
```typescript
const carData: Partial<Car> = {
  location_street: formValue.location_street,           // "Av. 18 de Julio"
  location_street_number: formValue.location_street_number, // "1234"
  location_city: formValue.location_city,               // "Montevideo"
  location_state: formValue.location_state,             // "Montevideo"
  location_country: formValue.location_country,         // "Uruguay"
  // ❌ FALTAN: location_lat y location_lng
};
```

**Opciones de solución**:

#### Opción A: Geocodificación en Frontend (RECOMENDADA)
```typescript
// 1. Crear servicio de geocodificación
// apps/web/src/app/core/services/geocoding.service.ts

async geocodeAddress(address: string): Promise<{ lat: number; lng: number }> {
  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}`
  );
  const data = await response.json();
  const [lng, lat] = data.features[0].center;
  return { lat, lng };
}

// 2. Usar en onSubmit()
const fullAddress = `${formValue.location_street} ${formValue.location_street_number}, ${formValue.location_city}, ${formValue.location_country}`;
const coords = await this.geocodingService.geocodeAddress(fullAddress);

const carData: Partial<Car> = {
  // ... otros campos
  location_lat: coords.lat,
  location_lng: coords.lng,
};
```

#### Opción B: Función PostgreSQL + Trigger (Más complejo)
```sql
-- Requiere extensión PostGIS o llamada a API externa
-- Más difícil de implementar y mantener
-- No recomendado para MVP
```

---

## 🔧 IMPLEMENTATION PLAN

### Step 1: Fix Status Field ✅ EASY
```typescript
// publish-car-v2.page.ts:502-540
const carData: Partial<Car> = {
  // ... todos los campos existentes
  status: 'active', // ✅ AGREGAR ESTA LÍNEA
};
```

### Step 2: Implement Geocoding Service ⚠️ MEDIUM
1. Crear `apps/web/src/app/core/services/geocoding.service.ts`
2. Configurar Mapbox token en environment
3. Implementar método `geocodeAddress()`
4. Llamar antes de `createCar()` en `onSubmit()`

### Step 3: Handle Geocoding Errors ⚠️ IMPORTANT
```typescript
try {
  const coords = await this.geocodingService.geocodeAddress(fullAddress);
  carData.location_lat = coords.lat;
  carData.location_lng = coords.lng;
} catch (error) {
  // Si falla geocoding, usar coordenadas por defecto de la ciudad
  // O mostrar error al usuario
  console.error('Geocoding failed:', error);
  alert('No se pudieron obtener las coordenadas. Por favor verifica la dirección.');
  return;
}
```

### Step 4: Verify Query Filters
```typescript
// Verificar en cars-list.page.ts o cars.service.ts
// Asegurarse que la query no filtre autos sin coordenadas
.select('*')
.eq('status', 'active')  // ✅ Debe estar
// .not('location_lat', 'is', null)  // ❌ Esto bloquearía el auto
```

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### Immediate Fixes (Can do now)
- [ ] Add `status: 'active'` to carData in onSubmit()
- [ ] Verify cars query doesn't filter by location_lat

### Geocoding Implementation (Requires new service)
- [ ] Create `geocoding.service.ts`
- [ ] Add Mapbox token to environment
- [ ] Implement `geocodeAddress()` method
- [ ] Call geocoding in `onSubmit()` before createCar()
- [ ] Handle geocoding errors gracefully
- [ ] Test with real addresses

### Testing
- [ ] Publish new car with fixes applied
- [ ] Verify status = 'active' in database
- [ ] Verify location_lat and location_lng are set
- [ ] Check car appears in /cars list
- [ ] Check car appears as marker on map
- [ ] Test geocoding with invalid addresses

---

## 🐛 CURRENT STATE vs DESIRED STATE

### Current State (BROKEN)
```
User publishes car
  ↓
carData WITHOUT status field
  ↓
Database INSERT with DEFAULT status = 'draft'
  ↓
location_lat = NULL, location_lng = NULL
  ↓
Query filters status = 'active' → NOT FOUND ❌
Map requires coordinates → NOT SHOWN ❌
```

### Desired State (FIXED)
```
User publishes car
  ↓
Geocode address to coordinates
  ↓
carData WITH status = 'active' + lat/lng
  ↓
Database INSERT with complete data
  ↓
Query finds status = 'active' → FOUND ✅
Map renders marker with coordinates → SHOWN ✅
```

---

## 🎯 PRIORITY LEVELS

1. **P0 (Critical)**: Add `status: 'active'` - 1 minute fix
2. **P0 (Critical)**: Implement geocoding - 30 minutes
3. **P1 (Important)**: Error handling for geocoding - 15 minutes
4. **P2 (Nice to have)**: Fallback coordinates by city - 20 minutes

---

## 📝 RELATED FILES

- `apps/web/src/app/features/cars/publish/publish-car-v2.page.ts:502-540`
- `apps/web/src/app/core/services/cars.service.ts:12-24`
- `apps/web/src/app/features/cars/cars-list.page.ts` (TO VERIFY)
- `apps/web/src/app/core/services/geocoding.service.ts` (TO CREATE)

---

## 💡 IMPORTANT NOTES

1. **Mapbox Geocoding API**:
   - Endpoint: `https://api.mapbox.com/geocoding/v5/mapbox.places/{query}.json`
   - Rate limit: 100,000 requests/month (Free tier)
   - Requires API token

2. **Alternative APIs**:
   - Google Maps Geocoding API (más caro)
   - OpenStreetMap Nominatim (gratuito, más lento)
   - Mapbox es la mejor opción para MVP

3. **Coordinates Format**:
   - PostgreSQL columns: `DECIMAL` or `DOUBLE PRECISION`
   - Angular: `number` type
   - Mapbox returns: `[lng, lat]` (orden invertido!)


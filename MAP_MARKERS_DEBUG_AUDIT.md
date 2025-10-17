# 🗺️ AUDITORÍA: Debug de Marcadores de Mapa

**Fecha**: 2025-10-17
**Rama**: `testing/map-markers-debug`
**Issue**: Solo aparece 1 marcador en el mapa (a veces más, a veces ninguno)
**Autos en DB**: 11 autos activos con coordenadas

---

## 🔍 Análisis Vertical del Stack

```
┌─────────────────────────────────────────────────────┐
│  LAYER 1: UI (CarsListPage)                         │
│  Status: ✅ CORRECTO                                │
│  File: cars-list.page.ts:42                         │
│  Data: cars = signal<Car[]>([])                     │
│  Notes: Signal poblado correctamente con 11 cars    │
└─────────────────────────────────────────────────────┘
              ↓↑
┌─────────────────────────────────────────────────────┐
│  LAYER 2: Map Component Input                       │
│  Status: ✅ CORRECTO                                │
│  File: cars-map.component.ts:41                     │
│  Input: @Input() cars: any[] = [];                  │
│  Notes: Recibe los 11 cars desde el parent          │
└─────────────────────────────────────────────────────┘
              ↓↑
┌─────────────────────────────────────────────────────┐
│  LAYER 3: CarLocationsService                       │
│  Status: ✅ CORRECTO                                │
│  File: car-locations.service.ts:124                 │
│  Query: v_cars_with_main_photo + coordenadas        │
│  Notes: Devuelve 11 locations correctamente         │
└─────────────────────────────────────────────────────┘
              ↓↑
┌─────────────────────────────────────────────────────┐
│  LAYER 4: Transformación a CarMapLocation           │
│  Status: ✅ CORRECTO                                │
│  File: car-locations.service.ts:155                 │
│  Method: normalizeEntry()                           │
│  Notes: Mapea correctamente lat/lng de cada auto    │
└─────────────────────────────────────────────────────┘
              ↓↑
┌─────────────────────────────────────────────────────┐
│  LAYER 5: Geolocation + Distance Filter             │
│  Status: ❌ BUG ENCONTRADO AQUÍ                     │
│  File: cars-map.component.ts:209-227                │
│  Issue: FILTRO DE DISTANCIA AGRESIVO                │
│  Notes: Elimina autos fuera de 150km del usuario    │
└─────────────────────────────────────────────────────┘
              ↓↑
┌─────────────────────────────────────────────────────┐
│  LAYER 6: Rendering Markers (Mapbox GL)             │
│  Status: ⚠️ CONSECUENCIA DEL FILTRO                 │
│  File: cars-map.component.ts:256-366                │
│  Method: updateMarkers(locations)                   │
│  Notes: Solo renderiza locations que pasaron filtro │
└─────────────────────────────────────────────────────┘
```

---

## 🐛 ROOT CAUSE

### Problema Principal

**Archivo**: `apps/web/src/app/shared/components/cars-map/cars-map.component.ts`
**Líneas**: 209-227

```typescript
// FILTRO DE AUDITORÍA: Eliminar autos que están a más de 150km
const maxDistanceKm = 150;
const filteredLocations = locations.filter((loc) => {
  const distance = this.calculateDistance(userLoc.lat, userLoc.lng, loc.lat, loc.lng);
  return distance <= maxDistanceKm;
});

const filteredCount = originalCount - filteredLocations.length;
if (filteredCount > 0) {
  console.log(
    `[CarsMapComponent] 🔍 AUDITORÍA: Filtrados ${filteredCount} autos que están a más de ${maxDistanceKm}km de distancia (Uruguay)`,
  );
}

locations = filteredLocations;
```

### ¿Por qué causa el bug?

1. **Geolocalización obligatoria**: El mapa solicita la ubicación del usuario al cargar
2. **Ubicación predeterminada**: Si el GPS falla, usa Montevideo (-34.9011, -56.1645)
3. **Filtro de 150km**: Solo muestra autos dentro de 150km de la ubicación del usuario
4. **Uruguay es largo**: Uruguay mide ~600km de norte a sur

### Ejemplo de Distancias (desde Montevideo)

| Ciudad                 | Latitud   | Longitud  | Distancia desde MVD | ¿Visible? |
|------------------------|-----------|-----------|---------------------|-----------|
| Montevideo             | -34.9011  | -56.1645  | 0 km                | ✅ SÍ     |
| Punta del Este         | -34.9671  | -54.9476  | ~110 km             | ✅ SÍ     |
| Maldonado              | -34.9     | -54.95    | ~110 km             | ✅ SÍ     |
| La Paloma              | -34.6586  | -54.1633  | ~180 km             | ❌ NO     |
| Colonia del Sacramento | -34.4638  | -57.8399  | ~170 km             | ❌ NO     |
| Paysandú               | -32.3214  | -58.0756  | ~320 km             | ❌ NO     |
| Salto                  | -31.3833  | -57.9667  | ~400 km             | ❌ NO     |
| Tacuarembó             | -31.7167  | -55.9833  | ~350 km             | ❌ NO     |
| Rivera                 | -30.9053  | -55.5511  | ~450 km             | ❌ NO     |

**Resultado**: De 11 autos, solo 3-4 son visibles en Montevideo!

---

## 🎯 Comportamientos Observados

### Escenario 1: Usuario en Montevideo
- ✅ Ve autos en Montevideo (~3 autos)
- ✅ Ve auto en Punta del Este (110km)
- ❌ NO ve autos en Colonia (170km)
- ❌ NO ve autos en Salto, Rivera, Tacuarembó

**Marcadores visibles**: 3-4 de 11

### Escenario 2: GPS sin señal o denegado
- Se usa Montevideo como fallback
- Mismo comportamiento que Escenario 1

### Escenario 3: Usuario viajando
- Los marcadores **aparecen y desaparecen** según la ubicación GPS cambia
- Explica el comportamiento intermitente reportado

---

## ✅ SOLUCIONES PROPUESTAS

### Opción 1: Eliminar el filtro completamente (RECOMENDADO)

**Pros**:
- Muestra TODOS los autos disponibles
- Consistente con la lista de autos debajo del mapa
- Mejor UX: El usuario puede explorar todo Uruguay

**Cons**:
- Ninguno relevante para Uruguay (país pequeño)

**Cambio**:
```typescript
// ANTES (líneas 209-227)
if (userLoc) {
  locations = this.sortLocationsByDistance(locations, userLoc);

  const maxDistanceKm = 150;
  const filteredLocations = locations.filter((loc) => {
    const distance = this.calculateDistance(userLoc.lat, userLoc.lng, loc.lat, loc.lng);
    return distance <= maxDistanceKm;
  });

  locations = filteredLocations;
}

// DESPUÉS
if (userLoc) {
  // Solo ordenar por distancia, NO filtrar
  locations = this.sortLocationsByDistance(locations, userLoc);
  console.log('[CarsMapComponent] Locations sorted by distance from user');
}
```

---

### Opción 2: Aumentar el radio a 600km

**Pros**:
- Cubre todo Uruguay (600km norte-sur)
- Mantiene el concepto de "autos cercanos"

**Cons**:
- En Uruguay, no tiene sentido (es todo el país)

**Cambio**:
```typescript
const maxDistanceKm = 600; // Era 150
```

---

### Opción 3: Hacer el filtro opcional por UI

**Pros**:
- El usuario decide si ve todos o solo cercanos
- Flexibilidad máxima

**Cons**:
- Más complejo de implementar
- Agrega un control extra al UI

---

## 🧪 TEST PLAN

### Tests para validar el fix:

1. **Test de Carga Inicial**
   - [ ] Abrir http://localhost:4200/cars
   - [ ] Verificar que aparecen 11 marcadores en el mapa
   - [ ] Confirmar que el contador dice "1" en la esquina superior derecha (actualmente)

2. **Test con Geolocalización**
   - [ ] Permitir acceso a ubicación GPS
   - [ ] Verificar que TODOS los 11 marcadores siguen visibles
   - [ ] Confirmar que están ordenados por distancia (más cercanos primero en popup)

3. **Test sin Geolocalización**
   - [ ] Denegar acceso a ubicación GPS
   - [ ] Verificar fallback a Montevideo
   - [ ] Confirmar que TODOS los 11 marcadores son visibles

4. **Test de Clustering**
   - [ ] Hacer zoom out en el mapa
   - [ ] Verificar que marcadores cercanos se agrupan en clusters
   - [ ] Click en cluster para hacer zoom in

5. **Test de Popups**
   - [ ] Click en cada marcador
   - [ ] Verificar que abre popup con info del auto
   - [ ] Confirmar que muestra distancia si hay GPS

---

## 📊 Datos de Database

### Query ejecutada:
```sql
SELECT id, title, location_city, location_lat, location_lng
FROM cars
WHERE status = 'active'
LIMIT 15;
```

### Resultados (11 autos):

1. ✅ Ford Focus 2020 - Salto (-31.3833, -57.9667)
2. ✅ Hyundai Creta 2022 - Montevideo (-34.8833, -56.1819)
3. ✅ Toyota Corolla 2022 - Montevideo (-34.9011, -56.1645)
4. ✅ Chevrolet Onix 2023 - Punta del Este (-34.9671, -54.9476)
5. ✅ Fiat Cronos 2022 - Colonia del Sacramento (-34.4638, -57.8399)
6. ✅ Nissan Versa 2021 - Paysandú (-32.3214, -58.0756)
7. ✅ Peugeot 208 2023 - Maldonado (-34.9, -54.95)
8. ✅ Renault Sandero Stepway - Rivera (-30.9053, -55.5511)
9. ✅ Toyota Corolla XEi - Montevideo (-34.9062, -56.2019)
10. ✅ Volkswagen Gol Trend - Tacuarembó (-31.7167, -55.9833)
11. ✅ Volkswagen Polo 2023 - La Paloma (-34.6586, -54.1633)

**Todos tienen coordenadas válidas** ✅

---

## 🔧 FIX IMPLEMENTATION

Implementaré la **Opción 1** (eliminar filtro) por las siguientes razones:

1. **Simplicidad**: Menos código = menos bugs
2. **UX mejorado**: Usuario ve todos los autos disponibles
3. **Consistencia**: Match con la lista de autos debajo del mapa
4. **Uruguay-específico**: En un país pequeño, no tiene sentido filtrar por distancia

### Cambios a realizar:

**Archivo**: `apps/web/src/app/shared/components/cars-map/cars-map.component.ts`

- ❌ **Eliminar**: Líneas 209-227 (filtro de distancia)
- ✅ **Mantener**: Ordenamiento por distancia (sorting)
- ✅ **Mantener**: Cálculo de distancia en popups
- ✅ **Mantener**: Marker de ubicación del usuario

---

## 📝 Logs Esperados

### Antes del fix:
```
[CarsMapComponent] Sorted locations by distance: 11
[CarsMapComponent] 🔍 AUDITORÍA: Filtrados 8 autos que están a más de 150km de distancia (Uruguay)
[CarsMapComponent] Mostrando 3 de 11 autos dentro de 150km
```

### Después del fix:
```
[CarsMapComponent] Locations sorted by distance from user
[CarsMapComponent] Showing all 11 active cars on map
```

---

## ✅ CONCLUSIÓN

El bug NO es un problema de:
- ❌ Base de datos (11 autos con coordenadas válidas)
- ❌ Query SQL (devuelve todos correctamente)
- ❌ Transformación de datos (normalizeEntry funciona bien)
- ❌ Renderizado de Mapbox (funciona correctamente)

El bug ES causado por:
- ✅ **Filtro geográfico agresivo** (150km)
- ✅ **Uruguay es largo** (600km norte-sur)
- ✅ **Comportamiento intermitente** debido a GPS dinámico

**Solución**: Eliminar el filtro de distancia y mostrar todos los marcadores.

---

**Generado por**: Claude Code
**Timestamp**: 2025-10-17T04:50:00Z

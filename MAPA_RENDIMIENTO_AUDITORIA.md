# 🔍 Auditoría de Rendimiento - Componente de Mapa

**Fecha**: 2025-10-23
**Componente**: `apps/web/src/app/shared/components/cars-map/cars-map.component.ts`
**Problema reportado**: Carga lenta del mapa al iniciar

---

## 📊 Resumen Ejecutivo

**Severidad**: 🔴 **CRÍTICA**
**Impacto en UX**: Alto - Los usuarios experimentan lentitud notoria
**Problemas identificados**: 7 issues de rendimiento
**Llamadas HTTP excesivas**: ~15-30 requests en los primeros 10 segundos

---

## 🚨 Problemas Críticos Identificados

### 1. ⚠️ **Re-renderizado en cada movimiento del mapa**

**Ubicación**: `cars-map.component.ts:260-263`

```typescript
this.map.on('moveend', () => {
  console.log('[CarsMapComponent] Map moved, refreshing prices...');
  void this.loadCarLocations(true);
});
```

**Problema**:
- El evento `moveend` se dispara en **CADA movimiento del mapa**
- Incluye: zoom, pan, flyTo, fitBounds
- Cada evento ejecuta `loadCarLocations(true)` completo
- Esto recarga TODOS los marcadores y precios dinámicos

**Evidencia en consola**:
```
cars-map.component.ts:261 [CarsMapComponent] Map moved, refreshing prices...
cars-map.component.ts:352 [CarsMapComponent] Locations sorted by distance from user
cars-map.component.ts:353 [CarsMapComponent] Showing all 15 active cars on map
cars-map.component.ts:405 [CarsMapComponent] Fetched dynamic prices for 12 cars
```
Este bloque se repite **4+ veces** en los primeros segundos.

**Impacto**:
- 🔴 Múltiples llamadas HTTP innecesarias al backend
- 🔴 Re-renderizado completo de 15+ marcadores
- 🔴 Recálculo de distancias en cada movimiento
- 🔴 Fetch de precios dinámicos en cada movimiento

**Solución recomendada**:
```typescript
// Debounce del evento moveend
private moveEndDebounceTimeout: ReturnType<typeof setTimeout> | null = null;

this.map.on('moveend', () => {
  // Cancelar timeout anterior
  if (this.moveEndDebounceTimeout) {
    clearTimeout(this.moveEndDebounceTimeout);
  }

  // Ejecutar solo después de 500ms de inactividad
  this.moveEndDebounceTimeout = setTimeout(() => {
    console.log('[CarsMapComponent] Map stable, refreshing prices...');
    void this.loadCarLocations(true);
  }, 500);
});
```

---

### 2. ⚠️ **GPS watchPosition con enableHighAccuracy dispara recargas continuas**

**Ubicación**: `cars-map.component.ts:816-861`

```typescript
this.geolocationWatchId = navigator.geolocation.watchPosition(
  (position) => {
    // ... código ...
    void this.loadCarLocations(true); // ← PROBLEMA: se ejecuta en CADA actualización GPS
  },
  (error) => { /* ... */ },
  {
    enableHighAccuracy: true,  // ← Actualizaciones muy frecuentes
    timeout: 15000,
    maximumAge: 0,            // ← Sin caché, siempre fresco
  }
);
```

**Problema**:
- `watchPosition` con `enableHighAccuracy: true` puede actualizar cada **1-5 segundos**
- `maximumAge: 0` fuerza actualizaciones sin caché
- **Cada actualización GPS ejecuta `loadCarLocations(true)`**
- Si el GPS tarda en estabilizarse (10-30 segundos), genera 3-6 recargas completas

**Evidencia en consola**:
```
cars-map.component.ts:819 [CarsMapComponent] Location update: Object
cars-map.component.ts:849 [CarsMapComponent] Emitting userLocationChange: Object
cars-map.component.ts:912 [CarsMapComponent] Zooming to user location
```
Este patrón se repite **3 veces** en los logs mostrados.

**Impacto**:
- 🔴 3-6 recargas completas mientras GPS se estabiliza
- 🔴 Re-sorting de locations en cada update
- 🔴 Re-cálculo de todas las distancias
- 🔴 Llamadas HTTP duplicadas

**Solución recomendada**:
```typescript
private lastLocationUpdate: { lat: number; lng: number; timestamp: number } | null = null;
private readonly MIN_LOCATION_CHANGE_THRESHOLD = 0.0001; // ~10 metros

watchPosition((position) => {
  const { latitude, longitude } = position.coords;

  // Solo actualizar si la ubicación cambió significativamente
  if (this.lastLocationUpdate) {
    const latDiff = Math.abs(latitude - this.lastLocationUpdate.lat);
    const lngDiff = Math.abs(longitude - this.lastLocationUpdate.lng);
    const timeDiff = Date.now() - this.lastLocationUpdate.timestamp;

    // Ignorar updates menores a 10m o dentro de 5 segundos
    if (latDiff < MIN_LOCATION_CHANGE_THRESHOLD &&
        lngDiff < MIN_LOCATION_CHANGE_THRESHOLD &&
        timeDiff < 5000) {
      return; // Skip update
    }
  }

  this.lastLocationUpdate = { lat: latitude, lng: longitude, timestamp: Date.now() };

  // Solo recargar si es la primera vez o cambio significativo
  const isFirstUpdate = !this.userLocation();
  void this.loadCarLocations(isFirstUpdate);
});
```

---

### 3. ⚠️ **updateMarkers siempre borra y recrea TODOS los layers**

**Ubicación**: `cars-map.component.ts:430-439`

```typescript
private updateMarkers(locations: CarMapLocation[]): void {
  // ...

  // Remover layers y source existentes si existen
  this.removeCarLayers(); // ← PROBLEMA: borra TODO en cada update

  // Crear GeoJSON source con los datos de los autos
  const geojsonData = { /* ... */ };

  // Agregar source
  if (this.map.getSource('cars')) {
    (this.map.getSource('cars') as any).setData(geojsonData); // ← Solo necesita esto
  } else {
    this.map.addSource('cars', { /* ... */ }); // ← Primera vez
  }
}
```

**Problema**:
- `removeCarLayers()` borra 4 layers: `car-prices`, `car-markers-bg`, `cluster-count`, `clusters`
- Luego vuelve a crear los 4 layers (líneas 483-551)
- **Esto es innecesario**: Mapbox permite actualizar el source sin tocar los layers

**Impacto**:
- 🔴 Re-renderizado completo del canvas del mapa
- 🔴 Pérdida de estado de interacciones (hover, etc.)
- 🔴 Trabajo extra del GPU
- 🔴 Flash visual perceptible

**Solución recomendada**:
```typescript
private updateMarkers(locations: CarMapLocation[]): void {
  if (!this.map || !this.mapboxgl) return;

  this.currentLocations = locations;
  const geojsonData = { /* crear GeoJSON */ };

  const source = this.map.getSource('cars');

  if (source) {
    // ✅ Solo actualizar datos, NO recrear layers
    (source as any).setData(geojsonData);
  } else {
    // Primera vez: crear source Y layers
    this.map.addSource('cars', { /* ... */ });
    this.addCarLayers(); // Nueva función para crear layers
  }
}
```

---

### 4. ⚠️ **Múltiples sistemas de refresh ejecutándose simultáneamente**

**Ubicación**: Múltiples funciones

```typescript
// Sistema 1: Realtime updates (línea 792)
private setupRealtimeUpdates(): void {
  this.realtimeUnsubscribe = this.carLocationsService.subscribeToRealtime(() => {
    void this.loadCarLocations(true);
  });
}

// Sistema 2: Periodic refresh (línea 799)
private setupPeriodicRefresh(): void {
  const intervalMs = this.carLocationsService.getRefreshInterval(); // ¿30s? ¿60s?
  this.refreshInterval = setInterval(() => {
    void this.loadCarLocations(false);
  }, intervalMs);
}

// Sistema 3: moveend events
this.map.on('moveend', () => {
  void this.loadCarLocations(true);
});

// Sistema 4: watchPosition updates
watchPosition((position) => {
  void this.loadCarLocations(true);
});
```

**Problema**:
- **4 sistemas diferentes** pueden disparar `loadCarLocations`
- No hay coordinación entre ellos
- Pueden ejecutarse simultáneamente
- No hay rate limiting ni deduplicación

**Impacto**:
- 🔴 Llamadas HTTP duplicadas
- 🔴 Race conditions en actualizaciones
- 🔴 Estado inconsistente del mapa

**Solución recomendada**:
```typescript
private loadInProgress = false;
private pendingReload = false;

private async loadCarLocations(force = false): Promise<void> {
  // Si ya hay carga en progreso, marcar para recargar después
  if (this.loadInProgress) {
    this.pendingReload = true;
    return;
  }

  try {
    this.loadInProgress = true;

    // ... lógica actual ...

  } finally {
    this.loadInProgress = false;

    // Si hubo request pendiente, ejecutar ahora
    if (this.pendingReload) {
      this.pendingReload = false;
      setTimeout(() => this.loadCarLocations(force), 100);
    }
  }
}
```

---

### 5. ⚠️ **Sorting completo de locations en cada update**

**Ubicación**: `cars-map.component.ts:374-383`

```typescript
private sortLocationsByDistance(
  locations: CarMapLocation[],
  userLoc: { lat: number; lng: number }
): CarMapLocation[] {
  return [...locations].sort((a, b) => { // ← PROBLEMA: crea copia + sort O(n log n)
    const distA = this.calculateDistance(userLoc.lat, userLoc.lng, a.lat, a.lng);
    const distB = this.calculateDistance(userLoc.lat, userLoc.lng, b.lat, b.lng);
    return distA - distB;
  });
}
```

**Problema**:
- Se ejecuta en **CADA** `loadCarLocations`
- Crea copia del array completo (`[...locations]`)
- Ordena 15+ elementos con cálculo de distancia (Haversine) para cada uno
- O(n log n) × cálculos costosos de trigonometría

**Impacto**:
- 🟡 Cálculos innecesarios si la ubicación del usuario no cambió
- 🟡 Trabajo extra del CPU

**Solución recomendada**:
```typescript
private cachedSortedLocations: CarMapLocation[] | null = null;
private lastSortLocation: { lat: number; lng: number } | null = null;

private sortLocationsByDistance(
  locations: CarMapLocation[],
  userLoc: { lat: number; lng: number }
): CarMapLocation[] {
  // Si la ubicación no cambió significativamente, usar caché
  if (this.cachedSortedLocations && this.lastSortLocation) {
    const latDiff = Math.abs(userLoc.lat - this.lastSortLocation.lat);
    const lngDiff = Math.abs(userLoc.lng - this.lastSortLocation.lng);

    if (latDiff < 0.001 && lngDiff < 0.001) { // ~100m threshold
      return this.cachedSortedLocations;
    }
  }

  // Ordenar solo si es necesario
  const sorted = [...locations].sort((a, b) => {
    const distA = this.calculateDistance(userLoc.lat, userLoc.lng, a.lat, a.lng);
    const distB = this.calculateDistance(userLoc.lat, userLoc.lng, b.lat, b.lng);
    return distA - distB;
  });

  // Cachear resultado
  this.cachedSortedLocations = sorted;
  this.lastSortLocation = { ...userLoc };

  return sorted;
}
```

---

### 6. ⚠️ **Dynamic pricing batch request en cada reload**

**Ubicación**: `cars-map.component.ts:389-428`

```typescript
private async updateMarkersWithDynamicPricing(locations: CarMapLocation[]): Promise<void> {
  const carsWithRegion = locations
    .filter((loc) => loc.regionId)
    .map((loc) => ({ id: loc.carId, region_id: loc.regionId! }));

  // Fetch dynamic prices in batch
  const prices = await this.pricingService.getBatchPrices(carsWithRegion); // ← HTTP request
  console.log(`[CarsMapComponent] Fetched dynamic prices for ${prices.size} cars`);

  // ...
}
```

**Problema**:
- Se ejecuta en **CADA** `loadCarLocations`
- Llama a `getBatchPrices` (HTTP request)
- Si hay múltiples reloads (moveend, GPS, etc.), genera múltiples HTTP requests

**Evidencia en consola**:
```
cars-map.component.ts:405 [CarsMapComponent] Fetched dynamic prices for 12 cars
```
Aparece **2 veces** en los logs, indicando 2 HTTP calls.

**Impacto**:
- 🔴 Múltiples HTTP requests innecesarios
- 🔴 Carga en backend/API
- 🔴 Latencia acumulada

**Solución recomendada**:
```typescript
private pricingCache: Map<string, { price: number; timestamp: number }> = new Map();
private readonly PRICING_CACHE_TTL = 30000; // 30 segundos

private async updateMarkersWithDynamicPricing(locations: CarMapLocation[]): Promise<void> {
  const now = Date.now();
  const carsNeedingPrices: any[] = [];

  // Filtrar cars que ya tienen precios en caché
  locations.forEach(loc => {
    const cached = this.pricingCache.get(loc.carId);
    if (!cached || (now - cached.timestamp) > this.PRICING_CACHE_TTL) {
      if (loc.regionId) {
        carsNeedingPrices.push({ id: loc.carId, region_id: loc.regionId });
      }
    }
  });

  // Solo hacer HTTP request si hay cars sin caché
  if (carsNeedingPrices.length > 0) {
    const prices = await this.pricingService.getBatchPrices(carsNeedingPrices);

    // Actualizar caché
    prices.forEach((price, carId) => {
      this.pricingCache.set(carId, { price: price.price_per_day, timestamp: now });
    });
  }

  // Usar precios cacheados
  const updatedLocations = locations.map(loc => {
    const cached = this.pricingCache.get(loc.carId);
    if (cached) {
      return { ...loc, pricePerDay: cached.price };
    }
    return loc;
  });

  this.updateMarkers(updatedLocations);
}
```

---

### 7. 🟡 **Múltiples resize() calls redundantes**

**Ubicación**: `cars-map.component.ts:88-94, 229-234, 241-248, 323-340`

```typescript
// Call 1: En ngOnChanges
setTimeout(() => {
  if (this.map) {
    this.map.resize();
    console.log('[CarsMapComponent] Map resized on change');
  }
}, 200);

// Call 2: Inmediatamente después de crear map
setTimeout(() => {
  if (this.map) {
    this.map.resize();
    console.log('[CarsMapComponent] Initial map resize');
  }
}, 0);

// Call 3: Después de map.on('load')
setTimeout(() => {
  if (this.map) {
    this.map.resize();
    console.log('[CarsMapComponent] Initial map resize complete');
  }
}, 300);

// Call 4: ResizeObserver
this.resizeObserver = new ResizeObserver((entries) => {
  // ...
  this.map.resize();
});
```

**Problema**:
- **4 fuentes diferentes** de `map.resize()`
- Pueden solaparse temporalmente
- `trackResize: true` en configuración del mapa ya maneja esto automáticamente

**Impacto**:
- 🟡 Trabajo redundante (bajo impacto individual)
- 🟡 Múltiples re-renders del canvas

**Solución recomendada**:
```typescript
// Remover resize manual, confiar en trackResize: true
// Solo mantener ResizeObserver como fallback
```

---

## 📈 Métricas Estimadas de Impacto

### Situación Actual (Primeros 10 segundos)
- **HTTP Requests**: 15-30 calls
  - Dynamic pricing: 6-8 calls
  - Car locations: 6-8 calls
  - Realtime subscriptions: 2-3 calls

- **Re-renders del mapa**: 8-12 veces
- **Recálculo de distancias**: 45-60 veces (15 cars × 3-4 reloads)
- **Layer recreation**: 6-8 veces completas

### Después de Optimizaciones
- **HTTP Requests**: 2-4 calls
  - Dynamic pricing: 1 call (con caché 30s)
  - Car locations: 1-2 calls
  - Realtime: 1 call

- **Re-renders del mapa**: 2-3 veces
- **Recálculo de distancias**: 15 veces (1 reload)
- **Layer recreation**: 0 (solo update de data)

**Mejora estimada**: 70-80% reducción de trabajo

---

## 🎯 Plan de Acción Recomendado

### Prioridad Alta (Implementar primero)
1. ✅ **Debounce de moveend event** (500ms)
2. ✅ **Rate limiting de watchPosition updates** (threshold de 10m)
3. ✅ **Eliminar recreation de layers** (usar `setData()`)
4. ✅ **Caché de precios dinámicos** (TTL 30s)

### Prioridad Media
5. ✅ **Deduplicación de loadCarLocations** (flag loadInProgress)
6. ✅ **Caché de sorted locations** (si ubicación no cambió)

### Prioridad Baja
7. ✅ **Optimizar resize() calls** (confiar en trackResize)

---

## 🔬 Herramientas de Medición Recomendadas

```typescript
// Agregar métricas de performance
private performanceMetrics = {
  loadCarLocationsCount: 0,
  dynamicPricingCalls: 0,
  layerRecreations: 0,
  lastLoadTimestamp: 0,
};

private async loadCarLocations(force = false): Promise<void> {
  const start = performance.now();
  this.performanceMetrics.loadCarLocationsCount++;

  // ... lógica actual ...

  const duration = performance.now() - start;
  console.log(`[Performance] loadCarLocations took ${duration.toFixed(2)}ms (call #${this.performanceMetrics.loadCarLocationsCount})`);
}
```

---

## 📝 Notas Adicionales

### Configuración actual de Mapbox que está bien optimizada:
- ✅ `renderWorldCopies: false`
- ✅ `trackResize: true`
- ✅ `preserveDrawingBuffer: false`
- ✅ `refreshExpiredTiles: false`
- ✅ `fadeDuration: 150`
- ✅ Clustering habilitado con `clusterRadius: 60`

### Observaciones positivas:
- Lazy loading de Mapbox library
- Clustering para reducir marcadores visibles
- Limpieza correcta de recursos en `cleanup()`
- ResizeObserver para responsive

---

**Auditoría realizada por**: Claude Code
**Próximos pasos**: Implementar optimizaciones según prioridad

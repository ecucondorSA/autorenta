# Mapbox Performance Optimization for 10,000+ Cars

**Última actualización**: 2025-11-11
**Objetivo**: Escalar el mapa del marketplace para manejar 10,000+ autos sin degradación de performance

---

## Resumen Ejecutivo

Según la documentación oficial de Mapbox y benchmarks de Supercluster:
- ✅ **Clustering es esencial** para 10,000+ puntos
- ✅ **Evitar HTML Markers** (usar layers nativos de Mapbox GL JS)
- ✅ **GeoJSON Source con clustering** puede manejar hasta 400,000 puntos
- ✅ **Vector tiles** son más eficientes para datasets muy grandes (>500K puntos)

**Para 10,000 autos**: GeoJSON con clustering es la solución óptima.

---

## 1. Arquitectura Recomendada

### Opción A: GeoJSON + Clustering (Recomendado para 10K autos)

**Ventajas**:
- Actualizaciones dinámicas rápidas
- Menor complejidad
- Manejo client-side eficiente hasta 500K puntos
- Supercluster incluido en Mapbox GL JS

**Configuración óptima**:
```javascript
map.addSource('cars', {
  type: 'geojson',
  data: carsGeoJSON,
  cluster: true,
  clusterMaxZoom: 14,        // Clusters se rompen a zoom 15+
  clusterRadius: 50,         // Radio de agrupación (pixels)
  maxzoom: 12,               // Optimización: límite de precisión
  buffer: 0,                 // Para puntos simples (círculos)
  tolerance: 0.375,          // Simplificación de geometrías
  generateId: true           // IDs únicos para features
});
```

### Opción B: Vector Tiles (Para >500K autos futuro)

**Ventajas**:
- Escalabilidad infinita
- Server-side processing
- Tiles cargados on-demand

**Desventajas**:
- Requiere Mapbox Tiling Service (MTS)
- Actualizaciones menos frecuentes
- Mayor complejidad

---

## 2. Configuración de Clustering

### Parámetros Clave

#### `clusterMaxZoom` (Default: 14)
Máximo nivel de zoom donde se mantienen clusters.

**Recomendaciones**:
- **`14`**: Para densidad media-alta (10K-100K puntos)
- **`12`**: Para densidad muy alta (100K+ puntos)
- **`16`**: Para baja densidad (<5K puntos)

```javascript
clusterMaxZoom: 14  // A zoom 15+ se muestran autos individuales
```

#### `clusterRadius` (Default: 50)
Radio en pixels para agrupar puntos cercanos.

**Recomendaciones**:
- **`40-60`**: Balance óptimo para mayoría de casos
- **`80-100`**: Para reducir clusters en áreas muy densas
- **`30-40`**: Para mantener más granularidad

```javascript
clusterRadius: 50  // 50px es el sweet spot
```

#### `maxzoom` (Default: 18)
Nivel máximo de zoom para tiles.

**Recomendaciones por Mapbox**:
- **`12`**: Óptimo para puntos (balance velocidad/precisión)
- **`14`**: Para datos que requieren más detalle
- **`18`**: Solo si necesitas máxima precisión

```javascript
maxzoom: 12  // Mapbox recomienda 12 para point sources
```

#### `buffer` (Default: 128)
Buffer alrededor de cada tile.

**Recomendaciones**:
- **`0`**: Para puntos/círculos pequeños (nuestra caso)
- **`128`**: Para geometrías complejas que cruzan tiles

```javascript
buffer: 0  // Puntos simples no necesitan buffer
```

---

## 3. Layers Configuration

### Cluster Circles Layer

```javascript
map.addLayer({
  id: 'clusters',
  type: 'circle',
  source: 'cars',
  filter: ['has', 'point_count'],
  paint: {
    // Tamaño según cantidad de autos
    'circle-radius': [
      'step',
      ['get', 'point_count'],
      20,    // < 10 autos
      10, 30,   // 10-99 autos
      100, 40   // 100+ autos
    ],
    // Color según densidad
    'circle-color': [
      'step',
      ['get', 'point_count'],
      '#c66b3d',   // < 10 autos (primary)
      10, '#dc8c68',  // 10-99 autos (warm)
      100, '#a5532e'  // 100+ autos (dark)
    ],
    'circle-opacity': 0.8,
    'circle-stroke-width': 2,
    'circle-stroke-color': '#ffffff'
  }
});
```

### Cluster Count Layer

```javascript
map.addLayer({
  id: 'cluster-count',
  type: 'symbol',
  source: 'cars',
  filter: ['has', 'point_count'],
  layout: {
    'text-field': '{point_count_abbreviated}',
    'text-font': ['Inter SemiBold', 'Arial Unicode MS Bold'],
    'text-size': 12
  },
  paint: {
    'text-color': '#ffffff'
  }
});
```

### Unclustered Points Layer

```javascript
map.addLayer({
  id: 'unclustered-point',
  type: 'circle',
  source: 'cars',
  filter: ['!', ['has', 'point_count']],
  paint: {
    'circle-radius': 8,
    'circle-color': '#c66b3d',
    'circle-stroke-width': 2,
    'circle-stroke-color': '#ffffff'
  }
});
```

---

## 4. Performance Optimizations

### A. GeoJSON Data Optimization

#### Limpieza de Propiedades

Solo incluir propiedades esenciales:

```javascript
{
  type: 'Feature',
  geometry: {
    type: 'Point',
    coordinates: [lng, lat]  // MAX 6 decimales
  },
  properties: {
    carId: 'abc123',
    price: 85,
    // NO incluir: description, features, images, etc.
  }
}
```

**Reglas**:
- ✅ Coordenadas con máximo 6 decimales (`toFixed(6)`)
- ✅ Solo propiedades necesarias para filtrado/display
- ✅ Minify JSON (sin espacios/newlines)
- ❌ NO embeber imágenes o texto largo
- ❌ NO incluir propiedades de UI innecesarias

#### Carga desde URL

```javascript
// ✅ CORRECTO: Carga desde URL
map.addSource('cars', {
  type: 'geojson',
  data: 'https://api.autorentar.com/cars/geojson',
  cluster: true,
  // ...
});

// ❌ INCORRECTO: Embeber en objeto JS
const data = { type: 'FeatureCollection', features: [...] };
map.addSource('cars', { type: 'geojson', data: data });
```

### B. Layer Optimization

#### Filtros con Zoom

```javascript
map.addLayer({
  id: 'unclustered-point',
  type: 'circle',
  source: 'cars',
  minzoom: 10,  // No renderizar antes de zoom 10
  maxzoom: 22,
  filter: ['!', ['has', 'point_count']],
  // ...
});
```

#### Expression Optimization

```javascript
// ✅ ÓPTIMO: Filter con zoom constraints
filter: [
  'all',
  ['==', ['get', 'available'], true],  // Más específico primero
  ['>=', ['get', 'price'], 50],
  ['!', ['has', 'point_count']]
]

// ❌ LENTO: Sin orden de especificidad
filter: [
  'all',
  ['!', ['has', 'point_count']],
  ['>=', ['get', 'price'], 50],
  ['==', ['get', 'available'], true]
]
```

### C. Viewport Bounds Loading

Cargar solo autos visibles en viewport + buffer:

```javascript
const bounds = map.getBounds();
const buffer = 0.1; // 10% buffer

const expandedBounds = {
  north: bounds.getNorth() + buffer,
  south: bounds.getSouth() - buffer,
  east: bounds.getEast() + buffer,
  west: bounds.getWest() - buffer
};

// Fetch cars within bounds
const visibleCars = await fetchCarsInBounds(expandedBounds);
```

### D. Actualizaciones Incrementales

Para actualizaciones dinámicas, usar **dos sources**:

```javascript
// Source 1: Dataset completo (estático)
map.addSource('cars-static', {
  type: 'geojson',
  data: allCarsGeoJSON,
  cluster: true,
  // ...
});

// Source 2: Cambios dinámicos (pequeño)
map.addSource('cars-dynamic', {
  type: 'geojson',
  data: { type: 'FeatureCollection', features: [] },
  cluster: false  // No clustering para updates
});

// Update solo source dinámico
map.getSource('cars-dynamic').setData(updatedCarsGeoJSON);
```

### E. Feature State para Interacciones

En lugar de re-render todo el source:

```javascript
// Hover state
map.setFeatureState(
  { source: 'cars', id: carId },
  { hover: true }
);

// Layer con hover styling
paint: {
  'circle-radius': [
    'case',
    ['boolean', ['feature-state', 'hover'], false],
    12,  // Hovered
    8    // Normal
  ]
}
```

---

## 5. Interactive Handlers

### Click en Cluster (Zoom)

```javascript
map.on('click', 'clusters', (e) => {
  const features = map.queryRenderedFeatures(e.point, {
    layers: ['clusters']
  });

  const clusterId = features[0].properties.cluster_id;

  map.getSource('cars').getClusterExpansionZoom(
    clusterId,
    (err, zoom) => {
      if (err) return;

      map.easeTo({
        center: features[0].geometry.coordinates,
        zoom: zoom
      });
    }
  );
});
```

### Click en Auto Individual

```javascript
map.on('click', 'unclustered-point', (e) => {
  const coordinates = e.features[0].geometry.coordinates.slice();
  const { carId, price } = e.features[0].properties;

  // Mostrar popup o panel
  showCarDetails(carId);

  // Fly to car
  map.flyTo({
    center: coordinates,
    zoom: 15
  });
});
```

### Cursor Changes

```javascript
// Clusters
map.on('mouseenter', 'clusters', () => {
  map.getCanvas().style.cursor = 'pointer';
});
map.on('mouseleave', 'clusters', () => {
  map.getCanvas().style.cursor = '';
});

// Unclustered points
map.on('mouseenter', 'unclustered-point', () => {
  map.getCanvas().style.cursor = 'pointer';
});
map.on('mouseleave', 'unclustered-point', () => {
  map.getCanvas().style.cursor = '';
});
```

---

## 6. Memory Management

### Cleanup de Recursos

```javascript
// Al destruir componente o cambiar dataset
ngOnDestroy() {
  // Remover layers
  if (map.getLayer('clusters')) map.removeLayer('clusters');
  if (map.getLayer('cluster-count')) map.removeLayer('cluster-count');
  if (map.getLayer('unclustered-point')) map.removeLayer('unclustered-point');

  // Remover source
  if (map.getSource('cars')) map.removeSource('cars');

  // Destruir mapa
  map.remove();
}
```

### Debouncing de Updates

```javascript
let updateTimeout: number;

function updateCarsOnMap(newData: GeoJSON.FeatureCollection) {
  clearTimeout(updateTimeout);

  updateTimeout = setTimeout(() => {
    map.getSource('cars').setData(newData);
  }, 300); // 300ms debounce
}
```

---

## 7. Benchmarks y Métricas

### Targets de Performance (10,000 autos)

| Métrica | Target | Notas |
|---------|--------|-------|
| **Initial Load** | < 2s | Carga inicial del mapa |
| **Cluster Render** | < 100ms | Render de clusters a cualquier zoom |
| **Zoom Transition** | < 200ms | Transición smooth entre zoom levels |
| **Click Response** | < 50ms | Respuesta a clicks en clusters/autos |
| **Memory Usage** | < 150MB | Footprint total en memoria |
| **FPS (panning)** | 60fps | Smooth panning a 60fps |

### Supercluster Benchmarks (Referencia)

Según Mapbox blog:
- **40MB GeoJSON** con **400,000 puntos**: Funciona en browser
- **Supercluster index build**: ~100ms para 400K puntos
- **Cluster rendering**: < 50ms por frame

**Para 10,000 autos**:
- Index build: ~2-5ms
- Rendering: < 10ms por frame
- Memory: ~15-30MB

---

## 8. Estrategia de Zoom

### Clustering por Zoom Level

| Zoom Level | Comportamiento | Configuración |
|------------|----------------|---------------|
| **0-9** | Super clusters (100+ autos) | `clusterRadius: 50` |
| **10-13** | Clusters medianos (10-99 autos) | `clusterRadius: 50` |
| **14** | Clusters pequeños (2-9 autos) | `clusterMaxZoom: 14` |
| **15+** | Autos individuales | No clustering |

### Adaptive Cluster Radius (Opcional)

Ajustar `clusterRadius` dinámicamente según zoom:

```javascript
function updateClusterRadius(zoom: number) {
  let radius = 50;

  if (zoom < 10) radius = 80;        // Más agrupación en zooms bajos
  else if (zoom >= 13) radius = 30;  // Menos agrupación en zooms altos

  // Re-create source con nuevo radius
  map.getSource('cars').setData(carsGeoJSON);
}

map.on('zoom', () => {
  updateClusterRadius(map.getZoom());
});
```

**⚠️ Nota**: Re-crear source es costoso, usar solo si es necesario.

---

## 9. Implementación en AutoRenta

### Estado Actual (cars-map.component.ts)

Ya implementado:
- ✅ Clustering habilitado
- ✅ GeoJSON source
- ✅ Viewport bounds loading
- ✅ Interactive handlers
- ✅ Cursor changes

### Optimizaciones Recomendadas

#### A. Ajustar Configuración de Source

**Antes**:
```typescript
map.addSource(this.clusterSourceId, {
  type: 'geojson',
  data: geoJsonData,
  cluster: true,
  clusterMaxZoom: 14,
  clusterRadius: 50
});
```

**Después** (Optimizado):
```typescript
map.addSource(this.clusterSourceId, {
  type: 'geojson',
  data: geoJsonData,
  cluster: true,
  clusterMaxZoom: 14,
  clusterRadius: 50,
  maxzoom: 12,              // ⭐ NUEVO: Límite de precisión
  buffer: 0,                // ⭐ NUEVO: Sin buffer para puntos
  tolerance: 0.375,         // ⭐ NUEVO: Simplificación
  generateId: true          // ⭐ NUEVO: IDs únicos
});
```

#### B. Limpiar GeoJSON Data

```typescript
private createGeoJSON(cars: CarMapLocation[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: cars.map(car => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [
          parseFloat(car.lng.toFixed(6)),  // ⭐ Max 6 decimales
          parseFloat(car.lat.toFixed(6))
        ]
      },
      properties: {
        carId: car.carId,
        price: car.pricePerDay,
        available: car.available,
        // ⚠️ NO incluir: photos, description, features, etc.
      },
      id: car.carId  // ⭐ ID único para feature-state
    }))
  };
}
```

#### C. Implementar Filtros con Zoom

```typescript
map.addLayer({
  id: 'cars-unclustered',
  type: 'circle',
  source: this.clusterSourceId,
  filter: ['!', ['has', 'point_count']],
  minzoom: 10,  // ⭐ NUEVO: No renderizar antes de zoom 10
  paint: {
    // ...
  }
});
```

#### D. Feature State para Hover/Selection

```typescript
// On hover
onMarkerHover(carId: string) {
  if (this.hoveredCarId) {
    this.map.setFeatureState(
      { source: this.clusterSourceId, id: this.hoveredCarId },
      { hover: false }
    );
  }

  this.map.setFeatureState(
    { source: this.clusterSourceId, id: carId },
    { hover: true }
  );

  this.hoveredCarId = carId;
}

// Layer con feature-state styling
paint: {
  'circle-radius': [
    'case',
    ['boolean', ['feature-state', 'hover'], false],
    12,  // Hovered
    8    // Normal
  ],
  'circle-stroke-width': [
    'case',
    ['boolean', ['feature-state', 'hover'], false],
    3,   // Hovered
    2    // Normal
  ]
}
```

---

## 10. Testing y Validación

### Test Dataset

Crear dataset de prueba con 10,000 autos sintéticos:

```typescript
function generateTestCars(count: number): CarMapLocation[] {
  const cars: CarMapLocation[] = [];

  // Montevideo bounds
  const bounds = {
    north: -34.8,
    south: -34.95,
    east: -56.1,
    west: -56.25
  };

  for (let i = 0; i < count; i++) {
    cars.push({
      carId: `test-${i}`,
      lat: bounds.south + Math.random() * (bounds.north - bounds.south),
      lng: bounds.west + Math.random() * (bounds.east - bounds.west),
      pricePerDay: 50 + Math.floor(Math.random() * 150),
      available: Math.random() > 0.2
    });
  }

  return cars;
}
```

### Performance Profiling

```typescript
// Medir render time
console.time('GeoJSON Creation');
const geoJson = this.createGeoJSON(cars);
console.timeEnd('GeoJSON Creation');

console.time('Source Update');
this.map.getSource(this.clusterSourceId).setData(geoJson);
console.timeEnd('Source Update');

// Medir memoria
if (performance.memory) {
  console.log('Memory:', {
    used: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
    total: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB'
  });
}
```

### Métricas a Monitorear

```typescript
// FPS Counter
let lastTime = performance.now();
let frames = 0;

function measureFPS() {
  frames++;
  const currentTime = performance.now();

  if (currentTime >= lastTime + 1000) {
    console.log('FPS:', frames);
    frames = 0;
    lastTime = currentTime;
  }

  requestAnimationFrame(measureFPS);
}

requestAnimationFrame(measureFPS);
```

---

## 11. Escalabilidad Futura

### Roadmap de Performance

| Autos | Estrategia | Implementación |
|-------|-----------|----------------|
| **< 1,000** | HTML Markers | Actual (si aplica) |
| **1,000 - 10,000** | GeoJSON + Clustering | **ACTUAL** ✅ |
| **10,000 - 100,000** | GeoJSON Optimizado | Aplicar todas las optimizaciones |
| **100,000 - 500,000** | Server-side Clustering | API endpoint que devuelve clusters |
| **500,000+** | Vector Tiles | Mapbox Tiling Service (MTS) |

### Migración a Vector Tiles (Futuro)

Cuando excedas 500K autos:

```typescript
map.addSource('cars-tiles', {
  type: 'vector',
  tiles: ['https://api.autorentar.com/tiles/{z}/{x}/{y}.mvt'],
  minzoom: 0,
  maxzoom: 14
});

map.addLayer({
  id: 'cars-layer',
  type: 'circle',
  source: 'cars-tiles',
  'source-layer': 'cars',
  paint: {
    // ...
  }
});
```

---

## 12. Checklist de Implementación

### Inmediato (10K autos)

- [ ] Agregar `maxzoom: 12` al source
- [ ] Agregar `buffer: 0` al source
- [ ] Agregar `generateId: true` al source
- [ ] Limpiar propiedades de GeoJSON (solo esenciales)
- [ ] Coordenadas con max 6 decimales
- [ ] Agregar `minzoom` a layers unclustered
- [ ] Implementar feature-state para hover/selection
- [ ] Remover HTML markers (si existen)
- [ ] Implementar debouncing en updates (300ms)
- [ ] Agregar cleanup en ngOnDestroy

### Corto Plazo (< 1 mes)

- [ ] Crear endpoint `/api/cars/geojson` optimizado
- [ ] Implementar viewport bounds loading
- [ ] Split sources (static + dynamic)
- [ ] Performance profiling con 10K dataset
- [ ] Optimizar filtros con zoom constraints
- [ ] Implementar FPS monitoring
- [ ] Memory profiling

### Largo Plazo (Escalabilidad)

- [ ] Server-side clustering endpoint
- [ ] Vector tiles con MTS (si >500K autos)
- [ ] CDN para tiles
- [ ] Caching strategy
- [ ] Load balancing

---

## Referencias

- [Mapbox GL JS Performance Guide](https://docs.mapbox.com/help/troubleshooting/mapbox-gl-js-performance/)
- [Working with Large GeoJSON](https://docs.mapbox.com/help/troubleshooting/working-with-large-geojson-data/)
- [Clustering Example](https://docs.mapbox.com/mapbox-gl-js/example/cluster/)
- [Supercluster Library](https://github.com/mapbox/supercluster)
- [Mapbox Blog: Clustering Millions of Points](https://blog.mapbox.com/clustering-millions-of-points-on-a-map-with-supercluster-272046ec5c97)

---

**Mantenido por**: Equipo AutoRenta
**Última actualización**: 2025-11-11

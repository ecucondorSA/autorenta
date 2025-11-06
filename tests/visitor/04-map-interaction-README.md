# 🗺️ E2E Tests: Cars Map Component

## Overview

Suite completa de tests E2E para el componente `CarsMapComponent` que valida la funcionalidad del mapa interactivo de autos.

**Priority**: P0 (Critical)  
**Duration**: ~5-8 minutos  
**Coverage**: 15+ escenarios de prueba

---

## 🎯 Test Coverage

### Funcionalidad Básica
- ✅ Carga del contenedor del mapa
- ✅ Estado de carga inicial
- ✅ Renderizado sin errores
- ✅ Visualización de markers de autos

### Interacción
- ✅ Controles del mapa (zoom, pan)
- ✅ Pan del mapa (arrastrar)
- ✅ Integración con carousel
- ✅ Sincronización marker ↔ carousel

### Características Avanzadas
- ✅ Solicitud de geolocalización
- ✅ Filtros del mapa
- ✅ Aplicación de filtros de precio
- ✅ Estado vacío (sin autos)

### Integración
- ✅ Navegación a detalle desde marker
- ✅ Highlight de auto seleccionado
- ✅ Performance con muchos markers

### Responsive
- ✅ Renderizado en móvil
- ✅ Interacción táctil en móvil

### Manejo de Errores
- ✅ Mensaje de error si falla la carga
- ✅ Tiempo de carga aceptable

---

## 🚀 Ejecución

### Ejecutar todos los tests del mapa
```bash
npx playwright test tests/visitor/04-map-interaction.spec.ts
```

### Ejecutar con UI (debugging)
```bash
npx playwright test tests/visitor/04-map-interaction.spec.ts --ui
```

### Ejecutar en modo headed (ver navegador)
```bash
npx playwright test tests/visitor/04-map-interaction.spec.ts --headed
```

### Ejecutar solo tests móviles
```bash
npx playwright test tests/visitor/04-map-interaction.spec.ts -g "Mobile"
```

### Ejecutar solo tests de integración
```bash
npx playwright test tests/visitor/04-map-interaction.spec.ts -g "Integration"
```

### Ejecutar solo tests de performance
```bash
npx playwright test tests/visitor/04-map-interaction.spec.ts -g "Performance"
```

---

## 🧪 Estructura de Tests

### 1. Visitor Tests (Sin autenticación)
- Carga básica del mapa
- Visualización de markers
- Interacción con controles
- Integración con carousel

### 2. Mobile Tests
- Renderizado responsivo
- Interacción táctil

### 3. Integration Tests
- Navegación desde marker
- Highlight de selección

### 4. Error Handling Tests
- Manejo de errores de carga
- Estados de error

### 5. Performance Tests
- Tiempo de carga
- Manejo de muchos markers

---

## 🛠️ Helpers Disponibles

El archivo `tests/helpers/map-test-helpers.ts` proporciona utilidades:

```typescript
import { getMapHelpers } from '../helpers/map-test-helpers';

test('example', async ({ page }) => {
  const mapHelpers = getMapHelpers(page);
  
  // Wait for map to load
  await mapHelpers.waitForMapLoad();
  
  // Verify map is loaded
  await mapHelpers.verifyMapLoaded();
  
  // Click on map
  await mapHelpers.clickOnMap(100, 100);
  
  // Pan map
  await mapHelpers.panMap(50, 50);
  
  // Click car card
  await mapHelpers.clickCarCard(0);
  
  // Apply filters
  await mapHelpers.applyPriceFilter(10000, 50000);
});
```

---

## 📋 Requisitos

### Pre-requisitos
- Servidor de desarrollo corriendo en `http://localhost:4200`
- Mapbox access token configurado
- Datos de prueba (autos con coordenadas) en la base de datos

### Variables de Entorno
```bash
PLAYWRIGHT_BASE_URL=http://localhost:4200
NG_APP_MAPBOX_ACCESS_TOKEN=pk.ey...
```

---

## 🐛 Troubleshooting

### Map no carga
- Verificar que Mapbox token esté configurado
- Verificar que servidor esté corriendo
- Revisar logs del navegador en modo headed

### Markers no aparecen
- Verificar que haya autos con coordenadas en la BD
- Esperar tiempo suficiente para que markers rendericen (5+ segundos)
- Verificar que no haya errores en consola

### Tests fallan en CI
- Verificar que Mapbox API esté accesible desde CI
- Aumentar timeouts si es necesario
- Verificar screenshots/videos en artifacts

---

## 📊 Métricas Esperadas

- **Tiempo de carga**: < 10 segundos
- **Tiempo de interacción**: < 2 segundos por acción
- **Success rate**: > 95% en CI

---

## 🔄 Próximos Tests a Agregar

- [ ] Test de clustering con muchos markers (>30 autos)
- [ ] Test de animaciones de markers (bounce, pulse)
- [ ] Test de popup de información de marker
- [ ] Test de búsqueda por ubicación
- [ ] Test de actualización en tiempo real
- [ ] Visual regression tests para diferentes estados

---

**Última actualización**: 2025-11-03










# 🔍 GUÍA DE DEBUGGING - MAPBOX NO CARGA

**Fecha**: 2025-10-19
**Problema**: Mapa de Mapbox aparece parcialmente o con espacios blancos

---

## 📋 CHECKLIST DE DEBUGGING

### PASO 1: Verificar que el mapa se está renderizando

Abre la consola del navegador (F12 → Console) y busca estos mensajes:

```
✅ [CarsMapComponent] Container height before init: XXXpx
✅ [CarsMapComponent] Initial map resize
✅ [CarsMapComponent] Map resized at 100ms
✅ [CarsMapComponent] Map resized at 300ms
✅ [CarsMapComponent] ResizeObserver setup complete
```

**Si ves `Container height before init: 0`** → El problema está en el CSS del contenedor padre

**Si NO ves ningún mensaje** → El componente no se está inicializando

---

### PASO 2: Inspeccionar el DOM con Chrome DevTools

1. **Abrir DevTools** (F12)
2. **Ir a la pestaña Elements**
3. **Buscar el elemento** `<app-cars-map>`
4. **Expandir el árbol** para ver:
   ```html
   <app-cars-map>
     <div class="cars-map-container">
       <div class="map-canvas">
         <div class="mapboxgl-map"> ← Este debe existir
           <div class="mapboxgl-canvas-container">
             <canvas class="mapboxgl-canvas"> ← Este es el mapa real
             </canvas>
           </div>
         </div>
       </div>
     </div>
   </app-cars-map>
   ```

5. **Seleccionar el `<canvas>`** en el inspector
6. **Ir a la pestaña Computed** (al lado de Styles)
7. **Verificar dimensiones**:
   ```
   width: XXXpx (debe ser > 0)
   height: XXXpx (debe ser > 0)
   ```

**Si `width` o `height` es 0** → El contenedor padre no tiene tamaño

---

### PASO 3: Verificar CSS del contenedor padre

En la consola de DevTools, ejecuta este comando:

```javascript
// Copiar y pegar en la consola del navegador
const mapElement = document.querySelector('app-cars-map');
const mapContainer = mapElement?.querySelector('.map-canvas');
const mapboxCanvas = mapElement?.querySelector('.mapboxgl-canvas');

console.log('=== MAPBOX DEBUG ===');
console.log('app-cars-map dimensions:', {
  width: mapElement?.offsetWidth,
  height: mapElement?.offsetHeight,
  display: getComputedStyle(mapElement).display,
  position: getComputedStyle(mapElement).position
});
console.log('map-canvas dimensions:', {
  width: mapContainer?.offsetWidth,
  height: mapContainer?.offsetHeight
});
console.log('mapboxgl-canvas dimensions:', {
  width: mapboxCanvas?.offsetWidth,
  height: mapboxCanvas?.offsetHeight,
  style_width: mapboxCanvas?.style.width,
  style_height: mapboxCanvas?.style.height
});
console.log('Parent container (.map-fullscreen):', {
  width: mapElement?.parentElement?.offsetWidth,
  height: mapElement?.parentElement?.offsetHeight,
  display: getComputedStyle(mapElement.parentElement).display,
  flex: getComputedStyle(mapElement.parentElement).flex
});
```

**Salida esperada**:
```
app-cars-map dimensions: { width: 800+, height: 600+, ... }
map-canvas dimensions: { width: 800+, height: 600+ }
mapboxgl-canvas dimensions: { width: 800+, height: 600+ }
Parent container: { width: 800+, height: 600+, flex: "1" }
```

**Si alguna dimension es 0** → Problema de CSS

---

### PASO 4: Verificar errores de Mapbox

En la consola, busca errores como:

```
❌ Error: Mapbox access token is required
❌ Error: Failed to load mapbox://styles/mapbox/streets-v12
❌ WebGL not supported
```

**Si ves error de access token** → Verificar `environment.mapboxAccessToken`

**Si ves error de WebGL** → El navegador no soporta WebGL (poco probable)

---

### PASO 5: Forzar resize manual

En la consola del navegador, ejecuta:

```javascript
// Forzar resize del mapa
const mapComponent = document.querySelector('app-cars-map');
const event = new Event('resize');
window.dispatchEvent(event);

// O más directo (si tienes acceso al componente Angular)
setTimeout(() => {
  const mapCanvas = document.querySelector('.mapboxgl-canvas');
  if (mapCanvas) {
    mapCanvas.style.width = '100%';
    mapCanvas.style.height = '100%';
  }
}, 1000);
```

**Si el mapa aparece después de esto** → Problema de timing en el resize

---

## 🛠️ SOLUCIONES SEGÚN EL PROBLEMA

### Problema 1: `Container height before init: 0`

**Causa**: El contenedor padre `.map-fullscreen` no tiene altura cuando se inicializa el mapa

**Solución A**: Forzar altura mínima en el CSS
```css
.map-fullscreen {
  min-height: 500px !important; /* Temporal para debugging */
}
```

**Solución B**: Remover el `@defer` del HTML
```html
<!-- ANTES (con @defer) -->
@defer (on viewport) {
  <app-cars-map></app-cars-map>
}

<!-- DESPUÉS (sin @defer) -->
<app-cars-map></app-cars-map>
```

---

### Problema 2: Canvas tiene dimensiones pero está en blanco

**Causa**: Mapbox se inicializó antes de que el contenedor tuviera su tamaño final

**Solución**: Ya implementada con múltiples `map.resize()` calls

Si aún no funciona, agregar un resize manual después de que todo cargue:

```typescript
// En cars-map.component.ts, al final de initializeMap()
this.map.on('load', () => {
  // ... código existente ...

  // EXTRA: Force resize después de 5 segundos
  setTimeout(() => {
    if (this.map) {
      this.map.resize();
      console.log('[DEBUG] Manual resize after 5s');
    }
  }, 5000);
});
```

---

### Problema 3: El mapa carga pero no ocupa todo el ancho

**Causa**: Conflicto de CSS entre el contenedor y el canvas

**Solución**: Ya implementada con `position: absolute` y `inset: 0`

Verificar que no haya padding/margin en el contenedor:

```css
.map-fullscreen {
  padding: 0 !important;
  margin: 0 !important;
  overflow: hidden !important;
}
```

---

## 📸 CAPTURA DE PANTALLA PARA DEBUGGING

Por favor, captura una screenshot con:

1. **DevTools abierto** (F12)
2. **Pestaña Elements** mostrando el árbol de `<app-cars-map>`
3. **Pestaña Computed** mostrando dimensiones del `<canvas>`
4. **Pestaña Console** mostrando los logs

Y comparte la imagen para debugging avanzado.

---

## 🚨 SOLUCIÓN NUCLEAR (si nada funciona)

Si después de todo esto el mapa sigue sin cargar, podemos:

### Opción 1: Remover `@defer` completamente

```typescript
// En cars-list.page.html, línea 6-32
// REEMPLAZAR todo el bloque @defer por:
<app-cars-map
  [cars]="cars()"
  [selectedCarId]="selectedCarId()"
  (carSelected)="onMapCarSelected($event)"
  (userLocationChange)="onUserLocationChange($event)"
></app-cars-map>
```

### Opción 2: Usar `ngAfterViewInit` con delay más largo

```typescript
ngAfterViewInit(): void {
  // ... código existente ...

  // NUCLEAR: Esperar 3 segundos antes de inicializar
  setTimeout(() => {
    void this.initializeMap();
  }, 3000);
}
```

### Opción 3: Usar `IntersectionObserver` en lugar de `@defer`

Implementar lazy loading manual con mejor control del timing.

---

## ✅ VERIFICACIÓN FINAL

Cuando el mapa esté funcionando correctamente, deberías ver:

1. ✅ Mapa de Mapbox con calles de Uruguay
2. ✅ Marcadores de autos (círculos con precios)
3. ✅ Botón GPS flotante (esquina superior derecha)
4. ✅ Badge con conteo de autos
5. ✅ No hay espacios blancos/grises
6. ✅ El mapa responde a zoom/pan
7. ✅ Al hacer click en un marcador, se selecciona el auto

---

## 🔗 RECURSOS

- **Mapbox GL JS Debug**: https://docs.mapbox.com/mapbox-gl-js/guides/troubleshooting/
- **Angular @defer**: https://angular.dev/guide/defer
- **ResizeObserver**: https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver

---

**Por favor ejecuta los pasos de debugging y comparte los resultados.**

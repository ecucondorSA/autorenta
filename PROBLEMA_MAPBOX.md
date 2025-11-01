# 🐛 PROBLEMA CRÍTICO IDENTIFICADO

## Diagnóstico con Playwright:
- ❌ Mapbox NO carga en producción
- ❌ Canvas NO existe
- ❌ 0 markers siempre
- ❌ No hay logs de Angular

## Causa Raíz:
El **dynamic import** de Mapbox falla en producción (Cloudflare Pages).

```typescript
// ACTUAL (NO FUNCIONA en producción)
const mapbox = await import('mapbox-gl/dist/mapbox-gl.js');
this.mapboxgl = mapbox.default || mapbox;
```

## Solución:
Cambiar a **import estático** en el componente.

```typescript
// NUEVO (funciona en producción)
import mapboxgl from 'mapbox-gl';
```

## Siguiente paso:
Implementar import estático sin romper el componente.

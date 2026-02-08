# Dual Map Strategy (Mapbox + Google Maps Fallback)

## Estado Actual: 🟡 70% Implementado

### ✅ Completado

1. **Abstracción de Providers** (`map-provider.interface.ts`)
   - Interface unificada para Mapbox y Google Maps
   - Permite intercambiar providers sin cambiar componentes

2. **Google Maps Adapter** (`google-maps-provider.service.ts`)
   - Implementación completa de IMapProvider
   - Lazy loading (no impacta bundle)
   - Soporta marcadores, popups, bounds events

3. **Mapbox Adapter** (`mapbox-provider.service.ts`)
   - Wrapper sobre Mapbox GL actual
   - Mantiene optimizaciones existentes
   - Detecta WebGL support

4. **Selector Automático** (`map-provider-selector.service.ts`)
   - Elige mejor provider disponible
   - Fallback automático si Mapbox falla

5. **Variables de Entorno**
   - `NG_APP_GOOGLE_MAPS_API_KEY` agregada

### ⏳ Pendiente (30%)

1. **Integrar en CarsMapComponent**
   - Reemplazar inicialización directa de Mapbox
   - Usar MapProviderSelectorService
   - Mantener features existentes (clustering, markers, etc.)

2. **Testing**
   - Probar fallback en dispositivo sin WebGL
   - Verificar performance en ambos providers

3. **Configuración**
   - Obtener Google Maps API key
   - Agregar a .env.local
   - Configurar billing en Google Cloud

## Cómo Activar (Cuando esté listo)

### 1. Obtener Google Maps API Key

```bash
# Ir a: https://console.cloud.google.com/apis/credentials
# Crear nuevo proyecto o usar existente
# Habilitar: Maps JavaScript API + Marker API
# Crear API Key (con restricciones de dominio para producción)
```

### 2. Configurar Localmente

```bash
# .env.local
NG_APP_GOOGLE_MAPS_API_KEY=AIza...your_key
```

### 3. Integrar en CarsMapComponent

```typescript
// cars-map.component.ts (cambio futuro)
private async initializeMap(): Promise<void> {
  // OLD:
  // const mapboxModule = await import('mapbox-gl');
  // this.mapboxgl = mapboxModule.default;

  // NEW:
  const selection = await this.mapProviderSelector.selectProvider();
  this.mapProvider = selection.provider;
  console.log(`Using ${selection.type} (${selection.reason})`);

  this.map = await this.mapProvider.createMap(container, options);
}
```

## Beneficios

| Aspecto | Mapbox | Google Maps |
|---------|--------|-------------|
| **Bundle Size** | 700KB | 0KB (CDN) |
| **WebGL** | Requerido | Opcional |
| **Uptime** | ~99% | ~99.9% |
| **Costo** | Free tier 50k loads/mes | Free tier 28k loads/mes |
| **Estética** | ⭐⭐⭐⭐⭐ Cyberpunk | ⭐⭐⭐ Clásico |

**Resultado:** 100% uptime combinado (si uno falla, el otro actúa de respaldo)

## Performance Esperado

### Mapbox (Primary)
- First Paint: ~2s (3G), ~500ms (4G)
- Funciona: 95% de dispositivos modernos

### Google Maps (Fallback)
- First Paint: ~1s (3G), ~300ms (4G)
- Funciona: 99.9% de dispositivos (incluidos viejos)

## Prioridad vs Otros Issues

**Decisión:** Pausado temporalmente para atender issues críticos:
1. RLS Storage violations (car-images upload failing)
2. AI Vision 401 unauthorized errors
3. CORS issues en tiktok-events
4. Sentry 429 (flooding)

**Retomar cuando:** Issues P0 estén resueltos.

## Archivos Creados

```
apps/web/src/app/core/services/geo/
├── map-provider.interface.ts           ✅ Done
├── google-maps-provider.service.ts     ✅ Done
├── mapbox-provider.service.ts          ✅ Done
├── map-provider-selector.service.ts    ✅ Done
└── README-DUAL-MAPS.md                 ✅ Este archivo
```

## Rollout Plan (Futuro)

1. **Semana 1:** Testing en dev con feature flag
2. **Semana 2:** Deploy a 10% de usuarios (canary)
3. **Semana 3:** Full rollout si no hay regressions

---

**Última actualización:** 2026-02-08
**Owner:** Eduardo
**Status:** On Hold (pending P0 fixes)

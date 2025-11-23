# Reporte de Análisis del Bundle

## Resumen Ejecutivo
El análisis del bundle de la aplicación revela que, aunque algunas dependencias importantes se cargan correctamente de forma diferida (lazy-loaded), existen oportunidades de optimización, particularmente con la librería de visitas guiadas (`shepherd.js`) y se debe tener en cuenta la gran dependencia de Mapbox.

## Hallazgos Clave

### 1. Chunks Más Grandes
| Nombre del Chunk | Tamaño | Contenido Principal | Estado |
|------------------|--------|---------------------|--------|
| `chunk-J27Q64OM.js` | **1.57 MB** | `mapbox-gl` (1.6 MB) | ✅ Carga Diferida |
| `chunk-LZGQVBNE.js` | **0.39 MB** | `jspdf` (328 KB) | ✅ Carga Diferida |
| `main-PB42B27X.js` | **0.30 MB** | Código Principal de la App | ⚠️ Contiene `shepherd.js` |
| `chunk-XBS6V6ZG.js` | **0.24 MB** | Sentry SDK | ✅ Esperado |
| `chunk-BUXVY5F7.js` | **0.19 MB** | `html2canvas` (198 KB) | ✅ Carga Diferida |

### 2. Oportunidades de Optimización

#### 🔴 Crítico: Shepherd.js (Visitas Guiadas)
- **Estado Actual**: `shepherd.js` (54 KB) está incluido en el **bundle principal**. Esto significa que cada usuario lo descarga en la carga inicial, incluso si nunca usan la función de tour.
- **Recomendación**: Refactorizar `ShepherdAdapterService` para usar importaciones dinámicas (`import('shepherd.js')`) de modo que la librería solo se cargue cuando se inicie un tour.

#### 🟡 Advertencia: Mapbox GL
- **Estado Actual**: `mapbox-gl` se carga correctamente de forma diferida (¡buen trabajo!). Sin embargo, es extremadamente grande (1.6 MB).
- **Implicación**: Los usuarios que abran el mapa por primera vez experimentarán una descarga significativa.
- **Recomendación**: Asegurar que haya un estado de carga visible mientras se obtiene el chunk del mapa. Considerar usar una alternativa más ligera si no se necesitan todas las funciones de Mapbox en todas partes, pero dada la naturaleza de la app, este tamaño podría ser inevitable.

#### 🟢 Bueno: Generación de PDF
- **Estado Actual**: `jspdf` y `html2canvas` están separados exitosamente en sus propios chunks. Esto se alinea con esfuerzos de optimización previos y evita que inflen la carga inicial.

## Conclusión
**Sí, se requiere atención.**
1.  **Acción Inmediata**: Refactorizar `ShepherdAdapterService` para cargar `shepherd.js` de forma diferida.
2.  **Verificación**: Asegurar que la experiencia de carga para el chunk de Mapbox sea fluida.

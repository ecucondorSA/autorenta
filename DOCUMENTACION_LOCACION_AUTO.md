# DOCUMENTACIÓN TÉCNICA: PROCESO DE LOCACIÓN Y GEO-POSICIONAMIENTO

**Fecha:** 2026-01-04
**Estado:** ANÁLISIS CRÍTICO
**Autor:** Gemini CLI Agent

---

## 1. RESUMEN DE LA SITUACIÓN ACTUAL

El sistema de locación de Autorenta es un componente crítico que presenta **inconsistencias graves** en la sincronización de datos. Actualmente, la ubicación de los vehículos se almacena de forma redundante (coordenadas planas vs. geometría PostGIS) sin un mecanismo automático de sincronización, lo que puede resultar en que los autos no aparezcan en las búsquedas por radio a pesar de tener coordenadas correctas.

### Hallazgo Crítico (P0)
**Desincronización de Base de Datos:** La tabla `cars` tiene columnas `location_lat`/`location_lng` (usadas por el frontend) y `location_geom` (usada por PostGIS para búsquedas).
**NO EXISTE UN TRIGGER** en la base de datos que actualice `location_geom` automáticamente cuando se modifican `location_lat` o `location_lng`.
> **Consecuencia:** Si un usuario actualiza la ubicación de su auto desde el frontend, `location_geom` queda obsoleto. El auto "desaparece" de las búsquedas geoespaciales (`get_cars_within_radius`).

---

## 2. ARQUITECTURA DE DATOS (BASE DE DATOS)

### 2.1 Tabla: `public.cars`
La tabla principal que almacena la ubicación del vehículo.

| Columna | Tipo | Descripción | Fuente |
|---------|------|-------------|--------|
| `id` | UUID | Identificador único | Sistema |
| `location_lat` | NUMERIC | Latitud (Decimal) | Frontend / GPS |
| `location_lng` | NUMERIC | Longitud (Decimal) | Frontend / GPS |
| `location_geom` | GEOMETRY(Point, 4326) | **CRÍTICO:** Punto espacial para queries PostGIS | **MANUAL (Desincronizado)** |
| `city` | TEXT | Ciudad (Texto) | Mapbox Reverse Geocoding |
| `province` | TEXT | Provincia/Estado | Mapbox Reverse Geocoding |
| `country` | TEXT | País (ISO) | Mapbox Reverse Geocoding |
| `region_id` | UUID | Referencia a `pricing_regions` | Asignación manual/script |

### 2.2 Tabla: `public.bookings`
Almacena las coordenadas de inicio y fin de la reserva.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `pickup_location_lat` | NUMERIC | Latitud de recogida |
| `pickup_location_lng` | NUMERIC | Longitud de recogida |
| `dropoff_location_lat` | NUMERIC | Latitud de devolución |
| `dropoff_location_lng` | NUMERIC | Longitud de devolución |
| `delivery_required` | BOOLEAN | Si requiere entrega a domicilio |
| `delivery_distance_km` | NUMERIC | Distancia calculada para el delivery |

---

## 3. SERVICIOS Y FLUJOS DE CÓDIGO (FRONTEND)

### 3.1 Servicios Principales (Nombres Exactos)

1.  **`PublishCarLocationService`**
    *   **Ubicación:** `apps/web/src/app/features/cars/publish/services/publish-car-location.service.ts`
    *   **Responsabilidad:** Captura la ubicación inicial del dueño.
    *   **APIs:**
        *   Navegador `navigator.geolocation` (Primaria).
        *   **Google Geolocation API** (Fallback si falla GPS).
        *   **Mapbox Geocoding API** (Para Reverse Geocoding: Coordenadas -> Dirección).

2.  **`GeocodingService`**
    *   **Ubicación:** `apps/web/src/app/core/services/geo/geocoding.service.ts`
    *   **Responsabilidad:** Wrapper central para Mapbox.
    *   **Funciones:** `geocodeAddress`, `reverseGeocode`, `getLocationSuggestions`.
    *   **Endpoint:** `https://api.mapbox.com/geocoding/v5/mapbox.places/...`

3.  **`DistanceCalculatorService`**
    *   **Ubicación:** `apps/web/src/app/core/services/geo/distance-calculator.service.ts`
    *   **Responsabilidad:** Cálculo de distancias (Haversine formula) para tarifas de delivery.

4.  **`BookingLocationFormComponent`**
    *   **Ubicación:** `apps/web/src/app/features/bookings/components/booking-location-form/booking-location-form.component.ts`
    *   **Responsabilidad:** UI para que el renter seleccione dónde recibir el auto.

### 3.2 Flujo: Publicación de Auto (Dueño)

1.  El usuario entra a `PublishCarV2Page`.
2.  Invoca `PublishCarLocationService.useCurrentLocation()`.
3.  Si GPS falla, usa Google API.
4.  Obtiene `latitude`, `longitude`.
5.  Llama a `PublishCarLocationService.reverseGeocode(lat, lng)` usando Mapbox.
6.  Rellena `city`, `state`, `country`.
7.  **Guardado:** Se envía un UPDATE a la tabla `cars` con `location_lat`, `location_lng`.
    *   **ERROR:** Aquí no se actualiza explícitamente `location_geom`.

### 3.3 Flujo: Reserva (Renter)

1.  Renter busca autos (Query usa `location_geom` vía RPC `get_cars_within_radius` - *potencialmente roto si geom es null/viejo*).
2.  En el checkout, usa `BookingLocationFormComponent`.
3.  Ingresa dirección -> `GeocodingService` (Mapbox) -> Devuelve coordenadas.
4.  Se calcula `distanceKm` contra la ubicación del auto (`carOwnerLat/Lng`).
5.  Se guarda en `bookings`.

---

## 4. INCONSISTENCIAS DETECTADAS Y SOLUCIONES

### Inconsistencia #1: `location_geom` desactualizado
**Problema:** La columna PostGIS no se actualiza sola.
**Solución Requerida:** Crear un Trigger en PostgreSQL.

```sql
CREATE OR REPLACE FUNCTION public.sync_cars_location_geom()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo actualizar si cambiaron lat/lng
    IF (NEW.location_lat IS DISTINCT FROM OLD.location_lat) OR
       (NEW.location_lng IS DISTINCT FROM OLD.location_lng) THEN
        
        IF NEW.location_lat IS NOT NULL AND NEW.location_lng IS NOT NULL THEN
            NEW.location_geom := ST_SetSRID(ST_MakePoint(NEW.location_lng::double precision, NEW.location_lat::double precision), 4326);
        ELSE
            NEW.location_geom := NULL;
        END IF;
        
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_cars_location_geom
BEFORE INSERT OR UPDATE ON public.cars
FOR EACH ROW
EXECUTE FUNCTION public.sync_cars_location_geom();
```

### Inconsistencia #2: Dependencia Dual (Google + Mapbox)
**Problema:** Se usa Google Geolocation para obtener lat/lng "a ciegas" y luego Mapbox para obtener la dirección. Si las bases de datos de mapas difieren ligeramente, la dirección textual puede no coincidir exactamente con el pin en el mapa visual (que suele ser Mapbox en el frontend).
**Recomendación:** Estandarizar todo en Mapbox o asegurar que las coordenadas de Google se visualicen en un mapa que coincida. Actualmente el mapa visual es `mapbox-gl`.

### Inconsistencia #3: Ciudades y Regiones
**Problema:** El campo `city` es texto libre llenado por el reverse geocoding. Esto hace difícil agrupar autos por ciudad de forma consistente ("Buenos Aires" vs "CABA" vs "Capital Federal").
**Solución:** Normalizar ciudades o confiar puramente en búsquedas por radio (lat/lng) ignorando el texto de la ciudad para la lógica de búsqueda.

---

## 5. RECURSOS EXTERNOS

*   **Mapbox API:** Usada para Geocoding y Mapas. Token en `environment.mapboxAccessToken`.
*   **Google Geolocation API:** Usada como fallback de GPS. Key en `environment.googleGeolocationApiKey`.
*   **PostGIS:** Extensión de base de datos usada para índices espaciales (`GIST`).

---

*Documento generado automáticamente para resolver inconsistencias de locación.*

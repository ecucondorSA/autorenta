# 🦅 Implementation Plan: AutoRenta Scouts (Bounty System)

> **Estrategia:** Recuperación colaborativa incentivada (Gig Economy).
> **Concepto:** "Uber para recuperar autos".
> **Incentivo:** $150 USD por confirmación visual positiva.
> **Tecnología:** PostGIS (Geolocalización) + Gemini Vision (Verificación de Patente).

## 1. El Flujo "Scout"

### Paso 1: Activación (The Trigger)
Cuando un Owner o el Sistema (por "Silencio Sospechoso") marca un auto como `MISSING`:
1.  El sistema toma la **Última Ubicación Conocida**.
2.  Ejecuta una *query espacial* en la tabla de usuarios (`profiles`) para encontrar los 5-10 usuarios más cercanos (radio < 2km) con la App instalada.

### Paso 2: La Misión (The Push)
Esos 5 usuarios reciben una **Push Notification Prioritaria**:
> 🎯 **Misión Scout Disponible:** Gana $150 USD confirmando un vehículo a 400 metros de tu posición. Toca para aceptar.

### Paso 3: Ejecución (Stealth Verification)
1.  El usuario abre la App y ve un **Radio de Búsqueda** (no el punto exacto para proteger datos si el auto se mueve, sino una zona).
2.  Datos visibles: Modelo, Color y Patente (parcial o total).
3.  **Instrucción de Seguridad:** *"Mantén distancia. Solo necesitamos una foto clara donde se vea la patente. No interactúes con nadie."*
4.  El usuario toma la foto usando la cámara in-app (evita uploads de fotos viejas).

### Paso 4: Validación IA (The Referee)
1.  La foto se envía a una **Edge Function**.
2.  **Gemini Vision Analysis:**
    *   ¿Hay un auto en la foto?
    *   ¿Coincide el modelo/color?
    *   **OCR:** ¿Se lee la patente `AB 123 CD`?
3.  **Resultado:**
    *   ✅ **Match:** Se notifica al Owner con la ubicación exacta actual y la foto. Se acreditan $150 a la Wallet del Scout.
    *   ❌ **No Match:** Se rechaza la misión ("La patente no coincide").

---

## 2. Arquitectura de Datos

### 2.1 Tabla de Recompensas (`bounties`)

```sql
create type public.bounty_status as enum ('ACTIVE', 'CLAIMED', 'EXPIRED', 'CANCELLED');

create table public.bounties (
  id uuid default gen_random_uuid() primary key,
  car_id uuid references public.cars(id),
  target_location geography(POINT), -- Dónde creemos que está
  radius_meters int default 1000,
  reward_amount decimal default 150.00,
  currency text default 'USD',
  status public.bounty_status default 'ACTIVE',
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone
);

-- Índices espaciales para búsquedas rápidas
create index bounties_geo_index on public.bounties using GIST (target_location);
```

### 2.2 Tabla de Intentos (`bounty_claims`)

```sql
create table public.bounty_claims (
  id uuid default gen_random_uuid() primary key,
  bounty_id uuid references public.bounties(id),
  scout_id uuid references public.profiles(id), -- El usuario que tomó la foto
  photo_url text not null,
  ai_verification_result jsonb, -- Respuesta de Gemini (confidence, plate_read)
  is_verified boolean default false,
  claimed_at timestamp with time zone default now(),
  location_at_claim geography(POINT) -- Dónde estaba el scout al sacar la foto
);
```

---

## 3. Integración con Gemini (AI Vision)

Usaremos el modelo `gemini-2.0-flash` por su velocidad y bajo costo.

**Prompt del Sistema para la Edge Function:**
```text
Analiza esta imagen.
1. Identifica si hay un vehículo.
2. Extrae la matrícula (patente) si es visible.
3. Determina marca, modelo y color aproximado.
4. Devuelve JSON estrictamente:
{
  "is_vehicle": true,
  "license_plate": "AB123CD",
  "car_description": "Toyota Corolla Blanco",
  "confidence": 0.95
}
```

---

## 4. Roadmap de Implementación

### Sprint 1: Backend & Base de Datos (Core)
*   Crear tablas `bounties` y `bounty_claims`.
*   Implementar función PostgreSQL `find_nearby_scouts(lat, long, radius)` para seleccionar a quién notificar.

### Sprint 2: IA & Edge Functions (Intelligence)
*   Crear Edge Function `verify-bounty-photo`.
*   Integrar SDK de Google AI para procesar la imagen.
*   Conectar con `WalletService` para disparar el pago automático si `is_verified === true`.

### Sprint 3: UI Móvil (Experience)
*   Pantalla "Scout Mission": Mapa con zona circular, ficha del auto buscado.
*   Cámara personalizada: Bloquear acceso a galería (solo fotos en vivo) y overlay de guías para encuadrar patente.

---

## 5. Medidas de Seguridad (Anti-Fraude y Física)

1.  **Anti-Spoofing GPS:** Validar que la ubicación del teléfono al subir la foto coincida con la ubicación de la foto (metadatos EXIF) y esté dentro del radio de búsqueda.
2.  **Límite de Intentos:** Un usuario solo puede intentar 3 veces por bounty para evitar spam de fotos falsas.
3.  **Anonimato:** El Owner recibe la ubicación y la foto, pero **nunca** la identidad del Scout. El Scout recibe el pago, pero **nunca** contacta al Owner. AutoRenta es el intermediario ciego.

---

## 6. Próximo Paso Inmediato
Ejecutar la migración de base de datos para crear la estructura de `bounties`.

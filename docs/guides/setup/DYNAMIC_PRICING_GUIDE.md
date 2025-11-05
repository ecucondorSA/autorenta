# 🎯 Sistema de Pricing Dinámico - AutoRentar

## 📋 Índice

1. [Visión General](#visión-general)
2. [Arquitectura](#arquitectura)
3. [Fórmula de Cálculo](#fórmula-de-cálculo)
4. [Configuración de Base de Datos](#configuración-de-base-de-datos)
5. [Uso en la Aplicación](#uso-en-la-aplicación)
6. [Mantenimiento y Operaciones](#mantenimiento-y-operaciones)
7. [Ejemplos Prácticos](#ejemplos-prácticos)

---

## Visión General

AutoRentar implementa un **sistema de pricing dinámico** inspirado en Uber y Airbnb, que ajusta las tarifas de alquiler por hora en tiempo real basándose en:

- 📅 **Día de la semana** (mayor demanda viernes/fines de semana)
- ⏰ **Hora del día** (hora pico vs madrugada)
- 👤 **Tipo de usuario** (nuevo, frecuente, verificado)
- 📊 **Oferta vs Demanda** (autos disponibles vs solicitudes activas)
- 🎉 **Eventos especiales** (feriados, conciertos, clima extremo)

### Beneficios

✅ **Maximiza ingresos** para propietarios en alta demanda
✅ **Incentiva alquileres** en horarios de baja demanda con descuentos
✅ **Transparencia total** con breakdown detallado de factores
✅ **Multi-región** con soporte para diferentes monedas e inflación
✅ **Auditoría completa** de cada cálculo de precio

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Angular)                       │
│  ┌────────────────────────────────────────────────────┐    │
│  │  DynamicPriceDisplayComponent                      │    │
│  │  - Muestra precio en tiempo real                   │    │
│  │  - Badge de surge/descuento                        │    │
│  │  - Breakdown expandible                            │    │
│  └────────────────────────────────────────────────────┘    │
│                          ↓                                  │
│  ┌────────────────────────────────────────────────────┐    │
│  │  DynamicPricingService                             │    │
│  │  - getRegions(), calculatePrice()                  │    │
│  │  - formatPrice(), getSurgeBadge()                  │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                          ↓ HTTP
┌─────────────────────────────────────────────────────────────┐
│             SUPABASE EDGE FUNCTION                          │
│  ┌────────────────────────────────────────────────────┐    │
│  │  calculate-dynamic-price                           │    │
│  │  - Autentica usuario                               │    │
│  │  - Llama RPC function                              │    │
│  │  - Genera surge_message                            │    │
│  │  - Registra en pricing_calculations                │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                          ↓ RPC
┌─────────────────────────────────────────────────────────────┐
│              POSTGRESQL (Supabase)                          │
│  ┌────────────────────────────────────────────────────┐    │
│  │  calculate_dynamic_price()                         │    │
│  │  1. Base price (pricing_regions)                   │    │
│  │  2. Day factor (pricing_day_factors)               │    │
│  │  3. Hour factor (pricing_hour_factors)             │    │
│  │  4. User factor (pricing_user_factors)             │    │
│  │  5. Demand factor (pricing_demand_snapshots)       │    │
│  │  6. Event factor (pricing_special_events)          │    │
│  │  7. Apply min/max caps + rounding                  │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Fórmula de Cálculo

### Fórmula Base

```
PrecioHora = Pbase × (1 + Fd + Fh + Fu + Fr + Fe)
```

Donde:
- **Pbase** = Tarifa base regional (ej: USD 2.50/hora)
- **Fd** = Factor día de la semana (-0.15 a +0.25)
- **Fh** = Factor hora del día (-0.15 a +0.25)
- **Fu** = Factor tipo de usuario (-0.15 a +0.05)
- **Fr** = Factor demanda (-0.10 a +0.25)
- **Fe** = Factor eventos especiales (0 a +0.30)

### Límites y Redondeo

```typescript
// Caps: entre 80% y 160% del precio base
const cappedPrice = Math.max(basePrice * 0.8, Math.min(finalPrice, basePrice * 1.6));

// Redondeo a 0.10 más cercano
const roundedPrice = Math.round(cappedPrice / 0.1) * 0.1;
```

### Ejemplo de Cálculo Real

**Escenario**: Viernes 19:00, usuario frecuente (5 alquileres), alta demanda

```
Base: USD 2.50
Fd (Viernes): +0.05 (+5%)
Fh (19:00 - hora pico): +0.20 (+20%)
Fu (Frecuente): -0.05 (-5%)
Fr (Alta demanda): +0.25 (+25%)
Fe (Sin eventos): 0.00

Multiplicador total: 1 + 0.05 + 0.20 - 0.05 + 0.25 = 1.45

Precio = 2.50 × 1.45 = 3.625 → USD 3.60/hora (redondeado)
```

**Resultado**: El usuario paga **+44% más** pero ve justificación transparente:
- ⚡ Alta demanda (+25%)
- 📈 Hora pico (+20%)
- 📅 Viernes (+5%)
- 💚 Usuario frecuente (-5%)

---

## Configuración de Base de Datos

### 1. Ejecutar Setup SQL

```bash
cd apps/web
PGPASSWORD="YOUR_PASSWORD" psql "postgresql://..." -f database/setup-dynamic-pricing.sql
```

Este script crea:
- ✅ 7 tablas (regions, day_factors, hour_factors, user_factors, demand_snapshots, special_events, calculations)
- ✅ 2 funciones RPC (calculate_dynamic_price, update_demand_snapshot)
- ✅ Datos semilla para 3 regiones (Montevideo, Buenos Aires, São Paulo)
- ✅ RLS policies con acceso público de lectura
- ✅ Índices de performance

### 2. Verificar Datos Semilla

```sql
-- Ver regiones activas
SELECT name, currency, base_price_per_hour FROM pricing_regions WHERE active = true;

-- Ver factores por día (región Montevideo)
SELECT day_of_week, factor FROM pricing_day_factors
WHERE region_id = (SELECT id FROM pricing_regions WHERE name = 'Montevideo');

-- Ver factores por hora
SELECT hour_start, hour_end, factor, description FROM pricing_hour_factors
WHERE region_id = (SELECT id FROM pricing_regions WHERE name = 'Montevideo');

-- Ver factores por tipo de usuario
SELECT user_type, factor, description FROM pricing_user_factors;
```

### 3. Personalizar Configuración

#### Modificar Tarifa Base

```sql
UPDATE pricing_regions
SET base_price_per_hour = 3.00
WHERE name = 'Montevideo';
```

#### Ajustar Factor de Fin de Semana

```sql
UPDATE pricing_day_factors
SET factor = 0.15  -- Cambiar de +10% a +15%
WHERE day_of_week IN (0, 6)  -- Domingo y Sábado
  AND region_id = (SELECT id FROM pricing_regions WHERE name = 'Buenos Aires');
```

#### Crear Evento Especial (Ej: Carnaval)

```sql
INSERT INTO pricing_special_events (region_id, name, start_date, end_date, factor)
VALUES (
  (SELECT id FROM pricing_regions WHERE name = 'Montevideo'),
  'Carnaval 2025',
  '2025-02-28 00:00:00+00',
  '2025-03-05 23:59:59+00',
  0.30  -- +30% durante Carnaval
);
```

### 4. Configurar Cron Job para Demand Snapshots

El sistema necesita snapshots de demanda cada 15 minutos para calcular surge pricing.

**Opción A: Supabase pg_cron (Recomendado)**

```sql
-- Instalar extensión
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Crear cron job (cada 15 min para todas las regiones)
SELECT cron.schedule(
  'update-demand-snapshots',
  '*/15 * * * *',  -- Cada 15 minutos
  $$
  DO $$
  DECLARE
    v_region RECORD;
  BEGIN
    FOR v_region IN SELECT id FROM public.pricing_regions WHERE active = true LOOP
      PERFORM public.update_demand_snapshot(v_region.id);
    END LOOP;
  END $$;
  $$
);
```

**Opción B: Edge Function + Vercel Cron**

Crear un Edge Function que llame a `update_demand_snapshot()` y configurar Vercel Cron para invocarlo cada 15 min.

---

## Uso en la Aplicación

### 1. Importar el Componente

```typescript
// En cualquier página/componente
import { DynamicPriceDisplayComponent } from '@/shared/components/dynamic-price-display/dynamic-price-display.component';

@Component({
  standalone: true,
  imports: [DynamicPriceDisplayComponent],
  // ...
})
```

### 2. Usar en Template

```html
<!-- Caso básico -->
<app-dynamic-price-display
  [regionId]="regionId"
  [rentalStart]="rentalStart"
  [rentalHours]="24"
/>

<!-- Con todas las opciones -->
<app-dynamic-price-display
  [regionId]="car.region_id"
  [rentalStart]="bookingStartDate.toISOString()"
  [rentalHours]="calculateHours()"
  [carId]="car.id"
  [showTotal]="true"
  [showBreakdown]="true"
  [autoRefresh]="true"
  [refreshInterval]="300000"
/>
```

**Props**:
- `regionId` (required): UUID de la región
- `rentalStart` (required): Fecha inicio en formato ISO 8601
- `rentalHours` (required): Cantidad de horas de alquiler
- `carId` (optional): UUID del auto (para logging)
- `showTotal` (default: true): Mostrar precio total
- `showBreakdown` (default: true): Mostrar botón "Ver detalle"
- `autoRefresh` (default: false): Refrescar precio automáticamente
- `refreshInterval` (default: 300000): Intervalo en ms (5 min)

### 3. Usar el Servicio Directamente

```typescript
import { DynamicPricingService } from '@/core/services/dynamic-pricing.service';

export class BookingComponent {
  private pricingService = inject(DynamicPricingService);

  async calculateBookingPrice(): Promise<void> {
    const pricing = await this.pricingService.calculatePrice({
      region_id: this.car.region_id,
      rental_start: this.bookingStart.toISOString(),
      rental_hours: this.rentalHours,
      car_id: this.car.id,
    });

    console.log('Precio por hora:', pricing.price_per_hour);
    console.log('Precio total:', pricing.total_price);
    console.log('Surge activo:', pricing.surge_active);
    console.log('Mensaje:', pricing.surge_message);
  }
}
```

### 4. Integrar en Car Detail Page

```typescript
// apps/web/src/app/features/cars/car-detail/car-detail.page.ts

export class CarDetailPage implements OnInit {
  readonly pricingService = inject(DynamicPricingService);

  // State
  readonly car = signal<Car | null>(null);
  readonly rentalStart = signal<Date>(new Date());
  readonly rentalHours = signal<number>(24);

  // Computed
  readonly regionId = computed(() => this.car()?.region_id || '');
}
```

```html
<!-- apps/web/src/app/features/cars/car-detail/car-detail.page.html -->

<div class="pricing-card">
  <h3>Precio de Alquiler</h3>

  <app-dynamic-price-display
    [regionId]="regionId()"
    [rentalStart]="rentalStart().toISOString()"
    [rentalHours]="rentalHours()"
    [carId]="car()?.id"
    [showTotal]="true"
    [showBreakdown]="true"
  />

  <!-- Selector de fechas -->
  <div class="mt-4">
    <label>Inicio del alquiler</label>
    <input
      type="datetime-local"
      [(ngModel)]="rentalStart"
    />
  </div>

  <div class="mt-2">
    <label>Duración (horas)</label>
    <input
      type="number"
      min="1"
      max="720"
      [(ngModel)]="rentalHours"
    />
  </div>
</div>
```

---

## Mantenimiento y Operaciones

### 1. Monitorear Demand Snapshots

```sql
-- Ver últimos 10 snapshots por región
SELECT
  pr.name AS region,
  pds.timestamp,
  pds.available_cars,
  pds.active_bookings,
  pds.pending_requests,
  pds.demand_ratio,
  pds.surge_factor
FROM pricing_demand_snapshots pds
JOIN pricing_regions pr ON pr.id = pds.region_id
ORDER BY pds.timestamp DESC
LIMIT 10;
```

### 2. Analizar Cálculos de Precio

```sql
-- Ver cálculos recientes con breakdown
SELECT
  pc.created_at,
  p.full_name AS user,
  pr.name AS region,
  pc.base_price,
  pc.final_price,
  (pc.final_price / pc.base_price - 1) * 100 AS surge_percent,
  pc.calculation_details->>'surge_message' AS message
FROM pricing_calculations pc
JOIN profiles p ON p.id = pc.user_id
JOIN pricing_regions pr ON pr.id = pc.region_id
ORDER BY pc.created_at DESC
LIMIT 20;
```

### 3. Identificar Usuarios Afectados por Surge

```sql
-- Usuarios que vieron +20% surge en última hora
SELECT
  p.full_name,
  p.email,
  pc.final_price,
  pc.base_price,
  ((pc.final_price / pc.base_price - 1) * 100)::INT AS surge_percent
FROM pricing_calculations pc
JOIN profiles p ON p.id = pc.user_id
WHERE pc.created_at > NOW() - INTERVAL '1 hour'
  AND (pc.final_price / pc.base_price) > 1.20
ORDER BY surge_percent DESC;
```

### 4. Ajustar Tarifas por Inflación

```sql
-- Aplicar 3% de incremento mensual (inflación Argentina)
UPDATE pricing_regions
SET
  base_price_per_hour = base_price_per_hour * 1.03,
  inflation_rate = 0.03,
  updated_at = NOW()
WHERE country_code = 'AR';
```

### 5. Crear Admin Dashboard

Crear una página de admin para:
- ✅ Ver demand snapshots en tiempo real
- ✅ Configurar eventos especiales
- ✅ Ajustar factores de pricing
- ✅ Ver historial de cálculos
- ✅ Analizar revenue por región/hora

```typescript
// apps/web/src/app/features/admin/pricing-dashboard/pricing-dashboard.page.ts

export class PricingDashboardPage {
  async getDemandStats(regionId: string): Promise<void> {
    const demand = await this.pricingService.getLatestDemand(regionId);
    console.log('Autos disponibles:', demand?.available_cars);
    console.log('Surge factor:', demand?.surge_factor);
  }

  async getActiveEvents(regionId: string): Promise<void> {
    const events = await this.pricingService.getActiveEvents(
      regionId,
      new Date(),
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    );
    console.log('Eventos próximos:', events);
  }
}
```

---

## Ejemplos Prácticos

### Ejemplo 1: Precio Normal (Martes 14:00, Usuario Nuevo)

```
Base: USD 2.50
Día (Martes): +0%
Hora (14:00): +0%
Usuario (Nuevo): +5%
Demanda (Normal): +0%
Eventos: +0%

Total: 2.50 × 1.05 = USD 2.60/hora
```

### Ejemplo 2: Descuento Madrugada (Lunes 3:00, Usuario Verificado)

```
Base: USD 2.50
Día (Lunes): +0%
Hora (03:00): -15%
Usuario (Verificado): -10%
Demanda (Baja): -10%
Eventos: +0%

Total: 2.50 × 0.65 = 1.625 → USD 2.00/hora (cap mínimo 80%)
```

### Ejemplo 3: Surge Extremo (Sábado 20:00, Carnaval, Alta Demanda)

```
Base: USD 2.50
Día (Sábado): +10%
Hora (20:00): +20%
Usuario (Frecuente): -5%
Demanda (Muy alta): +25%
Eventos (Carnaval): +30%

Total: 2.50 × 1.80 = 4.50 → USD 4.00/hora (cap máximo 160%)
```

---

## Roadmap Futuro

### Fase 2: Machine Learning

- 🤖 Predicción de demanda con históricos
- 📊 A/B testing de factores óptimos
- 🎯 Personalización por segmento de usuario

### Fase 3: Advanced Features

- 🌦️ Integración con APIs de clima (lluvia = +surge)
- 🎫 Integración con calendarios de eventos (conciertos, deportes)
- 🚗 Pricing dinámico por tipo de auto (SUV vs compacto)
- 💳 Dynamic deposits basados en riesgo

### Fase 4: Optimización

- ⚡ Cache de pricing en Redis/Cloudflare KV
- 📡 Real-time updates vía Supabase Realtime
- 🔔 Notificaciones push cuando baja el surge

---

## Soporte y Troubleshooting

### Error: "Region not found or inactive"

**Causa**: El `region_id` no existe o está desactivado

**Solución**:
```sql
-- Verificar regiones activas
SELECT id, name, active FROM pricing_regions;

-- Activar región
UPDATE pricing_regions SET active = true WHERE id = 'region-uuid';
```

### Error: "Failed to calculate dynamic price"

**Causa**: Faltan datos semilla (day_factors, hour_factors, etc.)

**Solución**:
```bash
# Re-ejecutar setup SQL
psql -f database/setup-dynamic-pricing.sql
```

### Precios no se actualizan con demanda

**Causa**: Cron job de `update_demand_snapshot` no está corriendo

**Solución**:
```sql
-- Ejecutar manualmente
SELECT update_demand_snapshot('region-uuid');

-- Verificar última actualización
SELECT timestamp, surge_factor FROM pricing_demand_snapshots
WHERE region_id = 'region-uuid'
ORDER BY timestamp DESC LIMIT 1;
```

---

## Recursos Adicionales

- 📁 **Database Schema**: `apps/web/database/setup-dynamic-pricing.sql`
- ⚡ **Edge Function**: `supabase/functions/calculate-dynamic-price/index.ts`
- 🎨 **Angular Service**: `apps/web/src/app/core/services/dynamic-pricing.service.ts`
- 🧩 **UI Component**: `apps/web/src/app/shared/components/dynamic-price-display/`

---

**¿Preguntas?** Consulta el código o abre un issue en el repositorio.

# Feature Catalog


---
# Source: DYNAMIC_PRICING_SYSTEM.md

# Sistema de Precios Dinámicos - AutoRenta

## 📋 Resumen

Sistema completo de precios dinámicos inspirado en Uber/Airbnb, implementado para AutoRenta en Argentina.

**Estado**: ✅ **75% Implementado** (Backend + Frontend + UI Components)

**Fecha de implementación**: 2025-11-11

---

## 🎯 Características Implementadas

### ✅ Backend (100%)
- [x] Campos de dynamic pricing en tabla `bookings`
- [x] RPC `lock_price_for_booking()` para bloquear precios por 15 minutos
- [x] RPC `request_booking()` actualizado con validación de price locks
- [x] Cron job para actualizar demand snapshots cada 15 minutos
- [x] Campo `uses_dynamic_pricing` en tabla `cars`
- [x] Sistema completo de pricing factors (día, hora, usuario, demanda, eventos)

### ✅ Frontend Services (100%)
- [x] `dynamic-pricing.model.ts`: Interfaces y helpers completos
- [x] `DynamicPricingService`: 10 métodos para manejar price locks
- [x] `BookingsService`: Soporte para dynamic pricing en creación de bookings
- [x] `PublishCarFormService`: Guardar opt-in de dynamic pricing

### ✅ UI Components (100%)
- [x] `DynamicPriceLockPanelComponent`: Panel con countdown timer
- [x] `DynamicPriceBreakdownModalComponent`: Modal de desglose detallado
- [x] `DynamicPricingBadgeComponent`: Badge para indicar precio dinámico

### ⏳ Pendiente (25%)
- [ ] Feature flags para rollout gradual
- [ ] Tests E2E del flujo completo
- [ ] Tests unitarios de servicios
- [ ] Integración UI en páginas existentes

---

## 🏗️ Arquitectura

### Flujo de Datos

```
┌─────────────────┐
│  Usuario inicia │
│    checkout     │
└────────┬────────┘
         │
         v
┌─────────────────────────────────────┐
│ 1. Frontend llama                   │
│    lockPrice(carId, userId, dates)  │
└────────┬────────────────────────────┘
         │
         v
┌─────────────────────────────────────┐
│ 2. RPC lock_price_for_booking       │
│    - Verifica car.uses_dynamic_...  │
│    - Calcula precio con 5 factores  │
│    - Genera UUID token              │
│    - Expira en 15 minutos           │
└────────┬────────────────────────────┘
         │
         v
┌─────────────────────────────────────┐
│ 3. Frontend recibe PriceLock        │
│    - Muestra countdown timer        │
│    - Compara con precio fijo        │
│    - Permite ver breakdown          │
└────────┬────────────────────────────┘
         │
         v
┌─────────────────────────────────────┐
│ 4. Usuario confirma booking         │
│    createBookingAtomic() con lock   │
└────────┬────────────────────────────┘
         │
         v
┌─────────────────────────────────────┐
│ 5. RPC request_booking              │
│    - Valida lock no expirado        │
│    - Valida token auténtico         │
│    - Crea booking con snapshot      │
└─────────────────────────────────────┘
```

---

## 🗄️ Schema de Base de Datos

### Tabla `bookings` (Campos Nuevos)

```sql
ALTER TABLE bookings ADD COLUMN has_dynamic_pricing BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN dynamic_price_snapshot JSONB;
ALTER TABLE bookings ADD COLUMN price_locked_until TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN price_lock_token UUID;
```

**Ejemplo de `dynamic_price_snapshot`**:
```json
{
  "pricePerHour": 12.50,
  "totalPrice": 300.00,
  "currency": "USD",
  "breakdown": {
    "basePrice": 10.00,
    "dayFactor": 0.10,
    "hourFactor": 0.20,
    "userFactor": -0.10,
    "demandFactor": 0.25,
    "eventFactor": 0.00,
    "totalMultiplier": 1.45
  },
  "details": {
    "userRentals": 5,
    "dayOfWeek": 6,
    "hourOfDay": 18
  },
  "surgeActive": true,
  "surgeMessage": "⚡ Alta demanda (+25%)",
  "lockedUntil": "2025-11-11T15:30:00Z",
  "lockToken": "a1b2c3d4-...",
  "carId": "...",
  "userId": "..."
}
```

### Tabla `cars` (Campo Nuevo)

```sql
ALTER TABLE cars ADD COLUMN uses_dynamic_pricing BOOLEAN DEFAULT false;
```

### Tablas de Pricing (Ya Existentes)

- `pricing_regions`: Regiones con precio base por hora
- `pricing_day_factors`: Factores por día de la semana
- `pricing_hour_factors`: Factores por hora del día
- `pricing_user_factors`: Factores por tipo de usuario
- `pricing_demand_snapshots`: Snapshots de demanda (actualizados cada 15 min)
- `pricing_special_events`: Eventos especiales (feriados, conciertos, etc.)

---

## 🔧 RPCs Implementados

### `lock_price_for_booking()`

Bloquea un precio por 15 minutos antes de que el usuario complete la reserva.

**Firma**:
```sql
FUNCTION lock_price_for_booking(
  p_car_id UUID,
  p_user_id UUID,
  p_rental_start TIMESTAMPTZ,
  p_rental_hours INT
) RETURNS JSONB
```

**Retorno (si dynamic pricing)**:
```json
{
  "uses_dynamic_pricing": true,
  "price": {
    "price_per_hour": 12.50,
    "total_price": 300.00,
    "currency": "USD",
    "breakdown": { ... }
  },
  "locked_until": "2025-11-11T15:30:00Z",
  "lock_token": "uuid...",
  "car_id": "uuid...",
  "user_id": "uuid...",
  "created_at": "2025-11-11T15:15:00Z"
}
```

**Retorno (si fixed pricing)**:
```json
{
  "uses_dynamic_pricing": false,
  "fixed_price": 50.00,
  "message": "This car uses fixed pricing"
}
```

---

### `request_booking()` (Actualizado)

Crea una reserva con validación de price lock.

**Nuevos parámetros**:
```sql
p_use_dynamic_pricing BOOLEAN DEFAULT FALSE,
p_price_lock_token UUID DEFAULT NULL,
p_dynamic_price_snapshot JSONB DEFAULT NULL
```

**Validaciones**:
- Si `use_dynamic_pricing = true`:
  - Valida que `price_lock_token` exista
  - Valida que `locked_until` no haya expirado
  - Valida que token coincida con snapshot
  - Valida que `car_id` y `user_id` coincidan

---

## ⏰ Cron Job

### Schedule
**Frecuencia**: Cada 15 minutos (`:00`, `:15`, `:30`, `:45`)

**Función**: `update_all_demand_snapshots()`

**Qué hace**:
1. Para cada región activa:
   - Cuenta autos disponibles
   - Cuenta bookings activos
   - Cuenta requests pendientes (últimas 2 horas)
2. Calcula demand ratio = (bookings + requests) / available_cars
3. Determina surge factor:
   - Ratio > 1.5: +25% (alta demanda)
   - Ratio > 1.2: +15% (demanda moderada)
   - Ratio < 0.8: -10% (descuento por baja demanda)
   - Else: 0% (normal)
4. Inserta snapshot en `pricing_demand_snapshots`
5. Registra salud en `pricing_cron_health`

### Monitoreo

```sql
-- Ver últimas ejecuciones
SELECT * FROM pricing_cron_health
ORDER BY last_run_at DESC
LIMIT 10;

-- Ver snapshots actuales
SELECT
  pr.name,
  pds.timestamp,
  pds.surge_factor,
  pds.demand_ratio
FROM pricing_demand_snapshots pds
JOIN pricing_regions pr ON pds.region_id = pr.id
ORDER BY pds.timestamp DESC;
```

---

## 💰 Factores de Precio

El precio final se calcula como:

```
precio_final = precio_base * (1 + Σ factores)
```

### 1. **Day Factor** (-15% a +25%)
- Domingo: +10%
- Lunes-Jueves: 0%
- Viernes: +5%
- Sábado: +10%

### 2. **Hour Factor** (-15% a +20%)
- 00:00-05:59: -15% (madrugada)
- 06:00-09:59: +10% (pico mañana)
- 10:00-16:59: 0% (normal)
- 17:00-21:59: +20% (pico noche)
- 22:00-23:59: +10% (noche tardía)

### 3. **User Factor** (-15% a +5%)
- Nuevo (0 rentals): +5%
- Verificado: -10%
- Frecuente (10+ rentals): -15%

### 4. **Demand Factor** (-10% a +25%)
- Alta demanda (ratio > 1.5): +25%
- Media-alta (ratio > 1.2): +15%
- Baja demanda (ratio < 0.8): -10%
- Normal: 0%

### 5. **Event Factor** (0% a +30%)
- Eventos especiales activos en la región

### Límites (Caps)
- **Mínimo**: 80% del precio base
- **Máximo**: 160% del precio base

---

## 🎨 Componentes UI

### 1. `DynamicPriceLockPanelComponent`

**Features**:
- ⏱️ Countdown timer en tiempo real (MM:SS)
- ⚠️ Alerta cuando quedan < 2 minutos
- 🔄 Botón para refrescar el lock
- 💰 Comparación con precio fijo (ahorro/sobrecosto)
- ⚡ Badge de surge pricing

**Props**:
```typescript
@Input() priceLock: PriceLock | null
@Input() comparison: PriceComparison | null
@Input() surgeInfo: SurgePricingInfo | null

@Output() refresh = EventEmitter<void>
@Output() viewBreakdown = EventEmitter<void>
```

---

### 2. `DynamicPriceBreakdownModalComponent`

**Muestra**:
- 💵 Precio base por hora
- 📊 5 factores individuales con iconos
- ✖️ Multiplicador total
- 💲 Precio final
- 📅 Contexto (día, hora, rentals del usuario)

**Props**:
```typescript
@Input() isOpen: boolean
@Input() snapshot: DynamicPriceSnapshot | null

@Output() close = EventEmitter<void>
```

---

### 3. `DynamicPricingBadgeComponent`

Badge simple para mostrar en cards de autos.

**Props**:
```typescript
@Input() surgeActive: boolean
@Input() surgeFactor?: number
```

---

## 📦 Archivos Creados/Modificados

### Migraciones SQL (5 archivos)
1. `20251111_dynamic_pricing_bookings.sql`
2. `20251111_lock_price_rpc.sql`
3. `20251111_update_request_booking_dynamic_pricing.sql`
4. `20251111_create_demand_snapshot_cron.sql`
5. `20251111_add_uses_dynamic_pricing_to_cars_v2.sql`

### TypeScript (9 archivos)
1. `dynamic-pricing.model.ts` ⭐ NUEVO
2. `dynamic-pricing.service.ts` ✏️ MODIFICADO
3. `bookings.service.ts` ✏️ MODIFICADO
4. `publish-car-form.service.ts` ✏️ MODIFICADO
5. `models/index.ts` ✏️ MODIFICADO
6. `dynamic-price-lock-panel.component.ts` ⭐ NUEVO
7. `dynamic-price-breakdown-modal.component.ts` ⭐ NUEVO
8. `dynamic-pricing-badge.component.ts` ⭐ NUEVO

### Documentación (2 archivos)
1. `DYNAMIC_PRICING_UI_INTEGRATION.md` ⭐ NUEVO
2. `DYNAMIC_PRICING_SYSTEM.md` ⭐ NUEVO (este archivo)

---

## 🚀 Guía de Uso

### Para Locadores (Dueños de Autos)

1. **Publicar auto con precio dinámico**:
   - Al publicar auto, seleccionar "Precio dinámico"
   - El campo `uses_dynamic_pricing` se guarda como `true`
   - El precio base (`price_per_day`) se usa como referencia

2. **Ver earnings potenciales**:
   - En horas pico: hasta +60% más
   - En eventos especiales: hasta +30% adicional
   - Usuarios frecuentes: precio algo reducido pero más reservas

### Para Locatarios (Usuarios)

1. **Ver precio dinámico**:
   - Al buscar autos, ver badge "Precio Dinámico"
   - Al hacer click, ver precio actual
   - Badge rojo si hay surge pricing activo

2. **Proceso de reserva**:
   - Seleccionar auto y fechas
   - Sistema bloquea precio por 15 minutos
   - Ver countdown timer
   - Completar pago antes de que expire
   - Si expira, precio se recalcula

3. **Ver desglose**:
   - Click en "Ver desglose" en panel
   - Modal muestra todos los factores
   - Transparencia total del cálculo

---

## 🧪 Testing

### Verificar Migraciones

```sql
-- Verificar campos en bookings
SELECT column_name FROM information_schema.columns
WHERE table_name = 'bookings'
  AND column_name LIKE '%dynamic%';

-- Verificar RPC existe
SELECT proname FROM pg_proc
WHERE proname = 'lock_price_for_booking';

-- Verificar cron job
SELECT * FROM cron.job
WHERE jobname = 'update-demand-snapshots-every-15min';
```

### Probar Price Lock

```sql
-- Bloquear precio de prueba
SELECT * FROM lock_price_for_booking(
  'car-uuid'::UUID,
  'user-uuid'::UUID,
  NOW() + INTERVAL '1 day',
  24
);
```

### Probar Cron Job Manualmente

```sql
-- Ejecutar manualmente
SELECT update_all_demand_snapshots();

-- Ver resultado
SELECT * FROM pricing_cron_health
ORDER BY last_run_at DESC
LIMIT 1;
```

---

## 🐛 Troubleshooting

### Problema: Precio no se bloquea

**Causas posibles**:
1. Auto no tiene `uses_dynamic_pricing = true`
2. Auto no está en una región válida
3. Usuario no autenticado

**Solución**:
```sql
-- Verificar auto
SELECT id, uses_dynamic_pricing, region_id
FROM cars WHERE id = 'car-uuid';

-- Si region_id es NULL, asignar región
UPDATE cars SET region_id = (
  SELECT id FROM pricing_regions LIMIT 1
) WHERE id = 'car-uuid';
```

---

### Problema: Lock expira muy rápido

**Causa**: Lock de 15 minutos es insuficiente

**Solución**: Modificar en `lock_price_rpc.sql`:
```sql
v_lock_expires := NOW() + INTERVAL '30 minutes';
```

Luego re-aplicar migración.

---

### Problema: Cron job no ejecuta

**Verificar**:
```sql
-- Ver si está programado
SELECT * FROM cron.job;

-- Ver logs de ejecución
SELECT * FROM cron.job_run_details
WHERE jobid = (
  SELECT jobid FROM cron.job
  WHERE jobname = 'update-demand-snapshots-every-15min'
)
ORDER BY start_time DESC
LIMIT 10;
```

---

## 📊 Métricas y Monitoreo

### KPIs a Monitorear

1. **Adoption Rate**: % de autos con dynamic pricing activado
2. **Price Lock Success Rate**: % de locks que resultan en booking
3. **Average Price Multiplier**: Multiplicador promedio aplicado
4. **Surge Frequency**: % del tiempo con surge pricing activo
5. **User Satisfaction**: Rating promedio en bookings con dynamic pricing

### Queries Útiles

```sql
-- Adoption rate
SELECT
  COUNT(*) FILTER (WHERE uses_dynamic_pricing) * 100.0 / COUNT(*) as adoption_pct
FROM cars WHERE status = 'active';

-- Bookings con dynamic pricing
SELECT
  COUNT(*) FILTER (WHERE has_dynamic_pricing) * 100.0 / COUNT(*) as dynamic_booking_pct
FROM bookings
WHERE created_at > NOW() - INTERVAL '30 days';

-- Average multiplier
SELECT
  AVG((dynamic_price_snapshot->'breakdown'->>'totalMultiplier')::NUMERIC) as avg_multiplier
FROM bookings
WHERE has_dynamic_pricing = true
  AND created_at > NOW() - INTERVAL '30 days';
```

---

## 🔮 Roadmap Futuro

### Fase 5: Testing & Launch (Pendiente)
- [ ] Feature flags en Supabase
- [ ] Tests E2E con Playwright
- [ ] Tests unitarios con Jest
- [ ] Beta launch con 10% de autos
- [ ] A/B testing

### Mejoras Futuras
- [ ] Machine Learning para predecir demanda
- [ ] Notificaciones de precio bajo
- [ ] "Price alerts" para usuarios
- [ ] Integración con APIs de clima/eventos
- [ ] Dashboard de analytics para locadores

---

## 📞 Contacto y Soporte

**Documentación**: `/docs/DYNAMIC_PRICING_*.md`

**Problemas conocidos**: Ver Issues en GitHub con label `dynamic-pricing`

**Preguntas**: Crear issue con template "Question"

---

**Última actualización**: 2025-11-11
**Versión**: 1.0
**Estado**: Beta (75% completo)


---
# Source: DYNAMIC_PRICING_UI_INTEGRATION.md

# Dynamic Pricing - Guía de Integración UI

## Componentes Creados

### 1. `DynamicPriceLockPanelComponent`
**Ubicación**: `apps/web/src/app/features/bookings/booking-detail-payment/components/dynamic-price-lock-panel.component.ts`

**Uso**: Panel que muestra el estado del price lock durante el checkout

**Props**:
```typescript
@Input() priceLock: PriceLock | null = null;
@Input() comparison: PriceComparison | null = null;
@Input() surgeInfo: SurgePricingInfo | null = null;

@Output() refresh = new EventEmitter<void>();
@Output() viewBreakdown = new EventEmitter<void>();
```

**Ejemplo de integración en `booking-detail-payment.page.html`**:
```html
<!-- Después del BookingSummaryCard -->
@if (priceLock()) {
  <app-dynamic-price-lock-panel
    [priceLock]="priceLock()"
    [comparison]="priceComparison()"
    [surgeInfo]="surgeInfo()"
    (refresh)="onRefreshPriceLock()"
    (viewBreakdown)="onViewPriceBreakdown()"
  />
}
```

**Lógica requerida en el componente TypeScript**:
```typescript
import { DynamicPricingService } from '../../../core/services/dynamic-pricing.service';
import type { PriceLock } from '../../../core/models/dynamic-pricing.model';

// Signals
readonly priceLock = signal<PriceLock | null>(null);
readonly priceComparison = computed(() => {
  const lock = this.priceLock();
  const car = this.bookingInput()?.car;
  if (!lock || !car) return null;

  return this.dynamicPricingService.getPriceComparison(
    car.price_per_day,
    lock
  );
});
readonly surgeInfo = computed(async () => {
  return this.dynamicPricingService.getSurgePricingInfo(this.priceLock());
});

// Methods
async onRefreshPriceLock(): Promise<void> {
  const lock = this.priceLock();
  if (!lock) return;

  const result = await this.dynamicPricingService.refreshPriceLock(lock);
  if (result.ok && result.priceLock) {
    this.priceLock.set(result.priceLock);
  }
}

onViewPriceBreakdown(): void {
  this.showBreakdownModal.set(true);
}
```

---

### 2. `DynamicPriceBreakdownModalComponent`
**Ubicación**: `apps/web/src/app/features/bookings/booking-detail-payment/components/dynamic-price-breakdown-modal.component.ts`

**Uso**: Modal que muestra el desglose completo del cálculo de precio dinámico

**Props**:
```typescript
@Input() isOpen = false;
@Input() snapshot: DynamicPriceSnapshot | null = null;

@Output() close = new EventEmitter<void>();
```

**Ejemplo de integración**:
```html
<app-dynamic-price-breakdown-modal
  [isOpen]="showBreakdownModal()"
  [snapshot]="priceLock()?.priceSnapshot ?? null"
  (close)="showBreakdownModal.set(false)"
/>
```

---

### 3. `DynamicPricingBadgeComponent`
**Ubicación**: `apps/web/src/app/shared/components/dynamic-pricing-badge/dynamic-pricing-badge.component.ts`

**Uso**: Badge simple para indicar que un auto usa pricing dinámico

**Props**:
```typescript
@Input() surgeActive = false;
@Input() surgeFactor?: number;
```

**Ejemplo de integración en `map-booking-panel.component.html`**:
```html
<div class="car-info">
  <h3>{{ car.title }}</h3>

  <!-- Mostrar badge si el auto usa dynamic pricing -->
  @if (car.uses_dynamic_pricing) {
    <app-dynamic-pricing-badge
      [surgeActive]="currentSurgeActive"
      [surgeFactor]="currentSurgeFactor"
    />
  }

  <div class="price">
    {{ car.pricePerDay | money: car.currency }}
  </div>
</div>
```

**Ejemplo en resultados de búsqueda**:
```html
@for (car of cars(); track car.id) {
  <div class="car-card">
    <img [src]="car.photoUrl" [alt]="car.title" />

    <div class="car-details">
      <h4>{{ car.title }}</h4>

      @if (car.uses_dynamic_pricing) {
        <app-dynamic-pricing-badge />
      }
    </div>
  </div>
}
```

---

## Flujo Completo de Integración

### Paso 1: Importar componentes en la página

```typescript
import { DynamicPriceLockPanelComponent } from './components/dynamic-price-lock-panel.component';
import { DynamicPriceBreakdownModalComponent } from './components/dynamic-price-breakdown-modal.component';
import { DynamicPricingBadgeComponent } from '../../../shared/components/dynamic-pricing-badge/dynamic-pricing-badge.component';

@Component({
  imports: [
    // ... otros imports
    DynamicPriceLockPanelComponent,
    DynamicPriceBreakdownModalComponent,
    DynamicPricingBadgeComponent,
  ],
})
```

### Paso 2: Inyectar servicio

```typescript
import { DynamicPricingService } from '../../../core/services/dynamic-pricing.service';

export class BookingDetailPaymentPage {
  private dynamicPricingService = inject(DynamicPricingService);
}
```

### Paso 3: Bloquear precio cuando el usuario inicia checkout

```typescript
async ngOnInit(): Promise<void> {
  const input = this.bookingInput();
  if (!input || !input.car.uses_dynamic_pricing) {
    return; // Usar precio fijo normal
  }

  // Bloquear precio dinámico
  const result = await this.dynamicPricingService.lockPrice(
    input.carId,
    this.userId,
    input.startDate,
    calculateHours(input.startDate, input.endDate)
  );

  if (result.ok && result.priceLock) {
    this.priceLock.set(result.priceLock);

    // Usar el precio bloqueado en los cálculos
    this.updatePriceBreakdown(result.priceLock.totalPrice);
  } else {
    // Fallback a precio fijo
    this.updatePriceBreakdown(input.car.price_per_day);
  }
}
```

### Paso 4: Pasar price lock al crear booking

```typescript
async createBooking(): Promise<void> {
  const lock = this.priceLock();

  const result = await this.bookingsService.createBookingAtomic({
    carId: this.car.carId,
    startDate: this.startDate,
    endDate: this.endDate,
    totalAmount: this.totalPrice,
    currency: 'USD',
    paymentMode: 'card',

    // ✅ Dynamic pricing parameters
    useDynamicPricing: lock !== null,
    priceLockToken: lock?.lockToken,
    dynamicPriceSnapshot: lock?.priceSnapshot,

    riskSnapshot: {
      // ... risk data
    },
  });

  if (result.success) {
    this.router.navigate(['/bookings', result.bookingId]);
  }
}
```

---

## Checklist de Integración

### Booking Detail Payment Page
- [ ] Importar componentes `DynamicPriceLockPanel` y `DynamicPriceBreakdownModal`
- [ ] Inyectar `DynamicPricingService`
- [ ] Crear signals: `priceLock`, `showBreakdownModal`
- [ ] Bloquear precio en `ngOnInit` si `car.uses_dynamic_pricing = true`
- [ ] Agregar panel en template después de `BookingSummaryCard`
- [ ] Agregar modal al final del template
- [ ] Implementar `onRefreshPriceLock()` y `onViewPriceBreakdown()`
- [ ] Pasar `priceLock` a `createBookingAtomic()`

### Map Booking Panel
- [ ] Importar `DynamicPricingBadgeComponent`
- [ ] Mostrar badge si `car.uses_dynamic_pricing = true`
- [ ] Obtener info de surge actual (opcional)

### Marketplace/Search Results
- [ ] Importar `DynamicPricingBadgeComponent`
- [ ] Mostrar badge en cada car card si aplica

---

## Próximos Pasos

1. **Sincronizar tipos TypeScript**: `npm run sync:types`
2. **Compilar**: `npm run build`
3. **Probar localmente**:
   - Publicar auto con "Precio dinámico" activado
   - Intentar reservar ese auto
   - Verificar que aparece el panel de price lock
4. **Verificar cron job**: Revisar `pricing_cron_health` en 15 minutos

---

## Troubleshooting

### Error: "Property 'uses_dynamic_pricing' does not exist on type 'Car'"
**Solución**: Ejecutar `npm run sync:types` para sincronizar tipos desde Supabase

### Error: "lock_price_for_booking is not a function"
**Solución**: Verificar que la migración se aplicó correctamente:
```sql
SELECT proname FROM pg_proc WHERE proname = 'lock_price_for_booking';
```

### El countdown no se actualiza
**Solución**: Verificar que el componente `DynamicPriceLockPanel` está usando `effect()` correctamente para iniciar el interval

### Price lock expira muy rápido
**Solución**: El lock dura 15 minutos. Si necesitas más tiempo, modificar en `lock_price_rpc.sql`:
```sql
v_lock_expires := NOW() + INTERVAL '30 minutes'; -- Cambiar de 15 a 30
```


---
# Source: FLUJO_CONTRATACION_COMPLETO.md

# Flujo Completo de Contratación - AutoRenta

**Versión**: 1.0.0
**Fecha**: 2025-11-16
**Autor**: Sistema AutoRenta

---

## 📋 Índice

1. [Visión General](#visión-general)
2. [Estados del Booking](#estados-del-booking)
3. [Flujo Completo Paso a Paso](#flujo-completo-paso-a-paso)
4. [Check-In y Check-Out](#check-in-y-check-out)
5. [Sistema de Reseñas](#sistema-de-reseñas)
6. [Cálculo de Ganancias](#cálculo-de-ganancias)
7. [Estadísticas y Analytics](#estadísticas-y-analytics)
8. [Seguros y Documentos](#seguros-y-documentos)
9. [Diagramas de Flujo](#diagramas-de-flujo)

---

## 🎯 Visión General

El flujo de contratación de AutoRenta es un proceso completo que abarca desde la solicitud de reserva hasta la finalización con reseñas, incluyendo:

- ✅ **Gestión de estados** del booking (pending → confirmed → in_progress → completed)
- ✅ **Check-in y Check-out** con inspecciones detalladas (FGO - Fine-Grained Observations)
- ✅ **Sistema de reseñas** bidireccional (locador ↔ locatario)
- ✅ **Cálculo automático** de ganancias para el locador (Split dinámico)
- ✅ **Estadísticas en tiempo real** para ambos roles
- ✅ **Seguros P2P** y gestión de documentos

---

## 🔄 Estados del Booking

### Estados Principales

```typescript
type BookingStatus =
  | 'pending'      // Esperando aprobación del dueño
  | 'confirmed'    // Confirmada, pago aprobado
  | 'in_progress'  // En curso (auto entregado)
  | 'completed'    // Completada exitosamente
  | 'cancelled'    // Cancelada
  | 'expired'      // Expirada (no pagada a tiempo)
```

### Transiciones de Estado

```
┌─────────┐
│ pending │ ← Solicitud inicial
└────┬────┘
     │
     ├─→ [Owner Rejects] → cancelled
     │
     ├─→ [Owner Approves + Payment] → confirmed
     │
     └─→ [Payment Timeout] → expired

┌───────────┐
│ confirmed │ ← Pago completado
└─────┬─────┘
      │
      ├─→ [Owner Check-In] → in_progress
      │
      └─→ [Cancellation] → cancelled

┌──────────────┐
│ in_progress  │ ← Alquiler activo
└──────┬───────┘
       │
       ├─→ [Renter Check-Out] → completed
       │
       └─→ [Early Return] → completed

┌───────────┐
│ completed │ ← Finalizado
└─────┬─────┘
      │
      └─→ [Reviews Period (14 días)] → Reviews disponibles
```

---

## 📝 Flujo Completo Paso a Paso

### Fase 1: Solicitud y Confirmación

#### 1.1. Locatario Solicita Booking

**Acción**: Locatario selecciona auto y fechas en marketplace

**Proceso**:
1. Validación de disponibilidad (excluye overlaps con `pending`, `confirmed`, `in_progress`)
2. Cálculo de pricing (base + seguro + delivery si aplica)
3. Creación de booking con `status = 'pending'`
4. Notificación al locador

**Código**:
```typescript
// RPC: request_booking()
const booking = await supabase.rpc('request_booking', {
  p_car_id: carId,
  p_start: startDate,
  p_end: endDate
});
```

#### 1.2. Locador Aprueba/Rechaza

**Acción**: Locador revisa solicitud en dashboard

**Proceso**:
- **Aprobar**: Booking pasa a `confirmed` (requiere pago)
- **Rechazar**: Booking pasa a `cancelled`

**UI**: `/bookings/owner` → Lista de bookings pendientes

#### 1.3. Pago y Confirmación

**Acción**: Locatario completa pago

**Proceso**:
1. Bloqueo de fondos en wallet (rental + deposit)
2. Booking pasa a `status = 'confirmed'`
3. Notificaciones a ambas partes
4. Preparación para check-in

**Componente**: `booking-detail-payment.page.ts`

---

### Fase 2: Check-In (Inicio del Alquiler)

#### 2.1. Owner Check-In (Pre-Entrega)

**Acción**: Locador realiza inspección antes de entregar

**Proceso**:
1. **Inspección Física**:
   - Odómetro inicial
   - Nivel de combustible
   - Daños existentes (fotos)
   - Firma digital del locador

2. **Creación de FGO** (Fine-Grained Observation):
   ```typescript
   {
     booking_id: string,
     event_type: 'check_in_owner',
     odometer_reading: number,
     fuel_level: number,
     damage_notes: string,
     photo_urls: string[],
     signature_data_url: string
   }
   ```

3. **Cambio de Estado**: `confirmed` → `in_progress`

**Componente**: `owner-check-in.page.ts`
**Ruta**: `/bookings/owner/check-in/:id`

#### 2.2. Renter Check-In (Recepción)

**Acción**: Locatario confirma recepción del auto

**Proceso**:
1. **Verificación**:
   - Revisa inspección del locador
   - Confirma estado del vehículo
   - Firma digital del locatario

2. **Creación de FGO**:
   ```typescript
   {
     booking_id: string,
     event_type: 'check_in_renter',
     odometer_reading: number,
     fuel_level: number,
     signature_data_url: string
   }
   ```

3. **Tracking de Ubicación** (opcional):
   - Compartir ubicación en tiempo real
   - Guardar punto de entrega (GPS)

**Componente**: `check-in.page.ts`
**Ruta**: `/bookings/check-in/:id`

---

### Fase 3: Alquiler en Progreso

#### 3.1. Estado `in_progress`

**Características**:
- Booking activo
- Auto en poder del locatario
- Tracking de ubicación disponible
- Soporte 24/7 activo

**Monitoreo**:
- Dashboard del locador muestra ubicación (si compartida)
- Notificaciones de eventos importantes
- Sistema de alertas para incidencias

---

### Fase 4: Check-Out (Finalización)

#### 4.1. Renter Check-Out (Devolución)

**Acción**: Locatario devuelve el auto

**Proceso**:
1. **Inspección Final**:
   - Odómetro final
   - Nivel de combustible final
   - Fotos 360° del vehículo
   - Detección de daños nuevos (IA futura)

2. **Cálculo de Diferencias**:
   ```typescript
   const fuelDifference = checkOut.fuelLevel - checkIn.fuelLevel;
   const kmDifference = checkOut.odometer - checkIn.odometer;
   ```

3. **Creación de FGO**:
   ```typescript
   {
     booking_id: string,
     event_type: 'check_out_renter',
     odometer_reading: number,
     fuel_level: number,
     photos_360: string[],
     damages_detected: Damage[],
     signature_data_url: string
   }
   ```

**Componente**: `check-out.page.ts`
**Ruta**: `/bookings/check-out/:id`

#### 4.2. Owner Check-Out (Confirmación)

**Acción**: Locador confirma recepción y estado

**Proceso**:
1. **Revisión de Inspección**:
   - Compara check-in vs check-out
   - Valida daños reportados
   - Confirma estado del vehículo

2. **Reporte de Daños** (si aplica):
   ```typescript
   {
     owner_reported_damages: boolean,
     owner_damage_amount: number,
     owner_damage_description: string
   }
   ```

3. **Confirmación Bilateral**:
   - Locador confirma entrega: `owner_confirmed_delivery = true`
   - Locatario confirma pago: `renter_confirmed_payment = true`
   - Liberación de fondos: `funds_released_at`

**Componente**: `owner-check-out.page.ts` (si existe)

#### 4.3. Finalización del Booking

**Proceso**:
1. **Cambio de Estado**: `in_progress` → `completed`
2. **Split Payment**:
   - Monto neto al locador (owner_payment_amount)
   - Fee variable a la plataforma (platform_fee)
3. **Liberación de Depósito** (si no hay daños)
4. **Notificaciones** a ambas partes

**Código**:
```typescript
// Edge Function: complete-booking
await supabase.functions.invoke('complete-booking', {
  body: { booking_id: bookingId }
});
```

---

### Fase 5: Reseñas (Post-Completación)

#### 5.1. Período de Reseñas

**Ventana**: 14 días después de `completed`

**Proceso**:
1. **Notificación Automática** (día 1 post-completación):
   - Email a locador y locatario
   - Link directo a formulario de reseña

2. **Sistema Bidireccional**:
   - Locatario califica al locador: `renter_to_owner`
   - Locador califica al locatario: `owner_to_renter`

3. **Calificaciones por Categoría** (1-5 estrellas):
   ```typescript
   {
     rating_cleanliness: number,    // Limpieza
     rating_communication: number,  // Comunicación
     rating_accuracy: number,       // Precisión del anuncio
     rating_location: number,       // Ubicación
     rating_checkin: number,        // Proceso de check-in
     rating_value: number           // Relación precio/calidad
   }
   ```

4. **Publicación Automática**:
   - Se publican cuando ambas partes completan
   - Si solo una parte califica, queda `pending` hasta que la otra califique
   - Después de 14 días, se publican las que estén completas

**Componente**: `reviews.service.ts`
**Ruta**: `/bookings/:id/review`

#### 5.2. Validaciones de Reseñas

**Reglas**:
- ✅ Booking debe estar `completed`
- ✅ Reviewer debe ser parte del booking (renter o owner)
- ✅ No puede haber duplicados (una reseña por booking por reviewer)
- ✅ Período máximo: 14 días después de `completed`

**Código**:
```typescript
// RPC: create_review()
await supabase.rpc('create_review', {
  p_booking_id: bookingId,
  p_reviewer_id: userId,
  p_review_type: 'renter_to_owner',
  p_rating_cleanliness: 5,
  // ... otros ratings
  p_comment_public: 'Excelente experiencia'
});
```

---

## 💰 Cálculo de Ganancias

### Fórmula Base

```typescript
// Split Payment: Dinámico según configuración
const ownerEarnings = booking.total_amount - booking.platform_fee;
const platformFee = booking.platform_fee;
```

### Cálculo Mensual

**Servicio**: `car-depreciation-notifications.service.ts`

```typescript
async calculateMonthlyEarnings(carId: string, month: string): Promise<number> {
  const bookings = await supabase
    .from('bookings')
    .select('total_amount, platform_fee, status')
    .eq('car_id', carId)
    .in('status', ['confirmed', 'in_progress', 'completed'])
    .gte('start_date', `${month}-01`)
    .lte('start_date', `${month}-31`);

  const totalEarnings = bookings.reduce((sum, booking) => {
    // Solo bookings completados o en progreso cuentan
    if (booking.status === 'completed' || booking.status === 'in_progress') {
      return sum + (booking.total_amount - booking.platform_fee); // Neto para owner
    }
    return sum;
  }, 0);

  return totalEarnings;
}
```

### Dashboard de Ganancias

**Componente**: `owner-dashboard.page.ts`

**Métricas**:
- **Este mes**: `earnings.thisMonth`
- **Mes anterior**: `earnings.lastMonth`
- **Total histórico**: `earnings.total`
- **Crecimiento**: `((thisMonth - lastMonth) / lastMonth) * 100`

**Edge Function**: `dashboard-stats`

```typescript
interface DashboardStats {
  earnings: {
    thisMonth: number;
    lastMonth: number;
    total: number;
  };
  // ... otros stats
}
```

### Depreciación vs Ganancias

**Notificación Mensual** (Cron Job):
- Calcula depreciación mensual del auto
- Compara con ganancias del mes
- Notifica al locador si `ganancias < depreciación`

**Código**: `supabase/migrations/20251113_create_car_depreciation_notifications_cron.sql`

---

## 📊 Estadísticas y Analytics

### Dashboard del Locador

**Componente**: `owner-dashboard.page.ts`

**Métricas Principales**:

1. **Autos**:
   - Total de autos
   - Activos (`status = 'active'`)
   - Pendientes (`status = 'pending'`)
   - Suspendidos (`status = 'suspended'`)

2. **Bookings**:
   - Próximos (`status = 'confirmed'` y `start_at > now()`)
   - Activos (`status = 'in_progress'`)
   - Completados (`status = 'completed'`)
   - Total histórico

3. **Ganancias**:
   - Este mes
   - Mes anterior
   - Total histórico
   - % de crecimiento

4. **Wallet**:
   - Balance disponible
   - Balance bloqueado (en bookings activos)
   - Balance retirable
   - Total

### Dashboard del Locatario

**Componente**: `personalized-dashboard.component.ts`

**Métricas**:
- Reservas activas
- Historial de reservas
- Balance de wallet
- Notificaciones no leídas

### Edge Function: Dashboard Stats

**Ruta**: `supabase/functions/dashboard-stats/index.ts`

**Endpoint**: `POST /dashboard-stats`

**Respuesta**:
```typescript
{
  wallet: {
    availableBalance: number;
    lockedBalance: number;
    totalBalance: number;
    withdrawableBalance: number;
  };
  cars: {
    total: number;
    active: number;
    pending: number;
    suspended: number;
  };
  bookings: {
    upcoming: number;
    active: number;
    completed: number;
    total: number;
  };
  earnings: {
    thisMonth: number;
    lastMonth: number;
    total: number;
  };
  timestamp: string;
}
```

---

## 🛡️ Seguros y Documentos

### Sistema de Seguros P2P

**Tabla**: `booking_insurance_coverage`

**Proceso**:
1. **Selección de Cobertura** (durante booking):
   - Póliza flotante de plataforma (default)
   - Seguro propio del locador (si tiene)

2. **Cálculo de Prima**:
   ```typescript
   const dailyPremium = policy.daily_premium;
   const rentalDays = calculateDays(startDate, endDate);
   const totalPremium = dailyPremium * rentalDays;
   ```

3. **Franquicia (Deductible)**:
   - Calculada según valor del auto
   - Retenida como `security_deposit_amount`
   - Liberada si no hay siniestros

**Campos en Booking**:
```typescript
{
  insurance_coverage_id: string;
  insurance_premium_total: number;  // En centavos
  security_deposit_amount: number; // Franquicia
  deposit_held: boolean;
  deposit_released_at: string | null;
  has_active_claim: boolean;
}
```

**Componente**: `insurance.model.ts`

### Documentos del Vehículo

**Tabla**: `vehicle_documents`

**Tipos de Documentos**:
```typescript
type VehicleDocumentKind =
  | 'registration'          // Cédula verde/título
  | 'insurance'             // Póliza de seguro
  | 'technical_inspection'  // Revisión técnica
  | 'circulation_permit'    // Permiso de circulación
  | 'ownership_proof';       // Comprobante de titularidad
```

**Estados**:
- `pending`: Pendiente de verificación
- `verified`: Verificado por admin
- `rejected`: Rechazado (requiere corrección)

**Validación**:
- Cada auto debe tener al menos `registration` y `insurance` verificados para estar `active`
- Documentos con `expiry_date` generan alertas antes de vencer

**Componente**: `MissingDocumentsWidgetComponent`

### Verificación de Conductor

**Tabla**: `driver_vehicle_verification`

**Proceso**:
1. Locatario sube documentos (licencia, DNI)
2. Verificación automática (IA) + manual (admin)
3. Aprobación requerida antes de `confirmed`

---

## 🔀 Diagramas de Flujo

### Flujo Completo Simplificado

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO DE CONTRATACIÓN                     │
└─────────────────────────────────────────────────────────────┘

1. SOLICITUD
   Locatario → Selecciona auto → Solicita booking
   └─→ status: 'pending'

2. APROBACIÓN
   Locador → Aprueba/Rechaza
   ├─→ Rechaza: status: 'cancelled'
   └─→ Aprueba: Espera pago

3. PAGO
   Locatario → Completa pago (Wallet/Tarjeta)
   └─→ status: 'confirmed'
   └─→ Fondos bloqueados (rental + deposit)

4. CHECK-IN
   ├─→ Owner Check-In: Inspección pre-entrega
   │   └─→ FGO creado
   │
   └─→ Renter Check-In: Confirmación recepción
       └─→ status: 'in_progress'

5. ALQUILER ACTIVO
   └─→ Tracking ubicación (opcional)
   └─→ Soporte 24/7

6. CHECK-OUT
   ├─→ Renter Check-Out: Inspección devolución
   │   └─→ FGO creado
   │
   └─→ Owner Check-Out: Confirmación recepción
       └─→ Validación de daños
       └─→ Confirmación bilateral

7. FINALIZACIÓN
   └─→ status: 'completed'
   └─→ Split payment (Neto owner, Fee plataforma)
   └─→ Liberación de depósito (si no hay daños)

8. RESEÑAS (14 días)
   ├─→ Locatario califica locador
   └─→ Locador califica locatario
   └─→ Publicación automática cuando ambas completan
```

### Estados y Transiciones Detalladas

```
                    ┌─────────┐
                    │ pending │
                    └────┬────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   [Rechaza]      [Aprueba]        [Timeout]
        │                │                │
        ▼                ▼                ▼
┌─────────────┐  ┌───────────┐   ┌──────────┐
│ cancelled   │  │ confirmed │   │ expired  │
└─────────────┘  └─────┬─────┘   └──────────┘
                       │
                  [Owner Check-In]
                       │
                       ▼
                ┌──────────────┐
                │ in_progress  │
                └──────┬───────┘
                       │
                  [Check-Out]
                       │
                       ▼
                ┌───────────┐
                │ completed │
                └─────┬─────┘
                      │
                 [Reviews]
                      │
                      ▼
              ┌──────────────┐
              │ Reviews Live │
              └──────────────┘
```

---

## 🔧 Implementación Técnica

### Servicios Principales

1. **BookingsService** (`bookings.service.ts`):
   - Gestión de bookings
   - Transiciones de estado
   - Queries optimizadas

2. **FGOService** (`fgo.service.ts`):
   - Creación de inspecciones
   - Gestión de check-in/check-out
   - Comparación de inspecciones

3. **ReviewsService** (`reviews.service.ts`):
   - Creación de reseñas
   - Validaciones
   - Publicación automática

4. **DashboardService** (`dashboard.service.ts`):
   - Estadísticas agregadas
   - Cálculo de ganancias
   - Métricas en tiempo real

5. **InsuranceService** (futuro):
   - Gestión de seguros
   - Cálculo de primas
   - Gestión de siniestros

### Edge Functions

1. **complete-booking**:
   - Finalización de booking
   - Split payment
   - Liberación de fondos

2. **dashboard-stats**:
   - Estadísticas agregadas
   - Cálculo de métricas

3. **create-preference** (MercadoPago):
   - Creación de preferencia de pago

4. **mercadopago-webhook**:
   - Procesamiento de webhooks
   - Actualización de pagos

### RPC Functions (PostgreSQL)

1. **request_booking()**:
   - Validación de disponibilidad
   - Creación de booking

2. **create_review()**:
   - Validaciones
   - Creación de reseña

3. **calculate_payment_split()**:
   - Cálculo de distribución (modelo comodato: fee variable, reward pool, FGO)

4. **update_user_stats_v2_for_booking()**:
   - Actualización de estadísticas post-reseña

---

## 📝 Notas Finales

### Mejoras Futuras

1. **IA de Detección de Daños**:
   - Análisis automático de fotos 360°
   - Comparación check-in vs check-out

2. **Sistema de Disputas**:
   - Gestión de conflictos
   - Arbitraje automático

3. **Bonificación por Calificaciones**:
   - Incentivos para buenas reseñas
   - Programa de fidelización

4. **Analytics Avanzados**:
   - Predicción de demanda
   - Optimización de precios
   - Recomendaciones personalizadas

### Consideraciones de Seguridad

- ✅ RLS policies en todas las tablas
- ✅ Validación de permisos en cada transición
- ✅ Firma digital en inspecciones
- ✅ Tracking de ubicación opcional (consentimiento)
- ✅ Encriptación de datos sensibles

---

**Última actualización**: 2025-11-16
**Mantenido por**: Equipo AutoRenta

















---
# Source: GOOGLE_CALENDAR_INTEGRATION.md

# Google Calendar Integration - AutoRenta

Integración completa de Google Calendar API para sincronizar bookings automáticamente.

## 🎯 Características

- ✅ **OAuth 2.0 Flow** - Usuarios conectan sus calendarios de forma segura
- ✅ **Calendarios por Auto** - Cada auto tiene su propio calendario secundario
- ✅ **Sync Bidireccional** - Bookings se sincronizan automáticamente
- ✅ **Locadores y Locatarios** - Ambos pueden ver sus bookings en Google Calendar
- ✅ **Información Completa** - Eventos incluyen precio, links, y recordatorios
- ✅ **Colores por Estado** - pending=amarillo, approved=verde, active=azul, completed=gris, cancelled=rojo

## 📋 Requisitos Previos

1. **Google Cloud Project** con Calendar API habilitada
2. **OAuth 2.0 Credentials** (Client ID + Client Secret)
3. **Supabase Project** con Edge Functions habilitadas

## 🚀 Setup - Paso a Paso

### Paso 1: Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita **Google Calendar API**:
   ```
   APIs & Services → Library → Search "Google Calendar API" → Enable
   ```

4. Crea credenciales OAuth 2.0:
   ```
   APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
   ```

5. Configura OAuth consent screen:
   ```
   Type: External (para testing)
   App name: AutoRenta
   User support email: [tu email]
   Developer contact: [tu email]

   Scopes:
   - https://www.googleapis.com/auth/calendar
   - https://www.googleapis.com/auth/calendar.events
   ```

6. Configura Authorized redirect URIs:
   ```
   Development:
   https://[YOUR-SUPABASE-PROJECT].supabase.co/functions/v1/google-calendar-oauth?action=handle-callback

   Production:
   https://[YOUR-PRODUCTION-SUPABASE].supabase.co/functions/v1/google-calendar-oauth?action=handle-callback
   ```

7. Copia tus credenciales:
   - **Client ID**: `xxxxxxx.apps.googleusercontent.com`
   - **Client Secret**: `xxxxxxx`

### Paso 2: Supabase Configuration

1. **Configurar secrets en Supabase:**
   ```bash
   # Via Supabase Dashboard
   Project Settings → Edge Functions → Secrets

   GOOGLE_OAUTH_CLIENT_ID=[tu-client-id]
   GOOGLE_OAUTH_CLIENT_SECRET=[tu-client-secret]
   GOOGLE_OAUTH_REDIRECT_URI=https://[project].supabase.co/functions/v1/google-calendar-oauth?action=handle-callback
   FRONTEND_URL=http://localhost:4200  # Development
   ```

2. **Deploy migrations:**
   ```bash
   # Aplicar migration de database
   supabase db push

   # O manualmente:
   psql -h [supabase-host] -U postgres -d postgres < supabase/migrations/20251112_add_google_calendar_integration.sql
   ```

3. **Deploy Edge Functions:**
   ```bash
   # Deploy OAuth handler
   supabase functions deploy google-calendar-oauth

   # Deploy sync service
   supabase functions deploy sync-booking-to-calendar
   ```

### Paso 3: Angular Environment Variables

Agrega a `apps/web/src/environments/environment.ts` y `environment.development.ts`:

```typescript
export const environment = {
  // ... existing config ...

  // Google Calendar Integration
  googleCalendarEnabled: true,

  // Supabase URLs para Edge Functions
  supabaseUrl: 'https://[project].supabase.co',
  supabaseAnonKey: '[anon-key]',
};
```

### Paso 4: Verificar Instalación

```bash
# Test database tables
psql -h [host] -U postgres -d postgres -c "SELECT * FROM google_calendar_tokens LIMIT 1;"

# Test Edge Functions
curl -X GET "https://[project].supabase.co/functions/v1/google-calendar-oauth?action=status" \
  -H "Authorization: Bearer [user-token]"
```

## 🧪 Testing - Flujo Completo

### 1. Conectar Calendar (Como Locador)

```typescript
// En Profile Page
this.googleCalendarService.connectGoogleCalendar().subscribe({
  next: () => console.log('Calendar connected!'),
  error: (err) => console.error('Connection failed:', err)
});
```

**Flujo:**
1. Usuario hace click en "Conectar Google Calendar"
2. Se abre popup de Google OAuth
3. Usuario autoriza acceso a Calendar
4. Popup se cierra automáticamente
5. Token se guarda en `google_calendar_tokens`

### 2. Publicar Auto y Crear Calendar

Cuando un locador conecta su Google Calendar y publica un auto:
1. Edge Function crea un calendario secundario: "AutoRenta - [Marca] [Modelo]"
2. Calendar ID se guarda en `car_google_calendars`
3. Locador puede ver este calendario en Google Calendar

### 3. Aprobar Booking y Sync

Cuando un locador aprueba un booking:

```typescript
// bookings.service.ts
await this.approveBooking(bookingId);

// Sync to Google Calendar
this.googleCalendarService.syncBookingToCalendar(bookingId, 'create').subscribe({
  next: (result) => console.log('Synced:', result),
  error: (err) => console.error('Sync failed:', err)
});
```

**Resultado:**
- Evento creado en el calendario del auto (locador)
- Evento creado en calendario principal (locatario)
- Ambos reciben recordatorios 24h y 1h antes

### 4. Ver en Google Calendar

El locador verá:
```
Calendar: "AutoRenta - Toyota Corolla (2020)"
Event: "🚗 Booking: Toyota Corolla"
  - Fecha inicio: 2025-11-15 10:00
  - Fecha fin: 2025-11-20 10:00
  - Color: Verde (approved)
  - Descripción:
    📅 Booking AutoRenta
    🚗 Auto: Toyota Corolla (2020)
    📍 Booking ID: abc-123
    💰 Precio Total: $150,000
    📊 Estado: approved
    🔗 Ver detalles: [link]
```

El locatario verá en su calendario principal:
```
Event: "🚗 Mi Booking: Toyota Corolla"
  [misma información]
```

## 🔄 Estados y Colores

| Estado Booking | Color Google Calendar | Descripción |
|----------------|----------------------|-------------|
| `pending` | 🟡 Yellow (5) | Esperando aprobación del locador |
| `approved` | 🟢 Green (10) | Aprobado, pago pendiente |
| `active` | 🔵 Blue (9) | En curso, auto rentado |
| `completed` | ⚫ Gray (8) | Finalizado exitosamente |
| `cancelled` | 🔴 Red (11) | Cancelado |

## 📊 Database Schema

### `google_calendar_tokens`
```sql
user_id uuid PRIMARY KEY
access_token text NOT NULL
refresh_token text NOT NULL
expires_at timestamptz NOT NULL
primary_calendar_id text
sync_enabled boolean DEFAULT true
```

### `car_google_calendars`
```sql
car_id uuid PRIMARY KEY
google_calendar_id text UNIQUE NOT NULL
calendar_name text NOT NULL
owner_id uuid REFERENCES auth.users(id)
sync_enabled boolean DEFAULT true
```

### `bookings` (updated)
```sql
google_calendar_event_id text  -- Event ID en Google Calendar
calendar_synced_at timestamptz
calendar_sync_enabled boolean DEFAULT true
```

### `calendar_sync_log`
```sql
booking_id uuid
operation text  -- 'create', 'update', 'delete'
status text  -- 'success', 'failed'
google_calendar_event_id text
error_message text
```

## 🎨 UI Components

### Profile Page - Calendar Connection

```html
<!-- apps/web/src/app/features/profile/profile.page.html -->

<div class="calendar-integration-section">
  <h3>📅 Sincronización con Google Calendar</h3>

  @if (calendarConnected()) {
    <div class="connected-state">
      <span class="status-badge success">✓ Conectado</span>
      <p>Tus bookings se sincronizan automáticamente</p>
      <button (click)="disconnectCalendar()">Desconectar</button>
    </div>
  } @else {
    <div class="disconnected-state">
      <p>Conecta tu Google Calendar para ver tus bookings automáticamente</p>
      <button (click)="connectCalendar()" class="btn-primary">
        Conectar Google Calendar
      </button>
    </div>
  }
</div>
```

### Booking Detail - Sync Status

```html
<!-- Show sync status in booking detail -->
@if (booking().google_calendar_event_id) {
  <div class="calendar-sync-badge">
    <span class="icon">📅</span>
    <span>Sincronizado con Google Calendar</span>
    <a [href]="getCalendarEventUrl()" target="_blank">Ver en Calendar</a>
  </div>
}
```

## 🐛 Troubleshooting

### Error: "Missing authorization"
- Verificar que el usuario esté autenticado en Supabase
- Revisar que el token JWT no haya expirado

### Error: "Token exchange failed"
- Verificar `GOOGLE_OAUTH_CLIENT_ID` y `GOOGLE_OAUTH_CLIENT_SECRET`
- Confirmar que redirect URI coincide exactamente con Google Cloud Console

### Error: "Failed to create car calendar"
- Verificar que el access_token no haya expirado
- Llamar `refreshToken()` si es necesario
- Revisar scopes de OAuth (debe incluir `calendar` y `calendar.events`)

### Calendario no se sincroniza
1. Verificar conexión: `SELECT * FROM google_calendar_tokens WHERE user_id = '[uuid]';`
2. Revisar logs: `SELECT * FROM calendar_sync_log WHERE status = 'failed' ORDER BY created_at DESC;`
3. Verificar que `booking.calendar_sync_enabled = true`

### Eventos duplicados
- Cada booking debe tener un `google_calendar_event_id` único
- Si hay duplicados, eliminar y recrear con operation='delete' + operation='create'

## 🔐 Security Considerations

1. **Tokens Storage**: Access tokens y refresh tokens se guardan encriptados en Supabase
2. **RLS Policies**: Users solo pueden ver sus propios tokens
3. **Service Role Key**: Solo las Edge Functions tienen acceso al service role key
4. **CORS**: Edge Functions validan origin del request
5. **Scopes Mínimos**: Solo solicitamos `calendar` y `calendar.events` (no `calendar.readonly`)

## 📚 API Reference

### GoogleCalendarService

```typescript
// Connect user's Google Calendar
connectGoogleCalendar(): Observable<void>

// Get connection status
getConnectionStatus(): Observable<CalendarConnectionStatus>

// Disconnect calendar
disconnectCalendar(): Observable<void>

// Sync booking to calendar
syncBookingToCalendar(bookingId: string, operation: 'create' | 'update' | 'delete'): Observable<SyncBookingResponse>

// Check if connected
isCalendarConnected(): Observable<boolean>

// Refresh expired token
refreshToken(): Observable<void>
```

### Edge Functions

#### `google-calendar-oauth`
```bash
GET /functions/v1/google-calendar-oauth?action=get-auth-url
GET /functions/v1/google-calendar-oauth?action=handle-callback&code=[code]&state=[user_id]
GET /functions/v1/google-calendar-oauth?action=status
GET /functions/v1/google-calendar-oauth?action=refresh-token
GET /functions/v1/google-calendar-oauth?action=disconnect
```

#### `sync-booking-to-calendar`
```bash
POST /functions/v1/sync-booking-to-calendar
Body: { booking_id: string, operation: 'create' | 'update' | 'delete' }
```

## 🎯 Roadmap

- [ ] UI Component para "Connect Calendar" en Profile
- [ ] Auto-sync on booking approval (trigger o webhook)
- [ ] Bulk sync de bookings existentes
- [ ] Calendar widget embed en dashboard
- [ ] Notificaciones push cuando se crea evento
- [ ] Soporte para múltiples calendarios (trabajo, personal)
- [ ] Import de eventos externos a AutoRenta

## 📄 License

Part of AutoRenta MVP - All rights reserved.

---

**Last Updated**: 2025-11-12
**Version**: 1.0.0
**Author**: AutoRenta Team


---
# Source: GOOGLE_CALENDAR_OAUTH_CONFIG_SUMMARY.md

# Google Calendar OAuth - Configuración Completa

## Resumen Ejecutivo

Esta guía proporciona la configuración completa necesaria para resolver el error `400 redirect_uri_mismatch` en la integración de Google Calendar.

## Arquitectura de Integración

```
┌─────────────────────────────────────────────────────────────────┐
│                         AUTORENTA                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐           ┌──────────────────┐           │
│  │  Angular Frontend│           │  Supabase Edge   │           │
│  │  localhost:4200  │◄─────────►│    Functions     │           │
│  │                  │           │  pisqjmoklivzpwu │           │
│  └──────────────────┘           └────────┬─────────┘           │
│                                           │                     │
│                                           │                     │
│                                           ▼                     │
│                                  ┌─────────────────┐            │
│                                  │  Google Cloud   │            │
│                                  │  OAuth 2.0      │            │
│                                  │  Client ID      │            │
│                                  └─────────────────┘            │
│                                           │                     │
│                                           │                     │
│                                           ▼                     │
│                                  ┌─────────────────┐            │
│                                  │  Google         │            │
│                                  │  Calendar API   │            │
│                                  └─────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

## Flujo OAuth Completo

```
1. Usuario hace click en "Conectar Google Calendar"
   └─> Frontend llama: GET /functions/v1/google-calendar-oauth?action=get-auth-url

2. Edge Function genera URL de autorización
   └─> Retorna: https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...

3. Frontend abre popup con URL de Google
   └─> Popup muestra: "AutoRenta quiere acceder a tu Google Calendar"

4. Usuario aprueba acceso
   └─> Google redirige a: https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback&code=XXX

5. Edge Function recibe el código
   └─> Intercambia código por access_token y refresh_token

6. Edge Function guarda tokens
   └─> Tabla: google_calendar_tokens (user_id, access_token, refresh_token, expires_at)

7. Edge Function redirige a frontend
   └─> http://localhost:4200/profile?calendar_connected=true

8. Popup se cierra automáticamente
   └─> Frontend actualiza UI: "✓ Conectado"
```

## Configuración Necesaria

### 1. Google Cloud Console

**URL**: https://console.cloud.google.com/apis/credentials

#### OAuth 2.0 Client ID

| Campo | Valor |
|-------|-------|
| **Client ID** | `199395590437-8e29faaapojqolscpqatotvn366pevdr.apps.googleusercontent.com` |
| **Client Secret** | `[TU_SECRET]` (obtener de Google Cloud Console) |
| **Application type** | Web application |
| **Name** | AutoRenta Calendar Integration |

#### Authorized redirect URIs (CRÍTICO)

**Debe incluir EXACTAMENTE**:
```
https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback
```

❌ **NO usar**:
```
https://pisqjmoklivzpwufhscx.supabase.co/auth/v1/callback
```
(Este es para Google Auth login, no para Calendar)

#### OAuth Consent Screen

| Campo | Valor |
|-------|-------|
| **User Type** | External |
| **App name** | AutoRenta |
| **User support email** | autorentardev@gmail.com |
| **Developer contact** | autorentardev@gmail.com |
| **Publishing status** | Testing (agregar test users) |

**Scopes requeridos**:
- `https://www.googleapis.com/auth/calendar`
- `https://www.googleapis.com/auth/calendar.events`

**Test users** (si está en modo Testing):
- Agregar el email del usuario que conectará el calendar

### 2. Supabase Configuration

**Proyecto**: pisqjmoklivzpwufhscx
**URL**: https://pisqjmoklivzpwufhscx.supabase.co

#### Secrets (Edge Functions)

```bash
# Configurar vía CLI
supabase secrets set GOOGLE_OAUTH_CLIENT_ID="199395590437-8e29faaapojqolscpqatotvn366pevdr.apps.googleusercontent.com" --project-ref pisqjmoklivzpwufhscx

supabase secrets set GOOGLE_OAUTH_CLIENT_SECRET="[TU_SECRET]" --project-ref pisqjmoklivzpwufhscx

supabase secrets set GOOGLE_OAUTH_REDIRECT_URI="https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback" --project-ref pisqjmoklivzpwufhscx

supabase secrets set FRONTEND_URL="http://localhost:4200" --project-ref pisqjmoklivzpwufhscx

# También necesarios (ya deberían estar configurados)
supabase secrets set SUPABASE_URL="https://pisqjmoklivzpwufhscx.supabase.co" --project-ref pisqjmoklivzpwufhscx

supabase secrets set SUPABASE_SERVICE_ROLE_KEY="[SERVICE_ROLE_KEY]" --project-ref pisqjmoklivzpwufhscx
```

#### Edge Functions Desplegadas

```bash
# Desplegar google-calendar-oauth
supabase functions deploy google-calendar-oauth --project-ref pisqjmoklivzpwufhscx

# Desplegar sync-booking-to-calendar
supabase functions deploy sync-booking-to-calendar --project-ref pisqjmoklivzpwufhscx

# Verificar
supabase functions list --project-ref pisqjmoklivzpwufhscx
```

**Output esperado**:
```
google-calendar-oauth        | ACTIVE
sync-booking-to-calendar     | ACTIVE
```

#### Database Schema

**Tabla**: `google_calendar_tokens`
```sql
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text,
  token_type text DEFAULT 'Bearer',
  expires_at timestamptz NOT NULL,
  scope text,
  primary_calendar_id text,
  connected_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sync_enabled boolean DEFAULT true
);

-- RLS Policies
ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tokens"
  ON google_calendar_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens"
  ON google_calendar_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens"
  ON google_calendar_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens"
  ON google_calendar_tokens FOR DELETE
  USING (auth.uid() = user_id);
```

### 3. Angular Configuration

**Archivo**: `apps/web/src/environments/environment.ts`

```typescript
export const environment = {
  production: false,
  supabaseUrl: 'https://pisqjmoklivzpwufhscx.supabase.co',
  supabaseAnonKey: '[ANON_KEY]',
  googleCalendarEnabled: true,
};
```

**Servicio**: `apps/web/src/app/core/services/google-calendar.service.ts`

Ya está implementado y listo para usar.

## Comandos de Verificación

### Verificar Google Cloud Console

```bash
# No hay comando CLI, verificar manualmente en:
# https://console.cloud.google.com/apis/credentials
```

Checklist:
- [ ] OAuth 2.0 Client ID existe
- [ ] Redirect URI correcto configurado
- [ ] Scopes de Calendar agregados
- [ ] Test users agregados (si está en Testing)

### Verificar Supabase Secrets

```bash
# Listar todos los secrets de Google OAuth
supabase secrets list --project-ref pisqjmoklivzpwufhscx | grep GOOGLE
```

**Output esperado**:
```
GOOGLE_OAUTH_CLIENT_ID     | [hash]
GOOGLE_OAUTH_CLIENT_SECRET | [hash]
GOOGLE_OAUTH_REDIRECT_URI  | [hash]
```

### Verificar Edge Functions

```bash
# Listar functions
supabase functions list --project-ref pisqjmoklivzpwufhscx

# Ver logs de google-calendar-oauth
supabase functions logs google-calendar-oauth --project-ref pisqjmoklivzpwufhscx
```

### Verificar Database

```sql
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar que la tabla existe
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'google_calendar_tokens';

-- 2. Verificar RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'google_calendar_tokens';

-- 3. Ver tokens conectados
SELECT
  user_id,
  primary_calendar_id,
  expires_at,
  sync_enabled,
  connected_at
FROM google_calendar_tokens;
```

## Testing End-to-End

### Paso 1: Conectar Calendar

1. Iniciar app:
   ```bash
   npm run dev
   ```

2. Navegar a: http://localhost:4200/profile

3. Click en "Conectar Google Calendar"

4. Debe abrir popup de Google

5. Seleccionar cuenta y aprobar permisos

6. Popup debe cerrarse automáticamente

7. UI debe mostrar: "✓ Conectado"

### Paso 2: Verificar en Base de Datos

```sql
SELECT * FROM google_calendar_tokens WHERE user_id = auth.uid();
```

Debería retornar 1 fila con:
- `access_token` (cifrado)
- `refresh_token` (cifrado)
- `expires_at` (fecha futura)
- `primary_calendar_id` (email del usuario)
- `connected_at` (timestamp actual)

### Paso 3: Probar Sincronización

Cuando un locador aprueba un booking:

```typescript
// En bookings.service.ts
this.googleCalendarService.syncBookingToCalendar(bookingId, 'create').subscribe({
  next: (result) => {
    console.log('Booking synced to Google Calendar:', result);
    // result: { success: true, event_id: "...", synced_to_locador: true, synced_to_locatario: false }
  },
  error: (err) => console.error('Sync failed:', err)
});
```

### Paso 4: Verificar en Google Calendar

1. Ir a: https://calendar.google.com

2. Buscar calendario: "AutoRenta - [Marca] [Modelo]"

3. Verificar evento: "🚗 Booking: [Marca] [Modelo]"

4. Detalles del evento:
   - Fecha/hora correcta
   - Descripción con info del booking
   - Color verde (approved)
   - Recordatorios 24h y 1h antes

## Troubleshooting por Error

| Error | Causa | Solución |
|-------|-------|----------|
| `redirect_uri_mismatch` | Redirect URI no coincide | Ver paso 1 arriba |
| `invalid_client` | Client ID o Secret incorrectos | Verificar secrets en Supabase |
| `access_denied` (403) | Usuario no en test users | Agregar en OAuth Consent Screen |
| `Token exchange failed` | Secret incorrecto | Regenerar secret en Google Cloud |
| Popup se cierra inmediatamente | Error en Edge Function | Revisar logs de la función |
| No se guarda el token | RLS policy bloqueando | Verificar RLS policies |

## Diagrama de Configuración Actual vs. Esperada

### ❌ Configuración ACTUAL (Incorrecta)

```
Google Cloud Console:
  Authorized redirect URIs:
    - https://pisqjmoklivzpwufhscx.supabase.co/auth/v1/callback ❌

Supabase Secrets:
  GOOGLE_OAUTH_REDIRECT_URI=https://pisqjmoklivzpwufhscx.supabase.co/auth/v1/callback ❌
```

**Problema**: Usando endpoint de Supabase Auth en lugar de Edge Function

### ✅ Configuración ESPERADA (Correcta)

```
Google Cloud Console:
  Authorized redirect URIs:
    - https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback ✅

Supabase Secrets:
  GOOGLE_OAUTH_REDIRECT_URI=https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback ✅
```

**Beneficio**: Edge Function puede procesar el código y guardar tokens

## Comparación: Dos Flujos OAuth

### Flujo 1: Google Auth (Login de Usuario)

| Aspecto | Valor |
|---------|-------|
| **Propósito** | Autenticar usuario con Google |
| **Proyecto Supabase** | obxvffplochgeiclibng |
| **Redirect URI** | `https://obxvffplochgeiclibng.supabase.co/auth/v1/callback` |
| **Scopes** | `email`, `profile`, `openid` |
| **Manejo** | Supabase Auth automático |
| **Configuración** | Supabase Dashboard → Auth → Providers |

### Flujo 2: Google Calendar (Integración)

| Aspecto | Valor |
|---------|-------|
| **Propósito** | Conectar Google Calendar del usuario |
| **Proyecto Supabase** | pisqjmoklivzpwufhscx |
| **Redirect URI** | `https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback` |
| **Scopes** | `calendar`, `calendar.events` |
| **Manejo** | Edge Function custom |
| **Configuración** | Supabase Secrets + Google Cloud Console |

**IMPORTANTE**: Son flujos completamente separados con diferentes redirect URIs.

## Siguientes Pasos

1. **Aplicar la solución rápida**: Ver `QUICK_FIX_GOOGLE_CALENDAR_OAUTH.md`

2. **Probar la integración**: Conectar calendar desde profile

3. **Sincronizar un booking**: Aprobar booking y verificar sync

4. **Monitorear logs**: Revisar Edge Function logs para errores

5. **Documentar**: Actualizar esta guía si encuentras otros casos

## Referencias

- **Runbook completo**: `/home/edu/autorenta/docs/runbooks/fix-google-calendar-redirect-uri-mismatch.md`
- **Setup inicial**: `/home/edu/autorenta/SETUP_GOOGLE_CALENDAR.md`
- **Testing guide**: `/home/edu/autorenta/GOOGLE_CALENDAR_TEST_GUIDE.md`
- **Google OAuth Docs**: https://developers.google.com/identity/protocols/oauth2
- **Supabase Functions**: https://supabase.com/docs/guides/functions

---

**Última actualización**: 2025-11-13
**Autor**: Claude Code
**Estado**: ✅ Documentación completa


---
# Source: LIVE_LOCATION_TRACKING.md

## 🚗 **Sistema de Tracking en Tiempo Real - Guía Completa**

**Autor**: Claude Code
**Fecha**: 2025-11-12
**Status**: ✅ Listo para implementar

---

## 📋 **¿Qué es esto?**

Un sistema completo de tracking en tiempo real que permite al **locador** y al **locatario** verse mutuamente en un mapa durante la entrega/devolución del auto.

### **Casos de uso:**

1. **Check-In (Entrega del auto)**
   - Locador va a entregar el auto al locatario
   - Locatario puede ver en tiempo real dónde está el locador
   - ETA: "Llega en 8 minutos"

2. **Check-Out (Devolución del auto)**
   - Locatario va a devolver el auto al locador
   - Locador puede ver en tiempo real dónde está el locatario
   - Distancia restante: "A 2.5 km"

---

## 🏗️ **Arquitectura**

### **Componentes Creados:**

1. **Database Schema** ✅
   - `booking_location_tracking` table
   - Helper functions (start/stop/update tracking)
   - RLS policies
   - Real-time subscriptions

2. **Location Tracking Service** ✅
   - `location-tracking.service.ts`
   - Manejo de GPS
   - Actualización automática cada 3-5 segundos
   - Cálculo de distancia y ETA

3. **Componentes UI** (Pendiente de crear)
   - `live-tracking-map.component.ts`
   - Botones de "Compartir ubicación"
   - Vista del mapa con ambos usuarios

---

## 🚀 **Cómo Usar**

### **1. Aplicar Migración de DB**

```bash
# En Supabase Dashboard → SQL Editor
# Ejecutar: supabase/migrations/20251112_create_live_location_tracking.sql
```

### **2. En la Página de Check-In**

```typescript
// owner-check-in.page.ts
import { LocationTrackingService, TrackingSession } from '@core/services/location-tracking.service';

export class OwnerCheckInPage {
  private locationTracking = inject(LocationTrackingService);

  // Señales
  trackingSessions = signal<TrackingSession[]>([]);
  isSharing = signal(false);

  async startSharing() {
    const bookingId = this.booking()?.id;
    if (!bookingId) return;

    // Pedir permiso de ubicación
    const granted = await this.locationTracking.requestLocationPermission();
    if (!granted) {
      alert('Necesitas activar la ubicación para compartir tu posición');
      return;
    }

    // Iniciar tracking
    await this.locationTracking.startTracking(bookingId, 'check_in');
    this.isSharing.set(true);

    // Suscribirse a updates del locatario
    this.subscribeToOtherUserLocation(bookingId);
  }

  stopSharing() {
    this.locationTracking.stopTracking('arrived');
    this.isSharing.set(false);
  }

  private subscribeToOtherUserLocation(bookingId: string) {
    this.locationTracking.subscribeToLocationUpdates(bookingId, (sessions) => {
      this.trackingSessions.set(sessions);
    });
  }
}
```

### **3. En el Template (HTML)**

```html
<!-- owner-check-in.page.html -->

<!-- Botón para compartir ubicación -->
<div class="card-premium p-6 mb-6">
  <h3 class="text-lg font-bold mb-4">Compartir Ubicación</h3>

  <button
    *ngIf="!isSharing()"
    (click)="startSharing()"
    class="btn-primary w-full"
  >
    📍 Compartir mi ubicación
  </button>

  <button
    *ngIf="isSharing()"
    (click)="stopSharing()"
    class="btn-secondary w-full"
  >
    ⏸️ Dejar de compartir
  </button>

  <p class="text-sm text-text-secondary mt-2">
    El locatario podrá ver tu ubicación en tiempo real
  </p>
</div>

<!-- Mapa con ubicaciones -->
<div *ngIf="trackingSessions().length > 0" class="card-premium p-6">
  <h3 class="text-lg font-bold mb-4">Ubicaciones en Vivo</h3>

  <!-- Para cada persona compartiendo ubicación -->
  <div *ngFor="let session of trackingSessions()" class="mb-4">
    <div class="flex items-center gap-3 mb-2">
      <img
        [src]="session.user_photo || 'assets/default-avatar.png'"
        class="w-10 h-10 rounded-full"
      />
      <div>
        <p class="font-semibold">{{ session.user_name }}</p>
        <p class="text-sm text-text-secondary">
          {{ session.user_role === 'locador' ? 'Propietario' : 'Arrendatario' }}
        </p>
      </div>
      <div class="ml-auto text-right">
        <p class="text-sm font-medium text-cta-default">
          📍 Actualizado hace {{ getTimeSince(session.last_updated) }}
        </p>
        <p *ngIf="session.distance_remaining" class="text-xs text-text-secondary">
          A {{ (session.distance_remaining / 1000).toFixed(1) }} km
        </p>
      </div>
    </div>
  </div>

  <!-- Componente del mapa (crear después) -->
  <app-live-tracking-map
    [trackingSessions]="trackingSessions()"
    [destinationLat]="booking()?.pickup_latitude"
    [destinationLng]="booking()?.pickup_longitude"
  />
</div>
```

---

## 🗺️ **Crear el Componente del Mapa**

### **Reutilizar cars-map.component.ts**

Puedes extender el componente actual del mapa para mostrar múltiples markers:

```typescript
// live-tracking-map.component.ts
@Component({
  selector: 'app-live-tracking-map',
  template: `
    <app-cars-map
      [cars]="[]"
      [userLocation]="null"
      [showSearchRadius]="false"
      style="height: 400px; width: 100%;"
    />
  `
})
export class LiveTrackingMapComponent {
  @Input() trackingSessions: TrackingSession[] = [];
  @Input() destinationLat?: number;
  @Input() destinationLng?: number;

  // TODO: Agregar markers para cada tracking session
  // TODO: Agregar marker para el destino
  // TODO: Auto-zoom para mostrar todos los markers
}
```

**O crear uno nuevo más simple para tracking específico.**

---

## 📊 **Flujo Completo**

### **Escenario: Check-In (Entrega del auto)**

```
1. Locador abre "Check-In" para la reserva
   └─ Click en "Compartir mi ubicación"
   └─ Sistema pide permiso GPS
   └─ Comienza a enviar ubicación cada 3-5 segundos

2. Locatario abre "Check-In" para la misma reserva
   └─ Ve en el mapa: "Juan (Propietario) está a 3.2 km"
   └─ ETA: "Llega en 12 minutos"
   └─ Ve marker moviéndose en tiempo real

3. Locador llega al punto de encuentro
   └─ Click en "Llegué al destino"
   └─ Sistema marca tracking como 'arrived'
   └─ Ambos proceden con check-in
```

---

## 🔐 **Seguridad (RLS)**

### **Políticas Implementadas:**

✅ **Solo usuarios autenticados** pueden crear/actualizar tracking
✅ **Solo puedes actualizar tu propia ubicación**
✅ **Solo puedes ver ubicaciones de TUS bookings**
✅ **No puedes ver ubicaciones de bookings ajenos**

### **Ejemplo:**

```sql
-- Usuario A (locador) en booking #123
-- Usuario B (locatario) en booking #123
-- Usuario C (no relacionado)

-- ✅ Usuario A ve ubicación de Usuario B (mismo booking)
-- ✅ Usuario B ve ubicación de Usuario A (mismo booking)
-- ❌ Usuario C NO ve ubicaciones (no está en booking #123)
```

---

## ⚡ **Rendimiento**

### **Frecuencia de Actualización:**

- **GPS Watch**: Cada 3-5 segundos (automático)
- **DB Update**: Cada 3-5 segundos (cuando GPS cambia)
- **UI Refresh**: Cada 3 segundos (polling) o Real-time (Supabase)

### **Consumo de Datos:**

- ~10 KB/minuto por usuario compartiendo ubicación
- ~30 minutos de tracking = ~300 KB
- **Muy eficiente** ✅

### **Consumo de Batería:**

- GPS en modo "high accuracy"
- Se recomienda avisar al usuario
- Detener tracking cuando llegue al destino

---

## 🛠️ **Tareas Pendientes para Completar**

### **1. Componente del Mapa** (30 min)
- [ ] Crear `live-tracking-map.component.ts`
- [ ] Agregar markers para cada tracking session
- [ ] Marker especial para destino
- [ ] Auto-zoom para mostrar todo
- [ ] Actualización en tiempo real de markers

### **2. Integrar en Check-In/Check-Out** (1 hora)
- [ ] `owner-check-in.page.ts` - Botón compartir ubicación
- [ ] `check-in.page.ts` (locatario) - Ver ubicación del locador
- [ ] `owner-check-out.page.ts` - Ver ubicación del locatario
- [ ] `check-out.page.ts` (locatario) - Compartir ubicación

### **3. UI/UX Mejorado** (1 hora)
- [ ] Botón flotante "Compartir ubicación"
- [ ] Avatar del usuario en el marker
- [ ] Línea de ruta entre usuarios
- [ ] Notificación cuando la otra persona está cerca (<500m)
- [ ] Botón "Llamar" si tarda mucho

### **4. Testing** (30 min)
- [ ] Probar con 2 usuarios reales
- [ ] Verificar permisos GPS
- [ ] Verificar RLS policies
- [ ] Probar desconexión/reconexión

---

## 📱 **Demo de Uso**

### **Vista del Locador (compartiendo):**

```
┌─────────────────────────────────────┐
│  Check-In del Auto                  │
├─────────────────────────────────────┤
│                                     │
│  [✓] Compartiendo ubicación         │
│  ⏸️  Dejar de compartir             │
│                                     │
│  El locatario puede verte           │
│  Última actualización: hace 2 seg   │
│                                     │
├─────────────────────────────────────┤
│           🗺️ MAPA                  │
│                                     │
│    📍 Tú (Locador)                 │
│          |                          │
│          | 3.2 km                   │
│          |                          │
│    🎯 Destino (Punto de encuentro) │
│                                     │
│    👤 Pedro (Locatario)            │
│       esperando en destino          │
│                                     │
└─────────────────────────────────────┘
```

### **Vista del Locatario (viendo):**

```
┌─────────────────────────────────────┐
│  Check-In del Auto                  │
├─────────────────────────────────────┤
│                                     │
│  Juan (Propietario) viene en camino│
│                                     │
│  📍 A 3.2 km de distancia          │
│  ⏱️  ETA: 12 minutos               │
│  🚗 Velocidad: 45 km/h             │
│                                     │
├─────────────────────────────────────┤
│           🗺️ MAPA                  │
│                                     │
│    📍 Juan (Locador)               │
│       → moviéndose                  │
│          |                          │
│          | 3.2 km                   │
│          |                          │
│    👤 Tú (Locatario)               │
│       🎯 en punto de encuentro      │
│                                     │
│  [📞 Llamar a Juan]                │
│                                     │
└─────────────────────────────────────┘
```

---

## 🎯 **Próximos Pasos**

1. **Aplicar migración de DB** (5 min)
   ```bash
   # En Supabase Dashboard → SQL Editor
   ```

2. **Crear componente de mapa de tracking** (30 min)
   - Puede ser una variación de `cars-map.component`
   - O un componente nuevo más simple

3. **Integrar en páginas de check-in/check-out** (1 hora)
   - Agregar botones
   - Suscribirse a updates
   - Mostrar mapa

4. **Testing con 2 dispositivos** (30 min)
   - Verificar que funcione en producción
   - Ajustar frecuencia de updates si es necesario

---

## 💡 **Tips de Implementación**

### **Para el Marker del Usuario:**

```typescript
// Usar avatar del usuario en el marker
const markerElement = document.createElement('div');
markerElement.innerHTML = `
  <div class="live-marker">
    <img src="${session.user_photo}" class="avatar" />
    <div class="pulse-ring"></div>
  </div>
`;
```

### **Para la Línea de Ruta:**

```typescript
// Dibujar línea entre usuarios
map.addSource('route-line', {
  type: 'geojson',
  data: {
    type: 'LineString',
    coordinates: [
      [locadorLon, locadorLat],
      [locatarioLon, locatarioLat]
    ]
  }
});
```

### **Para Notificaciones:**

```typescript
// Avisar cuando esté cerca
if (distance < 500) {
  showNotification('Juan está a menos de 500m');
}
```

---

## 📚 **Recursos**

- **Servicio**: `apps/web/src/app/core/services/location-tracking.service.ts`
- **Migración DB**: `supabase/migrations/20251112_create_live_location_tracking.sql`
- **Geolocation API**: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API
- **Supabase Realtime**: https://supabase.com/docs/guides/realtime

---

**¿Necesitas ayuda para implementar alguna parte específica?**

Solo dime:
- "Crea el componente del mapa"
- "Integralo en check-in page"
- "Agrega notificaciones"

¡Y lo implemento! 🚀


---
# Source: MARKETPLACE_CONFIGURATION_GUIDE.md

# 🏪 Guía Completa: Configuración de MercadoPago Marketplace

**Última actualización:** 2025-10-28
**Aplicación:** TestApp-07933fa3 (ID: 4340262352975191)
**Estado actual:** ⏳ Pendiente de configuración como Marketplace

---

## 📊 Estado Actual de la Aplicación

### ✅ Información Obtenida de la API

```json
{
  "id": 4340262352975191,
  "name": "TestApp-07933fa3",
  "site_id": "MLA",
  "sandbox_mode": true,
  "certification_status": "not_certified",
  "scopes": ["read", "write", "offline_access"],
  "max_requests_per_hour": 18000,
  "callback_urls": ["https://www.mercadopago.com"],
  "active": true
}
```

### ⚠️ Estado Marketplace

**Usuario actual:**
```json
{
  "id": 2302679571,
  "marketplace_status": false,  ← ❌ NO configurado como marketplace
  "merchant_orders_status": false
}
```

**Conclusión:** La app existe pero **NO está configurada como Marketplace** todavía.

---

## 🎯 Pasos para Configurar Marketplace

### **PASO 1: Configurar App en Dashboard (MANUAL)**

1. **Ir al dashboard de tu aplicación:**
   ```
   https://www.mercadopago.com.ar/developers/panel/app/4340262352975191
   ```

2. **Configurar modelo de negocio:**
   - Buscar sección: "Modelo de negocio"
   - Seleccionar: **"Marketplace"** o **"Pagos divididos"**
   - Guardar cambios

3. **Activar funcionalidades:**
   - ✅ Procesar pagos como marketplace
   - ✅ Split de pagos (división automática)
   - ✅ OAuth (vincular vendedores)

4. **Configurar URLs de callback:**
   - Production: `https://tu-dominio.com/auth/mercadopago/callback`
   - Test: `http://localhost:4200/auth/mercadopago/callback`

5. **Obtener Client Secret:**
   - En la misma página, buscar: "Credenciales"
   - Copiar: **Client Secret** (necesario para OAuth)
   - Guardar en `.env.local`:
     ```bash
     MERCADOPAGO_CLIENT_SECRET=tu-client-secret-aqui
     ```

---

### **PASO 2: Flujo OAuth para Vincular Vendedores**

Los **dueños de autos** deben autorizar tu app para que puedas cobrar en su nombre.

#### **2.1. URL de Autorización**

Redirigir al dueño a:
```
https://auth.mercadopago.com.ar/authorization?
  client_id=4340262352975191&
  response_type=code&
  platform_id=mp&
  redirect_uri=https://tu-dominio.com/auth/mercadopago/callback&
  state=RANDOM_TOKEN_SEGURIDAD
```

**Parámetros:**
- `client_id`: `4340262352975191` (tu Application ID)
- `response_type`: `code`
- `platform_id`: `mp`
- `redirect_uri`: URL donde MP enviará el código
- `state`: Token aleatorio para prevenir CSRF

#### **2.2. Callback - Intercambiar Código por Token**

MP redirige a tu app con:
```
https://tu-dominio.com/auth/mercadopago/callback?code=TG-xxxxx&state=RANDOM_TOKEN
```

Tu backend debe hacer:
```bash
POST https://api.mercadopago.com/oauth/token
Content-Type: application/json

{
  "client_id": "4340262352975191",
  "client_secret": "TU_CLIENT_SECRET",
  "grant_type": "authorization_code",
  "code": "TG-xxxxx",
  "redirect_uri": "https://tu-dominio.com/auth/mercadopago/callback"
}
```

**Respuesta:**
```json
{
  "access_token": "APP_USR-2302679571-101722-...",
  "token_type": "Bearer",
  "expires_in": 15552000,
  "scope": "read write offline_access",
  "user_id": 2302679571,        ← ⭐ ESTE ES EL collector_id
  "refresh_token": "TG-...",
  "public_key": "APP_USR-...",
  "live_mode": false
}
```

#### **2.3. Guardar Collector ID**

```sql
UPDATE profiles
SET
  mercadopago_collector_id = '2302679571',
  mercadopago_connected = true,
  mercadopago_connected_at = NOW()
WHERE id = 'user-uuid';
```

---

### **PASO 3: Crear Preference con Split**

Una vez que el dueño tiene `collector_id`, al crear un booking:

```typescript
// En supabase/functions/mercadopago-create-booking-preference/index.ts
// ✅ YA IMPLEMENTADO

const preferenceData = {
  items: [{ title: "Alquiler auto", quantity: 1, unit_price: 500 }],

  // ⭐ SPLIT PAYMENT CONFIG
  marketplace: "4340262352975191",           // Tu Application ID
  marketplace_fee: 50.00,                    // 10% = 50 ARS
  collector_id: owner.mercadopago_collector_id,  // User ID del dueño

  back_urls: { /* ... */ },
  notification_url: "https://tu-dominio.com/webhooks/mercadopago",
  metadata: {
    is_marketplace_split: true,
    owner_amount_ars: 450,
    platform_fee_ars: 50,
    collector_id: owner.mercadopago_collector_id
  }
};
```

**Resultado:**
- MercadoPago divide automáticamente el pago:
  - **90% (450 ARS)** → Cuenta del dueño (collector_id)
  - **10% (50 ARS)** → Tu cuenta (marketplace)

---

### **PASO 4: Webhook Valida el Split**

```typescript
// En supabase/functions/mercadopago-webhook/index.ts
// ✅ YA IMPLEMENTADO

// 1. Validar collector_id
if (paymentData.collector_id !== expectedCollectorId) {
  // Insertar en payment_issues
  await supabase.from('payment_issues').insert({
    booking_id,
    payment_id,
    issue_type: 'split_collector_mismatch',
    details: { expected, received }
  });
}

// 2. Validar montos
const totalAmount = paymentData.transaction_amount;
const platformFee = metadata.platform_fee_ars;
const ownerAmount = metadata.owner_amount_ars;

if (Math.abs((ownerAmount + platformFee) - totalAmount) > 0.01) {
  // Insertar en payment_issues
}

// 3. Registrar split exitoso
await supabase.rpc('register_payment_split', {
  p_booking_id,
  p_mp_payment_id,
  p_total_amount_cents,
  p_currency: 'ARS'
});
```

---

## 🔧 Implementación: Endpoints OAuth

### **Endpoint 1: Iniciar Conexión**

**Archivo:** `supabase/functions/mercadopago-oauth-connect/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const { user_id } = await req.json();

  const clientId = Deno.env.get('MERCADOPAGO_APPLICATION_ID');
  const redirectUri = Deno.env.get('MERCADOPAGO_OAUTH_REDIRECT_URI');

  // Generar state token
  const state = crypto.randomUUID();

  // Guardar state en DB temporalmente (para validar en callback)
  // ... (implementar según tu lógica)

  const authUrl =
    `https://auth.mercadopago.com.ar/authorization?` +
    `client_id=${clientId}&` +
    `response_type=code&` +
    `platform_id=mp&` +
    `redirect_uri=${encodeURIComponent(redirectUri!)}&` +
    `state=${state}`;

  return new Response(JSON.stringify({ auth_url: authUrl }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

### **Endpoint 2: Callback OAuth**

**Archivo:** `supabase/functions/mercadopago-oauth-callback/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code) {
    return new Response('Missing code', { status: 400 });
  }

  // Validar state (prevenir CSRF)
  // ... (verificar state guardado en BD)

  // Intercambiar código por token
  const tokenResponse = await fetch('https://api.mercadopago.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: Deno.env.get('MERCADOPAGO_APPLICATION_ID'),
      client_secret: Deno.env.get('MERCADOPAGO_CLIENT_SECRET'),
      grant_type: 'authorization_code',
      code,
      redirect_uri: Deno.env.get('MERCADOPAGO_OAUTH_REDIRECT_URI')
    })
  });

  const tokenData = await tokenResponse.json();

  if (tokenData.error) {
    return new Response(JSON.stringify({ error: tokenData.error }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Guardar collector_id en profiles
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { error } = await supabase
    .from('profiles')
    .update({
      mercadopago_collector_id: tokenData.user_id.toString(),
      mercadopago_connected: true,
      mercadopago_connected_at: new Date().toISOString(),
      mercadopago_refresh_token: tokenData.refresh_token
    })
    .eq('id', req.headers.get('x-user-id')); // Pasar user ID desde frontend

  if (error) {
    console.error('Error saving collector_id:', error);
    return new Response(JSON.stringify({ error: 'Failed to save' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Redirigir a frontend con éxito
  return Response.redirect(`${Deno.env.get('APP_URL')}/dashboard/connected`);
});
```

---

## 📋 Columnas a Agregar en `profiles`

```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS mercadopago_collector_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS mercadopago_connected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mercadopago_connected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS mercadopago_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS mercadopago_access_token_expires_at TIMESTAMPTZ;

-- Índice para búsquedas rápidas
CREATE INDEX idx_profiles_mp_collector
ON profiles(mercadopago_collector_id)
WHERE mercadopago_connected = TRUE;

-- Comentarios
COMMENT ON COLUMN profiles.mercadopago_collector_id IS 'User ID de MercadoPago del vendedor (para split payments)';
COMMENT ON COLUMN profiles.mercadopago_connected IS 'Indica si el usuario vinculó su cuenta de MercadoPago';
```

---

## 🧪 Testing con Test Users

### ⚠️ Limitaciones

**Test users NO pueden:**
- Completar flujo OAuth real
- Transferir dinero real entre cuentas
- Ver splits en sus cuentas de MP

**Para testing de split payments:**

1. **Opción A: Simular en código**
   ```typescript
   // Para test users, usar collector_id hardcodeado
   if (process.env.NODE_ENV === 'test') {
     collector_id = '2302679571'; // Test user ID
   }
   ```

2. **Opción B: Usar cuentas reales**
   - Crear cuenta real de MP
   - Configurar app en producción
   - Vincular vendedores reales
   - Hacer transacciones mínimas ($10 ARS)

---

## 📊 Checklist de Implementación

### ✅ Backend (Completado)
- [x] Migración SQL: Tablas `payment_splits` y `payment_issues`
- [x] RPC Function: `register_payment_split()`
- [x] Webhook: Validación de splits
- [x] Edge Function: Preference con marketplace ID
- [x] Secrets configurados en Supabase

### ⏳ OAuth Flow (Pendiente)
- [ ] Migración SQL: Columnas en `profiles` para OAuth
- [ ] Edge Function: `mercadopago-oauth-connect`
- [ ] Edge Function: `mercadopago-oauth-callback`
- [ ] Frontend: Página "Conectar MercadoPago"
- [ ] Frontend: Botón en dashboard de dueños
- [ ] Service: `MercadoPagoOAuthService`

### ⏳ Dashboard Manual (Pendiente)
- [ ] Configurar app como "Marketplace" en dashboard
- [ ] Obtener Client Secret
- [ ] Configurar Redirect URIs
- [ ] Agregar `MERCADOPAGO_CLIENT_SECRET` a secrets

### ⏳ Testing (Pendiente)
- [ ] Crear booking de prueba con split
- [ ] Verificar webhook recibe collector_id
- [ ] Validar registro en `payment_splits`
- [ ] Verificar issues si falla validación

---

## 🔑 Variables de Entorno Necesarias

```bash
# .env.local

# Existentes ✅
MERCADOPAGO_ACCESS_TOKEN=APP_USR-4340262352975191-101722-...
MERCADOPAGO_PUBLIC_KEY=APP_USR-a89f4240-f154-43dc-9535-...
MERCADOPAGO_APPLICATION_ID=4340262352975191
MERCADOPAGO_MARKETPLACE_ID=2302679571

# Faltantes ⏳
MERCADOPAGO_CLIENT_SECRET=tu-client-secret-desde-dashboard
MERCADOPAGO_OAUTH_REDIRECT_URI=https://tu-dominio.com/auth/mercadopago/callback

# Opcionales
MERCADOPAGO_OAUTH_REDIRECT_URI_DEV=http://localhost:4200/auth/mercadopago/callback
```

---

## 📚 Referencias

- **Marketplace Docs:** https://www.mercadopago.com.ar/developers/es/docs/marketplace/landing
- **Checkout Pro Split:** https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/payment-split
- **OAuth Flow:** https://www.mercadopago.com.ar/developers/es/docs/marketplace/integration/oauth
- **Dashboard App:** https://www.mercadopago.com.ar/developers/panel/app/4340262352975191
- **API Reference:** https://www.mercadopago.com.ar/developers/es/reference

---

## 🎯 Próximos Pasos

1. **AHORA (Manual):**
   - Ir al dashboard y configurar como Marketplace
   - Obtener Client Secret
   - Configurar Redirect URIs

2. **DESPUÉS (Código):**
   - Crear migración para columnas OAuth en profiles
   - Implementar edge functions OAuth
   - Crear UI para "Conectar MercadoPago"
   - Testing con cuentas reales

3. **PRODUCCIÓN:**
   - Usar credenciales reales (no test users)
   - Configurar dominio en callback URLs
   - Validar con transacciones reales mínimas

---

**Última actualización:** 2025-10-28


---
# Source: MARKETPLACE_SETUP_GUIDE.md

# 🏪 Guía de Configuración del Marketplace de MercadoPago

Esta guía te ayudará a configurar el Marketplace de MercadoPago para habilitar split payments en AutoRenta.

## 📋 Contenido

1. [Archivos Creados](#archivos-creados)
2. [Configuración Inicial](#configuración-inicial)
3. [Validación de Configuración](#validación-de-configuración)
4. [Testing de Credenciales](#testing-de-credenciales)
5. [Uso en el Código](#uso-en-el-código)
6. [Tests Unitarios](#tests-unitarios)
7. [Troubleshooting](#troubleshooting)

---

## 📁 Archivos Creados

### 1. **`.env.example` actualizado**
   - Ubicación: `apps/web/.env.example`
   - Variables añadidas:
     - `MERCADOPAGO_MARKETPLACE_ID`
     - `MERCADOPAGO_APPLICATION_ID`
     - `MERCADOPAGO_PLATFORM_FEE_PERCENTAGE`

### 2. **Script de Validación**
   - Ubicación: `scripts/validate-marketplace-config.sh`
   - Propósito: Validar que todas las variables de entorno estén configuradas

### 3. **Servicio TypeScript**
   - Ubicación: `apps/web/src/app/core/services/marketplace.service.ts`
   - Propósito: Helpers para validar marketplace y calcular splits

### 4. **Script de Testing de Credenciales**
   - Ubicación: `scripts/test-marketplace-credentials.sh`
   - Propósito: Verificar credenciales con la API real de MercadoPago

### 5. **Tests Unitarios**
   - Ubicación: `apps/web/src/app/core/services/__tests__/marketplace.service.spec.ts`
   - Propósito: Tests mockeados del MarketplaceService

---

## ⚙️ Configuración Inicial

### Paso 1: Configurar Marketplace en MercadoPago

1. **Ir al panel de desarrolladores:**
   ```
   https://www.mercadopago.com.ar/developers/panel/app
   ```

2. **Seleccionar tu aplicación** (o crear una nueva)

3. **Activar Marketplace:**
   - Ve a "Configuración" → "Marketplace"
   - Activa "Split de pagos"
   - Configura:
     - **Comisión de plataforma:** 10%
     - **Modo:** Automático
     - **Transferencia:** Inmediata

4. **Obtener credenciales:**
   - **Marketplace ID:** En la sección "Marketplace"
   - **Application ID:** En "Información de la aplicación"
   - **Access Token:** En "Credenciales"
   - **Public Key:** En "Credenciales"

### Paso 2: Configurar Variables de Entorno

1. **Copiar el archivo de ejemplo:**
   ```bash
   cd apps/web
   cp .env.example .env.local
   ```

2. **Editar `.env.local` con los valores reales:**
   ```bash
   # MercadoPago Production
   MERCADOPAGO_ACCESS_TOKEN=APP_USR-1234567890abcdef-...
   MERCADOPAGO_PUBLIC_KEY=APP_USR-...

   # Marketplace
   MERCADOPAGO_MARKETPLACE_ID=tu-marketplace-id
   MERCADOPAGO_APPLICATION_ID=1234567890
   MERCADOPAGO_PLATFORM_FEE_PERCENTAGE=10
   ```

3. **Para testing, también configurar credenciales de sandbox:**
   ```bash
   MERCADOPAGO_TEST_ACCESS_TOKEN=TEST-1234567890abcdef-...
   MERCADOPAGO_TEST_PUBLIC_KEY=TEST-...
   ```

---

## ✅ Validación de Configuración

### Validar Variables de Entorno

Ejecuta el script de validación:

```bash
cd /home/edu/autorenta
./scripts/validate-marketplace-config.sh
```

**Output esperado:**

```
🔍 Validando configuración de MercadoPago Marketplace...

✅ Archivo .env.local encontrado

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 VALIDACIÓN DE VARIABLES REQUERIDAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣  Credenciales básicas de MercadoPago:
✅ MERCADOPAGO_ACCESS_TOKEN: Configurado
✅ MERCADOPAGO_PUBLIC_KEY: Configurado

2️⃣  Credenciales de Test/Sandbox:
⚠️  MERCADOPAGO_TEST_ACCESS_TOKEN: NO CONFIGURADO (OPCIONAL)

3️⃣  Configuración de Marketplace (Split Payment):
✅ MERCADOPAGO_MARKETPLACE_ID: Configurado
✅ MERCADOPAGO_APPLICATION_ID: Configurado
✅ MERCADOPAGO_PLATFORM_FEE_PERCENTAGE: Configurado

4️⃣  Configuración de Supabase:
✅ SUPABASE_URL: Configurado
✅ SUPABASE_SERVICE_ROLE_KEY: Configurado

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 RESUMEN DE VALIDACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Todas las variables están configuradas correctamente
```

---

## 🧪 Testing de Credenciales

### Test en Producción

Verifica que las credenciales funcionen con la API real:

```bash
./scripts/test-marketplace-credentials.sh prod
```

### Test en Sandbox

Verifica credenciales de test:

```bash
./scripts/test-marketplace-credentials.sh test
```

**Output esperado:**

```
🧪 Verificando credenciales de MercadoPago (modo: prod)...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔑 TEST 1: Validar Access Token
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Access Token válido

  📊 Información de la cuenta:
     User ID: 123456789
     Email: tu-email@ejemplo.com
     Site: MLA

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏪 TEST 2: Validar Configuración de Marketplace
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ MERCADOPAGO_MARKETPLACE_ID: tu-marketplace-id
✅ MERCADOPAGO_APPLICATION_ID: 1234567890

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💳 TEST 3: Crear Preference de Prueba (Split Payment)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  Preference falló (esperado sin collector_id)
   Para split payment real, necesitas un seller con onboarding completo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 RESUMEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Todas las validaciones pasaron

Próximos pasos:
1. Asegúrate que los sellers completen onboarding MP
2. Actualiza los cars con owner_mp_collector_id
3. Testea el flujo completo de reserva con split
```

---

## 💻 Uso en el Código

### Inyectar el Servicio

```typescript
import { Component } from '@angular/core';
import { MarketplaceService } from '@app/core/services/marketplace.service';

@Component({
  selector: 'app-publish-car',
  template: '...'
})
export class PublishCarComponent {
  constructor(private marketplaceService: MarketplaceService) {}

  async publishCar() {
    // Tu código aquí...
  }
}
```

### Validar Configuración del Marketplace

```typescript
async checkMarketplace() {
  const validation = await this.marketplaceService.validateMarketplaceConfig();

  if (!validation.isValid) {
    console.error('Marketplace no configurado:', validation.errors);
    return;
  }

  console.log('Marketplace configurado:', validation.config);
}
```

### Verificar Onboarding del Usuario

```typescript
async checkUserOnboarding(userId: string) {
  const isComplete = await this.marketplaceService.isUserOnboardingComplete(userId);

  if (!isComplete) {
    this.showMPOnboardingModal();
    return false;
  }

  return true;
}
```

### Calcular Split de Pagos

```typescript
async calculatePayment(bookingAmount: number) {
  const split = this.marketplaceService.calculateSplitAmounts(bookingAmount);

  console.log('Total:', split.total);
  console.log('Fee plataforma:', split.platformFee);
  console.log('Monto para locador:', split.ownerAmount);

  return split;
}
```

### Obtener Collector ID del Usuario

```typescript
async getCollectorId(userId: string) {
  const collectorId = await this.marketplaceService.getUserCollectorId(userId);

  if (!collectorId) {
    throw new Error('Usuario no tiene collector ID');
  }

  return collectorId;
}
```

### Validar que un Auto tenga Collector ID

```typescript
async validateCar(carId: string) {
  const isValid = await this.marketplaceService.validateCarHasCollectorId(carId);

  if (!isValid) {
    console.error('Auto no tiene collector ID del dueño');
    return false;
  }

  return true;
}
```

---

## 🧪 Tests Unitarios

### Ejecutar Tests

```bash
cd apps/web
npm test -- --include='**/marketplace.service.spec.ts'
```

### Coverage

```bash
npm run test:coverage
```

### Tests Incluidos

1. ✅ Validación de configuración del marketplace
2. ✅ Cálculo de splits con diferentes fees
3. ✅ Verificación de onboarding de usuarios
4. ✅ Obtención de collector IDs
5. ✅ Validación de autos con collector ID

---

## 🚨 Troubleshooting

### Error: "MERCADOPAGO_MARKETPLACE_ID no está configurado"

**Solución:**
1. Verifica que `.env.local` existe
2. Confirma que la variable está definida en el archivo
3. Reinicia el servidor de desarrollo

### Error: "Access Token inválido"

**Solución:**
1. Verifica que estás usando el token correcto (prod vs test)
2. Revisa que no haya espacios al inicio/final del token
3. Genera un nuevo token en el panel de MP

### Error: "Marketplace no está habilitado en tu cuenta"

**Solución:**
1. Ve a https://www.mercadopago.com.ar/developers/panel/app
2. Activa la funcionalidad de Marketplace
3. Puede requerir aprobación de MercadoPago (1-3 días hábiles)

### Error: "collector_id is required"

**Solución:**
- El seller (dueño del auto) debe completar el onboarding de MP
- Usa `MarketplaceService.isUserOnboardingComplete()` para verificar

---

## 📚 Referencias

- [MercadoPago Split Payments](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/split-payments)
- [MercadoPago Marketplace](https://www.mercadopago.com.ar/developers/es/docs/marketplace/checkout-pro/introduction)
- [MercadoPago API Reference](https://www.mercadopago.com.ar/developers/es/reference)

---

## ✅ Checklist de Implementación

Antes de considerar el Paso 2 completo:

- [ ] Variables de entorno configuradas en `.env.local`
- [ ] Script de validación pasa sin errores
- [ ] Script de test de credenciales funciona
- [ ] `MarketplaceService` importado en la app
- [ ] Tests unitarios pasando
- [ ] Documentación leída y entendida

---

**Última actualización:** 2025-10-28
**Versión:** 1.0


---
# Source: REALTIME_ALERTING_SETUP.md

# Real-time Alerting System - Setup Guide

**Status**: ✅ Complete
**Issue**: #119 - Real-time Alerting Setup (PagerDuty/Opsgenie)
**Date**: 2025-11-07
**Priority**: P0 (Production Blocker)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Sentry Integration](#sentry-integration)
6. [PagerDuty Setup](#pagerduty-setup)
7. [Opsgenie Setup](#opsgenie-setup)
8. [Testing](#testing)
9. [Monitoring & Metrics](#monitoring--metrics)
10. [Troubleshooting](#troubleshooting)

---

## Overview

AutoRenta's real-time alerting system provides comprehensive monitoring and alerting across multiple channels:

### Key Features

✅ **Multi-Provider Alerting**
- PagerDuty for P0 critical alerts
- Opsgenie for P1 warnings
- Slack for all alerts
- Sentry integration for error tracking

✅ **SLA Compliance Tracking**
- MTTD (Mean Time To Detect): <5 minutes
- MTTR (Mean Time To Respond): <30 minutes
- False Positive Rate: <5%

✅ **Custom Alert Rules**
- Payment failures
- API degradation
- Database connection issues
- Authentication spikes
- Error rate spikes

✅ **On-Call Management**
- Escalation policies
- Weekly rotations
- Incident runbooks

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      AutoRenta Platform                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Frontend   │  │ Edge Functions│  │  Database    │         │
│  │   (Sentry)   │  │ (Health Checks)│  │  (Metrics)   │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                  │                   │
│         └─────────────────┴──────────────────┘                   │
│                           │                                      │
└───────────────────────────┼──────────────────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  Monitoring Alert Rules       │
            │  (Database Triggers)          │
            └───────────────┬───────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  Realtime Alerting Function   │
            │  (Multi-Provider Routing)     │
            └───────────────┬───────────────┘
                            │
         ┌──────────────────┼──────────────────┬──────────────┐
         │                  │                  │              │
         ▼                  ▼                  ▼              ▼
┌────────────────┐ ┌────────────────┐ ┌────────────┐ ┌─────────────┐
│  PagerDuty     │ │    Opsgenie    │ │   Slack    │ │   Sentry    │
│  (P0 Critical) │ │  (P1 Warnings) │ │  (All)     │ │  (Errors)   │
└────────────────┘ └────────────────┘ └────────────┘ └─────────────┘
         │                  │                  │              │
         └──────────────────┴──────────────────┴──────────────┘
                            │
                            ▼
                ┌──────────────────────────┐
                │   On-Call Engineers      │
                │   (Mobile/Email/SMS)     │
                └──────────────────────────┘
```

---

## Installation

### Step 1: Install Dependencies

```bash
cd /home/user/autorenta

# Install Sentry in Angular app
cd apps/web
npm install @sentry/angular@^8.42.0

# Back to root
cd ../..
```

### Step 2: Deploy Database Schema

```bash
# Apply SLA tracking and alert rules schema
supabase db execute -f database/realtime_alerting_setup.sql
```

### Step 3: Deploy Edge Functions

```bash
# Deploy enhanced alerting function
supabase functions deploy realtime-alerting

# Deploy existing monitoring functions (if not already deployed)
supabase functions deploy monitoring-health-check
supabase functions deploy monitoring-metrics
```

### Step 4: Setup Cron Jobs

Run this SQL in Supabase Dashboard (SQL Editor):

```sql
-- Health checks every 5 minutes
SELECT cron.schedule(
  'monitoring-health-check-every-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-health-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Alert processing every 2 minutes
SELECT cron.schedule(
  'realtime-alerting-every-2min',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://obxvffplochgeiclibng.supabase.co/functions/v1/realtime-alerting',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Alert rule evaluation every 10 minutes
SELECT cron.schedule(
  'alert-rules-evaluation-every-10min',
  '*/10 * * * *',
  $$
  SELECT monitoring_evaluate_alert_rules();
  $$
);
```

---

## Configuration

### Environment Variables

#### Angular Application

Add to Cloudflare Pages environment variables:

```bash
# Sentry Configuration
NG_APP_SENTRY_DSN=https://xxxxx@xxxxxx.ingest.sentry.io/xxxxxx
NG_APP_SENTRY_ENVIRONMENT=production
```

#### Supabase Edge Functions

Configure secrets:

```bash
# Sentry
supabase secrets set SENTRY_WEBHOOK_URL="https://sentry.io/api/hooks/xxxxx"

# Slack
supabase secrets set SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# PagerDuty
supabase secrets set PAGERDUTY_INTEGRATION_KEY="your-integration-key-here"

# Opsgenie
supabase secrets set OPSGENIE_API_KEY="your-api-key-here"

# Production URL (for health checks)
supabase secrets set PRODUCTION_URL="https://autorentar.com"
```

---

## Sentry Integration

### Step 1: Create Sentry Project

1. Go to https://sentry.io
2. Create new project: "autorenta-web"
3. Platform: Angular
4. Copy DSN

### Step 2: Configure Sentry

DSN is already configured in:
- `apps/web/src/main.ts` (initialization)
- `apps/web/src/app/core/services/logger.service.ts` (logging integration)
- `apps/web/src/environments/environment.ts` (configuration)

### Step 3: Set Environment Variable

```bash
# In Cloudflare Pages dashboard
NG_APP_SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[project]
```

### Step 4: Configure Alert Rules in Sentry

1. Go to Sentry Project Settings > Alerts
2. Create alert rule: "High Error Rate"
   - Metric: Error count
   - Threshold: > 10 errors in 5 minutes
   - Actions: Webhook → Supabase realtime-alerting function

3. Create alert rule: "New Error Type"
   - Condition: First seen
   - Actions: Webhook → Supabase realtime-alerting function

### Step 5: Test Sentry Integration

```typescript
// In your app, trigger a test error
import * as Sentry from '@sentry/angular';

Sentry.captureException(new Error('Test Sentry integration'));
```

---

## PagerDuty Setup

### Step 1: Create PagerDuty Account

1. Sign up at https://www.pagerduty.com/
2. Choose plan (Free trial or paid)

### Step 2: Create Service

1. Services > Service Directory > New Service
2. Name: "AutoRenta Production"
3. Integration Type: "Events API V2"
4. Escalation Policy: Create new (see below)
5. Copy **Integration Key**

### Step 3: Configure Escalation Policy

**Escalation Policy**: "AutoRenta On-Call"

```
Level 1: Primary On-Call Engineer
  - Notify immediately
  - Escalate after: 15 minutes

Level 2: Backup On-Call Engineer
  - Notify if not acknowledged
  - Escalate after: 15 minutes

Level 3: Engineering Manager
  - Notify if not resolved
  - Escalate after: 30 minutes
```

### Step 4: Create Schedules

1. People > On-Call Schedules > New Schedule
2. Name: "AutoRenta Primary On-Call"
3. Rotation: Weekly
4. Start: Monday 9:00 AM ART
5. Add team members

Repeat for "AutoRenta Backup On-Call"

### Step 5: Configure in Supabase

```bash
supabase secrets set PAGERDUTY_INTEGRATION_KEY="your-integration-key"
```

### Step 6: Test PagerDuty Integration

```bash
# Trigger test alert
curl -X POST "https://obxvffplochgeiclibng.supabase.co/functions/v1/realtime-alerting" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

---

## Opsgenie Setup

### Step 1: Create Opsgenie Account

1. Sign up at https://www.atlassian.com/software/opsgenie
2. Choose plan (Free trial or Standard)

### Step 2: Create Team

1. Teams > Create Team
2. Name: "AutoRenta Platform"
3. Add members

### Step 3: Create Integration

1. Settings > Integrations > Add Integration
2. Select: "API"
3. Name: "AutoRenta Monitoring"
4. Copy **API Key**

### Step 4: Configure Escalation

1. Teams > AutoRenta Platform > Escalations
2. Create new escalation:

```
Name: AutoRenta Critical Alerts

Step 1: Notify Primary On-Call
  - Wait: 5 minutes

Step 2: Notify Backup On-Call
  - Wait: 15 minutes

Step 3: Notify Engineering Manager
```

### Step 5: Configure in Supabase

```bash
supabase secrets set OPSGENIE_API_KEY="your-api-key"
```

### Step 6: Test Opsgenie Integration

Opsgenie will receive P1 warning alerts automatically via the routing rules in `realtime-alerting` function.

---

## Testing

### Test 1: End-to-End Alert Flow

```bash
# 1. Create test alert via SQL
psql $DATABASE_URL <<EOF
INSERT INTO monitoring_alerts (
  alert_type,
  severity,
  title,
  message,
  status
) VALUES (
  'payment_failure',
  'critical',
  'TEST: Payment Failure Alert',
  'This is a test alert for end-to-end testing',
  'active'
);
EOF

# 2. Wait 2 minutes for cron job to trigger

# 3. Verify in PagerDuty, Slack, Sentry
```

### Test 2: SLA Metrics

```bash
# Get SLA summary
curl "https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-metrics?action=sla_summary" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

Expected response:
```json
{
  "total_alerts": 1,
  "mttd_compliant": 1,
  "mttr_compliant": 0,
  "mttd_compliance_rate": 100.00,
  "avg_detection_time_ms": 120000
}
```

### Test 3: Alert Rules Evaluation

```bash
# Trigger alert rule evaluation
psql $DATABASE_URL -c "SELECT * FROM monitoring_evaluate_alert_rules();"
```

### Test 4: Sentry Error Tracking

```bash
# Deploy and test in browser console
window['Sentry'].captureException(new Error('Test error from console'));
```

Check Sentry dashboard for error.

---

## Monitoring & Metrics

### Real-time Dashboards

**Monitoring Dashboard**: https://autorentar.com/admin/monitoring

**Metrics Available**:
- Active alerts
- Alert trends (last 24h)
- SLA compliance rate
- MTTD/MTTR averages
- False positive rate
- Provider health status

### SLA Compliance Query

```sql
-- Get last 7 days SLA compliance
SELECT * FROM monitoring_get_sla_summary(168); -- 168 hours = 7 days
```

### Alert Rule Performance

```sql
-- See which rules are triggering most
SELECT
  rule_name,
  COUNT(*) as trigger_count,
  AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) as avg_resolution_time_sec
FROM monitoring_alerts a
JOIN monitoring_alert_rules r ON (a.metadata->>'rule_id')::UUID = r.id
WHERE a.created_at > NOW() - INTERVAL '7 days'
GROUP BY rule_name
ORDER BY trigger_count DESC;
```

### Provider Success Rates

```sql
-- Check notification success rate by provider
SELECT
  notification_channel,
  COUNT(*) as total_notifications,
  COUNT(*) FILTER (WHERE notification_status = 'sent') as successful,
  ROUND(
    COUNT(*) FILTER (WHERE notification_status = 'sent')::NUMERIC / COUNT(*) * 100,
    2
  ) as success_rate
FROM monitoring_alert_notifications
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY notification_channel;
```

---

## Troubleshooting

### Issue: Alerts not being sent

**Symptoms**: Alerts created but no notifications received

**Diagnosis**:
```bash
# Check if cron job is running
psql $DATABASE_URL -c "SELECT * FROM cron.job WHERE jobname LIKE '%alerting%';"

# Check Edge Function logs
# Supabase Dashboard > Edge Functions > realtime-alerting > Logs

# Check for failed notifications
psql $DATABASE_URL -c "
  SELECT * FROM monitoring_alert_notifications
  WHERE notification_status = 'failed'
  ORDER BY created_at DESC
  LIMIT 10;
"
```

**Fix**:
1. Verify secrets are set: `supabase secrets list`
2. Test webhook URLs manually
3. Check Edge Function deployment: `supabase functions deploy realtime-alerting`

### Issue: High false positive rate

**Symptoms**: Too many alerts, >5% marked as false positives

**Diagnosis**:
```sql
SELECT
  alert_type,
  COUNT(*) as total_alerts,
  COUNT(*) FILTER (WHERE is_false_positive = true) as false_positives,
  ROUND(
    COUNT(*) FILTER (WHERE is_false_positive = true)::NUMERIC / COUNT(*) * 100,
    2
  ) as false_positive_rate
FROM monitoring_sla_metrics m
JOIN monitoring_alerts a ON m.alert_id = a.id
WHERE m.created_at > NOW() - INTERVAL '7 days'
GROUP BY alert_type
HAVING COUNT(*) FILTER (WHERE is_false_positive = true) > 0
ORDER BY false_positive_rate DESC;
```

**Fix**:
1. Adjust alert rule thresholds
2. Increase cooldown period
3. Use spike detection instead of absolute thresholds

```sql
-- Example: Increase error threshold
UPDATE monitoring_alert_rules
SET threshold_value = 20  -- was 10
WHERE rule_name = 'error_rate_spike';
```

### Issue: MTTR SLA not met

**Symptoms**: Resolution time > 30 minutes consistently

**Diagnosis**:
```sql
SELECT
  alert_type,
  AVG(resolution_time_ms) / 1000 / 60 as avg_resolution_minutes,
  COUNT(*) FILTER (WHERE mttr_sla_met = false) as sla_violations
FROM monitoring_sla_metrics m
JOIN monitoring_alerts a ON m.alert_id = a.id
WHERE m.created_at > NOW() - INTERVAL '7 days'
  AND resolution_time_ms IS NOT NULL
GROUP BY alert_type
ORDER BY avg_resolution_minutes DESC;
```

**Fix**:
1. Review runbooks - ensure they're clear and actionable
2. Conduct incident drills
3. Add pre-built mitigation scripts
4. Check escalation policy - may need faster escalation

### Issue: Sentry not capturing errors

**Diagnosis**:
```bash
# Check if Sentry is initialized
# Browser console:
window['Sentry']

# Check environment variable
echo $NG_APP_SENTRY_DSN
```

**Fix**:
1. Verify `NG_APP_SENTRY_DSN` is set in Cloudflare Pages
2. Redeploy application
3. Check browser console for Sentry errors
4. Verify Sentry project quota not exceeded

---

## Success Metrics

### Deployment Checklist

- [ ] Sentry integrated and capturing errors
- [ ] PagerDuty configured with escalation policy
- [ ] Opsgenie configured for P1 alerts
- [ ] Slack notifications working
- [ ] Database schema deployed
- [ ] Edge Functions deployed
- [ ] Cron jobs configured and running
- [ ] Alert rules configured
- [ ] On-call rotation documented
- [ ] Runbooks created for all alert types
- [ ] Team trained on procedures
- [ ] Incident drill completed

### Target SLAs (After 30 Days)

- ✅ MTTD: < 5 minutes (90% compliance)
- ✅ MTTR: < 30 minutes (80% compliance)
- ✅ False Positive Rate: < 5%
- ✅ Alert Delivery: < 1 minute
- ✅ Provider Uptime: > 99.5%

---

## Related Documentation

- [On-Call Rotation](./runbooks/on-call-rotation.md)
- [Alert Response Runbooks](./runbooks/)
- [Monitoring System](./MONITORING_SYSTEM.md)
- [Production Readiness](./PRODUCTION_READINESS_AUDIT_2025-11-07.md)

---

**Document Owner**: Platform Engineering
**Last Updated**: 2025-11-07
**Next Review**: 2025-12-07


---
# Source: WALLET_SYSTEM.md

# 💰 Sistema de Wallet - AutoRenta

**Versión**: 1.0 FUNCIONAL ✅
**Fecha**: 2025-10-18
**Estado**: Producción

---

## 📋 Índice

1. [Descripción General](#descripción-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Flujo de Depósito Completo](#flujo-de-depósito-completo)
4. [Base de Datos](#base-de-datos)
5. [Edge Functions](#edge-functions)
6. [Frontend (Angular)](#frontend-angular)
7. [MercadoPago Integration](#mercadopago-integration)
8. [Troubleshooting](#troubleshooting)
9. [Testing](#testing)
10. [Próximos Pasos](#próximos-pasos)

---

## 🎯 Descripción General

El sistema de Wallet permite a los usuarios de AutoRenta:
- Depositar fondos mediante MercadoPago
- Ver balance disponible en tiempo real
- Realizar reservas usando fondos del wallet
- Ver historial de transacciones

### Características Principales

- ✅ Depósitos vía MercadoPago (ARS)
- ✅ Balance en tiempo real
- ✅ Transacciones con estados (pending, completed, failed)
- ✅ Webhooks IPN para confirmación automática
- ✅ Row Level Security (RLS) para seguridad
- ✅ Idempotencia en procesamiento de pagos

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                        USUARIO                               │
│                     (http://localhost:4200)                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ 1. Click "Depositar"
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   ANGULAR FRONTEND                           │
│                                                              │
│  • WalletComponent                                          │
│  • WalletService                                            │
│  • SupabaseClient                                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ 2. RPC: wallet_initiate_deposit()
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   SUPABASE DATABASE                          │
│                                                              │
│  • wallet_transactions (INSERT pending)                     │
│  • Returns: transaction_id                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ 3. POST /mercadopago-create-preference
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              SUPABASE EDGE FUNCTION                          │
│         mercadopago-create-preference                        │
│                                                              │
│  • Valida transacción                                       │
│  • Llama a MercadoPago API (fetch)                         │
│  • Retorna init_point                                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ 4. Redirect a checkout
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   MERCADOPAGO                                │
│                  Checkout Page                               │
│                                                              │
│  • Usuario ingresa datos de tarjeta                         │
│  • Completa pago                                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ 5. IPN Notification (POST)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              SUPABASE EDGE FUNCTION                          │
│            mercadopago-webhook                               │
│                                                              │
│  • Recibe IPN de MercadoPago                                │
│  • Consulta pago (fetch GET)                                │
│  • RPC: wallet_confirm_deposit()                            │
│  • Acredita fondos al usuario                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ 6. Redirect back_url success
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   ANGULAR FRONTEND                           │
│               /wallet?payment=success                        │
│                                                              │
│  • Muestra mensaje de éxito                                 │
│  • Actualiza balance                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flujo de Depósito Completo

### Paso 1: Usuario Inicia Depósito

**Frontend**: `WalletComponent`

```typescript
async depositFunds(amount: number) {
  // 1. Crear transacción pendiente en DB
  const { data, error } = await this.supabase.rpc('wallet_initiate_deposit', {
    p_amount: amount,
    p_currency: 'ARS',
    p_provider: 'mercadopago',
  });

  const transactionId = data.transaction_id;

  // 2. Llamar a Edge Function para crear preferencia MP
  const response = await this.supabase.functions.invoke(
    'mercadopago-create-preference',
    {
      body: {
        transaction_id: transactionId,
        amount: amount,
        description: 'Depósito a Wallet - AutoRenta',
      },
    }
  );

  // 3. Redirigir a checkout de MercadoPago
  window.location.href = response.data.init_point;
}
```

### Paso 2: Edge Function Crea Preferencia

**Edge Function**: `mercadopago-create-preference/index.ts`

```typescript
// Crear preferencia en MercadoPago
const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
  },
  body: JSON.stringify({
    items: [{
      title: description || 'Depósito a Wallet - AutoRenta',
      quantity: 1,
      unit_price: amount,
      currency_id: 'ARS', // IMPORTANTE: Siempre ARS en Argentina
    }],
    back_urls: {
      success: `${APP_BASE_URL}/wallet?payment=success&transaction_id=${transaction_id}`,
      failure: `${APP_BASE_URL}/wallet?payment=failure&transaction_id=${transaction_id}`,
      pending: `${APP_BASE_URL}/wallet?payment=pending&transaction_id=${transaction_id}`,
    },
    external_reference: transaction_id, // CRÍTICO: Vincular pago con transacción
    notification_url: `${SUPABASE_URL}/functions/v1/mercadopago-webhook`,
  }),
});
```

### Paso 3: Usuario Completa Pago en MercadoPago

- MercadoPago abre checkout
- Usuario ingresa datos de tarjeta de prueba:
  - Número: `5031 7557 3453 0604` (Mastercard aprobada)
  - Titular: `APRO`
  - Vencimiento: `11/25`
  - CVV: `123`
- MercadoPago procesa pago

### Paso 4: Webhook Confirma Pago

**Edge Function**: `mercadopago-webhook/index.ts`

```typescript
// 1. Recibir notificación IPN
const webhookPayload = await req.json();
// { type: 'payment', data: { id: '12345678' } }

// 2. Consultar detalles del pago
const mpResponse = await fetch(
  `https://api.mercadopago.com/v1/payments/${paymentId}`,
  {
    headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
  }
);

const paymentData = await mpResponse.json();

// 3. Verificar estado aprobado
if (paymentData.status !== 'approved') {
  return; // Ignorar si no está aprobado
}

// 4. Confirmar depósito en DB
const { data } = await supabase.rpc('wallet_confirm_deposit', {
  p_transaction_id: paymentData.external_reference,
  p_provider_transaction_id: paymentData.id.toString(),
  p_provider_metadata: {
    status: paymentData.status,
    payment_method_id: paymentData.payment_method_id,
    transaction_amount: paymentData.transaction_amount,
    // ... más metadata
  },
});

// 5. Fondos acreditados automáticamente
```

### Paso 5: Frontend Actualiza Balance

```typescript
// QueryParams: ?payment=success&transaction_id=xxx
ngOnInit() {
  this.route.queryParams.subscribe(params => {
    if (params['payment'] === 'success') {
      this.showSuccessMessage();
      this.refreshBalance(); // Actualiza balance desde DB
    }
  });
}
```

---

## 🗄️ Base de Datos

### Tabla: `wallet_transactions`

```sql
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'payment', 'refund', 'lock', 'unlock')),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'ARS',
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  provider VARCHAR(50), -- 'mercadopago', 'stripe', etc.
  provider_transaction_id VARCHAR(255),
  provider_metadata JSONB,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_status ON wallet_transactions(status);
CREATE INDEX idx_wallet_transactions_type ON wallet_transactions(type);
```

### Tabla: `user_wallets`

```sql
CREATE TABLE user_wallets (
  user_id UUID PRIMARY KEY REFERENCES profiles(id),
  balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(3) NOT NULL DEFAULT 'ARS',
  locked_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT positive_balance CHECK (balance >= 0),
  CONSTRAINT positive_locked_balance CHECK (locked_balance >= 0)
);
```

### RPC Functions

#### `wallet_initiate_deposit()`

```sql
CREATE OR REPLACE FUNCTION wallet_initiate_deposit(
  p_amount DECIMAL,
  p_currency VARCHAR DEFAULT 'ARS',
  p_provider VARCHAR DEFAULT 'mercadopago'
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_transaction_id UUID;
BEGIN
  -- Obtener user_id del usuario autenticado
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Validar monto
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Crear transacción pendiente
  INSERT INTO wallet_transactions (
    user_id,
    type,
    amount,
    currency,
    status,
    provider,
    description
  ) VALUES (
    v_user_id,
    'deposit',
    p_amount,
    p_currency,
    'pending',
    p_provider,
    'Deposit initiated'
  ) RETURNING id INTO v_transaction_id;

  -- Retornar transaction_id
  RETURN json_build_object(
    'transaction_id', v_transaction_id,
    'amount', p_amount,
    'currency', p_currency,
    'status', 'pending'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### `wallet_confirm_deposit()`

```sql
CREATE OR REPLACE FUNCTION wallet_confirm_deposit(
  p_transaction_id UUID,
  p_provider_transaction_id VARCHAR,
  p_provider_metadata JSONB
)
RETURNS JSON AS $$
DECLARE
  v_transaction RECORD;
  v_new_balance DECIMAL;
BEGIN
  -- Obtener transacción
  SELECT * INTO v_transaction
  FROM wallet_transactions
  WHERE id = p_transaction_id
    AND type = 'deposit'
  FOR UPDATE; -- Lock para evitar race conditions

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  -- Verificar que esté pendiente (idempotencia)
  IF v_transaction.status = 'completed' THEN
    -- Ya fue procesada, retornar éxito
    RETURN json_build_object(
      'success', true,
      'message', 'Transaction already completed'
    );
  END IF;

  IF v_transaction.status != 'pending' THEN
    RAISE EXCEPTION 'Transaction is not pending';
  END IF;

  -- Actualizar transacción
  UPDATE wallet_transactions
  SET
    status = 'completed',
    provider_transaction_id = p_provider_transaction_id,
    provider_metadata = p_provider_metadata,
    updated_at = NOW()
  WHERE id = p_transaction_id;

  -- Acreditar fondos al wallet
  INSERT INTO user_wallets (user_id, balance, currency)
  VALUES (v_transaction.user_id, v_transaction.amount, v_transaction.currency)
  ON CONFLICT (user_id) DO UPDATE
  SET
    balance = user_wallets.balance + v_transaction.amount,
    updated_at = NOW()
  RETURNING balance INTO v_new_balance;

  -- Retornar resultado
  RETURN json_build_object(
    'success', true,
    'transaction_id', p_transaction_id,
    'new_balance', v_new_balance,
    'amount_credited', v_transaction.amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### `wallet_get_balance()`

```sql
CREATE OR REPLACE FUNCTION wallet_get_balance()
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_wallet RECORD;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Obtener wallet o crear si no existe
  INSERT INTO user_wallets (user_id, balance, currency)
  VALUES (v_user_id, 0.00, 'ARS')
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_wallet
  FROM user_wallets
  WHERE user_id = v_user_id;

  RETURN json_build_object(
    'balance', v_wallet.balance,
    'locked_balance', v_wallet.locked_balance,
    'available_balance', v_wallet.balance - v_wallet.locked_balance,
    'currency', v_wallet.currency
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### RLS Policies

```sql
-- wallet_transactions: Users can view their own transactions
CREATE POLICY "Users can view own transactions"
ON wallet_transactions FOR SELECT
USING (user_id = auth.uid());

-- user_wallets: Users can view their own wallet
CREATE POLICY "Users can view own wallet"
ON user_wallets FOR SELECT
USING (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE directo - solo vía RPC functions
```

---

## ⚡ Edge Functions

### mercadopago-create-preference

**Ubicación**: `supabase/functions/mercadopago-create-preference/index.ts`

**Propósito**: Crear una preferencia de pago en MercadoPago para iniciar checkout.

**Variables de Entorno Requeridas**:
```bash
MERCADOPAGO_ACCESS_TOKEN=APP_USR-4340262352975191-101722-3fc884850841f34c6f83bd4e29b3134c-2302679571
SUPABASE_URL=https://obxvffplochgeiclibng.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
APP_BASE_URL=http://localhost:4200
```

**Request**:
```json
POST /functions/v1/mercadopago-create-preference
Authorization: Bearer <user-jwt>
Content-Type: application/json

{
  "transaction_id": "616cd44f-ff00-4cac-8c46-5be50154b985",
  "amount": 100,
  "description": "Depósito a Wallet - AutoRenta"
}
```

**Response**:
```json
{
  "success": true,
  "preference_id": "2302679571-6742c46e-f72e-4c4e-aabd-b9563333213d",
  "init_point": "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=...",
  "sandbox_init_point": "https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=..."
}
```

**Características Clave**:
- ✅ Token hardcodeado como fallback para testing
- ✅ Limpieza de token (trim + remove whitespace)
- ✅ Logging detallado para debugging
- ✅ Validación de transacción en DB
- ✅ Currency siempre ARS (requerido por MP Argentina)
- ✅ Sin auto_return (no funciona con HTTP localhost)

---

### mercadopago-webhook

**Ubicación**: `supabase/functions/mercadopago-webhook/index.ts`

**Propósito**: Recibir notificaciones IPN de MercadoPago y confirmar depósitos.

**Variables de Entorno Requeridas**:
```bash
MERCADOPAGO_ACCESS_TOKEN=APP_USR-4340262352975191-101722-3fc884850841f34c6f83bd4e29b3134c-2302679571
SUPABASE_URL=https://obxvffplochgeiclibng.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**Request** (desde MercadoPago):
```json
POST /functions/v1/mercadopago-webhook

{
  "id": 123456,
  "live_mode": false,
  "type": "payment",
  "date_created": "2025-10-18T12:00:00Z",
  "data": {
    "id": "12345678"
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "transaction_id": "616cd44f-ff00-4cac-8c46-5be50154b985",
  "payment_id": 12345678
}
```

**Características Clave**:
- ✅ Solo procesa notificaciones tipo "payment"
- ✅ Consulta detalles del pago a MP API
- ✅ Verifica status = 'approved'
- ✅ Idempotencia (ignora si ya completado)
- ✅ Retorna 200 siempre (evita reintentos de MP)
- ✅ Logging completo de payload y payment data

---

## 🎨 Frontend (Angular)

### WalletService

**Ubicación**: `apps/web/src/app/core/services/wallet.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class WalletService {
  private supabase = inject(SupabaseClientService).getClient();

  async getBalance(): Promise<WalletBalance> {
    const { data, error } = await this.supabase.rpc('wallet_get_balance');
    if (error) throw error;
    return data;
  }

  async depositFunds(amount: number): Promise<string> {
    // 1. Iniciar transacción
    const { data: txData, error: txError } = await this.supabase.rpc(
      'wallet_initiate_deposit',
      {
        p_amount: amount,
        p_currency: 'ARS',
        p_provider: 'mercadopago',
      }
    );

    if (txError) throw txError;

    const transactionId = txData.transaction_id;

    // 2. Crear preferencia de pago
    const { data: mpData, error: mpError } = await this.supabase.functions.invoke(
      'mercadopago-create-preference',
      {
        body: {
          transaction_id: transactionId,
          amount,
          description: 'Depósito a Wallet - AutoRenta',
        },
      }
    );

    if (mpError) throw mpError;

    // 3. Retornar URL de checkout
    return mpData.init_point;
  }

  async getTransactions(): Promise<WalletTransaction[]> {
    const { data, error } = await this.supabase
      .from('wallet_transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}
```

### WalletComponent

**Ubicación**: `apps/web/src/app/features/wallet/wallet.component.ts`

```typescript
export class WalletComponent implements OnInit {
  balance = signal<number>(0);
  transactions = signal<WalletTransaction[]>([]);
  depositAmount = signal<number>(100);

  async ngOnInit() {
    await this.loadBalance();
    await this.loadTransactions();
    this.handlePaymentCallback();
  }

  async loadBalance() {
    const balanceData = await this.walletService.getBalance();
    this.balance.set(balanceData.available_balance);
  }

  async onDeposit() {
    try {
      const checkoutUrl = await this.walletService.depositFunds(
        this.depositAmount()
      );
      window.location.href = checkoutUrl; // Redirect a MercadoPago
    } catch (error) {
      console.error('Error depositing funds:', error);
      this.showError('Error al procesar depósito');
    }
  }

  private handlePaymentCallback() {
    this.route.queryParams.subscribe(params => {
      if (params['payment'] === 'success') {
        this.showSuccess('Depósito exitoso');
        this.loadBalance();
        this.loadTransactions();
      } else if (params['payment'] === 'failure') {
        this.showError('Depósito fallido');
      }
    });
  }
}
```

---

## 💳 MercadoPago Integration

### Credenciales

**Access Token** (Testing):
```
APP_USR-4340262352975191-101722-3fc884850841f34c6f83bd4e29b3134c-2302679571
```

**Dashboard**: https://www.mercadopago.com.ar/developers/panel

### Tarjetas de Prueba

| Resultado | Número | Titular | CVV | Venc. |
|-----------|--------|---------|-----|-------|
| Aprobada | 5031 7557 3453 0604 | APRO | 123 | 11/25 |
| Rechazada | 5031 4332 1540 6351 | OTHE | 123 | 11/25 |

**Documentación**: https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-cards

### Estados de Pago

| Estado | Descripción | Acción |
|--------|-------------|--------|
| `approved` | Pago aprobado | Acreditar fondos |
| `pending` | Pendiente | Esperar |
| `in_process` | En proceso | Esperar |
| `rejected` | Rechazado | Marcar como fallido |
| `cancelled` | Cancelado | Marcar como fallido |

### Webhook Configuration

**URL**: `https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook`

**Panel de MercadoPago**:
1. Ir a: https://www.mercadopago.com.ar/developers/panel/app
2. Click en tu aplicación
3. "Webhooks" → "Configurar notificaciones"
4. URL de notificación: `https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook`
5. Eventos: ✅ Pagos

---

## 🔧 Troubleshooting

### Error: `invalid_token`

**Problema**: MercadoPago rechaza el access token.

**Causas Comunes**:
1. Secret en Supabase tiene caracteres extra (espacios, saltos de línea, URLs)
2. Token expirado o revocado
3. Token de producción usado en modo sandbox (o viceversa)

**Solución**:
```typescript
// La función ya limpia el token automáticamente
MP_ACCESS_TOKEN = MP_ACCESS_TOKEN.trim().replace(/[\r\n\t\s]/g, '');
```

**Verificar en logs**:
```
MP_ACCESS_TOKEN length: 75  ✅ (correcto)
MP_ACCESS_TOKEN length: 109 ❌ (tiene caracteres extra)
```

### Error: `currency_id invalid`

**Problema**: MercadoPago rechaza la moneda.

**Causa**: Usando USD en lugar de ARS.

**Solución**:
```typescript
currency_id: 'ARS', // Siempre ARS en Argentina
```

### Error: `new row violates row-level security policy`

**Problema**: No se puede insertar/actualizar en `wallet_transactions`.

**Causa**: Intentando hacer INSERT/UPDATE directo en lugar de usar RPC.

**Solución**:
```typescript
// ❌ NO HACER:
await supabase.from('wallet_transactions').insert({...});

// ✅ HACER:
await supabase.rpc('wallet_initiate_deposit', {...});
```

### Error: `Transaction already completed`

**Problema**: Webhook intenta procesar un pago ya confirmado.

**Causa**: MercadoPago reintenta notificaciones si no recibe 200.

**Solución**: Esto es normal y esperado (idempotencia). El webhook retorna éxito sin procesar de nuevo.

### Error: `BOOT_ERROR`

**Problema**: La Edge Function no arranca.

**Causas Comunes**:
1. Syntax error en TypeScript
2. Import duplicado
3. Código duplicado en el archivo

**Solución**: Verificar logs en Dashboard de Supabase y corregir el error reportado.

---

## 🧪 Testing

### Test Manual Completo

1. **Preparación**:
   ```bash
   cd /home/edu/autorenta/apps/web
   npm run start
   ```

2. **Abrir app**: http://localhost:4200

3. **Login**: Usar cuenta de test

4. **Ir a Wallet**: http://localhost:4200/wallet

5. **Depositar fondos**:
   - Click en "Depositar"
   - Ingresar monto: 100 ARS
   - Click en "Continuar"

6. **Completar pago en MercadoPago**:
   - Tarjeta: `5031 7557 3453 0604`
   - Titular: `APRO`
   - Vencimiento: `11/25`
   - CVV: `123`
   - Click en "Pagar"

7. **Verificar redirect**: Deberías volver a `/wallet?payment=success`

8. **Verificar balance**: Balance debe aumentar en 100 ARS

### Test con Script Python

```bash
cd /home/edu/autorenta
python3 test_complete_payment.py
```

**Qué hace el script**:
1. Crea transacción vía Edge Function
2. Abre checkout de MercadoPago con Playwright
3. Llena datos de tarjeta automáticamente
4. Completa el pago
5. Espera redirect a success
6. Verifica transacción en DB

### Verificar en Base de Datos

```sql
-- Ver transacciones recientes
SELECT id, user_id, type, amount, status, created_at
FROM wallet_transactions
ORDER BY created_at DESC
LIMIT 10;

-- Ver balance de un usuario
SELECT * FROM user_wallets
WHERE user_id = 'user-uuid-here';

-- Ver transacción específica
SELECT * FROM wallet_transactions
WHERE id = 'transaction-id-here';
```

---

## 🚀 Próximos Pasos

### Funcionalidades Pendientes

- [ ] **Retiros**: Permitir retirar fondos a cuenta bancaria
- [ ] **Lock/Unlock**: Bloquear fondos durante reservas
- [ ] **Reembolsos**: Procesar devoluciones de pagos
- [ ] **Historial detallado**: Filtros y paginación en transacciones
- [ ] **Notificaciones**: Email/push cuando se acreditan fondos
- [ ] **Múltiples monedas**: Soporte para USD, EUR, etc.
- [ ] **Límites**: Límites diarios/mensuales de depósito
- [ ] **KYC**: Verificación de identidad para montos altos

### Mejoras Técnicas

- [ ] **Tests automatizados**: Unit tests + E2E tests
- [ ] **Webhook signature**: Validar que IPN viene de MercadoPago
- [ ] **Idempotency key**: KV namespace para deduplicación
- [ ] **Rate limiting**: Limitar requests a Edge Functions
- [ ] **Monitoring**: Alertas de errores en producción
- [ ] **Logs centralizados**: Datadog/Sentry integration
- [ ] **Backup automático**: DB backups diarios

### Migración a Producción

- [ ] **Credenciales de producción**: Access token de producción MP
- [ ] **SSL/HTTPS**: Dominio con certificado
- [ ] **auto_return**: Habilitar con HTTPS
- [ ] **Webhook en producción**: Actualizar URL en MP panel
- [ ] **Testing en staging**: Probar flujo completo antes de prod
- [ ] **Rollback plan**: Plan de contingencia si algo falla

---

## 📚 Referencias

- [MercadoPago Checkout Pro](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/landing)
- [MercadoPago IPN/Webhooks](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/your-integrations/notifications)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Functions](https://www.postgresql.org/docs/current/sql-createfunction.html)

---

## 📝 Changelog

### 2025-10-18 - v1.0 FUNCIONAL ✅

- ✅ Sistema de depósito completo implementado
- ✅ MercadoPago integration funcionando
- ✅ Webhooks IPN procesando correctamente
- ✅ Frontend con balance en tiempo real
- ✅ RLS policies configuradas
- ✅ Token hardcodeado como fallback (temporal)
- ✅ Logging detallado para debugging
- ✅ Documentación completa

**Issues Resueltos**:
- 🐛 Token con caracteres extra (limpieza automática)
- 🐛 Currency USD → ARS
- 🐛 auto_return removido (HTTP localhost)
- 🐛 BOOT_ERROR por código duplicado

---

**Estado Final**: ✅ SISTEMA FUNCIONAL Y DOCUMENTADO

**Mantenido por**: AutoRenta Dev Team
**Última actualización**: 2025-10-18

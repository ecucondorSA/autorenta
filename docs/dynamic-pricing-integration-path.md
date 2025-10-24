# Dynamic Pricing Integration Path

## Status Actual

### ✅ Lo que existe
- **Tablas**: Sistema completo de factorización (día, hora, usuario, demanda, eventos)
- **RPC Function**: `calculate_dynamic_price()` en Postgres
- **Edge Function**: API REST `/calculate-dynamic-price`
- **Frontend Service**: `DynamicPricingService` con métodos completos
- **Uso actual**: Solo para cotizaciones y visualización (mapas, tarjetas de autos)

### ❌ El gap
- **No se usa en `request_booking`**: La reserva se crea con `price_per_day` fijo del auto
- **No se usa en `pricing_recalculate`**: El recálculo usa `price_per_day` sin considerar factores dinámicos
- **Resultado**: Los usuarios ven precios dinámicos en la búsqueda, pero pagan precio fijo al reservar

## Arquitectura Propuesta

### Flujo de Integración

```
1. Usuario busca auto
   ↓
2. Frontend muestra precio dinámico (YA FUNCIONA)
   - Usa DynamicPricingService.getQuickPrice()
   - Muestra badge de surge/descuento
   ↓
3. Usuario selecciona fechas y solicita reserva
   ↓
4. **NUEVO**: quote_booking usa dynamic pricing
   - Llama calculate_dynamic_price() ANTES de quote_booking
   - Sobrescribe price_per_day temporalmente
   - Guarda pricing_calculation_id en booking
   ↓
5. **NUEVO**: request_booking crea reserva con precio dinámico
   - Recibe dynamic_price_override como parámetro opcional
   - Si existe, usa dynamic price en lugar de car.price_per_day
   - Marca booking con flag has_dynamic_pricing = true
   ↓
6. pricing_recalculate usa precio ya calculado
   - Lee el precio del breakdown guardado
   - Aplica service fee (23%)
```

### Cambios Requeridos

#### 1. Modificar `request_booking` RPC
```sql
-- Agregar parámetro opcional para dynamic pricing
CREATE OR REPLACE FUNCTION public.request_booking(
  p_car_id UUID,
  p_renter_id UUID,
  p_start_at TIMESTAMPTZ,
  p_end_at TIMESTAMPTZ,
  p_payment_method TEXT DEFAULT NULL,
  p_dynamic_price_per_day DECIMAL(10,2) DEFAULT NULL,  -- NUEVO
  p_pricing_calculation_id UUID DEFAULT NULL            -- NUEVO (para auditoría)
)
```

**Lógica**:
- Si `p_dynamic_price_per_day` existe → usar ese precio
- Si no → usar `car.price_per_day` (comportamiento actual)
- Guardar `p_pricing_calculation_id` en booking para auditoría

#### 2. Agregar campos a tabla `bookings`
```sql
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS
  has_dynamic_pricing BOOLEAN DEFAULT false,
  pricing_calculation_id UUID REFERENCES public.pricing_calculations(id),
  dynamic_price_per_day DECIMAL(10,2);
```

#### 3. Modificar frontend `quote_booking` call

**Antes (actual)**:
```typescript
const quote = await this.pricing.quoteBooking(carId, startAt, endAt);
```

**Después (con dynamic pricing)**:
```typescript
// 1. Calcular precio dinámico
const dynamicPrice = await this.dynamicPricing.calculatePrice({
  region_id: car.region_id,
  rental_start: startAt.toISOString(),
  rental_hours: calculateHours(startAt, endAt),
  car_id: carId
});

// 2. Obtener quote con precio dinámico
const quote = await this.pricing.quoteBooking(
  carId,
  startAt,
  endAt,
  dynamicPrice.price_per_hour * 24 // Convertir a price_per_day
);
```

#### 4. Modificar `BookingsService.createBooking()`
```typescript
async createBooking(params: CreateBookingParams): Promise<Booking> {
  let dynamicPriceOverride: number | undefined;
  let pricingCalculationId: string | undefined;

  // Si el auto tiene region_id → usar dynamic pricing
  if (params.car.region_id && params.enableDynamicPricing !== false) {
    const rentalHours = calculateHours(params.startAt, params.endAt);

    const dynamicPrice = await this.dynamicPricing.calculatePrice({
      region_id: params.car.region_id,
      rental_start: params.startAt.toISOString(),
      rental_hours: rentalHours,
      car_id: params.carId
    });

    // Convertir price_per_hour a price_per_day
    dynamicPriceOverride = dynamicPrice.price_per_hour * 24;
    pricingCalculationId = dynamicPrice.calculation_id; // Asumiendo que lo retorna
  }

  // Llamar request_booking con override
  const { data, error } = await this.supabase.rpc('request_booking', {
    p_car_id: params.carId,
    p_renter_id: params.userId,
    p_start_at: params.startAt.toISOString(),
    p_end_at: params.endAt.toISOString(),
    p_payment_method: params.paymentMethod || null,
    p_dynamic_price_per_day: dynamicPriceOverride,
    p_pricing_calculation_id: pricingCalculationId
  });

  // ...resto del código
}
```

## Consideraciones

### Ventajas
1. **Transparencia**: Usuario ve el precio que pagará
2. **Auditoría**: Cada reserva tiene referencia a su cálculo de precio
3. **Optimización de ingresos**: Precios altos en demanda alta
4. **Descuentos automáticos**: Precios bajos en horarios off-peak
5. **Compatibilidad**: Si no hay region_id → usa precio fijo (backward compatible)

### Desventajas
1. **Complejidad**: Más lógica en el flujo de reserva
2. **Latency**: Dos calls en lugar de uno (dynamic price + request_booking)
3. **Consistencia**: Precio puede cambiar entre quote y booking (race condition)

### Mitigación de race condition

**Problema**: Usuario ve precio X, pero al reservar el precio cambió a Y

**Solución 1 - Price Lock (Recomendado)**:
```sql
-- Agregar a pricing_calculations
ALTER TABLE public.pricing_calculations ADD COLUMN
  locked_until TIMESTAMPTZ,
  locked_for_user_id UUID;

-- Cuando se hace quote → lockear precio por 15 minutos
UPDATE pricing_calculations
SET locked_until = NOW() + INTERVAL '15 minutes',
    locked_for_user_id = p_user_id
WHERE id = p_calculation_id;

-- En request_booking → validar lock
IF calculation.locked_until > NOW()
   AND calculation.locked_for_user_id = p_renter_id THEN
   -- Usar precio lockeado
   v_price := calculation.final_price;
ELSE
   -- Precio expiró → recalcular o rechazar
   RAISE EXCEPTION 'Price expired, please refresh quote';
END IF;
```

**Solución 2 - Grace Period (Más simple)**:
```typescript
// Frontend verifica diferencia de precio
if (Math.abs(finalPrice - quotedPrice) / quotedPrice > 0.05) { // 5% diferencia
  // Mostrar alerta al usuario
  const confirm = await showPriceChangeDialog(quotedPrice, finalPrice);
  if (!confirm) {
    throw new Error('User cancelled due to price change');
  }
}
```

## Implementación Gradual

### Fase 1 - Foundation (1-2 días)
- [ ] Agregar campos a `bookings` table
- [ ] Modificar `request_booking` para aceptar dynamic price override
- [ ] Testing con datos mock

### Fase 2 - Backend Integration (2-3 días)
- [ ] Implementar price lock en `pricing_calculations`
- [ ] Modificar `calculate_dynamic_price` RPC para retornar calculation_id
- [ ] Edge Function debe guardar calculation con lock
- [ ] Testing de locks y expiración

### Fase 3 - Frontend Integration (3-4 días)
- [ ] Modificar `BookingsService.createBooking()` para llamar dynamic pricing
- [ ] Actualizar UI de quote para mostrar breakdown dinámico
- [ ] Implementar grace period dialog para cambios de precio
- [ ] Testing E2E del flujo completo

### Fase 4 - Monitoring & Rollout (1-2 días)
- [ ] Dashboard de admin para ver pricing calculations
- [ ] Alertas si surge_factor > 1.5 (posible error)
- [ ] A/B testing: 50% con dynamic, 50% sin dynamic
- [ ] Análisis de conversión y revenue

## Configuración Regional

### Activación por región
```sql
ALTER TABLE public.pricing_regions ADD COLUMN
  enforce_dynamic_pricing BOOLEAN DEFAULT false;

-- Activar solo para Buenos Aires inicialmente
UPDATE pricing_regions
SET enforce_dynamic_pricing = true
WHERE country_code = 'AR' AND name = 'Buenos Aires';
```

### Feature flag en frontend
```typescript
// environment.ts
export const environment = {
  features: {
    dynamicPricing: true,
    dynamicPricingRegions: ['buenos-aires-region-uuid']
  }
};

// En el servicio
if (!environment.features.dynamicPricing) {
  return null; // Usar precio fijo
}

if (!environment.features.dynamicPricingRegions.includes(car.region_id)) {
  return null; // Región no habilitada
}
```

## Métricas de Éxito

### KPIs a monitorear
1. **Revenue per booking**: Comparar dynamic vs fixed
2. **Conversion rate**: % usuarios que completan reserva
3. **Price volatility**: Cuánto varían los precios
4. **User complaints**: Tickets sobre precios "injustos"
5. **Booking distribution**: Shifts de horarios off-peak
6. **Average surge multiplier**: Promedio de multiplicador aplicado

### Dashboard queries
```sql
-- Revenue comparison
SELECT
  has_dynamic_pricing,
  COUNT(*) as bookings_count,
  AVG(total_cents / 100.0) as avg_booking_value,
  SUM(total_cents / 100.0) as total_revenue
FROM bookings
WHERE status = 'completed'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY has_dynamic_pricing;

-- Price volatility
SELECT
  region_id,
  AVG(final_price) as avg_price,
  STDDEV(final_price) as price_stddev,
  MIN(final_price) as min_price,
  MAX(final_price) as max_price
FROM pricing_calculations
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY region_id;

-- Surge distribution
SELECT
  CASE
    WHEN demand_factor <= 0 THEN 'Discount'
    WHEN demand_factor <= 0.15 THEN 'Normal'
    WHEN demand_factor <= 0.30 THEN 'Moderate Surge'
    ELSE 'High Surge'
  END as surge_level,
  COUNT(*) as calculation_count
FROM pricing_calculations
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY surge_level;
```

## Rollback Plan

Si dynamic pricing causa problemas:

1. **Immediate** (< 5 min):
   ```typescript
   // En environment.ts
   dynamicPricing: false
   ```

2. **Database** (< 15 min):
   ```sql
   UPDATE pricing_regions SET enforce_dynamic_pricing = false;
   ```

3. **Revert migrations** (< 30 min):
   - Rollback de cambios en `request_booking`
   - No es necesario quitar campos de bookings (compatibles con código viejo)

## Conclusión

Dynamic pricing está **80% implementado** (infraestructura completa), solo falta la integración con el flujo de reserva. El camino más seguro es:

1. Implementar price lock para evitar race conditions
2. Gradual rollout por región (Buenos Aires primero)
3. Monitoreo intensivo de conversion rate
4. A/B testing para validar revenue uplift

**Tiempo estimado total**: 7-11 días de desarrollo + 2 semanas de monitoring

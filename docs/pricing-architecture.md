# Arquitectura de precios – Investigación

## 1. Flujo general
- **Publicación del auto** → el propietario define `price_per_day` y moneda (`public.cars.price_per_day`, `currency`).  
- **Override puntual** → tabla `public.pricing_overrides` permite fijar un precio por día (fecha específica).  
- **Promociones** → tabla `public.promos` admite porcentaje o monto fijo aplicado en `quote_booking`.  
- **Reserva**  
  1. Frontend llama `PricingService.quoteBooking()` → RPC `public.quote_booking` calcula subtotal, promo, `service_fee` (23 %) y total.  
  2. `request_booking` crea la reserva con el precio del auto (`price_per_day * días`).  
  3. `pricing_recalculate` (trigger post-booking) recalcula `breakdown` agregando la fee (23 %) y determina depósito en centavos.  
  4. Datos resultantes quedan en `bookings.*_cents` (subtotal, fees, discounts, deposit, total).

## 2. Capas de acceso (frontend)
- `apps/web/src/app/core/services/pricing.service.ts` – invoca `quote_booking` y `cancel_with_fee`.  
- `apps/web/src/app/core/services/dynamic-pricing.service.ts` – wrapper para Edge Function `calculate-dynamic-price`.  
- `apps/web/src/app/features/bookings/checkout/checkout.page.ts` – usa `PricingService`, recalcula depósito mínimo y muestra desglose.  
- `apps/web/src/app/features/bookings/booking-detail/booking-detail.page.ts` – renderiza `booking.breakdown` y aplica reglas UI (ej. mínimo USD 300 para créditos de seguridad).

## 3. Detalles de cálculo
- **Subtotal**: `price_per_day` (o override) × días (mínimo 1).  
- **Service fee**: 23 % del subtotal (ver `public.pricing_recalculate`, línea ~99).  
- **Depósito (backend)**:  
  ```plpgsql
  CASE payment_method
    WHEN 'wallet' THEN 25000  -- USD 250
    WHEN 'partial_wallet' THEN 50000
    WHEN 'credit_card' THEN 50000
    ELSE COALESCE(deposit_amount_cents, 50000)
  END;
  ```
  Frontend eleva a **USD 300** cuando la garantía depende de wallet (`CheckoutPage` y `BookingDetailPage`). *↯ Riesgo*: backend sigue usando USD 250 → revisar si se necesita alinear.  
- **Promos**: `quote_booking` aplica `promos.percent_off` o `amount_off`.  
- **FGO**: Aporte α % del depósito en `fgo_contribute_from_deposit` (`20251022_create_fgo_system.sql`); α inicial = 15 %.

## 4. Dynamic pricing (opcional)
- Tabla base `public.pricing_regions` (`setup-dynamic-pricing.sql`).  
- Factorización:
  - `pricing_day_factors` (día de semana).  
  - `pricing_hour_factors` (tramos horarios).  
  - `pricing_user_factors` (nuevo, frecuente, verificado).  
  - `pricing_demand_snapshots` (ratio demanda, actualizada por `update_demand_snapshot`).  
  - `pricing_special_events` (sumatoria de factores).  
- RPC `public.calculate_dynamic_price` combina factores (clamp 0.8x–1.6x, redondeo a 0.10).  
- Edge Function `supabase/functions/calculate-dynamic-price/index.ts` expone API REST, añade mensajes de surge/discount y opcionalmente loguea en `pricing_calculations`.

## 5. Rutas relevantes
- SQL principal:  
  - `supabase/migrations/20251016_create_core_tables.sql` → `request_booking`, `quote_booking`.  
  - `supabase/migrations/20251016_add_booking_pricing_breakdown.sql` → breakdown + depósito.  
  - `apps/web/database/setup-dynamic-pricing.sql` → configuración dinámica.  
  - `supabase/migrations/20251022_create_fgo_system.sql` → aportes α desde depósito.  
- Frontend:  
  - `core/services/pricing.service.ts`, `dynamic-pricing.service.ts`.  
  - `features/bookings/checkout/checkout.page.ts` & `.html`.  
  - `features/bookings/booking-detail/booking-detail.page.ts` & `.html` (render de breakdown y warning banners).

## 6. Observaciones / gaps
- Backend mantiene mínimo de **USD 250** para depósitos wallet (`pricing_recalculate`) mientras la UI usa **USD 300** → decidir si sincronizar.  
- Service fee fija (23 %); configurable sólo editando SQL.  
- Dynamic pricing coexistencia: `price_per_day` sigue siendo la base para reservas creadas; la función dinámica devuelve `price_per_hour`, pero no hay integración directa con `request_booking` todavía (se usa para cotizaciones y dashboards).

## 7. Platform Config (NEW 2025-10-24)
- **Tabla**: `public.platform_config` - Centraliza constantes de plataforma
- **Funciones helper**: `config_get_number()`, `config_get_string()`, `config_get_boolean()`, `config_get_json()`
- **Frontend service**: `PlatformConfigService` - Acceso type-safe a configuración
- **Valores configurables**:
  - `pricing.service_fee_percent` (default: 23%)
  - `deposit.wallet.usd` (default: 300)
  - `deposit.partial_wallet.usd` (default: 500)
  - `deposit.credit_card.usd` (default: 500)
  - `booking.pending_expiration_minutes` (default: 30)
  - Y más... ver migración `20251024_create_platform_config.sql`

## 8. Fixes aplicados (2025-10-24)
- ✅ Backend actualizado a **USD 300** para depósitos wallet (alineado con frontend)
- ✅ Service fee (23%) ahora configurable en tabla `platform_config`
- ✅ Depósitos configurables por método de pago en `platform_config`
- ✅ `pricing_recalculate` actualizado para usar config en lugar de valores hardcoded
- ℹ️ Dynamic pricing integration pendiente - ver `docs/dynamic-pricing-integration-path.md`

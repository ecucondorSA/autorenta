# 🔍 AUDITORÍA: Valores Hardcoded Encontrados

## ❌ PROBLEMAS ENCONTRADOS

### 1. **exchange-rate.service.ts**
```typescript
// LÍNEA 50
private readonly FALLBACK_RATE = 1015.0; // ❌ HARDCODED
```

### 2. **fx.service.ts**
```typescript
// LÍNEA 200
return 1700; // ❌ HARDCODED como fallback
```

### 3. **car-detail.page.ts**
```typescript
// LÍNEA 43
readonly currentFxRate = signal<number>(1000); // ❌ HARDCODED default
```

### 4. **booking-detail-payment.page.ts**
```typescript
// LÍNEA 275, 288, 397
vehicleValueUsd: vehicleValueUsd ? parseInt(vehicleValueUsd, 10) : 15000, // ❌ HARDCODED
```

### 5. **Scripts de migración (NO usar)**
- migrate-pricing-usd.ts
- database/migrations/20251027_pricing_usd_based.sql
- PRICING_STRATEGY_USD_BASED.md
- PRICING_USD_IMPLEMENTATION_STEPS.md

**ACCIÓN**: Eliminar estos archivos, no los vamos a usar.

---

## ✅ SOLUCIÓN

### Regla: **NUNCA usar valores hardcoded, SIEMPRE consultar la DB**

```typescript
// ❌ MAL
const rate = 1700;

// ✅ BIEN
const rate = await this.exchangeRateService.getPlatformRate('USDTARS');

// ✅ TAMBIÉN BIEN (con fallback dinámico)
const { data } = await supabase
  .from('exchange_rates')
  .select('platform_rate')
  .eq('pair', 'USDTARS')
  .eq('is_active', true)
  .single();

const rate = data?.platform_rate || await fetchFromBinanceDirectly();
```

---

## 📋 ARCHIVOS A CORREGIR

1. ✅ apps/web/src/app/core/services/exchange-rate.service.ts
2. ✅ apps/web/src/app/core/services/fx.service.ts  
3. ✅ apps/web/src/app/features/cars/detail/car-detail.page.ts
4. ✅ apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts

## 🗑️ ARCHIVOS A ELIMINAR

- migrate-pricing-usd.ts
- database/migrations/20251027_pricing_usd_based.sql (mover a docs/)
- PRICING_STRATEGY_USD_BASED.md (mover a docs/)
- PRICING_USD_IMPLEMENTATION_STEPS.md (mover a docs/)

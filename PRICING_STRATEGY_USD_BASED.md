# 🚗 Sistema de Precios Estandarizados por Valor del Vehículo

## 📋 Concepto

Los precios de alquiler se calcularán automáticamente según:
1. **Valor del vehículo en USD** (dato fijo en la DB)
2. **Tasa de cambio actual** (Binance API)
3. **Fórmula de pricing estandarizada**

## 💰 Fórmula de Pricing

### Tasa Diaria Base (USD)
```
daily_rate_usd = vehicle_value_usd × daily_rate_percentage
```

### Porcentajes Recomendados por Segmento

| Segmento | Valor Vehículo | % Diario | Ejemplo |
|----------|----------------|----------|---------|
| Económico | $8,000 - $15,000 | 0.30% - 0.40% | $12k → $36-48/día |
| Compacto | $15,000 - $25,000 | 0.25% - 0.35% | $20k → $50-70/día |
| Sedán | $25,000 - $40,000 | 0.20% - 0.30% | $30k → $60-90/día |
| SUV Estándar | $40,000 - $60,000 | 0.18% - 0.25% | $50k → $90-125/día |
| SUV Premium | $60,000 - $100,000 | 0.15% - 0.20% | $80k → $120-160/día |
| Lujo | $100,000+ | 0.10% - 0.15% | $150k → $150-225/día |

### Ajustes Adicionales

**Por Antigüedad del Vehículo**:
```typescript
const age = currentYear - vehicle.year;
const ageDiscount = Math.min(age * 0.05, 0.30); // Máximo 30% descuento
adjusted_rate = base_rate × (1 - ageDiscount);
```

**Por Kilometraje**:
```typescript
const kmFactor = vehicle.kilometers / 100000; // Por cada 100k km
const kmDiscount = Math.min(kmFactor * 0.10, 0.20); // Máximo 20%
adjusted_rate = base_rate × (1 - kmDiscount);
```

**Por Demanda (Opcional)**:
```typescript
// Si el auto se alquila mucho, subir precio
const bookingRate = completed_bookings / days_since_published;
const demandBonus = bookingRate > 0.5 ? 0.10 : 0; // +10% si alta demanda
adjusted_rate = base_rate × (1 + demandBonus);
```

## 🗂️ Cambios en Base de Datos

### Tabla `cars` - Nuevas Columnas

```sql
ALTER TABLE cars 
ADD COLUMN IF NOT EXISTS value_usd INTEGER, -- Valor del vehículo en USD
ADD COLUMN IF NOT EXISTS daily_rate_percentage DECIMAL(4,3) DEFAULT 0.003, -- 0.3%
ADD COLUMN IF NOT EXISTS pricing_strategy VARCHAR(20) DEFAULT 'standard', -- standard, premium, economy
ADD COLUMN IF NOT EXISTS price_override_ars INTEGER, -- Override manual (opcional)
ADD COLUMN IF NOT EXISTS last_price_update TIMESTAMPTZ DEFAULT NOW();

-- Índices para optimizar queries
CREATE INDEX IF NOT EXISTS idx_cars_value_usd ON cars(value_usd);
CREATE INDEX IF NOT EXISTS idx_cars_pricing_strategy ON cars(pricing_strategy);

-- Comentarios
COMMENT ON COLUMN cars.value_usd IS 'Valor de mercado del vehículo en USD';
COMMENT ON COLUMN cars.daily_rate_percentage IS 'Porcentaje diario del valor del vehículo (0.003 = 0.3%)';
COMMENT ON COLUMN cars.price_override_ars IS 'Precio manual en ARS (opcional, si NULL se calcula automáticamente)';
```

### Valores Iniciales para Autos Existentes

```sql
-- Chevrolet Cruze 2025: Valor aprox $18,000 USD
UPDATE cars 
SET value_usd = 18000, 
    daily_rate_percentage = 0.0030 -- 0.30%
WHERE model ILIKE '%cruze%' AND year >= 2023;

-- Chevrolet Onix 2023: Valor aprox $15,000 USD
UPDATE cars 
SET value_usd = 15000,
    daily_rate_percentage = 0.0035 -- 0.35%
WHERE model ILIKE '%onix%';

-- Nissan Versa 2021: Valor aprox $14,000 USD
UPDATE cars 
SET value_usd = 14000,
    daily_rate_percentage = 0.0035
WHERE model ILIKE '%versa%';

-- Renault Sandero Stepway: Valor aprox $19,000 USD
UPDATE cars 
SET value_usd = 19000,
    daily_rate_percentage = 0.0032
WHERE model ILIKE '%sandero%';

-- Hyundai Creta 2022: Valor aprox $25,000 USD
UPDATE cars 
SET value_usd = 25000,
    daily_rate_percentage = 0.0028
WHERE model ILIKE '%creta%' AND year = 2022;

-- Hyundai Creta 2025: Valor aprox $32,000 USD
UPDATE cars 
SET value_usd = 32000,
    daily_rate_percentage = 0.0026
WHERE model ILIKE '%creta%' AND year >= 2025;
```

## 🔧 Servicio de Cálculo Automático

### `apps/web/src/app/core/services/dynamic-pricing.service.ts`

Ya existe pero hay que modificarlo para usar `value_usd`:

```typescript
export class DynamicPricingService {
  
  /**
   * Calcula el precio diario en ARS basado en valor USD del vehículo
   */
  calculateDailyRateArs(car: Car, fxRate: number): number {
    // 1. Si hay override manual, usar ese
    if (car.price_override_ars && car.price_override_ars > 0) {
      return car.price_override_ars;
    }
    
    // 2. Calcular desde value_usd
    if (!car.value_usd || car.value_usd <= 0) {
      console.warn(`Auto ${car.id} sin value_usd definido`);
      return car.price_per_day; // Fallback al precio actual
    }
    
    const dailyRatePercentage = car.daily_rate_percentage || 0.003; // 0.3% default
    const dailyRateUsd = car.value_usd * dailyRatePercentage;
    
    // 3. Ajustar por antigüedad
    const age = new Date().getFullYear() - car.year;
    const ageDiscount = Math.min(age * 0.05, 0.30);
    const adjustedRateUsd = dailyRateUsd * (1 - ageDiscount);
    
    // 4. Convertir a ARS
    const dailyRateArs = Math.round(adjustedRateUsd * fxRate);
    
    console.log(`💰 Pricing para ${car.title}:
      Valor: $${car.value_usd} USD
      Base: ${(dailyRatePercentage * 100).toFixed(2)}% = $${dailyRateUsd.toFixed(2)}/día
      Antigüedad: ${age} años (-${(ageDiscount * 100).toFixed(0)}%)
      Final USD: $${adjustedRateUsd.toFixed(2)}/día
      FX: ${fxRate.toFixed(2)}
      Final ARS: ${dailyRateArs} ARS/día`
    );
    
    return dailyRateArs;
  }
  
  /**
   * Actualiza price_per_day de un auto según su valor USD
   */
  async updateCarPricing(carId: string): Promise<void> {
    const car = await this.carsService.getCarById(carId);
    const fxRate = await this.fxService.getCurrentRateAsync();
    
    const newPrice = this.calculateDailyRateArs(car, fxRate);
    
    await this.supabase
      .from('cars')
      .update({ 
        price_per_day: newPrice,
        last_price_update: new Date().toISOString()
      })
      .eq('id', carId);
  }
  
  /**
   * Actualiza precios de TODOS los autos (ejecutar cuando cambia FX)
   */
  async updateAllCarsPricing(): Promise<void> {
    const fxRate = await this.fxService.getCurrentRateAsync();
    
    const { data: cars } = await this.supabase
      .from('cars')
      .select('*')
      .not('value_usd', 'is', null);
    
    for (const car of cars || []) {
      const newPrice = this.calculateDailyRateArs(car, fxRate);
      
      await this.supabase
        .from('cars')
        .update({ 
          price_per_day: newPrice,
          last_price_update: new Date().toISOString()
        })
        .eq('id', car.id);
    }
    
    console.log(`✅ Actualizados ${cars?.length} autos`);
  }
}
```

## 📱 UI: Formulario de Publicación

Modificar `publish-car-v2.page.ts`:

```typescript
// ANTES: Campo libre price_per_day
<input type="number" formControlName="price_per_day" />

// AHORA: Campos value_usd y daily_rate_percentage
<div class="pricing-section">
  <label>Valor del vehículo (USD)</label>
  <input 
    type="number" 
    formControlName="value_usd" 
    placeholder="Ej: 18000"
    (change)="onValueChange()"
  />
  
  <label>Estrategia de Precio</label>
  <select formControlName="pricing_strategy" (change)="onStrategyChange()">
    <option value="economy">Económico (0.35% diario)</option>
    <option value="standard">Estándar (0.30% diario)</option>
    <option value="premium">Premium (0.25% diario)</option>
  </select>
  
  <div class="price-preview">
    <h4>Vista Previa del Precio</h4>
    <p>Precio diario: <strong>{{ calculatedPriceArs | money }}</strong></p>
    <p class="text-sm text-gray-600">
      (~${{ calculatedPriceUsd | number:'1.2-2' }} USD/día)
    </p>
  </div>
  
  <details>
    <summary>Configuración Avanzada</summary>
    <label>Porcentaje Diario Personalizado</label>
    <input 
      type="number" 
      formControlName="daily_rate_percentage"
      step="0.001"
      min="0.001"
      max="0.010"
    />
    
    <label>Override Manual (ARS/día - Opcional)</label>
    <input 
      type="number" 
      formControlName="price_override_ars"
      placeholder="Dejar vacío para cálculo automático"
    />
  </details>
</div>
```

## 🤖 Automatización: Actualizar Precios cuando Cambia FX

Modificar `update-exchange-rate.ts`:

```typescript
async function updateExchangeRate() {
  // ... código actual ...
  
  // NUEVO: Después de actualizar FX, actualizar precios de autos
  console.log('🔄 Actualizando precios de autos...');
  
  const { data: cars } = await supabase
    .from('cars')
    .select('id, value_usd, daily_rate_percentage, year')
    .not('value_usd', 'is', null)
    .is('price_override_ars', null); // Solo autos sin override manual
  
  for (const car of cars || []) {
    const dailyRatePercentage = car.daily_rate_percentage || 0.003;
    const dailyRateUsd = car.value_usd * dailyRatePercentage;
    
    const age = new Date().getFullYear() - car.year;
    const ageDiscount = Math.min(age * 0.05, 0.30);
    const adjustedRateUsd = dailyRateUsd * (1 - ageDiscount);
    
    const dailyRateArs = Math.round(adjustedRateUsd * platformRate);
    
    await supabase
      .from('cars')
      .update({ 
        price_per_day: dailyRateArs,
        last_price_update: new Date().toISOString()
      })
      .eq('id', car.id);
  }
  
  console.log(`✅ Actualizados ${cars?.length} precios de autos`);
}
```

## 📊 Ejemplo Real: Chevrolet Cruze 2025

```
Valor del vehículo: $18,000 USD
Estrategia: Standard (0.30% diario)
Año: 2025 (nuevo, sin descuento por antigüedad)

Cálculo:
  Base: $18,000 × 0.003 = $54 USD/día
  Antigüedad: 0 años = 0% descuento
  Final USD: $54/día
  
  FX Binance: 1745.64 ARS/USD
  Final ARS: $54 × 1745.64 = 94,265 ARS/día
  
Pero ajustamos a: ~95,000 ARS/día (redondeo comercial)
```

## 🎯 Próximos Pasos

1. ✅ Agregar columnas a la tabla `cars`
2. ✅ Crear script de migración con valores iniciales
3. ✅ Modificar servicio de pricing
4. ✅ Actualizar formulario de publicación
5. ✅ Integrar actualización automática con FX

¿Quieres que implemente esto ahora?

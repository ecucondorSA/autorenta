# 🚀 Implementación: Sistema de Precios Basados en USD

## ⚠️ PASOS REQUERIDOS

### PASO 1: Ejecutar SQL en Supabase Dashboard

**URL**: https://supabase.com/dashboard/project/obxvffplochgeiclibng/sql/new

**Copiar y pegar este SQL**:

```sql
-- 1. Agregar nuevas columnas
ALTER TABLE cars 
ADD COLUMN IF NOT EXISTS value_usd INTEGER,
ADD COLUMN IF NOT EXISTS daily_rate_percentage DECIMAL(5,4) DEFAULT 0.0030,
ADD COLUMN IF NOT EXISTS pricing_strategy VARCHAR(20) DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS price_override_ars INTEGER,
ADD COLUMN IF NOT EXISTS last_price_update TIMESTAMPTZ DEFAULT NOW();

-- 2. Crear índices
CREATE INDEX IF NOT EXISTS idx_cars_value_usd ON cars(value_usd);
CREATE INDEX IF NOT EXISTS idx_cars_pricing_strategy ON cars(pricing_strategy);

-- 3. Establecer valores iniciales
UPDATE cars SET value_usd = 18000, daily_rate_percentage = 0.0030, pricing_strategy = 'standard' WHERE model ILIKE '%cruze%' AND year >= 2023;
UPDATE cars SET value_usd = 15000, daily_rate_percentage = 0.0035, pricing_strategy = 'economy' WHERE model ILIKE '%onix%';
UPDATE cars SET value_usd = 14000, daily_rate_percentage = 0.0040, pricing_strategy = 'economy' WHERE model ILIKE '%versa%';
UPDATE cars SET value_usd = 19000, daily_rate_percentage = 0.0032, pricing_strategy = 'standard' WHERE model ILIKE '%sandero%';
UPDATE cars SET value_usd = 25000, daily_rate_percentage = 0.0028, pricing_strategy = 'standard' WHERE model ILIKE '%creta%' AND year = 2022;
UPDATE cars SET value_usd = 32000, daily_rate_percentage = 0.0026, pricing_strategy = 'premium' WHERE model ILIKE '%creta%' AND year >= 2025;

-- 4. Verificar
SELECT title, value_usd, daily_rate_percentage, pricing_strategy, price_per_day 
FROM cars 
WHERE value_usd IS NOT NULL
ORDER BY value_usd DESC;
```

---

### PASO 2: Actualizar Precios Automáticamente

Después de ejecutar el SQL, correr:

```bash
cd /home/edu/autorenta
npx tsx update-all-cars-pricing.ts
```

Este script:
- ✅ Obtiene el tipo de cambio actual de Binance
- ✅ Calcula precios en ARS para cada auto según su `value_usd`
- ✅ Aplica descuento por antigüedad (5% por año)
- ✅ Actualiza `price_per_day` en la base de datos

---

### PASO 3: Configurar Actualización Automática

El tipo de cambio y los precios se actualizarán **cada hora** automáticamente mediante GitHub Actions.

**Verificar**: `.github/workflows/update-exchange-rate.yml`

El workflow ya está configurado para:
1. ✅ Actualizar tipo de cambio desde Binance
2. ✅ Actualizar precios de todos los autos

---

## 📊 Resultados Esperados

### Antes (Manual, precios fijos en ARS)
```
Chevrolet Cruze 2025: 34,000 ARS/día (siempre fijo)
```

### Después (Automático, basado en valor USD + FX)
```
Chevrolet Cruze 2025:
  - Valor: $18,000 USD
  - Porcentaje: 0.30% diario
  - Base USD: $18,000 × 0.003 = $54/día
  - FX: 1745.64 ARS/USD
  - Precio ARS: $54 × 1745.64 = 94,265 ARS/día
  - Redondeado: ~94,000 ARS/día
```

Cuando el tipo de cambio suba/baje, **los precios se ajustan automáticamente**.

---

## 🔄 Flujo Automático

```
1. GitHub Actions (cada hora)
   ↓
2. Consulta Binance API → 1 USD = 1450 ARS
   ↓
3. Aplica margen 20% → 1 USD = 1740 ARS
   ↓
4. Actualiza exchange_rates table
   ↓
5. Recalcula precios de todos los autos:
   - Cruze: $18,000 × 0.30% = $54/día × 1740 = 93,960 ARS
   - Onix: $15,000 × 0.35% = $52.5/día × 1740 = 91,350 ARS
   - Etc.
   ↓
6. Actualiza price_per_day de cada auto
```

---

## ✅ Ventajas del Nuevo Sistema

1. **Precios justos**: Basados en el valor real del vehículo
2. **Consistencia**: Autos similares tienen precios similares
3. **Actualización automática**: Precios se ajustan con el tipo de cambio
4. **Flexibilidad**: Propietarios pueden usar override manual si lo desean
5. **Descuento por antigüedad**: Autos viejos cuestan menos automáticamente

---

## 📝 Para Propietarios: Publicar un Nuevo Auto

### UI Actualizada (Formulario)

```
┌─────────────────────────────────────────────────┐
│ 📝 Información del Vehículo                    │
│                                                  │
│ Marca: [Chevrolet ▼]                            │
│ Modelo: [Cruze]                                 │
│ Año: [2025]                                     │
│                                                  │
│ 💰 Valoración del Vehículo                     │
│                                                  │
│ ¿Cuánto vale tu auto?                           │
│ Valor en USD: [$18,000]                         │
│ 💡 Tip: Consulta en MercadoLibre o AutoCosmos  │
│                                                  │
│ Estrategia de Precio:                           │
│ ○ Económico (0.35% diario - más alquileres)    │
│ ● Estándar (0.30% diario - equilibrado)        │
│ ○ Premium (0.25% diario - mayor ganancia/día)  │
│                                                  │
│ ┌────────────────────────────────────────────┐ │
│ │ 📊 Vista Previa del Precio                 │ │
│ │                                             │ │
│ │ Precio diario: 94,000 ARS                  │ │
│ │ (~$54 USD/día)                              │ │
│ │                                             │ │
│ │ Actualizado automáticamente con el dólar   │ │
│ └────────────────────────────────────────────┘ │
│                                                  │
│ [Publicar Auto] [Cancelar]                      │
└─────────────────────────────────────────────────┘
```

---

## 🛠 Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `update-exchange-rate.ts` | Actualiza tipo de cambio desde Binance |
| `update-all-cars-pricing.ts` | Recalcula precios de todos los autos |
| `find-abnormal-prices.ts` | Detecta precios sospechosos |
| `migrate-pricing-usd.ts` | Migración de datos |

---

## 📞 Soporte

Si necesitas ayuda:
1. Verifica que las columnas existan: `SELECT * FROM cars LIMIT 1;`
2. Verifica el tipo de cambio: `SELECT * FROM exchange_rates WHERE is_active = true;`
3. Ejecuta el script de actualización manual

---

**Estado Actual**: ⏳ Pendiente de ejecutar SQL en Supabase Dashboard

**Próximo Paso**: Ejecutar el SQL del PASO 1 en https://supabase.com/dashboard/project/obxvffplochgeiclibng/sql/new

# Comparación de Tasas: fx_rates vs Binance API

**Fecha**: 2025-11-11
**Fuente**: Binance API (real-time)

## 🔍 Hallazgos Críticos

### 1. BRL (Real Brasileño)
- **Binance**: 1 BRL = **0.188541 USD** (1 USD = 5.304 BRL)
- **fx_rates**: No existe (usaba default: 0.20)
- **Diferencia**: Default era 6% más alto

### 2. ARS (Peso Argentino)
- **Binance**: 1 ARS = **0.000680 USD** (1 USD = 1,471.60 ARS)
- **fx_rates**: 1 ARS = 0.0010 USD (1 USD = 1,000 ARS)
- **Diferencia**: **32% más alto en fx_rates** ⚠️

### 3. UYU (Peso Uruguayo)
- **Binance**: ❌ No disponible
- **Alternativa sugerida**: API del Banco Central de Uruguay o exchangerate-api.com

## 💰 Impacto en Precio del Toyota Corolla 2022

### Con tasas de fx_rates (incorrectas):
```
Brasil:    $27,223 USD → 136,115 BRL (tasa: 0.20)
Argentina: $28,000 USD → 28,000,000 ARS (tasa: 0.0010)
Uruguay:   $26,500 USD → 1,060,000 UYU (tasa: 0.025)
```

### Con tasas de Binance (reales):
```
Brasil:    $27,223 USD → 144,398 BRL (tasa: 0.188541) ✅ MÁS PRECISO
Argentina: $28,000,000 ARS → $19,040 USD (tasa: 0.000680) ⚠️ GRAN DIFERENCIA
Uruguay:   Necesita fuente alternativa
```

## 🚨 Problema Detectado: Argentina

El precio que investigamos ($28M ARS) con la tasa **correcta** de Binance da:
- **$19,040 USD** (vs $28,000 USD que calculamos antes)
- Esto es **30% más bajo** que el precio de Brasil ($27,223)
- **-30% vs Brasil** (antes calculábamos +2.9%)

### Posibles causas:
1. La tasa de fx_rates (0.0010) está desactualizada
2. El precio de mercado argentino ($28M ARS) puede ser incorrecto
3. Puede haber una brecha entre tasa oficial y tasa blue/cripto

## 🎯 Recomendaciones

### Acción Inmediata:
1. **Actualizar fx_rates** con tasas de Binance
2. **Reverificar precio argentino** - puede que $28M ARS sea demasiado bajo para un Corolla 2022
3. **Buscar fuente para UYU** (exchangerate-api.com o BCU)

### Precio Argentino Correcto:
Si queremos que Argentina esté cerca de Brasil ($27,223 USD):
- Con tasa Binance (0.000680): necesitaríamos **$40,033,824 ARS**
- Con tasa fx_rates (0.0010): necesitaríamos **$27,223,000 ARS**

### Verificación sugerida:
Buscar en AutoCosmos/MercadoLibre Argentina el precio **real actual** del Toyota Corolla 2022.

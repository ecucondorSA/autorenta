# Ejemplos de Scoring - Sistema de Alquiler de Autos

## Contexto
- **Ubicación del usuario**: Buenos Aires (-34.6037, -58.3816)
- **Precio promedio del mercado**: ~$6,553 ARS/día
- **Rating "bueno"**: >= 4.0 (de 5.0)

## Reglas de Scoring

### Pesos Base
- **Rating**: 0.50 (prioridad calidad)
- **Distancia**: 0.25
- **Precio**: 0.15
- **Auto-approval**: 0.10

### Reglas Dinámicas
1. Si **distancia > 15km** → distancia obtiene peso = rating_base + 0.10 = **0.60** (más que rating)
2. Si **precio < promedio** Y **rating >= 4.0** → precio obtiene peso = rating_base + 0.05 = **0.55** (más que rating)

---

## Ejemplo 1: Auto Premium Cerca (Rating Priorizado)

### Características
- **Marca/Modelo**: Toyota Corolla 2023
- **Rating**: 4.8 (de 5.0) → **rating_component = 4.8/5.0 = 0.96**
- **Distancia**: 2.5 km → **distance_component = 1.0 - (2.5/100) = 0.975**
- **Precio**: $8,000/día (más caro que promedio $6,553) → **price_component = 1.0 - ((8000-6553)/6553) = 0.779**
- **Auto-approval**: Sí → **auto_component = 1.0**
- **Total bookings**: 25

### Cálculo de Pesos
- **Distancia**: 2.5km < 15km → peso = **0.25** (base)
- **Precio**: $8,000 > $6,553 (no es mejor) → peso = **0.15** (base)
- **Rating**: peso = **0.50** (base, más relevante)
- **Auto**: peso = **0.10** (base)

**Suma pesos**: 0.50 + 0.25 + 0.15 + 0.10 = **1.00** ✓

### Score Final
```
score = (0.50/1.00 × 0.96) + (0.25/1.00 × 0.975) + (0.15/1.00 × 0.779) + (0.10/1.00 × 1.0)
      = 0.48 + 0.244 + 0.117 + 0.10
      = 0.941
```

**Resultado**: Score = **0.941** (muy alto, rating priorizado)

---

## Ejemplo 2: Auto Bueno pero Lejos (Distancia Priorizada)

### Características
- **Marca/Modelo**: Fiat Cronos 2022
- **Rating**: 4.5 (de 5.0) → **rating_component = 4.5/5.0 = 0.90**
- **Distancia**: 18 km (> 15km) → **distance_component = 1.0 - (18/100) = 0.82**
- **Precio**: $5,000/día (más barato que promedio) → **price_component = 1.0**
- **Auto-approval**: No → **auto_component = 0.0**
- **Total bookings**: 12

### Cálculo de Pesos
- **Distancia**: 18km > 15km → peso = **0.60** (rating_base + 0.10 = 0.50 + 0.10) ⚠️ MÁS QUE RATING
- **Precio**: $5,000 < $6,553 PERO rating 4.5 < 4.0? No, 4.5 >= 4.0 → peso = **0.55** (rating_base + 0.05 = 0.50 + 0.05) ⚠️ MÁS QUE RATING
- **Rating**: peso = **0.50** (base)
- **Auto**: peso = **0.10** (base)

**Suma pesos**: 0.50 + 0.60 + 0.55 + 0.10 = **1.75** (necesita normalización)

### Score Final (Normalizado)
```
pesos normalizados:
- rating: 0.50/1.75 = 0.286
- distancia: 0.60/1.75 = 0.343 (MÁS que rating normalizado)
- precio: 0.55/1.75 = 0.314 (MÁS que rating normalizado)
- auto: 0.10/1.75 = 0.057

score = (0.286 × 0.90) + (0.343 × 0.82) + (0.314 × 1.0) + (0.057 × 0.0)
      = 0.257 + 0.281 + 0.314 + 0.0
      = 0.852
```

**Resultado**: Score = **0.852** (alto, pero distancia y precio tienen más peso que rating)

---

## Ejemplo 3: Auto Barato con Buen Rating (Precio Priorizado)

### Características
- **Marca/Modelo**: Volkswagen Gol 2021
- **Rating**: 4.2 (de 5.0) → **rating_component = 4.2/5.0 = 0.84**
- **Distancia**: 5 km → **distance_component = 1.0 - (5/100) = 0.95**
- **Precio**: $3,000/día (MUY barato, 54% más barato que promedio) → **price_component = 1.0**
- **Auto-approval**: Sí → **auto_component = 1.0**
- **Total bookings**: 8

### Cálculo de Pesos
- **Distancia**: 5km < 15km → peso = **0.25** (base)
- **Precio**: $3,000 < $6,553 Y rating 4.2 >= 4.0 → peso = **0.55** (rating_base + 0.05 = 0.50 + 0.05) ⚠️ MÁS QUE RATING
- **Rating**: peso = **0.50** (base)
- **Auto**: peso = **0.10** (base)

**Suma pesos**: 0.50 + 0.25 + 0.55 + 0.10 = **1.40** (necesita normalización)

### Score Final (Normalizado)
```
pesos normalizados:
- rating: 0.50/1.40 = 0.357
- distancia: 0.25/1.40 = 0.179
- precio: 0.55/1.40 = 0.393 (MÁS que rating normalizado) ⚠️
- auto: 0.10/1.40 = 0.071

score = (0.357 × 0.84) + (0.179 × 0.95) + (0.393 × 1.0) + (0.071 × 1.0)
      = 0.300 + 0.170 + 0.393 + 0.071
      = 0.934
```

**Resultado**: Score = **0.934** (muy alto, precio tiene más peso que rating)

---

## Ejemplo 1 MODIFICADO: Toyota a 200km (Distancia Penaliza)

### Características
- **Marca/Modelo**: Toyota Corolla 2023 (MISMO AUTO, pero ahora a 200km)
- **Rating**: 4.8 (de 5.0) → **rating_component = 4.8/5.0 = 0.96** (igual)
- **Distancia**: **200 km** (> 15km) → **distance_component = 0.0** (muy lejos, penalizado)
- **Precio**: $8,000/día → **price_component = 0.779** (igual)
- **Auto-approval**: Sí → **auto_component = 1.0** (igual)

### Cálculo de Pesos
- **Distancia**: **200km > 15km** → peso = **0.60** (rating_base + 0.10) ⚠️ **MÁS QUE RATING**
- **Precio**: $8,000 > $6,553 (no es mejor) → peso = **0.15** (base)
- **Rating**: peso = **0.50** (base)
- **Auto**: peso = **0.10** (base)

**Suma pesos**: 0.50 + 0.60 + 0.15 + 0.10 = **1.35** (necesita normalización)

### Pesos Normalizados
- **Rating**: 0.50/1.35 = **0.370** (37.0%)
- **Distancia**: 0.60/1.35 = **0.444** (44.4%) ⚠️ **MÁS QUE RATING**
- **Precio**: 0.15/1.35 = **0.111** (11.1%)
- **Auto**: 0.10/1.35 = **0.074** (7.4%)

### Score Final
```
score = (0.370 × 0.96) + (0.444 × 0.0) + (0.111 × 0.779) + (0.074 × 1.0)
      = 0.355 + 0.000 + 0.086 + 0.074
      = 0.516
```

**Resultado**: Score = **0.516** (bajo, distancia penaliza mucho)

### ⚠️ Análisis Crítico
Aunque la **distancia tiene más peso que rating** (0.444 vs 0.370), el **distance_component = 0.0** porque está muy lejos (200km). Esto hace que:
- El componente de distancia aporta **0.0** al score
- A pesar de tener buen rating (0.96), el score baja significativamente
- **Conclusión**: La distancia lejana penaliza fuertemente, incluso con buen rating

---

## Comparación y Ordenamiento Final

| Auto | Score | Rating | Distancia | Precio | Regla Aplicada |
|------|-------|--------|-----------|--------|----------------|
| **Ejemplo 1** (Corolla cerca) | **0.941** | 4.8 | 2.5km | $8,000 | Rating priorizado (default) |
| **Ejemplo 3** (Gol) | **0.934** | 4.2 | 5km | $3,000 | Precio priorizado (barato + buen rating) |
| **Ejemplo 2** (Cronos) | **0.852** | 4.5 | 18km | $5,000 | Distancia + Precio priorizados |
| **Ejemplo 1 MOD** (Corolla lejos) | **0.516** | 4.8 | **200km** | $8,000 | Distancia priorizada pero componente = 0.0 |

### Orden de Resultados (Score DESC)
1. **Toyota Corolla** (0.941) - Mejor calidad, cerca
2. **Volkswagen Gol** (0.934) - Muy barato + buen rating
3. **Fiat Cronos** (0.852) - Lejos pero compensa con precio

---

## Conclusiones

✅ **Rating es lo más relevante** por defecto (peso 0.50)
✅ **Distancia > 15km** hace que distancia tenga más peso que rating
✅ **Precio barato + buen rating** hace que precio tenga más peso que rating
✅ El sistema **balancea calidad, distancia y precio** según las reglas de negocio

### 📊 Lección del Ejemplo Modificado

**Toyota Corolla:**
- **Cerca (2.5km)**: Score = **0.941** (1er lugar)
- **Lejos (200km)**: Score = **0.516** (último lugar)

**Diferencia**: -0.425 puntos (45% de reducción)

**Por qué**: Aunque distancia tiene más peso cuando > 15km, si el auto está **muy lejos** (200km), el `distance_component = 0.0`, lo que penaliza fuertemente el score total, incluso con excelente rating.

**Conclusión**: El sistema **prioriza calidad (rating)**, pero la **distancia extrema** puede penalizar significativamente, lo cual es correcto para un marketplace de alquiler de autos donde la proximidad es importante.


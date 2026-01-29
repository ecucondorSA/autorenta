# Stress test matematico - Autorenta (COMODATO)

Fecha: 2026-01-11
Revision: Modelo COMODATO (15% plataforma / 75% rewards / 10% FGO)

---

## 1. Modelo COMODATO (resumen)

**Distribucion del pago del renter (100% del bruto):**
- 15% Plataforma (operaciones + ganancia)
- 75% Reward Pool (owners)
- 10% FGO (fondo de garantia)

**Cobertura de siniestros (waterfall):**
1) FGO (10% del bruto acumulado)
2) Garantia del renter (5% del valor, recupero ~50%)
3) Plataforma (solo si FGO insuficiente, CAP = franquicia)
4) Seguro (todo lo que excede franquicia)

---

## 2. Supuestos base (editables)

**Precios y uso**
- Tarifa diaria: 0.3% del valor del auto (min 10 USD/dia)
- Dias alquilados/mes: 12
- Alquileres/mes: 4 (promedio 3 dias)

**Costos / ingresos**
- Fees de pago (MP): 3.5% del bruto
- Membresia: 10 USD/mes por renter activo
- Renters/auto: 0.6 -> membresia promedio = 6 USD/auto/mes

**Garantia y franquicia**
- Garantia: 5% del valor del auto (hold)
- Franquicia: 5% del valor del auto (CAP plataforma)
- Recupero garantia: 50% (escenario LATAM)

**Escenarios de siniestralidad**
- Baja: 1.5% frecuencia / 3% severidad
- Normal: 3.0% frecuencia / 5% severidad
- Alta: 6.0% frecuencia / 8% severidad

**Buckets (por pedido)**
- <= 10k, 20k, 50k, 200k

**Mix base para stress (editable)**
- <=10k: 50%
- 20k: 25%
- 50k: 20%
- 200k: 5%

---

## 3. Formulas

```
bruto_mes = tarifa_diaria * dias_alquilados
plataforma_15 = bruto_mes * 0.15
reward_pool = bruto_mes * 0.75
fgo_in = bruto_mes * 0.10
fees = bruto_mes * 0.035

# Daño por siniestro
car_value = valor_auto
salto = car_value * severidad
recupero = min(garantia, daño) * 0.50
neto = max(0, daño - recupero)
perdida_evento = min(neto, franquicia)

perdida_fgo_mes = alquileres_mes * frecuencia * perdida_evento
balance_fgo = fgo_in - perdida_fgo_mes

util_plataforma = (plataforma_15 - fees + membresia)
if balance_fgo < 0: util_plataforma += balance_fgo
```

---

## 4. Resultados por bucket (USD/auto/mes)

### 4.1 Escenario BAJA (1.5% / 3%)

| Bucket | Bruto | Plataf 15% | Reward 75% | FGO 10% | Fees 3.5% | Daño neto | Perdida FGO | Bal FGO | Util Plataf |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| $10k | 360 | 54 | 270 | 36 | 13 | 150 | 9 | +27 | +47 |
| $20k | 720 | 108 | 540 | 72 | 25 | 300 | 18 | +54 | +89 |
| $50k | 1,800 | 270 | 1,350 | 180 | 63 | 750 | 45 | +135 | +213 |
| $200k | 7,200 | 1,080 | 5,400 | 720 | 252 | 3,000 | 180 | +540 | +834 |

### 4.2 Escenario NORMAL (3% / 5%)

| Bucket | Bruto | Plataf 15% | Reward 75% | FGO 10% | Fees 3.5% | Daño neto | Perdida FGO | Bal FGO | Util Plataf |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| $10k | 360 | 54 | 270 | 36 | 13 | 250 | 30 | +6 | +47 |
| $20k | 720 | 108 | 540 | 72 | 25 | 500 | 60 | +12 | +89 |
| $50k | 1,800 | 270 | 1,350 | 180 | 63 | 1,250 | 150 | +30 | +213 |
| $200k | 7,200 | 1,080 | 5,400 | 720 | 252 | 5,000 | 600 | +120 | +834 |

### 4.3 Escenario ALTA (6% / 8%)

| Bucket | Bruto | Plataf 15% | Reward 75% | FGO 10% | Fees 3.5% | Daño neto | Perdida FGO | Bal FGO | Util Plataf |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| $10k | 360 | 54 | 270 | 36 | 13 | 550 | 120 | -84 | -37 |
| $20k | 720 | 108 | 540 | 72 | 25 | 1,100 | 240 | -168 | -79 |
| $50k | 1,800 | 270 | 1,350 | 180 | 63 | 2,750 | 600 | -420 | -207 |
| $200k | 7,200 | 1,080 | 5,400 | 720 | 252 | 11,000 | 2,400 | -1,680 | -846 |

**Nota:** Util Plataf incluye membresia (+6/auto/mes) y cubre deficit FGO si balance_fgo < 0.

---

## 5. Proyeccion de flota (USD/mes, mix base)

### 5.1 Escenario BAJA

| Flota | Bruto | Plataf 15% | Membresia | Reward 75% | FGO 10% | Fees | Perdida FGO | Bal FGO | Util Plataf |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 200 | 216,000 | 32,400 | 1,200 | 162,000 | 21,600 | 7,560 | 5,400 | +16,200 | +26,040 |
| 500 | 540,000 | 81,000 | 3,000 | 405,000 | 54,000 | 18,900 | 13,500 | +40,500 | +65,100 |
| 1,000 | 1,080,000 | 162,000 | 6,000 | 810,000 | 108,000 | 37,800 | 27,000 | +81,000 | +130,200 |

### 5.2 Escenario NORMAL

| Flota | Bruto | Plataf 15% | Membresia | Reward 75% | FGO 10% | Fees | Perdida FGO | Bal FGO | Util Plataf |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 200 | 216,000 | 32,400 | 1,200 | 162,000 | 21,600 | 7,560 | 18,000 | +3,600 | +26,040 |
| 500 | 540,000 | 81,000 | 3,000 | 405,000 | 54,000 | 18,900 | 45,000 | +9,000 | +65,100 |
| 1,000 | 1,080,000 | 162,000 | 6,000 | 810,000 | 108,000 | 37,800 | 90,000 | +18,000 | +130,200 |

### 5.3 Escenario ALTA

| Flota | Bruto | Plataf 15% | Membresia | Reward 75% | FGO 10% | Fees | Perdida FGO | Bal FGO | Util Plataf |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 200 | 216,000 | 32,400 | 1,200 | 162,000 | 21,600 | 7,560 | 72,000 | -50,400 | -24,360 |
| 500 | 540,000 | 81,000 | 3,000 | 405,000 | 54,000 | 18,900 | 180,000 | -126,000 | -60,900 |
| 1,000 | 1,080,000 | 162,000 | 6,000 | 810,000 | 108,000 | 37,800 | 360,000 | -252,000 | -121,800 |

---

## 6. Conclusiones (interpretacion rapida)

- **Baja:** FGO con superavit y plataforma positiva. Escenario sano.
- **Normal:** FGO apenas positivo pero estable. Plataforma positiva.
- **Alta:** FGO deficitario y plataforma negativa. No escala sin ajustes.

**Si la siniestralidad real se parece a "Alta":**
- Subir FGO (10% -> 12-15%) o
- Subir tarifa diaria / reducir rewards o
- Endurecer KYC/riesgo para bajar frecuencia/severidad

---

## 7. Checklist de datos reales para recalibrar

1) Frecuencia real de siniestros (% de alquileres)
2) Severidad promedio (% del valor del auto)
3) Recupero real de garantia (%)
4) Mix real por valor de auto
5) Utilizacion real (dias/mes)

Con esos datos, recalculo y te doy la viabilidad real.

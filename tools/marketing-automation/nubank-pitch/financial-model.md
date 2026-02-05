# AutoRenta Financial Model - Nubank Pitch
**Versión: 1.0 | Fecha: 2026-02-05**

---

## SUPUESTOS BASE

| Variable | Valor | Fuente |
|----------|-------|--------|
| Ticket promedio por trip | $50 USD | Market research Turo LATAM |
| Duración promedio trip | 3 días | Industry average |
| Precio membresía Club | $14.99/mes | Pricing actual |
| Tasa de conversión a membresía | 60% | Objetivo conservador |
| Tasa de siniestralidad | 2.5% | Industry P2P (Turo) |
| Costo promedio siniestro | $800 USD | FGO covers medium claims |
| Tasa apropiación indebida | 0.05% | Industry P2P |
| Costo apropiación | $15,000 USD | Valor promedio auto |

---

## PROYECCIÓN 3 AÑOS

### Año 1 (Lanzamiento)

| Métrica | Q1 | Q2 | Q3 | Q4 | Total |
|---------|----|----|----|----|-------|
| Trips | 200 | 800 | 1,500 | 2,500 | 5,000 |
| GMV ($50/trip) | $10,000 | $40,000 | $75,000 | $125,000 | $250,000 |
| Usuarios activos | 100 | 400 | 800 | 1,500 | 1,500 |
| Miembros Club (60%) | 60 | 240 | 480 | 900 | 900 |

**Ingresos Año 1:**

| Fuente | Cálculo | Total |
|--------|---------|-------|
| Platform Fee (15%) | $250,000 × 15% | $37,500 |
| FGO (15%) | $250,000 × 15% | $37,500 |
| Membresías | 900 × $14.99 × 6 meses avg | $80,946 |
| **Total Ingresos** | | **$155,946** |

**Costos Año 1:**

| Concepto | Cálculo | Total |
|----------|---------|-------|
| Siniestros (2.5%) | 5,000 × 2.5% × $800 | $100,000 |
| Apropiación (0.05%) | 5,000 × 0.05% × $15,000 | $37,500 |
| Operaciones (equipo, infra) | Fijo | $80,000 |
| Marketing | Fijo | $30,000 |
| **Total Costos** | | **$247,500** |

**Resultado Año 1:** -$91,554 (PÉRDIDA - Requiere capital)

---

### Año 2 (Crecimiento)

| Métrica | Q1 | Q2 | Q3 | Q4 | Total |
|---------|----|----|----|----|-------|
| Trips | 3,000 | 5,000 | 7,000 | 10,000 | 25,000 |
| GMV | $150,000 | $250,000 | $350,000 | $500,000 | $1,250,000 |
| Miembros Club | 1,200 | 2,000 | 3,000 | 4,500 | 4,500 |

**Ingresos Año 2:**

| Fuente | Cálculo | Total |
|--------|---------|-------|
| Platform Fee (15%) | $1,250,000 × 15% | $187,500 |
| FGO (15%) | $1,250,000 × 15% | $187,500 |
| Membresías | 4,500 × $14.99 × 8 meses avg | $539,640 |
| **Total Ingresos** | | **$914,640** |

**Costos Año 2:**

| Concepto | Cálculo | Total |
|----------|---------|-------|
| Siniestros | 25,000 × 2.5% × $800 | $500,000 |
| Apropiación | 25,000 × 0.05% × $15,000 | $187,500 |
| Operaciones | Escala | $150,000 |
| Marketing | Escala | $80,000 |
| **Total Costos** | | **$917,500** |

**Resultado Año 2:** -$2,860 (BREAKEVEN)

---

### Año 3 (Escala)

| Métrica | Q1 | Q2 | Q3 | Q4 | Total |
|---------|----|----|----|----|-------|
| Trips | 12,000 | 18,000 | 25,000 | 35,000 | 90,000 |
| GMV | $600,000 | $900,000 | $1,250,000 | $1,750,000 | $4,500,000 |
| Miembros Club | 6,000 | 9,000 | 12,000 | 16,000 | 16,000 |

**Ingresos Año 3:**

| Fuente | Cálculo | Total |
|--------|---------|-------|
| Platform Fee (15%) | $4,500,000 × 15% | $675,000 |
| FGO (15%) | $4,500,000 × 15% | $675,000 |
| Membresías | 16,000 × $14.99 × 10 meses | $2,398,400 |
| **Total Ingresos** | | **$3,748,400** |

**Costos Año 3:**

| Concepto | Cálculo | Total |
|----------|---------|-------|
| Siniestros | 90,000 × 2.5% × $800 | $1,800,000 |
| Apropiación | 90,000 × 0.05% × $15,000 | $675,000 |
| Operaciones | Escala | $300,000 |
| Marketing | Escala | $150,000 |
| **Total Costos** | | **$2,925,000** |

**Resultado Año 3:** +$823,400 (PROFIT)

---

## RESUMEN 3 AÑOS

| Métrica | Año 1 | Año 2 | Año 3 |
|---------|-------|-------|-------|
| Trips | 5,000 | 25,000 | 90,000 |
| GMV | $250,000 | $1,250,000 | $4,500,000 |
| Ingresos | $155,946 | $914,640 | $3,748,400 |
| Costos | $247,500 | $917,500 | $2,925,000 |
| **Resultado** | -$91,554 | -$2,860 | **+$823,400** |
| Acumulado | -$91,554 | -$94,414 | +$728,986 |

---

## ANÁLISIS DE SENSIBILIDAD

### Escenario Pesimista (50% del target)

| Año | Trips | Resultado |
|-----|-------|-----------|
| 1 | 2,500 | -$170,000 |
| 2 | 12,500 | -$300,000 |
| 3 | 45,000 | -$100,000 |
| **Acumulado** | | **-$570,000** |

### Escenario Optimista (150% del target)

| Año | Trips | Resultado |
|-----|-------|-----------|
| 1 | 7,500 | -$50,000 |
| 2 | 37,500 | +$400,000 |
| 3 | 135,000 | +$1,800,000 |
| **Acumulado** | | **+$2,150,000** |

---

## CAPITAL NECESARIO

### Sin Capital Externo

| Escenario | Déficit Max | Puede Operar? |
|-----------|-------------|---------------|
| Pesimista | -$570,000 | NO |
| Base | -$94,414 | APENAS |
| Optimista | -$50,000 | SÍ (ajustado) |

### Con $150,000 de Nubank

| Escenario | Déficit Max | Puede Operar? |
|-----------|-------------|---------------|
| Pesimista | -$420,000 | NO (requiere más) |
| Base | +$55,586 | SÍ |
| Optimista | +$100,000 | SÍ |

**Conclusión:** $150,000 cubre el escenario base pero NO el pesimista.

---

## ROI PARA NUBANK

### Inversión: $150,000 por 15% equity

| Métrica | Año 1 | Año 2 | Año 3 |
|---------|-------|-------|-------|
| Ingresos | $156k | $915k | $3.75M |
| Revenue Multiple | 3x | 3x | 3x |
| Valuación implícita | $468k | $2.74M | $11.2M |
| Valor 15% Nubank | $70k | $411k | $1.69M |

### Retorno

| Escenario | Valuación Año 3 | Valor 15% | ROI |
|-----------|-----------------|-----------|-----|
| Pesimista | $3M | $450,000 | 3x |
| Base | $11M | $1,650,000 | **11x** |
| Optimista | $25M | $3,750,000 | **25x** |

---

## MÉTRICAS CLAVE PARA SEGUIMIENTO

| KPI | Target Año 1 | Frecuencia |
|-----|--------------|------------|
| Trips/mes | 400+ | Mensual |
| CAC | <$10 USD | Mensual |
| LTV | >$150 USD | Trimestral |
| Churn membresía | <10%/mes | Mensual |
| Tasa siniestralidad | <3% | Mensual |
| NPS | >50 | Trimestral |
| FGO solvency ratio | >2x claims | Mensual |

---

## NOTAS

1. **GMV no incluye membresías** - Solo valor de trips
2. **Costos de apropiación asumen recupero 0%** - Conservador
3. **No incluye ingresos por cross-sell** - Upside adicional
4. **Operaciones escalan sub-linealmente** - Economías de escala
5. **RUS reduce costos de siniestros** - Si se cierra, mejora P&L

---

*Financial Model v1.0 - Para uso interno y pitch a inversores*

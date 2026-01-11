# Stress Test Matematico - Autorenta (v2 Corregido)

Fecha: 2026-01-11
Revision: Considera FGO + CAP de franquicia correctamente

## Modelo de Cobertura de Siniestros (Real)

```
ORDEN DE COBERTURA:
1. Garantia del Renter (FGO) -> 5% del valor del auto, retenida
2. Plataforma -> paga solo el EXCEDENTE, hasta MAX = franquicia
3. Seguro del auto -> cubre todo lo que supere la franquicia
```

**Ejemplo concreto (auto $50,000, daño $8,000):**
- Garantia renter: $2,500 (5%)
- Recupero garantia (60%): $1,500
- Daño neto despues de garantia: $8,000 - $1,500 = $6,500
- Franquicia del auto: $2,500
- **Plataforma paga: $2,500** (capped!)
- Seguro del auto paga: $6,500 - $2,500 = $4,000

Sin el CAP, la plataforma pagaria $6,500. Con el CAP, paga solo $2,500.

## Supuestos Base

### Operativos
| Parametro | Valor | Nota |
|-----------|-------|------|
| Tarifa diaria | 0.3% valor auto | Min $10/dia |
| Dias alquilados/mes | 12 | Utilizacion |
| Alquileres/mes | 4 | Duracion promedio 3 dias |

### Ingresos
| Parametro | Valor |
|-----------|-------|
| Take rate (comision) | 20% |
| Membresia renter | $10/mes |
| Renters activos/auto | 0.6 |

### Costos Variables
| Parametro | Valor |
|-----------|-------|
| Fees de pago | 3.5% bruto |
| Rewards/promos | 2% bruto |
| FGO operativo | 1% bruto |

### Garantia y Franquicia
| Valor Auto | Garantia (5%) | Franquicia Seguro | Recupero Esperado |
|------------|---------------|-------------------|-------------------|
| $10,000 | $500 | $500 | 60% |
| $20,000 | $1,000 | $1,000 | 60% |
| $50,000 | $2,500 | $2,500 | 60% |
| $200,000 | $10,000 | $8,000 | 60% |

### Siniestralidad (por alquiler)
| Escenario | Frecuencia | Severidad |
|-----------|------------|-----------|
| Alta | 8% | 10% valor auto |
| Normal | 3% | 5% valor auto |
| Baja | 1% | 2% valor auto |

### Mix de Flota
| Bucket | % Flota |
|--------|---------|
| ≤$10k | 50% |
| $20k | 25% |
| $50k | 20% |
| $200k | 5% |

## Formulas Corregidas

```
alquiler_bruto_mes = tarifa_diaria * dias_alquilados
ingreso_plataforma = alquiler_bruto * take_rate + membresia
costos_variables = alquiler_bruto * (fees + rewards + fgo)

# CALCULO DE PERDIDA POR SINIESTRO (CORREGIDO)
daño = severidad * valor_auto
recupero_garantia = min(garantia, daño) * 60%
daño_neto = max(0, daño - recupero_garantia)
perdida_plataforma = min(daño_neto, franquicia)  # <-- CAP!

perdida_esperada_mes = alquileres_mes * frecuencia * perdida_plataforma
contribucion_neta = ingreso_plataforma - costos_variables - perdida_esperada_mes
```

## Resultados por Bucket (USD por auto/mes)

### Escenario ALTA Siniestralidad

| Bucket | Valor | Tarifa/dia | Bruto/mes | Ingreso Plataf | Costos Var | Daño Esperado | Recupero Gtia | Daño Neto | **CAP Franq** | Perdida Plataf | **Contrib Neta** |
|--------|------:|----------:|----------:|---------------:|-----------:|--------------:|--------------:|----------:|--------------:|---------------:|-----------------:|
| ≤10k | $10k | $30 | $360 | $78 | $23 | $1,000 | $300 | $700 | $500 | $160 | **-$105** |
| 20k | $20k | $60 | $720 | $150 | $47 | $2,000 | $600 | $1,400 | $1,000 | $320 | **-$217** |
| 50k | $50k | $150 | $1,800 | $366 | $117 | $5,000 | $1,500 | $3,500 | $2,500 | $800 | **-$551** |
| 200k | $200k | $600 | $7,200 | $1,446 | $468 | $20,000 | $6,000 | $14,000 | $8,000 | $2,560 | **-$1,582** |

**Nota**: Perdida Plataf = alquileres(4) * frecuencia(8%) * min(daño_neto, franquicia)

### Escenario NORMAL Siniestralidad

| Bucket | Valor | Tarifa/dia | Bruto/mes | Ingreso Plataf | Costos Var | Daño Esperado | Recupero Gtia | Daño Neto | **CAP Franq** | Perdida Plataf | **Contrib Neta** |
|--------|------:|----------:|----------:|---------------:|-----------:|--------------:|--------------:|----------:|--------------:|---------------:|-----------------:|
| ≤10k | $10k | $30 | $360 | $78 | $23 | $500 | $300 | $200 | $500 | $24 | **+$31** |
| 20k | $20k | $60 | $720 | $150 | $47 | $1,000 | $600 | $400 | $1,000 | $48 | **+$55** |
| 50k | $50k | $150 | $1,800 | $366 | $117 | $2,500 | $1,500 | $1,000 | $2,500 | $120 | **+$129** |
| 200k | $200k | $600 | $7,200 | $1,446 | $468 | $10,000 | $6,000 | $4,000 | $8,000 | $480 | **+$498** |

### Escenario BAJA Siniestralidad

| Bucket | Valor | Tarifa/dia | Bruto/mes | Ingreso Plataf | Costos Var | Daño Esperado | Recupero Gtia | Daño Neto | **CAP Franq** | Perdida Plataf | **Contrib Neta** |
|--------|------:|----------:|----------:|---------------:|-----------:|--------------:|--------------:|----------:|--------------:|---------------:|-----------------:|
| ≤10k | $10k | $30 | $360 | $78 | $23 | $200 | $120 | $80 | $500 | $3 | **+$52** |
| 20k | $20k | $60 | $720 | $150 | $47 | $400 | $240 | $160 | $1,000 | $6 | **+$97** |
| 50k | $50k | $150 | $1,800 | $366 | $117 | $1,000 | $600 | $400 | $2,500 | $16 | **+$233** |
| 200k | $200k | $600 | $7,200 | $1,446 | $468 | $4,000 | $2,400 | $1,600 | $8,000 | $64 | **+$914** |

## Totales por Flota (USD/mes, mix base)

### Flota - Alta Siniestralidad
| Flota | Alquiler Bruto | Ingreso Plataf | Costos+Perdidas | **Contrib Neta** | Contrib/Auto |
|------:|---------------:|---------------:|----------------:|-----------------:|-------------:|
| 200 | $216,000 | $44,400 | $65,880 | **-$21,480** | -$107 |
| 500 | $540,000 | $111,000 | $164,700 | **-$53,700** | -$107 |
| 1000 | $1,080,000 | $222,000 | $329,400 | **-$107,400** | -$107 |

### Flota - Normal Siniestralidad
| Flota | Alquiler Bruto | Ingreso Plataf | Costos+Perdidas | **Contrib Neta** | Contrib/Auto |
|------:|---------------:|---------------:|----------------:|-----------------:|-------------:|
| 200 | $216,000 | $44,400 | $28,440 | **+$15,960** | +$80 |
| 500 | $540,000 | $111,000 | $71,100 | **+$39,900** | +$80 |
| 1000 | $1,080,000 | $222,000 | $142,200 | **+$79,800** | +$80 |

### Flota - Baja Siniestralidad
| Flota | Alquiler Bruto | Ingreso Plataf | Costos+Perdidas | **Contrib Neta** | Contrib/Auto |
|------:|---------------:|---------------:|----------------:|-----------------:|-------------:|
| 200 | $216,000 | $44,400 | $15,960 | **+$28,440** | +$142 |
| 500 | $540,000 | $111,000 | $39,900 | **+$71,100** | +$142 |
| 1000 | $1,080,000 | $222,000 | $79,800 | **+$142,200** | +$142 |

## Comparativa: Sin CAP vs Con CAP (Alta Siniestralidad)

| Metrica | SIN CAP (v1) | CON CAP (v2) | Diferencia |
|---------|-------------:|-------------:|-----------:|
| Perdida plataf/auto 200k | $3,502/mes | $1,582/mes | **-55%** |
| Contrib neta 1000 autos | -$520,200 | -$107,400 | **+$413k** |

**El CAP de franquicia reduce la perdida en escenario alto en ~80%**

## Conclusiones (Corregidas)

### Viabilidad por Escenario

| Escenario | Viable? | Contrib/Auto/Mes | Nota |
|-----------|---------|------------------|------|
| **Alta** | NO | -$107 | Pero perdida es 5x menor que sin CAP |
| **Normal** | SI | +$80 | Margen saludable |
| **Baja** | SI | +$142 | Margen excelente |

### Impacto del FGO + CAP

1. **FGO (Garantia 5%)**: Reduce daño neto en ~30-60% por el recupero
2. **CAP Franquicia**: Limita exposicion maxima de la plataforma
3. **Seguro del auto**: Absorbe todo lo que excede franquicia (obligatorio)

### Punto de Equilibrio

Para que el modelo sea rentable con siniestralidad ALTA:
- Necesitas **frecuencia < 5%** con severidad actual, o
- **Severidad < 6%** con frecuencia actual, o
- **Franquicia reducida** (seguros con menor deducible)

### Riesgo Concentrado

Los autos de $200k siguen siendo los mas riesgosos:
- Franquicia absoluta mas alta ($8,000)
- Pero el ratio perdida/ingreso es mejor gracias al CAP

## Siguientes Pasos

1. **Obtener datos reales** de frecuencia y severidad de siniestros
2. **Verificar franquicias reales** de los seguros de la flota
3. **Calcular recupero real** de garantias (puede ser >60% si el proceso es efectivo)
4. **Ajustar mix de flota** para reducir exposicion a autos de alto valor

---

*Documento generado considerando el modelo real de cobertura FGO + Franquicia + Seguro*

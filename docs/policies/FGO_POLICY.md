# Política del Fondo de Garantía Operativa (FGO) - Autorenta

## Versión: 1.0
## Fecha: 2025-01-01
## Estado: En implementación para piloto

---

## 1. Resumen Ejecutivo

El **Fondo de Garantía Operativa (FGO)** es una reserva financiera interna de Autorenta que actúa como respaldo para cubrir:
- Daños menores no cubiertos por seguros
- Franquicias cuando el renter no puede pagar
- Disputas donde ambas partes tienen responsabilidad parcial
- Situaciones de emergencia durante el piloto

> **IMPORTANTE:** El FGO NO es un seguro. Es un fondo operativo para situaciones específicas mientras Autorenta no cuenta con póliza flotante propia.

---

## 2. Capitalización Inicial

### 2.1 Meta de Piloto

| Concepto | Monto |
|----------|-------|
| **Capital inicial mínimo** | $5,000 USD |
| **Capital objetivo** | $10,000 USD |
| **Reserva crítica** | $2,000 USD (no tocar) |

### 2.2 Fuentes de Fondos

1. **Inversión inicial del fundador**
2. **Porcentaje de cada transacción:** 10% de la comisión alimenta el FGO
3. **Depósitos de seguridad retenidos** (cuando aplica)

### 2.3 Fórmula de Acumulación

```
FGO_nuevo = FGO_actual + (comision_autorenta * 0.10)

Ejemplo:
- Booking de $100 USD
- Comisión Autorenta (15%): $15 USD
- Aporte a FGO: $1.50 USD
```

---

## 3. Usos Permitidos del FGO

### 3.1 Daños Menores (< $500 USD)

| Escenario | Cobertura FGO |
|-----------|---------------|
| Rayadura leve | Hasta $200 USD |
| Abolladuras menores | Hasta $300 USD |
| Manchas interiores | Hasta $150 USD |
| Neumático dañado | Hasta $200 USD |
| Espejo lateral | Hasta $250 USD |

**Condiciones:**
- Owner tiene BYOI válido
- Daño documentado con FGO v1.1 (fotos 360°)
- Renter no puede pagar la franquicia
- Monto menor a $500 USD

### 3.2 Franquicias No Cubiertas

Cuando el renter no tiene fondos para cubrir la franquicia:

| Tipo de Franquicia | Cobertura FGO Máxima |
|--------------------|----------------------|
| Estándar ($300 USD) | 100% |
| Reducida ($150 USD) | 100% |
| Premium ($500 USD) | Hasta $500 USD |

**Condiciones:**
- Incidente documentado con evidencia
- Seguro del owner procesa el claim
- Renter bloqueado hasta pago o acuerdo

### 3.3 Disputas 50/50

Cuando ambas partes tienen responsabilidad parcial:

| Escenario | Uso FGO |
|-----------|---------|
| Daño preexistente no documentado | Absorbe 50% del costo |
| Discrepancia en kilometraje | Cubre diferencia razonable |
| Estado de limpieza disputado | Hasta $100 USD |

### 3.4 Emergencias Operativas

| Situación | Uso FGO |
|-----------|---------|
| Grúa por avería | Hasta $150 USD |
| Auto de reemplazo urgente | Hasta $200 USD/día |
| Hospedaje de emergencia | Hasta $100 USD/noche |

---

## 4. Usos NO Permitidos

El FGO **NUNCA** se usa para:

1. **Pérdidas totales** (robo completo, siniestro total)
2. **Lesiones personales** (responsabilidad civil)
3. **Daños a terceros**
4. **Fraude comprobado** (cualquier parte)
5. **Multas de tránsito**
6. **Incumplimientos contractuales**
7. **Devoluciones de pagos**

> Para estos casos, se recurre al seguro BYOI del owner o acciones legales.

---

## 5. Proceso de Uso del FGO

### 5.1 Flujo de Solicitud

```
1. INCIDENTE
   └── Owner o renter reporta situación

2. DOCUMENTACIÓN (24h)
   ├── Fotos FGO v1.1 pre/post
   ├── Descripción del incidente
   └── Estimación de costos

3. EVALUACIÓN (48h)
   ├── Admin revisa evidencia
   ├── Compara con fotos originales
   └── Determina responsabilidad

4. DECISIÓN
   ├── Aprobado → Se procesan fondos
   └── Rechazado → Se comunica razón

5. PAGO (72h)
   └── Transferencia a parte afectada
```

### 5.2 Límites por Período

| Período | Límite Total FGO |
|---------|------------------|
| Por incidente | $500 USD |
| Por auto/mes | $800 USD |
| Por owner/año | $2,000 USD |
| Total mensual plataforma | 20% del FGO |

### 5.3 Priorización

Cuando el FGO tiene fondos limitados:

1. **Alta prioridad:** Emergencias de seguridad
2. **Media prioridad:** Daños documentados con evidencia clara
3. **Baja prioridad:** Disputas menores, limpieza

---

## 6. Recuperación de Fondos

### 6.1 Cobro a Responsable

Cuando el FGO cubre un gasto, Autorenta:

1. **Notifica al responsable** (renter generalmente)
2. **Ofrece plan de pagos** si es necesario
3. **Retiene de futuros alquileres** si el usuario vuelve a usar la plataforma
4. **Envía a collections** si excede $500 USD y no hay pago en 90 días

### 6.2 Bloqueos por Deuda

| Monto Adeudado | Acción |
|----------------|--------|
| < $100 USD | Advertencia, puede seguir usando |
| $100 - $300 USD | Requiere pago parcial para nueva reserva |
| > $300 USD | Cuenta suspendida hasta pago |

---

## 7. Transparencia y Reportes

### 7.1 Dashboard FGO (Admin)

```
┌─────────────────────────────────────────────┐
│ FONDO DE GARANTÍA OPERATIVA                 │
├─────────────────────────────────────────────┤
│ Saldo actual:        $7,500 USD             │
│ Reserva crítica:     $2,000 USD             │
│ Disponible:          $5,500 USD             │
│                                             │
│ Este mes:                                   │
│ ├── Ingresos:        +$450 USD              │
│ ├── Egresos:         -$320 USD              │
│ └── Neto:            +$130 USD              │
│                                             │
│ Casos abiertos:      3                      │
│ Casos resueltos (mes): 8                    │
│ Tasa de recuperación: 67%                   │
└─────────────────────────────────────────────┘
```

### 7.2 Reportes Mensuales

El FGO genera reportes automáticos:

- **Resumen de uso:** Cuánto se usó y para qué
- **Tasa de recuperación:** Cuánto se recuperó de responsables
- **Proyección:** Estimación de necesidad futura
- **Alertas:** Si el fondo baja de nivel crítico

---

## 8. Gobernanza

### 8.1 Aprobación de Gastos

| Monto | Aprobador |
|-------|-----------|
| < $100 USD | Admin (automático si cumple criterios) |
| $100 - $300 USD | Admin con revisión manual |
| $300 - $500 USD | Fundador + Admin |
| > $500 USD | Requiere excepción documentada |

### 8.2 Auditoría

- **Semanal:** Revisión de transacciones
- **Mensual:** Reporte completo
- **Trimestral:** Auditoría de casos

### 8.3 Alertas

| Situación | Acción |
|-----------|--------|
| FGO < $3,000 USD | Alerta amarilla, reducir gastos no críticos |
| FGO < $2,000 USD | Alerta roja, solo emergencias |
| FGO < $1,000 USD | Pausar nuevas reservas hasta recapitalizar |

---

## 9. Casos de Ejemplo

### Caso 1: Rayadura en Puerta

```
Situación:
- Renter devuelve auto con rayadura de 15cm
- FGO v1.1 confirma daño nuevo
- Owner tiene BYOI pero franquicia es $300 USD
- Renter solo tiene $150 USD en wallet

Resolución:
- Renter paga $150 USD (todo su saldo)
- FGO cubre $150 USD restantes
- Renter queda con deuda de $0 pero warning
- Owner recibe $300 USD totales
- FGO intenta recuperar de renter en futuro
```

### Caso 2: Disputa de Limpieza

```
Situación:
- Owner reclama $80 USD por limpieza profunda
- Renter dice que el auto ya estaba sucio
- Fotos FGO muestran ambigüedad

Resolución:
- FGO absorbe 50%: $40 USD
- Renter paga 50%: $40 USD
- Owner recibe $80 USD
- Caso cerrado, ambos continúan con advertencia
```

### Caso 3: Emergencia en Ruta

```
Situación:
- Auto se queda sin batería a 50km de ciudad
- Renter necesita grúa urgente
- No hay tiempo para aprobar con owner

Resolución:
- FGO autoriza hasta $150 USD para grúa
- Se documenta con fotos y recibos
- Se determina responsabilidad después
- Si fue negligencia del owner (batería vieja), owner reembolsa
- Si fue uso normal, FGO absorbe
```

---

## 10. Preguntas Frecuentes

### ¿El FGO cubre robos?

NO. Los robos deben ser cubiertos por el seguro BYOI del owner. El FGO puede ayudar con gastos menores asociados (grúa, trámites) pero no con el valor del vehículo.

### ¿Qué pasa si el FGO se queda sin fondos?

Se pausan nuevas reservas hasta recapitalizar. Los casos pendientes se resuelven por orden de prioridad con fondos disponibles.

### ¿Cómo sé si mi reclamo califica para FGO?

Califica si:
1. El monto es menor a $500 USD
2. Tienes documentación clara (fotos FGO)
3. El seguro BYOI no aplica o tiene franquicia
4. No hay fraude involucrado

### ¿Cuánto tarda en procesarse un pago del FGO?

- Casos claros: 24-48 horas
- Casos con disputa: 72 horas a 1 semana
- Casos complejos: Hasta 2 semanas

### ¿El renter sabe que el FGO cubrió su parte?

Sí. Se le notifica que Autorenta cubrió temporalmente y que tiene una deuda pendiente. Se ofrece plan de pagos si es necesario.

---

## 11. Contacto

Para casos relacionados con el FGO:
- Email: fgo@autorentar.com
- WhatsApp: +54 9 11 XXXX-XXXX (piloto)

---

## Historial de Cambios

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 2025-01-01 | Versión inicial para piloto |

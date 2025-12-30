# Política BYOI (Bring Your Own Insurance) - Autorenta

## Versión: 1.0
## Fecha: 2025-01-01
## Estado: OBLIGATORIO para piloto

---

## 1. Resumen Ejecutivo

Durante la fase de piloto, Autorenta **NO cuenta con póliza flotante propia**. Por lo tanto, **BYOI es OBLIGATORIO** para todos los owners que deseen listar vehículos en la plataforma.

> **CRÍTICO:** Sin seguro verificado, el auto NO puede estar en estado `active` y NO aparecerá en búsquedas.

---

## 2. Requisitos Mínimos de Seguro

### 2.1 Coberturas Obligatorias

| Cobertura | Mínimo Requerido | Notas |
|-----------|------------------|-------|
| **Responsabilidad Civil (RC)** | $50,000,000 ARS o equivalente | Obligatorio por ley para alquiler |
| **Daños Propios** | Todo riesgo con franquicia | Recomendado pero no obligatorio |
| **Robo Total** | Valor de mercado | Obligatorio |
| **Robo Parcial** | Incluido | Obligatorio |
| **Incendio** | Incluido | Obligatorio |

### 2.2 Cláusula Especial Requerida

La póliza **DEBE incluir** una de las siguientes:

1. **Cláusula de "Alquiler sin Chofer"** - Endoso específico que habilita uso comercial
2. **Póliza tipo "Rentadora"** - Seguro comercial para flotas de alquiler

> **IMPORTANTE:** Las pólizas particulares estándar **NO cubren** uso comercial (alquiler). Sin esta cláusula, el seguro puede rechazar siniestros.

### 2.3 Vigencia

- Póliza debe estar **vigente** (no vencida)
- Mínimo **60 días de vigencia restante** al momento de verificación
- Sistema alertará cuando falten **30 días** para vencimiento

---

## 3. Aseguradoras Aceptadas

### 3.1 Con Cláusula de Alquiler sin Chofer (Particulares)

| Aseguradora | Notas |
|-------------|-------|
| Río Uruguay Seguros (RUS) | Recomendada, experiencia en P2P |
| Federación Patronal | Buena cobertura |
| Sancor Seguros | Amplia red |
| Seguros Rivadavia | Consultar vía broker |

### 3.2 Seguros de Flota (Comercial)

| Aseguradora | Notas |
|-------------|-------|
| La Caja | Requiere CUIT |
| Mapfre | Experiencia con Pegcar |
| San Cristóbal | Flota mínima 2 vehículos |
| Allianz | Cobertura premium |

### 3.3 NO Aceptadas

- Pólizas sin cláusula de alquiler
- Seguros de otros países (excepto con endoso internacional)
- Pólizas vencidas o próximas a vencer (<60 días)

---

## 4. Proceso de Verificación

### 4.1 Flujo del Owner

```
1. Owner sube documento de póliza (PDF/imagen)
2. Sistema extrae datos automáticamente (OCR)
3. Owner confirma/corrige datos:
   - Número de póliza
   - Aseguradora
   - Fecha de vencimiento
   - Titular de la póliza
   - Patente del vehículo
4. Verificación manual por admin (piloto)
5. Si aprobado → Auto puede activarse
6. Si rechazado → Owner recibe feedback y puede reintentar
```

### 4.2 Datos Requeridos

| Campo | Obligatorio | Validación |
|-------|-------------|------------|
| Número de póliza | Sí | Formato válido |
| Aseguradora | Sí | De lista aceptada |
| Fecha vencimiento | Sí | Futuro + 60 días mín |
| Titular | Sí | Match con owner o cédula |
| Patente vehículo | Sí | Match con auto registrado |
| Tipo cobertura | Sí | RC mínimo |
| Cláusula alquiler | Sí | Debe estar presente |

### 4.3 Tiempos de Verificación

| Escenario | Tiempo Estimado |
|-----------|-----------------|
| Póliza clara, datos correctos | 24-48 horas |
| Requiere aclaración | 48-72 horas |
| Documento ilegible | Rechazado, resubir |

---

## 5. Estados del Seguro

```
┌─────────────────┐
│   not_uploaded  │  ← Estado inicial, auto NO puede activarse
└────────┬────────┘
         │ Owner sube documento
         ▼
┌─────────────────┐
│    pending      │  ← Esperando verificación admin
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐  ┌──────────┐
│verified│  │ rejected │
└───┬───┘  └────┬─────┘
    │           │
    │           └──→ Owner corrige y reintenta
    ▼
┌─────────────────┐
│     active      │  ← Auto puede recibir reservas
└────────┬────────┘
         │ Póliza vence
         ▼
┌─────────────────┐
│    expired      │  ← Auto se desactiva automáticamente
└─────────────────┘
```

---

## 6. Consecuencias de No Cumplir

### 6.1 Sin Seguro Verificado

- Auto permanece en estado `draft` o `pending_insurance`
- NO aparece en búsquedas
- NO puede recibir reservas

### 6.2 Seguro Vencido

- Auto se desactiva automáticamente
- Reservas activas se cancelan (con 72h de aviso)
- Owner notificado por email/push
- Puede reactivar subiendo nueva póliza

### 6.3 Incidente sin Seguro Válido

- **Owner asume 100% de responsabilidad**
- Autorenta no cubre ningún daño
- Posible suspensión de cuenta

---

## 7. Comisiones según Seguro

| Tipo de Seguro | Comisión Autorenta |
|----------------|-------------------|
| BYOI (seguro propio) | 15% |
| Póliza flotante (futuro) | 25% |

> **Beneficio BYOI:** Owners que traen su propio seguro pagan menos comisión.

---

## 8. Preguntas Frecuentes

### ¿Por qué es obligatorio el seguro?

Sin seguro, un accidente podría:
- Causar pérdidas de $10,000+ USD al owner
- Exponer a Autorenta a demandas legales
- Destruir la confianza de la comunidad

### ¿Puedo usar mi seguro particular normal?

NO. Las pólizas particulares excluyen uso comercial (alquiler). Debes agregar la cláusula de "alquiler sin chofer" o contratar seguro de flota.

### ¿Cuánto cuesta el endoso de alquiler?

Aproximadamente +20% a +50% sobre la prima normal. Se amortiza con los ingresos del alquiler.

### ¿Qué pasa si mi aseguradora rechaza el siniestro?

Si la aseguradora descubre uso comercial no declarado, puede:
- Rechazar el siniestro
- Rescindir la póliza
- Cobrar prima diferencial

Por eso es CRÍTICO tener la cláusula correcta.

### ¿Cuánto tarda la verificación?

24-48 horas si el documento es claro y los datos correctos. Más tiempo si se requiere aclaración.

---

## 9. Contacto

Para dudas sobre seguros:
- Email: seguros@autorentar.com
- WhatsApp: +54 9 11 XXXX-XXXX (piloto)

---

## Historial de Cambios

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 2025-01-01 | Versión inicial para piloto |

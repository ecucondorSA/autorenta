# 📋 Recomendaciones Contables para AutoRenta - Implementación NIIF

## 🎯 Resumen Ejecutivo

Este documento detalla cómo AutoRenta implementa las recomendaciones contables basadas en **NIIF 15** (Reconocimiento de Ingresos) y **NIIF 37** (Provisiones), específicas para plataformas P2P.

---

## 1️⃣ Tratamiento de la Billetera del Usuario

### 📖 Normativa Aplicable: NIIF 15

> Los fondos que ingresan a la billetera deben registrarse como un **pasivo** (ingresos diferidos o "deuda" con el usuario), no como ingreso inmediato.

### ✅ Implementación en AutoRenta

#### Al Depositar Dinero:
```sql
DEBE: Caja/Banco (MercadoPago/Stripe)     $100
HABER: Depósitos de Clientes (Pasivo)     $100
```

**Cuenta utilizada**: `2.1.1.02 - Billetera Usuarios - Locatarios`

**Justificación**: Según NIIF 15, al recibir un pago por adelantado se reconoce un "pasivo por contrato" equivalente al monto recibido. Solo se reconoce ingreso cuando se cumple la prestación del servicio.

**Automatización**: 
- Trigger: `trigger_accounting_wallet_deposit`
- Evento: `wallet_transactions.status = 'completed'`
- Función: `accounting_record_wallet_deposit()`

#### Al Completar el Alquiler:
```sql
DEBE: Depósitos de Clientes (Pasivo)      $100
HABER: Comisión AutoRenta (Ingreso)       $10
HABER: Pago a Locadores (Pasivo)          $90
```

**Justificación**: Solo al completarse el servicio se "devengó" el ingreso. AutoRenta reconoce únicamente su comisión.

#### Al Retirar Dinero:
```sql
DEBE: Depósitos de Clientes (Pasivo)      $100
HABER: Banco (Activo)                      $100
```

**Justificación**: Se reduce el pasivo al devolver fondos al usuario.

---

## 2️⃣ AutoRenta como Agente (NIIF 15)

### 📖 Normativa Aplicable

> Como AutoRenta actúa mayormente como **agente** de la transacción, la NIIF 15 indica que la plataforma solo debe reconocer como ingreso su **comisión** (tarifa de servicio), no el total pagado por el alquiler.

### ✅ Implementación en AutoRenta

#### Escenario de Ejemplo:
- Alquiler total: $100
- Comisión AutoRenta (10%): $10
- Pago al locador: $90

#### Contabilización CORRECTA:
```sql
-- Solo la comisión es ingreso de AutoRenta
DEBE: Billetera Inquilino (Pasivo)         $100
HABER: Comisiones por Alquileres (Ingreso) $10
HABER: Pago a Locadores (Pasivo)           $90
```

#### ❌ Contabilización INCORRECTA:
```sql
-- NO hacer esto:
DEBE: Billetera Inquilino                  $100
HABER: Ingresos por Alquileres             $100  ❌

DEBE: Pago a Locadores                     $90
HABER: Banco                               $90   ❌
```

**Justificación**: NIIF 15 establece: "Cuando una entidad que actúa como agente satisface su obligación de desempeño, reconoce ingresos únicamente por la comisión o cuota que le corresponde."

**Cuenta utilizada**: `4.1.1 - Comisiones por Alquileres`

**Automatización**:
- Trigger: `trigger_accounting_booking_completion`
- Evento: `bookings.status = 'completed'`
- Función: `accounting_record_booking_completion()`

---

## 3️⃣ Depósitos de Garantía (Franquicias)

### 📖 Normativa Aplicable

> Las retenciones que se bloquean como depósito de garantía deben contabilizarse como **pasivo**, porque representan una obligación de devolución o compensación futura.

### ✅ Implementación en AutoRenta

#### Al Iniciar el Alquiler (Bloqueo):
```sql
DEBE: Billetera Usuario (Pasivo)          $50
HABER: Franquicias Bloqueadas (Pasivo)    $50
```

**Cuenta utilizada**: `2.1.2.01 - Franquicias Bloqueadas`

**Justificación**: Es un movimiento interno de pasivo. La obligación con el usuario persiste, solo cambia de naturaleza (de "disponible" a "bloqueada").

#### Al Finalizar sin Daños (Liberación):
```sql
DEBE: Franquicias Bloqueadas (Pasivo)     $50
HABER: Billetera Usuario (Pasivo)         $50
```

**Justificación**: Se devuelve la garantía completa al usuario, manteniendo el pasivo original.

#### Si Hay Daños (Consumo Parcial):
```sql
-- Consumo de garantía por daño de $20
DEBE: Franquicias Bloqueadas (Pasivo)     $20
HABER: Ingreso por Penalización (Ingreso) $20

-- Devolución del remanente $30
DEBE: Franquicias Bloqueadas (Pasivo)     $30
HABER: Billetera Usuario (Pasivo)         $30
```

**Justificación**: La parte consumida se reclasifica de pasivo a ingreso, reflejando que se utilizó como pago por el siniestro.

**En ningún caso** esta fianza debe reconocerse como ingreso de AutoRenta mientras exista la obligación de devolverla al usuario.

**Automatización**:
- Bloqueo: `trigger_accounting_booking_start`
- Liberación: `trigger_accounting_booking_completion`
- Consumo: Función manual `accounting_record_fgo_claim()`

---

## 4️⃣ Fondo de Garantía Operativa (FGO)

### 📖 Normativa Aplicable: NIIF 37

> Los aportes al FGO son fondos restringidos para cubrir futuros siniestros. Dado que la NIIF 15 remite a la NIIF 37 (Provisiones) para garantías y riesgos futuros, los siniestros esperados deben reconocerse como provisiones según NIIF 37.

### ✅ Implementación en AutoRenta

#### Concepto de Provisión (NIIF 37)

Una **provisión** es un pasivo en el que existe incertidumbre acerca de su cuantía o vencimiento. Se reconoce cuando:
1. Existe una obligación presente (legal o implícita)
2. Es probable que se requiera una salida de recursos
3. Puede hacerse una estimación fiable del monto

#### Al Completar un Alquiler (Aporte al FGO):
```sql
-- Provisionar 5% del total del alquiler
DEBE: Gastos por Siniestros (Gasto)       $5
HABER: Provisión FGO (Pasivo)             $5
```

**Cuenta utilizada**: `2.1.5.01 - Provisión FGO - Siniestros`

**Justificación**: 
- Se estima que habrá siniestros futuros basados en experiencia histórica (5%)
- El gasto se reconoce en el período en que se genera el riesgo
- La provisión se crea como pasivo para futuras contingencias

**Automatización**:
- Trigger: `trigger_create_fgo_provision`
- Evento: `bookings.status = 'completed'`
- Función: `accounting_record_fgo_contribution()`

#### Al Ocurrir un Siniestro (Consumo del FGO):
```sql
DEBE: Provisión FGO (Pasivo)              $50
HABER: Banco (Activo)                     $50
```

**Justificación**: 
- Se utiliza la provisión creada previamente
- El gasto ya fue reconocido al crear la provisión
- Solo se registra el movimiento de efectivo

**Automatización**:
- Función: `accounting_record_fgo_claim(booking_id, amount, description)`

#### Si No Hay Siniestros (Liberación):
```sql
DEBE: Provisión FGO (Pasivo)              $5
HABER: Reserva FGO (Patrimonio)           $5
```

**Justificación**: 
- La provisión no utilizada se libera
- Se traspasa a patrimonio (reserva acumulada)
- Puede usarse para siniestros futuros

**Automatización**:
- Trigger: Automático a los 90 días del booking completado
- Función: `accounting_release_fgo_provision(booking_id)`

### 📊 Trazabilidad del FGO

La tabla `accounting_provisions` registra:
- Monto estimado inicial
- Monto actual disponible
- Estado (active, consumed, released)
- Booking relacionado
- Fechas de creación y consumo

**Reportes disponibles**:
```sql
-- Resumen del FGO
SELECT * FROM accounting_fgo_summary;

-- FGO por booking
SELECT * FROM accounting_fgo_by_booking;
```

---

## 5️⃣ Reconocimiento de Ingresos (NIIF 15)

### 📖 Criterio de Reconocimiento

> AutoRenta debe considerar su rol en la transacción (principal vs. agente). Todo ingreso reconocido debe contrastarse con la entrega efectiva del servicio de alquiler.

### ✅ Principio de Devengo

**Los ingresos se reconocen cuando**:
1. ✅ El servicio ha sido completado
2. ✅ El control se ha transferido al cliente
3. ✅ AutoRenta ha cumplido su obligación de desempeño

**NO se reconocen ingresos**:
- ❌ Al recibir pago anticipado
- ❌ Al iniciar el alquiler
- ❌ Por fondos en billetera

### ✅ Implementación en AutoRenta

#### Flujo Completo de Reconocimiento:

```
1. Depósito → Pasivo (no es ingreso aún)
2. Pago alquiler → Ingreso Diferido (pasivo por contrato)
3. Inicio alquiler → No se reconoce ingreso
4. Finalización → SE RECONOCE INGRESO (solo comisión)
```

#### Estados de Ingresos:

| Estado Booking | Tratamiento Contable | Ingreso Reconocido |
|----------------|---------------------|-------------------|
| pending | No aplica | NO |
| confirmed | Ingreso Diferido (pasivo) | NO |
| in_progress | Ingreso Diferido (pasivo) | NO |
| **completed** | **Comisión como Ingreso** | **SÍ** |
| cancelled | Reversión pasivo | NO |

---

## 6️⃣ Criterios Generales de Transparencia

### ✅ Trazabilidad

**Cada transacción contable incluye**:
- `reference_type`: Origen (booking, wallet_transaction, fgo_contribution)
- `reference_id`: ID del registro origen
- `description`: Descripción clara
- `created_by`: Usuario responsable
- Timestamps de creación y contabilización

**Consultar trazabilidad**:
```sql
SELECT 
  e.entry_number,
  e.entry_date,
  e.description,
  e.reference_type,
  e.reference_id,
  a.code,
  a.name,
  l.debit_amount,
  l.credit_amount
FROM accounting_journal_entries e
JOIN accounting_journal_lines l ON l.journal_entry_id = e.id
JOIN accounting_accounts a ON a.id = l.account_id
WHERE e.reference_id = 'uuid-del-registro'
ORDER BY e.created_at, l.debit_amount DESC;
```

### ✅ Separación de Cuentas

| Concepto | Cuenta | Tipo |
|----------|--------|------|
| Billetera Locadores | 2.1.1.01 | Pasivo |
| Billetera Locatarios | 2.1.1.02 | Pasivo |
| Franquicias Bloqueadas | 2.1.2.01 | Pasivo |
| Ingresos Diferidos | 2.1.3.01 | Pasivo |
| Provisión FGO | 2.1.5.01 | Pasivo |
| Comisiones (Ingreso) | 4.1.1 | Ingreso |

### ✅ Validación Continua

**El sistema valida automáticamente**:
- Partida doble en cada asiento
- Reconciliación wallet vs contabilidad
- Integridad de provisiones FGO
- Balances de pasivos con usuarios

---

## 📚 Referencias Normativas

### NIIF 15 - Ingresos de Actividades Ordinarias
- **Fuente**: IFRS.org
- **Aplicación**: 
  - Pasivo por contrato (pagos anticipados)
  - Agente vs Principal
  - Reconocimiento al completar obligación

### NIIF 37 - Provisiones, Pasivos Contingentes
- **Fuente**: IFRS.org
- **Aplicación**:
  - Provisión FGO para siniestros esperados
  - Estimación basada en experiencia histórica
  - Reconocimiento en el período del riesgo

### Plan General Contable (PGC España)
- **Fuente**: getquipu.com
- **Aplicación**:
  - Fianzas como pasivo
  - Depósitos de garantía

---

## ✅ Checklist de Cumplimiento

### NIIF 15
- [x] Fondos en billetera registrados como pasivo
- [x] Solo comisión reconocida como ingreso
- [x] Ingreso reconocido al completar servicio
- [x] Pasivo por contrato (ingresos diferidos)
- [x] Documentación de rol agente vs principal

### NIIF 37
- [x] Provisión FGO creada automáticamente
- [x] Estimación basada en histórico (5%)
- [x] Consumo registrado al pagar siniestros
- [x] Liberación de provisiones no utilizadas
- [x] Trazabilidad completa de movimientos

### Partida Doble
- [x] Validación automática débitos = créditos
- [x] Todas las transacciones balanceadas
- [x] Auditoría continua de integridad

### Transparencia
- [x] Cuentas separadas por tipo de pasivo
- [x] Trazabilidad de cada asiento
- [x] Reportes en tiempo real
- [x] Reconciliaciones automáticas

---

## 🎯 Conclusión

AutoRenta implementa **correctamente** todas las recomendaciones contables:

✅ **NIIF 15**: Billetera como pasivo, solo comisión como ingreso  
✅ **NIIF 37**: Provisión FGO para siniestros esperados  
✅ **Transparencia**: Cuentas separadas y trazabilidad completa  
✅ **Automatización**: Cero intervención manual  

Los estados financieros reflejan correctamente:
- Las obligaciones de AutoRenta con usuarios y propietarios
- La provisión contra riesgos futuros
- Los ingresos devengados únicamente por comisiones

---

**Preparado para**: AutoRenta SAS  
**Basado en**: NIIF 15, NIIF 37, PGC España  
**Versión**: 1.0.0  
**Fecha**: 2025-10-26  

**Fuentes**:
- IFRS.org (NIIF 15 e IAS 37)
- getquipu.com (Normativa contable España)
- Criterios NIIF (agente/comisión)

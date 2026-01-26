# 🛡️ Auditoría de Seguridad y Operaciones

> **Fecha de Auditoría:** 2026-01-09
> **Versión:** v1.0
> **Alcance:** Políticas RLS, Contratos Digitales, Código Legacy
> **Veredicto:** 🚨 **VULNERABILIDADES CRÍTICAS DETECTADAS**

---

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo](#-resumen-ejecutivo)
2. [Vulnerabilidades de Seguridad](#-vulnerabilidades-de-seguridad)
   - [SEC-001: Auto-Aprobación de Reservas](#sec-001-auto-aprobación-de-reservas)
   - [SEC-002: Falsificación de Pagos](#sec-002-falsificación-de-pagos)
   - [SEC-003: Inyección en Payment Intents](#sec-003-inyección-en-payment-intents)
3. [Debilidades Operativas](#-debilidades-operativas)
   - [OPS-001: Firma Digital Débil](#ops-001-firma-digital-débil)
   - [OPS-002: Generación de PDF Client-Side](#ops-002-generación-de-pdf-client-side)
   - [OPS-003: EarningsCalculator Desactualizado](#ops-003-earningscalculator-desactualizado)
4. [Código Legacy y Deuda Técnica](#-código-legacy-y-deuda-técnica)
5. [Matriz de Riesgos](#-matriz-de-riesgos)
6. [Plan de Remediación](#-plan-de-remediación)
7. [SQL Patches Recomendados](#-sql-patches-recomendados)
8. [Verificación Post-Remediación](#-verificación-post-remediación)

---

## 📊 Resumen Ejecutivo

Esta auditoría examina la seguridad a nivel de base de datos (RLS), la integridad de los contratos digitales, y la presencia de código legacy que contradice el modelo de negocio actual.

### Panel de Estado

| Categoría | Vulnerabilidades | Severidad Máxima |
|-----------|-----------------|------------------|
| **RLS Policies** | 3 | 🔴 CRÍTICA |
| **Contratos Digitales** | 2 | 🟡 MEDIA |
| **Código Legacy** | 2 | 🟠 ALTA |

### Impacto Potencial de Explotación

- **Pérdida Financiera Directa:** Atacantes podrían generar pagos falsos.
- **Fraude de Reservas:** Usuarios podrían auto-confirmar reservas sin pagar.
- **Invalidez Legal de Contratos:** Comodatos sin respaldo server-side.
- **Confusión de Modelo de Negocio:** Calculadora muestra modelo viejo.

---

## 🔐 Vulnerabilidades de Seguridad

### SEC-001: Auto-Aprobación de Reservas

> **Severidad:** 🔴 CRÍTICA
> **CVSS Estimado:** 8.5 (High)
> **Archivo:** `20251201000001_01_core.sql` (líneas 383-393)

#### Descripción

La política RLS para la tabla `bookings` permite que tanto el `renter` como el `owner` actualicen **cualquier columna** de la reserva.

```sql
-- POLÍTICA VULNERABLE (Actual)
CREATE POLICY "Owners and renters can update bookings"
ON public.bookings FOR UPDATE
USING (
  auth.uid() = renter_id
  OR EXISTS (
    SELECT 1 FROM public.cars
    WHERE cars.id = bookings.car_id
    AND cars.owner_id = auth.uid()
  )
);
```

#### Escenario de Ataque

1. Usuario crea reserva (estado = `pending`)
2. Sin pagar, ejecuta directamente contra Supabase:
   ```javascript
   supabase.from('bookings')
     .update({ status: 'confirmed' })
     .eq('id', 'booking-123')
   ```
3. La política permite el UPDATE porque `auth.uid() = renter_id`
4. El usuario tiene reserva confirmada **sin haber pagado**

#### Impacto

- Renters obtienen vehículos gratuitamente.
- Owners no reciben pagos.
- Sistema de pagos completamente bypasseado.

#### Remediación

```sql
-- SOLUCIÓN: Política granular con columnas permitidas
DROP POLICY "Owners and renters can update bookings" ON public.bookings;

-- Renters solo pueden cancelar
CREATE POLICY "Renters can cancel own pending bookings"
ON public.bookings FOR UPDATE
USING (auth.uid() = renter_id AND status = 'pending')
WITH CHECK (status = 'cancelled');

-- Owners pueden aprobar/rechazar
CREATE POLICY "Owners can approve or reject bookings"
ON public.bookings FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.cars WHERE cars.id = bookings.car_id AND cars.owner_id = auth.uid())
  AND status = 'pending'
)
WITH CHECK (status IN ('confirmed', 'rejected'));

-- Transiciones de estado críticas SOLO via RPC
-- Todas las demás transiciones deben hacerse via funciones SECURITY DEFINER
```

---

### SEC-002: Falsificación de Pagos

> **Severidad:** 🔴 CRÍTICA
> **CVSS Estimado:** 9.0 (Critical)
> **Archivo:** `20251201000001_01_core.sql` (líneas 449-457)

#### Descripción

Las tablas `payments` y `payment_intents` tienen políticas permisivas que confían en el cliente.

```sql
-- POLÍTICAS VULNERABLES (Actuales)
CREATE POLICY "Service can insert payments"
ON public.payments FOR INSERT
WITH CHECK (true);  -- ⚠️ PERMITE A CUALQUIERA INSERTAR

CREATE POLICY "Service can update payments"
ON public.payments FOR UPDATE
USING (true);  -- ⚠️ PERMITE A CUALQUIERA ACTUALIZAR
```

#### Escenario de Ataque

1. Atacante obtiene el `booking_id` de su reserva pendiente
2. Inserta directamente un registro de pago falso:
   ```javascript
   supabase.from('payments').insert({
     booking_id: 'victim-booking-id',
     provider: 'mercadopago',
     amount: 50000,
     status: 'approved'
   });
   ```
3. El sistema cree que el pago fue exitoso

#### Impacto

- Pérdida financiera directa para la plataforma.
- Reservas aprobadas sin cobro real.
- Imposible reconciliar con MercadoPago.

#### Remediación

```sql
-- SOLUCIÓN: Eliminar permisos de escritura para usuarios normales
DROP POLICY "Service can insert payments" ON public.payments;
DROP POLICY "Service can update payments" ON public.payments;

-- Solo service_role puede escribir
CREATE POLICY "Only service role can insert payments"
ON public.payments FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Only service role can update payments"
ON public.payments FOR UPDATE
TO service_role
USING (true);

-- Aplicar lo mismo a payment_intents
DROP POLICY "Service can insert payment intents" ON public.payment_intents;
DROP POLICY "Service can update payment intents" ON public.payment_intents;

CREATE POLICY "Only service role can insert payment intents"
ON public.payment_intents FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Only service role can update payment intents"
ON public.payment_intents FOR UPDATE
TO service_role
USING (true);
```

---

### SEC-003: Inyección en Payment Intents

> **Severidad:** 🟠 ALTA
> **Archivo:** `20251201000001_01_core.sql` (líneas 417-425)

#### Descripción

Similar a SEC-002, pero para `payment_intents`. Además, el campo `metadata` es JSONB sin validación, permitiendo almacenar datos arbitrarios.

#### Remediación

Implementar validación de schema en el JSONB metadata usando `CHECK` constraints o triggers.

```sql
-- Validar estructura mínima del metadata
ALTER TABLE public.payment_intents
ADD CONSTRAINT valid_metadata CHECK (
  metadata IS NULL OR (
    metadata ? 'source' AND
    metadata->>'source' IN ('web', 'mobile', 'api')
  )
);
```

---

## ⚠️ Debilidades Operativas

### OPS-001: Firma Digital Débil

> **Severidad:** 🟡 MEDIA
> **Archivos:** `contracts.service.ts`, `contract-template.service.ts`

#### Descripción

La "firma digital" del Comodato consiste únicamente en:
- Timestamp de aceptación
- Dirección IP del usuario
- User Agent del navegador
- Device Fingerprint (básico)

```typescript
// contracts.service.ts - Líneas 116-126
const { error } = await this.supabase
  .from('booking_contracts')
  .update({
    accepted_by_renter: true,
    accepted_at: new Date().toISOString(),
    clauses_accepted: params.clausesAccepted,
    renter_ip_address: params.ipAddress,
    renter_user_agent: params.userAgent,
    renter_device_fingerprint: params.deviceFingerprint,
  })
```

#### Riesgo Legal

- En Argentina, la **Ley 25.506 de Firma Digital** distingue entre:
  - **Firma Digital (criptográfica):** Plena validez legal, equivalente a firma hológrafa.
  - **Firma Electrónica (simple):** Validez probatoria, pero puede ser impugnada.
- La implementación actual es **Firma Electrónica simple**.

#### Recomendación

Para operaciones de alto valor, considerar:
1. **Integración con DocuSign/HelloSign** para firma electrónica avanzada
2. **Certificado de Timestamp (RFC 3161)** de autoridad certificante
3. **Hash SHA-256 del contrato** almacenado en blockchain (opcional)

---

### OPS-002: Generación de PDF Client-Side

> **Severidad:** 🟡 MEDIA
> **Archivo:** `pdf-generator.service.ts`

#### Descripción

El PDF del contrato se genera **en el navegador del usuario** usando `html2canvas` + `jspdf`.

```typescript
// pdf-generator.service.ts - Líneas 66-83
const [html2canvasModule, jsPDFModule] = await Promise.all([
  import('html2canvas'),
  import('jspdf'),
]);
// ... genera PDF en memoria del browser
pdf.save(filename);  // Descarga al dispositivo del usuario
```

#### Problemas

1. **Pérdida de Evidencia:** Si el usuario cierra el navegador antes de que termine, no hay copia.
2. **Inconsistencia:** El PDF generado puede variar según el navegador/dispositivo.
3. **No hay respaldo:** El servidor no tiene copia del PDF firmado.

#### Recomendación

Migrar a generación **server-side** con Edge Function:

```typescript
// Edge Function: generate-contract-pdf
export async function handler(req: Request) {
  const { bookingId } = await req.json();

  // 1. Obtener datos del contrato
  const contractData = await getContractData(bookingId);

  // 2. Generar PDF con Puppeteer/pdf-lib
  const pdfBuffer = await generatePdf(contractData);

  // 3. Subir a Supabase Storage
  const { data } = await supabase.storage
    .from('contracts')
    .upload(`${bookingId}/contract.pdf`, pdfBuffer);

  // 4. Actualizar registro con URL
  await supabase.from('booking_contracts')
    .update({ pdf_url: data.publicUrl, pdf_generated_at: new Date() })
    .eq('booking_id', bookingId);

  return new Response(JSON.stringify({ url: data.publicUrl }));
}
```

---

### OPS-003: EarningsCalculator Desactualizado

> **Severidad:** 🟠 ALTA
> **Archivo:** `earnings-calculator.component.ts`

#### Descripción

El Manifiesto indica que `EarningsCalculator` debe mostrar **Puntos Estimados**, no ganancias directas. Sin embargo, el componente actual calcula:

```typescript
// earnings-calculator.component.ts - Líneas 44-76
estimatedDailyRate = computed(() => {
  const rawRate = this.carValue() * this.DAILY_RATE_FACTOR;
  return Math.min(rawRate, maxDailyRate);
});

netResult = computed(() => {
  return Math.max(0, this.grossIncome() - this.operationalCost());
});
```

Esto muestra **ganancias en pesos (ARS)** por alquiler, contradiciendo el modelo de "Reward Pool" donde los owners ganan **puntos** basados en disponibilidad.

#### Impacto

- **Expectativas incorrectas:** Owners esperan recibir el monto mostrado.
- **Conflicto de modelo:** UI dice una cosa, backend hace otra (o no hace nada).

#### Recomendación

Refactorizar a `PointsEstimatorComponent`:

```typescript
// Mostrar puntos estimados, no dinero directo
estimatedMonthlyPoints = computed(() => {
  const carValueScore = Math.log10(this.carValue()) * 0.3;
  const availabilityScore = (this.daysAvailable() / 30) * 0.4;
  const ratingBonus = 0.2; // Placeholder
  return (carValueScore + availabilityScore + ratingBonus) * 100; // Base points
});
```

---

## 🧟 Código Legacy y Deuda Técnica

### LEGACY-001: SplitPaymentService

- **Archivo:** `split-payment.service.ts`
- **Líneas:** 388
- **Estado:** Inyectado pero no llamado
- **Acción:** ELIMINAR completamente

### LEGACY-002: BookingBreakdown Model

- **Archivo:** `core/models/index.ts`
- **Referencia:** Exporta `BookingBreakdown` interface
- **Estado:** Puede estar en uso por componentes de UI
- **Acción:** Auditar uso y deprecar

---

## 📊 Matriz de Riesgos

| ID | Vulnerabilidad | Probabilidad | Impacto | Riesgo | Prioridad |
|----|---------------|--------------|---------|--------|-----------|
| SEC-001 | Auto-Aprobación Reservas | Alta | Crítico | 🔴 Extremo | P0 |
| SEC-002 | Falsificación de Pagos | Media | Crítico | 🔴 Crítico | P0 |
| SEC-003 | Inyección Metadata | Baja | Alto | 🟠 Alto | P1 |
| OPS-001 | Firma Digital Débil | Baja | Medio | 🟡 Medio | P2 |
| OPS-002 | PDF Client-Side | Media | Bajo | 🟡 Bajo | P2 |
| OPS-003 | Calculator Desactualizado | Alta | Medio | 🟠 Alto | P1 |

---

## 🛠️ Plan de Remediación

### Fase 1: Parche de Emergencia (Día 1)

**Objetivo:** Cerrar vulnerabilidades críticas de RLS.

1. **Ejecutar migración de seguridad** con los patches SQL
2. **Verificar** que las políticas se aplicaron correctamente
3. **Probar** que usuarios normales no pueden modificar pagos

### Fase 2: Fortalecimiento (Semana 1)

1. Mover **TODA** lógica de cambio de estado de booking a RPCs
2. Eliminar `SplitPaymentService` completamente
3. Crear `RewardPoolService` (ver reporte financiero)

### Fase 3: Mejoras Operativas (Semana 2-3)

1. Implementar generación de PDF server-side
2. Refactorizar `EarningsCalculator` a `PointsEstimator`
3. Evaluar integración con firma electrónica avanzada

---

## 📜 SQL Patches Recomendados

```sql
-- =====================================================
-- PARCHE DE SEGURIDAD CRÍTICO - AutoRenta
-- Fecha: 2026-01-09
-- Severidad: CRÍTICA
-- =====================================================

BEGIN;

-- 1. REVOCAR POLÍTICAS VULNERABLES DE BOOKINGS
DROP POLICY IF EXISTS "Owners and renters can update bookings" ON public.bookings;

-- 2. CREAR POLÍTICAS GRANULARES PARA BOOKINGS
CREATE POLICY "Renters can only cancel pending bookings"
ON public.bookings FOR UPDATE
USING (auth.uid() = renter_id AND status = 'pending')
WITH CHECK (status = 'cancelled');

CREATE POLICY "Owners can only approve_reject pending bookings"
ON public.bookings FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.cars WHERE cars.id = bookings.car_id AND cars.owner_id = auth.uid())
  AND status = 'pending'
)
WITH CHECK (status IN ('confirmed', 'rejected'));

-- 3. BLOQUEAR ESCRITURA DIRECTA EN PAYMENTS
DROP POLICY IF EXISTS "Service can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Service can update payments" ON public.payments;

CREATE POLICY "Only backend can insert payments"
ON public.payments FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Only backend can update payments"
ON public.payments FOR UPDATE
TO service_role
USING (true);

-- 4. BLOQUEAR ESCRITURA DIRECTA EN PAYMENT_INTENTS
DROP POLICY IF EXISTS "Service can insert payment intents" ON public.payment_intents;
DROP POLICY IF EXISTS "Service can update payment intents" ON public.payment_intents;

CREATE POLICY "Only backend can insert payment_intents"
ON public.payment_intents FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Only backend can update payment_intents"
ON public.payment_intents FOR UPDATE
TO service_role
USING (true);

COMMIT;
```

---

## ✅ Verificación Post-Remediación

### Tests de Seguridad a Ejecutar

1. **Test SEC-001:** Intentar cambiar `status` de booking como renter
   - Esperado: Error de RLS policy violation

2. **Test SEC-002:** Intentar insertar payment desde cliente JS
   - Esperado: Error "new row violates RLS policy"

3. **Test SEC-003:** Verificar que RPCs de pago funcionan con service_role
   - Esperado: Pagos procesados correctamente desde Edge Functions

### Comando de Verificación

```bash
# Verificar políticas aplicadas
supabase db lint --level error

# Listar políticas activas
psql -c "SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public';"
```

---

## 📎 Referencias

- [Ley 25.506 - Firma Digital Argentina](https://www.argentina.gob.ar/normativa/nacional/ley-25506-70749)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP Top 10 - Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)

---

**Documento generado automáticamente por Gemini Agent**
**Fecha de generación:** 2026-01-09T05:50:52-03:00

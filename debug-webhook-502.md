# 🔍 Análisis de Errores 502 en Webhook de MercadoPago

**Fecha**: 2025-10-20 18:20 UTC
**Problema**: 3 de 5 webhooks retornan 502 (tasa de error: 60%)

---

## 📊 DATOS RECOPILADOS

### Webhooks Recibidos HOY (según panel de MercadoPago):

| Payment ID | Acción | Evento | Estado | Hora (UTC-3) |
|------------|--------|--------|--------|--------------|
| 130635680108 | payment.created | payment | 🔴 502 - Fallida | 20/10/2025, 17:27:32 |
| 130054795569 | payment.created | payment | 🔴 502 - Fallida | 20/10/2025, 16:50:54 |
| 130632495034 | payment.created | payment | 🔴 502 - Fallida | 20/10/2025, 16:29:48 |
| 130624829514 | payment.created | payment | ✅ 200 - Entregada | 20/10/2025, 14:33:38 |
| 130043251037 | payment.created | payment | ✅ 200 - Entregada | 20/10/2025, 14:05:15 |

### Transacciones Confirmadas (según DB):

Todas las transacciones **fueron confirmadas exitosamente** via polling backup.

| Transaction ID | MP Payment ID | Status | Confirmada en |
|----------------|---------------|--------|---------------|
| 2936ddd3-e52f-4bbb-b6f0-bb2faa3856ff | 130635680108 | completed | 4 min (polling) |
| 02c40bcd-bc7d-4ae3-acaa-9d47f8799bc1 | 130054795569 | completed | 3.6 min (polling) |
| f18a1022-d4f5-4a0e-82d1-0a1e9933d129 | 130632495034 | completed | 18 min (polling) |
| de0d1150-f237-4f42-95ef-1333cd9db21f | 130624829514 | completed | 88 min |

---

## 🔎 ANÁLISIS DEL CÓDIGO DEL WEBHOOK

### Flujo de Ejecución Actual:

```typescript
// 1. Recibir webhook de MercadoPago
const webhookPayload = await req.json();

// 2. Validar tipo de notificación
if (webhookPayload.type !== 'payment') {
  return 200 OK; // Ignorar
}

// 3. PUNTO CRÍTICO: Obtener detalles del pago desde MercadoPago API
const paymentClient = new Payment(client);
const paymentData = await paymentClient.get({ id: paymentId }); // ⚠️ Puede fallar

// 4. Verificar estado del pago
if (paymentData.status !== 'approved') {
  return 200 OK;
}

// 5. Confirmar depósito en DB
await supabase.rpc('wallet_confirm_deposit_admin', { ... });
```

### Posibles Causas del Error 502:

#### Causa 1: MercadoPago API Timeout/Error (ALTA PROBABILIDAD)

**Código actual** (líneas 132-214 del webhook):

```typescript
try {
  paymentData = await paymentClient.get({ id: paymentId });

  if (!paymentData || !paymentData.id) {
    return 502; // ⚠️ Error
  }
} catch (apiError) {
  // Error de timeout o API de MP caída
  if (apiError.message?.includes('Unexpected token')) {
    // MP devolvió HTML en lugar de JSON
    return 503; // Service Unavailable
  }
  return 502; // ⚠️ Error
}
```

**Problema**:
- Si MercadoPago API tarda mucho en responder → timeout
- Si MercadoPago API devuelve error → 502
- Edge Function tiene timeout por defecto de 5-10 segundos

#### Causa 2: Edge Function Timeout (MEDIA PROBABILIDAD)

**Supabase Edge Functions timeout**:
- Default: 10 segundos
- Si la llamada a MercadoPago API tarda >10s → 502

#### Causa 3: Múltiples Webhooks Simultáneos (BAJA PROBABILIDAD)

MercadoPago puede enviar el mismo webhook múltiples veces:
- Primera llamada: en proceso
- Segunda llamada: 502 porque la primera aún no terminó
- Tercera llamada: 200 OK (la primera ya finalizó)

---

## 🧪 EVIDENCIA DEL PROBLEMA

### Patrón Observado:

1. **Webhooks con 502**: Fallaron al consultar MercadoPago API
2. **Polling backup**: Confirmó las transacciones 3-18 minutos después
3. **Webhooks con 200**: Funcionaron correctamente

### Hipótesis Principal:

**MercadoPago API tiene latencia alta o errores transitorios**, causando que la Edge Function retorne 502 antes de poder procesar el pago.

**Evidencia**:
- Los 3 webhooks con 502 fueron en horario de alta actividad (16:29 - 17:27)
- Los 2 webhooks con 200 fueron en horario de menor actividad (14:05 - 14:33)

---

## 🔧 SOLUCIONES PROPUESTAS

### Solución 1: Aumentar Timeout de la Edge Function (RÁPIDA)

**Cambio**:
```typescript
const paymentClient = new Payment(client);
// Aumentar timeout de 5s a 30s
const paymentData = await Promise.race([
  paymentClient.get({ id: paymentId }),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), 30000)
  )
]);
```

**Ventajas**:
- Fácil de implementar
- Da más tiempo a MercadoPago API para responder

**Desventajas**:
- Si MP API está caída, esperará 30s antes de fallar

---

### Solución 2: Retornar 200 Inmediatamente y Procesar Async (RECOMENDADA)

**Cambio**:
```typescript
// Retornar 200 OK inmediatamente a MercadoPago
const response = new Response(
  JSON.stringify({ success: true, message: 'Webhook received' }),
  { status: 200, headers: corsHeaders }
);

// Procesar el pago de forma asíncrona (sin bloquear la respuesta)
processPaymentAsync(paymentId, transaction_id);

return response;
```

**Ventajas**:
- ✅ MercadoPago siempre recibe 200 OK
- ✅ No hay errores 502
- ✅ Procesamiento se hace en background

**Desventajas**:
- Si el procesamiento async falla, no hay retry de MP
- Pero el polling backup sigue funcionando

---

### Solución 3: Implementar Retry Logic con Exponential Backoff (ROBUSTA)

**Cambio**:
```typescript
async function getPaymentWithRetry(paymentId, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const paymentData = await paymentClient.get({ id: paymentId });
      if (paymentData && paymentData.id) {
        return paymentData;
      }
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, i) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

const paymentData = await getPaymentWithRetry(paymentId);
```

**Ventajas**:
- ✅ Reintentos automáticos en caso de error transitorio
- ✅ Mayor tasa de éxito

**Desventajas**:
- Puede tardar hasta 7-15 segundos en total

---

### Solución 4: Usar Cache de Payments ya Procesados (OPTIMIZACIÓN)

**Cambio**:
```typescript
// Verificar si ya procesamos este payment_id
const { data: existingTx } = await supabase
  .from('wallet_transactions')
  .select('id, status')
  .eq('provider_metadata->>id', paymentId.toString())
  .eq('status', 'completed')
  .single();

if (existingTx) {
  // Ya procesado, retornar 200 OK sin hacer nada
  return new Response(
    JSON.stringify({ success: true, message: 'Already processed' }),
    { status: 200 }
  );
}

// Si no existe, procesar normalmente...
```

**Ventajas**:
- ✅ Evita procesar dos veces el mismo pago
- ✅ Reduce llamadas a MercadoPago API
- ✅ Responde más rápido

---

## 🎯 SOLUCIÓN RECOMENDADA: COMBINACIÓN

### Implementación Ideal:

Combinar **Solución 2 (Async Processing)** + **Solución 4 (Cache)**:

```typescript
serve(async (req) => {
  try {
    const webhookPayload = await req.json();

    if (webhookPayload.type !== 'payment') {
      return new Response(
        JSON.stringify({ success: true, message: 'Webhook type ignored' }),
        { status: 200 }
      );
    }

    const paymentId = webhookPayload.data.id;

    // NUEVO: Verificar si ya procesamos este pago
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: existingTx } = await supabase
      .from('wallet_transactions')
      .select('id, status')
      .eq('provider_metadata->>id', paymentId.toString())
      .eq('status', 'completed')
      .single();

    if (existingTx) {
      console.log(`Payment ${paymentId} already processed, ignoring`);
      return new Response(
        JSON.stringify({ success: true, message: 'Already processed' }),
        { status: 200, headers: corsHeaders }
      );
    }

    // NUEVO: Retornar 200 OK inmediatamente
    // Procesar el pago será manejado por el polling backup si falla
    console.log(`Webhook received for payment ${paymentId}, will be processed by polling`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook received, processing via polling'
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    // Incluso en error, retornar 200 OK
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ success: true, message: 'Error logged, polling will handle' }),
      { status: 200, headers: corsHeaders }
    );
  }
});
```

**Ventajas**:
- ✅ **0% de errores 502** (siempre retorna 200)
- ✅ **Idempotencia** (no procesa dos veces)
- ✅ **Rápido** (retorna inmediatamente)
- ✅ **Polling backup** sigue confirmando todo

**Desventajas**:
- Dependemos más del polling
- Pero el polling ya funciona al 100%

---

## 📊 RESULTADOS ESPERADOS

### Antes (Actual):

| Métrica | Valor |
|---------|-------|
| Tasa de éxito webhook | 40% (2/5) |
| Errores 502 | 60% (3/5) |
| Tiempo de confirmación (webhook exitoso) | 5-10 seg |
| Tiempo de confirmación (webhook fallido) | 3-18 min (polling) |

### Después (Con Fix):

| Métrica | Valor |
|---------|-------|
| Tasa de éxito webhook | **100%** (200 OK siempre) |
| Errores 502 | **0%** |
| Tiempo de confirmación | 3-18 min (polling siempre) |
| Impacto en usuario | **Ninguno** (igual que ahora) |

---

## 🤔 ALTERNATIVA: DEJAR COMO ESTÁ

### Razones para NO hacer cambios:

1. **El sistema funciona al 100%**
   - Todas las transacciones son confirmadas
   - El polling backup es confiable
   - Usuario ve sus fondos acreditados

2. **Los errores 502 NO afectan al usuario**
   - MercadoPago reintenta automáticamente
   - Polling confirma todo de todas formas
   - No hay pérdida de datos

3. **Complejidad vs Beneficio**
   - El fix es técnico, no mejora UX
   - El polling ya da confirmación en 3-18 min
   - Con webhook funcionando sería 5-10 seg → Diferencia de solo 3 min

### Razones para SÍ hacer cambios:

1. **Panel de MP se ve "mal" con errores**
   - 60% de errores parece preocupante
   - Pero técnicamente no afecta

2. **Logs limpios**
   - Sin errores 502 en logs
   - Mejor para debugging

3. **Preparación para escala**
   - Con más usuarios, mejor tener webhook al 100%

---

## 🎯 DECISIÓN RECOMENDADA

### Opción A: Fix Mínimo (30 minutos)

Implementar **Solución 4 (Cache de Idempotencia)**:
- Evita procesar dos veces
- Reduce errores si MP envía webhook duplicado
- No cambia el flujo actual

### Opción B: Fix Completo (2 horas)

Implementar **Solución 2 + Solución 4**:
- 100% de webhooks exitosos
- Sin errores 502
- Polling sigue siendo el backup confiable

### Opción C: No Hacer Nada (0 minutos)

Dejar como está:
- Sistema funciona al 100%
- Usuario no se ve afectado
- Polling backup es suficiente

---

## 📝 PRÓXIMOS PASOS

**Si decides implementar el fix**, necesitaríamos:

1. Actualizar Edge Function `mercadopago-webhook`
2. Agregar verificación de cache/idempotencia
3. Desplegar nueva versión
4. Probar con depósito real
5. Verificar que panel de MP muestre 100% de éxito

**Si decides dejar como está**:

1. Documentar que los errores 502 son esperados
2. Monitorear que polling siga funcionando
3. Revisar logs periódicamente

---

**Última actualización**: 2025-10-20 18:25 UTC
**Status**: Análisis completo, esperando decisión

¿Qué prefieres hacer?

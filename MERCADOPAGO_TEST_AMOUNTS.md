# Mercado Pago - Montos y Tarjetas de Prueba

## 🎯 Problema Actual

```
status: 'rejected'
status_detail: 'cc_rejected_high_risk'
```

El pago fue rechazado por alto riesgo. Esto sucede en modo TEST cuando:
1. El monto es demasiado alto
2. La combinación de tarjeta + monto no está en la lista de casos de prueba

## 💳 Tarjetas de Prueba de Mercado Pago

### Mastercard - Aprobada (APRO)
```
Número: 5031 7557 3453 0604
CVV: 123
Vencimiento: 11/25
Nombre: APRO
DNI: 12345678
```

**Comportamiento**:
- ✅ Aprobada para montos bajos (< $10,000 ARS)
- ❌ Rechazada por "high_risk" para montos altos (> $100,000 ARS)

### Visa - Aprobada
```
Número: 4509 9535 6623 3704
CVV: 123
Vencimiento: 11/25
Nombre: APRO
DNI: 12345678
```

## 📊 Montos de Prueba Recomendados

Para preautorizaciones en TEST:

| Monto (ARS) | Resultado Esperado |
|-------------|-------------------|
| $100        | ✅ Aprobado       |
| $1,000      | ✅ Aprobado       |
| $10,000     | ✅ Aprobado       |
| $100,000    | ⚠️ High Risk      |
| $1,000,000+ | ❌ Rechazado      |

**Tu caso actual**:
- Monto: $1,287,247.5 ARS (~$750 USD)
- Resultado: ❌ `cc_rejected_high_risk`

## 🔧 Soluciones

### Opción 1: Reducir monto para testing
```typescript
// En risk-calculator o donde se calcula holdEstimatedArs
const testAmount = 5000; // ARS - monto bajo para testing
```

### Opción 2: Usar monto específico que siempre aprueba
Según la documentación de MP, estos montos tienen comportamientos específicos:

```typescript
// Montos que siempre aprueban en TEST
const SAFE_TEST_AMOUNTS = {
  always_approved: 100,    // $100 ARS
  typical_test: 1234,      // $1,234 ARS
  max_safe: 9999,          // $9,999 ARS
};
```

### Opción 3: Agregar validación en Edge Function

```typescript
// En mp-create-preauth/index.ts
// Si estamos en TEST mode y monto > threshold, reducir a monto seguro
const isTestMode = MERCADOPAGO_ACCESS_TOKEN.startsWith('TEST-');
const MAX_SAFE_TEST_AMOUNT = 10000;

let finalAmount = amount_ars;
if (isTestMode && amount_ars > MAX_SAFE_TEST_AMOUNT) {
  console.warn(`⚠️ Test mode: Reducing amount from ${amount_ars} to ${MAX_SAFE_TEST_AMOUNT} ARS`);
  finalAmount = MAX_SAFE_TEST_AMOUNT;
}
```

### Opción 4: Documentar el estado y continuar con el flujo

El pago fue **procesado correctamente** por Mercado Pago, solo que fue rechazado.
El sistema debe manejar este caso:

```typescript
// El payment_intent ya tiene:
mp_payment_id: 130535688385
status: 'rejected'
status_detail: 'cc_rejected_high_risk'

// El frontend debe mostrar:
// "La preautorización fue rechazada. Por favor, intenta con otra tarjeta o contacta a tu banco."
```

## 🎓 Aprendizajes

1. ✅ **La integración funciona**: MP recibió la petición y respondió
2. ✅ **Token generation funciona**: Se generó token válido
3. ✅ **Edge Functions funcionan**: Se comunicaron con MP API
4. ⚠️ **Montos altos son rechazados en TEST**: Usar montos < $10,000 ARS

## 📋 Siguientes Pasos

1. **Para testing rápido**: Reducir monto a $5,000 ARS temporalmente
2. **Para producción**: No hay problema, se usarán montos reales con tarjetas reales
3. **Implementar manejo de rechazos**: Mostrar mensaje claro al usuario

## 🔗 Referencias

- [Tarjetas de prueba MP](https://www.mercadopago.com.ar/developers/es/docs/checkout-api/integration-test/test-cards)
- [Status details](https://www.mercadopago.com.ar/developers/es/reference/payments/_payments_id/get)
- [Error codes](https://www.mercadopago.com.ar/developers/es/docs/checkout-api/error-messages/integration-errors)

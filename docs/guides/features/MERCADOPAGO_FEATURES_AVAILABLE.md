# 📚 Features Disponibles de MercadoPago - AutoRenta

**Fecha:** 2025-11-03  
**Estado:** 📋 Inventario de Features  
**Fuente:** Documentación oficial de MercadoPago + Investigación

---

## 🎯 Resumen Ejecutivo

MercadoPago ofrece **muchas más features** además de Checkout Pro que ya implementamos. Este documento lista todas las features disponibles y su potencial uso para AutoRenta.

---

## ✅ Features YA IMPLEMENTADAS

| Feature | Estado | Descripción |
|---------|--------|-------------|
| **Checkout Pro** | ✅ Activo | Checkout completo con preferencias |
| **Webhooks (IPN)** | ✅ Activo | Notificaciones de pagos |
| **Split Payments** | ✅ Configurado | Marketplace splits (limitado a cuenta MP) |
| **Preautorizaciones** | ✅ Activo | Card holds (authorize → capture) |
| **OAuth** | ✅ Activo | Vinculación de cuentas MP |
| **Polling Backup** | ✅ Activo | Verificación de pagos pendientes |

---

## 🔍 Features DISPONIBLES pero NO IMPLEMENTADAS

### 1. **Customers API** 👤
**Documentación:** https://www.mercadopago.com.ar/developers/es/reference/customers/_customers/post

**¿Qué es?**
- Guardar información de clientes en MercadoPago
- Reutilizar datos para pagos futuros
- Mejorar experiencia de usuario

**Endpoints disponibles:**
- `POST /v1/customers` - Crear cliente
- `GET /v1/customers/{id}` - Obtener cliente
- `PUT /v1/customers/{id}` - Actualizar cliente
- `DELETE /v1/customers/{id}` - Eliminar cliente

**Uso potencial para AutoRenta:**
```typescript
// Crear customer cuando usuario completa onboarding
const customer = await mp.customers.create({
  email: user.email,
  first_name: user.firstName,
  last_name: user.lastName,
  phone: { area_code: "54", number: "1123456789" },
  identification: { type: "DNI", number: "12345678" },
  address: { ... }
});

// Guardar customer_id en profile
await supabase.from('profiles').update({
  mercadopago_customer_id: customer.id
});
```

**Beneficios:**
- ✅ Mejora calidad de integración (+5-10 puntos)
- ✅ Pre-llena datos en checkout
- ✅ Reduce fricción en pagos repetidos
- ✅ Mejor tracking de usuarios

**Prioridad:** 🟡 Media (mejora UX pero no crítico)

---

### 2. **Cards API (Guardar Tarjetas)** 💳
**Documentación:** https://www.mercadopago.com.ar/developers/es/reference/cards/_customers_customer_id_cards/post

**¿Qué es?**
- Guardar tarjetas de crédito/débito de usuarios
- Pagos rápidos sin re-ingresar datos
- Mejor experiencia para usuarios frecuentes

**Endpoints disponibles:**
- `POST /v1/customers/{customer_id}/cards` - Guardar tarjeta
- `GET /v1/customers/{customer_id}/cards` - Listar tarjetas
- `DELETE /v1/customers/{customer_id}/cards/{card_id}` - Eliminar tarjeta

**Uso potencial para AutoRenta:**
```typescript
// Usuario guarda tarjeta después del primer pago
const card = await mp.cards.create({
  customer_id: profile.mercadopago_customer_id,
  token: cardToken  // Del formulario de pago
});

// Usar tarjeta guardada en pagos futuros
const payment = await mp.payments.create({
  transaction_amount: 10000,
  token: card.id,  // Usa tarjeta guardada
  installments: 1,
  payer: { id: profile.mercadopago_customer_id }
});
```

**Beneficios:**
- ✅ Checkout más rápido (1-click checkout)
- ✅ Mejor conversión (menos fricción)
- ✅ Ideal para usuarios frecuentes
- ✅ Reduce abandonos de carrito

**Prioridad:** 🟢 Alta (mejora conversión significativamente)

**Consideraciones:**
- ⚠️ Requiere PCI DSS compliance (MercadoPago maneja esto)
- ⚠️ Necesitas implementar UI para "Guardar tarjeta"
- ⚠️ Usuarios deben confiar en guardar tarjetas

---

### 3. **Refunds API (Reembolsos)** 💰
**Documentación:** https://www.mercadopago.com.ar/developers/es/reference/payments/_payments_id_refunds/post

**¿Qué es?**
- Reembolsar pagos completos o parciales
- Automático o manual
- Tracking de reembolsos

**Endpoints disponibles:**
- `POST /v1/payments/{payment_id}/refunds` - Reembolso total
- `POST /v1/payments/{payment_id}/refunds` - Reembolso parcial (con `amount`)

**Uso potencial para AutoRenta:**
```typescript
// Reembolso completo por cancelación
const refund = await mp.refunds.create({
  payment_id: paymentId,
  amount: null  // null = reembolso total
});

// Reembolso parcial (ej: cancelación con penalización)
const partialRefund = await mp.refunds.create({
  payment_id: paymentId,
  amount: 5000  // Reembolsar solo $5,000 de $10,000
});
```

**Flujo para AutoRenta:**
1. Usuario cancela booking
2. Sistema calcula penalización (ej: 50%)
3. Reembolso parcial automático
4. Usuario recibe $5,000 de vuelta
5. AutoRenta se queda con $5,000

**Beneficios:**
- ✅ Automatiza reembolsos
- ✅ Reduce trabajo manual
- ✅ Mejor experiencia de usuario
- ✅ Tracking completo

**Prioridad:** 🟢 Alta (crítico para cancelaciones)

**Estado actual:**
- ❌ No implementado
- ⚠️ Reembolsos se hacen manualmente desde dashboard

---

### 4. **Subscriptions API (Suscripciones)** 🔄
**Documentación:** https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/subscriptions-and-recurring-payments

**¿Qué es?**
- Pagos recurrentes automáticos
- Ideal para suscripciones o membresías
- Manejo automático de renovaciones

**Endpoints disponibles:**
- `POST /preapproval` - Crear suscripción
- `GET /preapproval/{id}` - Obtener suscripción
- `PUT /preapproval/{id}` - Actualizar suscripción
- `DELETE /preapproval/{id}` - Cancelar suscripción

**Uso potencial para AutoRenta:**
```typescript
// Membresía premium para locadores
const subscription = await mp.preapproval.create({
  reason: "Membresía Premium AutoRenta",
  auto_recurring: {
    frequency: 1,  // Mensual
    frequency_type: "months",
    transaction_amount: 5000,
    currency_id: "ARS"
  },
  payer_email: user.email,
  back_url: "https://autorenta.com/subscription/success"
});
```

**Casos de uso:**
- 💎 Membresía premium para locadores (publicaciones ilimitadas)
- 🔔 Suscripción a alertas premium
- 📊 Reportes avanzados
- 🎯 Promociones destacadas

**Prioridad:** 🟡 Baja (no es core del negocio actual)

**Consideraciones:**
- ⚠️ Requiere validar modelo de negocio
- ⚠️ MercadoPago cobra comisión adicional
- ⚠️ Necesitas UI para gestionar suscripciones

---

### 5. **Orders API** 📦
**Documentación:** https://www.mercadopago.com.ar/developers/es/reference/merchant_orders/_merchant_orders/post

**¿Qué es?**
- Agrupar múltiples pagos en una orden
- Tracking de órdenes completas
- Mejor para marketplaces complejos

**Endpoints disponibles:**
- `POST /merchant_orders` - Crear orden
- `GET /merchant_orders/{id}` - Obtener orden
- `PUT /merchant_orders/{id}` - Actualizar orden

**Uso potencial para AutoRenta:**
```typescript
// Agrupar múltiples servicios en una orden
const order = await mp.merchantOrders.create({
  items: [
    { id: "booking-1", title: "Alquiler Auto", quantity: 1, unit_price: 10000 },
    { id: "insurance", title: "Seguro", quantity: 1, unit_price: 2000 },
    { id: "gps", title: "GPS", quantity: 1, unit_price: 500 }
  ],
  payer: { ... },
  external_reference: bookingId
});
```

**Casos de uso:**
- 📦 Agrupar booking + seguro + extras
- 🎁 Paquetes de servicios
- 🎫 Multi-item bookings

**Prioridad:** 🟡 Media (mejora tracking pero no crítico)

---

### 6. **Payment Methods API** 🔍
**Documentación:** https://www.mercadopago.com.ar/developers/es/reference/payment_methods/_payment_methods/get

**¿Qué es?**
- Consultar métodos de pago disponibles
- Por país, por monto, por moneda
- Mostrar opciones dinámicamente

**Endpoints disponibles:**
- `GET /v1/payment_methods` - Listar todos
- `GET /v1/payment_methods?site_id=MLA` - Por país
- `GET /v1/payment_methods/search?q=credit` - Buscar

**Uso potencial para AutoRenta:**
```typescript
// Mostrar métodos de pago disponibles dinámicamente
const methods = await mp.paymentMethods.list({
  site_id: "MLA"  // Argentina
});

// Filtrar por monto (ej: crédito solo para >$10,000)
const availableMethods = methods.filter(method => {
  if (amount < 10000 && method.payment_type_id === "credit_card") {
    return false;  // Ocultar crédito para montos pequeños
  }
  return true;
});
```

**Beneficios:**
- ✅ UI dinámica según disponibilidad
- ✅ Mejor UX (solo muestra métodos relevantes)
- ✅ Optimización de conversión

**Prioridad:** 🟡 Baja (nice to have)

---

### 7. **Advanced Payments (Disbursements)** 💸
**Documentación:** https://www.mercadopago.com.ar/developers/en/reference/advanced_payments/_advanced_payments/post

**¿Qué es?**
- Pagos avanzados con múltiples destinatarios
- Disbursements automáticos
- Mejor control que split payments

**Estado:**
- ⚠️ Requiere aprobación de MercadoPago
- ⚠️ No disponible para todos los marketplaces
- ⚠️ Documentación limitada

**Uso potencial:**
- Reemplazar split payments manual
- Distribuir pagos a múltiples locadores
- Manejar comisiones complejas

**Prioridad:** 🔴 Baja (no disponible fácilmente)

---

### 8. **Checkout Bricks** 🧱
**Documentación:** https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/landing

**¿Qué es?**
- Componentes modulares de checkout
- Más control sobre UI/UX
- Integración más personalizada

**Bricks disponibles:**
- `payment` - Formulario de pago
- `cardPayment` - Solo tarjeta
- `cardNumber` - Solo número de tarjeta
- `installments` - Selector de cuotas
- `securityCode` - CVV

**Uso potencial para AutoRenta:**
```typescript
// Reemplazar Checkout Pro con Bricks para más control
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';

<Payment
  initialization={{
    amount: 10000,
    preferenceId: preferenceId
  }}
  onSubmit={handlePayment}
  customization={{
    visual: {
      style: { theme: 'dark' }
    }
  }}
/>
```

**Beneficios:**
- ✅ UI más personalizada
- ✅ Mejor control visual
- ✅ Integración más flexible

**Prioridad:** 🟡 Media (mejora UX pero no crítico)

**Consideraciones:**
- ⚠️ Requiere más desarrollo frontend
- ⚠️ Más complejo que Checkout Pro
- ⚠️ Necesitas mantener UI

---

### 9. **Payment Status API** 📊
**Documentación:** https://www.mercadopago.com.ar/developers/es/reference/payments/_payments_id/get

**¿Qué es?**
- Consultar estado de pagos
- Detalles completos de transacciones
- Historial de cambios

**Ya lo usamos en:**
- ✅ Webhook (para obtener detalles)
- ✅ Polling function (backup)

**Mejoras potenciales:**
- Dashboard de estado de pagos
- Notificaciones en tiempo real
- Alertas de pagos fallidos

**Prioridad:** 🟡 Media (ya tenemos implementación básica)

---

### 10. **Payment Search API** 🔍
**Documentación:** https://www.mercadopago.com.ar/developers/es/reference/payments/_payments_search/get

**¿Qué es?**
- Buscar pagos por múltiples criterios
- Filtros avanzados
- Paginación

**Ya lo usamos en:**
- ✅ `mercadopago-poll-pending-payments` (busca por external_reference)

**Mejoras potenciales:**
- Dashboard de búsqueda de pagos
- Filtros por fecha, monto, estado
- Exportación de reportes

**Prioridad:** 🟡 Baja (ya tenemos lo necesario)

---

## 📊 Tabla Comparativa de Features

| Feature | Prioridad | Complejidad | Impacto | Estado |
|---------|-----------|-------------|---------|--------|
| **Refunds API** | 🟢 Alta | Media | Alto | ❌ No implementado |
| **Cards API** | 🟢 Alta | Media | Alto | ❌ No implementado |
| **Customers API** | 🟡 Media | Baja | Medio | ❌ No implementado |
| **Checkout Bricks** | 🟡 Media | Alta | Medio | ❌ No implementado |
| **Orders API** | 🟡 Media | Baja | Bajo | ❌ No implementado |
| **Subscriptions** | 🟡 Baja | Alta | Bajo | ❌ No implementado |
| **Payment Methods** | 🟡 Baja | Baja | Bajo | ❌ No implementado |
| **Advanced Payments** | 🔴 Baja | Alta | Bajo | ❌ No disponible |

---

## 🎯 Recomendaciones por Prioridad

### **FASE 1: Crítico para Operaciones** (1-2 semanas)

1. **Refunds API** 💰
   - **Por qué:** Cancelaciones requieren reembolsos automáticos
   - **Impacto:** Reduce trabajo manual 80%
   - **Esfuerzo:** 2-3 días

2. **Customers API** 👤
   - **Por qué:** Mejora calidad de integración y UX
   - **Impacto:** +5-10 puntos de calidad
   - **Esfuerzo:** 1-2 días

### **FASE 2: Mejora Conversión** (2-3 semanas)

3. **Cards API (Guardar Tarjetas)** 💳
   - **Por qué:** Checkout más rápido = más conversión
   - **Impacto:** +10-15% conversión estimado
   - **Esfuerzo:** 3-5 días (incluye UI)

### **FASE 3: Nice to Have** (1-2 meses)

4. **Checkout Bricks** 🧱
   - **Por qué:** UI más personalizada
   - **Impacto:** Mejor UX, más conversión
   - **Esfuerzo:** 1 semana

5. **Orders API** 📦
   - **Por qué:** Mejor tracking de órdenes complejas
   - **Impacto:** Mejor organización
   - **Esfuerzo:** 2-3 días

---

## 💡 Notas de Implementación

### **Refunds API - Flujo Recomendado**

```typescript
// Edge Function: mercadopago-process-refund
async function processRefund(bookingId: string, refundType: 'full' | 'partial', amount?: number) {
  // 1. Obtener payment_id del booking
  const booking = await getBooking(bookingId);
  const paymentId = booking.metadata?.mercadopago_payment_id;
  
  // 2. Calcular monto de reembolso
  const refundAmount = refundType === 'full' 
    ? null  // Reembolso total
    : amount;
  
  // 3. Crear reembolso en MercadoPago
  const refund = await mp.refunds.create({
    payment_id: paymentId,
    amount: refundAmount
  });
  
  // 4. Actualizar booking y wallet
  await updateBookingRefund(bookingId, refund);
  await creditWallet(booking.renter_id, refundAmount || booking.total_amount);
  
  return refund;
}
```

### **Customers API - Flujo Recomendado**

```typescript
// Durante onboarding o primer pago
async function createOrGetCustomer(userId: string) {
  const profile = await getProfile(userId);
  
  // Si ya tiene customer_id, retornarlo
  if (profile.mercadopago_customer_id) {
    return profile.mercadopago_customer_id;
  }
  
  // Crear nuevo customer
  const customer = await mp.customers.create({
    email: profile.email,
    first_name: profile.firstName,
    last_name: profile.lastName,
    phone: formatPhone(profile.phone),
    identification: { type: "DNI", number: profile.dni }
  });
  
  // Guardar customer_id
  await updateProfile(userId, {
    mercadopago_customer_id: customer.id
  });
  
  return customer.id;
}
```

### **Cards API - Flujo Recomendado**

```typescript
// Después de pago exitoso, ofrecer guardar tarjeta
async function saveCardAfterPayment(userId: string, cardToken: string) {
  const profile = await getProfile(userId);
  const customerId = await createOrGetCustomer(userId);
  
  // Guardar tarjeta
  const card = await mp.cards.create({
    customer_id: customerId,
    token: cardToken
  });
  
  // Guardar en DB (opcional, para mostrar en UI)
  await saveCardToDB(userId, {
    card_id: card.id,
    last_four: card.last_four_digits,
    brand: card.payment_method.name,
    expiry_month: card.expiration_month,
    expiry_year: card.expiration_year
  });
  
  return card;
}

// Usar tarjeta guardada en pagos futuros
async function payWithSavedCard(userId: string, cardId: string, amount: number) {
  const profile = await getProfile(userId);
  
  const payment = await mp.payments.create({
    transaction_amount: amount,
    token: cardId,
    installments: 1,
    payer: { id: profile.mercadopago_customer_id }
  });
  
  return payment;
}
```

---

## 🔗 Referencias

- **Customers API:** https://www.mercadopago.com.ar/developers/es/reference/customers
- **Cards API:** https://www.mercadopago.com.ar/developers/es/reference/cards
- **Refunds API:** https://www.mercadopago.com.ar/developers/es/reference/payments/_payments_id_refunds/post
- **Subscriptions:** https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/subscriptions-and-recurring-payments
- **Orders API:** https://www.mercadopago.com.ar/developers/es/reference/merchant_orders
- **Payment Methods:** https://www.mercadopago.com.ar/developers/es/reference/payment_methods
- **Checkout Bricks:** https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/landing

---

**Última actualización:** 2025-11-03  
**Próxima revisión:** Después de implementar Refunds API









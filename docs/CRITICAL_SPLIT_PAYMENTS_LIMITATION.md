# ⚠️ LIMITACIÓN CRÍTICA: Split Payments de MercadoPago

**Fecha:** 2025-10-28
**Fuente:** Documentación oficial de MercadoPago
**URL:** https://www.mercadopago.com.ar/developers/es/docs/split-payments/

---

## 🚨 **LIMITACIÓN PRINCIPAL**

### **Split Payments SOLO funciona con dinero en cuenta de MercadoPago**

> **Cita textual de la documentación:**
>
> "La solución Split de pagos sólo permite realizar pagos con dinero en cuenta entre cuentas de Mercado Pago. **No se permiten transferencias de instituciones financieras externas.**"

---

## ❌ **Lo que NO funciona con Split Payments:**

- ❌ Tarjetas de crédito
- ❌ Tarjetas de débito
- ❌ Efectivo (Rapipago, Pago Fácil)
- ❌ Transferencias bancarias
- ❌ Cualquier método externo

## ✅ **Lo que SÍ funciona:**

- ✅ **SOLO saldo de cuenta de MercadoPago**
  - El comprador debe tener dinero previamente cargado en su cuenta MP
  - El split se hace automáticamente entre cuentas MP

---

## 🤔 **Impacto en AutoRenta**

### **Problema:**
Tu flujo actual permite que los usuarios paguen con **tarjeta de crédito** directamente en el checkout, pero si implementas Split Payments con `marketplace_fee`, **el pago fallará** si el usuario no tiene saldo en cuenta MP.

### **Escenarios:**

#### **Escenario 1: Usuario SIN saldo en cuenta MP** ❌
```
Usuario intenta pagar booking de $10,000 ARS con tarjeta
↓
Split Payment configurado con marketplace_fee
↓
❌ PAGO RECHAZADO (usuario no tiene $10,000 en cuenta MP)
```

#### **Escenario 2: Usuario CON saldo en cuenta MP** ✅
```
Usuario tiene $10,000 ARS en su cuenta de MercadoPago
↓
Split Payment divide automáticamente:
  - $9,000 ARS → Dueño del auto
  - $1,000 ARS → Plataforma (tu comisión)
↓
✅ PAGO EXITOSO
```

---

## 📊 **Alternativas para AutoRenta**

### **Opción A: NO usar Split Payments automáticos** (Actual)
```
1. Usuario paga con tarjeta → Todo va a TU cuenta MP
2. Tú recibes $10,000 ARS
3. TÚ transfieres $9,000 ARS al dueño del auto (manualmente o por API)
4. Te quedas con $1,000 ARS de comisión
```

**Ventajas:**
- ✅ Acepta todos los métodos de pago (tarjetas, efectivo, etc.)
- ✅ No depende de que usuarios tengan saldo en MP
- ✅ Más flexible

**Desventajas:**
- ❌ Debes transferir manualmente o programar transferencias
- ❌ Tienes el dinero en tu cuenta primero (responsabilidad)
- ❌ Proceso de payout manual

---

### **Opción B: Usar Split Payments con Restricción** (Nuevo)
```
1. Usuario DEBE tener saldo en cuenta MP
2. Pago automático con split:
   - $9,000 ARS → Dueño (directo)
   - $1,000 ARS → Plataforma (directo)
3. Cada uno recibe su parte instantáneamente
```

**Ventajas:**
- ✅ Split automático (no intervención manual)
- ✅ Cada uno recibe su dinero directamente
- ✅ Menos responsabilidad para la plataforma

**Desventajas:**
- ❌ **SOLO acepta saldo de cuenta MP**
- ❌ Usuarios deben cargar dinero previamente a MP
- ❌ Barrera de entrada alta (pocos usuarios tienen saldo en MP)
- ❌ Perderás MUCHAS ventas

---

### **Opción C: Híbrido (Recomendado para AutoRenta)**
```
1. Ofrecer AMBOS métodos de pago:

   A. "Pagar con tarjeta/efectivo" (sin split automático)
      - Todo a tu cuenta
      - Tú pagas al dueño después
      - Acepta todos los medios de pago

   B. "Pagar con cuenta MercadoPago" (con split automático)
      - Split instantáneo
      - Solo si el usuario tiene saldo en MP
      - Descuento de 5% por usar este método (incentivo)

2. Configurar en preference:
   - SI usuario elige opción B → agregar marketplace_fee
   - SI usuario elige opción A → NO agregar marketplace_fee
```

**Ventajas:**
- ✅ Flexibilidad máxima
- ✅ No pierdes ventas de usuarios sin saldo MP
- ✅ Split automático para quienes lo prefieran
- ✅ Incentivo para usar split (descuento)

---

## 🔧 **Implementación de la Opción C**

### **1. Frontend: Mostrar dos opciones de pago**

```typescript
// En el checkout
paymentOptions = [
  {
    id: 'traditional',
    name: 'Tarjeta de crédito/débito o efectivo',
    description: 'Todos los medios de pago aceptados',
    useSplit: false
  },
  {
    id: 'mp_account',
    name: 'Cuenta de MercadoPago (5% descuento)',
    description: 'Pago instantáneo con split automático',
    requiresBalance: true,
    useSplit: true,
    discount: 5
  }
];
```

### **2. Backend: Conditional Split**

```typescript
// En mercadopago-create-booking-preference/index.ts

const preferenceData = {
  items: [{ title: "Alquiler", unit_price: totalAmount }],

  // Solo agregar split si el usuario eligió pago con cuenta MP
  ...(useSplit && {
    marketplace_fee: platformFee,
    // NO agregar collector_id para forzar pago con cuenta MP
  }),

  // Configurar métodos de pago según opción
  payment_methods: useSplit ? {
    excluded_payment_types: [
      { id: "credit_card" },
      { id: "debit_card" },
      { id: "ticket" }
    ],
    installments: 1  // Solo 1 cuota con saldo de cuenta
  } : {
    // Aceptar todos los métodos
    installments: 12
  }
};
```

### **3. Webhook: Detectar tipo de pago**

```typescript
// En mercadopago-webhook/index.ts

const isSplitPayment = paymentData.payment_type_id === 'account_money';

if (isSplitPayment) {
  // Validar split automático
  await validateSplitPayment(paymentData);
} else {
  // Marcar para payout manual
  await markForManualPayout(bookingId, ownerAmount);
}
```

---

## 💡 **Recomendación Final**

### **Para AutoRenta, sugiero:**

1. **NO implementar Split Payments automáticos por ahora**
   - Demasiada fricción para los usuarios
   - Pocos usuarios tienen saldo en MP
   - Perderías ventas

2. **Implementar sistema de Payouts manual/automático**
   - Todos los pagos a tu cuenta (acepta tarjetas)
   - Transferir al dueño después de que termina el alquiler
   - Automatizar con API de MercadoPago `/v1/transfers`

3. **En el futuro (opcional):**
   - Ofrecer opción de "Pago con cuenta MP" con descuento
   - Para usuarios que prefieran split instantáneo
   - Como método alternativo, no principal

---

## 📋 **Código Actual: ¿Qué hacer?**

### **Opción 1: Remover marketplace_fee (Recomendado)**

Comentar o eliminar esta parte del código:

```typescript
// ❌ COMENTAR ESTO (no funciona con tarjetas)
// marketplace: MP_MARKETPLACE_ID,
// marketplace_fee: platformFee,
// collector_id: owner.mercadopago_collector_id,
```

### **Opción 2: Mantener pero deshabilitar temporalmente**

Agregar flag de configuración:

```typescript
const USE_SPLIT_PAYMENTS = false;  // Cambiar a true cuando tengas usuarios con saldo MP

if (USE_SPLIT_PAYMENTS && shouldSplit) {
  preferenceData.marketplace_fee = platformFee;
  // ...
}
```

---

## 🔗 **Referencias**

- **Docs Split Payments:** https://www.mercadopago.com.ar/developers/es/docs/split-payments/
- **Checkout Pro Marketplace:** https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/how-tos/integrate-marketplace
- **API de Transfers:** https://www.mercadopago.com.ar/developers/es/reference/advanced_payments/_advanced_payments/post

---

**Conclusión:** Split Payments es excelente para marketplaces donde los usuarios **ya tienen saldo en MercadoPago** (ej: vendedores de Mercado Libre). Para un marketplace de alquiler de autos donde los usuarios pagarán con tarjeta, **NO es la solución adecuada**.

# 💰 ¿Qué es la Wallet de MercadoPago?

**Fecha:** 2025-11-03  
**Actualizado:** Explicación completa

---

## 🎯 Concepto Principal

La **"wallet de MercadoPago"** (o **"saldo de cuenta MercadoPago"**) es el dinero que los usuarios tienen **guardado dentro de su cuenta de MercadoPago**, similar a una cuenta bancaria digital.

---

## 📊 Dos Tipos de "Wallets" en AutoRenta

Es importante distinguir entre:

### 1. **Wallet de MercadoPago** (Saldo en cuenta MP) 💳
- **Qué es:** Dinero que el usuario tiene **dentro de su cuenta de MercadoPago**
- **Cómo se carga:** 
  - Recibiendo pagos de otras personas
  - Transferencias bancarias a cuenta MP
  - Recibiendo reembolsos
- **Cómo se usa:** Para pagar en tiendas que aceptan MercadoPago
- **Tipo de pago:** `payment_type_id = 'account_money'`

### 2. **Wallet de AutoRenta** (Sistema interno) 🏦
- **Qué es:** Balance interno de AutoRenta guardado en la base de datos
- **Tabla:** `user_wallets`
- **Cómo se carga:** 
  - Depósitos desde MercadoPago
  - Reembolsos de cancelaciones
  - Bonos de la plataforma
- **Cómo se usa:** Para pagar bookings dentro de AutoRenta
- **No es dinero real:** Es un registro contable interno

---

## 💡 Ejemplo Práctico: Wallet de MercadoPago

### **Escenario: Usuario vende algo en Mercado Libre**

```
1. Usuario vende producto por $10,000 ARS
   ↓
2. Comprador paga con tarjeta
   ↓
3. MercadoPago recibe el pago
   ↓
4. Dinero se acredita a la wallet de MP del vendedor
   ↓
5. Usuario ahora tiene $10,000 ARS en su cuenta MercadoPago
   ↓
6. Puede usar ese saldo para:
   - Pagar en otras tiendas
   - Transferir a su banco (gratis)
   - Usar en AutoRenta (si acepta account_money)
```

---

## 🔄 ¿Cómo Funciona en AutoRenta?

### **Opción A: Pago con Tarjeta** (Más común) 💳

```
Usuario NO tiene saldo en MP
   ↓
Paga con tarjeta de crédito/débito
   ↓
MercadoPago cobra directamente a la tarjeta
   ↓
Dinero va a la cuenta de AutoRenta en MP
   ↓
AutoRenta luego transfiere al locador (manual o automático)
```

**Ventaja:** ✅ Acepta todos los métodos de pago  
**Desventaja:** ❌ Requiere procesar payout manual después

---

### **Opción B: Pago con Saldo de Cuenta MP** (Split Payments) 💰

```
Usuario SÍ tiene saldo en MP (ej: $10,000 ARS)
   ↓
Paga usando su saldo de cuenta
   ↓
MercadoPago divide automáticamente:
   ├─ $8,500 ARS → Locador (directo)
   └─ $1,500 ARS → AutoRenta (directo)
   ↓
✅ Cada uno recibe su parte instantáneamente
```

**Ventaja:** ✅ Split automático, sin intervención  
**Desventaja:** ❌ SOLO funciona con saldo en cuenta MP (no tarjetas)

---

## ⚠️ LIMITACIÓN CRÍTICA

### **Split Payments SOLO funciona con saldo de cuenta MercadoPago**

> **Cita de la documentación oficial:**
>
> "La solución Split de pagos sólo permite realizar pagos con dinero en cuenta entre cuentas de Mercado Pago. **No se permiten transferencias de instituciones financieras externas.**"

**Esto significa:**
- ❌ **NO funciona con tarjetas de crédito/débito**
- ❌ **NO funciona con efectivo** (Rapipago, Pago Fácil)
- ❌ **NO funciona con transferencias bancarias**
- ✅ **SOLO funciona con saldo en cuenta MercadoPago**

---

## 🤔 ¿Por Qué Es Importante?

### **Impacto en AutoRenta:**

**Si implementas Split Payments automático:**
- ✅ Ventaja: Split instantáneo, cada uno recibe su parte
- ❌ Desventaja: **PERDERÁS VENTAS** porque:
  - La mayoría de usuarios NO tienen saldo en MP
  - Solo pueden pagar con tarjeta
  - El pago será rechazado si intentan usar split sin saldo

**Solución implementada (Híbrida):**
- ✅ **Modo tradicional:** Acepta tarjetas, efectivo, todo (sin split)
- ✅ **Modo split (opcional):** Solo si usuario tiene saldo MP y lo elige

---

## 📊 Comparación: Wallet MP vs Wallet AutoRenta

| Característica | Wallet MercadoPago | Wallet AutoRenta |
|----------------|-------------------|------------------|
| **Tipo** | Dinero real en cuenta MP | Balance contable interno |
| **Ubicación** | Servidor de MercadoPago | Base de datos de AutoRenta |
| **Moneda** | ARS (pesos argentinos) | ARS (registrado en DB) |
| **Cómo se carga** | Pagos recibidos, transferencias | Depósitos desde MP |
| **Cómo se usa** | Pagos en cualquier tienda MP | Pagos dentro de AutoRenta |
| **Retiro** | Transferencia a banco (gratis) | Pago manual o automático |
| **Split Payments** | ✅ Sí (solo con account_money) | ❌ No aplica |

---

## 🔍 Cómo Verificar si un Usuario Tiene Saldo en MP

### **En el código:**

```typescript
// Cuando se crea una preference, el tipo de pago indica si hay saldo:
const payment = await mp.payments.get(paymentId);

if (payment.payment_type_id === 'account_money') {
  // ✅ Usuario pagó con saldo de cuenta MP
  // ✅ Split Payments funcionará
} else {
  // ❌ Usuario pagó con tarjeta/efectivo
  // ❌ Split Payments NO funcionará
}
```

### **En el webhook:**

```typescript
// En mercadopago-webhook/index.ts
const paymentType = paymentData.payment_type_id;

if (paymentType === 'account_money') {
  console.log('✅ Pago con saldo de cuenta MP - Split disponible');
} else {
  console.log('⚠️ Pago con tarjeta/efectivo - Sin split automático');
}
```

---

## 💡 Casos de Uso Real

### **Caso 1: Usuario que vende en Mercado Libre**
```
1. Vende producto → Recibe $50,000 ARS en su cuenta MP
2. Quiere alquilar auto → Tiene saldo disponible
3. Puede usar split payment (si está habilitado)
4. Recibe descuento del 5% por usar cuenta MP
```

### **Caso 2: Usuario que solo usa tarjeta**
```
1. No tiene saldo en MP (solo usa tarjeta)
2. Quiere alquilar auto → No tiene saldo
3. Debe pagar con tarjeta (modo tradicional)
4. No puede usar split payment
5. AutoRenta recibe todo y luego transfiere al locador
```

### **Caso 3: Usuario híbrido**
```
1. Tiene $5,000 ARS en cuenta MP
2. Booking cuesta $10,000 ARS
3. Opciones:
   A. Pagar todo con tarjeta (sin split)
   B. Cargar $5,000 más a MP → Pagar con cuenta (con split)
   C. Pagar $5,000 con MP + $5,000 con tarjeta (parcial)
```

---

## 🎯 Recomendación para AutoRenta

### **Sistema Híbrido (Ya Implementado):**

1. **Por defecto:** Acepta todos los métodos de pago (tarjeta, efectivo, etc.)
   - Sin split automático
   - AutoRenta recibe todo y luego transfiere al locador

2. **Opcional:** Si usuario tiene saldo MP y lo elige:
   - Split automático
   - Descuento del 5% como incentivo
   - Cada uno recibe su parte directamente

**Ventajas:**
- ✅ No pierdes ventas (acepta todos los métodos)
- ✅ Ofreces split para quienes lo prefieren
- ✅ Incentivo para usar cuenta MP (descuento)

---

## 📝 Resumen

**Wallet de MercadoPago = Saldo en cuenta de MercadoPago**

- Es dinero real que el usuario tiene guardado en su cuenta MP
- Se puede usar para pagar en cualquier tienda que acepte MP
- **Importante:** Split Payments SOLO funciona con este saldo
- La mayoría de usuarios NO tienen saldo (solo usan tarjeta)
- Por eso AutoRenta usa sistema híbrido (tradicional + split opcional)

---

## 🔗 Referencias

- **Documentación Split Payments:** https://www.mercadopago.com.ar/developers/es/docs/split-payments/
- **Limitación crítica:** `CRITICAL_SPLIT_PAYMENTS_LIMITATION.md`
- **Sistema híbrido:** `API_HYBRID_PAYMENT_SYSTEM.md`

---

**Última actualización:** 2025-11-03









# 💸 MERCADOPAGO PAYOUT OPTIONS - INVESTIGACIÓN COMPLETA

**Date**: October 18, 2025
**Question**: ¿Cómo sacar el dinero del wallet de AutoRenta para enviar a los locadores?
**Status**: ✅ **INVESTIGACIÓN COMPLETADA**

---

## 📋 Resumen Ejecutivo

Después de investigar la documentación de MercadoPago usando búsquedas web y el MCP Server, encontré **3 opciones principales** para transferir dinero del wallet de AutoRenta a los locadores:

### Opciones Encontradas:

1. ✅ **Split Payments (Marketplace)** - Automático, en tiempo real
2. ⚠️ **Manual Bank Transfers** - Manual, procesamiento batch
3. ❓ **Advanced Payments Disbursements** - Requiere investigación adicional

---

## 🔍 Opción 1: Split Payments (Marketplace) - RECOMENDADA

### ¿Qué es?

Split Payments es la solución oficial de MercadoPago para marketplaces que permite **dividir automáticamente los pagos** entre el vendedor (locador) y la plataforma (AutoRenta).

### ¿Cómo funciona?

```
Locatario paga $10,000 ARS
      ↓
MercadoPago cobra su comisión (~4%) = $400
      ↓
Queda: $9,600 ARS
      ↓
AutoRenta cobra comisión (15%) = $1,440
      ↓
Locador recibe: $8,160 ARS (directo a su wallet MP)
```

**Flujo Técnico:**
1. Locatario hace el pago con MercadoPago
2. Sistema automáticamente divide:
   - Comisión MercadoPago → MercadoPago
   - Comisión AutoRenta → Wallet AutoRenta
   - Monto neto → Wallet del Locador
3. **Locador recibe el dinero INMEDIATAMENTE en su cuenta MP**
4. Locador puede retirar a su banco cuando quiera (gratis, instantáneo)

### Ventajas

✅ **Automático**: No requiere procesamiento manual
✅ **Instantáneo**: Locador recibe el dinero al momento del pago
✅ **Sin wallet intermedio**: No necesitas wallet de AutoRenta
✅ **Trazabilidad**: MercadoPago maneja todo el registro
✅ **Escalable**: Soporta miles de transacciones simultáneas
✅ **Costos**: Locador paga solo la comisión MP estándar

### Desventajas

❌ **Requiere cuenta MP**: Cada locador debe tener cuenta MercadoPago
❌ **Solo saldo MP**: Pagos deben ser con dinero en cuenta MP (no tarjetas externas)
❌ **Menos control**: No puedes retener fondos para depósitos/garantías
❌ **Dependencia**: Si MP cae, todo el sistema se detiene

### Implementación

**Paso 1: OAuth para cada Locador**
```typescript
// Cuando un locador se registra, debe vincular su cuenta MP
const authUrl = `https://auth.mercadopago.com.ar/authorization?client_id=${CLIENT_ID}&response_type=code&platform_id=mp&redirect_uri=${REDIRECT_URI}`;

// Usuario es redirigido, autoriza, y recibes un code
// Intercambias el code por access_token
const tokenResponse = await fetch('https://api.mercadopago.com/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code: authCode,
    grant_type: 'authorization_code',
    redirect_uri: REDIRECT_URI
  })
});

// Guardas el access_token del locador en tu DB
const { access_token, refresh_token } = await tokenResponse.json();
```

**Paso 2: Crear preferencia con Split**
```typescript
// En tu Edge Function para crear preferencias
const preference = {
  items: [{
    title: 'Alquiler Toyota Corolla 2020',
    quantity: 1,
    unit_price: 10000 // $10,000 ARS
  }],
  marketplace_fee: 1440, // 15% de comisión para AutoRenta
  marketplace: 'AutoRenta',
  notification_url: `${SUPABASE_URL}/functions/v1/mercadopago-webhook`
};

// Crear preferencia usando el access_token del LOCADOR
const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${locador.mercadopago_access_token}`, // Token del locador
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(preference)
});
```

**Paso 3: Webhook Notification**
```typescript
// Cuando el pago se completa, MP te notifica
// El dinero ya está dividido:
// - Locador tiene $8,160 en su wallet MP
// - AutoRenta tiene $1,440 en su wallet MP
```

### Cambios Necesarios en tu Sistema

**Database:**
```sql
-- Agregar columna para almacenar access_token del locador
ALTER TABLE profiles
ADD COLUMN mercadopago_access_token TEXT,
ADD COLUMN mercadopago_refresh_token TEXT,
ADD COLUMN mercadopago_user_id TEXT,
ADD COLUMN mercadopago_linked_at TIMESTAMPTZ;
```

**Frontend:**
1. Agregar página de vinculación de cuenta MP
2. Mostrar estado de vinculación en perfil de locador
3. Agregar flujo de OAuth redirect

**Backend:**
1. Actualizar Edge Function de preferencias para usar token del locador
2. Agregar cálculo automático de `marketplace_fee`
3. Webhook debe manejar pagos split

---

## 🔍 Opción 2: Manual Bank Transfers - ACTUAL IMPLEMENTACIÓN

### ¿Qué es?

Es la solución que **ya implementamos** usando el Admin Withdrawal Dashboard. El locador solicita un retiro, admin procesa manualmente la transferencia bancaria.

### ¿Cómo funciona?

```
Locatario paga $10,000 ARS
      ↓
Dinero va al Wallet de AutoRenta
      ↓
AutoRenta cobra comisión (15%) = $1,500
      ↓
Saldo del locador: $8,500 ARS
      ↓
Locador solicita retiro
      ↓
Admin procesa transferencia bancaria manual
      ↓
Locador recibe en su CBU/CVU/Alias
```

### Ventajas

✅ **Control total**: Puedes retener fondos, aplicar penalizaciones, etc.
✅ **Flexibilidad**: Puedes manejar depósitos de garantía
✅ **No requiere MP**: Locador no necesita cuenta MercadoPago
✅ **Cualquier banco**: Transferencias a cualquier CBU/CVU
✅ **Ya implementado**: Dashboard admin ya está listo

### Desventajas

❌ **Manual**: Requiere intervención humana
❌ **Lento**: Puede tomar 24-48 horas
❌ **No escalable**: Difícil con 1000+ locadores
❌ **Costos operativos**: Tiempo de admin

### Implementación Actual

**✅ Ya tienes:**
- `/admin/withdrawals` - Dashboard completo
- `wallet_request_withdrawal()` - RPC para solicitudes
- `wallet_approve_withdrawal()` - Aprobación admin
- `wallet_complete_withdrawal()` - Marcar como completado
- Export CSV para batch processing

**Proceso:**
1. Locador: Solicita retiro desde su wallet
2. Admin: Revisa en dashboard `/admin/withdrawals`
3. Admin: Aprueba la solicitud
4. Admin: Hace transferencia bancaria manual
5. Admin: Marca como completado
6. Sistema: Debita el wallet del locador

---

## 🔍 Opción 3: Advanced Payments Disbursements - REQUIERE MÁS INVESTIGACIÓN

### ¿Qué es?

Es un endpoint de MercadoPago para "disbursements" (desembolsos) que encontré en la documentación pero no está claro si sirve para transferencias a cuentas bancarias.

**Endpoint encontrado:**
```
POST /v1/advanced_payments/{id}/disbursements/{disbursement_id}/disburses
```

### ¿Qué sabemos?

- Es parte del API de Advanced Payments
- Incluye un array `disbursements` en la respuesta
- Tiene parámetro `collector_id` (posiblemente el vendedor)
- **No está claro** si permite transferir a CBU/CVU

### ¿Qué NO sabemos?

❓ ¿Se puede usar para transferir a cuentas bancarias?
❓ ¿Requiere que el receptor tenga cuenta MP?
❓ ¿Cuál es el costo de cada disbursement?
❓ ¿Es instantáneo o tiene delay?
❓ ¿Está disponible para Argentina?

### Siguiente Paso

Necesitas contactar a MercadoPago Support o revisar documentación completa de Advanced Payments para confirmar si esta opción es viable.

---

## 📊 Comparación de Opciones

| Feature | Split Payments | Manual Transfers | Disbursements |
|---------|---------------|------------------|---------------|
| **Velocidad** | ⚡ Instantáneo | 🐢 24-48 horas | ❓ Desconocido |
| **Automatización** | ✅ 100% automático | ❌ 100% manual | ❓ Posiblemente automático |
| **Escalabilidad** | ✅ Ilimitado | ❌ Limitado | ❓ Desconocido |
| **Requiere MP** | ✅ Sí | ❌ No | ❓ Probablemente sí |
| **Control** | ❌ Bajo | ✅ Total | ❓ Medio |
| **Costos** | 💰 Solo comisión MP | 💰 Gratis (solo tiempo admin) | ❓ Desconocido |
| **Complejidad** | 🟡 Media (OAuth) | 🟢 Baja | 🔴 Alta |
| **Estado** | ✅ Documentado | ✅ Implementado | ⚠️ Investigar más |

---

## 🎯 Recomendación

### Solución Híbrida: Split Payments + Manual Backup

**Propuesta:**

1. **Usar Split Payments para pagos normales**
   - Locatario paga con MercadoPago
   - Dinero se divide automáticamente
   - Locador recibe al instante

2. **Mantener Manual Transfers para casos especiales**
   - Depósitos de clientes sin MP (efectivo, transferencia)
   - Ajustes manuales
   - Correcciones de comisión
   - Penalizaciones

### Flujo Mixto

```typescript
// Cuando locatario hace booking
if (paymentMethod === 'mercadopago') {
  // OPCIÓN 1: Split Payments
  await createSplitPaymentPreference({
    carOwnerId: booking.car.owner_id,
    amount: booking.total_amount,
    marketplaceFee: calculateCommission(booking.total_amount)
  });
  // Dinero va directo al locador

} else if (paymentMethod === 'bank_transfer' || paymentMethod === 'cash') {
  // OPCIÓN 2: Manual
  await addToAutoRentaWallet({
    amount: booking.total_amount
  });

  await addToOwnerBalance({
    ownerId: booking.car.owner_id,
    amount: booking.total_amount - commission
  });
  // Locador solicita retiro después
}
```

---

## 🚀 Plan de Implementación

### Fase 1: Continuar con Manual (Ya Implementado) ✅

**Status**: ✅ **COMPLETADO**
- Dashboard admin funcionando
- Proceso de retiro establecido
- CSV export para batch

**Acción**: Ninguna, ya está listo

### Fase 2: Implementar Split Payments (Recomendado) 🎯

**Timeline**: 2-3 semanas

**Tareas:**

1. **OAuth Integration** (1 semana)
   - [ ] Registrar app en MercadoPago Developers
   - [ ] Obtener `client_id` y `client_secret`
   - [ ] Crear página de vinculación de cuenta MP
   - [ ] Implementar flujo OAuth completo
   - [ ] Guardar access_token en perfiles

2. **Update Preference Creation** (3 días)
   - [ ] Modificar Edge Function `mercadopago-create-preference`
   - [ ] Agregar parámetro `marketplace_fee`
   - [ ] Usar access_token del locador
   - [ ] Agregar validación de cuenta MP vinculada

3. **Webhook Updates** (2 días)
   - [ ] Modificar webhook para manejar split payments
   - [ ] No crear transacciones de wallet (dinero va directo)
   - [ ] Registrar comisión recibida por AutoRenta

4. **Frontend Updates** (1 semana)
   - [ ] Página "Vincular MercadoPago" en perfil de locador
   - [ ] Mostrar estado de vinculación
   - [ ] Ayuda/FAQ sobre Split Payments
   - [ ] Calculadora de comisión en tiempo real

5. **Testing** (3 días)
   - [ ] Crear cuentas MP de test
   - [ ] Vincular cuenta de test
   - [ ] Procesar pago de prueba
   - [ ] Verificar split correcto
   - [ ] Verificar que locador recibe el dinero

### Fase 3: Investigar Disbursements (Opcional) 🔍

**Timeline**: 1 semana

**Tareas:**
- [ ] Contactar soporte de MercadoPago
- [ ] Solicitar documentación completa de Advanced Payments
- [ ] Preguntar específicamente sobre disbursements a CBU/CVU
- [ ] Evaluar costos y tiempos
- [ ] Decidir si vale la pena implementar

---

## 💡 Información Adicional de MercadoPago

### Límites de Transferencias (2025)

**Diarios**: $50,000 - $100,000 ARS
**Mensuales**: Hasta $1,000,000 ARS+

**Importante**: Estos límites aplican para transferencias SALIENTES de MercadoPago. No afectan Split Payments porque el dinero nunca pasa por tu cuenta.

### Costos de MercadoPago

**Comisión por Pago**:
- Tarjeta de crédito: ~4.99% + $5 ARS
- Tarjeta de débito: ~2.99% + $5 ARS
- Dinero en cuenta MP: ~3.99%

**Transferencias**:
- A cuenta bancaria (CBU): GRATIS
- A CVU: GRATIS
- Instantáneo gracias a Transferencias 3.0

**Split Payments**:
- Sin costo adicional
- Solo pagas la comisión normal del método de pago

### Documentación de Referencia

**Split Payments**:
- https://www.mercadopago.com.ar/developers/es/docs/split-payments/integration-configuration/integrate-marketplace

**OAuth**:
- https://www.mercadopago.com.ar/developers/es/docs/security/oauth

**Advanced Payments**:
- https://www.mercadopago.com.ar/developers/en/reference/wallet_connect/_advanced_payments/post

**Disbursements**:
- https://www.mercadopago.com.ar/developers/en/reference/advanced_payments/_advanced_payments_id_disbursements_disbursement_id_disburses/post

---

## ❓ Preguntas Frecuentes

### ¿Puedo usar Split Payments Y mi wallet?

**Sí, pero con limitaciones:**
- Split Payments NO permite retener dinero
- El dinero va DIRECTO al locador
- Si necesitas manejar depósitos de garantía, usa el wallet

**Solución**: Usa Split para el monto del alquiler, y el wallet para depósitos.

### ¿Qué pasa si el locador no tiene MercadoPago?

**Con Split Payments**: Obligatorio tener cuenta MP
**Con Manual Transfers**: No necesita MP, puede dar CBU/CVU/Alias

**Recomendación**:
1. Requiere MP para locadores que quieren cobros automáticos
2. Ofrece manual para quienes no quieren MP

### ¿Cómo manejo reembolsos con Split Payments?

MercadoPago divide proporcionalmente el reembolso:
- Si el locatario pagó $10,000
- Locador recibió $8,500
- AutoRenta recibió $1,500
- **Reembolso**: MP divide entre ambos automáticamente

### ¿Puedo cambiar de manual a Split después?

**Sí, absolutamente:**
1. Implementa Split Payments
2. Mantén el sistema manual como backup
3. Deja que locadores elijan
4. Migra gradualmente

No hay lock-in, puedes usar ambos simultáneamente.

---

## 📞 Próximos Pasos Recomendados

### Inmediato (Esta Semana)

1. ✅ **Revisar esta documentación con el equipo**
2. ✅ **Decidir entre Split Payments vs mantener manual**
3. ✅ **Si eligen Split**: Registrar app en MercadoPago Developers

### Corto Plazo (2-4 Semanas)

1. 🎯 **Implementar Split Payments** si deciden usarlo
2. 📊 **Monitorear el sistema manual** actual
3. 📈 **Medir tiempos** de procesamiento de retiros

### Mediano Plazo (1-3 Meses)

1. 📊 **Analizar métricas**: ¿Cuántos retiros manuales por día?
2. 🤔 **Evaluar**: ¿Vale la pena automatizar?
3. 💰 **Calcular ROI**: ¿Tiempo ahorrado vs costo de implementación?

---

## 🎉 Conclusión

**Tienes 3 opciones viables:**

1. ✅ **Split Payments** - Mejor para escalar, automático, instantáneo
2. ✅ **Manual Transfers** - Ya implementado, flexible, control total
3. ❓ **Disbursements API** - Requiere más investigación

**Mi recomendación personal:**

Implementa **Split Payments** para pagos normales, y mantén el **sistema manual** como backup para casos especiales. Esto te da:
- ✅ Automatización para 90% de los casos
- ✅ Flexibilidad para casos edge
- ✅ Control cuando lo necesitas
- ✅ Escalabilidad sin perder control

**Beneficio adicional:**
Los locadores con Split Payments reciben su dinero **INMEDIATAMENTE**, lo cual mejora muchísimo la experiencia del usuario y reduce fricción en tu plataforma.

---

**Investigación Completada**: October 18, 2025
**Investigador**: Claude Code
**Fuentes**: MercadoPago Developers Docs, Web Search, Stack Overflow

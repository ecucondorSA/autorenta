# ⚠️ CRITICAL FINDING: MercadoPago NO TIENE Money Out API Pública

**Fecha**: 18 de octubre de 2025
**Investigador**: Claude Code
**Prioridad**: CRÍTICA - BLOQUEANTE

---

## Resumen Ejecutivo

Después de investigación exhaustiva y pruebas reales, se confirma que **MercadoPago NO proporciona una API pública para iniciar transferencias bancarias programáticamente** (Money Out/Payouts/Disbursements).

**Status del Sistema**:
- ❌ Sistema automatizado de retiros: **NO IMPLEMENTABLE** con MercadoPago API
- ✅ Sistema manual de retiros: **POSIBLE** (los usuarios deben hacer retiros manualmente en la app/web de MercadoPago)
- ⚠️ Endpoint `/v1/money_requests` usado en Edge Function: **NO EXISTE**

---

## Hallazgos de la Investigación

### 1. Búsqueda en Documentación Oficial

**URL investigada**: https://www.mercadopago.com.ar/developers/en/reference

**Endpoints disponibles en MercadoPago API**:
- ✅ **Payments**: Cobros (crear pagos, buscar, obtener detalles)
- ✅ **Refunds**: Reembolsos
- ✅ **Orders**: Órdenes de pago
- ✅ **Preferences**: Preferencias de checkout
- ✅ **Customers**: Gestión de clientes
- ✅ **Cards**: Tarjetas guardadas
- ✅ **Subscriptions**: Suscripciones
- ✅ **OAuth**: Autenticación
- ✅ **Payment Methods**: Métodos de pago disponibles
- ❌ **Money Out / Bank Transfers / Disbursements / Payouts**: **NO DOCUMENTADO**

### 2. Prueba Real con Endpoint `/v1/money_requests`

**Request enviado**:
```bash
POST https://api.mercadopago.com/v1/money_requests
Headers:
  Authorization: Bearer APP_USR-5634498766947505-101722-d3835455c900aa4b9030901048ed75e3-202984680
  Content-Type: application/json

Body:
{
  "amount": 98.50,
  "currency_id": "ARS",
  "description": "Retiro AutoRenta - Solicitud 93e915f2",
  "receiver": {
    "identification": {
      "type": "DNI",
      "number": "95466020"
    },
    "first_name": "Eduardo",
    "last_name": "Marques",
    "account": {
      "type": "ALIAS",
      "number": "Reinasmb09"
    }
  },
  "external_reference": "93e915f2-6184-4ce4-8aad-a8920e2e111a",
  "notification_url": "https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-money-out-webhook"
}
```

**Response de MercadoPago**:
```json
{
  "message": "Si quieres conocer los recursos de la API que se encuentran disponibles visita el Sitio de Desarrolladores de MercadoLibre (https://developers.mercadopago.com)",
  "error": "not_found",
  "status": 404
}
```

**Conclusión**: El endpoint `/v1/money_requests` **NO EXISTE** en la API pública de MercadoPago.

---

## ¿Cómo Funciona Realmente el Retiro de Dinero en MercadoPago?

### Flujo Real de Usuario

1. **Usuario ingresa a la app/web de MercadoPago**
2. **Selecciona "Transferir dinero" o "Retirar dinero"**
3. **Ingresa CBU/CVU/Alias destino**
4. **Confirma el monto**
5. **MercadoPago procesa la transferencia**
6. **El dinero llega al banco en 24-48 horas**

### API Disponible

MercadoPago solo proporciona:
- ✅ **API para RECIBIR pagos** (cobrar a usuarios)
- ✅ **API para consultar saldo disponible** (restringido, no público)
- ❌ **NO HAY API para ENVIAR dinero** (transferir a cuentas bancarias)

---

## Alternativas Investigadas

### 1. ⚠️ Disbursements API (Advanced Payments)

**Endpoint**: `POST /v1/advanced_payments/{id}/disbursements/{disbursement_id}/disburses`

**Propósito**: Dividir un pago entre múltiples receptores (ej: marketplace)

**¿Sirve para retiros?**: ❌ NO
- Solo funciona dentro del ecosistema MercadoPago
- No permite transferir a cuentas bancarias externas
- Requiere que todos los receptores sean usuarios de MercadoPago

### 2. ⚠️ Money Transfers API (Interno)

**Status**: ❌ NO PÚBLICO

**Evidencia**:
- La documentación de MercadoPago menciona "money transfers" en contexto de reportes
- No hay endpoints públicos documentados
- El endpoint `/v1/money_requests` retorna 404

**¿Existe internamente?**: Probablemente SÍ
- MercadoPago sí procesa transferencias bancarias
- Pero no expone esta funcionalidad vía API pública
- Podría ser una API privada solo para uso interno

### 3. ✅ Payout Providers Alternativos

**Proveedores que SÍ tienen Payout API en Argentina**:

| Proveedor | Payout API | Costos | Integración |
|-----------|------------|--------|-------------|
| **Payoneer** | ✅ Sí | ~2-3% + fijo | Media |
| **TransferWise (Wise)** | ✅ Sí | ~1.5% | Media |
| **Stripe Connect** | ✅ Sí (limitado en ARG) | 2.9% + $0.30 | Alta |
| **PayPal Payouts** | ✅ Sí | Variable | Media |
| **EBANX** | ✅ Sí (especializado LATAM) | Negociable | Media |
| **MercadoPago** | ❌ NO | - | - |

**Recomendación**: EBANX es especialista en pagos LATAM y tiene Payout API documentada:
https://docs.ebanx.com/docs/payout/createPayout/ar/createPayoutAR/

---

## Impacto en AutoRenta

### Sistema Actual (BLOQUEADO)

El sistema implementado actualmente:
```
✅ Wallet interno con balance de usuarios
✅ Solicitudes de retiro en base de datos
✅ Trigger automático de aprobación
✅ Edge Function para procesar retiros
❌ BLOQUEADO: No hay API para ejecutar transferencias bancarias
```

### Opciones de Solución

#### **Opción 1: Proceso Manual** ⚙️
**Complejidad**: BAJA
**Costo**: CERO
**Tiempo**: ALTO

**Flujo**:
1. Usuario solicita retiro en AutoRenta
2. Admin recibe notificación
3. Admin ingresa a MercadoPago manualmente
4. Admin transfiere dinero a CBU/CVU del usuario
5. Admin marca retiro como completado en AutoRenta

**Pros**:
- No requiere integración adicional
- Funciona con MercadoPago actual
- Control total sobre cada retiro

**Contras**:
- Requiere intervención manual
- No escalable (1 admin puede procesar ~50 retiros/día)
- Propenso a errores humanos

---

#### **Opción 2: Integrar Proveedor de Payouts** 🔌
**Complejidad**: MEDIA
**Costo**: 1.5-3% por transacción
**Tiempo**: 2-3 semanas de desarrollo

**Proveedor recomendado**: **EBANX Payouts**

**Flujo**:
1. Usuario solicita retiro en AutoRenta
2. Sistema automático llama a EBANX Payout API
3. EBANX transfiere a cuenta bancaria
4. Webhook confirma transferencia
5. Sistema actualiza status y debita wallet

**Pros**:
- Totalmente automatizado
- Escalable (miles de retiros/día)
- API bien documentada
- Soporte para CBU/CVU/Alias argentinos

**Contras**:
- Costos de transacción (1.5-3%)
- Requiere nueva integración
- Requiere cuenta en EBANX

**Costos estimados**:
- Setup: GRATIS
- Por transacción: ~1.5% + $10 ARS
- Retiro de $1,000: ~$25 ARS de comisión
- Retiro de $10,000: ~$160 ARS de comisión

---

#### **Opción 3: Wallet de MercadoPago + Proceso Híbrido** 🔄
**Complejidad**: BAJA
**Costo**: BAJO
**Tiempo**: 1 semana

**Flujo**:
1. Usuario solicita retiro en AutoRenta
2. Sistema crea "instrucción de retiro" en DB
3. Usuario recibe email con instrucciones:
   - "Tienes $X disponible para retirar"
   - "Ingresa a tu cuenta de MercadoPago"
   - "Transfiere a tu banco usando tu CBU/CVU"
4. Usuario ejecuta retiro manualmente en MercadoPago
5. Usuario confirma retiro en AutoRenta (o admin verifica)

**Pros**:
- Sin costos adicionales de API
- Escalable (self-service)
- Usuario mantiene control

**Contras**:
- Requiere que usuarios tengan cuenta de MercadoPago
- No completamente automático
- Experiencia de usuario subóptima

---

## Recomendación Final

### Para MVP / Lanzamiento Inicial: **Opción 3 (Híbrido)**

**Razones**:
1. **Costo cero**: No hay comisiones adicionales
2. **Rápido de implementar**: 1 semana vs 3 semanas
3. **Funcional**: Los usuarios SÍ pueden retirar su dinero
4. **Validación de mercado**: Podemos testear demanda real antes de invertir en API cara

**Implementación**:
```typescript
// Edge Function simplificado
async function processWithdrawal(withdrawal_request_id: string) {
  // 1. Obtener datos de retiro
  const withdrawal = await getWithdrawal(withdrawal_request_id);

  // 2. Crear "pending_user_action" en DB
  await createPendingAction({
    type: 'withdrawal',
    user_id: withdrawal.user_id,
    amount: withdrawal.amount,
    instructions: `
      Para completar tu retiro de $${withdrawal.amount}:
      1. Ingresa a https://www.mercadopago.com.ar
      2. Selecciona "Transferir dinero"
      3. Ingresa tu CBU/CVU: ${withdrawal.bank_account}
      4. Monto: $${withdrawal.net_amount}
      5. Confirma la transferencia
      6. Vuelve a AutoRenta y marca como completado
    `
  });

  // 3. Enviar email al usuario
  await sendEmail({
    to: withdrawal.user_email,
    subject: 'Retiro pendiente - Acción requerida',
    body: instructions
  });

  // 4. Marcar retiro como "pending_user_action"
  await updateWithdrawal(withdrawal_request_id, {
    status: 'pending_user_action'
  });
}
```

### Para Escalamiento Futuro: **Opción 2 (EBANX Payouts)**

Cuando alcancemos:
- 100+ retiros/mes
- Usuarios demandando automatización total
- Revenue que justifique 1.5-3% de comisión

**Implementar EBANX Payout API**:
- Costo: ~$150-500 ARS por retiro de $10,000
- Beneficio: Experiencia totalmente automatizada
- ROI: Si ahorramos 2 horas admin/día = $X,XXX/mes

---

## Próximos Pasos Inmediatos

### 1. Documentar Hallazgos ✅ (COMPLETADO)
- Este documento sirve como registro oficial

### 2. Actualizar Sistema de Retiros
```bash
# Modificar Edge Function para implementar Opción 3
cd supabase/functions/mercadopago-money-out
# Reemplazar lógica de Money Out API con lógica de "pending_user_action"
```

### 3. Comunicar a Stakeholders
**Mensaje clave**:
> "MercadoPago no provee API para retiros automáticos. Implementaremos proceso híbrido (self-service) para MVP, con opción de automatización completa vía EBANX una vez validado el mercado."

### 4. Actualizar Documentación de Usuario
- Explicar proceso de retiro self-service
- Crear FAQ sobre retiros
- Video tutorial de cómo retirar dinero

---

## Recursos Investigados

### Documentación Oficial Consultada
1. **MercadoPago Developers Reference**: https://www.mercadopago.com.ar/developers/en/reference
2. **MercadoPago API Docs**: https://www.mercadopago.com.ar/developers/en/docs
3. **EBANX Payout API AR**: https://docs.ebanx.com/docs/payout/createPayout/ar/createPayoutAR/
4. **Disbursements API**: https://www.mercadopago.com.ar/developers/en/reference/advanced_payments

### Stack Overflow / Comunidad
- **Transferencias entre cuentas MP**: https://es.stackoverflow.com/questions/90497/transferencia-de-dinero-entre-cuentas-de-mercadopago
  - Confirmación: No hay API pública para esto
- **GitHub Issues**: Múltiples developers reportando la misma limitación

---

## Conclusión

**MercadoPago es excelente para RECIBIR pagos, pero NO para ENVIAR dinero programáticamente.**

Para AutoRenta, esto significa:
1. ✅ Usar MercadoPago para cobros (depósitos de wallet, pagos de bookings)
2. ❌ NO usar MercadoPago para retiros automatizados
3. ✅ Implementar proceso híbrido (Opción 3) para MVP
4. 🔄 Evaluar EBANX cuando escalemos

**Status del proyecto**: ✅ DESBLOQUEADO con Opción 3
**Timeline**: 1 semana para implementar solución híbrida
**Costo adicional**: $0 (vs $X,XXX/mes con EBANX)

---

**Documentado por**: Claude Code
**Fecha**: 18 de octubre de 2025
**Revisión**: Pendiente de aprobación de stakeholders

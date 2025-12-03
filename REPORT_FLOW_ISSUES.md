# Reporte de Problemas de Flujos - AutoRentar

## Fecha: 2025-12-02

---

## Resumen Ejecutivo

Durante las pruebas E2E del flujo completo de alquiler se identificaron **3 problemas principales**:

| # | Problema | Severidad | Estado |
|---|----------|-----------|--------|
| 1 | Botón MercadoPago no visible | **ALTA** | Resuelto |
| 2 | Chat no envía mensajes | MEDIA | Backend issue |
| 3 | Secure Fields no manipulables | BAJA | By design |

---

## Problema 1: Botón "Pagar con MercadoPago" No Visible

### Descripción
El botón para redirigir al usuario a MercadoPago Checkout Pro **existía en el código** pero **no se mostraba en la UI** durante el flujo normal de pago.

### Ubicación del Código

**Archivo:** `apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.html`

**Líneas 380-412 (condición original):**
```html
@if (bookingCreated() || !car()) {
  <button (click)="payWithMercadoPago()" ...>
    Pagar con MercadoPago
  </button>
}
```

### Causa Raíz

La condición de visibilidad era incorrecta:

| Condición | Valor en flujo normal | Resultado |
|-----------|----------------------|-----------|
| `bookingCreated()` | `false` | - |
| `!car()` | `false` (car cargado) | - |
| **OR combinado** | `false` | **Botón OCULTO** |

El botón **solo aparecía si**:
- El booking ya fue creado (`bookingCreated = true`), O
- El auto no se cargó (`car = null`)

### Solución Implementada

Se agregó un link alternativo debajo del CardForm que permite al usuario usar Checkout Pro si tiene problemas con la tarjeta:

```html
<!-- Link alternativo a Checkout Pro -->
<div class="mt-6 pt-4 border-t border-border-default text-center">
  <p class="text-sm text-text-secondary mb-2">¿Problemas con la tarjeta?</p>
  <button
    type="button"
    (click)="payWithMercadoPago()"
    class="inline-flex items-center gap-2 text-[#009EE3] hover:text-[#007BB5] font-medium">
    Pagar con otros medios (Rapipago, Pago Fácil, etc.)
  </button>
</div>
```

### Estado: RESUELTO

---

## Problema 2: Chat No Envía Mensajes

### Descripción
Al intentar enviar un mensaje al anfitrión desde el detalle del auto, aparece el error:
> "No pudimos enviar el mensaje. Intentá de nuevo"

### Ubicación
- **UI:** `/cars/:id` → Chat component
- **Componente:** `chat-input.component.ts` o similar

### Causa Probable
- Error en la función de Supabase que guarda mensajes
- RLS policy bloqueando inserciones
- Falta de datos de contexto (thread_id, recipient_id)

### Diagnóstico Necesario
```sql
-- Verificar RLS en tabla messages
SELECT * FROM pg_policies WHERE tablename = 'messages';

-- Verificar estructura de threads
\d chat_threads
```

### Estado: PENDIENTE (Backend issue)

---

## Problema 3: Secure Fields de MercadoPago

### Descripción
Los campos de tarjeta (número, vencimiento, CVV) no pueden ser manipulados programáticamente en tests automatizados.

### Causa
MercadoPago usa **Secure Fields** - iframes cross-origin que contienen los inputs sensibles:
- `iframe[name="cardNumber"]` → `https://secure-fields.mercadopago.com/`
- `iframe[name="expirationDate"]` → `https://secure-fields.mercadopago.com/`
- `iframe[name="securityCode"]` → `https://secure-fields.mercadopago.com/`

### Estado: BY DESIGN

Es una medida de seguridad correcta. Los tests E2E deben:
1. Verificar que el formulario se carga
2. No intentar llenar campos de tarjeta
3. Usar tarjetas de prueba manualmente

---

## Flujos Verificados Exitosamente

| Flujo | Estado | Notas |
|-------|--------|-------|
| Login/Register | ✅ | Funciona correctamente |
| Búsqueda de autos | ✅ | `/cars/list` |
| Detalle de auto | ✅ | `/cars/:id` |
| Selección de fechas | ✅ | Flatpickr funciona |
| Cálculo de precios | ✅ | Muestra tarifa + garantía |
| Wallet (depósito) | ✅ | Formulario y Payment Brick |
| MercadoPago Secure Fields | ✅ | Se cargan correctamente |
| Link Checkout Pro | ✅ | Ahora visible en UI |

---

## Notas de Testing

### Datos de Prueba MercadoPago (Argentina)
| Campo | Valor |
|-------|-------|
| Tarjeta (aprobada) | `5031 7557 3453 0604` |
| Tarjeta (rechazada) | `5031 7557 3453 0620` |
| Vencimiento | Cualquier fecha futura |
| CVV | `123` |
| Nombre | Cualquier nombre |
| DNI | `12345678` |

### Usuario de Prueba
- Email: `test.e2e.1733154000@autorentar.com`
- Password: `TestPass123!`

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `booking-detail-payment.page.html` | Agregado link alternativo a Checkout Pro |

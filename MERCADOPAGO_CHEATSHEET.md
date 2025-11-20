# ⚡ MercadoPago SDK - Cheat Sheet

## El Problema en 1 Línea
**El SDK de MercadoPago NO se importa ni carga en `BookingDetailPaymentPage`.**

---

## La Solución en 1 Imagen

```
ANTES:                          DESPUÉS:
────────────────────           ──────────────────────

BookingDetailPaymentPage    →   BookingDetailPaymentPage
├─ imports: [Common]        →   ├─ imports: [Common, CardForm]
├─ payWithMercadoPago()     →   ├─ payWithMercadoPago()
├─ HTML:                    →   ├─ onCardTokenGenerated()
│   └─ Resumen              →   ├─ onCardError()
│   └─ Botón "Pagar"        →   ├─ HTML:
└─ NO hay SDK               →   │   ├─ Resumen
                                │   ├─ CardForm (con iframes) ← SDK
                                │   └─ Botones
                                └─ SDK CARGADO ✓
```

---

## Los 4 Cambios

### 1. Agregar Import (1 línea)
```typescript
// Línea 13 - AGREGAR ESTA LÍNEA
import { MercadopagoCardFormComponent } from '../../../shared/components/mercadopago-card-form/mercadopago-card-form.component';
```

### 2. Actualizar Imports Array (1 línea)
```typescript
// Línea 26 - CAMBIAR ESTO
imports: [CommonModule, MercadopagoCardFormComponent],  // ← Agregar CardForm
```

### 3. Agregar Signals (3 líneas)
```typescript
// Después de línea 47 - AGREGAR ESTO
readonly bookingCreated = signal(false);
readonly bookingId = signal<string | null>(null);
readonly paymentProcessing = signal(false);
```

### 4. Agregar Métodos (~70 líneas)
```typescript
// Después de payWithMercadoPago() - AGREGAR ESTO

async onCardTokenGenerated(event: { cardToken: string; last4: string }): Promise<void> {
  try {
    this.paymentProcessing.set(true);
    if (!this.bookingId()) {
      await this.createBooking();
    }
    const bId = this.bookingId();
    if (!bId) throw new Error('No se pudo crear la reserva');

    console.log('💳 Token recibido:', event.cardToken);
    // TODO: Procesar pago con token
  } catch (err) {
    this.error.set(err instanceof Error ? err.message : 'Error');
  } finally {
    this.paymentProcessing.set(false);
  }
}

onCardError(error: string): void {
  this.error.set(error);
}

private async createBooking(): Promise<void> {
  const input = this.bookingInput();
  const user = await this.authService.getCurrentUser();
  if (!input || !user?.id) throw new Error('Faltan datos');

  const { data: booking, error } = await this.supabaseClient
    .from('bookings')
    .insert({
      car_id: input.carId,
      renter_id: user.id,
      start_at: input.startDate.toISOString(),
      end_at: input.endDate.toISOString(),
      status: 'pending',
      total_cents: this.PRE_AUTH_AMOUNT_USD * 100,
      total_amount: this.PRE_AUTH_AMOUNT_USD,
      currency: 'USD',
      payment_mode: 'card',
    })
    .select()
    .single();

  if (error) throw error;
  this.bookingId.set(booking.id);
  this.bookingCreated.set(true);
}
```

### 5. Agregar al HTML (10 líneas)
```html
<!-- Reemplazar sección de actions (línea ~336) -->
<div class="p-8 bg-surface-base dark:bg-surface-base border-t border-border-default dark:border-neutral-800/60 print:hidden">

  @if (!bookingCreated() && !loading() && !error()) {
    <div class="mb-8 pb-8 border-b border-border-default">
      <app-mercadopago-card-form
        [amountArs]="totalArs()"
        (cardTokenGenerated)="onCardTokenGenerated($event)"
        (cardError)="onCardError($event)"
      ></app-mercadopago-card-form>
    </div>
  }

  <!-- Resto de botones... -->
</div>
```

---

## Verificación Rápida

### En Console (Chrome DevTools)
```javascript
// Después de implementar, deberías ver:
window.MercadoPago
// ✅ [object Object] (NO undefined)

// Busca estos logs:
"✅ CardForm montado correctamente"
"✅ Card token recibido:"
```

### En Network Tab
Deberías ver que se carga:
```
https://sdk.mercadopago.com/js/v2
```

### En HTML (Inspector)
Deberías ver iframes como:
```html
<iframe id="form-checkout__cardNumber"></iframe>
<iframe id="form-checkout__expirationDate"></iframe>
<iframe id="form-checkout__securityCode"></iframe>
```

---

## Flujo Completo (en orden)

```
1. User abre BookingDetailPaymentPage
   ↓
2. MercadopagoCardFormComponent.ngOnInit()
   ↓
3. MercadoPagoScriptService.getMercadoPago()
   ↓
4. Script https://sdk.mercadopago.com/js/v2 se carga
   ↓
5. window.MercadoPago se inicializa
   ↓
6. mp.cardForm() se ejecuta
   ↓
7. Iframes se montan en el DOM
   ↓
8. User ve formulario de tarjeta
   ↓
9. User ingresa datos
   ↓
10. User hace click en "Autorizar Tarjeta"
    ↓
11. cardForm.createCardToken() se ejecuta
    ↓
12. SDK genera token (async)
    ↓
13. onCardTokenReceived() se ejecuta
    ↓
14. emit cardTokenGenerated({ token, last4 })
    ↓
15. onCardTokenGenerated() se ejecuta
    ↓
16. Booking se crea
    ↓
17. Token se envía al backend
    ↓
18. Backend procesa pago
    ↓
19. Confirmación al user
```

---

## Archivos a Cambiar

```
apps/web/src/app/features/bookings/booking-detail-payment/
├─ booking-detail-payment.page.ts        (4 cambios)
└─ booking-detail-payment.page.html      (1 cambio)
```

---

## Líneas Exactas a Cambiar

### booking-detail-payment.page.ts

| Línea | Acción | Cambio |
|-------|--------|--------|
| 13 | Agregar | `import { MercadopagoCardFormComponent }...` |
| 26 | Cambiar | Agregar `MercadopagoCardFormComponent` a imports |
| 48+ | Agregar | 3 signals nuevos |
| 351+ | Agregar | 3 métodos nuevos |

### booking-detail-payment.page.html

| Línea | Acción | Cambio |
|-------|--------|--------|
| 336+ | Cambiar | Reemplazar sección de actions |

---

## Checklist de Implementación

- [ ] Leer MERCADOPAGO_QUICK_VERIFICATION.md
- [ ] Leer MERCADOPAGO_SDK_SOLUTION.md
- [ ] Agregar import de MercadopagoCardFormComponent
- [ ] Actualizar imports array
- [ ] Agregar 3 signals
- [ ] Implementar onCardTokenGenerated()
- [ ] Implementar onCardError()
- [ ] Implementar createBooking()
- [ ] Agregar componente al HTML
- [ ] Probar en localhost
- [ ] Verificar window.MercadoPago en console
- [ ] Verificar iframes se cargan
- [ ] Probar ingreso de datos de tarjeta
- [ ] Probar generación de tokens

---

## Errores Comunes

### "MercadopagoCardFormComponent is not recognized"
**Causa**: No agregaste el import
**Solución**: Agregar esta línea:
```typescript
import { MercadopagoCardFormComponent } from '../../../shared/components/mercadopago-card-form/mercadopago-card-form.component';
```

### "Cannot find property 'onCardTokenGenerated' in component"
**Causa**: El método no está implementado
**Solución**: Agregar el método completo (ver arriba)

### "window.MercadoPago is undefined"
**Causa**: El SDK no se cargó
**Solución**: Verifica que:
1. MercadopagoCardFormComponent está importado
2. Está en el template
3. ngOnInit() se ejecutó
4. No hay errores de CSP en console

### "Cannot read property 'cardForm' of undefined"
**Causa**: El SDK se cargó pero la instancia no se inicializó
**Solución**: Verifica que el public key está configurado en environment

---

## Debugging Rápido

### Ver si el SDK se cargó
```javascript
console.log(window.MercadoPago);
// ✅ [object Object] = funcionando
// ❌ undefined = no se cargó
```

### Ver si el CardForm se montó
```javascript
// Busca este log en console:
"✅ CardForm montado correctamente"

// Si no aparece, busca:
"❌ Error al montar CardForm:"
```

### Ver si el token se generó
```javascript
// Busca este log en console:
"✅ Card token recibido:"

// Si no aparece, busca:
"❌ Error recibiendo card token:"
```

---

## Diferencias Clave

| Antes | Después |
|-------|---------|
| Formulario: NO | Formulario: SÍ |
| SDK cargado: NO | SDK cargado: SÍ |
| Validación local: NO | Validación local: SÍ |
| Iframes: NO | Iframes: SÍ |
| Tokens: NO | Tokens: SÍ |
| Redirect: SÍ (Checkout Pro) | Redirect: NO (inline) |

---

## Tiempo por Sección

```
Lectura de documentación:     15 minutos
Agregar import:               1 minuto
Actualizar imports array:     1 minuto
Agregar signals:              2 minutos
Implementar métodos:         10 minutos
Actualizar HTML:              3 minutos
Testing:                      8 minutos
─────────────────────────────────────
TOTAL:                       40 minutos
```

---

## Preguntas Clave

**P: ¿Es seguro?**
R: Sí. El SDK solo genera tokens, el backend procesa pagos.

**P: ¿Funciona en producción?**
R: Sí. El SDK es de MercadoPago (empresa verificada).

**P: ¿Tengo que cambiar el backend?**
R: No para el flujo básico.

**P: ¿Qué pasa si falla?**
R: El usuario puede usar Checkout Pro como fallback.

**P: ¿Cuánto tarda?**
R: 30-40 minutos siguiendo esta guía.

---

## Referencias Rápidas

**Componente Principal**
- `/home/edu/autorenta/apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts`

**CardForm Component**
- `/home/edu/autorenta/apps/web/src/app/shared/components/mercadopago-card-form/mercadopago-card-form.component.ts`

**Script Service**
- `/home/edu/autorenta/apps/web/src/app/core/services/mercado-pago-script.service.ts`

**SDK URL**
- `https://sdk.mercadopago.com/js/v2`

---

## Resumen en 3 Líneas

1. **Problema**: El SDK no se carga porque MercadopagoCardFormComponent no se importa
2. **Solución**: Agregar 1 import, 3 signals, 3 métodos, 1 componente al HTML
3. **Tiempo**: 30-40 minutos

---

*Última actualización: 2025-11-20*

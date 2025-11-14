# TikTok Events - Integración Rápida

## ✅ Eventos Ya Integrados

### 1. ViewContent ✅
**Archivo**: `apps/web/src/app/features/cars/detail/car-detail.page.ts`
**Línea**: 505-511
**Tracking**: Cuando un usuario ve el detalle de un auto

### 2. Search ✅
**Archivo**: `apps/web/src/app/features/marketplace/marketplace-v2.page.ts`
**Línea**: 594-597
**Tracking**: Cuando un usuario busca autos

### 3. CompleteRegistration ✅
**Archivo**: `apps/web/src/app/core/services/auth.service.ts`
**Línea**: 106-110
**Tracking**: Cuando un usuario completa el registro

---

## 📋 Eventos Pendientes (Código Listo para Copiar)

### 4. AddToCart - Iniciar Booking

**Archivo**: `apps/web/src/app/features/bookings/components/booking-dates-location-step/booking-dates-location-step.component.ts`

**1. Agregar imports**:
```typescript
import { TikTokEventsService } from '../../../../core/services/tiktok-events.service';
```

**2. Inyectar servicio**:
```typescript
private readonly tiktokEvents = inject(TikTokEventsService);
```

**3. Agregar tracking** (en el método que avanza al siguiente paso):
```typescript
async onContinue() {
  const car = this.car();
  const totalPrice = this.getTotalPrice(); // O como calcules el total

  // 🎯 TikTok Events: Track AddToCart
  void this.tiktokEvents.trackAddToCart({
    contentId: car.id,
    contentName: car.title,
    value: totalPrice,
    currency: car.currency || 'ARS',
    quantity: 1
  });

  // ... resto del código
}
```

---

### 5. InitiateCheckout - Confirmar Reserva

**Archivo**: `apps/web/src/app/shared/components/simple-checkout/simple-checkout.component.ts`

**1. Agregar imports**:
```typescript
import { TikTokEventsService } from '../../../core/services/tiktok-events.service';
```

**2. Inyectar servicio**:
```typescript
private readonly tiktokEvents = inject(TikTokEventsService);
```

**3. Agregar tracking** (en el método que procesa el pago):
```typescript
async onConfirmBooking() {
  const booking = this.bookingData();
  const car = this.car();

  // 🎯 TikTok Events: Track InitiateCheckout
  void this.tiktokEvents.trackInitiateCheckout({
    contentId: car.id,
    contentName: car.title,
    value: booking.totalPrice,
    currency: booking.currency || 'ARS'
  });

  // ... procesar pago
}
```

---

### 6. AddPaymentInfo - Agregar Método de Pago

**Archivo**: Mismo archivo que InitiateCheckout o donde se seleccione método de pago

**Agregar tracking** (cuando el usuario selecciona un método de pago):
```typescript
onPaymentMethodSelected(method: PaymentMethod) {
  // 🎯 TikTok Events: Track AddPaymentInfo
  void this.tiktokEvents.trackAddPaymentInfo({
    value: this.getTotalPrice(),
    currency: 'ARS',
    contentId: this.car().id
  });

  this.selectedPaymentMethod.set(method);
}
```

---

### 7. PlaceAnOrder - Crear Reserva

**Archivo**: `apps/web/src/app/core/services/bookings.service.ts`

**1. Agregar imports**:
```typescript
import { TikTokEventsService } from './tiktok-events.service';
```

**2. Inyectar servicio**:
```typescript
private readonly tiktokEvents = inject(TikTokEventsService);
```

**3. Agregar tracking** (en el método que crea la reserva):
```typescript
async createBooking(bookingData: CreateBookingParams) {
  const { data: booking, error } = await this.supabase
    .from('bookings')
    .insert(bookingData)
    .select()
    .single();

  if (error) throw error;

  // 🎯 TikTok Events: Track PlaceAnOrder
  void this.tiktokEvents.trackPlaceAnOrder({
    contentId: bookingData.car_id,
    contentName: booking.car_title || 'Auto',
    value: bookingData.total_price,
    currency: bookingData.currency || 'ARS'
  });

  return booking;
}
```

---

### 8. Purchase - Pago Completado

**Archivo**: `apps/web/src/app/core/services/wallet.service.ts` (o donde se procese el pago exitoso)

**1. Agregar imports**:
```typescript
import { TikTokEventsService } from './tiktok-events.service';
```

**2. Inyectar servicio**:
```typescript
private readonly tiktokEvents = inject(TikTokEventsService);
```

**3. Agregar tracking** (en el método que confirma el pago):
```typescript
async onPaymentSuccess(payment: Payment) {
  const booking = await this.getBooking(payment.booking_id);
  const car = await this.getCar(booking.car_id);

  // 🎯 TikTok Events: Track Purchase
  void this.tiktokEvents.trackPurchase({
    contentId: car.id,
    contentName: car.title,
    value: payment.amount,
    currency: payment.currency || 'ARS'
  });

  // ... resto de la lógica
}
```

---

## 🚀 Habilitar en Producción

**Archivo**: `apps/web/src/app/core/services/tiktok-events.service.ts`

**Cambiar línea 88**:
```typescript
// De:
private readonly isEnabled = !environment.production; // Deshabilitado en prod

// A:
private readonly isEnabled = environment.production; // Habilitado en prod
```

---

## 🧪 Testing

### En Desarrollo

1. Cambiar temporalmente `isEnabled = true` en `tiktok-events.service.ts`
2. Abrir DevTools > Console
3. Realizar acciones (ver auto, buscar, registrarse)
4. Verificar logs: `[TikTok Events] EventName sent successfully`

### En Producción

1. Ir a: https://ads.tiktok.com/
2. **Assets** > **Events** > **Web Events**
3. Seleccionar Pixel ID: `D4AHBBBC77U2U4VHPCO0`
4. Ver eventos en **Test Events** (tiempo real)

---

## 📊 Resumen de Progreso

| Evento | Estado | Archivo |
|--------|--------|---------|
| ViewContent | ✅ Integrado | `car-detail.page.ts` |
| Search | ✅ Integrado | `marketplace-v2.page.ts` |
| CompleteRegistration | ✅ Integrado | `auth.service.ts` |
| AddToCart | 📝 Código listo | Booking dates step |
| AddPaymentInfo | 📝 Código listo | Checkout |
| InitiateCheckout | 📝 Código listo | Simple checkout |
| PlaceAnOrder | 📝 Código listo | `bookings.service.ts` |
| Purchase | 📝 Código listo | `wallet.service.ts` |

---

## 🔍 Encontrar Archivos

```bash
# Buscar componentes de booking
find apps/web/src/app/features/bookings -name "*.ts"

# Buscar servicios
find apps/web/src/app/core/services -name "*.ts"

# Verificar integración
grep -r "tiktokEvents.track" apps/web/src/app/
```

---

## 📞 Soporte

Si necesitas ayuda para integrar algún evento específico, consulta:
- `TIKTOK_EVENTS_INTEGRATION.md` - Documentación completa
- TikTok Pixel ID: `D4AHBBBC77U2U4VHPCO0`
- Edge Function: https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/tiktok-events

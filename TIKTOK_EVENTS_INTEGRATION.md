# TikTok Events API - Guía de Integración

Implementación completa de TikTok Pixel Events API para AutoRenta.

## Configuración

### 1. Información de TikTok

- **Pixel ID**: `D4AHBBBC77U2U4VHPCO0`
- **Access Token**: Configurado como secret en Supabase
- **Edge Function**: `https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/tiktok-events`

### 2. Arquitectura

```
┌─────────────┐         ┌──────────────────┐         ┌──────────────┐
│   Angular   │  HTTPS  │ Supabase Edge    │  HTTPS  │  TikTok API  │
│   Frontend  ├────────→│    Function      ├────────→│              │
│             │         │  (Server-side)   │         │   (Secure)   │
└─────────────┘         └──────────────────┘         └──────────────┘
```

**Beneficios del servidor:**
- ✅ Access Token no se expone al cliente
- ✅ Datos PII hasheados automáticamente (SHA-256)
- ✅ IP y User-Agent capturados desde el servidor
- ✅ Mayor seguridad y confiabilidad

## Eventos Implementados

### 1. ViewContent
**Cuándo**: Usuario ve detalle de un auto, página de comparación, etc.

```typescript
// En: car-detail.page.ts
import { TikTokEventsService } from '../../core/services/tiktok-events.service';

export class CarDetailPage implements OnInit {
  private readonly tiktokEvents = inject(TikTokEventsService);

  ngOnInit() {
    this.loadCar();
  }

  async loadCar() {
    const car = await this.carsService.getCar(this.carId);

    // Track ViewContent
    await this.tiktokEvents.trackViewContent({
      contentId: car.id,
      contentName: car.title,
      value: car.pricePerDay,
      currency: car.currency || 'ARS'
    });
  }
}
```

### 2. AddToWishlist
**Cuándo**: Usuario agrega un auto a favoritos

```typescript
// En: car-card.component.ts o donde manejes favoritos
async addToFavorites(car: Car) {
  await this.favoritesService.add(car.id);

  // Track AddToWishlist
  await this.tiktokEvents.trackAddToWishlist({
    contentId: car.id,
    contentName: car.title,
    value: car.pricePerDay,
    currency: car.currency || 'ARS'
  });

  this.notificationManager.success('Agregado', 'Auto agregado a favoritos');
}
```

### 3. Search
**Cuándo**: Usuario realiza una búsqueda

```typescript
// En: marketplace.page.ts o search-bar.component.ts
async onSearch(searchQuery: string) {
  // Realizar búsqueda
  const results = await this.carsService.search(searchQuery);

  // Track Search
  await this.tiktokEvents.trackSearch({
    searchString: searchQuery,
    value: results.length
  });

  this.displayResults(results);
}
```

### 4. AddToCart
**Cuándo**: Usuario inicia el proceso de booking

```typescript
// En: booking-dates-location-step.component.ts
async onContinueToBooking() {
  const car = this.selectedCar();
  const totalPrice = this.calculateTotal();

  // Track AddToCart
  await this.tiktokEvents.trackAddToCart({
    contentId: car.id,
    contentName: car.title,
    value: totalPrice,
    currency: car.currency || 'ARS',
    quantity: 1
  });

  this.router.navigate(['/bookings/new']);
}
```

### 5. AddPaymentInfo
**Cuándo**: Usuario agrega información de pago

```typescript
// En: booking-payment-coverage-step.component.ts
async onPaymentMethodSelected(method: PaymentMethod) {
  const totalPrice = this.bookingTotal();

  // Track AddPaymentInfo
  await this.tiktokEvents.trackAddPaymentInfo({
    value: totalPrice,
    currency: 'ARS',
    contentId: this.booking().carId
  });

  this.paymentMethod.set(method);
}
```

### 6. InitiateCheckout
**Cuándo**: Usuario confirma y procede al pago

```typescript
// En: simple-checkout.component.ts
async onConfirmBooking() {
  const booking = this.bookingData();
  const car = this.car();

  // Track InitiateCheckout
  await this.tiktokEvents.trackInitiateCheckout({
    contentId: car.id,
    contentName: car.title,
    value: booking.totalPrice,
    currency: booking.currency || 'ARS'
  });

  this.processPayment();
}
```

### 7. PlaceAnOrder
**Cuándo**: Usuario crea la reserva (antes del pago)

```typescript
// En: booking.service.ts o donde se cree la reserva
async createBooking(bookingData: BookingData) {
  const booking = await this.supabase
    .from('bookings')
    .insert(bookingData)
    .select()
    .single();

  // Track PlaceAnOrder
  await this.tiktokEvents.trackPlaceAnOrder({
    contentId: bookingData.carId,
    contentName: bookingData.carTitle,
    value: bookingData.totalPrice,
    currency: bookingData.currency || 'ARS'
  });

  return booking;
}
```

### 8. CompleteRegistration
**Cuándo**: Usuario completa el registro

```typescript
// En: auth.service.ts o register.component.ts
async register(userData: RegisterData) {
  const { user } = await this.supabase.auth.signUp({
    email: userData.email,
    password: userData.password
  });

  if (user) {
    // Track CompleteRegistration
    await this.tiktokEvents.trackCompleteRegistration({
      value: 0,
      currency: 'ARS'
    });

    this.notificationManager.success('Bienvenido', 'Registro completado');
  }
}
```

### 9. Purchase
**Cuándo**: Usuario completa el pago de la reserva

```typescript
// En: wallet.service.ts o payment-success.page.ts
async onPaymentSuccess(payment: Payment) {
  const booking = await this.getBooking(payment.bookingId);
  const car = await this.getCar(booking.carId);

  // Track Purchase
  await this.tiktokEvents.trackPurchase({
    contentId: car.id,
    contentName: car.title,
    value: payment.amount,
    currency: payment.currency || 'ARS'
  });

  this.notificationManager.success('Pago exitoso', 'Tu reserva está confirmada');
  this.router.navigate(['/bookings', booking.id]);
}
```

## Habilitar en Producción

Por defecto, el tracking está **deshabilitado en desarrollo**. Para habilitarlo en producción:

**Archivo**: `apps/web/src/app/core/services/tiktok-events.service.ts`

```typescript
// Cambiar esta línea:
private readonly isEnabled = !environment.production; // Actualmente OFF en producción

// A:
private readonly isEnabled = environment.production; // ON solo en producción
```

## Testing

### Verificar eventos en desarrollo

1. Cambiar temporalmente `isEnabled = true` en el servicio
2. Abrir DevTools > Console
3. Realizar acciones (ver auto, agregar a carrito, etc.)
4. Ver logs: `[TikTok Events] EventName sent successfully`

### Verificar eventos en TikTok

1. Ir a TikTok Ads Manager
2. **Assets** > **Events** > **Web Events**
3. Seleccionar tu pixel: `D4AHBBBC77U2U4VHPCO0`
4. Ver eventos en tiempo real en **Test Events**

### Payload Helper

TikTok proporciona un **Payload Helper** para validar eventos:
https://ads.tiktok.com/marketing_api/docs?id=1771101027431425

## Troubleshooting

### Error: "TIKTOK_ACCESS_TOKEN not configured"

```bash
# Configurar secret en Supabase
npx supabase secrets set TIKTOK_ACCESS_TOKEN=6ba345fc374cf46408c96d8b60703a206f57b7d0 --project-ref pisqjmoklivzpwufhscx

# Redesplegar Edge Function
npx supabase functions deploy tiktok-events --project-ref pisqjmoklivzpwufhscx
```

### Error: "403 Forbidden" desde TikTok API

- Verificar que el Access Token sea válido
- Verificar que el Pixel ID sea correcto
- Regenerar Access Token en TikTok Ads Manager si es necesario

### Eventos no aparecen en TikTok

1. Verificar que `isEnabled = true`
2. Verificar logs en Edge Function:
   ```bash
   npx supabase functions logs tiktok-events --project-ref pisqjmoklivzpwufhscx
   ```
3. Verificar que los eventos tengan todos los parámetros requeridos

## Seguridad

✅ **Access Token**: Almacenado como secret en Supabase, nunca expuesto al cliente
✅ **PII Data**: Email y teléfono hasheados con SHA-256 automáticamente
✅ **HTTPS**: Todas las comunicaciones encriptadas
✅ **CORS**: Configurado para aceptar solo requests autorizados

## Recursos

- [TikTok Events API Docs](https://business-api.tiktok.com/portal/docs?id=1771101027431425)
- [TikTok Pixel Setup](https://ads.tiktok.com/help/article?aid=10000357)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

## Próximos Pasos

1. ✅ Integrar eventos en los puntos clave de AutoRenta (ver ejemplos arriba)
2. ✅ Testing exhaustivo en desarrollo
3. ✅ Habilitar en producción (`isEnabled = environment.production`)
4. ✅ Monitorear eventos en TikTok Ads Manager
5. ✅ Ajustar eventos según métricas de conversión

---

**Última actualización**: 2025-11-12
**Contacto**: TikTok Pixel ID `D4AHBBBC77U2U4VHPCO0`

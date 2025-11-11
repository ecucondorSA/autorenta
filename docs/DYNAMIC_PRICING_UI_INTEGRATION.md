# Dynamic Pricing - Guía de Integración UI

## Componentes Creados

### 1. `DynamicPriceLockPanelComponent`
**Ubicación**: `apps/web/src/app/features/bookings/booking-detail-payment/components/dynamic-price-lock-panel.component.ts`

**Uso**: Panel que muestra el estado del price lock durante el checkout

**Props**:
```typescript
@Input() priceLock: PriceLock | null = null;
@Input() comparison: PriceComparison | null = null;
@Input() surgeInfo: SurgePricingInfo | null = null;

@Output() refresh = new EventEmitter<void>();
@Output() viewBreakdown = new EventEmitter<void>();
```

**Ejemplo de integración en `booking-detail-payment.page.html`**:
```html
<!-- Después del BookingSummaryCard -->
@if (priceLock()) {
  <app-dynamic-price-lock-panel
    [priceLock]="priceLock()"
    [comparison]="priceComparison()"
    [surgeInfo]="surgeInfo()"
    (refresh)="onRefreshPriceLock()"
    (viewBreakdown)="onViewPriceBreakdown()"
  />
}
```

**Lógica requerida en el componente TypeScript**:
```typescript
import { DynamicPricingService } from '../../../core/services/dynamic-pricing.service';
import type { PriceLock } from '../../../core/models/dynamic-pricing.model';

// Signals
readonly priceLock = signal<PriceLock | null>(null);
readonly priceComparison = computed(() => {
  const lock = this.priceLock();
  const car = this.bookingInput()?.car;
  if (!lock || !car) return null;

  return this.dynamicPricingService.getPriceComparison(
    car.price_per_day,
    lock
  );
});
readonly surgeInfo = computed(async () => {
  return this.dynamicPricingService.getSurgePricingInfo(this.priceLock());
});

// Methods
async onRefreshPriceLock(): Promise<void> {
  const lock = this.priceLock();
  if (!lock) return;

  const result = await this.dynamicPricingService.refreshPriceLock(lock);
  if (result.ok && result.priceLock) {
    this.priceLock.set(result.priceLock);
  }
}

onViewPriceBreakdown(): void {
  this.showBreakdownModal.set(true);
}
```

---

### 2. `DynamicPriceBreakdownModalComponent`
**Ubicación**: `apps/web/src/app/features/bookings/booking-detail-payment/components/dynamic-price-breakdown-modal.component.ts`

**Uso**: Modal que muestra el desglose completo del cálculo de precio dinámico

**Props**:
```typescript
@Input() isOpen = false;
@Input() snapshot: DynamicPriceSnapshot | null = null;

@Output() close = new EventEmitter<void>();
```

**Ejemplo de integración**:
```html
<app-dynamic-price-breakdown-modal
  [isOpen]="showBreakdownModal()"
  [snapshot]="priceLock()?.priceSnapshot ?? null"
  (close)="showBreakdownModal.set(false)"
/>
```

---

### 3. `DynamicPricingBadgeComponent`
**Ubicación**: `apps/web/src/app/shared/components/dynamic-pricing-badge/dynamic-pricing-badge.component.ts`

**Uso**: Badge simple para indicar que un auto usa pricing dinámico

**Props**:
```typescript
@Input() surgeActive = false;
@Input() surgeFactor?: number;
```

**Ejemplo de integración en `map-booking-panel.component.html`**:
```html
<div class="car-info">
  <h3>{{ car.title }}</h3>

  <!-- Mostrar badge si el auto usa dynamic pricing -->
  @if (car.uses_dynamic_pricing) {
    <app-dynamic-pricing-badge
      [surgeActive]="currentSurgeActive"
      [surgeFactor]="currentSurgeFactor"
    />
  }

  <div class="price">
    {{ car.pricePerDay | money: car.currency }}
  </div>
</div>
```

**Ejemplo en resultados de búsqueda**:
```html
@for (car of cars(); track car.id) {
  <div class="car-card">
    <img [src]="car.photoUrl" [alt]="car.title" />

    <div class="car-details">
      <h4>{{ car.title }}</h4>

      @if (car.uses_dynamic_pricing) {
        <app-dynamic-pricing-badge />
      }
    </div>
  </div>
}
```

---

## Flujo Completo de Integración

### Paso 1: Importar componentes en la página

```typescript
import { DynamicPriceLockPanelComponent } from './components/dynamic-price-lock-panel.component';
import { DynamicPriceBreakdownModalComponent } from './components/dynamic-price-breakdown-modal.component';
import { DynamicPricingBadgeComponent } from '../../../shared/components/dynamic-pricing-badge/dynamic-pricing-badge.component';

@Component({
  imports: [
    // ... otros imports
    DynamicPriceLockPanelComponent,
    DynamicPriceBreakdownModalComponent,
    DynamicPricingBadgeComponent,
  ],
})
```

### Paso 2: Inyectar servicio

```typescript
import { DynamicPricingService } from '../../../core/services/dynamic-pricing.service';

export class BookingDetailPaymentPage {
  private dynamicPricingService = inject(DynamicPricingService);
}
```

### Paso 3: Bloquear precio cuando el usuario inicia checkout

```typescript
async ngOnInit(): Promise<void> {
  const input = this.bookingInput();
  if (!input || !input.car.uses_dynamic_pricing) {
    return; // Usar precio fijo normal
  }

  // Bloquear precio dinámico
  const result = await this.dynamicPricingService.lockPrice(
    input.carId,
    this.userId,
    input.startDate,
    calculateHours(input.startDate, input.endDate)
  );

  if (result.ok && result.priceLock) {
    this.priceLock.set(result.priceLock);

    // Usar el precio bloqueado en los cálculos
    this.updatePriceBreakdown(result.priceLock.totalPrice);
  } else {
    // Fallback a precio fijo
    this.updatePriceBreakdown(input.car.price_per_day);
  }
}
```

### Paso 4: Pasar price lock al crear booking

```typescript
async createBooking(): Promise<void> {
  const lock = this.priceLock();

  const result = await this.bookingsService.createBookingAtomic({
    carId: this.car.carId,
    startDate: this.startDate,
    endDate: this.endDate,
    totalAmount: this.totalPrice,
    currency: 'USD',
    paymentMode: 'card',

    // ✅ Dynamic pricing parameters
    useDynamicPricing: lock !== null,
    priceLockToken: lock?.lockToken,
    dynamicPriceSnapshot: lock?.priceSnapshot,

    riskSnapshot: {
      // ... risk data
    },
  });

  if (result.success) {
    this.router.navigate(['/bookings', result.bookingId]);
  }
}
```

---

## Checklist de Integración

### Booking Detail Payment Page
- [ ] Importar componentes `DynamicPriceLockPanel` y `DynamicPriceBreakdownModal`
- [ ] Inyectar `DynamicPricingService`
- [ ] Crear signals: `priceLock`, `showBreakdownModal`
- [ ] Bloquear precio en `ngOnInit` si `car.uses_dynamic_pricing = true`
- [ ] Agregar panel en template después de `BookingSummaryCard`
- [ ] Agregar modal al final del template
- [ ] Implementar `onRefreshPriceLock()` y `onViewPriceBreakdown()`
- [ ] Pasar `priceLock` a `createBookingAtomic()`

### Map Booking Panel
- [ ] Importar `DynamicPricingBadgeComponent`
- [ ] Mostrar badge si `car.uses_dynamic_pricing = true`
- [ ] Obtener info de surge actual (opcional)

### Marketplace/Search Results
- [ ] Importar `DynamicPricingBadgeComponent`
- [ ] Mostrar badge en cada car card si aplica

---

## Próximos Pasos

1. **Sincronizar tipos TypeScript**: `npm run sync:types`
2. **Compilar**: `npm run build`
3. **Probar localmente**:
   - Publicar auto con "Precio dinámico" activado
   - Intentar reservar ese auto
   - Verificar que aparece el panel de price lock
4. **Verificar cron job**: Revisar `pricing_cron_health` en 15 minutos

---

## Troubleshooting

### Error: "Property 'uses_dynamic_pricing' does not exist on type 'Car'"
**Solución**: Ejecutar `npm run sync:types` para sincronizar tipos desde Supabase

### Error: "lock_price_for_booking is not a function"
**Solución**: Verificar que la migración se aplicó correctamente:
```sql
SELECT proname FROM pg_proc WHERE proname = 'lock_price_for_booking';
```

### El countdown no se actualiza
**Solución**: Verificar que el componente `DynamicPriceLockPanel` está usando `effect()` correctamente para iniciar el interval

### Price lock expira muy rápido
**Solución**: El lock dura 15 minutos. Si necesitas más tiempo, modificar en `lock_price_rpc.sql`:
```sql
v_lock_expires := NOW() + INTERVAL '30 minutes'; -- Cambiar de 15 a 30
```

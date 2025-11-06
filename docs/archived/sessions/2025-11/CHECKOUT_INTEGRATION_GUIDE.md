# 🛒 Checkout Page Integration Guide

**Última actualización**: 2025-11-05
**Autor**: Claude Code
**Estado**: ✅ Ejemplo Completo Implementado

---

## 📋 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Arquitectura de la Integración](#arquitectura-de-la-integración)
3. [Componentes Utilizados](#componentes-utilizados)
4. [Guía de Implementación](#guía-de-implementación)
5. [Flujo de Pago](#flujo-de-pago)
6. [Configuración de Rutas](#configuración-de-rutas)
7. [Página de Confirmación](#página-de-confirmación)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

---

## 📖 Introducción

Esta guía muestra cómo integrar **PaymentProviderSelectorComponent** y **PayPalButtonComponent** en una página de checkout funcional que soporta múltiples proveedores de pago.

### Proveedores Soportados

| Proveedor | Moneda | Use Cases |
|-----------|--------|-----------|
| **MercadoPago** | ARS | Usuarios en Argentina, pagos locales |
| **PayPal** | USD | Usuarios internacionales, tarjetas USD |

---

## 🏗️ Arquitectura de la Integración

### Diagrama de Componentes

```
┌──────────────────────────────────────────────────────────┐
│              BookingCheckoutPage                         │
│  ┌────────────────────────────────────────────────────┐  │
│  │       PaymentProviderSelectorComponent             │  │
│  │  - Selección de proveedor (MP / PayPal)           │  │
│  │  - Conversión de moneda (ARS ↔ USD)               │  │
│  │  - Visualización de montos                         │  │
│  └─────────────────┬──────────────────────────────────┘  │
│                    │ (providerChange event)              │
│                    ↓                                      │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Conditional Rendering Logic                       │  │
│  │  - selectedProvider === 'mercadopago'?             │  │
│  │  - selectedProvider === 'paypal'?                  │  │
│  └─────────────────┬──────────────────────────────────┘  │
│                    │                                      │
│       ┌────────────┴────────────┐                        │
│       │                         │                        │
│       ↓                         ↓                        │
│  ┌─────────────┐          ┌──────────────────┐          │
│  │ MercadoPago │          │ PayPalButton     │          │
│  │ Button      │          │ Component        │          │
│  │ (Standard)  │          │ (SDK Integrated) │          │
│  └─────────────┘          └──────────────────┘          │
└──────────────────────────────────────────────────────────┘
```

### Flujo de Datos

```
User Interaction → Provider Selection → Currency Conversion → Payment Execution

1. Usuario selecciona proveedor
   ↓
2. PaymentProviderSelectorComponent emite evento
   ↓
3. BookingCheckoutPage actualiza señales
   ↓
4. UI se actualiza condicionalmente
   ↓
5. Usuario ejecuta pago con el proveedor seleccionado
```

---

## 🧩 Componentes Utilizados

### 1. PaymentProviderSelectorComponent

**Ubicación**: `apps/web/src/app/shared/components/payment-provider-selector/`

**Propósito**: Permite al usuario elegir entre MercadoPago y PayPal, mostrando conversión de moneda en tiempo real.

**Inputs**:
```typescript
@Input({ required: true }) amount!: number;           // Monto original del booking
@Input() currency: 'USD' | 'ARS' = 'ARS';            // Moneda original
@Input() defaultProvider: PaymentProvider = 'mercadopago'; // Provider por defecto
```

**Output**:
```typescript
@Output() providerChange = new EventEmitter<{
  provider: PaymentProvider;
  amountInProviderCurrency: number;
  providerCurrency: string;
}>();
```

**Características**:
- ✅ Conversión automática ARS ↔ USD usando `FxService`
- ✅ Muestra tipo de cambio actualizado
- ✅ Radio buttons con diseño Material-like
- ✅ Badges de moneda (ARS / USD)
- ✅ Información de métodos de pago aceptados

---

### 2. PayPalButtonComponent

**Ubicación**: `apps/web/src/app/shared/components/paypal-button/`

**Propósito**: Integra PayPal JS SDK y maneja el flujo completo de pago con PayPal.

**Inputs**:
```typescript
@Input() bookingId!: string;                // ID del booking a pagar
@Input() useSplitPayment = false;          // ¿Usar marketplace split payment?
@Input() disabled = false;                  // Deshabilitar botón
```

**Outputs**:
```typescript
@Output() onApprove = new EventEmitter<{ orderId: string; captureId: string }>();
@Output() onError = new EventEmitter<Error>();
```

**Características**:
- ✅ Carga PayPal JS SDK dinámicamente
- ✅ Crea orden vía Edge Function
- ✅ Captura pago automáticamente
- ✅ Maneja errores y estados de loading
- ✅ Soporta split payments (marketplace)

---

## 📝 Guía de Implementación

### Paso 1: Crear el Componente de Checkout

**Archivo**: `booking-checkout.page.ts`

```typescript
import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentProviderSelectorComponent } from '../../../../shared/components/payment-provider-selector/payment-provider-selector.component';
import { PayPalButtonComponent } from '../../../../shared/components/paypal-button/paypal-button.component';
import { PaymentProvider } from '../../../../core/interfaces/payment-gateway.interface';
import { PaymentGatewayFactory } from '../../../../core/services/payment-gateway.factory';
import { BookingsService } from '../../../../core/services/bookings.service';

@Component({
  selector: 'app-booking-checkout',
  standalone: true,
  imports: [
    CommonModule,
    PaymentProviderSelectorComponent,
    PayPalButtonComponent,
  ],
  templateUrl: './booking-checkout.page.html',
  styleUrls: ['./booking-checkout.page.css'],
})
export class BookingCheckoutPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly gatewayFactory = inject(PaymentGatewayFactory);
  private readonly bookingsService = inject(BookingsService);

  // Señales principales
  bookingId = signal<string>('');
  booking = signal<any>(null);
  selectedProvider = signal<PaymentProvider>('mercadopago');
  amountInProviderCurrency = signal<number>(0);
  providerCurrency = signal<string>('ARS');
  isLoading = signal<boolean>(true);
  error = signal<string>('');
  isProcessingPayment = signal<boolean>(false);

  // Computed signals
  readonly isPaymentButtonEnabled = computed(() => {
    return (
      !this.isLoading() &&
      !this.isProcessingPayment() &&
      this.booking() !== null &&
      this.amountInProviderCurrency() > 0
    );
  });

  readonly isMercadoPago = computed(() => {
    return this.selectedProvider() === 'mercadopago';
  });

  readonly isPayPal = computed(() => {
    return this.selectedProvider() === 'paypal';
  });

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('bookingId');
    if (!id) {
      this.error.set('ID de booking no encontrado');
      this.isLoading.set(false);
      return;
    }

    this.bookingId.set(id);

    try {
      await this.loadBooking();
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : 'Error cargando el booking'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  // ... resto de los métodos (ver archivo completo)
}
```

---

### Paso 2: Template HTML

**Archivo**: `booking-checkout.page.html`

```html
<div class="checkout-container">
  <!-- Header -->
  <div class="checkout-header">
    <h1 class="text-2xl font-bold text-gray-900 mb-2">Completar Pago</h1>
    <p class="text-sm text-gray-600">
      Selecciona tu método de pago preferido y completa la reserva
    </p>
  </div>

  <!-- Loading State -->
  <div *ngIf="isLoading()" class="loading-container">
    <div class="spinner"></div>
    <p class="loading-text">Cargando información del pago...</p>
  </div>

  <!-- Error State -->
  <div *ngIf="error() && !isLoading()" class="error-container">
    <!-- Error UI -->
  </div>

  <!-- Main Content -->
  <div *ngIf="!isLoading() && !error()" class="checkout-content">

    <!-- Booking Summary Card -->
    <div class="booking-summary-card">
      <h2 class="card-title">Resumen de la Reserva</h2>
      <div *ngIf="booking()" class="booking-details">
        <!-- Detalles del booking -->
      </div>
    </div>

    <!-- Payment Provider Selector -->
    <div class="payment-section">
      <app-payment-provider-selector
        [amount]="booking()?.total_price || 0"
        [currency]="booking()?.currency || 'ARS'"
        [defaultProvider]="selectedProvider()"
        (providerChange)="handleProviderChange($event)">
      </app-payment-provider-selector>
    </div>

    <!-- Payment Amount Display -->
    <div *ngIf="amountInProviderCurrency() > 0" class="amount-display-card">
      <div class="amount-display">
        <p class="amount-label">
          Total a pagar con {{ selectedProvider() === 'paypal' ? 'PayPal' : 'MercadoPago' }}:
        </p>
        <p class="amount-value">
          {{ formatCurrency(amountInProviderCurrency(), providerCurrency()) }}
        </p>
      </div>
    </div>

    <!-- Payment Buttons (Conditional Rendering) -->
    <div class="payment-buttons-section">

      <!-- MercadoPago Button -->
      <div *ngIf="isMercadoPago()" class="payment-button-container">
        <button
          class="btn-primary mercadopago-btn"
          [disabled]="!isPaymentButtonEnabled() || isProcessingPayment()"
          (click)="handleMercadoPagoPayment()">
          <span *ngIf="!isProcessingPayment()">Pagar con MercadoPago</span>
          <span *ngIf="isProcessingPayment()">Procesando...</span>
        </button>
        <p class="payment-info">
          Serás redirigido a MercadoPago para completar el pago de forma segura
        </p>
      </div>

      <!-- PayPal Button -->
      <div *ngIf="isPayPal()" class="payment-button-container">
        <app-paypal-button
          [bookingId]="bookingId()"
          [useSplitPayment]="true"
          [disabled]="!isPaymentButtonEnabled()"
          (onApprove)="handlePayPalApprove($event)"
          (onError)="handlePayPalError($event)">
        </app-paypal-button>
        <p class="payment-info">
          Pago seguro procesado por PayPal
        </p>
      </div>

    </div>

    <!-- Cancel Button -->
    <div class="cancel-section">
      <button
        class="btn-secondary"
        [disabled]="isProcessingPayment()"
        (click)="cancelPayment()">
        Cancelar y Volver
      </button>
    </div>

    <!-- Security Notice -->
    <div class="security-notice">
      <svg class="lock-icon">...</svg>
      <div class="security-text">
        <p class="font-medium">Pago 100% Seguro</p>
        <p class="text-xs text-gray-500">
          Tus datos están protegidos mediante encriptación SSL
        </p>
      </div>
    </div>

  </div>
</div>
```

**Puntos Clave**:

1. **Conditional Rendering**: Usa `*ngIf="isMercadoPago()"` y `*ngIf="isPayPal()"` para mostrar el botón correcto
2. **Event Binding**: `(providerChange)="handleProviderChange($event)"` captura cambios de proveedor
3. **Disabled States**: Botones deshabilitados durante loading y processing
4. **Loading Feedback**: Spinner y texto mientras se procesa el pago

---

### Paso 3: Implementar Handlers de Eventos

```typescript
/**
 * Maneja el cambio de proveedor de pago
 */
handleProviderChange(event: {
  provider: PaymentProvider;
  amountInProviderCurrency: number;
  providerCurrency: string;
}): void {
  this.selectedProvider.set(event.provider);
  this.amountInProviderCurrency.set(event.amountInProviderCurrency);
  this.providerCurrency.set(event.providerCurrency);

  // Limpiar estado previo
  this.mercadoPagoPreferenceId.set('');
  this.mercadoPagoInitPoint.set('');

  console.log('Provider changed:', event);
}

/**
 * Inicia el flujo de pago con MercadoPago
 */
async handleMercadoPagoPayment(): Promise<void> {
  if (!this.isPaymentButtonEnabled()) return;

  this.isProcessingPayment.set(true);
  this.error.set('');

  try {
    const gateway = this.gatewayFactory.createBookingGateway('mercadopago');

    // Crear preferencia de pago
    const preference = await gateway
      .createBookingPreference(this.bookingId(), true)
      .toPromise();

    if (!preference.success || !preference.init_point) {
      throw new Error('Error creando preferencia de pago');
    }

    // Redirigir a MercadoPago
    gateway.redirectToCheckout(preference.init_point, false);
  } catch (err) {
    this.error.set(
      err instanceof Error
        ? err.message
        : 'Error procesando pago con MercadoPago'
    );
    this.isProcessingPayment.set(false);
  }
}

/**
 * Maneja la aprobación del pago de PayPal
 */
handlePayPalApprove(event: {
  orderId: string;
  captureId: string;
}): void {
  console.log('PayPal payment approved:', event);

  // Redirigir a página de confirmación
  this.router.navigate(['/bookings', this.bookingId(), 'confirmation'], {
    queryParams: {
      provider: 'paypal',
      orderId: event.orderId,
      captureId: event.captureId,
    },
  });
}

/**
 * Maneja errores del pago de PayPal
 */
handlePayPalError(error: Error): void {
  console.error('PayPal payment error:', error);
  this.error.set(`Error procesando pago con PayPal: ${error.message}`);
  this.isProcessingPayment.set(false);
}
```

**Flujo de Eventos**:

1. **Provider Change**: Usuario selecciona proveedor → `handleProviderChange()` → Actualiza señales
2. **MercadoPago Payment**: Click en botón → `handleMercadoPagoPayment()` → Crea preferencia → Redirige a MP
3. **PayPal Approve**: PayPal button → `handlePayPalApprove()` → Redirige a confirmación
4. **PayPal Error**: Error en PayPal → `handlePayPalError()` → Muestra error en UI

---

## 🔄 Flujo de Pago Completo

### Flujo MercadoPago

```
1. Usuario selecciona MercadoPago
   ↓
2. Click en "Pagar con MercadoPago"
   ↓
3. BookingCheckoutPage::handleMercadoPagoPayment()
   ↓
4. PaymentGatewayFactory.createBookingGateway('mercadopago')
   ↓
5. Gateway.createBookingPreference(bookingId, true)
   ↓
6. Edge Function: mercadopago-create-booking-preference
   ↓
7. RPC: prepare_booking_payment()
   ↓
8. MercadoPago API: Create Preference
   ↓
9. Redirect to init_point (MercadoPago Checkout)
   ↓
10. Usuario completa pago en MercadoPago
   ↓
11. MercadoPago envía IPN webhook
   ↓
12. Edge Function: mercadopago-webhook
   ↓
13. RPC: register_payment_split()
   ↓
14. Update bookings.status = 'confirmed'
   ↓
15. Redirect a success_url (AutoRenta)
```

---

### Flujo PayPal

```
1. Usuario selecciona PayPal
   ↓
2. PayPalButtonComponent se renderiza
   ↓
3. PayPal SDK carga dinámicamente
   ↓
4. Usuario click en PayPal Smart Button
   ↓
5. PayPalButton::createOrder()
   ↓
6. PayPalBookingGateway.createBookingPreference(bookingId, true)
   ↓
7. Edge Function: paypal-create-order
   ↓
8. RPC: prepare_booking_payment()
   ↓
9. PayPal API: Create Order (v2/checkout/orders)
   ↓
10. PayPal modal se abre (usuario aprueba pago)
   ↓
11. PayPalButton::onApprove()
   ↓
12. PayPalBookingGateway.captureOrder(orderId)
   ↓
13. Edge Function: paypal-capture-order
   ↓
14. PayPal API: Capture Order
   ↓
15. RPC: register_payment_split()
   ↓
16. Update bookings.status = 'confirmed'
   ↓
17. BookingCheckoutPage::handlePayPalApprove()
   ↓
18. Router.navigate(['/bookings/:id/confirmation'])
```

---

## 🛣️ Configuración de Rutas

### Agregar Ruta al App Routing

**Archivo**: `apps/web/src/app/app.routes.ts`

```typescript
import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // ... otras rutas

  // Bookings Feature
  {
    path: 'bookings',
    canMatch: [AuthGuard],
    children: [
      {
        path: ':bookingId/checkout',
        loadComponent: () =>
          import('./features/bookings/pages/booking-checkout/booking-checkout.page').then(
            (m) => m.BookingCheckoutPage
          ),
      },
      {
        path: ':bookingId/confirmation',
        loadComponent: () =>
          import('./features/bookings/pages/booking-confirmation/booking-confirmation.page').then(
            (m) => m.BookingConfirmationPage
          ),
      },
      // ... más rutas de bookings
    ],
  },
];
```

**Navegación Programática**:

```typescript
// Desde booking-detail.page.ts
goToCheckout(bookingId: string): void {
  this.router.navigate(['/bookings', bookingId, 'checkout']);
}
```

---

## 🎉 Página de Confirmación

### Visión General

La **BookingConfirmationPage** es la página de destino después de completar un pago exitoso. Maneja múltiples estados y proveedores de pago.

**Ubicación**: `apps/web/src/app/features/bookings/pages/booking-confirmation/`

**Archivos**:
- `booking-confirmation.page.ts` (336 líneas)
- `booking-confirmation.page.html` (221 líneas)
- `booking-confirmation.page.css` (396 líneas)

---

### Estados de la Página

La página maneja 4 estados principales:

| Estado | Descripción | Trigger |
|--------|-------------|---------|
| **Loading** | Verificando el pago | Carga inicial |
| **Success** | Pago confirmado | booking.status === 'confirmed' |
| **Pending** | Pago pendiente de confirmación | booking.status === 'pending' |
| **Error** | Pago rechazado o error | booking.status === 'rejected' o error |

---

### Query Params Soportados

La página extrae información del pago desde los query parameters:

**PayPal**:
```typescript
?provider=paypal&orderId=ABC123&captureId=XYZ789
```

**MercadoPago**:
```typescript
?provider=mercadopago&preference_id=123&payment_id=456&status=approved
```

---

### Características Clave

#### 1. **Animación de Checkmark (Success)**

```css
/* Animated SVG checkmark with stroke animation */
.checkmark-circle-bg {
  stroke-dasharray: 166;
  stroke-dashoffset: 166;
  animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
}

.checkmark-check {
  stroke-dasharray: 48;
  stroke-dashoffset: 48;
  animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.6s forwards;
}
```

**Resultado**: Animación suave de checkmark verde que se dibuja gradualmente.

---

#### 2. **Polling de Estado (Pending)**

Cuando el pago está pendiente, la página hace polling automático:

```typescript
private startPollingBookingStatus(): void {
  let attempts = 0;
  const maxAttempts = 10;
  const interval = 3000; // 3 segundos

  const pollInterval = setInterval(async () => {
    attempts++;

    const bookingData = await this.bookingsService.getBookingById(this.bookingId());

    if (bookingData.status === 'confirmed') {
      this.status.set('success');
      this.booking.set(bookingData);
      clearInterval(pollInterval);
    } else if (attempts >= maxAttempts) {
      // Después de 30 segundos, dejar en pending
      clearInterval(pollInterval);
    }
  }, interval);
}
```

**Comportamiento**:
- Verifica el estado cada 3 segundos
- Máximo 10 intentos (30 segundos total)
- Se detiene cuando el booking se confirma
- Útil porque los webhooks pueden tardar unos segundos

---

#### 3. **Detalles de Pago y Booking**

Muestra información completa en cards:

```html
<!-- Payment Details Card -->
<div class="details-card">
  <h2 class="card-title">Detalles del Pago</h2>

  <div class="detail-row">
    <span class="detail-label">Proveedor</span>
    <span class="detail-value">{{ providerDisplayName() }}</span>
  </div>

  <div class="detail-row">
    <span class="detail-label">ID de Referencia</span>
    <span class="detail-value code">{{ paymentReferenceId() }}</span>
  </div>

  <!-- ... más detalles -->
</div>

<!-- Booking Summary Card -->
<div class="details-card">
  <h2 class="card-title">Resumen de la Reserva</h2>
  <!-- Vehículo, fechas, estado, etc. -->
</div>
```

---

#### 4. **Acciones Disponibles**

**Estado Success**:
- ✅ Ver Detalles de la Reserva
- ✅ Descargar Recibo (placeholder)
- ✅ Ver Todas mis Reservas

**Estado Pending**:
- 🔄 Actualizar Estado
- 🏠 Volver al Inicio

**Estado Error**:
- 🔁 Reintentar Pago
- 🏠 Volver al Inicio
- 🔄 Actualizar Estado

---

### Implementación del Componente

**Archivo**: `booking-confirmation.page.ts`

```typescript
@Component({
  selector: 'app-booking-confirmation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './booking-confirmation.page.html',
  styleUrls: ['./booking-confirmation.page.css'],
})
export class BookingConfirmationPage implements OnInit {
  // Signals
  bookingId = signal<string>('');
  booking = signal<any>(null);
  status = signal<ConfirmationStatus>('pending');
  paymentDetails = signal<PaymentDetails | null>(null);
  isLoading = signal<boolean>(true);

  // Computed signals
  readonly isSuccess = computed(() => this.status() === 'success');
  readonly isPending = computed(() => this.status() === 'pending');
  readonly isError = computed(() => this.status() === 'error');
  readonly providerDisplayName = computed(() => {
    const provider = this.paymentDetails()?.provider;
    return provider === 'mercadopago' ? 'MercadoPago' : 'PayPal';
  });

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('bookingId');
    const queryParams = this.route.snapshot.queryParams;

    this.bookingId.set(id);
    this.extractPaymentDetails(queryParams);

    await this.loadBookingAndVerifyPayment();
    this.isLoading.set(false);
  }

  // ... métodos privados y públicos
}
```

**Características destacadas**:
- ✅ Angular Signals para state management
- ✅ Computed signals para estados derivados
- ✅ Polling automático para pagos pendientes
- ✅ Extracción de query params multi-proveedor
- ✅ Validación de estados del booking

---

### Flujo de Navegación

```
Checkout Page
     ↓ (payment completed)
Confirmation Page
     ↓
┌────────────────────────────────────┐
│  Query Params Received             │
│  - provider                        │
│  - orderId/preferenceId            │
│  - captureId/payment_id            │
│  - status (MP only)                │
└────────────────────────────────────┘
     ↓
┌────────────────────────────────────┐
│  Load Booking from DB              │
│  - GET /bookings/:bookingId        │
└────────────────────────────────────┘
     ↓
┌────────────────────────────────────┐
│  Determine Status                  │
│  - Success: booking.status = conf  │
│  - Pending: booking.status = pend  │
│  - Error: booking.status = reject  │
└────────────────────────────────────┘
     ↓
┌────────────────────────────────────┐
│  Display Appropriate UI            │
│  - Success: Checkmark + details    │
│  - Pending: Spinner + polling      │
│  - Error: Error icon + retry       │
└────────────────────────────────────┘
     ↓
User Actions:
  - View Booking Details → /bookings/:id
  - Download Receipt → (placeholder)
  - My Bookings → /bookings
  - Retry Payment → /bookings/:id/checkout
  - Home → /
```

---

### Integración con Checkout Page

La página de checkout redirige a la confirmación después del pago:

**PayPal** (en `booking-checkout.page.ts`):
```typescript
handlePayPalApprove(event: { orderId: string; captureId: string }): void {
  this.router.navigate(['/bookings', this.bookingId(), 'confirmation'], {
    queryParams: {
      provider: 'paypal',
      orderId: event.orderId,
      captureId: event.captureId,
    },
  });
}
```

**MercadoPago** (automático):
```typescript
// En mercadopago-create-booking-preference Edge Function
success_url: `${appBaseUrl}/bookings/${bookingId}/confirmation?provider=mercadopago&preference_id=${preference.id}`,
failure_url: `${appBaseUrl}/bookings/${bookingId}/checkout?error=payment_failed`,
```

---

### Testing de la Confirmación

#### Test Unitario

```typescript
describe('BookingConfirmationPage', () => {
  it('should show success state when payment is confirmed', async () => {
    const mockBooking = { id: '123', status: 'confirmed' };
    mockBookingsService.getBookingById.and.returnValue(Promise.resolve(mockBooking));

    await component.ngOnInit();

    expect(component.status()).toBe('success');
    expect(component.isSuccess()).toBe(true);
  });

  it('should start polling when payment is pending', async () => {
    const mockBooking = { id: '123', status: 'pending' };
    mockBookingsService.getBookingById.and.returnValue(Promise.resolve(mockBooking));

    spyOn<any>(component, 'startPollingBookingStatus');

    await component.ngOnInit();

    expect(component.status()).toBe('pending');
    expect(component['startPollingBookingStatus']).toHaveBeenCalled();
  });

  it('should extract PayPal payment details from query params', () => {
    const queryParams = {
      provider: 'paypal',
      orderId: 'ORDER123',
      captureId: 'CAPTURE456',
    };

    component['extractPaymentDetails'](queryParams);

    expect(component.paymentDetails()?.provider).toBe('paypal');
    expect(component.paymentDetails()?.orderId).toBe('ORDER123');
    expect(component.paymentDetails()?.captureId).toBe('CAPTURE456');
  });
});
```

#### Test E2E

```typescript
test('should show success confirmation after PayPal payment', async ({ page }) => {
  // Complete payment flow
  await page.goto('/bookings/123/checkout');
  await page.click('input[value="paypal"]');
  // ... complete PayPal payment in sandbox

  // Should redirect to confirmation
  await expect(page).toHaveURL(/\/bookings\/123\/confirmation/);

  // Should show success state
  await expect(page.locator('.checkmark-circle')).toBeVisible();
  await expect(page.locator('.status-title.success')).toContainText('confirmado');

  // Should show payment details
  await expect(page.locator('.details-card')).toContainText('PayPal');
  await expect(page.locator('.status-badge.confirmed')).toBeVisible();
});
```

---

### Customización

#### Agregar más información al receipt

```typescript
// En booking-confirmation.page.ts
downloadReceipt(): void {
  const booking = this.booking();
  const payment = this.paymentDetails();

  // Generar PDF o descargar HTML
  const receiptHtml = this.generateReceiptHTML(booking, payment);

  // Descargar
  const blob = new Blob([receiptHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `receipt-${booking.id}.html`;
  a.click();
}
```

#### Agregar email de confirmación

```typescript
// Después de confirmar el pago
if (bookingData.status === 'confirmed') {
  this.status.set('success');

  // Enviar email de confirmación
  await this.emailService.sendBookingConfirmation(bookingData);
}
```

---

### Mejores Prácticas

1. **Polling Responsable**
   - Usar intervalos de 3-5 segundos
   - Limitar a 10-15 intentos máximo
   - Limpiar intervalos en ngOnDestroy

2. **Error Handling**
   - Mostrar mensajes claros de error
   - Ofrecer opción de retry
   - No bloquear al usuario en caso de error

3. **Performance**
   - Usar Angular Signals para reactividad
   - Computed signals para estados derivados
   - Lazy loading del componente

4. **UX**
   - Animaciones suaves y no distractoras
   - Feedback inmediato de estado
   - Opciones claras de siguiente acción

---

## 🧪 Testing

### Test Unitario del Componente

**Archivo**: `booking-checkout.page.spec.ts`

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingCheckoutPage } from './booking-checkout.page';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentGatewayFactory } from '../../../../core/services/payment-gateway.factory';
import { BookingsService } from '../../../../core/services/bookings.service';
import { of } from 'rxjs';

describe('BookingCheckoutPage', () => {
  let component: BookingCheckoutPage;
  let fixture: ComponentFixture<BookingCheckoutPage>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: any;
  let mockGatewayFactory: jasmine.SpyObj<PaymentGatewayFactory>;
  let mockBookingsService: jasmine.SpyObj<BookingsService>;

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockActivatedRoute = {
      snapshot: {
        paramMap: {
          get: jasmine.createSpy('get').and.returnValue('booking-123'),
        },
      },
    };
    mockGatewayFactory = jasmine.createSpyObj('PaymentGatewayFactory', [
      'createBookingGateway',
    ]);
    mockBookingsService = jasmine.createSpyObj('BookingsService', [
      'getBookingById',
    ]);

    await TestBed.configureTestingModule({
      imports: [BookingCheckoutPage],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: PaymentGatewayFactory, useValue: mockGatewayFactory },
        { provide: BookingsService, useValue: mockBookingsService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingCheckoutPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load booking on init', async () => {
    const mockBooking = {
      id: 'booking-123',
      total_price: 50000,
      currency: 'ARS',
      status: 'pending',
    };
    mockBookingsService.getBookingById.and.returnValue(Promise.resolve(mockBooking));

    await component.ngOnInit();

    expect(component.bookingId()).toBe('booking-123');
    expect(component.booking()).toEqual(mockBooking);
    expect(component.isLoading()).toBe(false);
  });

  it('should handle provider change', () => {
    const event = {
      provider: 'paypal' as const,
      amountInProviderCurrency: 50,
      providerCurrency: 'USD',
    };

    component.handleProviderChange(event);

    expect(component.selectedProvider()).toBe('paypal');
    expect(component.amountInProviderCurrency()).toBe(50);
    expect(component.providerCurrency()).toBe('USD');
  });

  it('should handle PayPal approval', () => {
    component.bookingId.set('booking-123');
    const event = { orderId: 'order-456', captureId: 'capture-789' };

    component.handlePayPalApprove(event);

    expect(mockRouter.navigate).toHaveBeenCalledWith(
      ['/bookings', 'booking-123', 'confirmation'],
      {
        queryParams: {
          provider: 'paypal',
          orderId: 'order-456',
          captureId: 'capture-789',
        },
      }
    );
  });

  it('should handle PayPal error', () => {
    const error = new Error('PayPal error');

    component.handlePayPalError(error);

    expect(component.error()).toContain('PayPal error');
    expect(component.isProcessingPayment()).toBe(false);
  });
});
```

---

### Test E2E (Opcional)

**Archivo**: `booking-checkout.e2e.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Booking Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Navigate to checkout
    await page.goto('/bookings/booking-123/checkout');
  });

  test('should display booking summary', async ({ page }) => {
    await expect(page.locator('.booking-summary-card')).toBeVisible();
    await expect(page.locator('.card-title')).toContainText('Resumen de la Reserva');
  });

  test('should switch payment providers', async ({ page }) => {
    // Default should be MercadoPago
    await expect(page.locator('.mercadopago-btn')).toBeVisible();

    // Click PayPal provider
    await page.click('input[value="paypal"]');

    // PayPal button should appear
    await expect(page.locator('#paypal-button-container')).toBeVisible();
  });

  test('should show correct currency conversion', async ({ page }) => {
    // Check MercadoPago amount
    const arsAmount = await page.locator('.amount-value').textContent();
    expect(arsAmount).toContain('ARS');

    // Switch to PayPal
    await page.click('input[value="paypal"]');

    // Check USD amount
    const usdAmount = await page.locator('.amount-value').textContent();
    expect(usdAmount).toContain('USD');
  });
});
```

---

## 🔧 Troubleshooting

### Problema 1: "PayPal SDK no se carga"

**Síntomas**:
- PayPal button no aparece
- Console error: `paypal is not defined`

**Solución**:
1. Verificar que `PAYPAL_CLIENT_ID` esté configurado en `environment.ts`
2. Verificar que el script se carga correctamente en `PayPalButtonComponent::loadPayPalSDK()`
3. Revisar Network tab para verificar que `sdk.js` se descargó

```typescript
// environment.ts
export const environment = {
  paypalClientId: 'AZDxjDScFpQtjWTOUtWKbyN_bDt4OgqaF4eYXlewfBP4-8aqX3PiV8e1GWU6liB2CUXlkA59kJXE7M6R',
  // ...
};
```

---

### Problema 2: "Error creando preferencia de MercadoPago"

**Síntomas**:
- Error al hacer click en botón de MercadoPago
- Console error: `Error creating preference`

**Solución**:
1. Verificar que el booking existe y está en estado `pending`
2. Verificar que el Edge Function `mercadopago-create-booking-preference` está deployado
3. Revisar logs de Supabase Edge Functions

```bash
# Ver logs de Edge Function
npx supabase functions logs mercadopago-create-booking-preference --tail

# Verificar que el Edge Function está activo
npx supabase functions list
```

---

### Problema 3: "Conversión de moneda incorrecta"

**Síntomas**:
- Montos no coinciden con tipo de cambio esperado
- Tipo de cambio es 0

**Solución**:
1. Verificar que `exchange_rates` table tiene datos actualizados
2. Verificar que `FxService::getFxSnapshot()` está funcionando
3. Revisar que el cron job de actualización de tasas está activo

```sql
-- Verificar última tasa de cambio
SELECT * FROM exchange_rates
WHERE pair = 'USDTARS'
ORDER BY created_at DESC
LIMIT 1;

-- Verificar cron jobs activos
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname LIKE '%exchange%';
```

---

### Problema 4: "Redirección fallida después del pago"

**Síntomas**:
- Usuario completa pago pero no regresa a AutoRenta
- Queda en página de PayPal o MercadoPago

**Solución**:
1. **MercadoPago**: Verificar `success_url` y `failure_url` en preferencia
2. **PayPal**: Verificar que `return_url` está configurado en orden

```typescript
// En PayPalBookingGatewayService
const orderRequest = {
  // ...
  application_context: {
    return_url: `${window.location.origin}/bookings/${bookingId}/confirmation`,
    cancel_url: `${window.location.origin}/bookings/${bookingId}/checkout`,
  },
};
```

---

### Problema 5: "Botón de pago deshabilitado"

**Síntomas**:
- Botón de pago permanece deshabilitado
- `isPaymentButtonEnabled()` retorna `false`

**Debugging**:
```typescript
// En DevTools console
console.log({
  isLoading: component.isLoading(),
  isProcessingPayment: component.isProcessingPayment(),
  booking: component.booking(),
  amount: component.amountInProviderCurrency(),
  enabled: component.isPaymentButtonEnabled(),
});
```

**Causas comunes**:
- `isLoading` aún es `true` (booking no se cargó)
- `booking` es `null` (error en `getBookingById`)
- `amountInProviderCurrency` es 0 (conversión falló)

---

## 📚 Recursos Adicionales

### Documentos Relacionados

- **PAYPAL_INTEGRATION_COMPLETE.md**: Guía completa de la integración PayPal
- **PAYPAL_INTEGRATION_PROGRESS.md**: Detalles técnicos del backend
- **CLAUDE.md**: Arquitectura general del proyecto
- **API Reference**: Supabase Edge Functions documentation

### Componentes Reusables

- **PaymentProviderSelectorComponent**: `/shared/components/payment-provider-selector/`
- **PayPalButtonComponent**: `/shared/components/paypal-button/`

### Servicios y Factories

- **PaymentGatewayFactory**: `/core/services/payment-gateway.factory.ts`
- **PayPalBookingGatewayService**: `/core/services/paypal-booking-gateway.service.ts`
- **MercadoPagoBookingGatewayService**: `/core/services/mercadopago-booking-gateway.service.ts`
- **FxService**: `/core/services/fx.service.ts`

---

## ✅ Checklist de Implementación

### Checkout Page
- [x] Crear componente `BookingCheckoutPage` (.ts, .html, .css)
- [x] Importar `PaymentProviderSelectorComponent`
- [x] Importar `PayPalButtonComponent`
- [x] Configurar ruta en `app.routes.ts`
- [x] Implementar `handleProviderChange()`
- [x] Implementar `handleMercadoPagoPayment()`
- [x] Implementar `handlePayPalApprove()`
- [x] Implementar `handlePayPalError()`
- [x] Agregar loading states
- [x] Agregar error handling
- [x] Configurar redirecciones

### Confirmation Page
- [x] Crear componente `BookingConfirmationPage` (.ts, .html, .css)
- [x] Implementar extracción de query params
- [x] Agregar estados (success, pending, error)
- [x] Implementar animación de checkmark
- [x] Agregar polling para pagos pendientes
- [x] Mostrar detalles de pago y booking
- [x] Configurar ruta en `app.routes.ts`
- [x] Agregar botones de acción
- [ ] Implementar descarga de recibo (opcional)
- [ ] Agregar email de confirmación (opcional)

### Testing & Deployment
- [ ] Escribir tests unitarios (checkout)
- [ ] Escribir tests unitarios (confirmation)
- [ ] Verificar responsive design
- [ ] Testear flujo completo E2E (MercadoPago)
- [ ] Testear flujo completo E2E (PayPal)
- [ ] Deploy backend (migrations + Edge Functions)
- [ ] Configurar PayPal credentials
- [ ] Configurar webhooks
- [ ] Deploy frontend

---

## 🎉 Conclusión

¡Has implementado exitosamente un checkout page multi-proveedor en AutoRenta!

Este ejemplo muestra:
- ✅ Integración de múltiples proveedores de pago
- ✅ Conversión de moneda en tiempo real
- ✅ Conditional rendering basado en proveedor seleccionado
- ✅ Manejo robusto de errores y estados de loading
- ✅ UX optimizada con feedback visual

**Próximos pasos sugeridos**:
1. Deploy del backend (migraciones y Edge Functions)
2. Configurar PayPal credentials
3. Testing en sandbox
4. Deploy a producción

---

**¿Preguntas?** Consulta los runbooks en `/docs/runbooks/` o revisa la documentación completa en `PAYPAL_INTEGRATION_COMPLETE.md`.

**Última actualización**: 2025-11-05

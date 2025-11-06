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

/**
 * Booking Checkout Page
 *
 * Página de pago que integra múltiples proveedores de pago:
 * - MercadoPago (ARS)
 * - PayPal (USD)
 *
 * Flujo:
 * 1. Usuario selecciona proveedor (PaymentProviderSelectorComponent)
 * 2. Se muestra el botón/UI del proveedor seleccionado
 * 3. Usuario completa el pago
 * 4. Redirección a página de confirmación
 *
 * @example
 * Route: /bookings/:bookingId/checkout
 */
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

  // ==================== SIGNALS ====================

  /**
   * ID del booking a pagar
   */
  bookingId = signal<string>('');

  /**
   * Detalles del booking cargados desde la DB
   */
  booking = signal<any>(null);

  /**
   * Proveedor de pago seleccionado
   */
  selectedProvider = signal<PaymentProvider>('mercadopago');

  /**
   * Monto a pagar en la moneda del proveedor
   */
  amountInProviderCurrency = signal<number>(0);

  /**
   * Moneda del proveedor (ARS o USD)
   */
  providerCurrency = signal<string>('ARS');

  /**
   * Estado de carga inicial
   */
  isLoading = signal<boolean>(true);

  /**
   * Error durante la carga o el pago
   */
  error = signal<string>('');

  /**
   * Estado de procesamiento del pago
   */
  isProcessingPayment = signal<boolean>(false);

  /**
   * Preference ID de MercadoPago (si corresponde)
   */
  mercadoPagoPreferenceId = signal<string>('');

  /**
   * Init point de MercadoPago (si corresponde)
   */
  mercadoPagoInitPoint = signal<string>('');

  // ==================== COMPUTED SIGNALS ====================

  /**
   * ¿Está el botón de pago habilitado?
   */
  readonly isPaymentButtonEnabled = computed(() => {
    return (
      !this.isLoading() &&
      !this.isProcessingPayment() &&
      this.booking() !== null &&
      this.amountInProviderCurrency() > 0
    );
  });

  /**
   * ¿El proveedor seleccionado es MercadoPago?
   */
  readonly isMercadoPago = computed(() => {
    return this.selectedProvider() === 'mercadopago';
  });

  /**
   * ¿El proveedor seleccionado es PayPal?
   */
  readonly isPayPal = computed(() => {
    return this.selectedProvider() === 'paypal';
  });

  // ==================== LIFECYCLE ====================

  async ngOnInit(): Promise<void> {
    // Obtener booking ID de la ruta
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

  // ==================== PUBLIC METHODS ====================

  /**
   * Carga los detalles del booking desde la DB
   */
  private async loadBooking(): Promise<void> {
    const bookingData = await this.bookingsService.getBookingById(
      this.bookingId()
    );

    if (!bookingData) {
      throw new Error('Booking no encontrado');
    }

    // Validar que el booking está en estado pendiente de pago
    if (bookingData.status !== 'pending') {
      throw new Error(
        `Este booking está en estado "${bookingData.status}" y no se puede pagar`
      );
    }

    this.booking.set(bookingData);
  }

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

    // Limpiar preferencia previa de MercadoPago
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

      if (!preference || !preference.success || !preference.init_point) {
        throw new Error('Error creando preferencia de pago');
      }

      this.mercadoPagoPreferenceId.set(preference.preference_id);
      this.mercadoPagoInitPoint.set(preference.init_point);

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
    this.error.set(
      `Error procesando pago con PayPal: ${error.message}`
    );
    this.isProcessingPayment.set(false);
  }

  /**
   * Cancela el pago y vuelve atrás
   */
  cancelPayment(): void {
    this.router.navigate(['/bookings', this.bookingId()]);
  }

  /**
   * Formatea un monto como moneda
   */
  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat(currency === 'ARS' ? 'es-AR' : 'en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
}

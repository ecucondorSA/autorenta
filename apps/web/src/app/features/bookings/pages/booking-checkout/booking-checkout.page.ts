import { CommonModule, formatDate } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { normalizeRecordToUsd } from '@core/utils/currency.utils';
import { PaymentProvider } from '@core/interfaces/payment-gateway.interface';
import type { Booking } from '@core/models';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { PaymentGatewayFactory } from '@core/services/payments/payment-gateway.factory';
import { WalletService } from '@core/services/payments/wallet.service';
import { DriverProfileService } from '@core/services/auth/driver-profile.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { PayPalButtonComponent } from '@shared/components/paypal-button/paypal-button.component';
import { PaymentProviderSelectorComponent } from '@shared/components/payment-provider-selector/payment-provider-selector.component';
import { HoverLiftDirective } from '@shared/directives/hover-lift.directive';
import { PressScaleDirective } from '@shared/directives/press-scale.directive';
import { SpringCollapseDirective } from '@shared/directives/spring-collapse.directive';
import { StaggerEnterDirective } from '@shared/directives/stagger-enter.directive';
import { IconComponent } from '@shared/components/icon/icon.component';
import { MoneyPipe } from '@shared/pipes/money.pipe';
import {
  calcHoldAndBuydown,
  getVehicleTierByValue,
  getVehicleTierName,
  type HoldCalculation,
  type MembershipPlan,
} from '@core/models/guarantee-tiers.model';
import { SubscriptionService } from '@core/services/subscriptions/subscription.service';

// Interface for the preference response to avoid 'any'
interface MercadoPagoPreferenceResponse {
  success: boolean;
  init_point: string;
  preference_id: string;
}

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    PaymentProviderSelectorComponent,
    PayPalButtonComponent,
    // UI 2026 Directives
    HoverLiftDirective,
    PressScaleDirective,
    StaggerEnterDirective,
    SpringCollapseDirective,
    IconComponent,
    MoneyPipe,
  ],
  templateUrl: './booking-checkout.page.html',
  styleUrls: ['./booking-checkout.page.css'],
})
export class BookingCheckoutPage implements OnInit {
  private readonly logger = inject(LoggerService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly gatewayFactory = inject(PaymentGatewayFactory);
  private readonly bookingsService = inject(BookingsService);
  readonly walletService = inject(WalletService);
  readonly driverProfileService = inject(DriverProfileService);
  readonly subscriptionService = inject(SubscriptionService);

  // Expose Math for template
  readonly Math = Math;

  // ==================== SIGNALS ====================

  /**
   * ID del booking a pagar
   */
  bookingId = signal<string>('');

  /**
   * Detalles del booking cargados desde la DB
   */
  booking = signal<Booking | null>(null);

  /**
   * Información de garantía calculada con el nuevo sistema de 6 niveles
   */
  readonly guaranteeInfo = computed<HoldCalculation | null>(() => {
    const booking = this.booking();
    if (!booking || !booking.car) return null;

    const carValue = booking.car.value_usd || 10000;
    const vehicleTier = getVehicleTierByValue(carValue);

    // Mapping current user subscription to logic membership plan
    const userTier = this.subscriptionService.tier();
    const plan: MembershipPlan = userTier
      ? userTier === 'club_standard'
        ? 'club'
        : userTier === 'club_black'
          ? 'silver'
          : userTier === 'club_luxury'
            ? 'black'
            : 'none'
      : 'none';

    return calcHoldAndBuydown(vehicleTier, plan);
  });

  getVehicleTierName = getVehicleTierName;

  formatBookingDate(date?: string | Date | null): string {
    if (!date) return '-';
    return formatDate(date, 'medium', 'es-AR');
  }

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

  /**
   * Mostrar/ocultar oferta de Bonus Protector
   */
  showProtectorOffer = signal<boolean>(false);

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

  /**
   * ¿El proveedor seleccionado es Wallet?
   */
  readonly isWallet = computed(() => {
    return this.selectedProvider() === 'wallet';
  });

  /**
   * ¿Tiene suficiente saldo en la wallet?
   */
  readonly hasSufficientBalance = computed(() => {
    // Solo chequeamos si es wallet
    if (!this.isWallet()) return true;
    return this.walletService.availableBalance() >= this.amountInProviderCurrency();
  });

  // ==================== DRIVER PROFILE COMPUTED ====================

  /**
   * Clase de conductor del usuario
   */
  readonly driverClass = computed(() => this.driverProfileService.driverClass());

  /**
   * Descuento/recargo de tarifa (%)
   */
  readonly feeDiscountPct = computed(() => this.driverProfileService.feeDiscountPct());

  /**
   * Descuento/recargo de garantía (%)
   */
  readonly guaranteeDiscountPct = computed(() => this.driverProfileService.guaranteeDiscountPct());

  /**
   * ¿Tiene descuentos por buena clase?
   */
  readonly hasDiscount = computed(() => this.driverProfileService.hasDiscount());

  /**
   * ¿Tiene recargos por mala clase?
   */
  readonly hasSurcharge = computed(() => this.driverProfileService.hasSurcharge());

  /**
   * Badge de clase (color e icono)
   */
  readonly classBadge = computed(() => this.driverProfileService.getClassBadge());

  /**
   * Total del booking en USD para display
   */
  readonly bookingTotalUsd = computed(() => {
    const booking = this.booking();
    if (!booking) return 0;
    return this.normalizeBookingAmountToUsd(booking);
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
      // Cargar booking, perfil de conductor y balance de wallet en paralelo
      await Promise.all([
        this.loadBooking(),
        this.driverProfileService.loadProfile(),
        this.walletService.fetchBalance(),
      ]);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error cargando el booking');
    } finally {
      this.isLoading.set(false);
    }
  }

  // ==================== PUBLIC METHODS ====================

  /**
   * Carga los detalles del booking desde la DB
   */
  private async loadBooking(): Promise<void> {
    const bookingData = await this.bookingsService.getBookingById(this.bookingId());

    if (!bookingData) {
      throw new Error('Booking no encontrado');
    }

    // Validar que el booking está en estado pendiente de pago
    const payableStatuses = new Set(['pending_payment', 'pending']);
    if (!payableStatuses.has(bookingData.status)) {
      throw new Error(`Este booking está en estado "${bookingData.status}" y no se puede pagar`);
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

    // If wallet is selected, ensure we have the latest balance
    if (event.provider === 'wallet') {
      this.walletService.fetchBalance().catch((err: unknown) => {
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.logger.warn('Error refreshing wallet balance on selection', { error: errorMsg });
      });
    }

    // Limpiar preferencia previa de MercadoPago
    this.mercadoPagoPreferenceId.set('');
    this.mercadoPagoInitPoint.set('');

    this.logger.debug('Provider changed:', event);
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
      const preference = (await firstValueFrom(
        gateway.createBookingPreference(this.bookingId(), true),
      )) as unknown as MercadoPagoPreferenceResponse;

      if (!preference || !preference.success || !preference.init_point) {
        throw new Error('Error creando preferencia de pago');
      }

      this.mercadoPagoPreferenceId.set(preference.preference_id);
      this.mercadoPagoInitPoint.set(preference.init_point);

      // Redirigir a MercadoPago
      gateway.redirectToCheckout(preference.init_point, false);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error procesando pago con MercadoPago');
      this.isProcessingPayment.set(false);
    }
  }

  /**
   * Maneja la aprobación del pago de PayPal
   */
  handlePayPalApprove(event: { orderId: string; captureId: string }): void {
    this.logger.debug('PayPal payment approved:', event);

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

  /**
   * Maneja el pago con Wallet (AutoRenta Credits)
   */
  async handleWalletPayment(): Promise<void> {
    if (!this.isPaymentButtonEnabled()) return;
    if (!this.hasSufficientBalance()) {
      this.error.set('No tienes suficiente saldo disponible en tu wallet.');
      return;
    }

    this.isProcessingPayment.set(true);
    this.error.set('');

    try {
      // 1. Lock funds
      await firstValueFrom(
        this.walletService.lockFunds(
          this.bookingId(),
          this.amountInProviderCurrency(),
          `Pago de reserva #${this.bookingId()}`,
        ),
      );

      // 2. Redirect to confirmation (like PayPal)
      // Since it's instant, we can simulate a "transaction" ID or use the booking ID
      this.router.navigate(['/bookings', this.bookingId(), 'confirmation'], {
        queryParams: {
          provider: 'wallet',
          status: 'approved',
        },
      });
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error procesando el pago con Wallet');
      this.isProcessingPayment.set(false);
    }
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

  private normalizeBookingAmountToUsd(booking: Record<string, unknown>): number {
    // Handle total_cents separately if present
    if (booking['total_cents']) {
      const cents = Number(booking['total_cents']);
      const currency = String(booking['currency'] || 'USD');
      const fxRate = (booking['fx_snapshot'] ?? booking['fx_rate']) as number | null;
      return normalizeRecordToUsd(
        { total_price: cents / 100, currency, fx_snapshot: fxRate },
        'total_price',
      );
    }
    return (
      normalizeRecordToUsd(booking, 'total_price') || normalizeRecordToUsd(booking, 'total_amount')
    );
  }

  /**
   * Toggle de la oferta de Bonus Protector
   */
  toggleProtectorOffer(): void {
    this.showProtectorOffer.update((value) => !value);
  }
}

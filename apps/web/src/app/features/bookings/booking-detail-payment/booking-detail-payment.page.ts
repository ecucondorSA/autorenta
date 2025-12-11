import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';

// Services
import { AuthService } from '../../../core/services/auth.service';
import { FxService } from '../../../core/services/fx.service';
import { PdfGeneratorService } from '../../../core/services/pdf-generator.service';
import { SupabaseClientService } from '../../../core/services/supabase-client.service';
import { LoggerService } from '../../../core/services/logger.service';
import { MercadoPagoBookingGateway } from '../checkout/support/mercadopago-booking.gateway';

// Models
import { Car } from '../../../core/models';
import { FxSnapshot, RiskSnapshot, PaymentAuthorization } from '../../../core/models/booking-detail-payment.model';

// Components
import { MercadopagoCardFormComponent } from '../../../shared/components/mercadopago-card-form/mercadopago-card-form.component';
import { CardHoldPanelComponent } from './components/card-hold-panel.component';
import { PaymentModeToggleComponent } from './components/payment-mode-toggle.component';
import { PaymentMode } from '../../../core/models/booking-detail-payment.model';

// Extended FxSnapshot with dual rates
interface DualRateFxSnapshot extends FxSnapshot {
  binanceRate: number; // Raw Binance rate (no margin) - for price conversions
  platformRate: number; // Binance + 10% margin - for guarantees only
}

@Component({
  selector: 'app-booking-detail-payment',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MercadopagoCardFormComponent,
    CardHoldPanelComponent,
    PaymentModeToggleComponent,
  ],
  templateUrl: './booking-detail-payment.page.html',
  styleUrls: ['./booking-detail-payment.page.css'],
})
export class BookingDetailPaymentPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private pollInterval?: ReturnType<typeof setInterval>;

  // Injected services
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fxService = inject(FxService);
  readonly authService = inject(AuthService);
  private supabaseClient = inject(SupabaseClientService).getClient();
  private mpGateway = inject(MercadoPagoBookingGateway);
  private pdfGenerator = inject(PdfGeneratorService);
  private logger = inject(LoggerService).createChildLogger('BookingDetailPaymentPage');

  // State
  readonly car = signal<Car | null>(null);
  readonly fxSnapshot = signal<DualRateFxSnapshot | null>(null);
  readonly loading = signal(false);
  readonly processingPayment = signal(false);
  readonly error = signal<string | null>(null);

  // Payment flow state
  readonly bookingCreated = signal(false);
  readonly bookingId = signal<string | null>(null);
  readonly paymentProcessing = signal(false);
  readonly fxRateLocked = signal(false); // FX rate is locked after booking creation

  // Payment mode toggle: 'card' = tarjeta (preautorización), 'wallet' = saldo AutoRenta
  readonly paymentMode = signal<PaymentMode>('card');

  // Preauthorization state
  readonly riskSnapshot = signal<RiskSnapshot | null>(null);
  readonly currentAuthorization = signal<PaymentAuthorization | null>(null);
  readonly currentUserId = signal<string>('');

  // Constants
  readonly PRE_AUTH_AMOUNT_USD = 600;

  // Computed - Rental days
  readonly rentalDays = computed(() => {
    const input = this.bookingInput();
    if (!input) return 0;
    const diffTime = input.endDate.getTime() - input.startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays); // At least 1 day
  });

  // Computed - Rental cost in USD (platform base currency)
  readonly rentalCostUsd = computed(() => {
    const car = this.car();
    const days = this.rentalDays();

    if (!car || days === 0) return 0;

    // All prices are now stored in USD
    const dailyRate = car.price_per_day;
    return dailyRate * days;
  });

  // Computed - Rental cost in ARS (for MercadoPago payment)
  readonly rentalCostArs = computed(() => {
    const fx = this.fxSnapshot();
    const usdCost = this.rentalCostUsd();

    if (!fx || usdCost === 0) return 0;

    // Convert USD to ARS using Binance rate (NO margin for rental)
    return usdCost * fx.binanceRate;
  });

  // Computed - Total guarantee + rental in ARS
  readonly totalArs = computed(() => {
    const fx = this.fxSnapshot();
    if (!fx) return 0;

    // Guarantee uses platform_rate (with 10% margin for volatility protection)
    const guaranteeArs = this.PRE_AUTH_AMOUNT_USD * fx.platformRate;

    // Rental cost already handles currency conversion correctly
    // (uses binanceRate for USD cars, direct ARS for ARS cars)
    const rentalArs = this.rentalCostArs();

    return guaranteeArs + rentalArs;
  });

  readonly bookingInput = signal<{
    carId: string;
    startDate: Date;
    endDate: Date;
  } | null>(null);

  /**
   * Check if car has any features to display
   */
  hasCarFeatures(): boolean {
    const features = this.getCarFeatures();
    return features.length > 0;
  }

  /**
   * Parse car features from JSONB to displayable array
   */
  getCarFeatures(): string[] {
    const car = this.car();
    if (!car || !car.features) return [];

    try {
      const features = typeof car.features === 'string' ? JSON.parse(car.features) : car.features;

      if (typeof features !== 'object' || features === null) return [];

      // Convert object keys with true values to array
      // Example: { "air_conditioning": true, "bluetooth": true } => ["Aire Acondicionado", "Bluetooth"]
      const featureMap: Record<string, string> = {
        air_conditioning: 'Aire Acondicionado',
        bluetooth: 'Bluetooth',
        gps: 'GPS',
        backup_camera: 'Cámara de Retroceso',
        parking_sensors: 'Sensores de Estacionamiento',
        cruise_control: 'Control de Crucero',
        leather_seats: 'Asientos de Cuero',
        sunroof: 'Techo Solar',
        heated_seats: 'Asientos Calefaccionados',
        usb_charger: 'Cargador USB',
        aux_input: 'Entrada Auxiliar',
        apple_carplay: 'Apple CarPlay',
        android_auto: 'Android Auto',
        abs: 'ABS',
        airbags: 'Airbags',
        alarm: 'Alarma',
        central_locking: 'Cierre Centralizado',
        power_windows: 'Ventanas Eléctricas',
        power_mirrors: 'Espejos Eléctricos',
        fog_lights: 'Luces Antiniebla',
        alloy_wheels: 'Llantas de Aleación',
      };

      return Object.entries(features)
        .filter(([_, value]) => value === true || value === 'true')
        .map(
          ([key]) =>
            featureMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        )
        .sort();
    } catch (error) {
      this.logger.error('Error parsing car features', { error });
      return [];
    }
  }

  async ngOnInit(): Promise<void> {
    // 1. Auth check
    const session = await this.authService.ensureSession();
    if (!session?.user) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    // Store user ID for preauthorization
    this.currentUserId.set(session.user.id);

    // 2. Load params (now async to support bookingId lookup)
    await this.loadParams();

    // 3. Load data (only if params were loaded successfully)
    if (this.bookingInput()) {
      await Promise.all([this.loadCarInfo(), this.loadFxSnapshot()]);
    }

    // 4. Calculate risk snapshot after FX is loaded
    this.calculateRiskSnapshot();
  }

  ngOnDestroy(): void {
    this.stopPolling();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadParams(): Promise<void> {
    const queryParams = this.route.snapshot.queryParamMap;
    const carId = queryParams.get('carId');
    const startDate = queryParams.get('startDate');
    const endDate = queryParams.get('endDate');
    const bookingIdParam = queryParams.get('bookingId');

    // Mode 1: Direct booking params (carId + dates)
    if (carId && startDate && endDate) {
      this.bookingInput.set({
        carId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });
      return;
    }

    // Mode 2: Existing booking ID - load booking data
    if (bookingIdParam) {
      try {
        const { data: booking, error } = await this.supabaseClient
          .from('bookings')
          .select('id, car_id, start_date, end_date')
          .eq('id', bookingIdParam)
          .single();

        if (error || !booking) {
          this.logger.error('Error loading booking', { bookingId: bookingIdParam, error });
          this.error.set('No se encontró la reserva. Puede que haya sido cancelada o el enlace sea incorrecto.');
          return;
        }

        this.bookingId.set(booking.id);
        this.bookingCreated.set(true);
        this.bookingInput.set({
          carId: booking.car_id,
          startDate: new Date(booking.start_date),
          endDate: new Date(booking.end_date),
        });
        return;
      } catch (err) {
        this.logger.error('Error loading booking params', { error: err });
        this.error.set('Error al cargar los datos de la reserva.');
        return;
      }
    }

    // No valid params found
    this.error.set('Faltan parámetros de reserva. Por favor, selecciona un vehículo y fechas desde el catálogo.');
  }

  private async loadCarInfo(): Promise<void> {
    const input = this.bookingInput();
    if (!input) return;

    try {
      const { data, error } = await this.supabaseClient
        .from('cars')
        .select('*')
        .eq('id', input.carId)
        .single();

      if (error) throw error;
      if (data) this.car.set(data as Car);
    } catch (err) {
      this.logger.error('Error loading car', { error: err });
      this.error.set('Error al cargar información del vehículo');
    }
  }

  private async loadFxSnapshot(): Promise<void> {
    this.loading.set(true);

    // Initial load
    await this.fetchAndSetRate();
    this.loading.set(false);

    // Poll every 30 seconds
    this.stopPolling(); // Ensure no duplicate intervals
    this.pollInterval = setInterval(() => {
      this.fetchAndSetRate();
    }, 30000);
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = undefined;
    }
  }

  private async fetchAndSetRate(): Promise<void> {
    try {
      // Fetch BOTH rates from exchange service
      const platformRate = await this.fxService.getCurrentRateAsync('USD', 'ARS'); // With 10% margin (for guarantees)
      const binanceRate = await this.fxService.getBinanceRateAsync(); // Raw Binance (for price conversions)

      const snapshot: DualRateFxSnapshot = {
        rate: platformRate, // Keep 'rate' as platform_rate for backward compatibility with template
        binanceRate, // Raw Binance rate (no margin)
        platformRate, // Binance + 10% margin (guarantees only)
        timestamp: new Date(),
        fromCurrency: 'USD',
        toCurrency: 'ARS',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isExpired: false,
        variationThreshold: 0.1,
      };

      this.fxSnapshot.set(snapshot);
      this.logger.info('Exchange rates updated', {
        binanceRate: binanceRate.toFixed(2),
        platformRate: platformRate.toFixed(2),
      });
    } catch (err) {
      this.logger.error('Error updating FX rate', { error: err });
      // Don't clear error signal here to avoid flashing error on transient failures if we already have a rate
      if (!this.fxSnapshot()) {
        this.error.set('No se pudo obtener la cotización actualizada.');
      }
    }
  }

  async downloadPdf(): Promise<void> {
    const input = this.bookingInput();
    const car = this.car();

    if (!input || !car) {
      this.logger.error('Cannot generate PDF: missing booking or car data');
      return;
    }

    try {
      // Generate filename based on car and date
      const carName = `${car.brand}-${car.model}`.replace(/\s+/g, '-');
      const date = new Date().toISOString().split('T')[0];
      const filename = `reserva-${carName}-${date}.pdf`;

      // Generate PDF from the content element
      await this.pdfGenerator.generateFromElement('#pdf-content', {
        filename,
        format: 'a4',
        orientation: 'portrait',
        scale: 2, // High quality
        quality: 0.95,
      });

      this.logger.info('PDF generated successfully', { filename });
    } catch (error) {
      this.logger.error('Error generating PDF', { error });
      this.error.set('No se pudo generar el PDF. Por favor, intente nuevamente.');
    }
  }

  async payWithMercadoPago(): Promise<void> {
    const input = this.bookingInput();
    const fx = this.fxSnapshot();
    if (!input) return;

    if (!fx) {
      this.error.set('No hay cotización disponible. Por favor, recarga la página.');
      return;
    }

    this.processingPayment.set(true);
    try {
      // Lock the FX rate - stop polling to prevent price changes during redirect
      this.stopPolling();
      this.fxRateLocked.set(true);

      // Store locked FX rate in booking metadata for audit trail
      const lockedFxSnapshot = {
        binanceRate: fx.binanceRate,
        platformRate: fx.platformRate,
        lockedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min validity
      };

      const { data: booking, error: bookingError } = await this.supabaseClient
        .from('bookings')
        .insert({
          car_id: input.carId,
          renter_id: (await this.authService.getCurrentUser())?.id,
          start_at: input.startDate.toISOString(),
          end_at: input.endDate.toISOString(),
          status: 'pending',
          total_cents: this.PRE_AUTH_AMOUNT_USD * 100, // Store in cents USD
          total_amount: this.PRE_AUTH_AMOUNT_USD, // Store decimal amount
          currency: 'USD',
          payment_mode: 'card',
          price_locked_until: lockedFxSnapshot.expiresAt,
          metadata: {
            fx_locked: lockedFxSnapshot,
            total_ars_at_lock: this.totalArs(),
            rental_cost_ars_at_lock: this.rentalCostArs(),
            guarantee_ars_at_lock: this.PRE_AUTH_AMOUNT_USD * fx.platformRate,
          },
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      await this.upsertPricingAndInsurance(booking.id);

      // Get MP Preference
      const preference = await this.mpGateway.createPreference(booking.id);

      // Redirect to MP (SECURITY: Validate HTTPS to prevent open redirect attacks)
      if (preference.initPoint) {
        if (!preference.initPoint.startsWith('https://')) {
          this.logger.error('Invalid payment URL - not HTTPS', { url: preference.initPoint });
          throw new Error('URL de pago inválida');
        }
        window.location.href = preference.initPoint;
      } else {
        throw new Error('No se recibió link de pago');
      }
    } catch (err) {
      console.error('Payment error:', err);
      this.error.set(err instanceof Error ? err.message : 'Error al iniciar el pago');
    } finally {
      this.processingPayment.set(false);
    }
  }

  /**
   * Handle card token generated by MercadoPago CardForm
   */
  async onCardTokenGenerated(event: { cardToken: string; last4: string }): Promise<void> {
    try {
      this.paymentProcessing.set(true);
      this.error.set(null);

      // Create booking if not exists
      if (!this.bookingId()) {
        await this.createBooking();
      }

      const bId = this.bookingId();
      if (!bId) {
        throw new Error('No se pudo crear la reserva');
      }

      // Call Supabase Edge Function to process payment
      const { data: paymentResult, error: paymentError } =
        await this.supabaseClient.functions.invoke('mercadopago-process-booking-payment', {
          body: {
            booking_id: bId,
            card_token: event.cardToken,
            installments: 1,
          },
        });

      if (paymentError) {
        throw new Error(paymentError.message || 'Error al procesar el pago');
      }

      if (!paymentResult?.success) {
        throw new Error(
          paymentResult?.details?.message ||
            paymentResult?.error ||
            'El pago fue rechazado. Por favor, verifica los datos de tu tarjeta.',
        );
      }

      this.logger.info('Payment processed successfully', {
        status: paymentResult.status,
      });

      // Refresh pricing/insurance after payment (in case backend recalculated)
      if (bId) {
        await this.upsertPricingAndInsurance(bId);
      }

      // If payment is approved, auto-approve the booking
      if (paymentResult.status === 'approved') {
        this.logger.info('Payment approved, auto-approving booking');

        // Note: In production, this would be handled by the backend
        // but for now we can update the booking status directly
        const { error: approvalError } = await this.supabaseClient
          .from('bookings')
          .update({
            status: 'approved',
            approved_at: new Date().toISOString(),
          })
          .eq('id', bId);

        if (approvalError) {
          this.logger.warn('Could not auto-approve booking');
          // No fallar el flujo, el webhook lo hará
        } else {
          this.logger.info('Booking auto-approved successfully');
        }
      }

      // Success! Redirect to confirmation page
      this.router.navigate(['/bookings', bId, 'success'], {
        queryParams: {
          payment_id: paymentResult.payment_id,
          status: paymentResult.status,
        },
      });
    } catch (err) {
      this.logger.error('Error processing payment', { error: err });
      this.error.set(err instanceof Error ? err.message : 'Error al procesar el pago');
    } finally {
      this.paymentProcessing.set(false);
    }
  }

  /**
   * Handle card form errors
   */
  onCardError(errorMessage: string): void {
    this.logger.error('Card form error', { errorMessage });
    this.error.set(errorMessage);
    this.paymentProcessing.set(false);
  }

  /**
   * Create a pending booking in the database
   * IMPORTANT: This also locks the FX rate to prevent price changes during payment
   */
  private async createBooking(): Promise<void> {
    const input = this.bookingInput();
    const user = await this.authService.getCurrentUser();
    const fx = this.fxSnapshot();

    if (!input || !user?.id) {
      throw new Error('Faltan datos para crear la reserva');
    }

    if (!fx) {
      throw new Error('No hay cotización disponible. Por favor, recarga la página.');
    }

    try {
      // Lock the FX rate - stop polling to prevent price changes during payment
      this.stopPolling();
      this.fxRateLocked.set(true);

      // Store locked FX rate in booking metadata for audit trail
      const lockedFxSnapshot = {
        binanceRate: fx.binanceRate,
        platformRate: fx.platformRate,
        lockedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min validity
      };

      const { data: booking, error: bookingError } = await this.supabaseClient
        .from('bookings')
        .insert({
          car_id: input.carId,
          renter_id: user.id,
          start_at: input.startDate.toISOString(),
          end_at: input.endDate.toISOString(),
          status: 'pending',
          total_cents: Math.round(this.totalArs() * 100), // Store total in cents ARS
          total_amount: this.totalArs(), // Store decimal amount
          currency: 'ARS',
          payment_mode: 'card',
          price_locked_until: lockedFxSnapshot.expiresAt,
          metadata: {
            fx_locked: lockedFxSnapshot,
            total_ars_at_lock: this.totalArs(),
            rental_cost_ars_at_lock: this.rentalCostArs(),
            guarantee_ars_at_lock: this.PRE_AUTH_AMOUNT_USD * fx.platformRate,
          },
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      this.bookingId.set(booking.id);
      this.bookingCreated.set(true);

      await this.upsertPricingAndInsurance(booking.id);

      this.logger.info('Booking created with locked FX rate', {
        total: this.totalArs(),
        currency: 'ARS',
        binanceRate: fx.binanceRate.toFixed(2),
        platformRate: fx.platformRate.toFixed(2),
        lockedUntil: lockedFxSnapshot.expiresAt,
      });
    } catch (err) {
      // If booking creation fails, unlock FX rate and resume polling
      this.fxRateLocked.set(false);
      this.loadFxSnapshot(); // Resume polling
      this.logger.error('Error creating booking', { error: err });
      throw err;
    }
  }

  private async upsertPricingAndInsurance(bookingId: string): Promise<void> {
    const car = this.car();
    const fx = this.fxSnapshot();
    const nights = this.rentalDays();
    if (!car || !fx || nights === 0) return;

    const nightlyRateArs =
      car.currency === 'USD' ? car.price_per_day * fx.binanceRate : car.price_per_day;
    const base = nightlyRateArs * nights;

    const pricingPayload = {
      booking_id: bookingId,
      nightly_rate_cents: Math.round(nightlyRateArs * 100),
      days_count: nights,
      fees_cents: 0,
      discounts_cents: 0,
      insurance_cents: 0,
      subtotal_cents: Math.round(base * 100),
      total_cents: Math.round(base * 100),
      breakdown: {
        nightly_rate: nightlyRateArs,
        nights,
        fees: 0,
        discounts: 0,
        insurance: 0,
      },
    };

    const insurancePayload = {
      booking_id: bookingId,
      insurance_coverage_id: null,
      insurance_premium_total: 0,
      guarantee_type: 'hold',
      guarantee_amount_cents: Math.round(this.PRE_AUTH_AMOUNT_USD * fx.platformRate * 100),
      coverage_upgrade: null,
    };

    await this.supabaseClient.from('bookings_pricing').upsert(pricingPayload, {
      onConflict: 'booking_id',
    });

    await this.supabaseClient.from('bookings_insurance').upsert(insurancePayload, {
      onConflict: 'booking_id',
    });
  }

  /**
   * Toggle payment mode between card (preauthorization) and wallet
   */
  setPaymentMode(mode: PaymentMode): void {
    this.paymentMode.set(mode);
    this.error.set(null);
    this.logger.info('Payment mode changed', { mode });
  }

  /**
   * Handle mode change from PaymentModeToggleComponent
   */
  onPaymentModeChange(mode: PaymentMode): void {
    this.setPaymentMode(mode);
  }

  /**
   * Calculate risk snapshot for preauthorization
   */
  private calculateRiskSnapshot(): void {
    const fx = this.fxSnapshot();
    const car = this.car();

    if (!fx || !car) return;

    // Estimate vehicle value (use price_per_day * 365 as rough estimate if not available)
    const vehicleValueUsd = car.value_usd || (car.price_per_day * 365);

    // Calculate deductibles based on vehicle value (Argentina)
    let deductibleUsd: number;
    if (vehicleValueUsd <= 10000) deductibleUsd = 1000;
    else if (vehicleValueUsd <= 20000) deductibleUsd = 1500;
    else if (vehicleValueUsd <= 40000) deductibleUsd = 2000;
    else deductibleUsd = 2500;

    const rolloverDeductibleUsd = deductibleUsd * 2;

    // Calculate hold amount: use PRE_AUTH_AMOUNT_USD as base
    const holdEstimatedUsd = this.PRE_AUTH_AMOUNT_USD;
    const holdEstimatedArs = holdEstimatedUsd * fx.platformRate;

    const riskSnapshot: RiskSnapshot = {
      deductibleUsd,
      rolloverDeductibleUsd,
      holdEstimatedArs,
      holdEstimatedUsd,
      creditSecurityUsd: 600,
      bucket: 'standard',
      vehicleValueUsd,
      country: 'AR',
      fxRate: fx.platformRate,
      calculatedAt: new Date(),
      coverageUpgrade: 'standard',
    };

    this.riskSnapshot.set(riskSnapshot);
    this.logger.info('Risk snapshot calculated', { holdEstimatedArs, holdEstimatedUsd });
  }

  /**
   * Handle authorization change from CardHoldPanel
   */
  onAuthorizationChange(authorization: PaymentAuthorization | null): void {
    this.currentAuthorization.set(authorization);

    if (authorization?.status === 'authorized') {
      this.logger.info('Preauthorization successful', {
        authorizedPaymentId: authorization.authorizedPaymentId,
        amountArs: authorization.amountArs,
      });
    }
  }

  /**
   * Handle fallback to wallet from CardHoldPanel
   */
  onFallbackToWallet(): void {
    this.logger.info('User requested fallback to wallet');
    // TODO: Navigate to wallet flow or show wallet payment option
    this.error.set('Wallet payment not yet implemented. Please try card payment.');
  }

  /**
   * Get current user ID for preauthorization
   */
  async getCurrentUserId(): Promise<string> {
    const user = await this.authService.getCurrentUser();
    return user?.id || '';
  }
}

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {Component, OnDestroy, OnInit, computed, inject, signal,
  ChangeDetectionStrategy} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, firstValueFrom } from 'rxjs';

// Services
import { AuthService } from '../../../core/services/auth.service';
import { BookingsService } from '../../../core/services/bookings.service';
import { FxService } from '../../../core/services/fx.service';
import { SupabaseClientService } from '../../../core/services/supabase-client.service';
import { LoggerService } from '../../../core/services/logger.service';
import { MessagesService } from '../../../core/services/messages.service';
import { WalletService } from '../../../core/services/wallet.service';
import { PaymentAuthorizationService } from '../../../core/services/payment-authorization.service';

// Models
import { Car } from '../../../core/models';
import {
  FxSnapshot,
  RiskSnapshot,
  PaymentAuthorization,
  PaymentMode,
} from '../../../core/models/booking-detail-payment.model';

// Components
import { CardHoldPanelComponent } from './components/card-hold-panel.component';
import { RiskPolicyTableComponent } from './components/risk-policy-table.component';

// Extended FxSnapshot with dual rates
interface DualRateFxSnapshot extends FxSnapshot {
  binanceRate: number; // Raw Binance rate (no margin) - for price conversions
  platformRate: number; // Binance + 10% margin - for guarantees only
}

@Component({
  selector: 'app-booking-detail-payment',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardHoldPanelComponent,
    RiskPolicyTableComponent,
  ],
  templateUrl: './booking-detail-payment.page.html',
  styleUrls: ['./booking-detail-payment.page.css'],
})
export class BookingRequestPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private pollInterval?: ReturnType<typeof setInterval>;

  // Injected services
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fxService = inject(FxService);
  readonly authService = inject(AuthService);
  private bookingsService = inject(BookingsService);
  private messagesService = inject(MessagesService);
  private walletService = inject(WalletService);
  private paymentAuthorizationService = inject(PaymentAuthorizationService);
  private supabaseClient = inject(SupabaseClientService).getClient();
  private logger = inject(LoggerService).createChildLogger('BookingRequestPage');

  // State
  readonly car = signal<Car | null>(null);
  readonly fxSnapshot = signal<DualRateFxSnapshot | null>(null);
  readonly loading = signal(false);
  readonly processingPayment = signal(false); // Submitting request
  readonly error = signal<string | null>(null);

  // Payment flow state
  readonly bookingCreated = signal(false);
  readonly bookingId = signal<string | null>(null);
  readonly fxRateLocked = signal(false); // FX rate is locked after booking creation

  // Preauthorization state
  readonly riskSnapshot = signal<RiskSnapshot | null>(null);
  readonly currentAuthorization = signal<PaymentAuthorization | null>(null);
  readonly currentUserId = signal<string>('');

  // Guarantee mode
  readonly paymentMode = signal<PaymentMode>('card');
  readonly walletLockId = signal<string | null>(null);
  readonly lockingWallet = signal(false);

  // P2P Message to host
  messageToHost = '';
  readonly termsAccepted = signal(false);

  // Constants
  readonly PRE_AUTH_AMOUNT_USD = 600;

  // Wallet state (units, as returned by wallet_get_balance)
  readonly walletBalance = this.walletService.balance;
  readonly walletBalanceLoading = this.walletService.loading;

  readonly walletAvailableBalance = computed(() => this.walletBalance()?.available_balance ?? 0);
  readonly walletCurrency = computed(() => this.walletBalance()?.currency ?? 'USD');
  readonly walletRequiredArs = computed(() => this.riskSnapshot()?.holdEstimatedArs ?? 0);

  // Convert wallet balance to ARS if wallet is in USD
  readonly walletAvailableBalanceArs = computed(() => {
    const balance = this.walletAvailableBalance();
    const currency = this.walletCurrency();
    const fx = this.fxSnapshot();

    // If wallet is already in ARS, return as is
    if (currency === 'ARS') return balance;

    // Convert USD to ARS using platform rate
    if (fx?.platformRate && currency === 'USD') {
      return balance * fx.platformRate;
    }

    return balance;
  });

  readonly walletHasSufficientFunds = computed(() => {
    const requiredArs = this.walletRequiredArs();
    if (!requiredArs) return false;

    // Compare in the same currency (ARS)
    const availableArs = this.walletAvailableBalanceArs();
    return availableArs >= requiredArs;
  });

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

    // Preload wallet balance for wallet option
    this.walletService.fetchBalance().catch(() => {
      // Non-blocking
    });

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
    const bookingIdParam = queryParams.get('bookingId') || this.route.snapshot.paramMap.get('bookingId');

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
          .select('id, car_id, start_at, end_at, payment_mode, wallet_lock_id, authorized_payment_id')
          .eq('id', bookingIdParam)
          .single();

        if (error || !booking) {
          this.logger.error('Error loading booking', { bookingId: bookingIdParam, error });
          this.error.set('No se encontró la reserva. Puede que haya sido cancelada o el enlace sea incorrecto.');
          return;
        }

        this.bookingId.set(booking.id);
        this.bookingInput.set({
          carId: booking.car_id,
          startDate: new Date(booking.start_at),
          endDate: new Date(booking.end_at),
        });

        // Hydrate existing payment state so refresh doesn't break UX
        if (booking.payment_mode === 'wallet') {
          this.paymentMode.set('wallet');
        } else if (booking.payment_mode === 'card') {
          this.paymentMode.set('card');
        }

        if (booking.wallet_lock_id) {
          this.walletLockId.set(booking.wallet_lock_id);
        }

        if (booking.authorized_payment_id) {
          try {
            const auth = await firstValueFrom(
              this.paymentAuthorizationService.getAuthorizationStatus(booking.authorized_payment_id),
            );
            if (auth) {
              this.currentAuthorization.set(auth);
            }
          } catch {
            // Silent: user can re-authorize
          }
        }
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

  setPaymentMode(mode: PaymentMode): void {
    this.paymentMode.set(mode);
    this.error.set(null);
  }

  private async ensureWalletLock(bookingId: string): Promise<string> {
    const existingLockId = this.walletLockId();
    if (existingLockId) return existingLockId;

    const requiredArs = this.walletRequiredArs();
    const fx = this.fxSnapshot();
    const walletCurrency = this.walletCurrency();

    // Convert ARS to USD if wallet is in USD (which it is by default)
    let amountCents: number;
    if (walletCurrency === 'USD' && fx?.platformRate) {
      // Wallet is in USD, convert ARS requirement to USD cents
      const requiredUsd = requiredArs / fx.platformRate;
      amountCents = Math.round(requiredUsd * 100);
    } else {
      // Wallet is in ARS, use ARS cents directly
      amountCents = Math.round(requiredArs * 100);
    }

    if (!requiredArs || amountCents <= 0) {
      throw new Error('No se pudo calcular el monto de la garantía.');
    }

    this.lockingWallet.set(true);

    try {
      // Prefer the new function with expiration if available
      const { data: lockWithExpiration, error: lockWithExpirationError } = await this.supabaseClient.rpc(
        'wallet_lock_funds_with_expiration',
        {
          p_booking_id: bookingId,
          p_amount_cents: amountCents,
          p_lock_type: 'security_deposit_lock',
          p_expires_in_days: 90,
        },
      );

      if (!lockWithExpirationError && lockWithExpiration) {
        this.walletLockId.set(lockWithExpiration as string);
        await this.walletService.fetchBalance(true).catch(() => {});
        return lockWithExpiration as string;
      }

      // Fallback: legacy function
      const { data: lockId, error: lockError } = await this.supabaseClient.rpc('wallet_lock_funds', {
        p_booking_id: bookingId,
        p_amount_cents: amountCents,
      });

      if (lockError || !lockId) {
        throw lockError || new Error('No se pudo bloquear la garantía en wallet.');
      }

      this.walletLockId.set(lockId as string);
      await this.walletService.fetchBalance(true).catch(() => {});
      return lockId as string;
    } finally {
      this.lockingWallet.set(false);
    }
  }

  async submitRequest(): Promise<void> {
    const input = this.bookingInput();
    const car = this.car();
    const authorization = this.currentAuthorization();
    const mode = this.paymentMode();

    if (!input || !car) {
      this.error.set('Faltan datos para enviar la solicitud. Volvé a seleccionar fechas.');
      return;
    }

    if (!this.termsAccepted()) {
      this.error.set('Debes aceptar los Términos y Condiciones para continuar.');
      return;
    }

    if (mode === 'card') {
      if (!authorization || authorization.status !== 'authorized') {
        this.error.set('Debes completar la pre-autorización de la garantía antes de enviar la solicitud.');
        return;
      }
    } else {
      const required = this.walletRequiredArs();
      if (!required) {
        this.error.set('No se pudo calcular el monto de la garantía para wallet.');
        return;
      }
    }

    this.processingPayment.set(true);
    this.error.set(null);

    try {
      let bookingId = this.bookingId();

      if (!bookingId) {
        const booking = await this.bookingsService.requestBooking(
          input.carId,
          input.startDate.toISOString(),
          input.endDate.toISOString(),
        );
        bookingId = booking.id;
        this.bookingId.set(bookingId);
      }

      if (mode === 'card') {
        const { error: updateError } = await this.supabaseClient
          .from('bookings')
          .update({
            status: 'pending', // Awaiting owner approval
            payment_mode: 'card',
            guarantee_type: 'hold',
            guarantee_amount_cents: Math.round((authorization?.amountArs ?? 0) * 100),
            authorized_payment_id: authorization?.authorizedPaymentId ?? null,
            wallet_lock_id: null,
          })
          .eq('id', bookingId);

        if (updateError) {
          throw updateError;
        }
      } else {
        const walletLockId = await this.ensureWalletLock(bookingId);
        const amountCents = Math.round(this.walletRequiredArs() * 100);

        const { error: updateError } = await this.supabaseClient
          .from('bookings')
          .update({
            status: 'pending', // Awaiting owner approval
            payment_mode: 'wallet',
            guarantee_type: 'security_credit',
            guarantee_amount_cents: amountCents,
            wallet_lock_id: walletLockId,
            authorized_payment_id: null,
          })
          .eq('id', bookingId);

        if (updateError) {
          throw updateError;
        }
      }

      const message = this.messageToHost.trim();
      if (message) {
        await this.messagesService.sendMessage({
          recipientId: car.owner_id,
          body: message,
          bookingId,
          carId: car.id,
        });
      }

      await this.router.navigate(['/bookings', 'success', bookingId], {
        queryParams: { flow: 'request' },
      });
    } catch (err) {
      this.logger.error('Error submitting booking request', { error: err });
      this.error.set(err instanceof Error ? err.message : 'Error al enviar la solicitud');
    } finally {
      this.processingPayment.set(false);
    }
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
}

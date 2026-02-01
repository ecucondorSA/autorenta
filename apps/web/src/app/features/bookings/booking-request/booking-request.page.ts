import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, firstValueFrom } from 'rxjs';

// Services
import { AuthService } from '@core/services/auth/auth.service';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { FxService } from '@core/services/payments/fx.service';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { MessagesService } from '@core/services/bookings/messages.service';
import { WalletService } from '@core/services/payments/wallet.service';
import { PaymentAuthorizationService } from '@core/services/payments/payment-authorization.service';
import { SubscriptionService } from '@core/services/subscriptions/subscription.service';
import { EmailVerificationService } from '@core/services/auth/email-verification.service';
import { DistanceCalculatorService } from '@core/services/geo/distance-calculator.service';

// Models
import {
  FxSnapshot,
  RiskSnapshot,
  PaymentAuthorization,
  PaymentMode,
  CoverageUpgrade,
  getCoverageUpgradeName,
  getCoverageUpgradeCost,
} from '@core/models/booking-detail-payment.model';
import {
  SubscriptionCoverageCheck,
  PreauthorizationCalculation,
  SUBSCRIPTION_TIERS,
} from '@core/models/subscription.model';
import { SkeletonLoaderComponent } from '@shared/components/skeleton-loader/skeleton-loader.component';

// Components
import { DateRangePickerComponent } from '@shared/components/date-range-picker/date-range-picker.component';
import { DateRange } from '@core/models/marketplace.model';
import { Car } from '../../../core/models';
import { CardHoldPanelComponent } from './components/card-hold-panel.component';

// Extended FxSnapshot with dual rates
interface DualRateFxSnapshot extends FxSnapshot {
  binanceRate: number; // Raw Binance rate (no margin) - for price conversions
  platformRate: number; // Binance + 10% margin - for guarantees only
}

interface BookingInputData {
  carId: string;
  startDate: Date;
  endDate: Date;
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
}

@Component({
  selector: 'app-booking-request',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardHoldPanelComponent,
    SkeletonLoaderComponent,
    DateRangePickerComponent,
  ],
  templateUrl: './booking-request.page.html',
  styleUrls: ['./booking-request.page.css'],
})
export class BookingRequestPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private pollInterval?: ReturnType<typeof setInterval>;

  // ... (services remain the same)
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fxService = inject(FxService);
  readonly authService = inject(AuthService);
  private bookingsService = inject(BookingsService);
  private messagesService = inject(MessagesService);
  private walletService = inject(WalletService);
  private paymentAuthorizationService = inject(PaymentAuthorizationService);
  readonly subscriptionService = inject(SubscriptionService);
  private emailVerificationService = inject(EmailVerificationService);
  private distanceCalculator = inject(DistanceCalculatorService);
  private supabaseClient = inject(SupabaseClientService).getClient();
  private logger = inject(LoggerService).createChildLogger('BookingRequestPage');

  // State
  readonly car = signal<Car | null>(null);
  readonly fxSnapshot = signal<DualRateFxSnapshot | null>(null);
  readonly loading = signal(false);
  readonly processingPayment = signal(false); // Submitting request
  readonly error = signal<string | null>(null);

  // Edit Mode State
  readonly isEditingDates = signal(false);
  readonly showPhotoGallery = signal(false);

  // ... (rest of the state properties)
  readonly bookingCreated = signal(false);
  readonly bookingId = signal<string | null>(null);
  readonly fxRateLocked = signal(false); // FX rate is locked after booking creation

  // Preauthorization state
  readonly riskSnapshot = signal<RiskSnapshot | null>(null);
  readonly subscriptionCoverage = signal<SubscriptionCoverageCheck | null>(null);
  readonly preauthCalculation = signal<PreauthorizationCalculation | null>(null);
  readonly currentAuthorization = signal<PaymentAuthorization | null>(null);
  readonly currentUserId = signal<string>('');

  // Guarantee mode
  readonly paymentMode = signal<PaymentMode>('card');
  readonly walletLockId = signal<string | null>(null);
  readonly lockingWallet = signal(false);

  // Coverage Upgrade
  readonly coverageUpgrade = signal<CoverageUpgrade>('standard');

  // P2P Message to host
  messageToHost = '';
  readonly termsAccepted = signal(false);

  // UI state
  readonly showP2PDetails = signal(false);
  readonly activeTab = signal<'vehicle' | 'details' | 'guarantee'>('vehicle');

  // Constants
  readonly PRE_AUTH_AMOUNT_USD_DEFAULT = 600;

  // Booking Input
  readonly bookingInput = signal<BookingInputData | null>(null);

  // Wallet state (units, as returned by wallet_get_balance)
  readonly walletBalance = this.walletService.balance;
  readonly walletBalanceLoading = this.walletService.loading;

  // ... (rest of the component logic)

  // Edit Logic
  toggleEditDates() {
    this.isEditingDates.update(v => !v);
  }

  async onDatesChanged(range: DateRange) {
    if (range.from && range.to) {
      const startDate = new Date(range.from);
      const endDate = new Date(range.to);
      const currentInput = this.bookingInput();
      
      if (currentInput && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        this.bookingInput.set({
          ...currentInput,
          startDate: startDate,
          endDate: endDate
        });
        
        // Recalculate risks/costs
        await this.calculateRiskSnapshot();
        
        // Update URL query params without reloading to keep state consistent
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          },
          queryParamsHandling: 'merge'
        });
      }
    }
  }

  openPhotoGallery() {
    this.showPhotoGallery.set(true);
  }

  closePhotoGallery() {
    this.showPhotoGallery.set(false);
  }

  // ... (rest of methods)


  readonly walletAvailableBalance = computed(() => this.walletBalance()?.available_balance ?? 0);
  readonly walletCurrency = computed(() => this.walletBalance()?.currency ?? 'USD');

  readonly walletAvailableBalanceUsd = computed(() => {
    const balance = this.walletAvailableBalance();
    const currency = this.walletCurrency();
    const fx = this.fxSnapshot();

    if (currency === 'USD') return balance;
    if (currency === 'ARS' && fx?.platformRate) {
      return balance / fx.platformRate;
    }
    return balance;
  });

  // Required guarantee in USD (platform base currency)
  readonly walletRequiredUsd = computed(() => this.riskSnapshot()?.holdEstimatedUsd ?? 0);

  // Distance & Delivery Calculations
  readonly distanceKm = computed(() => {
    const input = this.bookingInput();
    const car = this.car();
    if (!input?.pickupLat || !car?.location_lat) return 0;
    return (
      this.distanceCalculator.calculateDistanceBetweenLocations(
        { lat: input.pickupLat, lng: input.pickupLng! },
        { lat: car.location_lat, lng: car.location_lng! },
      ) || 0
    );
  });

  readonly deliveryMetadata = computed(() => {
    return this.distanceCalculator.calculateDistanceMetadata(this.distanceKm());
  });

  // Subscription savings calculation
  readonly subscriptionSavings = computed(() => {
    const preauth = this.preauthCalculation();
    if (!preauth) return null;

    if (preauth.discountApplied) {
      const userTier = this.subscriptionService.tier();
      return {
        withoutSubscription: preauth.baseHoldUsd,
        withSubscription: preauth.holdAmountUsd,
        savings: preauth.baseHoldUsd - preauth.holdAmountUsd,
        hasSubscription: true,
        userTier,
        userTierName: userTier ? SUBSCRIPTION_TIERS[userTier]?.name : null,
        recommendedTierName: userTier ? SUBSCRIPTION_TIERS[userTier]?.name : 'Club Standard',
        tierPriceUsd: userTier ? (SUBSCRIPTION_TIERS[userTier]?.price_usd ?? 99) : 99,
        fgoCap: userTier ? (SUBSCRIPTION_TIERS[userTier]?.fgo_cap_usd ?? 800) : 800,
      };
    }
    return null;
  });

  readonly showSubscriptionPromoBanner = computed(() => {
    const savings = this.subscriptionSavings();
    return savings && !savings.hasSubscription && savings.savings > 0;
  });

  readonly walletHasSufficientFunds = computed(() => {
    const requiredUsd = this.walletRequiredUsd();
    if (!requiredUsd) return false;

    const currency = this.walletCurrency();
    const availableBalance = this.walletAvailableBalance();

    if (currency === 'USD') {
      return availableBalance >= requiredUsd;
    }

    const fx = this.fxSnapshot();
    if (fx?.platformRate) {
      const requiredArs = requiredUsd * fx.platformRate;
      return availableBalance >= requiredArs;
    }

    return false;
  });

  readonly rentalDays = computed(() => {
    const input = this.bookingInput();
    if (!input) return 0;
    const diffTime = input.endDate.getTime() - input.startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
  });

  readonly rentalCostUsd = computed(() => {
    const car = this.car();
    const days = this.rentalDays();

    if (!car || days === 0) return 0;

    const dailyRate = car.price_per_day;
    return dailyRate * days;
  });

  readonly coverageUpgradeCostUsd = computed(() => {
    return getCoverageUpgradeCost(this.coverageUpgrade(), this.rentalCostUsd());
  });

  readonly totalRentalUsd = computed(() => {
    return this.rentalCostUsd() + this.coverageUpgradeCostUsd();
  });

  readonly rentalCostArs = computed(() => {
    const fx = this.fxSnapshot();
    const usdCost = this.totalRentalUsd();

    if (!fx || usdCost === 0) return 0;
    return usdCost * fx.binanceRate;
  });

  readonly totalArs = computed(() => {
    const fx = this.fxSnapshot();
    const riskSnapshot = this.riskSnapshot();
    const car = this.car();
    if (!fx) return 0;

    const fallbackVehicleValueUsd =
      car?.value_usd ?? (car?.price_per_day ? Math.round(car.price_per_day * 125) : 0);
    const fallbackHoldUsd = fallbackVehicleValueUsd
      ? fallbackVehicleValueUsd * 0.05
      : this.PRE_AUTH_AMOUNT_USD_DEFAULT;
    const guaranteeArs = riskSnapshot?.holdEstimatedArs ?? fallbackHoldUsd * fx.platformRate;

    const rentalArs = this.rentalCostArs();

    return guaranteeArs + rentalArs;
  });

  hasCarFeatures(): boolean {
    const features = this.getCarFeatures();
    return features.length > 0;
  }

  getCarFeatures(): string[] {
    const car = this.car();
    if (!car || !car.features) return [];

    try {
      const features = typeof car.features === 'string' ? JSON.parse(car.features) : car.features;

      if (typeof features !== 'object' || features === null) return [];

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

  setCoverageUpgrade(upgrade: CoverageUpgrade) {
    this.coverageUpgrade.set(upgrade);
    this.calculateRiskSnapshot();
  }

  getCoverageName(upgrade: CoverageUpgrade) {
    return getCoverageUpgradeName(upgrade);
  }

  async ngOnInit(): Promise<void> {
    const session = await this.authService.ensureSession();
    if (!session?.user) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    this.currentUserId.set(session.user.id);

    this.walletService.fetchBalance().catch(() => {});

    await this.loadParams();

    if (this.bookingInput()) {
      await Promise.all([this.loadCarInfo(), this.loadFxSnapshot()]);
    }

    await this.calculateRiskSnapshot();
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
    const bookingIdParam =
      queryParams.get('bookingId') || this.route.snapshot.paramMap.get('bookingId');

    if (carId && startDate && endDate) {
      this.bookingInput.set({
        carId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });
      return;
    }

    if (bookingIdParam) {
      try {
        const { data: booking, error } = await this.supabaseClient
          .from('bookings')
          .select(
            'id, car_id, start_at, end_at, status, payment_mode, wallet_lock_id, authorized_payment_id, paid_at',
          )
          .eq('id', bookingIdParam)
          .single();

        if (error || !booking) {
          this.logger.error('Error loading booking', { bookingId: bookingIdParam, error });
          this.error.set(
            'No se encontró la reserva. Puede que haya sido cancelada o el enlace sea incorrecto.',
          );
          return;
        }

        const validStates = ['pending', 'pending_payment', 'draft'];
        if (!validStates.includes(booking.status)) {
          this.error.set(
            `Este booking está en estado "${booking.status}" y no se puede modificar.`,
          );
          return;
        }

        if (booking.paid_at) {
          this.error.set('Esta reserva ya fue pagada.');
          return;
        }

        this.bookingId.set(booking.id);
        this.bookingInput.set({
          carId: booking.car_id,
          startDate: new Date(booking.start_at),
          endDate: new Date(booking.end_at),
        });

        if (booking.payment_mode === 'wallet') {
          this.paymentMode.set('wallet');
        } else if (booking.payment_mode === 'card') {
          this.paymentMode.set('card');
        }

        if (booking.wallet_lock_id) {
          this.walletLockId.set(booking.wallet_lock_id);
          this.fxRateLocked.set(true);
        }

        if (booking.authorized_payment_id) {
          try {
            const auth = await firstValueFrom(
              this.paymentAuthorizationService.getAuthorizationStatus(
                booking.authorized_payment_id,
              ),
            );
            if (auth) {
              this.currentAuthorization.set(auth);
              if (auth.status === 'authorized') {
                this.fxRateLocked.set(true);
              }
            }
          } catch {
            // Silent catch
          }
        }
        return;
      } catch (err) {
        this.logger.error('Error loading booking params', { error: err });
        this.error.set('Error al cargar los datos de la reserva.');
        return;
      }
    }

    this.error.set(
      'Faltan parámetros de reserva. Por favor, selecciona un vehículo y fechas desde el catálogo.',
    );
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
    await this.fetchAndSetRate();
    this.loading.set(false);

    this.stopPolling();
    this.pollInterval = setInterval(() => {
      if (!this.fxRateLocked()) {
        this.fetchAndSetRate();
      }
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
      const platformRate = await this.fxService.getCurrentRateAsync('USD', 'ARS');
      const binanceRate = await this.fxService.getBinanceRateAsync();

      const snapshot: DualRateFxSnapshot = {
        rate: platformRate,
        binanceRate,
        platformRate,
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

    const requiredUsd = this.walletRequiredUsd();
    const walletCurrency = this.walletCurrency();
    const fx = this.fxSnapshot();

    let amountCents: number;
    if (walletCurrency === 'USD') {
      amountCents = Math.round(requiredUsd * 100);
    } else if (fx?.platformRate) {
      const requiredArs = requiredUsd * fx.platformRate;
      amountCents = Math.round(requiredArs * 100);
    } else {
      throw new Error(
        'No se pudo calcular el monto de la garantía (tipo de cambio no disponible).',
      );
    }

    if (!requiredUsd || amountCents <= 0) {
      throw new Error('No se pudo calcular el monto de la garantía.');
    }

    this.lockingWallet.set(true);

    try {
      const { data: lockWithExpiration, error: lockWithExpirationError } =
        await this.supabaseClient.rpc('wallet_lock_funds_with_expiration', {
          p_booking_id: bookingId,
          p_amount_cents: amountCents,
          p_lock_type: 'security_deposit_lock',
          p_expires_in_days: 90,
        });

      if (!lockWithExpirationError && lockWithExpiration) {
        this.walletLockId.set(lockWithExpiration as string);
        this.fxRateLocked.set(true);
        this.stopPolling();
        await this.walletService.fetchBalance(true).catch(() => {});
        return lockWithExpiration as string;
      }

      const { data: lockId, error: lockError } = await this.supabaseClient.rpc(
        'wallet_lock_funds',
        {
          p_booking_id: bookingId,
          p_amount_cents: amountCents,
        },
      );

      if (lockError || !lockId) {
        throw lockError || new Error('No se pudo bloquear la garantía en wallet.');
      }

      this.walletLockId.set(lockId as string);
      this.fxRateLocked.set(true);
      this.stopPolling();
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

    // P0-013: Check email verification before booking
    const emailStatus = await this.emailVerificationService.checkStatus();
    if (!emailStatus.isVerified) {
      this.error.set(
        'Por favor verifica tu email antes de reservar. Revisa tu bandeja de entrada.',
      );
      return;
    }

    if (!this.termsAccepted()) {
      this.error.set('Debes aceptar los Términos y Condiciones para continuar.');
      return;
    }

    if (mode === 'card') {
      if (!authorization || authorization.status !== 'authorized') {
        this.error.set(
          'Debes completar la pre-autorización de la garantía antes de enviar la solicitud.',
        );
        return;
      }
    } else {
      const required = this.walletRequiredUsd();
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
        const result = await this.bookingsService.createBookingWithValidation(
          input.carId,
          input.startDate.toISOString(),
          input.endDate.toISOString(),
          {
            pickupLat: input.pickupLat ?? car.location_lat ?? 0,
            pickupLng: input.pickupLng ?? car.location_lng ?? 0,
            dropoffLat: (input.dropoffLat || input.pickupLat) ?? car.location_lat ?? 0,
            dropoffLng: (input.dropoffLng || input.pickupLng) ?? car.location_lng ?? 0,
            deliveryRequired: this.distanceKm() > 0.5,
            distanceKm: this.distanceKm(),
            deliveryFeeCents: this.deliveryMetadata().deliveryFeeCents,
            distanceTier: this.deliveryMetadata().tier,
          },
        );

        if (!result.success || !result.booking) {
          throw new Error(result.error || 'Error al crear la reserva');
        }
        bookingId = result.booking.id;
        this.bookingId.set(bookingId);
      }

      // Map coverage upgrade for DB
      const upgrade = this.coverageUpgrade();
      const dbUpgrade =
        upgrade === 'premium50' ? 'premium' : upgrade === 'zero' ? 'zero_franchise' : 'standard';

      if (mode === 'card') {
        const { error: updateError } = await this.supabaseClient
          .from('bookings')
          .update({
            status: 'pending',
            payment_mode: 'card',
            guarantee_type: 'hold',
            guarantee_amount_cents: Math.round((authorization?.amountArs ?? 0) * 100),
            currency: 'ARS',
            authorized_payment_id: authorization?.authorizedPaymentId ?? null,
            wallet_lock_id: null,
            coverage_upgrade: dbUpgrade,
          })
          .eq('id', bookingId);

        if (updateError) {
          throw updateError;
        }
      } else {
        const walletLockId = await this.ensureWalletLock(bookingId!);

        const requiredUsd = this.walletRequiredUsd();
        const guaranteeAmountCents = Math.round(requiredUsd * 100);

        const { error: updateError } = await this.supabaseClient
          .from('bookings')
          .update({
            status: 'pending',
            payment_mode: 'wallet',
            guarantee_type: 'security_credit',
            guarantee_amount_cents: guaranteeAmountCents,
            currency: 'USD',
            wallet_lock_id: walletLockId,
            authorized_payment_id: null,
            coverage_upgrade: dbUpgrade,
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

  private async calculateRiskSnapshot(): Promise<void> {
    const fx = this.fxSnapshot();
    const car = this.car();

    if (!fx || !car) return;

    const vehicleValueUsd = car.value_usd || Math.round(car.price_per_day * 125);

    const preauth =
      await this.subscriptionService.calculatePreauthorizationForVehicle(vehicleValueUsd);
    this.preauthCalculation.set(preauth);

    const standardDeductibleUsd = Math.round(vehicleValueUsd * 0.05);
    const rolloverDeductibleUsd = standardDeductibleUsd * 2;

    const coverage = await this.subscriptionService.checkCoverage(
      Math.round(standardDeductibleUsd * 100),
    );
    this.subscriptionCoverage.set(coverage);

    const holdEstimatedUsd = preauth.holdAmountUsd;
    const holdEstimatedArs = holdEstimatedUsd * fx.platformRate;

    const riskSnapshot: RiskSnapshot = {
      deductibleUsd: standardDeductibleUsd,
      rolloverDeductibleUsd: rolloverDeductibleUsd,
      holdEstimatedArs,
      holdEstimatedUsd,
      creditSecurityUsd: holdEstimatedUsd,
      bucket:
        vehicleValueUsd < 20000 ? 'economy' : vehicleValueUsd < 40000 ? 'standard' : 'premium',
      vehicleValueUsd,
      country: 'AR',
      fxRate: fx.platformRate,
      calculatedAt: new Date(),
      coverageUpgrade: this.coverageUpgrade(),
    };

    this.riskSnapshot.set(riskSnapshot);
    this.logger.info('Risk snapshot updated with subscription benefits', {
      holdEstimatedUsd,
      discountApplied: preauth.discountApplied,
      coverageType: coverage.coverage_type,
      coverageUpgrade: this.coverageUpgrade(),
    });
  }

  onAuthorizationChange(authorization: PaymentAuthorization | null): void {
    this.currentAuthorization.set(authorization);

    if (authorization?.status === 'authorized') {
      this.fxRateLocked.set(true);
      this.stopPolling();

      this.logger.info('Preauthorization successful - FX rate locked', {
        authorizedPaymentId: authorization.authorizedPaymentId,
        amountArs: authorization.amountArs,
      });
    }
  }
}

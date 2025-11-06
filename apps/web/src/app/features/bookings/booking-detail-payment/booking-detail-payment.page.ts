import { Component, OnInit, OnDestroy, signal, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, firstValueFrom } from 'rxjs';

// Services
import { FxService } from '../../../core/services/fx.service';
import { RiskService } from '../../../core/services/risk.service';
import { PaymentAuthorizationService } from '../../../core/services/payment-authorization.service';
import { WalletService } from '../../../core/services/wallet.service';
import { SupabaseClientService } from '../../../core/services/supabase-client.service';
import { AuthService } from '../../../core/services/auth.service';
import { BookingsService } from '../../../core/services/bookings.service';
import { PaymentsService } from '../../../core/services/payments.service';
import { DistanceCalculatorService } from '../../../core/services/distance-calculator.service';
import { LocationService } from '../../../core/services/location.service';
import { RiskCalculatorService } from '../../../core/services/risk-calculator.service';
import {
  MercadoPagoBookingGateway,
  type MercadoPagoPreferenceResponse,
} from '../checkout/support/mercadopago-booking.gateway';
import { FgoV1_1Service } from '../../../core/services/fgo-v1-1.service';

// Models
import {
  BucketType,
  CountryCode,
  BookingInput,
  FxSnapshot,
  RiskSnapshot,
  PriceBreakdown,
  PaymentMode,
  CoverageUpgrade,
  PaymentAuthorization,
  WalletLock,
  UserConsents,
  BookingDates,
  CreateBookingResult,
  ValidationError,
  calculateTotalDays,
  getCoverageUpgradeCost as calculateCoverageUpgradeCost,
  validateConsents,
  validatePaymentAuthorization,
  formatUsd,
  formatArs,
} from '../../../core/models/booking-detail-payment.model';
import type { Car, Booking } from '../../../core/models';

// Components
import { BookingSummaryCardComponent } from './components/booking-summary-card.component';
import { RiskPolicyTableComponent } from './components/risk-policy-table.component';
import { PaymentModeToggleComponent } from './components/payment-mode-toggle.component';
import { PaymentSummaryPanelComponent } from './components/payment-summary-panel.component';
import { PaymentMethodComparisonModalComponent } from './components/payment-method-comparison-modal.component';
import { PaymentModeAlertComponent } from './components/payment-mode-alert.component';
import { CoverageUpgradeSelectorComponent } from './components/coverage-upgrade-selector.component';
import { CardHoldPanelComponent } from './components/card-hold-panel.component';
import { CreditSecurityPanelComponent } from './components/credit-security-panel.component';
import { TermsAndConsentsComponent } from './components/terms-and-consents.component';

/**
 * Página principal: Detalle & Pago (AR)
 *
 * Funcionalidades:
 * - Dos modalidades de garantía: Con tarjeta (hold) / Sin tarjeta (wallet)
 * - Upgrades de cobertura: Estándar, Premium (-50%), Franquicia Cero
 * - Cálculos en tiempo real con FX snapshot
 * - Validaciones idempotentes y transaccionales
 * - Revalidación de FX (>7 días o ±10%)
 */
@Component({
  selector: 'app-booking-detail-payment',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BookingSummaryCardComponent,
    RiskPolicyTableComponent,
    PaymentModeToggleComponent,
    PaymentSummaryPanelComponent,
    PaymentMethodComparisonModalComponent,
    PaymentModeAlertComponent,
    CoverageUpgradeSelectorComponent,
    CardHoldPanelComponent,
    CreditSecurityPanelComponent,
    TermsAndConsentsComponent,
  ],
  templateUrl: './booking-detail-payment.page.html',
  styleUrls: ['./booking-detail-payment.page.css'],
})
export class BookingDetailPaymentPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Injected services
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fxService = inject(FxService);
  private riskService = inject(RiskService);
  private authService = inject(AuthService);
  private paymentAuthService = inject(PaymentAuthorizationService);
  private walletService = inject(WalletService);
  private bookingsService = inject(BookingsService);
  private supabaseClient = inject(SupabaseClientService).getClient();

  // ✅ NUEVO: Servicios para procesamiento de pago final
  private paymentsService = inject(PaymentsService);
  private mpGateway = inject(MercadoPagoBookingGateway);
  private fgoService = inject(FgoV1_1Service);

  // ✅ NEW: Distance-based pricing services
  private distanceCalculator = inject(DistanceCalculatorService);
  private locationService = inject(LocationService);
  private riskCalculatorService = inject(RiskCalculatorService);

  // Booking ID for update operations
  private existingBookingId: string | null = null;

  // Helper to convert CoverageUpgrade to Booking type
  private mapCoverageUpgrade(upgrade: CoverageUpgrade): 'standard' | 'premium' | 'zero_franchise' {
    switch (upgrade) {
      case 'standard':
        return 'standard';
      case 'premium50':
        return 'premium';
      case 'zero':
        return 'zero_franchise';
      default:
        return 'standard';
    }
  }

  // ==================== SIGNALS (Estado Global) ====================

  // Input del booking
  readonly bookingInput = signal<BookingInput | null>(null);
  readonly bookingDates = computed<BookingDates | null>(() => {
    const input = this.bookingInput();
    if (!input) return null;
    return {
      startDate: input.startDate,
      endDate: input.endDate,
      totalDays: calculateTotalDays(input.startDate, input.endDate),
      totalHours: (input.endDate.getTime() - input.startDate.getTime()) / (1000 * 60 * 60),
    };
  });

  // Información del auto
  readonly car = signal<Car | null>(null);

  // Snapshots
  readonly fxSnapshot = signal<FxSnapshot | null>(null);
  readonly riskSnapshot = signal<RiskSnapshot | null>(null);
  readonly priceBreakdown = signal<PriceBreakdown | null>(null);

  // Modalidad y upgrade
  readonly paymentMode = signal<PaymentMode>('card');
  readonly coverageUpgrade = signal<CoverageUpgrade>('standard');

  // Autorizaciones
  readonly paymentAuthorization = signal<PaymentAuthorization | null>(null);
  readonly walletLock = signal<WalletLock | null>(null);

  // Consentimientos
  readonly consents = signal<UserConsents>({
    termsAccepted: false,
    cardOnFileAccepted: false,
    privacyPolicyAccepted: false,
  });

  // UI States
  readonly loading = signal(false);
  readonly loadingFx = signal(false);
  readonly loadingRisk = signal(false);
  readonly loadingPricing = signal(false);

  // Control de conversión optimizada
  readonly conversionMode = signal<'standard' | 'optimized'>('optimized'); // Por defecto optimizado
  readonly error = signal<string | null>(null);
  readonly validationErrors = signal<ValidationError[]>([]);

  // ✅ NUEVO: Estado de fallback a wallet
  readonly showFallbackMessage = signal(false);
  readonly fallbackReason = signal<string>('');

  // ✅ NUEVO: Modal de comparación de métodos
  readonly showComparisonModal = signal(false);

  // ✅ NUEVO: Signals para procesamiento de pago final
  readonly processingFinalPayment = signal(false);
  readonly lastCreatedBookingId = signal<string | null>(null);

  // User
  readonly userId = signal<string | null>(null);

  // ✅ NEW: Distance-based pricing signals
  readonly userLocation = signal<{ lat: number; lng: number } | undefined>(undefined);
  readonly distanceKm = signal<number | undefined>(undefined);
  readonly deliveryFeeCents = signal<number>(0);
  readonly distanceTier = signal<'local' | 'regional' | 'long_distance' | undefined>(undefined);

  // ==================== COMPUTED SIGNALS ====================

  /**
   * Valida si puede proceder al CTA
   */
  readonly canProceed = computed(() => {
    // 1. Debe tener todos los snapshots
    if (!this.fxSnapshot() || !this.riskSnapshot() || !this.priceBreakdown()) {
      return false;
    }

    // 2. Validar consentimientos
    const consentErrors = validateConsents(this.consents(), this.paymentMode());
    if (consentErrors.length > 0) {
      return false;
    }

    // 3. Si es card, debe tener autorización válida
    if (this.paymentMode() === 'card') {
      const authErrors = validatePaymentAuthorization(this.paymentAuthorization());
      if (authErrors.length > 0) {
        return false;
      }
    }

    // 4. Si es wallet, debe tener lock válido
    if (this.paymentMode() === 'wallet') {
      const lock = this.walletLock();
      if (!lock || lock.status !== 'locked') {
        return false;
      }
    }

    // 5. No debe estar cargando
    if (this.loading()) {
      return false;
    }

    return true;
  });

  /**
   * Mensaje de CTA
   */
  readonly ctaMessage = computed(() => {
    if (this.loading()) return 'Procesando...';
    if (!this.canProceed()) return 'Completa los requisitos';
    return 'Confirmar y pagar';
  });

  // ==================== EFFECTS ====================

  constructor() {
    // Effect: Recalcular risk snapshot y pricing cuando cambia upgrade de cobertura
    effect(() => {
      const upgrade = this.coverageUpgrade();
      const currentRisk = this.riskSnapshot();
      const currentFx = this.fxSnapshot();

      // Skip if no data yet (initial state)
      if (!currentRisk || !currentFx) {
        return;
      }

      // Check if upgrade has actually changed to prevent loops
      if (currentRisk.coverageUpgrade === upgrade) {
        return;
      }

      this.riskService.recalculateWithUpgrade(currentRisk, upgrade).then(newRisk => {
        this.riskSnapshot.set(newRisk);
        // Recalcular pricing también
        this.calculatePricing();
      });
    });
  }

  async ngOnInit(): Promise<void> {
    // 1. Obtener user ID
    const session = await this.authService.ensureSession();
    if (!session?.user) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }
    this.userId.set(session.user.id);

    // 2. Obtener parámetros de ruta o sessionStorage
    await this.loadBookingInput();

    // 3. Cargar información del auto
    await this.loadCarInfo();

    // 4. Inicializar snapshots (no espera distancia)
    await this.initializeSnapshots();

    // 5. ✅ OPTIMIZED: Initialize user location in background (non-blocking)
    // This allows the page to load immediately while location is being fetched
    this.initializeUserLocationAndDistanceInBackground();
  }

  /**
   * Initialize user location and calculate distance to car (NON-BLOCKING)
   * Runs in background without blocking page initialization.
   * When distance is available, recalculates pricing automatically.
   */
  private initializeUserLocationAndDistanceInBackground(): void {
    // Don't await this - let it run in background
    (async () => {
      try {
        const car = this.car();
        if (!car) return;

        // Get user location (can take 5-30 seconds)
        const locationData = await this.locationService.getUserLocation();
        if (locationData) {
          this.userLocation.set({ lat: locationData.lat, lng: locationData.lng });

          // Calculate distance if car has location
          if (car.location_lat && car.location_lng) {
            const distance = this.distanceCalculator.calculateDistance(
              locationData.lat,
              locationData.lng,
              car.location_lat,
              car.location_lng
            );

            this.distanceKm.set(distance);

            // Calculate tier and delivery fee
            const tier = this.distanceCalculator.getDistanceTier(distance);
            this.distanceTier.set(tier);

            const deliveryFee = this.distanceCalculator.calculateDeliveryFee(distance);
            this.deliveryFeeCents.set(deliveryFee);

            // ✅ IMPORTANT: Recalculate pricing now that we have distance
            await this.calculateRiskSnapshot();
            this.calculatePricing();
          }
        } else {
          // Set to undefined if no location data
          this.userLocation.set(undefined);
          this.distanceKm.set(undefined);
          this.distanceTier.set(undefined);
        }
      } catch (error) {
        // Silently fail - distance is optional
        console.warn('Could not calculate distance:', error);
        this.userLocation.set(undefined);
        this.distanceKm.set(undefined);
        this.distanceTier.set(undefined);
      }
    })();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== INITIALIZATION ====================

  /**
   * Carga el booking input desde route params o sessionStorage
   */
  private async loadBookingInput(): Promise<void> {
    // NUEVO: Intentar cargar desde bookingId existente
    const bookingId = this.route.snapshot.queryParamMap.get('bookingId');

    if (bookingId) {
      // Flujo: booking existente desde /bookings
      await this.loadExistingBooking(bookingId);
      return;
    }

    // Flujo original: nueva reserva desde car-detail
    // Intentar desde sessionStorage primero
    const stored = sessionStorage.getItem('booking_detail_input');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        this.bookingInput.set({
          ...parsed,
          startDate: new Date(parsed.startDate),
          endDate: new Date(parsed.endDate),
        });
        return;
      } catch (e) {}
    }

    // Si no, desde query params
    const queryParams = this.route.snapshot.queryParamMap;
    const carId = queryParams.get('carId');
    const startDate = queryParams.get('startDate');
    const endDate = queryParams.get('endDate');
    const vehicleValueUsd = queryParams.get('vehicleValueUsd');
    const bucket = queryParams.get('bucket');
    const country = queryParams.get('country');

    if (!carId || !startDate || !endDate) {
      this.error.set('Faltan parámetros de reserva. Regresa y selecciona fechas nuevamente.');
      return;
    }

    // Crear booking input desde query params
    this.bookingInput.set({
      carId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      bucket: (bucket as BucketType) || 'standard',
      vehicleValueUsd: vehicleValueUsd ? parseInt(vehicleValueUsd, 10) : 15000,
      country: (country as CountryCode) || 'AR',
    });

    // Guardar en sessionStorage para navegación futura
    sessionStorage.setItem(
      'booking_detail_input',
      JSON.stringify({
        carId,
        startDate,
        endDate,
        bucket: bucket || 'standard',
        vehicleValueUsd: vehicleValueUsd ? parseInt(vehicleValueUsd, 10) : 15000,
        country: country || 'AR',
      }),
    );
  }

  /**
   * NUEVO: Carga un booking existente desde la DB
   */
  private async loadExistingBooking(bookingId: string): Promise<void> {
    try {
      const { data, error } = await this.supabaseClient
        .from('bookings')
        .select(
          `
          *,
          car:cars(*)
        `,
        )
        .eq('id', bookingId)
        .single();

      if (error) throw error;
      if (!data) {
        this.error.set('Booking no encontrado');
        return;
      }

      // Reconstruir bookingInput desde el booking
      const carRecord = (data.car ?? null) as (Car & { bucket?: string }) | null;

      const bucket: BucketType = (carRecord?.bucket as BucketType | undefined) ?? 'standard';

      const vehicleValueUsd = carRecord?.value_usd != null ? Number(carRecord.value_usd) : 15000;

      this.bookingInput.set({
        carId: data.car_id,
        startDate: new Date(data.start_at),
        endDate: new Date(data.end_at),
        bucket,
        vehicleValueUsd,
        country: 'AR',
      });

      // Pre-cargar info del auto
      if (carRecord) {
        this.car.set(carRecord);
      }

      // Pre-seleccionar payment_mode si ya existe
      if (data.payment_mode) {
        this.paymentMode.set(data.payment_mode as PaymentMode);
      }

      // Pre-seleccionar coverage_upgrade si ya existe
      if (data.coverage_upgrade) {
        this.coverageUpgrade.set(data.coverage_upgrade as CoverageUpgrade);
      }

      // Guardar bookingId para UPDATE posterior
      this.existingBookingId = bookingId;
    } catch (err: unknown) {
      this.error.set(
        'Error al cargar el booking: ' + (err instanceof Error ? err.message : 'Error desconocido'),
      );
    }
  }

  /**
   * Carga información del auto desde DB
   */
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

      if (data) {
        this.car.set(data as Car);
      }

      // Actualizar bookingInput con datos reales del auto (si vinieron en query params, ya están seteados)
      // No sobrescribimos porque bucket y value_usd ya vienen calculados de car-detail.page.ts
      // this.bookingInput.update() - No es necesario, ya tenemos los valores correctos
    } catch (err: unknown) {
      this.error.set('Error al cargar información del vehículo');
    }
  }

  /**
   * Inicializa FX snapshot, risk snapshot y pricing
   */
  private async initializeSnapshots(): Promise<void> {
    try {
      // 1. FX Snapshot
      await this.loadFxSnapshot();

      // 2. Risk Snapshot
      await this.calculateRiskSnapshot();

      // 3. Pricing
      await this.calculatePricing();

      // Guardar estado en sessionStorage para recuperación
      this.saveStateToSession();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      let detailedError = 'Error al inicializar cálculos de reserva: ' + message;

      // Add diagnostic information
      if (!this.fxSnapshot()) {
        detailedError += ' (No se pudo obtener el tipo de cambio)';
      } else if (!this.riskSnapshot()) {
        detailedError += ' (No se pudo calcular el análisis de riesgo)';
      } else if (!this.priceBreakdown()) {
        detailedError += ' (No se pudo calcular el precio final)';
      }

      console.error('Initialization error:', err);
      this.error.set(detailedError);
    }
  }

  /**
   * Carga el FX snapshot actual
   */
  private async loadFxSnapshot(): Promise<void> {
    this.loadingFx.set(true);
    try {
      // Add timeout to prevent hanging forever (10 seconds)
      const fxPromise = firstValueFrom(this.fxService.getFxSnapshot('USD', 'ARS'));
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout obteniendo tipo de cambio')), 10000);
      });

      const snapshot = await Promise.race([fxPromise, timeoutPromise]);
      if (!snapshot) {
        throw new Error('No se pudo obtener tipo de cambio');
      }
      this.fxSnapshot.set(snapshot);
    } catch (err: unknown) {
      throw err;
    } finally {
      this.loadingFx.set(false);
    }
  }

  /**
   * Calcula el risk snapshot
   * ✅ NEW: Pasa distanceKm para aplicar lógica MAYOR en garantías
   */
  private async calculateRiskSnapshot(): Promise<void> {
    const input = this.bookingInput();
    const fx = this.fxSnapshot();

    if (!input || !fx) return;

    this.loadingRisk.set(true);
    try {
      // ✅ NEW: Get distance for distance-based guarantee calculation
      const distanceKm = this.distanceKm();

      const snapshot = await this.riskService.calculateRiskSnapshot({
        vehicleValueUsd: input.vehicleValueUsd,
        bucket: input.bucket,
        country: input.country,
        fxRate: fx.rate,
        coverageUpgrade: this.coverageUpgrade(),
        distanceKm, // ✅ NEW: Pass distance to apply MAYOR logic
      });

      this.riskSnapshot.set(snapshot);
    } catch (err: unknown) {
      throw err;
    } finally {
      this.loadingRisk.set(false);
    }
  }

  /**
   * Calcula el desglose de precios
   */
  private async calculatePricing(): Promise<void> {
    const input = this.bookingInput();
    const dates = this.bookingDates();
    const fx = this.fxSnapshot();
    const carData = this.car();

    if (!input || !dates || !fx || !carData) return;

    this.loadingPricing.set(true);
    try {
      const rawCurrency = (carData.currency ?? 'USD').toUpperCase();
      const rawDailyRate = Number(carData.price_per_day ?? 0);
      const computedDailyRateUsd =
        rawCurrency === 'ARS' ? this.fxService.convertReverse(rawDailyRate, fx) : rawDailyRate;
      const dailyRateUsd =
        Number.isFinite(computedDailyRateUsd) && computedDailyRateUsd > 0
          ? computedDailyRateUsd
          : 50;

      const subtotalUsd = dailyRateUsd * dates.totalDays;

      // FGO contribution (15% del subtotal)
      const fgoContributionUsd = subtotalUsd * 0.15;

      // Platform fee (5%)
      const platformFeeUsd = subtotalUsd * 0.05;

      // Insurance fee (ya incluido, ponemos 0)
      const insuranceFeeUsd = 0;

      // Coverage upgrade cost
      const coverageUpgradeUsd = calculateCoverageUpgradeCost(this.coverageUpgrade(), subtotalUsd);

      // ✅ NEW: Delivery fee based on distance
      const deliveryFeeCents = this.deliveryFeeCents();
      const deliveryFeeUsd = deliveryFeeCents > 0 ? this.fxService.convertReverse(deliveryFeeCents / 100, fx) : 0;

      // Total USD
      const totalUsd =
        subtotalUsd + fgoContributionUsd + platformFeeUsd + insuranceFeeUsd + coverageUpgradeUsd + deliveryFeeUsd;

      // Total ARS
      const totalArs = this.fxService.convert(totalUsd, fx);

      const breakdown: PriceBreakdown = {
        dailyRateUsd,
        totalDays: dates.totalDays,
        subtotalUsd,
        fgoContributionUsd,
        platformFeeUsd,
        insuranceFeeUsd,
        coverageUpgradeUsd,
        deliveryFeeUsd: deliveryFeeUsd > 0 ? deliveryFeeUsd : undefined,
        distanceKm: this.distanceKm(),
        distanceTier: this.distanceTier(),
        totalUsd,
        totalArs,
        fxRate: fx.rate,
      };

      this.priceBreakdown.set(breakdown);
    } finally {
      this.loadingPricing.set(false);
    }
  }

  // ==================== HANDLERS ====================

  /**
   * Handler: Cambio de modalidad de pago
   */
  protected onPaymentModeChange(mode: PaymentMode): void {
    this.paymentMode.set(mode);

    // Reset autorizaciones del modo anterior
    if (mode === 'card') {
      this.walletLock.set(null);
    } else {
      this.paymentAuthorization.set(null);
    }
  }

  /**
   * Handler: Cambio de upgrade de cobertura
   */
  protected onCoverageUpgradeChange(upgrade: CoverageUpgrade): void {
    this.coverageUpgrade.set(upgrade);
    // El effect se encarga de recalcular risk + pricing
  }

  /**
   * Handler: Comparar métodos de pago
   */
  protected onCompareMethodsClick(): void {
    this.showComparisonModal.set(true);
  }

  /**
   * Handler: Cerrar modal de comparación
   */
  protected onCloseComparisonModal(): void {
    this.showComparisonModal.set(false);
  }

  /**
   * Retorna el costo del upgrade de cobertura en ARS
   * Se basa en el breakdown actual; fallback: calcula con helper en USD
   */
  getCoverageUpgradeCost(): number {
    const breakdown = this.priceBreakdown();
    if (!breakdown) {
      return 0;
    }

    const coverageUsd =
      breakdown.coverageUpgradeUsd ??
      calculateCoverageUpgradeCost(this.coverageUpgrade(), breakdown.subtotalUsd);

    const fx = this.fxSnapshot();
    if (!fx) {
      return Math.round(coverageUsd);
    }

    const coverageArs = this.fxService.convert(coverageUsd, fx);
    return Math.round(coverageArs);
  }

  /**
   * Handler: Cambio de consentimientos
   */
  protected onConsentsChange(consents: UserConsents): void {
    this.consents.set(consents);
  }

  /**
   * Handler: Cambio de autorización de pago (card)
   */
  protected onAuthorizationChange(auth: PaymentAuthorization | null): void {
    this.paymentAuthorization.set(auth);
  }

  /**
   * Handler: Cambio de lock de wallet
   */
  protected onWalletLockChange(lock: WalletLock | null): void {
    this.walletLock.set(lock);
  }

  /**
   * Handler: Fallback a wallet desde card
   * ✅ MEJORA: Ahora muestra mensaje explicativo al usuario
   */
  protected onFallbackToWallet(reason?: string): void {
    // Establecer razón del fallback
    this.fallbackReason.set(reason || 'La pre-autorización con tu tarjeta fue rechazada');

    // Mostrar mensaje explicativo
    this.showFallbackMessage.set(true);

    // Cambiar modo de pago a wallet
    this.paymentMode.set('wallet');

    // Ocultar mensaje después de 8 segundos
    setTimeout(() => {
      this.showFallbackMessage.set(false);
    }, 8000);
  }

  /**
   * Handler: Confirmar y crear booking
   */
  /**
   * Retry initialization of snapshots and data
   */
  protected async retryInitialization(): Promise<void> {
    this.error.set(null);
    await this.initializeSnapshots();
  }

  protected async onConfirm(): Promise<void> {
    if (!this.canProceed()) {
      // Mostrar errores de validación
      const errors = this.collectValidationErrors();
      this.validationErrors.set(errors);
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.validationErrors.set([]);

    try {
      const existingBookingId = this.existingBookingId;

      if (existingBookingId) {
        // FLUJO UPDATE: Booking existente desde /bookings
        await this.updateExistingBooking(existingBookingId);
      } else {
        // FLUJO CREATE: Nueva reserva desde car-detail
        await this.createNewBooking();
      }
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Error al confirmar reserva');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * ✅ FIX CRÍTICO: Actualiza un booking existente y procesa pago inmediatamente
   * ANTES: Redirigía a /bookings/checkout (flujo de dos pasos)
   * AHORA: Procesa el pago final en la misma página (flujo consolidado)
   */
  private async updateExistingBooking(bookingId: string): Promise<void> {
    // 1. Persistir risk snapshot con booking_id real
    const riskSnapshotResult = await this.persistRiskSnapshot(bookingId);
    if (!riskSnapshotResult.ok || !riskSnapshotResult.snapshotId) {
      throw new Error(riskSnapshotResult.error || 'Error al guardar risk snapshot');
    }

    // 2. Actualizar booking con payment_mode y autorizaciones
    const { error } = await this.supabaseClient
      .from('bookings')
      .update({
        payment_mode: this.paymentMode(),
        coverage_upgrade: this.coverageUpgrade(),
        authorized_payment_id: this.paymentAuthorization()?.authorizedPaymentId,
        wallet_lock_id: this.walletLock()?.lockId,
        risk_snapshot_booking_id: bookingId, // FIXED: Column is risk_snapshot_booking_id, not risk_snapshot_id
        risk_snapshot_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (error) throw error;

    // 3. Limpiar sessionStorage si existe
    sessionStorage.removeItem('booking_detail_input');

    // ✅ NUEVO: Procesar pago inmediatamente en lugar de redirigir a checkout
    await this.processFinalPayment(bookingId);
  }

  /**
   * NUEVO: Crea un nuevo booking (flujo original)
   */
  /**
   * ✅ FIX CRÍTICO: Crear booking usando función atómica
   * ANTES: Múltiples pasos no transaccionales → riesgo de reservas fantasma
   * AHORA: Una sola transacción atómica en la base de datos
   */
  private async createNewBooking(): Promise<void> {
    const input = this.bookingInput();
    const pricing = this.priceBreakdown();
    const risk = this.riskSnapshot();
    const userId = this.userId();

    if (!input || !pricing || !risk || !userId) {
      throw new Error('Faltan datos para crear reserva');
    }

    // Llamar a la función RPC atómica que hace todo en una transacción
    const result = await this.bookingsService.createBookingAtomic({
      carId: input.carId,
      startDate: input.startDate.toISOString(),
      endDate: input.endDate.toISOString(),
      totalAmount: pricing.totalArs,
      currency: 'ARS',
      paymentMode: this.paymentMode(),
      coverageUpgrade: this.mapCoverageUpgrade(this.coverageUpgrade()),
      authorizedPaymentId: this.paymentAuthorization()?.authorizedPaymentId,
      walletLockId: this.walletLock()?.lockId,
      riskSnapshot: {
        dailyPriceUsd: pricing.totalUsd / (calculateTotalDays(input.startDate, input.endDate) || 1),
        securityDepositUsd: risk.creditSecurityUsd,
        vehicleValueUsd: risk.vehicleValueUsd,
        driverAge: 30, // TODO: Obtener edad real del usuario
        coverageType: risk.coverageUpgrade || 'standard',
        paymentMode: this.paymentMode(),
        totalUsd: pricing.totalUsd,
        totalArs: pricing.totalArs,
        exchangeRate: risk.fxRate,
      },
    });

    if (!result.success || !result.bookingId) {
      throw new Error(result.error || 'Error al crear reserva');
    }

    // ✅ NUEVO: Guardar booking ID para procesamiento de pago
    this.lastCreatedBookingId.set(result.bookingId);
    
    // ✅ Guardar booking ID en sessionStorage para redirect de MercadoPago
    sessionStorage.setItem('pending_booking_id', result.bookingId);

    // Limpiar sessionStorage
    sessionStorage.removeItem('booking_detail_input');

    // ✅ NUEVO: Procesar pago inmediatamente en lugar de navegar
    await this.processFinalPayment(result.bookingId);
  }

  // ==================== HELPERS ====================

  /**
   * Persiste el risk snapshot en DB
   */
  private async persistRiskSnapshot(
    bookingId: string,
  ): Promise<{ ok: boolean; snapshotId?: string; error?: string }> {
    const risk = this.riskSnapshot();
    const input = this.bookingInput();

    if (!risk || !input) {
      return { ok: false, error: 'Faltan datos de riesgo o booking' };
    }

    return firstValueFrom(
      this.riskService.persistRiskSnapshot(bookingId, risk, this.paymentMode()),
    );
  }

  /**
   * Crea el booking en DB con validación de disponibilidad
   * ✅ SPRINT 2 INTEGRATION: Usa BookingsService.createBookingWithValidation()
   */
  private async createBooking(): Promise<CreateBookingResult> {
    const input = this.bookingInput();
    const pricing = this.priceBreakdown();
    const userId = this.userId();

    if (!input || !pricing || !userId) {
      return { ok: false, error: 'Faltan datos para crear reserva' };
    }

    try {
      // ✅ Usar método con validación de disponibilidad
      const result = await this.bookingsService.createBookingWithValidation(
        input.carId,
        input.startDate.toISOString(),
        input.endDate.toISOString(),
      );

      if (!result.success || !result.booking?.id) {
        return {
          ok: false,
          error: result.error || 'Error desconocido al crear reserva',
        };
      }

      // ✅ Paso 2: Actualizar la reserva con los detalles del pago
      try {
        await this.bookingsService.updateBooking(result.booking.id, {
          total_amount: pricing.totalArs, // Corregido a snake_case
          currency: 'ARS',
          payment_mode: this.paymentMode(), // Corregido a snake_case
          coverage_upgrade: this.mapCoverageUpgrade(this.coverageUpgrade()), // Corregido a snake_case y tipo
          authorized_payment_id: this.paymentAuthorization()?.authorizedPaymentId, // Corregido a snake_case
          wallet_lock_id: this.walletLock()?.lockId, // Corregido a snake_case
          status: 'pending',
        });
      } catch (updateError: unknown) {
        const errorMessage =
          updateError instanceof Error
            ? updateError.message
            : 'Error desconocido al actualizar la reserva';
        // Opcional: Considerar cancelar la reserva si la actualización falla
        return {
          ok: false,
          error: `La reserva se creó pero no se pudo actualizar: ${errorMessage}`,
        };
      }

      return {
        ok: true,
        bookingId: result.booking!.id,
      };
    } catch (err: unknown) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Error desconocido',
      };
    }
  }

  /**
   * Actualiza el booking con el risk_snapshot_booking_id
   */
  private async updateBookingRiskSnapshot(
    bookingId: string,
    _riskSnapshotId: string,
  ): Promise<void> {
    const { error } = await this.supabaseClient
      .from('bookings')
      .update({
        risk_snapshot_booking_id: bookingId, // FIXED: Column is risk_snapshot_booking_id
        risk_snapshot_date: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (error) {
      throw new Error('Error al actualizar risk snapshot');
    }
  }

  /**
   * Recolecta errores de validación
   */
  private collectValidationErrors(): ValidationError[] {
    const errors: ValidationError[] = [];

    // Consentimientos
    errors.push(...validateConsents(this.consents(), this.paymentMode()));

    // Autorización (card)
    if (this.paymentMode() === 'card') {
      errors.push(...validatePaymentAuthorization(this.paymentAuthorization()));
    }

    // Wallet lock
    if (this.paymentMode() === 'wallet') {
      const lock = this.walletLock();
      if (!lock || lock.status !== 'locked') {
        errors.push({
          field: 'walletLock',
          message: 'Debes bloquear el Crédito de Seguridad antes de continuar',
          code: 'WALLET_NOT_LOCKED',
        });
      }
    }

    return errors;
  }

  /**
   * Guarda estado en sessionStorage
   */
  private saveStateToSession(): void {
    const state = {
      bookingInput: this.bookingInput(),
      fxSnapshot: this.fxSnapshot(),
      riskSnapshot: this.riskSnapshot(),
      priceBreakdown: this.priceBreakdown(),
      paymentMode: this.paymentMode(),
      coverageUpgrade: this.coverageUpgrade(),
    };
    sessionStorage.setItem('booking_detail_state', JSON.stringify(state));
  }

  // Expose formatters to template
  formatUsd = formatUsd;
  formatArs = formatArs;

  // ==================== PROCESAMIENTO DE PAGO FINAL ====================

  /**
   * ✅ NUEVO: Procesa el pago final inmediatamente después de crear el booking
   * Consolida la lógica que estaba en checkout.page.ts
   */
  private async processFinalPayment(bookingId: string): Promise<void> {
    this.processingFinalPayment.set(true);

    try {
      // Obtener el booking recién creado
      const booking = await this.bookingsService.getBookingById(bookingId);
      if (!booking) {
        throw new Error('Booking no encontrado');
      }

      const method = this.paymentMode();

      // Procesar según el método
      if (method === 'wallet') {
        await this.processWalletPayment(booking);
      } else {
        await this.processCreditCardPayment(booking);
      }
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'Error al procesar el pago');
      this.processingFinalPayment.set(false);
      // No redirigir, dejar al usuario en la página para reintentar
    }
  }

  /**
   * ✅ NUEVO: Procesa pago con wallet
   * Lógica consolidada de checkout-payment.service.ts -> payWithWallet()
   */
  private async processWalletPayment(booking: Booking): Promise<void> {
    const bookingId = booking.id;
    const rentalAmount = booking.total_amount || 0;
    const riskSnap = this.riskSnapshot();
    const depositUsd = riskSnap?.creditSecurityUsd || 0;

    try {
      // Bloquear fondos en wallet
      const lock = await firstValueFrom(
        this.walletService.lockRentalAndDeposit(bookingId, rentalAmount, depositUsd),
      );

      if (!lock.success) {
        throw new Error(lock.message ?? 'No se pudo bloquear fondos en wallet');
      }

      // Actualizar booking a confirmado
      await this.bookingsService.updateBooking(bookingId, {
        payment_method: 'wallet',
        rental_amount_cents: Math.round(rentalAmount * 100),
        deposit_amount_cents: Math.round(depositUsd * 100),
        rental_lock_transaction_id: lock.rental_lock_transaction_id,
        deposit_lock_transaction_id: lock.deposit_lock_transaction_id,
        deposit_status: 'locked',
        status: 'confirmed',
      });

      // Recalcular pricing
      await this.bookingsService.recalculatePricing(bookingId);

      // Redirigir a página de éxito
      this.router.navigate(['/bookings/success', bookingId]);
    } catch (error: unknown) {
      // Intentar desbloquear wallet si hubo error
      try {
        await firstValueFrom(this.walletService.unlockFunds(bookingId));
      } catch (unlockError) {}
      throw error;
    }
  }

  /**
   * ✅ NUEVO: Procesa pago con tarjeta (MercadoPago)
   * Lógica consolidada de checkout-payment.service.ts -> payWithCreditCard()
   */
  private async processCreditCardPayment(booking: Booking): Promise<void> {
    const bookingId = booking.id;
    const riskSnap = this.riskSnapshot();
    const depositUsd = riskSnap?.creditSecurityUsd || 0;

    try {
      // Crear intención de pago
      const intent = await this.paymentsService.createIntent(bookingId);

      // Actualizar booking con método de pago
      await this.bookingsService.updateBooking(bookingId, {
        payment_method: 'credit_card',
        wallet_amount_cents: 0,
        deposit_amount_cents: Math.round(depositUsd * 100),
      });

      // Recalcular pricing
      await this.bookingsService.recalculatePricing(bookingId);

      // Crear preferencia de MercadoPago
      const preference = await this.createPreferenceWithOnboardingGuard(bookingId);

      // Redirigir a MercadoPago
      if (preference.initPoint) {
        window.location.href = preference.initPoint;
      } else {
        throw new Error('No se pudo crear preferencia de pago');
      }
    } catch (error: unknown) {
      throw error;
    }
  }

  private async createPreferenceWithOnboardingGuard(
    bookingId: string,
  ): Promise<MercadoPagoPreferenceResponse> {
    try {
      return await this.mpGateway.createPreference(bookingId);
    } catch (error) {
      if (this.isOwnerOnboardingError(error)) {
        const message =
          (error as Error).message ||
          'El propietario todavía no completó la vinculación de Mercado Pago. Tu reserva permanecerá pendiente.';
        this.error.set(message);
        this.processingFinalPayment.set(false);
      }

      throw error instanceof Error
        ? error
        : new Error('No pudimos crear la preferencia de Mercado Pago.');
    }
  }

  private isOwnerOnboardingError(error: unknown): error is Error & { code?: string } {
    return (
      !!error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'OWNER_ONBOARDING_REQUIRED'
    );
  }

  // ============================================
  // CONVERSIÓN OPTIMIZADA
  // ============================================

  /**
   * Controla si mostrar vista optimizada para mejor conversión
   */
  readonly showOptimizedView = computed(() => this.conversionMode() === 'optimized');

  /**
   * Cambia entre vista estándar y optimizada
   */
  toggleConversionMode(): void {
    this.conversionMode.update(mode => mode === 'optimized' ? 'standard' : 'optimized');
  }

  /**
   * Obtiene URL de foto del auto (para vista optimizada)
   */
  getCarPhotoUrl(): string {
    const car = this.car();
    if (!car) return '/assets/placeholder-car.jpg';

    const photos = car.photos || (car as any).car_photos;
    if (photos && photos.length > 0 && photos[0].url) {
      return photos[0].url;
    }

    // Placeholder si no hay fotos
    return '/assets/placeholder-car.jpg';
  }

  /**
   * Calcula total simplificado (sin breakdown detallado)
   */
  readonly simplifiedTotal = computed(() => {
    const breakdown = this.priceBreakdown();
    if (!breakdown) return 0;

    return breakdown.totalArs;
  });

  /**
   * Mensaje de confianza para conversión
   */
  readonly trustMessage = computed(() => {
    const car = this.car();
    const rating = car?.rating_avg || 0;
    const reviews = car?.rating_count || 0;

    if (rating >= 4.5 && reviews >= 10) {
      return '⭐ Auto muy bien evaluado por otros usuarios';
    } else if (rating >= 4.0) {
      return '👍 Auto bien evaluado';
    } else if (reviews >= 5) {
      return '✅ Auto con evaluaciones verificadas';
    } else {
      return '🔒 Reserva protegida con franquicia';
    }
  });
}

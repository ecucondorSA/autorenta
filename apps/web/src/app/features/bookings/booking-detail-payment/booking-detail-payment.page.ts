import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  effect,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';

// Services
import { FxService } from '../../../core/services/fx.service';
import { RiskService } from '../../../core/services/risk.service';
import { PaymentAuthorizationService } from '../../../core/services/payment-authorization.service';
import { WalletService } from '../../../core/services/wallet.service';
import { SupabaseClientService } from '../../../core/services/supabase-client.service';
import { AuthService } from '../../../core/services/auth.service';
import { BookingsService } from '../../../core/services/bookings.service';

// Models
import {
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
  generateIdempotencyKey,
  calculateTotalDays,
  getCoverageUpgradeCost,
  validateConsents,
  validatePaymentAuthorization,
  formatUsd,
  formatArs,
} from '../../../core/models/booking-detail-payment.model';

// Components
import { BookingSummaryCardComponent } from './components/booking-summary-card.component';
import { RiskPolicyTableComponent } from './components/risk-policy-table.component';
import { PaymentModeToggleComponent } from './components/payment-mode-toggle.component';
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
    BookingSummaryCardComponent,
    RiskPolicyTableComponent,
    PaymentModeToggleComponent,
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
  readonly car = signal<any>(null); // TODO: Tipear con Car interface

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
  readonly error = signal<string | null>(null);
  readonly validationErrors = signal<ValidationError[]>([]);

  // User
  readonly userId = signal<string | null>(null);

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

      const newRisk = this.riskService.recalculateWithUpgrade(currentRisk, upgrade);
      this.riskSnapshot.set(newRisk);

      // Recalcular pricing también
      this.calculatePricing();
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

    // 4. Inicializar snapshots
    await this.initializeSnapshots();
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
      } catch (e) {
        console.error('Error parsing stored booking input:', e);
      }
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
      bucket: (bucket as any) || 'standard',
      vehicleValueUsd: vehicleValueUsd ? parseInt(vehicleValueUsd, 10) : 15000,
      country: (country as any) || 'AR',
    });

    // Guardar en sessionStorage para navegación futura
    sessionStorage.setItem('booking_detail_input', JSON.stringify({
      carId,
      startDate,
      endDate,
      bucket: bucket || 'standard',
      vehicleValueUsd: vehicleValueUsd ? parseInt(vehicleValueUsd, 10) : 15000,
      country: country || 'AR',
    }));
  }

  /**
   * NUEVO: Carga un booking existente desde la DB
   */
  private async loadExistingBooking(bookingId: string): Promise<void> {
    try {
      const { data, error } = await this.supabaseClient
        .from('bookings')
        .select(`
          *,
          car:cars(*)
        `)
        .eq('id', bookingId)
        .single();

      if (error) throw error;
      if (!data) {
        this.error.set('Booking no encontrado');
        return;
      }

      // Reconstruir bookingInput desde el booking
      this.bookingInput.set({
        carId: data.car_id,
        startDate: new Date(data.start_at),
        endDate: new Date(data.end_at),
        bucket: data.car?.bucket || 'standard',
        vehicleValueUsd: data.car?.value_usd || 15000,
        country: 'AR',
      });

      // Pre-cargar info del auto
      if (data.car) {
        this.car.set(data.car);
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
      (this as any).existingBookingId = bookingId;

      console.log('[Detalle & Pago] Booking existente cargado:', bookingId);
    } catch (err: any) {
      console.error('Error loading existing booking:', err);
      this.error.set('Error al cargar el booking: ' + err.message);
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

      this.car.set(data);

      // Actualizar bookingInput con datos reales del auto (si vinieron en query params, ya están seteados)
      // No sobrescribimos porque bucket y value_usd ya vienen calculados de car-detail.page.ts
      // this.bookingInput.update() - No es necesario, ya tenemos los valores correctos
    } catch (err: any) {
      console.error('Error loading car:', err);
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
    } catch (err: any) {
      console.error('Error initializing snapshots:', err);
      this.error.set('Error al inicializar cálculos de reserva');
    }
  }

  /**
   * Carga el FX snapshot actual
   */
  private async loadFxSnapshot(): Promise<void> {
    this.loadingFx.set(true);
    try {
      const snapshot = await firstValueFrom(this.fxService.getFxSnapshot('USD', 'ARS'));
      if (!snapshot) {
        throw new Error('No se pudo obtener tipo de cambio');
      }
      this.fxSnapshot.set(snapshot);
    } catch (err: any) {
      console.error('Error loading FX snapshot:', err);
      throw err;
    } finally {
      this.loadingFx.set(false);
    }
  }

  /**
   * Calcula el risk snapshot
   */
  private async calculateRiskSnapshot(): Promise<void> {
    const input = this.bookingInput();
    const fx = this.fxSnapshot();

    if (!input || !fx) return;

    this.loadingRisk.set(true);
    try {
      const snapshot = this.riskService.calculateRiskSnapshot({
        vehicleValueUsd: input.vehicleValueUsd,
        bucket: input.bucket,
        country: input.country,
        fxRate: fx.rate,
        coverageUpgrade: this.coverageUpgrade(),
      });

      this.riskSnapshot.set(snapshot);
    } catch (err: any) {
      console.error('Error calculating risk snapshot:', err);
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
      // Convert price to USD if it's in ARS
      let dailyRateUsd = carData.price_per_day || 50;
      if (carData.currency === 'ARS') {
        dailyRateUsd = carData.price_per_day / fx.rate; // Convert ARS to USD using FX rate
      }

      const subtotalUsd = dailyRateUsd * dates.totalDays;

      // FGO contribution (15% del subtotal)
      const fgoContributionUsd = subtotalUsd * 0.15;

      // Platform fee (5%)
      const platformFeeUsd = subtotalUsd * 0.05;

      // Insurance fee (ya incluido, ponemos 0)
      const insuranceFeeUsd = 0;

      // Coverage upgrade cost
      const coverageUpgradeUsd = getCoverageUpgradeCost(this.coverageUpgrade(), subtotalUsd);

      // Total USD
      const totalUsd =
        subtotalUsd + fgoContributionUsd + platformFeeUsd + insuranceFeeUsd + coverageUpgradeUsd;

      // Total ARS
      const totalArs = totalUsd * fx.rate;

      const breakdown: PriceBreakdown = {
        dailyRateUsd,
        totalDays: dates.totalDays,
        subtotalUsd,
        fgoContributionUsd,
        platformFeeUsd,
        insuranceFeeUsd,
        coverageUpgradeUsd,
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
   */
  protected onFallbackToWallet(): void {
    this.paymentMode.set('wallet');
  }

  /**
   * Handler: Confirmar y crear booking
   */
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
      const existingBookingId = (this as any).existingBookingId;

      if (existingBookingId) {
        // FLUJO UPDATE: Booking existente desde /bookings
        await this.updateExistingBooking(existingBookingId);
      } else {
        // FLUJO CREATE: Nueva reserva desde car-detail
        await this.createNewBooking();
      }
    } catch (err: any) {
      console.error('Error confirming booking:', err);
      this.error.set(err.message || 'Error al confirmar reserva');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * NUEVO: Actualiza un booking existente con payment_mode y autorizaciones
   */
  private async updateExistingBooking(bookingId: string): Promise<void> {
    console.log('[Detalle & Pago] Actualizando booking existente:', bookingId);

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

    console.log('[Detalle & Pago] Booking actualizado, redirigiendo a checkout');

    // 3. Limpiar sessionStorage si existe
    sessionStorage.removeItem('booking_detail_input');

    // 4. Redirigir a checkout
    this.router.navigate(['/bookings/checkout', bookingId]);
  }

  /**
   * NUEVO: Crea un nuevo booking (flujo original)
   */
  private async createNewBooking(): Promise<void> {
    console.log('[Detalle & Pago] Creando nuevo booking');

    // 1. Crear booking primero (sin risk_snapshot_id)
    const bookingResult = await this.createBooking();
    if (!bookingResult.ok || !bookingResult.bookingId) {
      throw new Error(bookingResult.error || 'Error al crear reserva');
    }

    // 2. Persistir risk snapshot con booking_id real
    const riskSnapshotResult = await this.persistRiskSnapshot(bookingResult.bookingId);
    if (!riskSnapshotResult.ok || !riskSnapshotResult.snapshotId) {
      throw new Error(riskSnapshotResult.error || 'Error al guardar risk snapshot');
    }

    // 3. Actualizar booking con risk_snapshot_id
    await this.updateBookingRiskSnapshot(bookingResult.bookingId, riskSnapshotResult.snapshotId);

    // 4. Limpiar sessionStorage
    sessionStorage.removeItem('booking_detail_input');

    // 5. Navegar a checkout
    this.router.navigate(['/bookings/checkout', bookingResult.bookingId]);
  }

  // ==================== HELPERS ====================

  /**
   * Persiste el risk snapshot en DB
   */
  private async persistRiskSnapshot(bookingId: string): Promise<{ ok: boolean; snapshotId?: string; error?: string }> {
    const risk = this.riskSnapshot();
    const input = this.bookingInput();

    if (!risk || !input) {
      return { ok: false, error: 'Faltan datos de riesgo o booking' };
    }

    return firstValueFrom(
      this.riskService.persistRiskSnapshot(bookingId, risk, this.paymentMode())
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
        {
          renterId: userId,
          totalAmount: pricing.totalArs,
          currency: 'ARS',
          totalPriceArs: pricing.totalArs,
          paymentMode: this.paymentMode(),
          coverageUpgrade: this.coverageUpgrade(),
          authorizedPaymentId: this.paymentAuthorization()?.authorizedPaymentId,
          walletLockId: this.walletLock()?.lockId,
          status: 'pending',
          idempotencyKey: generateIdempotencyKey(),
        }
      );

      if (!result.success) {
        console.error('❌ Error creando reserva:', result.error);
        return {
          ok: false,
          error: result.error || 'Error desconocido al crear reserva'
        };
      }

      console.log('✅ Reserva creada con validación:', result.booking?.id);
      return {
        ok: true,
        bookingId: result.booking!.id,
      };
    } catch (err: any) {
      console.error('❌ Excepción en createBooking:', err);
      return {
        ok: false,
        error: err.message || 'Error desconocido',
      };
    }
  }

  /**
   * Actualiza el booking con el risk_snapshot_booking_id
   */
  private async updateBookingRiskSnapshot(bookingId: string, riskSnapshotId: string): Promise<void> {
    const { error } = await this.supabaseClient
      .from('bookings')
      .update({ 
        risk_snapshot_booking_id: bookingId, // FIXED: Column is risk_snapshot_booking_id
        risk_snapshot_date: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (error) {
      console.error('Error updating booking risk snapshot:', error);
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
}

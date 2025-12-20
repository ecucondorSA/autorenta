import { CommonModule } from '@angular/common';
import {Component, OnDestroy, OnInit, computed, inject, signal,
  ChangeDetectionStrategy} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { Booking, BookingExtensionRequest } from '../../../core/models';
import { TrafficInfraction } from '../../admin/traffic-infractions/admin-traffic-infractions.page'; // NEW
import { BookingInspection } from '../../../core/models/fgo-v1-1.model';
import { CLAIM_STATUS_LABELS, InsuranceClaim } from '../../../core/models/insurance.model';
import { AuthService } from '../../../core/services/auth.service';
import {
  BookingConfirmationService,
  ConfirmAndReleaseResponse,
} from '../../../core/services/booking-confirmation.service';
import { BookingsService } from '../../../core/services/bookings.service';
import { ExchangeRateService } from '../../../core/services/exchange-rate.service';
import { FgoV1_1Service } from '../../../core/services/fgo-v1-1.service';
import { InsuranceService } from '../../../core/services/insurance.service';
import { MetaService } from '../../../core/services/meta.service';
import { PaymentsService } from '../../../core/services/payments.service';
import { ReviewsService } from '../../../core/services/reviews.service';
import { LoggerService } from '../../../core/services/logger.service';
import { TrafficInfractionsService } from '../../../core/services/traffic-infractions.service'; // NEW
import { BookingChatComponent } from '../../../shared/components/booking-chat/booking-chat.component';
import { BookingConfirmationTimelineComponent } from '../../../shared/components/booking-confirmation-timeline/booking-confirmation-timeline.component';
import { BookingContractComponent } from '../../../shared/components/booking-contract/booking-contract.component';
import { DepositStatusBadgeComponent } from '../../../shared/components/deposit-status-badge/deposit-status-badge.component';
import { DisputeFormComponent } from '../../../shared/components/dispute-form/dispute-form.component';
import { DisputesListComponent } from '../../../shared/components/disputes-list/disputes-list.component';
import { OwnerConfirmationComponent } from '../../../shared/components/owner-confirmation/owner-confirmation.component';
import { RefundRequestComponent } from '../../../shared/components/refund-request/refund-request.component';
import { RefundStatusComponent } from '../../../shared/components/refund-status/refund-status.component';
import { RenterConfirmationComponent } from '../../../shared/components/renter-confirmation/renter-confirmation.component';
import { BookingOpsTimelineComponent } from '../../../shared/components/booking-ops-timeline/booking-ops-timeline.component';
import { BookingTrackingComponent } from '../../../shared/components/booking-tracking/booking-tracking.component';
import { BookingPricingBreakdownComponent } from '../../../shared/components/booking-pricing-breakdown/booking-pricing-breakdown.component';
import { BookingInsuranceSummaryComponent } from '../../../shared/components/booking-insurance-summary/booking-insurance-summary.component';
import { SettlementSimulatorComponent } from '../../../shared/components/settlement-simulator/settlement-simulator.component';
import { DamageComparisonComponent } from '../../../shared/components/damage-comparison/damage-comparison.component';
import {
  BookingCancellationRow,
  BookingConfirmationRow,
  BookingInsuranceRow,
  BookingOpsService,
  BookingPaymentRow,
  BookingPricingRow,
} from '../../../core/services/booking-ops.service';
import { ReportTrafficFineComponent } from '../../../shared/components/report-traffic-fine/report-traffic-fine.component'; // NEW
import { ReportOwnerNoShowComponent } from '../../../shared/components/report-owner-no-show/report-owner-no-show.component'; // NEW
import { ReportRenterNoShowComponent } from '../../../shared/components/report-renter-no-show/report-renter-no-show.component'; // NEW
import { AiLegalPanelComponent } from '../../../shared/components/ai-legal-panel/ai-legal-panel.component';
import { AiTripPanelComponent } from '../../../shared/components/ai-trip-panel/ai-trip-panel.component';
import { AiChecklistPanelComponent } from '../../../shared/components/ai-checklist-panel/ai-checklist-panel.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { BookingStatusComponent } from './booking-status.component';
import { ReviewManagementComponent } from './review-management.component';

/**
 * BookingDetailPage
 *
 * This component acts as a container for the booking detail view. It is responsible for:
 * - Fetching the booking data from the server.
 * - Passing the booking data to child components that handle specific aspects of the view.
 * - Handling general page-level concerns like loading and error states.
 *
 * The component has been refactored to delegate responsibilities to smaller, more focused child components:
 * - app-booking-status: Displays the current status of the booking.
 * - app-review-management: Manages the creation and display of reviews.
 */
@Component({
  selector: 'app-booking-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    OwnerConfirmationComponent,
    RenterConfirmationComponent,
    BookingChatComponent,
    TranslateModule,
    BookingStatusComponent,
    ReviewManagementComponent,
    DepositStatusBadgeComponent,
    DisputeFormComponent,
    DisputesListComponent,
    RefundRequestComponent,
    BookingContractComponent,
    RefundStatusComponent,
    BookingConfirmationTimelineComponent,
    BookingOpsTimelineComponent,
    BookingTrackingComponent,
    BookingPricingBreakdownComponent,
    BookingInsuranceSummaryComponent,
    SettlementSimulatorComponent,
    DamageComparisonComponent,
    ReportTrafficFineComponent, // NEW
    ReportOwnerNoShowComponent, // NEW
    ReportRenterNoShowComponent, // NEW
    AiLegalPanelComponent,
    AiTripPanelComponent,
    AiChecklistPanelComponent,
    ErrorStateComponent,
  ],
  templateUrl: './booking-detail.page.html',
  styleUrl: './booking-detail.page.css',
})
export class BookingDetailPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bookingsService = inject(BookingsService);
  private readonly paymentsService = inject(PaymentsService);
  private readonly reviewsService = inject(ReviewsService);
  private readonly authService = inject(AuthService);
  private readonly confirmationService = inject(BookingConfirmationService);
  private readonly alertController = inject(AlertController); // NEW
  private readonly metaService = inject(MetaService);
  private readonly exchangeRateService = inject(ExchangeRateService);
  private readonly fgoService = inject(FgoV1_1Service);
  private readonly insuranceService = inject(InsuranceService);
  private readonly bookingOpsService = inject(BookingOpsService);
  private readonly trafficInfractionsService = inject(TrafficInfractionsService); // NEW
  private readonly logger = inject(LoggerService).createChildLogger('BookingDetailPage');

  booking = signal<Booking | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  timeRemaining = signal<string | null>(null);

  readonly bookingFlowSteps = [
    {
      key: 'pending',
      label: 'Solicitud enviada',
      description: 'Solicitud creada correctamente.',
    },
    {
      key: 'pending_payment',
      label: 'Garantía bloqueada',
      description: 'Fondos reservados en tu wallet.',
    },
    {
      key: 'awaiting_approval',
      label: 'Esperando aprobación',
      description: 'El propietario está revisando tu solicitud.',
    },
    {
      key: 'confirmed',
      label: 'Reserva confirmada',
      description: 'Preparate para coordinar el check-in y la entrega.',
    },
    {
      key: 'in_progress',
      label: 'Check-in y uso',
      description: 'Realizá las inspecciones y disfrutá del viaje.',
    },
    {
      key: 'pending_review',
      label: 'Revisión final',
      description: 'Check-out realizado. Período de 24h para reportar incidentes.',
    },
    {
      key: 'completed',
      label: 'Cierre',
      description: 'Reserva finalizada y fondos liberados.',
    },
  ] as const;

  /**
   * Determines the current step index in the booking flow.
   * For P2P (wallet) bookings: pending status means steps 1-2 are done, waiting at step 3.
   * For traditional bookings: pending status means at step 1, waiting for payment.
   */
  readonly currentBookingStageIndex = computed(() => {
    const booking = this.booking();
    if (!booking) return 0;

    // P2P wallet flow: pending + wallet = already paid, waiting for owner approval
    if (booking.status === 'pending' && booking.payment_mode === 'wallet') {
      return 2; // Step 3: "Esperando aprobación" (0-indexed = 2)
    }

    // Traditional flow or other statuses
    const statusMap: Record<string, number> = {
      'pending': 0,           // Step 1: Solicitud enviada
      'pending_payment': 1,   // Step 2: Garantía bloqueada
      'confirmed': 3,         // Step 4: Reserva confirmada
      'in_progress': 4,       // Step 5: Check-in y uso
      'pending_review': 5,    // Step 6: Revisión final
      'completed': 6,         // Step 7: Cierre
      'disputed': 5,          // Map to pending_review
    };

    const idx = statusMap[booking.status];
    if (idx !== undefined) return idx;

    if (booking.status === 'cancelled' || booking.status === 'expired') {
      return 0; // Cancelled bookings show at start
    }

    // Default fallback
    return this.bookingFlowSteps.length - 1;
  });

  // Exchange rate signals
  exchangeRate = signal<number | null>(null);
  totalInARS = signal<number | null>(null);
  loadingRate = signal(false);

  // FGO signals
  inspections = signal<BookingInspection[]>([]);

  // Claims signals
  bookingClaims = signal<InsuranceClaim[]>([]);
  loadingClaims = signal(false);

  // Pricing / insurance / payment / tracking
  pricing = signal<BookingPricingRow | null>(null);
  insurance = signal<BookingInsuranceRow | null>(null);
  payment = signal<BookingPaymentRow | null>(null);
  tracking = signal<{
    sessionId: string;
    active: boolean;
    started_at: string;
    ended_at?: string | null;
    points: number;
  } | null>(null);
  confirmation = signal<BookingConfirmationRow | null>(null);
  cancellation = signal<BookingCancellationRow | null>(null);

  readonly pricingView = computed(() => {
    const pricing = this.pricing();
    const booking = this.booking();
    if (!pricing) return null;

    return {
      nightlyRate: (pricing.nightly_rate_cents ?? 0) / 100,
      nights: pricing.days_count ?? booking?.days_count ?? 1,
      fees: (pricing.fees_cents ?? 0) / 100,
      discounts: (pricing.discounts_cents ?? 0) / 100,
      insurance: (pricing.insurance_cents ?? 0) / 100,
      total: (pricing.total_cents ?? pricing.subtotal_cents ?? 0) / 100,
      currency: 'ARS' as const,
    };
  });

  readonly insuranceView = computed(() => {
    const insurance = this.insurance();
    if (!insurance) return null;

    return {
      coverageName: insurance.coverage_upgrade || 'Estándar',
      premium: insurance.insurance_premium_total ? insurance.insurance_premium_total / 100 : 0,
      guaranteeType: insurance.guarantee_type || 'hold',
      guaranteeAmount: insurance.guarantee_amount_cents
        ? insurance.guarantee_amount_cents / 100
        : undefined,
      currency: 'ARS' as const,
      notes: null,
    };
  });

  readonly paymentView = computed(() => {
    const payment = this.payment();
    if (!payment) return null;

    const status = payment.wallet_status || payment.deposit_status || 'pendiente';
    const method = payment.payment_method || payment.payment_mode || 'sin método';
    const date = payment.paid_at || payment.wallet_charged_at || null;

    return { status, method, date };
  });

  /**
   * P2P wallet booking pending owner approval
   * When true: show "waiting for approval" UI instead of "pay now" UI
   */
  readonly isPendingOwnerApproval = computed(() => {
    const booking = this.booking();
    if (!booking) return false;
    return booking.status === 'pending' && booking.payment_mode === 'wallet';
  });

  /**
   * Traditional flow: booking needs payment
   * When true: show "Garantizar Reserva" button
   */
  readonly needsPayment = computed(() => {
    const booking = this.booking();
    if (!booking) return false;
    return booking.status === 'pending' && booking.payment_mode !== 'wallet';
  });

  private countdownInterval: number | null = null;

  // Computed properties
  isExpired = computed(() => {
    const booking = this.booking();
    return booking ? this.bookingsService.isExpired(booking) : false;
  });

  showConfirmedActions = computed(() => this.booking()?.status === 'confirmed');

  // Confirmations - show if booking is in "returned" status
  showConfirmationSection = computed(() => {
    const booking = this.booking();
    return (
      booking?.completion_status === 'returned' ||
      booking?.completion_status === 'pending_owner' ||
      booking?.completion_status === 'pending_renter' ||
      booking?.completion_status === 'pending_both' ||
      booking?.completion_status === 'funds_released'
    );
  });

  isOwner = computed(() => {
    const booking = this.booking();
    const currentUser = this.authService.session$()?.user;
    if (!booking || !currentUser) return false;

    // Need to check car owner_id - will load from car data
    return this.carOwnerId() === currentUser.id;
  });

  isRenter = computed(() => {
    const booking = this.booking();
    const currentUser = this.authService.session$()?.user;
    return booking?.renter_id === currentUser?.id;
  });

  // Car owner ID and name (loaded separately)
  carOwnerId = signal<string | null>(null);
  carOwnerName = signal<string>('el anfitrión');

  // 🆕 FGO v1.1: Computed properties para inspecciones
  readonly canUploadInspection = computed(() => {
    const booking = this.booking();
    return booking?.status === 'in_progress' || booking?.status === 'completed';
  });

  readonly hasCheckIn = computed(() => {
    return this.inspections().some((i: BookingInspection) => i.stage === 'check_in' && i.signedAt);
  });

  readonly hasCheckOut = computed(() => {
    return this.inspections().some((i: BookingInspection) => i.stage === 'check_out' && i.signedAt);
  });

  readonly hasClaim = computed(() => {
    return this.bookingClaims().length > 0;
  });

  readonly canReportClaim = computed(() => {
    const booking = this.booking();
    if (!booking || !this.isRenter()) return false;
    // Can report claim during in_progress or completed status
    const validStatus = booking.status === 'in_progress' || booking.status === 'completed';
    // Only allow if no claim already exists for this booking
    return validStatus && !this.hasClaim();
  });

  readonly latestClaim = computed(() => {
    const claims = this.bookingClaims();
    return claims.length > 0 ? claims[0] : null;
  });

  // Disputes and refunds
  showDisputeForm = signal(false);
  showRefundForm = signal(false);
  showReportTrafficFineModal = signal(false); // NEW
  showReportOwnerNoShowModal = signal(false); // NEW

  // NEW: Extension Requests
  pendingExtensionRequests = signal<BookingExtensionRequest[]>([]);
  loadingExtensionRequests = signal(false);

  readonly canCreateDispute = computed(() => {
    const booking = this.booking();
    if (!booking) return false;
    // Can create dispute for active or completed bookings
    return booking.status === 'in_progress' || booking.status === 'completed';
  });

  readonly hasPendingExtensionRequest = computed(() => {
    return this.pendingExtensionRequests().length > 0;
  });

  readonly canReportTrafficFine = computed(() => {
    const booking = this.booking();
    if (!booking || !this.isOwner()) return false;
    // Owner can report a fine if the booking is completed or in_progress
    return booking.status === 'completed' || booking.status === 'in_progress';
  });

  // NEW: Traffic Fines
  trafficFines = signal<TrafficInfraction[]>([]);
  loadingTrafficFines = signal(false);

  readonly hasTrafficFines = computed(() => {
    return this.trafficFines().length > 0;
  });

  readonly canReportOwnerNoShow = computed(() => {
    const booking = this.booking();
    if (!booking || !this.isRenter()) return false;
    // Renter can report owner no-show if booking is confirmed and pickup date is in the past
    const pickupDate = new Date(booking.start_at);
    const now = new Date();
    return booking.status === 'confirmed' && now > pickupDate;
  });

  readonly showReportRenterNoShowModal = signal(false); // NEW
  readonly canReportRenterNoShow = computed(() => {
    const booking = this.booking();
    if (!booking || !this.isOwner()) return false;
    // Owner can report renter no-show if booking is confirmed and pickup date is in the past
    const pickupDate = new Date(booking.start_at);
    const now = new Date();
    return booking.status === 'confirmed' && now > pickupDate;
  });

  readonly canRequestRefund = computed(() => {
    const booking = this.booking();
    if (!booking) return false;
    // Can request refund for completed or cancelled bookings
    return booking.status === 'completed' || booking.status === 'cancelled';
  });

  // ============================================
  // AI ASSISTANT PANELS
  // ============================================
  readonly expandedAiPanel = signal<'legal' | 'trip' | 'checklist' | null>(null);

  /** Toggle AI panel accordion */
  toggleAiPanel(panel: 'legal' | 'trip' | 'checklist'): void {
    this.expandedAiPanel.update(current => current === panel ? null : panel);
  }

  /** Show trip planner only for confirmed/in_progress bookings */
  readonly showTripPlanner = computed(() => {
    const booking = this.booking();
    return booking?.status === 'confirmed' || booking?.status === 'in_progress';
  });

  /** Show checklist panel for check-in/check-out eligibility */
  readonly showChecklistPanel = computed(() => {
    const booking = this.booking();
    if (!booking) return false;
    // Show checklist during confirmed, in_progress, or pending_review
    return (
      booking.status === 'confirmed' ||
      booking.status === 'in_progress' ||
      booking.status === 'pending_review'
    );
  });

  /** Determine checklist inspection type based on booking state */
  readonly checklistInspectionType = computed<'check_in' | 'check_out'>(() => {
    // If already has check-in done, show check-out
    if (this.hasCheckIn()) return 'check_out';
    return 'check_in';
  });

  onDisputeCreated(): void {
    // Reload disputes if needed
    this.showDisputeForm.set(false);
  }

  onRefundRequested(): void {
    // Reload booking to get updated refund status
    const bookingId = this.booking()?.id;
    if (bookingId) {
      this.bookingsService.getBookingById(bookingId).then((updated) => {
        if (updated) {
          this.booking.set(updated);
        }
      });
    }
    this.showRefundForm.set(false);
  }

  // Computed properties para acciones de check-in/check-out
  readonly canPerformCheckIn = computed(() => {
    const booking = this.booking();
    if (!booking || !this.isRenter()) return false;
    const validStatus = booking.status === 'confirmed' || booking.status === 'in_progress';
    return validStatus && !this.hasCheckIn();
  });

  readonly canPerformCheckOut = computed(() => {
    const booking = this.booking();
    if (!booking || !this.isRenter()) return false;
    const validStatus = booking.status === 'in_progress';
    return validStatus && this.hasCheckIn() && !this.hasCheckOut();
  });

  readonly canReportDamage = computed(() => {
    const booking = this.booking();
    if (!booking || !this.isOwner()) return false;
    // Owner can report damage after vehicle return (completed status or returned_at is set)
    const canReport =
      (booking.status === 'completed' || booking.returned_at !== null) &&
      !booking.owner_reported_damages;
    return canReport;
  });

  readonly canExtendBooking = computed(() => {
    const booking = this.booking();
    return this.isRenter() && booking?.status === 'in_progress';
  });

  async extendBooking(): Promise<void> {
    const booking = this.booking();
    if (!booking) return;

    // Simple prompt-based extension request
    const daysStr = prompt('¿Cuántos días adicionales necesitas?', '1');
    if (!daysStr) return;

    const days = parseInt(daysStr, 10);
    if (isNaN(days) || days < 1) {
      alert('Por favor ingresa un número válido de días.');
      return;
    }

    const currentEndDate = new Date(booking.end_at);
    const newEndDate = new Date(currentEndDate);
    newEndDate.setDate(newEndDate.getDate() + days);

    if (!confirm(`¿Confirmas solicitar extender la reserva hasta el ${newEndDate.toLocaleDateString()}? El anfitrión deberá aprobarla.`)) {
      return;
    }

    this.loading.set(true);
    try {
      const result = await this.bookingsService.requestExtension(booking.id, newEndDate);
      if (result.success) {
        alert(`Solicitud de extensión enviada exitosamente por un costo estimado de ${result.additionalCost}. Esperando aprobación del anfitrión.`);
        // Reload booking to show pending extension status
        const updated = await this.bookingsService.getBookingById(booking.id);
        this.booking.set(updated);
        await this.loadPendingExtensionRequests(booking.id);
      } else {
        alert('Error al solicitar extensión: ' + result.error);
      }
    } catch (error) {
      console.error('Error requesting booking extension:', error);
      alert('Ocurrió un error inesperado al solicitar la extensión.');
    } finally {
      this.loading.set(false);
    }
  }

  async approveExtension(requestId: string): Promise<void> {
    const confirmApproval = confirm('¿Confirmas que quieres aprobar esta solicitud de extensión?');
    if (!confirmApproval) return;

    this.loading.set(true);
    try {
      const result = await this.bookingsService.approveExtensionRequest(requestId);
      if (result.success) {
        alert('Solicitud de extensión aprobada y reserva actualizada.');
        // Reload booking and requests to reflect changes
        const updated = await this.bookingsService.getBookingById(this.booking()!.id);
        this.booking.set(updated);
        await this.loadPendingExtensionRequests(this.booking()!.id);
      } else {
        alert('Error al aprobar extensión: ' + result.error);
      }
    } catch (error) {
      console.error('Error approving extension request:', error);
      alert('Ocurrió un error inesperado al aprobar la extensión.');
    } finally {
      this.loading.set(false);
    }
  }

  async rejectExtension(requestId: string): Promise<void> {
    const reason = prompt('¿Por qué rechazas esta solicitud de extensión? (Opcional)');

    const confirmRejection = confirm('¿Confirmas que quieres rechazar esta solicitud de extensión?');
    if (!confirmRejection) return;

    this.loading.set(true);
    try {
      const result = await this.bookingsService.rejectExtensionRequest(requestId, reason || '');
      if (result.success) {
        alert('Solicitud de extensión rechazada.');
        // Reload requests to reflect changes
        await this.loadPendingExtensionRequests(this.booking()!.id);
      } else {
        alert('Error al rechazar extensión: ' + result.error);
      }
    } catch (error) {
      console.error('Error rejecting extension request:', error);
      alert('Ocurrió un error inesperado al rechazar la extensión.');
    } finally {
      this.loading.set(false);
    }
  }

  onTrafficFineReported(fine: TrafficInfraction): void {
    console.log('Traffic fine reported:', fine);
    this.showReportTrafficFineModal.set(false);
    // Reload pending extension requests to ensure the UI is up-to-date.
    // This is a placeholder, ideally we should reload fines or the booking itself if fines affect it
    this.loadPendingExtensionRequests(this.booking()!.id);
    // TODO: Implement loading of fines for display or updating booking status if fines affect it.
  }

  isStepCompleted(index: number): boolean {
    return index < this.currentBookingStageIndex();
  }

  isStepCurrent(index: number): boolean {
    return index === this.currentBookingStageIndex();
  }

  isStepUpcoming(index: number): boolean {
    return index > this.currentBookingStageIndex();
  }

  async ngOnInit() {
    const bookingId = this.route.snapshot.paramMap.get('id');
    if (!bookingId) {
      this.error.set('ID de reserva inválido');
      this.loading.set(false);
      return;
    }

    try {
      const booking = await this.bookingsService.getBookingById(bookingId);
      if (!booking) {
        this.error.set('Reserva no encontrada');
        this.loading.set(false);
        return;
      }

      this.booking.set(booking);
      this.startCountdown();

      // Load pending extension requests
      await this.loadPendingExtensionRequests(booking.id);
      // Load traffic fines
      await this.loadTrafficFines(booking.id); // NEW

      // Update SEO meta tags (private page - noindex)
      this.metaService.updateBookingDetailMeta(booking.id);

      // Load exchange rate for ARS conversion
      await this.loadExchangeRate();

      // Load car owner ID for confirmation logic
      await this.loadCarOwner();

      // Load FGO inspections
      await this.loadInspections();

      // Load claims for this booking
      await this.loadClaims();

      // Load pricing / insurance / tracking (best-effort)
      void this.loadPricing(booking.id);
      void this.loadInsurance(booking.id);
      void this.loadPayment(booking.id);
      void this.loadTracking(booking.id);
      void this.loadConfirmation(booking.id);
      void this.loadCancellation(booking.id);
    } catch {
      this.error.set('Error al cargar la reserva');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadExchangeRate(): Promise<void> {
    const booking = this.booking();
    if (!booking || !booking.breakdown?.total_cents) return;

    try {
      this.loadingRate.set(true);
      const rate = await this.exchangeRateService.getPlatformRate();
      this.exchangeRate.set(rate);

      // Convert total USD to ARS
      const totalUSD = booking.breakdown.total_cents / 100; // Convertir centavos a dólares
      const totalARS = await this.exchangeRateService.convertUsdToArs(totalUSD);
      this.totalInARS.set(totalARS);
    } catch {
      // No fallar si no se puede obtener la tasa, solo no mostrar conversión
    } finally {
      this.loadingRate.set(false);
    }
  }

  private async loadCarOwner(): Promise<void> {
    const booking = this.booking();
    if (!booking) return;

    try {
      const { data: car } = await this.bookingsService['supabase']
        .from('cars')
        .select('owner_id, owner:profiles!cars_owner_id_fkey(id, full_name)')
        .eq('id', booking.car_id)
        .single();

      if (car) {
        this.carOwnerId.set(car.owner_id);
        const owner = car.owner as { full_name?: string } | undefined;
        const ownerFullName = owner?.full_name || 'el anfitrión';
        this.carOwnerName.set(ownerFullName);
      }
    } catch {
      // Silently ignore errors loading owner name
    }
  }

  private async loadInspections(): Promise<void> {
    const booking = this.booking();
    if (!booking) return;

    try {
      const inspections = await firstValueFrom(this.fgoService.getInspections(booking.id));
      this.inspections.set(inspections);
    } catch {
      // Non-blocking error, inspections are optional
    }
  }

  private async loadClaims(): Promise<void> {
    const booking = this.booking();
    if (!booking) return;

    try {
      this.loadingClaims.set(true);
      // Get all claims and filter by booking_id
      const allClaims = await firstValueFrom(this.insuranceService.getMyClaims());
      const bookingClaims = allClaims.filter((c) => c.booking_id === booking.id);
      this.bookingClaims.set(bookingClaims);
    } catch {
      // Non-blocking error, claims are optional
    } finally {
      this.loadingClaims.set(false);
    }
  }

  private async loadPricing(bookingId: string): Promise<void> {
    try {
      const pricing = await this.bookingOpsService.getPricing(bookingId);
      this.pricing.set(pricing);
    } catch (error) {
      this.logger.warn('booking-pricing-load', error);
    }
  }

  private async loadInsurance(bookingId: string): Promise<void> {
    try {
      const insurance = await this.bookingOpsService.getInsurance(bookingId);
      this.insurance.set(insurance);
    } catch (error) {
      this.logger.warn('booking-insurance-load', error);
    }
  }

  private async loadPayment(bookingId: string): Promise<void> {
    try {
      const payment = await this.bookingOpsService.getPayment(bookingId);
      this.payment.set(payment);
    } catch (error) {
      this.logger.warn('booking-payment-load', error);
    }
  }

  private async loadTracking(bookingId: string): Promise<void> {
    try {
      const session = await this.bookingOpsService.getTrackingSession(bookingId);
      if (!session) {
        this.tracking.set(null);
        return;
      }

      const points = await this.bookingOpsService.countTrackingPoints(session.id);
      this.tracking.set({
        sessionId: session.id,
        active: session.active,
        started_at: session.started_at,
        ended_at: session.ended_at,
        points,
      });
    } catch (error) {
      this.logger.warn('booking-tracking-load', error);
    }
  }

  private async loadConfirmation(bookingId: string): Promise<void> {
    try {
      const confirmation = await this.bookingOpsService.getConfirmation(bookingId);
      this.confirmation.set(confirmation);
    } catch (error) {
      this.logger.warn('booking-confirmation-load', error);
    }
  }

  private async loadCancellation(bookingId: string): Promise<void> {
    try {
      const cancellation = await this.bookingOpsService.getCancellation(bookingId);
      this.cancellation.set(cancellation);
    } catch (error) {
      this.logger.warn('booking-cancellation-load', error);
    }
  }

  getClaimStatusLabel(status: InsuranceClaim['status']): string {
    return CLAIM_STATUS_LABELS[status];
  }

  getClaimStatusColor(status: InsuranceClaim['status']): string {
    const colorMap = {
      reported: 'orange',
      pending: 'yellow',
      investigating: 'purple',
      under_review: 'blue',
      approved: 'green',
      rejected: 'red',
      paid: 'green',
      closed: 'gray',
    };
    return colorMap[status] || 'gray';
  }

  ngOnDestroy() {
    this.stopCountdown();
  }

  private startCountdown() {
    const booking = this.booking();
    if (!booking || booking.status !== 'pending' || !booking.expires_at) {
      return;
    }

    this.stopCountdown();
    this.updateCountdown();

    // Update every second
    this.countdownInterval = window.setInterval(() => {
      this.updateCountdown();
    }, 1000);
  }

  private stopCountdown() {
    if (this.countdownInterval !== null) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private updateCountdown() {
    const booking = this.booking();
    if (!booking) return;

    const remaining = this.bookingsService.getTimeUntilExpiration(booking);
    if (remaining === null || remaining === 0) {
      this.timeRemaining.set(null);
      this.stopCountdown();
      return;
    }

    this.timeRemaining.set(this.bookingsService.formatTimeRemaining(remaining));
  }

  formatCurrency(cents: number, currency: string): string {
    const amount = cents / 100;
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  getBookingDetailsText(): string {
    const booking = this.booking();
    if (!booking) return 'Mi reserva en Autorentar';

    const carInfo = `${booking.car_brand} ${booking.car_model}`;
    const dates =
      booking.start_at && booking.end_at
        ? `${this.formatDateTime(booking.start_at)} - ${this.formatDateTime(booking.end_at)}`
        : '';

    return `Reserva: ${carInfo}${dates ? ` (${dates})` : ''}`;
  }

  private getTotalCents(booking: Booking): number {
    if (booking.breakdown?.total_cents) {
      return booking.breakdown.total_cents;
    }
    return Math.round((booking.total_amount ?? 0) * 100);
  }

  private formatUsd(amount: number): string {
    const fractionDigits = Number.isInteger(amount) ? 0 : 2;
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Confirmation handlers
  async handleConfirmationSuccess(result: ConfirmAndReleaseResponse): Promise<void> {
    // Reload booking to get updated status
    const bookingId = this.booking()?.id;
    if (bookingId) {
      const updated = await this.bookingsService.getBookingById(bookingId);
      this.booking.set(updated);
    }

    // Show success message
    if (result.funds_released) {
      alert(`✅ ${result.message}\n\n¡Los fondos fueron liberados automáticamente!`);
    } else {
      alert(`✅ ${result.message}`);
    }
  }

  handleConfirmationError(errorMessage: string): void {
    alert(`❌ Error: ${errorMessage}`);
  }

  async handleTimelineAction(event: {
    action: 'owner_confirm' | 'renter_confirm' | 'mark_returned';
    bookingId: string;
  }): Promise<void> {
    switch (event.action) {
      case 'owner_confirm':
        this.scrollToSection('owner-confirmation-section');
        break;
      case 'renter_confirm':
        this.scrollToSection('renter-confirmation-section');
        break;
      case 'mark_returned':
        await this.handleMarkAsReturned(event.bookingId);
        break;
      default:
        console.warn('Acción de timeline desconocida', event);
    }
  }

  private scrollToSection(elementId: string): void {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  private async handleMarkAsReturned(bookingId: string): Promise<void> {
    const userId = this.authService.session$()?.user?.id;
    if (!userId) {
      alert('Necesitas iniciar sesión para continuar.');
      return;
    }

    const confirmReturn = confirm('¿Confirmás que devolviste el vehículo al propietario?');
    if (!confirmReturn) {
      return;
    }

    try {
      await this.confirmationService.markAsReturned({
        booking_id: bookingId,
        returned_by: userId,
      });

      const updatedBooking = await this.bookingsService.getBookingById(bookingId);
      if (updatedBooking) {
        this.booking.set(updatedBooking);
      }

      alert('Marcaste la reserva como devuelta. Gracias por completar este paso.');
    } catch (error) {
      console.error('Error al marcar la reserva como devuelta', error);
      alert('No pudimos marcar la devolución. Intentalo nuevamente en unos minutos.');
    }
  }

  private async loadPendingExtensionRequests(bookingId: string): Promise<void> {
    this.loadingExtensionRequests.set(true);
    try {
      const requests = await this.bookingsService.getPendingExtensionRequests(bookingId);
      this.pendingExtensionRequests.set(requests);
    } catch (error) {
      this.logger.error('Error loading pending extension requests:', error);
    } finally {
      this.loadingExtensionRequests.set(false);
    }
  }

  // NEW: Traffic Fines Methods
  private async loadTrafficFines(bookingId: string): Promise<void> {
    this.loadingTrafficFines.set(true);
    try {
      const fines = await this.trafficInfractionsService.getInfractionsByBooking(bookingId);
      this.trafficFines.set(fines);
    } catch (error) {
      this.logger.error('Error loading traffic fines:', error);
    } finally {
      this.loadingTrafficFines.set(false);
    }
  }

  async disputeTrafficFine(fine: TrafficInfraction): Promise<void> {
    const reason = prompt('Por favor, ingresa la razón por la que deseas disputar esta multa:');
    if (!reason) {
      alert('Debes ingresar una razón para disputar la multa.');
      return;
    }

    if (!confirm('¿Confirmas que deseas disputar esta multa de tránsito?')) {
      return;
    }

    this.loading.set(true);
    try {
      await this.trafficInfractionsService.updateInfractionStatus(fine.id, 'disputed', reason);
      alert('Multa disputada exitosamente. El propietario será notificado.');
      // Reload fines to update UI
      await this.loadTrafficFines(this.booking()!.id);
    } catch (error) {
      console.error('Error disputing traffic fine:', error);
      alert('Ocurrió un error al disputar la multa.');
    } finally {
      this.loading.set(false);
    }
  }

  onOwnerNoShowReported(result: { success: boolean; message?: string }): void {
    console.log('Owner No-Show reported:', result);
    this.showReportOwnerNoShowModal.set(false);
    if (result.success) {
      const alert = this.alertController.create({ // Assuming alertController is available
        header: '✅ No-Show Reportado',
        message: 'Hemos registrado tu reporte de no-show. Nuestro equipo ha sido notificado y se pondrá en contacto contigo a la brevedad para asistirte en buscar una alternativa o procesar un reembolso.',
        buttons: [
          {
            text: 'Buscar otro auto',
            handler: () => {
              const booking = this.booking();
              if (booking) {
                this.router.navigate(['/cars'], {
                  queryParams: {
                    startDate: new Date(booking.start_at).toISOString().split('T')[0],
                    endDate: new Date(booking.end_at).toISOString().split('T')[0],
                    city: booking.car_city, // Pre-fill city from original booking
                  },
                });
              }
            },
          },
          {
            text: 'Solicitar Reembolso',
            handler: () => {
              this.showRefundForm.set(true); // Trigger existing refund request modal
            },
          },
          {
            text: 'Cerrar',
            role: 'cancel',
            handler: () => {
              // Reload booking data to reflect any status changes
              this.bookingsService.getBookingById(this.booking()!.id).then(updated => {
                if (updated) this.booking.set(updated);
              });
            },
          },
        ],
      });
      alert.then(a => a.present());
    } else {
      alert('Error al reportar no-show: ' + (result.message || 'Error desconocido.'));
    }
  }

  onRenterNoShowReported(result: { success: boolean; message?: string }): void {
    console.log('Renter No-Show reported:', result);
    this.showReportRenterNoShowModal.set(false);
    if (result.success) {
      alert('Reporte de no-show enviado. Nuestro equipo se pondrá en contacto para validar la situación y aplicar las penalidades correspondientes.');
      // For now, reload booking data to reflect any status changes
      this.bookingsService.getBookingById(this.booking()!.id).then(updated => {
        if (updated) this.booking.set(updated);
      });
    } else {
      alert('Error al reportar no-show: ' + (result.message || 'Error desconocido.'));
    }
  }

  // ============================================================================
  // OWNER CANCELLATION WITH PENALTY
  // ============================================================================

  readonly canOwnerCancel = computed(() => {
    const booking = this.booking();
    if (!booking || !this.isOwner()) return false;
    // Owner can cancel confirmed or pending bookings
    return booking.status === 'confirmed' || booking.status === 'pending' || booking.status === 'pending_payment';
  });

  async ownerCancelBooking(): Promise<void> {
    const booking = this.booking();
    if (!booking) return;

    const alert = await this.alertController.create({
      header: '⚠️ Cancelar Reserva',
      message: `
        <p><strong>¿Estás seguro de cancelar esta reserva?</strong></p>
        <p>Como propietario, al cancelar se aplicarán las siguientes penalizaciones:</p>
        <ul>
          <li>🔙 Reembolso del 100% al arrendatario</li>
          <li>📉 -10% de visibilidad por 30 días</li>
          <li>⚠️ 3+ cancelaciones en 90 días = suspensión temporal</li>
        </ul>
      `,
      inputs: [
        {
          name: 'reason',
          type: 'textarea',
          placeholder: 'Motivo de la cancelación (requerido)',
        },
      ],
      buttons: [
        {
          text: 'No cancelar',
          role: 'cancel',
        },
        {
          text: 'Sí, cancelar',
          cssClass: 'danger',
          handler: async (data) => {
            if (!data.reason || data.reason.trim().length < 10) {
              alert.message = 'Por favor, ingresa un motivo válido (mínimo 10 caracteres).';
              return false; // Prevent closing
            }

            this.loading.set(true);
            try {
              const result = await this.bookingsService.ownerCancelBooking(booking.id, data.reason.trim());

              if (result.success) {
                const updated = await this.bookingsService.getBookingById(booking.id);
                this.booking.set(updated);

                const penaltyMessage = result.penaltyApplied
                  ? 'Se ha aplicado una penalización de visibilidad.'
                  : '';

                const successAlert = await this.alertController.create({
                  header: '✅ Reserva Cancelada',
                  message: `La reserva ha sido cancelada y el arrendatario recibirá un reembolso completo. ${penaltyMessage}`,
                  buttons: ['Entendido'],
                });
                await successAlert.present();
              } else {
                const errorAlert = await this.alertController.create({
                  header: '❌ Error',
                  message: result.error || 'No se pudo cancelar la reserva.',
                  buttons: ['Cerrar'],
                });
                await errorAlert.present();
              }
            } catch {
              const errorAlert = await this.alertController.create({
                header: '❌ Error',
                message: 'Ocurrió un error inesperado al cancelar la reserva.',
                buttons: ['Cerrar'],
              });
              await errorAlert.present();
            } finally {
              this.loading.set(false);
            }
            return true;
          },
        },
      ],
    });

    await alert.present();
  }
}

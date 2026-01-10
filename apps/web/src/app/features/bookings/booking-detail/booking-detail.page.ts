import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Booking, BookingExtensionRequest, BookingStatus, TrafficInfraction } from '@core/models';
import { BookingInspection } from '@core/models/fgo-v1-1.model';
import { CLAIM_STATUS_LABELS, InsuranceClaim } from '@core/models/insurance.model';
import { AuthService } from '@core/services/auth/auth.service';
import {
  BookingConfirmationService,
  ConfirmAndReleaseResponse,
} from '@core/services/bookings/booking-confirmation.service';
import { BookingFlowService, NextStep } from '@core/services/bookings/booking-flow.service';
import {
  BookingCancellationRow,
  BookingConfirmationRow,
  BookingInsuranceRow,
  BookingOpsService,
  BookingPaymentRow,
  BookingPricingRow,
} from '@core/services/bookings/booking-ops.service';
import { BookingRealtimeService } from '@core/services/bookings/booking-realtime.service';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { InsuranceService } from '@core/services/bookings/insurance.service';
import { ReviewsService } from '@core/services/cars/reviews.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { ContractPdfData, InspectionPdfData, PdfWorkerService } from '@core/services/infrastructure/pdf-worker.service';
import { TrafficInfractionsService } from '@core/services/infrastructure/traffic-infractions.service'; // NEW
import { ExchangeRateService } from '@core/services/payments/exchange-rate.service';
import { PaymentsService } from '@core/services/payments/payments.service';
import { MetaService } from '@core/services/ui/meta.service';
import { FgoV1_1Service } from '@core/services/verification/fgo-v1-1.service';
import { AlertController } from '@ionic/angular';
import { IonIcon } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  alertCircle,
  alertCircleOutline,
  arrowBack,
  arrowBackOutline,
  arrowForward,
  carSportOutline,
  cardOutline,
  chatbubbleEllipsesOutline,
  checkmarkCircle,
  checkmarkCircleOutline,
  checkmarkDoneOutline,
  chevronForward,
  closeCircle,
  closeCircleOutline,
  documentTextOutline,
  flagOutline,
  gitCompareOutline,
  hammerOutline,
  helpCircle,
  hourglassOutline,
  informationCircle,
  mapOutline,
  receiptOutline,
  searchOutline,
  shieldCheckmarkOutline,
  sparkles,
  timeOutline,
  warningOutline,
} from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
import { AiChecklistPanelComponent } from '../../../shared/components/ai-checklist-panel/ai-checklist-panel.component';
import { AiLegalPanelComponent } from '../../../shared/components/ai-legal-panel/ai-legal-panel.component';
import { AiTripPanelComponent } from '../../../shared/components/ai-trip-panel/ai-trip-panel.component';
import { BookingChatComponent } from '../../../shared/components/booking-chat/booking-chat.component';
import { BookingConfirmationTimelineComponent } from '../../../shared/components/booking-confirmation-timeline/booking-confirmation-timeline.component';
import { BookingContractComponent } from '../../../shared/components/booking-contract/booking-contract.component';
import { BookingInsuranceSummaryComponent } from '../../../shared/components/booking-insurance-summary/booking-insurance-summary.component';
import { BookingOpsTimelineComponent } from '../../../shared/components/booking-ops-timeline/booking-ops-timeline.component';
import { BookingPricingBreakdownComponent } from '../../../shared/components/booking-pricing-breakdown/booking-pricing-breakdown.component';
import { BookingTrackingComponent } from '../../../shared/components/booking-tracking/booking-tracking.component';
import { DamageComparisonComponent } from '../../../shared/components/damage-comparison/damage-comparison.component';
import { DepositStatusBadgeComponent } from '../../../shared/components/deposit-status-badge/deposit-status-badge.component';
import { DisputeFormComponent } from '../../../shared/components/dispute-form/dispute-form.component';
import { DisputesListComponent } from '../../../shared/components/disputes-list/disputes-list.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { OwnerConfirmationComponent } from '../../../shared/components/owner-confirmation/owner-confirmation.component';
import { RefundRequestComponent } from '../../../shared/components/refund-request/refund-request.component';
import { RefundStatusComponent } from '../../../shared/components/refund-status/refund-status.component';
import { RenterConfirmationComponent } from '../../../shared/components/renter-confirmation/renter-confirmation.component';
import { ReportOwnerNoShowComponent } from '../../../shared/components/report-owner-no-show/report-owner-no-show.component'; // NEW
import { ReportRenterNoShowComponent } from '../../../shared/components/report-renter-no-show/report-renter-no-show.component'; // NEW
import { ReportTrafficFineComponent } from '../../../shared/components/report-traffic-fine/report-traffic-fine.component'; // NEW
import { SettlementSimulatorComponent } from '../../../shared/components/settlement-simulator/settlement-simulator.component';
import { SidePanelComponent } from '../../../shared/components/side-panel/side-panel.component';
import { BookingActionsCardComponent } from './booking-actions-card.component';
import { BookingCheckInInfoCardComponent } from './booking-check-in-info-card.component';
import { BookingExtensionsManagerComponent } from './booking-extensions-manager.component';
import { BookingStatusComponent } from './booking-status.component';
import { BookingTrafficFinesManagerComponent } from './booking-traffic-fines-manager.component';
import { ReviewManagementComponent } from './review-management.component';

interface ReturnChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

interface FlowStep {
  key: string;
  label: string;
  description: string;
}

interface FlowAlert {
  tone: 'info' | 'warning' | 'danger' | 'success';
  title: string;
  message: string;
  action?: { label: string; route: string };
}

type FlowStatus = BookingStatus | 'renter_checkin';

const TERMINAL_STATUSES = new Set<BookingStatus>([
  'cancelled',
  'cancelled_owner',
  'cancelled_renter',
  'cancelled_system',
  'expired',
  'rejected',
  'no_show',
]);

const DISPUTE_STATUSES = new Set<BookingStatus>([
  'pending_dispute_resolution',
  'disputed',
  'resolved',
]);

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
    IonIcon,
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
    SidePanelComponent,
    BookingActionsCardComponent,
    BookingCheckInInfoCardComponent,
    BookingExtensionsManagerComponent,
    BookingTrafficFinesManagerComponent,
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
  private readonly bookingFlowService = inject(BookingFlowService);
  private readonly authService = inject(AuthService);
  private readonly confirmationService = inject(BookingConfirmationService);
  private readonly alertController = inject(AlertController); // NEW
  private readonly metaService = inject(MetaService);
  private readonly exchangeRateService = inject(ExchangeRateService);
  private readonly fgoService = inject(FgoV1_1Service);
  private readonly insuranceService = inject(InsuranceService);
  private readonly bookingOpsService = inject(BookingOpsService);
  private readonly trafficInfractionsService = inject(TrafficInfractionsService); // NEW
  private readonly bookingRealtimeService = inject(BookingRealtimeService);
  private readonly pdfWorkerService = inject(PdfWorkerService);
  private readonly logger = inject(LoggerService).createChildLogger('BookingDetailPage');

  constructor() {
    addIcons({
      timeOutline,
      checkmarkCircleOutline,
      carSportOutline,
      flagOutline,
      closeCircleOutline,
      hourglassOutline,
      alertCircleOutline,
      cardOutline,
      searchOutline,
      hammerOutline,
      helpCircle,
      arrowBackOutline,
      arrowBack,
      documentTextOutline,
      shieldCheckmarkOutline,
      gitCompareOutline,
      warningOutline,
      chevronForward,
      receiptOutline,
      chatbubbleEllipsesOutline,
      arrowForward,
      checkmarkDoneOutline,
      sparkles,
      informationCircle,
      alertCircle,
      closeCircle,
      checkmarkCircle,
      mapOutline,
    });
  }

  booking = signal<Booking | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  timeRemaining = signal<string | null>(null);
  nextStep = signal<NextStep | null>(null);
  nextStepLoading = signal(false);
  deliveryTimeRemaining = signal<string | null>(null);
  returnChecklistItems = signal<ReturnChecklistItem[]>([]);
  showAllSteps = signal(false);
  private readonly isBrowser = typeof window !== 'undefined';
  private readonly returnChecklistStoragePrefix = 'autorenta:return-checklist:';
  private returnChecklistSaveTimeout: number | null = null;

  readonly isApprovalFlow = computed(() => !!this.booking()?.payment_mode);

  readonly isWalletFlow = computed(() => {
    const booking = this.booking();
    const mode = booking?.payment_mode ?? booking?.payment_method;
    return mode === 'wallet' || mode === 'partial_wallet';
  });

  readonly hasGuaranteeLocked = computed(() => {
    const booking = this.booking();
    if (!booking) return false;
    return (
      booking.wallet_status === 'locked' ||
      booking.deposit_status === 'locked' ||
      !!booking.authorized_payment_id ||
      !!booking.wallet_lock_id ||
      !!booking.wallet_lock_transaction_id
    );
  });

  readonly flowSteps = computed<FlowStep[]>(() => {
    const booking = this.booking();
    const isApprovalFlow = !!booking?.payment_mode;
    const paymentPending = booking?.status === 'pending' || booking?.status === 'pending_payment';
    const guaranteeLocked = this.hasGuaranteeLocked();

    const paymentLabel = isApprovalFlow
      ? guaranteeLocked
        ? 'Garantía bloqueada'
        : 'Garantía en proceso'
      : paymentPending
        ? 'Pago pendiente'
        : 'Pago confirmado';

    const paymentDescription = isApprovalFlow
      ? guaranteeLocked
        ? 'Fondos reservados hasta el cierre de la reserva.'
        : 'Estamos asegurando la garantía antes de la aprobación.'
      : paymentPending
        ? 'Completá el pago para confirmar la reserva.'
        : 'Pago recibido. Coordiná la entrega.';

    const steps: FlowStep[] = [
      {
        key: 'pending',
        label: 'Solicitud enviada',
        description: 'Solicitud creada correctamente.',
      },
      {
        key: 'pending_payment',
        label: paymentLabel,
        description: paymentDescription,
      },
    ];

    if (isApprovalFlow) {
      steps.push({
        key: 'awaiting_approval',
        label: 'Esperando aprobación',
        description: 'El propietario está revisando tu solicitud.',
      });
    }

    steps.push(
      {
        key: 'confirmed',
        label: 'Reserva confirmada',
        description: 'Coordiná el check-in y la entrega.',
      },
      {
        key: 'renter_checkin',
        label: 'Recepción y documentación',
        description: 'Confirmá la recepción, sacá fotos y registrá el estado del auto.',
      },
      {
        key: 'in_progress',
        label: 'En viaje',
        description: 'Disfrutá del viaje y cuidá el vehículo.',
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
    );

    return steps;
  });

  readonly effectiveStatus = computed<FlowStatus | null>(() => {
    const booking = this.booking();
    if (!booking) return null;

    if (this.hasCheckOut()) return 'pending_review';
    if (this.hasRenterCheckIn()) return 'in_progress';
    if (this.hasOwnerCheckIn()) return 'renter_checkin';

    return booking.status;
  });

  readonly currentFlowStepKey = computed(() => {
    const booking = this.booking();
    const status = this.effectiveStatus();
    if (!booking || !status) return 'pending';

    const isReturnFlow =
      !!booking.returned_at ||
      booking.status === 'returned' || // V2 status
      booking.status === 'inspected_good' || // V2 status
      booking.status === 'damage_reported' || // V2 status
      booking.completion_status === 'returned' ||
      booking.completion_status === 'pending_owner' ||
      booking.completion_status === 'pending_renter' ||
      booking.completion_status === 'pending_both';

    if (isReturnFlow) {
      return 'pending_review';
    }

    if (status !== 'renter_checkin' && TERMINAL_STATUSES.has(status as BookingStatus)) {
      return 'pending';
    }

    if (status !== 'renter_checkin' && DISPUTE_STATUSES.has(status as BookingStatus)) {
      return 'pending_review';
    }

    // If marked in_progress but start date is in the future, treat as confirmed for UI
    if (status === 'in_progress' && booking.start_at) {
      const startAt = new Date(booking.start_at).getTime();
      if (!Number.isNaN(startAt) && Date.now() < startAt) {
        return 'confirmed';
      }
    }

    if (status === 'pending' && this.isApprovalFlow()) {
      return this.hasGuaranteeLocked() ? 'awaiting_approval' : 'pending_payment';
    }

    if (status === 'pending_payment') {
      return 'pending_payment';
    }

    if (status === 'pending') {
      return 'pending';
    }

    if (status === 'confirmed') {
      return 'confirmed';
    }

    if (status === 'renter_checkin') {
      return 'renter_checkin';
    }

    if (status === 'in_progress') {
      return 'in_progress';
    }

    if (status === 'pending_review') {
      return 'pending_review';
    }

    if (status === 'completed') {
      return 'completed';
    }

    return 'pending';
  });

  /**
   * Determines the current step index in the booking flow.
   * Maps the current status to the active flow step (handles approval flow, return flow, disputes).
   */
  readonly currentBookingStageIndex = computed(() => {
    const steps = this.flowSteps();
    const currentKey = this.currentFlowStepKey();
    const idx = steps.findIndex((step) => step.key === currentKey);
    return idx >= 0 ? idx : 0;
  });

  readonly flowProgress = computed(() => {
    const steps = this.flowSteps();
    if (steps.length <= 1) return 0;
    const current = this.currentBookingStageIndex();
    return Math.min(100, Math.round((current / (steps.length - 1)) * 100));
  });

  /** Pasos visibles (colapsable): muestra anterior + actual + siguiente */
  readonly visibleSteps = computed(() => {
    const steps = this.flowSteps();
    const currentIdx = this.currentBookingStageIndex();

    if (this.showAllSteps() || steps.length <= 4) {
      return steps.map((step, i) => ({ ...step, originalIndex: i }));
    }

    // Mostrar: paso anterior + actual + siguiente (máx 3 pasos)
    const start = Math.max(0, currentIdx - 1);
    const end = Math.min(steps.length, currentIdx + 2);
    return steps.slice(start, end).map((step, i) => ({
      ...step,
      originalIndex: start + i,
    }));
  });

  /** Cantidad de pasos ocultos antes de los visibles */
  readonly hiddenStepsBefore = computed(() => {
    if (this.showAllSteps()) return 0;
    const currentIdx = this.currentBookingStageIndex();
    return Math.max(0, currentIdx - 1);
  });

  /** Cantidad de pasos ocultos después de los visibles */
  readonly hiddenStepsAfter = computed(() => {
    if (this.showAllSteps()) return 0;
    const steps = this.flowSteps();
    const currentIdx = this.currentBookingStageIndex();
    return Math.max(0, steps.length - currentIdx - 2);
  });

  toggleShowAllSteps(): void {
    this.showAllSteps.update((v) => !v);
  }

  readonly flowStatusInfo = computed(() => {
    const booking = this.booking();
    if (!booking) return null;
    const base = this.bookingFlowService.getBookingStatusInfo(booking);

    if (this.isPendingOwnerApproval()) {
      return {
        ...base,
        label: 'Esperando aprobación',
        description: 'El anfitrión está revisando tu solicitud.',
      };
    }

    if (booking.status === 'pending_payment') {
      return {
        ...base,
        label: 'Pago en proceso',
        description: 'Estamos confirmando el pago de tu reserva.',
      };
    }

    return base;
  });

  readonly flowAlert = computed<FlowAlert | null>(() => {
    const booking = this.booking();
    if (!booking) return null;

    switch (booking.status) {
      case 'pending_dispute_resolution':
      case 'disputed':
        return {
          tone: 'warning',
          title: 'Reserva en disputa',
          message: 'Hay un reclamo activo. Nuestro equipo está revisando el caso.',
          action: { label: 'Ver disputa', route: `/bookings/${booking.id}/disputes` },
        };
      case 'resolved':
        return {
          tone: 'success',
          title: 'Disputa resuelta',
          message: 'La disputa fue resuelta. Los fondos se liberarán según el resultado.',
        };
      case 'cancelled_owner':
        return {
          tone: 'danger',
          title: 'Cancelada por el anfitrión',
          message: 'La reserva fue cancelada por el anfitrión. Podés buscar otro auto disponible.',
        };
      case 'cancelled_renter':
        return {
          tone: 'danger',
          title: 'Cancelada por vos',
          message: 'La reserva fue cancelada. Podés iniciar una nueva cuando quieras.',
        };
      case 'cancelled_system':
        return {
          tone: 'danger',
          title: 'Cancelada por el sistema',
          message: 'La reserva fue cancelada automáticamente por el sistema.',
        };
      case 'cancelled':
        return {
          tone: 'danger',
          title: 'Reserva cancelada',
          message: 'La reserva fue cancelada. Si necesitás ayuda, contactá soporte.',
        };
      case 'expired':
        return {
          tone: 'danger',
          title: 'Reserva expirada',
          message: 'La solicitud expiró antes de completar el pago.',
        };
      case 'rejected':
        return {
          tone: 'danger',
          title: 'Solicitud rechazada',
          message: 'El anfitrión rechazó tu solicitud. Podés intentar con otro vehículo.',
        };
      case 'no_show':
        return {
          tone: 'warning',
          title: 'No show',
          message: 'No se registró presentación para el inicio de la reserva.',
        };
      default:
        return null;
    }
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
    const booking = this.booking();
    if (!insurance) return null;

    // FIX: Use the currency from the booking instead of hardcoding ARS
    const currency = (booking?.currency as 'ARS' | 'USD') || 'ARS';

    return {
      coverageName: insurance.coverage_upgrade || 'Estándar',
      premium: insurance.insurance_premium_total ? insurance.insurance_premium_total / 100 : 0,
      guaranteeType: insurance.guarantee_type || 'hold',
      guaranteeAmount: insurance.guarantee_amount_cents
        ? insurance.guarantee_amount_cents / 100
        : undefined,
      currency,
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
   * Pending booking waiting for owner approval (request flow).
   * When true: show "waiting for approval" UI instead of "pay now" UI.
   */
  readonly isPendingOwnerApproval = computed(() => {
    const booking = this.booking();
    if (!booking) return false;
    return booking.status === 'pending' && !!booking.payment_mode;
  });

  /**
   * Traditional flow: booking needs payment
   * When true: show "Garantizar Reserva" button
   */
  readonly needsPayment = computed(() => {
    const booking = this.booking();
    if (!booking) return false;
    return booking.status === 'pending' && !booking.payment_mode;
  });

  private countdownInterval: number | null = null;
  private deliveryCountdownInterval: number | null = null;

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

    const ownerId = booking.owner_id || this.carOwnerId();
    return ownerId === currentUser.id;
  });

  isRenter = computed(() => {
    const booking = this.booking();
    const currentUser = this.authService.session$()?.user;
    return booking?.renter_id === currentUser?.id;
  });

  readonly backLink = computed(() => (this.isOwner() ? '/bookings/owner' : '/bookings'));
  readonly backLabel = computed(() =>
    this.isOwner() ? 'Volver a reservas de propietarios' : 'Volver a mis reservas',
  );

  // Car owner ID and name (loaded separately)
  carOwnerId = signal<string | null>(null);
  carOwnerName = signal<string>('el anfitrión');

  // 🆕 FGO v1.1: Computed properties para inspecciones
  readonly canUploadInspection = computed(() => {
    const booking = this.booking();
    return booking?.status === 'in_progress' || booking?.status === 'completed';
  });

  readonly hasOwnerCheckIn = computed(() => {
    return this.inspections().some((i: BookingInspection) => i.stage === 'check_in' && i.signedAt);
  });

  readonly hasRenterCheckIn = computed(() => {
    return this.inspections().some(
      (i: BookingInspection) => i.stage === 'renter_check_in' && i.signedAt,
    );
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

  // Chat Side Panel
  chatPanelOpen = signal(false);

  openChatPanel(): void {
    this.chatPanelOpen.set(true);
  }

  closeChatPanel(): void {
    this.chatPanelOpen.set(false);
  }

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
  readonly checkInPhotos = computed(() => {
    const list = this.inspections();
    const ownerCheckIn = list.find((i) => i.stage === 'check_in');
    if (ownerCheckIn) return ownerCheckIn.photos;
    const renterCheckIn = list.find((i) => i.stage === 'renter_check_in');
    return renterCheckIn?.photos || [];
  });

  readonly checkOutPhotos = computed(() => {
    const list = this.inspections();
    return list.find((i) => i.stage === 'check_out')?.photos || [];
  });

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
    this.expandedAiPanel.update((current) => (current === panel ? null : panel));
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
    if (this.hasRenterCheckIn()) return 'check_out';
    return 'check_in';
  });

  readonly returnChecklistProgress = computed(() => {
    const items = this.returnChecklistItems();
    if (items.length === 0) return { completed: 0, total: 0 };
    const completed = items.filter((i) => i.checked).length;
    return { completed, total: items.length };
  });

  readonly carReturnConsiderations = computed(() => {
    const booking = this.booking();
    const car = booking?.car;
    if (!booking || !car) return [];

    const items: string[] = [];

    if (car.fuel_policy === 'full_to_full') {
      items.push('Combustible: devolvé el auto con tanque lleno.');
    } else if (car.fuel_policy === 'same_to_same') {
      items.push('Combustible: devolvé el auto con el mismo nivel.');
    }

    if (car.mileage_limit !== null && car.mileage_limit !== undefined) {
      if (car.mileage_limit === 0) {
        items.push('Kilometraje: ilimitado.');
      } else {
        items.push(`Kilometraje máximo incluido: ${car.mileage_limit} km.`);
      }
    }

    if (car.extra_km_price !== null && car.extra_km_price !== undefined) {
      items.push(`Exceso de km: ${car.extra_km_price} por km adicional.`);
    }

    if (car.allow_smoking === false) {
      items.push('No se permite fumar dentro del vehículo.');
    }

    if (car.allow_pets === false) {
      items.push('No se permiten mascotas en el vehículo.');
    }

    if (car.allow_rideshare === false) {
      items.push('No se permite uso para rideshare.');
    }

    if (car.max_distance_km !== null && car.max_distance_km !== undefined) {
      items.push(`Distancia máxima recomendada: ${car.max_distance_km} km.`);
    }

    if (booking.delivery_required) {
      items.push('Coordiná la devolución en el punto de entrega acordado.');
    }

    if (items.length === 0) {
      items.push('Respetá el estado del vehículo y devolvelo limpio y en horario.');
    }

    return items;
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
    const status = this.effectiveStatus();
    if (!booking || !this.isRenter() || !status) return false;
    const validStatus =
      status === 'confirmed' || status === 'in_progress' || status === 'renter_checkin';
    return validStatus && this.hasOwnerCheckIn() && !this.hasRenterCheckIn();
  });

  readonly canPerformCheckOut = computed(() => {
    const booking = this.booking();
    const status = this.effectiveStatus();
    if (!booking || !this.isRenter() || !status) return false;
    const validStatus = status === 'in_progress' || status === 'pending_review';
    return validStatus && this.hasRenterCheckIn() && !this.hasCheckOut();
  });

  // Owner check-in: Owner debe entregar el vehículo primero
  readonly canOwnerCheckIn = computed(() => {
    const booking = this.booking();
    if (!booking || !this.isOwner()) return false;
    // Owner puede hacer check-in cuando booking está confirmado y aún no ha hecho check-in
    return booking.status === 'confirmed' && !this.hasOwnerCheckIn();
  });

  // Owner check-out: Owner confirma la devolución del vehículo
  // Owner check-out: Owner confirma la devolución del vehículo
  readonly canOwnerCheckOut = computed(() => {
    const booking = this.booking();
    if (!booking || !this.isOwner()) return false;

    // Owner can proceed if vehicle is returned but not yet fully completed/archived
    // We check:
    // 1. Status is 'returned' (new V2 status)
    // 2. OR returned_at is set
    // 3. OR has check-out inspection (legacy/fallback)
    const isReturned = booking.status === 'returned' || !!booking.returned_at || this.hasCheckOut();

    // Must be in a state where owner intervention is needed (not yet completed)
    return isReturned && booking.status !== 'completed';
  });

  // Helper for UI to show return/confirmation section
  readonly isReturnPhase = computed(() => {
    const booking = this.booking();
    if (!booking) return false;
    return (
      booking.status === 'returned' ||
      !!booking.returned_at ||
      (booking.status === 'in_progress' && this.hasCheckOut())
    );
  });

  readonly canReportDamage = computed(() => {
    const booking = this.booking();
    if (!booking || !this.isOwner()) return false;
    // Owner can report damage after vehicle return
    const canReport =
      (booking.status === 'completed' || this.isReturnPhase()) && !booking.has_damages;
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

    if (
      !confirm(
        `¿Confirmas solicitar extender la reserva hasta el ${newEndDate.toLocaleDateString()}? El anfitrión deberá aprobarla.`,
      )
    ) {
      return;
    }

    this.loading.set(true);
    try {
      const result = await this.bookingsService.requestExtension(booking.id, newEndDate);
      if (result.success) {
        alert(
          `Solicitud de extensión enviada exitosamente por un costo estimado de ${result.additionalCost}. Esperando aprobación del anfitrión.`,
        );
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

    const confirmRejection = confirm(
      '¿Confirmas que quieres rechazar esta solicitud de extensión?',
    );
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
    this.logger.debug('Traffic fine reported:', fine);
    this.showReportTrafficFineModal.set(false);
    // Reload pending extension requests to ensure the UI is up-to-date.
    this.loadPendingExtensionRequests(this.booking()!.id);
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
      await this.loadNextStep(booking);
      this.startCountdown();
      this.loadReturnChecklist(booking);

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

      // Load renter verification for owners
      await this.loadRenterVerification();

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

      // Subscribe to realtime updates for this booking
      this.setupRealtimeSubscriptions(booking.id);
    } catch {
      this.error.set('Error al cargar la reserva');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadNextStep(booking: Booking): Promise<void> {
    try {
      this.nextStepLoading.set(true);
      const role: 'owner' | 'renter' = this.isOwner() ? 'owner' : 'renter';
      const step = await this.bookingFlowService.getNextStep(booking, role);
      if (step && step.route === `/bookings/${booking.id}`) {
        this.nextStep.set(null);
        return;
      }
      this.nextStep.set(step);
    } catch {
      this.nextStep.set(null);
    } finally {
      this.nextStepLoading.set(false);
    }
  }

  async goToNextStep(): Promise<void> {
    const booking = this.booking();
    const next = this.nextStep();
    if (!booking || !next) return;
    await this.router.navigateByUrl(next.route);
  }

  toggleReturnChecklistItem(itemId: string): void {
    const booking = this.booking();
    if (!booking) return;

    this.returnChecklistItems.update((items) =>
      items.map((item) => (item.id === itemId ? { ...item, checked: !item.checked } : item)),
    );
    this.persistReturnChecklist(booking.id);
    this.scheduleReturnChecklistSave(booking.id);
  }

  private loadReturnChecklist(booking: Booking): void {
    const bookingId = booking.id;
    if (!this.isBrowser) {
      this.returnChecklistItems.set(this.mergeChecklistFromMetadata(booking));
      return;
    }

    const key = `${this.returnChecklistStoragePrefix}${bookingId}`;
    const stored = window.localStorage.getItem(key);
    const base = this.mergeChecklistFromMetadata(booking);

    if (!stored) {
      this.returnChecklistItems.set(base);
      return;
    }

    try {
      const parsed = JSON.parse(stored) as ReturnChecklistItem[];
      const merged = base.map((item) => {
        const storedItem = parsed.find((p) => p.id === item.id);
        return storedItem ? { ...item, checked: !!storedItem.checked } : item;
      });
      this.returnChecklistItems.set(merged);
    } catch {
      this.returnChecklistItems.set(base);
    }
  }

  private persistReturnChecklist(bookingId: string): void {
    if (!this.isBrowser) return;
    const key = `${this.returnChecklistStoragePrefix}${bookingId}`;
    window.localStorage.setItem(key, JSON.stringify(this.returnChecklistItems()));
  }

  private mergeChecklistFromMetadata(booking: Booking): ReturnChecklistItem[] {
    const base = this.buildReturnChecklist();
    const raw = booking.metadata?.['return_checklist'];
    if (!Array.isArray(raw)) return base;

    return base.map((item) => {
      const storedItem = raw.find((p: ReturnChecklistItem) => p?.id === item.id);
      return storedItem ? { ...item, checked: !!storedItem.checked } : item;
    });
  }

  private scheduleReturnChecklistSave(bookingId: string): void {
    if (this.returnChecklistSaveTimeout !== null) {
      clearTimeout(this.returnChecklistSaveTimeout);
    }

    this.returnChecklistSaveTimeout = window.setTimeout(async () => {
      const booking = this.booking();
      if (!booking) return;

      const currentMetadata = booking.metadata ?? {};
      const nextMetadata = {
        ...currentMetadata,
        return_checklist: this.returnChecklistItems(),
      };

      try {
        const updated = await this.bookingsService.updateBooking(bookingId, {
          metadata: nextMetadata,
        });
        if (updated) {
          this.booking.set(updated);
        }
      } catch (error) {
        this.logger.warn('No se pudo sincronizar el checklist de devolución', error);
      }
    }, 500);
  }

  private buildReturnChecklist(): ReturnChecklistItem[] {
    return [
      {
        id: 'final-photos',
        label: 'Subir fotos finales (exterior, interior, odómetro)',
        checked: false,
      },
      { id: 'fuel', label: 'Dejar el combustible según la política del auto', checked: false },
      { id: 'clean', label: 'Retirar objetos personales y basura', checked: false },
      { id: 'accessories', label: 'Devolver llaves y accesorios completos', checked: false },
      { id: 'location-time', label: 'Confirmar lugar y horario de devolución', checked: false },
      { id: 'damages', label: 'Reportar incidentes o daños si los hubo', checked: false },
    ];
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
    const colorMap: Record<InsuranceClaim['status'], string> = {
      draft: 'gray',
      submitted: 'orange',
      under_review: 'blue',
      processing: 'purple',
      approved: 'green',
      rejected: 'red',
      paid: 'green',
    };
    return colorMap[status] || 'gray';
  }

  ngOnDestroy() {
    this.stopCountdown();
    this.bookingRealtimeService.unsubscribeAll();
  }

  /**
   * Subscribe to realtime updates for this booking.
   * When owner/renter takes an action, the UI updates automatically.
   */
  private setupRealtimeSubscriptions(bookingId: string): void {
    this.bookingRealtimeService.subscribeToBooking(bookingId, {
      onBookingChange: (booking) => {
        this.logger.debug('[Realtime] Booking updated:', booking.status);
        this.booking.set(booking);
        void this.loadNextStep(booking);
      },
      onConfirmationChange: (confirmation) => {
        this.logger.debug('[Realtime] Confirmation updated');
        this.confirmation.set(confirmation);
      },
      onInspectionChange: () => {
        this.logger.debug('[Realtime] Inspection changed, reloading...');
        void this.loadInspections();
      },
      onExtensionChange: () => {
        this.logger.debug('[Realtime] Extension changed, reloading...');
        void this.loadPendingExtensionRequests(bookingId);
      },
      onClaimChange: () => {
        this.logger.debug('[Realtime] Claim changed, reloading...');
        void this.loadClaims();
      },
      onFineChange: () => {
        this.logger.debug('[Realtime] Traffic fine changed, reloading...');
        void this.loadTrafficFines(bookingId);
      },
      onConnectionChange: (status) => {
        this.logger.debug('[Realtime] Connection status:', status);
      },
    });
  }

  private startCountdown() {
    const booking = this.booking();
    if (!booking) return;

    this.stopCountdown();

    if (booking.status === 'pending' && booking.expires_at) {
      this.updateCountdown();
      // Update every second
      this.countdownInterval = window.setInterval(() => {
        this.updateCountdown();
      }, 1000);
    }

    if (booking.status === 'in_progress') {
      this.updateDeliveryCountdown();
      // Update every 30 seconds
      this.deliveryCountdownInterval = window.setInterval(() => {
        this.updateDeliveryCountdown();
      }, 30000);
    }
  }

  private stopCountdown() {
    if (this.countdownInterval !== null) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    if (this.deliveryCountdownInterval !== null) {
      clearInterval(this.deliveryCountdownInterval);
      this.deliveryCountdownInterval = null;
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

  private updateDeliveryCountdown() {
    const booking = this.booking();
    if (!booking || booking.status !== 'in_progress') {
      this.deliveryTimeRemaining.set(null);
      return;
    }

    const startAt = booking.start_at ? new Date(booking.start_at).getTime() : null;
    if (startAt && !Number.isNaN(startAt) && Date.now() < startAt) {
      const remainingMs = startAt - Date.now();
      const totalMinutes = Math.ceil(remainingMs / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const timeLabel = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      this.deliveryTimeRemaining.set(`Comienza en ${timeLabel}`);
      return;
    }

    const endAt = booking.end_at ? new Date(booking.end_at).getTime() : null;
    if (!endAt) {
      this.deliveryTimeRemaining.set(null);
      return;
    }

    const remainingMs = endAt - Date.now();
    if (remainingMs <= 0) {
      this.deliveryTimeRemaining.set('Vencido');
      return;
    }

    const totalMinutes = Math.ceil(remainingMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const timeLabel = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    this.deliveryTimeRemaining.set(`Entrega en ${timeLabel}`);
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
    this.logger.debug('Owner No-Show reported:', result);
    this.showReportOwnerNoShowModal.set(false);
    if (result.success) {
      const alert = this.alertController.create({
        // Assuming alertController is available
        header: '✅ No-Show Reportado',
        message:
          'Hemos registrado tu reporte de no-show. Nuestro equipo ha sido notificado y se pondrá en contacto contigo a la brevedad para asistirte en buscar una alternativa o procesar un reembolso.',
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
              this.bookingsService.getBookingById(this.booking()!.id).then((updated) => {
                if (updated) this.booking.set(updated);
              });
            },
          },
        ],
      });
      alert.then((a) => a.present());
    } else {
      alert('Error al reportar no-show: ' + (result.message || 'Error desconocido.'));
    }
  }

  onRenterNoShowReported(result: { success: boolean; message?: string }): void {
    this.logger.debug('Renter No-Show reported:', result);
    this.showReportRenterNoShowModal.set(false);
    if (result.success) {
      alert(
        'Reporte de no-show enviado. Nuestro equipo se pondrá en contacto para validar la situación y aplicar las penalidades correspondientes.',
      );
      // For now, reload booking data to reflect any status changes
      this.bookingsService.getBookingById(this.booking()!.id).then((updated) => {
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
    return (
      booking.status === 'confirmed' ||
      booking.status === 'pending' ||
      booking.status === 'pending_payment'
    );
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
              const result = await this.bookingsService.ownerCancelBooking(
                booking.id,
                data.reason.trim(),
              );

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

  // ============================================================================
  // RENTER CANCELLATION
  // ============================================================================
  async cancelBooking(bookingId: string): Promise<void> {
    const booking = this.booking();
    if (!booking || booking.id !== bookingId) return;

    const alert = await this.alertController.create({
      header: 'Cancelar Reserva',
      message: '¿Estás seguro de que querés cancelar esta reserva?',
      buttons: [
        {
          text: 'No',
          role: 'cancel',
        },
        {
          text: 'Sí, cancelar',
          handler: async () => {
            this.loading.set(true);
            try {
              await this.bookingsService.cancelBooking(booking.id);

              const updated = await this.bookingsService.getBookingById(bookingId);
              this.booking.set(updated);

              const successAlert = await this.alertController.create({
                header: 'Reserva Cancelada',
                message: 'La reserva ha sido cancelada exitosamente.',
                buttons: ['OK'],
              });
              await successAlert.present();
            } catch (error) {
              console.error('Error cancelling booking:', error);
              const errorAlert = await this.alertController.create({
                header: 'Error',
                message: 'No se pudo cancelar la reserva. Intentalo de nuevo.',
                buttons: ['OK'],
              });
              await errorAlert.present();
            } finally {
              this.loading.set(false);
            }
          },
        },
      ],
    });

    await alert.present();
  }

  // ============================================================================
  // RENTER VERIFICATION (FOR OWNERS)
  // ============================================================================
  readonly renterVerification = signal<RenterVerification | null>(null);
  readonly renterVerificationLoading = signal(false);

  readonly renterDriverScore = computed(() => this.renterVerification()?.driver_score ?? null);
  readonly renterDriverClass = computed(() => this.renterVerification()?.driver_class ?? null);
  readonly renterClassDescription = computed(
    () => this.renterVerification()?.class_description ?? null,
  );
  readonly renterFeeMultiplier = computed(() => this.renterVerification()?.fee_multiplier ?? null);
  readonly renterPhone = computed(() => this.renterVerification()?.phone ?? null);
  readonly renterWhatsApp = computed(() => this.renterVerification()?.whatsapp ?? null);
  readonly renterDni = computed(() => this.renterVerification()?.gov_id_number ?? null);
  readonly renterDniType = computed(() => this.renterVerification()?.gov_id_type ?? 'DNI');
  readonly renterLicenseExpiry = computed(
    () => this.renterVerification()?.driver_license_expiry ?? null,
  );
  readonly renterLicenseClass = computed(
    () => this.renterVerification()?.driver_license_class ?? null,
  );
  readonly renterLicenseVerified = computed(
    () => this.renterVerification()?.driver_license_verified_at ?? null,
  );
  readonly renterIdVerified = computed(() => this.renterVerification()?.id_verified ?? null);

  readonly videoCallUrl = computed(() => {
    const booking = this.booking();
    if (!booking) return null;
    return `https://meet.jit.si/autorenta-${booking.id}`;
  });

  async loadRenterVerification(): Promise<void> {
    const booking = this.booking();
    if (!booking || !this.isOwner()) return;

    try {
      this.renterVerificationLoading.set(true);
      const data = await this.bookingsService.getRenterVerificationForOwner(booking.id);
      this.renterVerification.set(data as RenterVerification | null);
    } catch {
      this.renterVerification.set(null);
    } finally {
      this.renterVerificationLoading.set(false);
    }
  }

  renterDocStatus(kind: RenterDocumentKind): RenterDocumentStatus {
    const doc = this.findRenterDoc(kind);
    if (!doc) return { label: 'Faltante', tone: 'danger' };
    if (doc.status === 'verified') return { label: 'Verificado', tone: 'success' };
    if (doc.status === 'rejected') return { label: 'Rechazado', tone: 'danger' };
    return { label: 'Pendiente', tone: 'warning' };
  }

  renterResidenceDocStatus(): RenterDocumentStatus {
    const doc = this.findRenterDoc('utility_bill');
    if (!doc) return { label: 'Faltante', tone: 'danger' };
    if (doc.status !== 'verified') return { label: 'Pendiente', tone: 'warning' };
    if (!doc.created_at) return { label: 'Verificado', tone: 'success' };
    const ageDays = Math.floor((Date.now() - new Date(doc.created_at).getTime()) / 86400000);
    if (ageDays <= 90) return { label: 'Vigente', tone: 'success' };
    return { label: 'Vencido', tone: 'danger' };
  }

  private findRenterDoc(kind: RenterDocumentKind): RenterDocument | null {
    const docs = this.renterVerification()?.documents ?? [];
    return docs.find((d) => d.kind === kind) ?? null;
  }

  // ============================================================================
  // OWNER APPROVE/REJECT BOOKING
  // ============================================================================
  readonly canApproveBooking = computed(() => {
    const booking = this.booking();
    return this.isOwner() && booking?.status === 'pending' && !!booking?.payment_mode;
  });

  async approveBooking(): Promise<void> {
    const booking = this.booking();
    if (!booking || this.loading()) return;

    this.loading.set(true);
    try {
      const result = await this.bookingsService.approveBooking(booking.id);
      if (result.success) {
        const updated = await this.bookingsService.getBookingById(booking.id);
        this.booking.set(updated);

        const successAlert = await this.alertController.create({
          header: '✅ Reserva Aprobada',
          message: result.message || 'La reserva fue aprobada exitosamente.',
          buttons: ['Entendido'],
        });
        await successAlert.present();
      } else {
        const errorAlert = await this.alertController.create({
          header: '❌ Error',
          message: result.error || 'No se pudo aprobar la reserva.',
          buttons: ['Cerrar'],
        });
        await errorAlert.present();
      }
    } catch {
      const errorAlert = await this.alertController.create({
        header: '❌ Error',
        message: 'Ocurrió un error inesperado al aprobar la reserva.',
        buttons: ['Cerrar'],
      });
      await errorAlert.present();
    } finally {
      this.loading.set(false);
    }
  }

  async rejectBooking(): Promise<void> {
    const booking = this.booking();
    if (!booking || this.loading()) return;

    const alert = await this.alertController.create({
      header: 'Rechazar reserva',
      message: 'Podés agregar un motivo opcional para el locatario.',
      inputs: [
        {
          name: 'reason',
          type: 'textarea',
          placeholder: 'Motivo (opcional)',
        },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Rechazar',
          role: 'confirm',
          handler: async (data) => {
            this.loading.set(true);
            try {
              const result = await this.bookingsService.rejectBooking(booking.id, data?.reason);
              if (result.success) {
                const updated = await this.bookingsService.getBookingById(booking.id);
                this.booking.set(updated);

                const successAlert = await this.alertController.create({
                  header: '✅ Reserva Rechazada',
                  message: result.message || 'La reserva fue rechazada.',
                  buttons: ['Entendido'],
                });
                await successAlert.present();
              } else {
                const errorAlert = await this.alertController.create({
                  header: '❌ Error',
                  message: result.error || 'No se pudo rechazar la reserva.',
                  buttons: ['Cerrar'],
                });
                await errorAlert.present();
              }
            } catch {
              const errorAlert = await this.alertController.create({
                header: '❌ Error',
                message: 'Ocurrió un error inesperado al rechazar la reserva.',
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

  // ============================================================================
  // DOWNLOAD CONTRACT PDF
  // ============================================================================
  downloadingContract = signal(false);

  async downloadContract(): Promise<void> {
    const booking = this.booking();
    if (!booking || this.downloadingContract()) return;

    this.downloadingContract.set(true);
    try {
      const contractData: ContractPdfData = {
        booking_id: booking.id,
        booking_reference: booking.reference_code,
        start_date: booking.start_at,
        end_date: booking.end_at,
        days_count: booking.days_count ?? 1,
        contribution_cents: Math.round((booking.total_amount ?? 0) * 100),
        deposit_amount_cents: Math.round((booking.breakdown?.guarantee_cents ?? booking.breakdown?.deposit_cents ?? 0)),
        insurance_cents: booking.breakdown?.insurance_cents ?? 0,
        fees_cents: booking.breakdown?.platform_fee_cents ?? 0,
        total_amount_cents: booking.breakdown?.total_cents ?? Math.round((booking.total_amount ?? 0) * 100),
        currency: (booking.currency as 'USD' | 'ARS' | 'BRL') || 'ARS',
        car: {
          title: `${booking.car_brand} ${booking.car_model}`,
          brand: booking.car_brand ?? '',
          model: booking.car_model ?? '',
          year: booking.car_year ?? new Date().getFullYear(),
          plate: booking.car?.plate ?? '',
          color: booking.car?.color ?? '',
          vin: booking.car?.vin,
          mileage: booking.car?.mileage ?? 0,
          fuel_policy: booking.car?.fuel_policy,
          mileage_limit: booking.car?.mileage_limit ?? undefined,
          extra_km_price: booking.car?.extra_km_price ?? undefined,
        },
        comodatario: {
          full_name: booking.renter_name ?? '',
          gov_id_number: this.renterDni() ?? '',
          driver_license_number: '',
          email: '',
        },
        comodante: {
          full_name: this.carOwnerName(),
          gov_id_number: '',
        },
        pickup_address: booking.pickup_address ?? booking.car?.address,
        dropoff_address: booking.dropoff_address ?? booking.car?.address,
      };

      await this.pdfWorkerService.generateContract(contractData);
    } catch (error) {
      this.logger.error('Error downloading contract:', error);
    } finally {
      this.downloadingContract.set(false);
    }
  }

  // ============================================================================
  // DOWNLOAD INSPECTION PDF
  // ============================================================================
  downloadingInspection = signal(false);

  async downloadInspection(type: 'delivery' | 'return'): Promise<void> {
    const booking = this.booking();
    if (!booking || this.downloadingInspection()) return;

    // Find the appropriate inspection
    const stage = type === 'delivery' ? 'check_in' : 'check_out';
    const inspection = this.inspections().find(i => i.stage === stage || i.stage === 'renter_check_in');

    if (!inspection) {
      alert(`No hay acta de ${type === 'delivery' ? 'entrega' : 'devolución'} disponible`);
      return;
    }

    this.downloadingInspection.set(true);
    try {
      // Convert fuel level number (0-100) to string descriptor
      const fuelLevelNum = inspection.fuelLevel ?? 100;
      let fuelLevelStr = 'full';
      if (fuelLevelNum <= 25) fuelLevelStr = '1/4';
      else if (fuelLevelNum <= 50) fuelLevelStr = '1/2';
      else if (fuelLevelNum <= 75) fuelLevelStr = '3/4';

      const inspectionData: InspectionPdfData = {
        inspection_id: inspection.id,
        booking_id: booking.id,
        type,
        inspection_date: inspection.signedAt?.toISOString() ?? inspection.createdAt?.toISOString() ?? new Date().toISOString(),
        inspector_name: 'AutoRenta',
        comodatario_name: booking.renter_name ?? '',
        comodante_name: this.carOwnerName(),
        car: {
          title: `${booking.car_brand} ${booking.car_model}`,
          plate: booking.car?.plate ?? '',
          mileage_at_inspection: inspection.odometer ?? booking.car?.mileage ?? 0,
          fuel_level: fuelLevelStr,
        },
        checklist: [
          { item: 'Estado general exterior', status: 'ok' },
          { item: 'Estado general interior', status: 'ok' },
          { item: 'Neumáticos', status: 'ok' },
          { item: 'Luces', status: 'ok' },
          { item: 'Documentación', status: 'ok' },
        ],
      };

      await this.pdfWorkerService.generateInspection(inspectionData);
    } catch (error) {
      this.logger.error('Error downloading inspection:', error);
    } finally {
      this.downloadingInspection.set(false);
    }
  }
}

// Types for Renter Verification
type RenterDocumentKind =
  | 'gov_id_front'
  | 'gov_id_back'
  | 'driver_license'
  | 'license_front'
  | 'license_back'
  | 'utility_bill'
  | 'selfie'
  | 'criminal_record';

type RenterDocument = {
  kind: RenterDocumentKind;
  status: 'not_started' | 'pending' | 'verified' | 'rejected';
  created_at: string | null;
  reviewed_at: string | null;
};

type RenterVerification = {
  renter_id: string;
  full_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  gov_id_type: string | null;
  gov_id_number: string | null;
  driver_license_country: string | null;
  driver_license_expiry: string | null;
  driver_license_class: string | null;
  driver_license_professional: boolean | null;
  driver_license_points: number | null;
  email_verified: boolean | null;
  phone_verified: boolean | null;
  id_verified: boolean | null;
  location_verified_at: string | null;
  driver_license_verified_at: string | null;
  driver_class: number | null;
  driver_score: number | null;
  fee_multiplier: number | null;
  guarantee_multiplier: number | null;
  class_description: string | null;
  documents: RenterDocument[];
};

type RenterDocumentStatus = {
  label: string;
  tone: 'success' | 'warning' | 'danger';
};

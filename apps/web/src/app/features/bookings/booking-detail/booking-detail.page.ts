import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { Booking } from '../../../core/models';
import { BookingsService } from '../../../core/services/bookings.service';
import { PaymentsService } from '../../../core/services/payments.service';
import { ReviewsService } from '../../../core/services/reviews.service';
import { AuthService } from '../../../core/services/auth.service';
import { ExchangeRateService } from '../../../core/services/exchange-rate.service';
import { FgoV1_1Service } from '../../../core/services/fgo-v1-1.service';
import { BookingInspection } from '../../../core/models/fgo-v1-1.model';
import { OwnerConfirmationComponent } from '../../../shared/components/owner-confirmation/owner-confirmation.component';
import { RenterConfirmationComponent } from '../../../shared/components/renter-confirmation/renter-confirmation.component';
import { BookingChatComponent } from '../../../shared/components/booking-chat/booking-chat.component';
import { ConfirmAndReleaseResponse } from '../../../core/services/booking-confirmation.service';
import { MetaService } from '../../../core/services/meta.service';
import { InsuranceService } from '../../../core/services/insurance.service';
import { InsuranceClaim, CLAIM_STATUS_LABELS } from '../../../core/models/insurance.model';
import { BookingStatusComponent } from './booking-status.component';
import { ReviewManagementComponent } from './review-management.component';
import { DepositStatusBadgeComponent } from '../../../shared/components/deposit-status-badge/deposit-status-badge.component';
import { DisputeFormComponent } from '../../../shared/components/dispute-form/dispute-form.component';
import { DisputesListComponent } from '../../../shared/components/disputes-list/disputes-list.component';
import { RefundRequestComponent } from '../../../shared/components/refund-request/refund-request.component';
import { BookingContractComponent } from '../../../shared/components/booking-contract/booking-contract.component';
import { RefundStatusComponent } from '../../../shared/components/refund-status/refund-status.component';
import { ShareButtonComponent } from '../../../shared/components/share-button/share-button.component';

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
    ShareButtonComponent,
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
  private readonly metaService = inject(MetaService);
  private readonly exchangeRateService = inject(ExchangeRateService);
  private readonly fgoService = inject(FgoV1_1Service);
  private readonly insuranceService = inject(InsuranceService);

  booking = signal<Booking | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  timeRemaining = signal<string | null>(null);

  readonly bookingFlowSteps = [
    {
      key: 'pending',
      label: 'Solicitud enviada',
      description: 'Estamos esperando la aprobación del anfitrión.',
    },
    {
      key: 'pending_payment',
      label: 'Pago pendiente',
      description: 'Confirma el pago para bloquear las fechas.',
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
      key: 'completed',
      label: 'Check-out y cierre',
      description: 'Inspección final y liberación de fondos.',
    },
  ] as const;

  readonly currentBookingStageIndex = computed(() => {
    const booking = this.booking();
    if (!booking) return 0;
    const idx = this.bookingFlowSteps.findIndex((step) => step.key === booking.status);
    if (idx >= 0) return idx;
    if (booking.status === 'cancelled') {
      return 0;
    }
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

  readonly canCreateDispute = computed(() => {
    const booking = this.booking();
    if (!booking) return false;
    // Can create dispute for active or completed bookings
    return booking.status === 'in_progress' || booking.status === 'completed';
  });

  readonly canRequestRefund = computed(() => {
    const booking = this.booking();
    if (!booking) return false;
    // Can request refund for completed or cancelled bookings
    return booking.status === 'completed' || booking.status === 'cancelled';
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
    } catch (_err) {
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
    } catch (__error) {
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
    } catch (__error) {}
  }

  private async loadInspections(): Promise<void> {
    const booking = this.booking();
    if (!booking) return;

    try {
      const inspections = await firstValueFrom(this.fgoService.getInspections(booking.id));
      this.inspections.set(inspections);
    } catch (__error) {
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
    } catch (__error) {
      // Non-blocking error, claims are optional
    } finally {
      this.loadingClaims.set(false);
    }
  }

  getClaimStatusLabel(status: InsuranceClaim['status']): string {
    return CLAIM_STATUS_LABELS[status];
  }

  getClaimStatusColor(status: InsuranceClaim['status']): string {
    const colorMap = {
      reported: 'orange',
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
}

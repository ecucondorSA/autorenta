import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AlertController, IonicModule, ToastController, ViewWillEnter } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '@core/services/auth/auth.service';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { BookingRealtimeService } from '@core/services/bookings/booking-realtime.service';
import {
  AuthMarketplaceStatus,
  MarketplaceOnboardingService,
} from '@core/services/auth/marketplace-onboarding.service';
import { Message, MessagesService } from '@core/services/bookings/messages.service';
import { Booking } from '../../../core/models';
import { DepositStatusBadgeComponent } from '../../../shared/components/deposit-status-badge/deposit-status-badge.component';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { formatDateRange } from '../../../shared/utils/date.utils';

interface CarLead {
  carId: string;
  carTitle: string;
  participantId: string;
  participantName: string | null;
  lastMessage: Message;
  unreadCount: number;
}

@Component({
  standalone: true,
  selector: 'app-owner-bookings-page',
  imports: [
    CommonModule,
    MoneyPipe,
    RouterLink,
    TranslateModule,
    IonicModule,
    DepositStatusBadgeComponent,
  ],
  templateUrl: './owner-bookings.page.html',
  styleUrl: './owner-bookings.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OwnerBookingsPage implements OnInit, OnDestroy, ViewWillEnter {
  readonly bookings = signal<Booking[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly processingAction = signal<string | null>(null);
  readonly renterContacts = signal<
    Record<string, { name?: string; email?: string; phone?: string }>
  >({});
  readonly carLeads = signal<CarLead[]>([]);
  readonly leadsLoading = signal(false);
  readonly marketplaceStatus = signal<AuthMarketplaceStatus | null>(null);

  /** Count of bookings pending owner approval
   * FIX 2025-12-27: Use separate signal loaded from owner_pending_approvals view
   * to match the actual pending approvals query
   * FIX 2025-12-28: Refresh on ionViewWillEnter to invalidate cache after approvals
   */
  readonly pendingApprovalCount = signal(0);

  /** Count of bookings pending review (post-return confirmation) */
  readonly pendingReviewCount = signal(0);

  private currentUserId: string | null = null;
  private isInitialized = false;

  constructor(
    private readonly bookingsService: BookingsService,
    private readonly alertController: AlertController,
    private readonly toastController: ToastController,
    private readonly messagesService: MessagesService,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly marketplaceService: MarketplaceOnboardingService,
    private readonly bookingRealtimeService: BookingRealtimeService,
  ) {}

  ngOnInit(): void {
    void this.initialize();
  }

  ngOnDestroy(): void {
    this.bookingRealtimeService.unsubscribeUserBookings();
  }

  /**
   * FIX 2025-12-28: Reload data when returning to this page
   * This ensures the pending approval count is refreshed after approving/rejecting
   * on the pending-approval page
   */
  ionViewWillEnter(): void {
    if (this.isInitialized) {
      // Only reload data if already initialized (returning to page)
      void this.loadBookings();
    }
  }

  private async initialize(): Promise<void> {
    try {
      const session = await this.authService.ensureSession();
      this.currentUserId = session?.user?.id ?? null;
      if (this.currentUserId) {
        await this.loadMarketplaceStatus(this.currentUserId);
        // Subscribe to realtime updates for owner bookings
        this.bookingRealtimeService.subscribeToUserBookings(this.currentUserId, 'owner', {
          onBookingsChange: () => {
            void this.loadBookings();
          },
        });
      } else {
        this.marketplaceStatus.set(null);
      }
    } catch {
      this.currentUserId = null;
      this.marketplaceStatus.set(null);
    } finally {
      await this.loadBookings();
      this.isInitialized = true;
    }
  }

  async loadBookings(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.renterContacts.set({});
    try {
      // Load bookings and pending approvals count in parallel
      const [{ bookings }, pendingApprovals] = await Promise.all([
        this.bookingsService.getOwnerBookings(),
        this.bookingsService.getPendingApprovals(),
      ]);

      await this.loadRenterContacts(bookings);
      this.bookings.set(bookings);

      // FIX 2025-12-27: Use actual pending approvals count from view
      // This matches what pending-approval page shows
      this.pendingApprovalCount.set(pendingApprovals.length);

      // Count pending review bookings
      const pendingReviewBookings = bookings.filter((b) => this.isPendingReview(b));
      this.pendingReviewCount.set(pendingReviewBookings.length);

      await this.loadCarLeads();
    } catch {
      this.error.set('No pudimos cargar las reservas. Por favor intentá de nuevo más tarde.');
    } finally {
      this.loading.set(false);
    }
  }

  rangeLabel(booking: Booking): string {
    return formatDateRange(booking.start_at, booking.end_at);
  }

  statusLabel(booking: Booking): string {
    switch (booking.status) {
      case 'pending':
        // Distinguish between approval flow (payment_mode set) vs payment flow
        return booking.payment_mode ? 'Esperando tu aprobación' : 'Pendiente de pago';
      case 'pending_review':
        return 'En revisión';
      case 'confirmed':
        return 'Confirmada';
      case 'in_progress':
        // FIX: Consider completion_status for detailed status
        if (booking.completion_status === 'pending_owner' || booking.completion_status === 'pending_both') {
          return 'Confirmar devolución';
        }
        if (booking.completion_status === 'returned') {
          return 'Inspección pendiente';
        }
        if (booking.completion_status === 'pending_renter') {
          return 'Esperando al locatario';
        }
        return 'En curso';
      case 'completed':
        return 'Finalizada';
      case 'cancelled':
        return 'Cancelada';
      case 'expired':
        return 'Vencida';
      default:
        return booking.status;
    }
  }

  statusHint(booking: Booking): string | null {
    switch (booking.status) {
      case 'pending':
        // Distinguish between approval flow vs payment flow
        return booking.payment_mode
          ? 'El locatario está esperando tu aprobación.'
          : 'El locatario debe completar el pago.';
      case 'pending_review':
        return 'Confirmá la devolución del auto para liberar los fondos.';
      case 'confirmed':
        return 'Coordiná la entrega del auto con el locatario.';
      case 'in_progress':
        // FIX: Consider completion_status for detailed hint
        if (booking.completion_status === 'pending_owner' || booking.completion_status === 'pending_both') {
          return 'El locatario devolvió el auto. Ingresá al detalle para confirmar.';
        }
        if (booking.completion_status === 'returned') {
          return 'Revisá el vehículo e ingresá al detalle para confirmar la recepción.';
        }
        if (booking.completion_status === 'pending_renter') {
          return 'Tu confirmación fue registrada. Esperando al locatario.';
        }
        return 'El auto está siendo utilizado.';
      case 'completed':
        return 'Alquiler finalizado correctamente.';
      case 'cancelled':
        return 'Esta reserva fue cancelada.';
      default:
        return null;
    }
  }

  statusBadgeClass(booking: Booking): string {
    switch (booking.status) {
      case 'pending':
        return 'badge-warning';
      case 'pending_review':
        return 'badge-info';
      case 'confirmed':
        return 'badge-success';
      case 'in_progress':
        return 'badge-info';
      case 'completed':
        return 'badge-neutral';
      case 'cancelled':
      case 'expired':
        return 'badge-danger';
      default:
        return 'badge-neutral';
    }
  }

  statusIcon(booking: Booking): string {
    switch (booking.status) {
      case 'pending':
        return '⏳';
      case 'pending_review':
        return '🔍';
      case 'confirmed':
        return '✅';
      case 'in_progress':
        return '🚗';
      case 'completed':
        return '🏁';
      case 'cancelled':
      case 'expired':
        return '❌';
      default:
        return 'ℹ️';
    }
  }

  // ✅ NUEVO: Acciones del locador
  canDoOwnerCheckIn(booking: Booking): boolean {
    // Check-in cuando está confirmed y llega la fecha
    return booking.status === 'confirmed' && new Date(booking.start_at) <= new Date();
  }

  canDoOwnerCheckOut(booking: Booking): boolean {
    // Check-out cuando está in_progress
    return booking.status === 'in_progress';
  }

  canCompleteRental(booking: Booking): boolean {
    return booking.status === 'in_progress';
  }

  canCancelBooking(booking: Booking): boolean {
    return booking.status === 'pending' || booking.status === 'confirmed';
  }

  canOpenDispute(booking: Booking): boolean {
    // An owner can open a dispute if the booking is completed or in_progress,
    // and there isn't an active dispute already.
    const validStatusForDispute = ['completed', 'in_progress'].includes(booking.status);

    // Check if a dispute is already open or in review
    const existingDisputeActive = booking.dispute_status && ['open', 'in_review'].includes(booking.dispute_status);

    return validStatusForDispute && !existingDisputeActive;
  }

  async onCompleteRental(bookingId: string): Promise<void> {
    // Redirect owner to proper check-out flow (inspection + confirmation)
    this.router.navigate(['/bookings', bookingId, 'owner-check-out']);
  }

  async onCancelBooking(bookingId: string): Promise<void> {
    const confirmed = await this.presentConfirmation({
      header: 'Cancelar reserva',
      message: 'Esta acción cancelará la reserva actual. ¿Deseás continuar?',
      confirmText: 'Cancelar reserva',
      confirmColor: 'danger',
    });
    if (!confirmed) return;

    this.processingAction.set(bookingId);
    try {
      await this.bookingsService.cancelBooking(bookingId, false);
      await this.loadBookings();
      await this.presentToast('Reserva cancelada');
    } catch (error) {
      console.error('Error cancelling booking:', error);
      await this.presentToast('Error al cancelar la reserva', 'danger');
    } finally {
      this.processingAction.set(null);
    }
  }

  renterDisplayName(booking: Booking): string {
    const contact = this.renterContacts()[booking.id];
    return contact?.name || contact?.email || booking.renter_id || 'Locatario';
  }

  renterEmail(booking: Booking): string | null {
    const contact = this.renterContacts()[booking.id];
    return contact?.email ?? null;
  }

  renterPhone(booking: Booking): string | null {
    const contact = this.renterContacts()[booking.id];
    return contact?.phone ?? null;
  }

  async loadCarLeads(): Promise<void> {
    if (!this.currentUserId) {
      this.carLeads.set([]);
      return;
    }

    this.leadsLoading.set(true);

    try {
      const rows = await this.messagesService.listCarLeadsForOwner(this.currentUserId);

      const threads = new Map<
        string,
        {
          carId: string;
          carTitle: string;
          participantId: string;
          lastMessage: Message;
          unreadCount: number;
        }
      >();

      for (const row of rows) {
        if (!row.car?.id) {
          continue;
        }

        const key = `${row.car.id}:${row.otherUserId}`;
        const existing = threads.get(key);
        const isUnread = row.message.recipient_id === this.currentUserId && !row.message.read_at;

        if (!existing) {
          threads.set(key, {
            carId: row.car.id,
            carTitle: row.car.title ?? 'Auto sin título',
            participantId: row.otherUserId,
            lastMessage: row.message,
            unreadCount: isUnread ? 1 : 0,
          });
        } else {
          const existingDate = new Date(existing.lastMessage.created_at).getTime();
          const currentDate = new Date(row.message.created_at).getTime();

          if (currentDate > existingDate) {
            existing.lastMessage = row.message;
          }

          if (isUnread) {
            existing.unreadCount += 1;
          }
        }
      }

      const leadsOrdered = Array.from(threads.values()).sort((a, b) => {
        const aDate = new Date(a.lastMessage.created_at).getTime();
        const bDate = new Date(b.lastMessage.created_at).getTime();
        return bDate - aDate;
      });

      const enriched = await Promise.all(
        leadsOrdered.map(async (lead) => {
          let participantName: string | null = null;

          try {
            const contact = await this.bookingsService.getOwnerContact(lead.participantId);
            if (contact.success) {
              participantName = contact.name || contact.email || null;
            }
          } catch {
            // Silently ignore error, participant name is optional
          }

          return {
            ...lead,
            participantName,
          };
        }),
      );

      this.carLeads.set(enriched);
    } catch (error) {
      console.error('Error loading car leads:', error);
    } finally {
      this.leadsLoading.set(false);
    }
  }

  async openCarChat(lead: CarLead): Promise<void> {
    await this.router.navigate(['/messages'], {
      queryParams: {
        carId: lead.carId,
        userId: lead.participantId,
        carName: lead.carTitle,
        userName: lead.participantName ?? 'Usuario',
      },
    });
  }

  goToPendingApprovals(): void {
    void this.router.navigate(['/bookings/pending-approval']);
  }

  goToPendingReviews(): void {
    void this.router.navigate(['/bookings/pending-review']);
  }

  /**
   * Check if booking is in pending review status (post-return confirmation)
   */
  isPendingReview(booking: Booking): boolean {
    return booking.status === 'pending_review';
  }

  private async loadMarketplaceStatus(userId: string): Promise<void> {
    try {
      const status = await this.marketplaceService.getMarketplaceStatus(userId);
      this.marketplaceStatus.set(status);
    } catch {
      this.marketplaceStatus.set(null);
    }
  }

  private async loadRenterContacts(bookings: Booking[]): Promise<void> {
    const contacts: Record<string, { name?: string; email?: string; phone?: string }> = {};

    await Promise.all(
      bookings.map(async (booking) => {
        if (!booking?.id || !booking?.renter_id) {
          return;
        }

        try {
          const contact = await this.bookingsService.getOwnerContact(booking.renter_id);
          if (contact.success) {
            contacts[booking.id] = {
              name: contact.name,
              email: contact.email,
              phone: contact.phone,
            };
          } else {
            // No action needed if contact is not found
          }
        } catch {
          // Silently ignore errors
        }
      }),
    );

    this.renterContacts.set(contacts);
  }

  private async presentConfirmation(options: {
    header: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmColor?: 'primary' | 'danger';
  }): Promise<boolean> {
    const alert = await this.alertController.create({
      header: options.header,
      message: options.message,
      buttons: [
        {
          text: options.cancelText ?? 'Volver',
          role: 'cancel',
        },
        {
          text: options.confirmText ?? 'Confirmar',
          role: 'confirm',
          cssClass: options.confirmColor === 'danger' ? 'alert-button-danger' : undefined,
        },
      ],
    });

    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'confirm';
  }

  private async presentToast(
    message: string,
    color: 'success' | 'danger' | 'warning' = 'success',
  ): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      position: 'top',
      color,
    });
    await toast.present();
  }
}

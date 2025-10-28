import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { BookingsService } from '../../../core/services/bookings.service';
import { Booking } from '../../../core/models';
import { formatDateRange } from '../../../shared/utils/date.utils';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { MessagesService, Message } from '../../../core/services/messages.service';
import { AuthService } from '../../../core/services/auth.service';
import { MarketplaceOnboardingService, MarketplaceStatus } from '../../../core/services/marketplace-onboarding.service';

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
  imports: [CommonModule, MoneyPipe, RouterLink, TranslateModule, IonicModule],
  templateUrl: './owner-bookings.page.html',
  styleUrl: './owner-bookings.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})

export class OwnerBookingsPage implements OnInit {
  readonly bookings = signal<Booking[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly processingAction = signal<string | null>(null);
  readonly renterContacts = signal<
    Record<string, { name?: string; email?: string; phone?: string }>
  >({});
  readonly carLeads = signal<CarLead[]>([]);
  readonly leadsLoading = signal(false);
  readonly marketplaceStatus = signal<MarketplaceStatus | null>(null);

  private currentUserId: string | null = null;

  constructor(
    private readonly bookingsService: BookingsService,
    private readonly alertController: AlertController,
    private readonly toastController: ToastController,
    private readonly messagesService: MessagesService,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly marketplaceService: MarketplaceOnboardingService,
  ) {}

  ngOnInit(): void {
    void this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const session = await this.authService.ensureSession();
      this.currentUserId = session?.user?.id ?? null;
      if (this.currentUserId) {
        await this.loadMarketplaceStatus(this.currentUserId);
      } else {
        this.marketplaceStatus.set(null);
      }
    } catch (error) {
      console.warn('[OwnerBookings] No se pudo obtener la sesión del usuario', error);
      this.currentUserId = null;
      this.marketplaceStatus.set(null);
    } finally {
      await this.loadBookings();
    }
  }

  async loadBookings(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.renterContacts.set({});
    try {
      // ✅ NUEVO: Obtener reservas de AUTOS DEL LOCADOR
      const items = await this.bookingsService.getOwnerBookings();
      await this.loadRenterContacts(items);
      this.bookings.set(items);
      await this.loadCarLeads();
    } catch (err) {
      console.error('getOwnerBookings error', err);
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
        return 'Pendiente de confirmación';
      case 'confirmed':
        return 'Confirmada';
      case 'in_progress':
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
        return 'El locatario debe completar el pago.';
      case 'confirmed':
        return 'Coordiná la entrega del auto con el locatario.';
      case 'in_progress':
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
  canStartRental(booking: Booking): boolean {
    return booking.status === 'confirmed';
  }

  canCompleteRental(booking: Booking): boolean {
    return booking.status === 'in_progress';
  }

  canCancelBooking(booking: Booking): boolean {
    return booking.status === 'pending' || booking.status === 'confirmed';
  }

  async onStartRental(bookingId: string): Promise<void> {
    const confirmed = await this.presentConfirmation({
      header: 'Iniciar alquiler',
      message: 'Confirmá que el locatario recibió el auto.',
      confirmText: 'Iniciar',
    });
    if (!confirmed) return;

    this.processingAction.set(bookingId);
    try {
      await this.bookingsService.updateBooking(bookingId, { status: 'in_progress' });
      await this.loadBookings();
      await this.presentToast('Alquiler iniciado correctamente');
    } catch (error) {
      console.error('Error starting rental:', error);
      await this.presentToast('Error al iniciar el alquiler', 'danger');
    } finally {
      this.processingAction.set(null);
    }
  }

  async onCompleteRental(bookingId: string): Promise<void> {
    const confirmed = await this.presentConfirmation({
      header: 'Finalizar alquiler',
      message: 'Confirmá que el locatario devolvió el auto en buen estado.',
      confirmText: 'Finalizar',
    });
    if (!confirmed) return;

    this.processingAction.set(bookingId);
    try {
      await this.bookingsService.updateBooking(bookingId, { status: 'completed' });
      await this.loadBookings();
      await this.presentToast('Alquiler finalizado correctamente');
    } catch (error) {
      console.error('Error completing rental:', error);
      await this.presentToast('Error al finalizar el alquiler', 'danger');
    } finally {
      this.processingAction.set(null);
    }
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
        const isUnread =
          row.message.recipient_id === this.currentUserId && !row.message.read_at;

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
          } catch (err) {
            console.warn('[OwnerBookings] No se pudo obtener datos del contacto', err);
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

  private async loadMarketplaceStatus(userId: string): Promise<void> {
    try {
      const status = await this.marketplaceService.getMarketplaceStatus(userId);
      this.marketplaceStatus.set(status);
    } catch (error) {
      console.error('[OwnerBookings] Error cargando estado de marketplace:', error);
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
            console.warn('No se pudo cargar contacto del locatario:', contact.error);
          }
        } catch (error) {
          console.error('Error fetching renter contact info:', error);
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

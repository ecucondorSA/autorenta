import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BookingsService } from '../../../core/services/bookings.service';
import { ToastService } from '../../../core/services/toast.service';

interface PendingApproval {
  booking_id: string;
  car_id: string;
  car_name: string;
  car_year: number;
  renter_id: string;
  start_at: string;
  end_at: string;
  total_amount: number;
  currency: string;
  booking_created_at: string;
  approval_expires_at: string;
  hours_remaining: number;
  days_count: number;
}

@Component({
  selector: 'app-pending-approval',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule],
  templateUrl: './pending-approval.page.html',
  styleUrl: './pending-approval.page.scss',
})
export class PendingApprovalPage implements OnInit {
  private readonly bookingsService = inject(BookingsService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly pendingBookings = signal<PendingApproval[]>([]);
  readonly processingBookingId = signal<string | null>(null);
  readonly showRejectModal = signal(false);
  readonly selectedBookingId = signal<string | null>(null);
  readonly rejectionReason = signal('');

  readonly hasBookings = computed(() => this.pendingBookings().length > 0);

  readonly rejectionReasons = [
    { value: 'dates_not_available', label: 'Fechas no disponibles' },
    { value: 'maintenance_required', label: 'Auto requiere mantenimiento' },
    { value: 'requirements_not_met', label: 'No cumple requisitos' },
    { value: 'other', label: 'Otra razón' },
  ];

  async ngOnInit() {
    await this.loadPendingApprovals();

    // Auto-refresh cada 30 segundos
    setInterval(() => {
      if (!this.processingBookingId()) {
        this.loadPendingApprovals();
      }
    }, 30000);
  }

  async loadPendingApprovals() {
    try {
      this.loading.set(true);
      const bookings = await this.bookingsService.getPendingApprovals();
      this.pendingBookings.set(bookings as unknown as PendingApproval[]);
    } catch (error) {
      this.toastService.error('Error al cargar reservas pendientes');
    } finally {
      this.loading.set(false);
    }
  }

  async onApprove(bookingId: string) {
    if (this.processingBookingId()) return;

    const confirmed = confirm(
      '¿Estás seguro de aprobar esta reserva? El pago se procesará y la reserva quedará confirmada.',
    );
    if (!confirmed) return;

    this.processingBookingId.set(bookingId);

    try {
      const result = await this.bookingsService.approveBooking(bookingId);

      if (result.success) {
        this.toastService.success('✅ Reserva aprobada exitosamente');
        await this.loadPendingApprovals();
      } else {
        this.toastService.error(`Error: ${result.error}`);
      }
    } catch (error: unknown) {
      this.toastService.error('Error al aprobar reserva');
    } finally {
      this.processingBookingId.set(null);
    }
  }

  onRejectClick(bookingId: string) {
    this.selectedBookingId.set(bookingId);
    this.rejectionReason.set('');
    this.showRejectModal.set(true);
  }

  async onConfirmReject() {
    const bookingId = this.selectedBookingId();
    const reason = this.rejectionReason();

    if (!bookingId || !reason) {
      this.toastService.warning('Por favor selecciona una razón');
      return;
    }

    this.processingBookingId.set(bookingId);
    this.showRejectModal.set(false);

    try {
      const result = await this.bookingsService.rejectBooking(bookingId, reason);

      if (result.success) {
        this.toastService.success('✅ Reserva rechazada. Se notificará al cliente.');
        await this.loadPendingApprovals();
      } else {
        this.toastService.error(`Error: ${result.error}`);
      }
    } catch (error: unknown) {
      this.toastService.error('Error al rechazar reserva');
    } finally {
      this.processingBookingId.set(null);
      this.selectedBookingId.set(null);
    }
  }

  onCancelReject() {
    this.showRejectModal.set(false);
    this.selectedBookingId.set(null);
    this.rejectionReason.set('');
  }

  getUrgencyClass(hoursRemaining: number): string {
    if (hoursRemaining < 4) return 'urgent';
    if (hoursRemaining < 12) return 'warning';
    return 'normal';
  }

  formatTimeRemaining(hoursRemaining: number): string {
    if (hoursRemaining < 0) return 'Expirado';
    if (hoursRemaining < 1) return `${Math.floor(hoursRemaining * 60)} min`;
    if (hoursRemaining < 24) return `${Math.floor(hoursRemaining)}h`;
    return `${Math.floor(hoursRemaining / 24)}d ${Math.floor(hoursRemaining % 24)}h`;
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  navigateToBooking(bookingId: string) {
    this.router.navigate(['/bookings/owner', bookingId]);
  }
}

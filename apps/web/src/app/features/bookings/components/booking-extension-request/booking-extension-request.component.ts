import { Component, OnInit, inject, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookingsService } from '../../../../core/services/bookings.service';
import { NotificationManagerService } from '../../../../core/services/notification-manager.service';
import { Booking } from '../../../../core/models';

@Component({
  selector: 'app-booking-extension-request',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './booking-extension-request.component.html',
  styleUrls: ['./booking-extension-request.component.css']
})
export class BookingExtensionRequestComponent implements OnInit {
  private readonly bookingsService = inject(BookingsService);
  private readonly toastService = inject(NotificationManagerService);

  readonly booking = input.required<Booking>();
  readonly requestHandled = output<void>(); // Evento para notificar al padre que la solicitud fue manejada

  readonly loading = signal(false);

  readonly extensionDays = computed(() => {
    const b = this.booking();
    if (!b.extension_new_end_date || !b.end_at) return 0;
    const newEnd = new Date(b.extension_new_end_date).getTime();
    const originalEnd = new Date(b.end_at).getTime();
    return Math.ceil((newEnd - originalEnd) / (1000 * 60 * 60 * 24));
  });

  async ngOnInit(): Promise<void> {
    // Initialization logic if needed
  }

  async approveExtension(): Promise<void> {
    if (!confirm('¿Estás seguro de que quieres APROBAR esta extensión de reserva?')) {
      return;
    }

    this.loading.set(true);
    try {
      const result = await this.bookingsService.approveExtensionRequest(this.booking().id);
      if (result.success) {
        this.toastService.success('Extensión Aprobada', 'La reserva se ha extendido y el pago ha sido procesado.');
        this.requestHandled.emit(); // Notificar al componente padre
      } else {
        this.toastService.error('Error al Aprobar', result.error || 'No se pudo aprobar la extensión.');
      }
    } catch (error) {
      console.error('Error approving extension:', error);
      this.toastService.error('Error', 'Ocurrió un error al procesar la aprobación.');
    } finally {
      this.loading.set(false);
    }
  }

  async rejectExtension(): Promise<void> {
    const reason = prompt('¿Por qué quieres RECHAZAR esta extensión?');
    if (reason === null) return; // User cancelled prompt
    if (!reason.trim()) {
      this.toastService.warning('Razón requerida', 'Debes proporcionar una razón para rechazar la extensión.');
      return;
    }
    
    if (!confirm('¿Estás seguro de que quieres RECHAZAR esta extensión de reserva?')) {
      return;
    }

    this.loading.set(true);
    try {
      const result = await this.bookingsService.rejectExtensionRequest(this.booking().id, reason);
      if (result.success) {
        this.toastService.success('Extensión Rechazada', 'La solicitud de extensión ha sido rechazada.');
        this.requestHandled.emit(); // Notificar al componente padre
      } else {
        this.toastService.error('Error al Rechazar', result.error || 'No se pudo rechazar la extensión.');
      }
    } catch (error) {
      console.error('Error rejecting extension:', error);
      this.toastService.error('Error', 'Ocurrió un error al procesar el rechazo.');
    } finally {
      this.loading.set(false);
    }
  }
}

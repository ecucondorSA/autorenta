import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WaitlistService, WaitlistEntry } from '../../../../core/services/waitlist.service';

@Component({
  standalone: true,
  selector: 'app-waitlist-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './waitlist.page.html',
  styleUrls: ['./waitlist.page.css'],
})
export class WaitlistPage implements OnInit {
  readonly waitlistEntries = signal<WaitlistEntry[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly cancelling = signal<string | null>(null); // ID being cancelled

  constructor(private readonly waitlistService: WaitlistService) {}

  async ngOnInit(): Promise<void> {
    await this.loadWaitlist();
  }

  async loadWaitlist(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const entries = await this.waitlistService.getMyWaitlist();
      this.waitlistEntries.set(entries);
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : 'Error al cargar lista de espera'
      );
    } finally {
      this.loading.set(false);
    }
  }

  async cancelEntry(waitlistId: string): Promise<void> {
    if (!confirm('¿Estás seguro de que quieres cancelar esta entrada de la lista de espera?')) {
      return;
    }

    this.cancelling.set(waitlistId);

    try {
      const result = await this.waitlistService.removeFromWaitlist(waitlistId);

      if (result.success) {
        // Remove from list
        this.waitlistEntries.set(
          this.waitlistEntries().filter((entry) => entry.id !== waitlistId)
        );
      } else {
        this.error.set(result.error || 'Error al cancelar entrada');
      }
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : 'Error al cancelar entrada'
      );
    } finally {
      this.cancelling.set(null);
    }
  }

  getCarDetailLink(entry: WaitlistEntry): string {
    return `/cars/${entry.car_id}?start=${entry.start_date}&end=${entry.end_date}`;
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'active':
        return 'badge-active';
      case 'notified':
        return 'badge-notified';
      case 'expired':
        return 'badge-expired';
      case 'cancelled':
        return 'badge-cancelled';
      default:
        return 'badge-default';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'active':
        return 'Activa';
      case 'notified':
        return 'Notificado';
      case 'expired':
        return 'Expirada';
      case 'cancelled':
        return 'Cancelada';
      default:
        return status;
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  getDaysInWaitlist(createdAt: string): number {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
}

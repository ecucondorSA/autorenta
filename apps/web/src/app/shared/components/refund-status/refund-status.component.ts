import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject, signal, computed } from '@angular/core';
import { RefundService } from '../../../core/services/refund.service';

@Component({
  selector: 'app-refund-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './refund-status.component.html',
})
export class RefundStatusComponent implements OnInit {
  @Input({ required: true }) bookingId!: string;

  private readonly refundService = inject(RefundService);

  readonly refundStatus = signal<{
    has_refund: boolean;
    refund_id?: string;
    refund_amount?: number;
    refund_status?: string;
    refund_date?: string;
  } | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Computed signal for template usage
  readonly displayStatus = computed(() => {
    if (this.loading()) return null;
    if (this.error()) return null;
    return this.refundStatus();
  });

  async ngOnInit(): Promise<void> {
    await this.loadStatus();
  }

  async loadStatus(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const status = await this.refundService.getRefundStatus(this.bookingId);
      this.refundStatus.set(status);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      this.loading.set(false);
    }
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      approved: 'Aprobado',
      rejected: 'Rechazado',
      processing: 'Procesando',
      completed: 'Completado',
    };
    return labels[status] || status;
  }
}


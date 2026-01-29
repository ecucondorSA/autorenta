import { Component, Input, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { RefundService } from '@core/services/payments/refund.service';

@Component({
  selector: 'app-refund-status',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    @if (loading()) {
      <div class="flex items-center justify-center py-4">
        <div
          class="h-6 w-6 animate-spin rounded-full border-2 border-cta-default border-t-transparent"
        ></div>
      </div>
    } @else if (refundStatus(); as status) {
      @if (status.has_refund) {
        <div class="rounded-lg border border-border-default bg-surface-raised p-4 shadow-sm">
          <div class="mb-3 flex items-center justify-between">
            <h4 class="text-sm font-semibold text-text-primary">Estado del Reembolso</h4>
            <span
              class="rounded-full px-2 py-1 text-xs font-medium"
              [class.bg-success-light/20]="status.refund_status === 'approved'"
              [class.text-success-strong]="status.refund_status === 'approved'"
              [class.bg-warning-bg-hover]="status.refund_status === 'pending'"
              [class.text-warning-strong]="status.refund_status === 'pending'"
              [class.bg-error-bg-hover]="status.refund_status === 'rejected'"
              [class.text-error-strong]="status.refund_status === 'rejected'"
            >
              {{ getStatusLabel(status.refund_status || 'pending') }}
            </span>
          </div>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-text-secondary">ID de Reembolso:</span>
              <span class="font-mono text-text-primary">{{ status.refund_id }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-text-secondary">Monto:</span>
              <span class="font-semibold text-text-primary">{{
                formatCurrency(status.refund_amount || 0)
              }}</span>
            </div>
            @if (status.refund_date) {
              <div class="flex justify-between">
                <span class="text-text-secondary">Fecha:</span>
                <span class="text-text-primary">{{ formatDate(status.refund_date) }}</span>
              </div>
            }
          </div>
        </div>
      } @else {
        <div
          class="rounded-lg border border-border-default bg-surface-base p-4 text-center text-sm text-text-secondary"
        >
          No hay reembolso registrado para esta reserva.
        </div>
      }
    }
    @if (error()) {
      <div class="rounded-lg bg-error-bg p-4 text-sm text-error-strong">
        {{ error() }}
      </div>
    }
  `,
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

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleString('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }
}

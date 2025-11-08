import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { RefundService } from '../../../core/services/refund.service';

@Component({
  selector: 'app-refund-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (loading()) {
      <div class="flex items-center justify-center py-4">
        <div class="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
      </div>
    } @else if (refundStatus(); as status) {
      @if (status.has_refund) {
        <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div class="mb-3 flex items-center justify-between">
            <h4 class="text-sm font-semibold text-gray-900">Estado del Reembolso</h4>
            <span
              class="rounded-full px-2 py-1 text-xs font-medium"
              [class.bg-green-100]="status.refund_status === 'approved'"
              [class.text-green-800]="status.refund_status === 'approved'"
              [class.bg-yellow-100]="status.refund_status === 'pending'"
              [class.text-yellow-800]="status.refund_status === 'pending'"
              [class.bg-red-100]="status.refund_status === 'rejected'"
              [class.text-red-800]="status.refund_status === 'rejected'"
            >
              {{ getStatusLabel(status.refund_status || 'pending') }}
            </span>
          </div>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">ID de Reembolso:</span>
              <span class="font-mono text-gray-900">{{ status.refund_id }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Monto:</span>
              <span class="font-semibold text-gray-900">${{ status.refund_amount | number: '1.2-2' }}</span>
            </div>
            @if (status.refund_date) {
              <div class="flex justify-between">
                <span class="text-gray-600">Fecha:</span>
                <span class="text-gray-900">{{ status.refund_date | date: 'short' }}</span>
              </div>
            }
          </div>
        </div>
      } @else {
        <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-600">
          No hay reembolso registrado para esta reserva.
        </div>
      }
    } @else if (error()) {
      <div class="rounded-lg bg-red-50 p-4 text-sm text-red-800">
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
}


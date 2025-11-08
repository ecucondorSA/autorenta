import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AdminService } from '@core/services/admin.service';
import { RefundRequest, RefundStatus, Booking, RefundDestination } from '@core/models';
import { MoneyPipe } from '@shared/pipes/money.pipe';
import { TranslateModule } from '@ngx-translate/core';

interface RefundFormData {
  bookingId: string;
  amount: number;
  destination: RefundDestination;
  reason: string;
}

@Component({
  selector: 'autorenta-admin-refunds-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MoneyPipe, TranslateModule],
  templateUrl: './admin-refunds.page.html',
  styleUrl: './admin-refunds.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminRefundsPage implements OnInit {
  private readonly adminService = inject(AdminService);

  // State signals
  private readonly refundRequestsSignal = signal<RefundRequest[]>([]);
  private readonly loadingSignal = signal<boolean>(true);
  private readonly filterStatusSignal = signal<RefundStatus | ''>('');
  private readonly selectedRefundSignal = signal<RefundRequest | null>(null);
  private readonly searchQuerySignal = signal<string>('');
  private readonly searchResultsSignal = signal<
    Array<Booking & { can_refund: boolean; refund_eligible_amount: number }>
  >([]);
  private readonly searchingSignal = signal<boolean>(false);
  private readonly processingSignal = signal<boolean>(false);

  // Form state
  private readonly showNewRefundModalSignal = signal<boolean>(false);
  private readonly refundFormSignal = signal<RefundFormData>({
    bookingId: '',
    amount: 0,
    destination: 'wallet',
    reason: '',
  });

  // Computed values
  readonly refundRequests = computed(() => this.refundRequestsSignal());
  readonly loading = computed(() => this.loadingSignal());
  readonly filterStatus = computed(() => this.filterStatusSignal());
  readonly selectedRefund = computed(() => this.selectedRefundSignal());
  readonly searchQuery = computed(() => this.searchQuerySignal());
  readonly searchResults = computed(() => this.searchResultsSignal());
  readonly searching = computed(() => this.searchingSignal());
  readonly processing = computed(() => this.processingSignal());
  readonly showNewRefundModal = computed(() => this.showNewRefundModalSignal());
  readonly refundForm = computed(() => this.refundFormSignal());

  readonly pendingCount = computed(
    () => this.refundRequestsSignal().filter((r) => r.status === 'pending').length,
  );

  readonly totalPendingAmount = computed(() =>
    this.refundRequestsSignal()
      .filter((r) => r.status === 'pending')
      .reduce((sum, r) => sum + r.refund_amount, 0),
  );

  readonly completedToday = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.refundRequestsSignal().filter(
      (r) => r.status === 'completed' && r.completed_at?.startsWith(today),
    ).length;
  });

  async ngOnInit(): Promise<void> {
    await this.loadRefundRequests();
  }

  async loadRefundRequests(): Promise<void> {
    this.loadingSignal.set(true);
    try {
      const status = this.filterStatusSignal();
      const refunds = await this.adminService.listRefundRequests(status || undefined);
      this.refundRequestsSignal.set(refunds);
    } catch (__error) {
      this.refundRequestsSignal.set([]);
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async filterByStatus(status: RefundStatus | ''): Promise<void> {
    this.filterStatusSignal.set(status);
    await this.loadRefundRequests();
  }

  selectRefund(refund: RefundRequest): void {
    this.selectedRefundSignal.set(refund);
  }

  closeDetailModal(): void {
    this.selectedRefundSignal.set(null);
  }

  // ============================================
  // NEW REFUND WORKFLOW
  // ============================================

  openNewRefundModal(): void {
    this.showNewRefundModalSignal.set(true);
    this.searchQuerySignal.set('');
    this.searchResultsSignal.set([]);
    this.refundFormSignal.set({
      bookingId: '',
      amount: 0,
      destination: 'wallet',
      reason: '',
    });
  }

  closeNewRefundModal(): void {
    this.showNewRefundModalSignal.set(false);
  }

  updateSearchQuery(query: string): void {
    this.searchQuerySignal.set(query);
  }

  async searchBookings(): Promise<void> {
    const query = this.searchQuerySignal();
    if (!query || query.length < 3) {
      alert('Ingrese al menos 3 caracteres para buscar');
      return;
    }

    this.searchingSignal.set(true);
    try {
      const results = await this.adminService.searchBookingsForRefund(query);
      this.searchResultsSignal.set(results);
    } catch (error) {
      alert('Error buscando bookings: ' + (error as Error).message);
      this.searchResultsSignal.set([]);
    } finally {
      this.searchingSignal.set(false);
    }
  }

  selectBookingForRefund(booking: Booking & { refund_eligible_amount: number }): void {
    this.refundFormSignal.set({
      bookingId: booking.id,
      amount: booking.refund_eligible_amount,
      destination: 'wallet',
      reason: '',
    });
  }

  updateRefundAmount(amount: number): void {
    const current = this.refundFormSignal();
    this.refundFormSignal.set({ ...current, amount });
  }

  updateRefundDestination(destination: RefundDestination): void {
    const current = this.refundFormSignal();
    this.refundFormSignal.set({ ...current, destination });
  }

  updateRefundReason(reason: string): void {
    const current = this.refundFormSignal();
    this.refundFormSignal.set({ ...current, reason });
  }

  async submitRefund(): Promise<void> {
    const form = this.refundFormSignal();

    if (!form.bookingId) {
      alert('Debe seleccionar un booking');
      return;
    }

    if (form.amount <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }

    if (!form.reason || form.reason.trim().length === 0) {
      alert('Debe ingresar un motivo para el reembolso');
      return;
    }

    // Confirmation dialog
    const confirmMessage = `¿Confirmar reembolso de $${form.amount} a ${
      form.destination === 'wallet' ? 'wallet (instantáneo)' : 'método de pago original (2-5 días)'
    }?\n\nMotivo: ${form.reason}`;

    if (!confirm(confirmMessage)) {
      return;
    }

    this.processingSignal.set(true);
    try {
      const result = await this.adminService.processRefund({
        booking_id: form.bookingId,
        refund_amount: form.amount,
        destination: form.destination,
        reason: form.reason,
      });

      alert(result.message);
      this.closeNewRefundModal();
      await this.loadRefundRequests();
    } catch (error) {
      alert('Error procesando reembolso: ' + (error as Error).message);
    } finally {
      this.processingSignal.set(false);
    }
  }

  // ============================================
  // UTILITIES
  // ============================================

  getStatusBadgeClass(status: RefundStatus): string {
    const classes: Record<RefundStatus, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      processing: 'bg-indigo-100 text-indigo-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      rejected: 'bg-gray-100 text-gray-800',
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  getStatusText(status: RefundStatus): string {
    const texts: Record<RefundStatus, string> = {
      pending: 'Pendiente',
      approved: 'Aprobado',
      processing: 'Procesando',
      completed: 'Completado',
      failed: 'Fallido',
      rejected: 'Rechazado',
    };
    return texts[status] || status;
  }

  getDestinationText(destination: string): string {
    return destination === 'wallet' ? 'Wallet (Instantáneo)' : 'Método de Pago Original';
  }

  formatDate(date: string | null | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  exportToCSV(): void {
    const rows = this.refundRequestsSignal().map((r) => ({
      fecha: this.formatDate(r.created_at),
      booking_id: r.booking_id,
      usuario: r.user_name || 'N/A',
      email: r.user_email || 'N/A',
      monto: r.refund_amount,
      destino: r.destination,
      estado: r.status,
      procesado: this.formatDate(r.processed_at),
      completado: this.formatDate(r.completed_at),
    }));

    const headers = Object.keys(rows[0] || {}).join(',');
    const csvContent = [
      headers,
      ...rows.map((row) =>
        Object.values(row)
          .map((v) => (typeof v === 'string' && v.includes(',') ? `"${v}"` : v))
          .join(','),
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `reembolsos-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  parseFloatValue(value: string): number {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
}

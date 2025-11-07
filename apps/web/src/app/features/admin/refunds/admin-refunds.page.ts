import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import type { Booking, AdminAuditLog } from '@core/models';
import { AdminService } from '@core/services/admin.service';
import { RBACService } from '@core/services/rbac.service';
import { RefundService } from '@core/services/refund.service';
import { MoneyPipe } from '@shared/pipes/money.pipe';
import { LoggerService } from '@core/services/logger.service';

interface RefundRequest {
  bookingId: string;
  type: 'full' | 'partial';
  amount?: number;
  destination: 'wallet' | 'original';
  reason: string;
}

@Component({
  selector: 'autorenta-admin-refunds-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule, MoneyPipe],
  templateUrl: './admin-refunds.page.html',
  styleUrl: './admin-refunds.page.css',
})
export class AdminRefundsPage implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly refundService = inject(RefundService);
  private readonly rbac = inject(RBACService);
  private readonly logger = inject(LoggerService);

  // State signals
  private readonly bookingsSignal = signal<Booking[]>([]);
  private readonly selectedBookingSignal = signal<Booking | null>(null);
  private readonly refundHistorySignal = signal<AdminAuditLog[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly processingRefundSignal = signal(false);
  private readonly searchQuerySignal = signal('');
  private readonly filterStatusSignal = signal<string>('all');

  // Refund form
  readonly refundForm = signal<RefundRequest>({
    bookingId: '',
    type: 'full',
    destination: 'wallet',
    reason: '',
  });

  // Computed properties
  readonly bookings = computed(() => this.bookingsSignal());
  readonly selectedBooking = computed(() => this.selectedBookingSignal());
  readonly refundHistory = computed(() => this.refundHistorySignal());
  readonly loading = computed(() => this.loadingSignal());
  readonly processingRefund = computed(() => this.processingRefundSignal());
  readonly searchQuery = computed(() => this.searchQuerySignal());
  readonly filterStatus = computed(() => this.filterStatusSignal());

  // Filtered bookings
  readonly filteredBookings = computed(() => {
    let bookings = this.bookingsSignal();
    const query = this.searchQuerySignal().toLowerCase();
    const status = this.filterStatusSignal();

    if (query) {
      bookings = bookings.filter(
        (b) =>
          b.id.toLowerCase().includes(query) ||
          b.renter_name?.toLowerCase().includes(query) ||
          b.car_title?.toLowerCase().includes(query),
      );
    }

    if (status && status !== 'all') {
      bookings = bookings.filter((b) => b.status === status);
    }

    return bookings;
  });

  readonly hasFinanceRole = computed(() => this.rbac.isFinance() || this.rbac.isSuperAdmin());

  async ngOnInit(): Promise<void> {
    await this.loadBookings();
    await this.loadRefundHistory();
  }

  async loadBookings(): Promise<void> {
    this.loadingSignal.set(true);
    try {
      const bookings = await this.adminService.listRecentBookings(100);
      this.bookingsSignal.set(bookings);
    } catch (error) {
      this.logger.error('Error loading bookings', 'AdminRefundsPage', error as Error);
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async loadRefundHistory(): Promise<void> {
    try {
      const { data } = await this.rbac.getAuditLogs({
        action: 'payment_refund_full',
        limit: 50,
      });
      this.refundHistorySignal.set(data);
    } catch (error) {
      this.logger.error('Error loading refund history', 'AdminRefundsPage', error as Error);
    }
  }

  selectBooking(booking: Booking): void {
    this.selectedBookingSignal.set(booking);
    this.refundForm.set({
      bookingId: booking.id,
      type: 'full',
      destination: 'wallet',
      reason: '',
    });
  }

  updateRefundType(type: 'full' | 'partial'): void {
    this.refundForm.update((form) => ({...form, type }));
  }

  updateRefundAmount(amount: number): void {
    this.refundForm.update((form) => ({...form, amount }));
  }

  updateDestination(destination: 'wallet' | 'original'): void {
    this.refundForm.update((form) => ({...form, destination }));
  }

  updateReason(reason: string): void {
    this.refundForm.update((form) => ({...form, reason }));
  }

  updateSearchQuery(query: string): void {
    this.searchQuerySignal.set(query);
  }

  updateFilterStatus(status: string): void {
    this.filterStatusSignal.set(status);
  }

  async processRefund(): Promise<void> {
    const form = this.refundForm();
    const booking = this.selectedBookingSignal();

    if (!booking || !form.reason.trim()) {
      this.logger.warn('Refund form invalid', 'AdminRefundsPage');
      return;
    }

    if (form.type === 'partial' && (!form.amount || form.amount <= 0)) {
      this.logger.warn('Partial refund amount required', 'AdminRefundsPage');
      return;
    }

    this.processingRefundSignal.set(true);
    try {
      // Process refund
      const result = await this.refundService.processRefund({
        booking_id: form.bookingId,
        refund_type: form.type,
        amount: form.type === 'partial' ? form.amount : undefined,
        reason: form.reason,
      });

      if (result.success) {
        // Log action
        await this.rbac.logAction(
          form.type === 'full' ? 'payment_refund_full' : 'payment_refund_partial',
          'booking',
          form.bookingId,
          {
            before: { status: booking.status, total_amount: booking.total_amount },
            after: { refund_amount: result.refund.amount },
          },
          {
            reason: form.reason,
            destination: form.destination,
            refund_id: result.refund.id,
          },
        );

        this.logger.info(
          `Refund processed successfully: ${result.refund.id}`,
          'AdminRefundsPage',
        );

        // Refresh data
        await this.loadBookings();
        await this.loadRefundHistory();

        // Reset form
        this.selectedBookingSignal.set(null);
        this.refundForm.set({
          bookingId: '',
          type: 'full',
          destination: 'wallet',
          reason: '',
        });
      }
    } catch (error) {
      this.logger.error('Error processing refund', 'AdminRefundsPage', error as Error);
    } finally {
      this.processingRefundSignal.set(false);
    }
  }

  getRefundableAmount(booking: Booking): number {
    // Calculate refundable amount based on booking status and cancellation policy
    if (!booking.total_cents) return 0;

    // If already refunded, return 0
    if (booking.metadata?.refund) return 0;

    // For now, return full amount (should implement cancellation policy logic)
    return booking.total_cents / 100;
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString();
  }

  getStatusBadgeClass(status: string): string {
    const statusClasses: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
  }
}

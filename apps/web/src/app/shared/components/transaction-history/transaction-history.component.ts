import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { RouterLink } from '@angular/router';
import { WalletService } from '../../../core/services/wallet.service';
import { BookingsService } from '../../../core/services/bookings.service';
import { BookingDepositStatus } from '../../../core/models';
import { DepositStatusBadgeComponent } from '../deposit-status-badge/deposit-status-badge.component';

type TransactionType = 'deposit' | 'withdrawal' | 'lock' | 'unlock' | 'charge' | 'refund' | 'bonus' | 'rental_payment_lock' | 'rental_payment_transfer' | 'security_deposit_lock' | 'security_deposit_release' | 'security_deposit_charge' | 'all';
type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'all';

interface WalletHistoryEntry {
  id: string;
  user_id: string;
  transaction_date: string;
  transaction_type: string;
  status: string;
  amount_cents: number;
  currency: string;
  metadata: Record<string, any>;
  booking_id?: string;
  source_system: string;
  legacy_transaction_id?: string;
  ledger_entry_id?: string;
}

@Component({
  selector: 'app-transaction-history',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, RouterLink, DepositStatusBadgeComponent],
  templateUrl: './transaction-history.component.html',
  styleUrls: ['./transaction-history.component.css'],
})
export class TransactionHistoryComponent implements OnInit {
  private readonly walletService = inject(WalletService);
  private readonly bookingsService = inject(BookingsService);

  readonly transactions = this.walletService.transactions;
  readonly isLoading = this.walletService.loading;
  readonly error = this.walletService.error;

  readonly expandedTransactionId = signal<string | null>(null);
  readonly filterType = signal<TransactionType>('all');
  readonly filterStatus = signal<TransactionStatus>('all');

  // Track deposit statuses for bookings
  readonly bookingDepositStatuses = signal<Map<string, BookingDepositStatus | null>>(new Map());

  readonly filteredTransactions = computed(() => {
    let transactions = this.transactions() as unknown as WalletHistoryEntry[];
    
    const typeFilter = this.filterType();
    if (typeFilter !== 'all') {
      transactions = transactions.filter(t => this.getTransactionType(t) === typeFilter);
    }
    
    const statusFilter = this.filterStatus();
    if (statusFilter !== 'all') {
      transactions = transactions.filter(t => this.getTransactionStatus(t) === statusFilter);
    }
    
    return transactions;
  });

  readonly transactionTypes: Array<{ value: TransactionType; label: string }> = [
    { value: 'all', label: 'Todos' },
    { value: 'deposit', label: 'Depósitos' },
    { value: 'lock', label: 'Bloqueos' },
    { value: 'unlock', label: 'Desbloqueos' },
    { value: 'charge', label: 'Cargos' },
    { value: 'refund', label: 'Reembolsos' },
    { value: 'bonus', label: 'Bonificaciones' },
  ];

  readonly transactionStatuses: Array<{ value: TransactionStatus; label: string }> = [
    { value: 'all', label: 'Todos' },
    { value: 'pending', label: 'Pendientes' },
    { value: 'completed', label: 'Completadas' },
    { value: 'failed', label: 'Fallidas' },
  ];

  ngOnInit(): void {
    this.loadTransactions();
  }

  loadTransactions(): void {
    this.walletService.getTransactions().subscribe({
      error: (err) => console.error('Error loading transactions:', err)
    });
  }

  onFilterTypeChange(type: string): void {
    this.filterType.set(type as TransactionType);
  }

  onFilterStatusChange(status: string): void {
    this.filterStatus.set(status as TransactionStatus);
  }

  toggleTransactionDetails(transactionId: string): void {
    if (this.expandedTransactionId() === transactionId) {
      this.expandedTransactionId.set(null);
    } else {
      this.expandedTransactionId.set(transactionId);
      // Load deposit status for deposit-related transactions
      const transaction = this.filteredTransactions().find(t => t.id === transactionId);
      if (transaction && transaction.booking_id && this.isDepositRelatedTransaction(transaction)) {
        void this.loadBookingDepositStatus(transaction.booking_id);
      }
    }
  }

  retry(): void {
    this.loadTransactions();
  }

  getTransactionType(transaction: WalletHistoryEntry): TransactionType {
    const type = transaction.transaction_type || transaction.metadata?.type || 'deposit';
    return type as TransactionType;
  }

  getTransactionStatus(transaction: WalletHistoryEntry): TransactionStatus {
    return (transaction.status || 'pending') as TransactionStatus;
  }

  formatCurrency(amountCents: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amountCents / 100);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  getTypeColor(type: TransactionType): string {
    const colors: Record<TransactionType, string> = {
      'all': 'bg-neutral-100 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-200',
      'deposit': 'bg-success-100 text-success-900 dark:bg-success-500/20 dark:text-success-100',
      'withdrawal': 'bg-info-100 text-info-900 dark:bg-info-500/20 dark:text-info-100',
      'lock': 'bg-warning-100 text-warning-900 dark:bg-warning-500/25 dark:text-warning-100',
      'unlock': 'bg-info-100 text-info-900 dark:bg-info-500/20 dark:text-info-100',
      'charge': 'bg-error-100 text-error-900 dark:bg-error-500/20 dark:text-error-100',
      'refund': 'bg-success-100 text-success-900 dark:bg-success-500/20 dark:text-success-100',
      'bonus': 'bg-success-100 text-success-900 dark:bg-success-500/20 dark:text-success-100',
      'rental_payment_lock': 'bg-warning-100 text-warning-900 dark:bg-warning-500/25 dark:text-warning-100',
      'rental_payment_transfer': 'bg-info-100 text-info-900 dark:bg-info-500/20 dark:text-info-100',
      'security_deposit_lock': 'bg-warning-100 text-warning-900 dark:bg-warning-500/25 dark:text-warning-100',
      'security_deposit_release': 'bg-success-100 text-success-900 dark:bg-success-500/20 dark:text-success-100',
      'security_deposit_charge': 'bg-error-100 text-error-900 dark:bg-error-500/20 dark:text-error-100',
    };
    return colors[type] || 'bg-neutral-100 text-neutral-900';
  }

  getStatusColor(status: TransactionStatus): string {
    const colors: Record<TransactionStatus, string> = {
      'all': 'bg-neutral-100 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-200',
      'pending': 'bg-warning-100 text-warning-900 dark:bg-warning-500/25 dark:text-warning-100',
      'completed': 'bg-success-100 text-success-900 dark:bg-success-500/20 dark:text-success-100',
      'failed': 'bg-error-100 text-error-900 dark:bg-error-500/20 dark:text-error-100',
      'refunded': 'bg-neutral-100 text-neutral-900 dark:bg-neutral-700/40 dark:text-neutral-200',
    };
    return colors[status] || 'bg-neutral-100 text-neutral-900';
  }

  translateType(type: TransactionType): string {
    const translations: Record<TransactionType, string> = {
      'all': 'Todos',
      'deposit': 'Depósito',
      'withdrawal': 'Retiro',
      'lock': 'Bloqueo',
      'unlock': 'Desbloqueo',
      'charge': 'Cargo',
      'refund': 'Reembolso',
      'bonus': 'Bonificación',
      'rental_payment_lock': 'Bloqueo de Alquiler',
      'rental_payment_transfer': 'Pago de Alquiler',
      'security_deposit_lock': 'Bloqueo de Garantía',
      'security_deposit_release': 'Devolución de Garantía',
      'security_deposit_charge': 'Cargo de Garantía',
    };
    return translations[type] || type;
  }

  translateStatus(status: TransactionStatus): string {
    const translations: Record<TransactionStatus, string> = {
      'all': 'Todos',
      'pending': 'Pendiente',
      'completed': 'Completada',
      'failed': 'Fallida',
      'refunded': 'Reembolsada',
    };
    return translations[status] || status;
  }

  getTypeIcon(type: TransactionType): string {
    const icons: Record<TransactionType, string> = {
      'all': '📋',
      'deposit': '💰',
      'withdrawal': '🏦',
      'lock': '🔒',
      'unlock': '🔓',
      'charge': '💳',
      'refund': '↩️',
      'bonus': '🎁',
      'rental_payment_lock': '🚗🔒',
      'rental_payment_transfer': '🚗💸',
      'security_deposit_lock': '🛡️🔒',
      'security_deposit_release': '🛡️✅',
      'security_deposit_charge': '🛡️⚠️',
    };
    return icons[type] || '💰';
  }

  isOutgoingTransaction(type: TransactionType): boolean {
    return ['charge', 'lock', 'withdrawal', 'rental_payment_lock', 'security_deposit_lock'].includes(type);
  }

  trackByTransactionId(_index: number, transaction: WalletHistoryEntry): string {
    return transaction.id;
  }

  /**
   * Check if a transaction is related to security deposits
   */
  isDepositRelatedTransaction(transaction: WalletHistoryEntry): boolean {
    const type = this.getTransactionType(transaction);
    return ['security_deposit_lock', 'security_deposit_release', 'security_deposit_charge'].includes(type);
  }

  /**
   * Load deposit status for a booking
   */
  async loadBookingDepositStatus(bookingId: string): Promise<void> {
    // Skip if already loaded
    if (this.bookingDepositStatuses().has(bookingId)) {
      return;
    }

    try {
      const booking = await this.bookingsService.getBookingById(bookingId);
      const currentMap = this.bookingDepositStatuses();
      const newMap = new Map(currentMap);
      newMap.set(bookingId, booking?.deposit_status || null);
      this.bookingDepositStatuses.set(newMap);
    } catch (error) {
      // Silent fail - deposit status is optional enhancement
      console.error('Failed to load booking deposit status:', error);
    }
  }

  /**
   * Get deposit status for a booking
   */
  getDepositStatus(bookingId: string): BookingDepositStatus | null {
    return this.bookingDepositStatuses().get(bookingId) || null;
  }
}

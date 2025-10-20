import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WalletService } from '../../../core/services/wallet.service';
import type {
  WalletTransaction,
  WalletTransactionFilters,
  WalletTransactionType,
  WalletTransactionStatus,
} from '../../../core/models/wallet.model';

/**
 * TransactionHistoryComponent
 *
 * Componente para mostrar el historial de transacciones del wallet.
 *
 * Características:
 * - Lista paginada de transacciones
 * - Filtros por tipo, estado y fecha
 * - Detalles expandibles de cada transacción
 * - Color-coded badges por tipo y estado
 * - Auto-refresh al inicializar
 *
 * Uso:
 * ```html
 * <app-transaction-history></app-transaction-history>
 * ```
 */
@Component({
  selector: 'app-transaction-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transaction-history.component.html',
  styleUrls: ['./transaction-history.component.css'],
})
export class TransactionHistoryComponent implements OnInit {
  private readonly walletService = inject(WalletService);

  // ==================== PUBLIC SIGNALS ====================

  /**
   * Transacciones del wallet (del servicio)
   */
  readonly transactions = this.walletService.transactions;

  /**
   * Estado de carga
   */
  readonly isLoading = signal(false);

  /**
   * Error actual
   */
  readonly error = this.walletService.error;

  /**
   * ID de la transacción expandida (para ver detalles)
   */
  readonly expandedTransactionId = signal<string | null>(null);

  // ==================== FILTERS ====================

  /**
   * Filtro de tipo seleccionado
   */
  filterType = signal<WalletTransactionType | 'all'>('all');

  /**
   * Filtro de estado seleccionado
   */
  filterStatus = signal<WalletTransactionStatus | 'all'>('all');

  /**
   * Tipos de transacciones disponibles para filtrar
   */
  readonly transactionTypes: Array<{ value: WalletTransactionType | 'all'; label: string }> = [
    { value: 'all', label: 'Todos' },
    { value: 'deposit', label: 'Depósitos' },
    { value: 'lock', label: 'Bloqueos' },
    { value: 'unlock', label: 'Desbloqueos' },
    { value: 'charge', label: 'Cargos' },
    { value: 'refund', label: 'Reembolsos' },
    { value: 'bonus', label: 'Bonificaciones' },
  ];

  /**
   * Estados de transacciones disponibles para filtrar
   */
  readonly transactionStatuses: Array<{ value: WalletTransactionStatus | 'all'; label: string }> = [
    { value: 'all', label: 'Todos' },
    { value: 'pending', label: 'Pendientes' },
    { value: 'completed', label: 'Completadas' },
    { value: 'failed', label: 'Fallidas' },
    { value: 'refunded', label: 'Reembolsadas' },
  ];

  // ==================== LIFECYCLE ====================

  async ngOnInit(): Promise<void> {
    await this.loadTransactions();
  }

  /**
   * Determina si el depósito es crédito exclusivo (no retirable)
   */
  isNonWithdrawableDeposit(transaction: WalletTransaction): boolean {
    return transaction.type === 'deposit' && transaction.is_withdrawable === false;
  }

  // ==================== PUBLIC METHODS ====================

  /**
   * Carga las transacciones con los filtros aplicados
   */
  async loadTransactions(): Promise<void> {
    this.isLoading.set(true);
    try {
      const filters: WalletTransactionFilters = {};

      // Aplicar filtro de tipo
      if (this.filterType() !== 'all') {
        filters.type = this.filterType() as WalletTransactionType;
      }

      // Aplicar filtro de estado
      if (this.filterStatus() !== 'all') {
        filters.status = this.filterStatus() as WalletTransactionStatus;
      }

      await this.walletService.getTransactions(filters);
    } catch (err) {
      console.error('Error loading transactions:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Cambia el filtro de tipo
   */
  onFilterTypeChange(type: string): void {
    this.filterType.set(type as WalletTransactionType | 'all');
    this.loadTransactions();
  }

  /**
   * Cambia el filtro de estado
   */
  onFilterStatusChange(status: string): void {
    this.filterStatus.set(status as WalletTransactionStatus | 'all');
    this.loadTransactions();
  }

  /**
   * Expande/colapsa los detalles de una transacción
   */
  toggleTransactionDetails(transactionId: string): void {
    if (this.expandedTransactionId() === transactionId) {
      this.expandedTransactionId.set(null);
    } else {
      this.expandedTransactionId.set(transactionId);
    }
  }

  /**
   * Reintenta cargar transacciones después de un error
   */
  async retry(): Promise<void> {
    await this.loadTransactions();
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Formatea un número como moneda
   */
  formatCurrency(amount: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Formatea una fecha en formato legible
   */
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

  /**
   * Obtiene el color del badge según el tipo de transacción
   */
  getTypeColor(type: WalletTransactionType): string {
    const colors: Record<WalletTransactionType, string> = {
      deposit: 'bg-green-100 text-green-800 dark:bg-emerald-500/20 dark:text-emerald-200',
      withdrawal: 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-200',
      lock: 'bg-yellow-100 text-yellow-800 dark:bg-amber-500/25 dark:text-amber-200',
      unlock: 'bg-blue-100 text-blue-800 dark:bg-sky-500/20 dark:text-sky-200',
      charge: 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-200',
      refund: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-200',
      bonus: 'bg-pink-100 text-pink-800 dark:bg-pink-500/20 dark:text-pink-200',
      rental_payment_lock: 'bg-orange-100 text-orange-800 dark:bg-orange-500/25 dark:text-orange-200',
      rental_payment_transfer: 'bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-200',
      security_deposit_lock: 'bg-amber-100 text-amber-800 dark:bg-amber-500/25 dark:text-amber-200',
      security_deposit_release: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-200',
      security_deposit_charge: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200',
    };
    return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-neutral-700/40 dark:text-neutral-200';
  }

  /**
   * Obtiene el color del badge según el estado de la transacción
   */
  getStatusColor(status: WalletTransactionStatus): string {
    const colors: Record<WalletTransactionStatus, string> = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-amber-500/25 dark:text-amber-200',
      completed: 'bg-green-100 text-green-800 dark:bg-emerald-500/20 dark:text-emerald-200',
      failed: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200',
      refunded: 'bg-gray-100 text-gray-800 dark:bg-neutral-700/40 dark:text-neutral-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-neutral-700/40 dark:text-neutral-200';
  }

  /**
   * Traduce el tipo de transacción a español
   */
  translateType(type: WalletTransactionType): string {
    const translations: Record<WalletTransactionType, string> = {
      deposit: 'Depósito',
      withdrawal: 'Retiro',
      lock: 'Bloqueo',
      unlock: 'Desbloqueo',
      charge: 'Cargo',
      refund: 'Reembolso',
      bonus: 'Bonificación',
      rental_payment_lock: 'Bloqueo de Alquiler',
      rental_payment_transfer: 'Pago de Alquiler',
      security_deposit_lock: 'Bloqueo de Garantía',
      security_deposit_release: 'Devolución de Garantía',
      security_deposit_charge: 'Cargo de Garantía',
    };
    return translations[type] || type;
  }

  /**
   * Traduce el estado de la transacción a español
   */
  translateStatus(status: WalletTransactionStatus): string {
    const translations: Record<WalletTransactionStatus, string> = {
      pending: 'Pendiente',
      completed: 'Completada',
      failed: 'Fallida',
      refunded: 'Reembolsada',
    };
    return translations[status] || status;
  }

  /**
   * Determina el icono a mostrar según el tipo de transacción
   */
  getTypeIcon(type: WalletTransactionType): string {
    const icons: Record<WalletTransactionType, string> = {
      deposit: 'M12 4v16m8-8H4',
      withdrawal: 'M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z',
      lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
      unlock: 'M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z',
      charge: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
      refund: 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6',
      bonus: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      rental_payment_lock: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3',
      rental_payment_transfer: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
      security_deposit_lock: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      security_deposit_release: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      security_deposit_charge: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    };
    return icons[type] || 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
  }

  /**
   * Determina si una transacción es de salida (reduce el balance)
   */
  isOutgoingTransaction(type: WalletTransactionType): boolean {
    return ['charge', 'lock'].includes(type);
  }

  /**
   * TrackBy function para optimizar el rendering de la lista
   */
  trackByTransactionId(index: number, transaction: WalletTransaction): string {
    return transaction.id;
  }
}

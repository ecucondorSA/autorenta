import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  TransferResponse,
  WalletLedgerService,
} from '@core/services/payments/wallet-ledger.service';
import { WalletService } from '@core/services/payments/wallet.service';
import { toSignalOrNull } from '@core/utils/signal-helpers';

interface UserSearchResult {
  id: string;
  full_name: string;
  email?: string;
  wallet_account_number?: string;
}

@Component({
  selector: 'app-transfer-funds',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './transfer-funds.component.html',
  styleUrls: ['./transfer-funds.component.css'],
})
export class TransferFundsComponent {
  private readonly ledgerService = inject(WalletLedgerService);
  private readonly walletService = inject(WalletService);

  searchQuery = signal('');
  amountInput = signal(0);
  description = signal('');

  searchResults = signal<UserSearchResult[]>([]);
  selectedRecipient = signal<UserSearchResult | null>(null);
  searchError = signal<string | null>(null);

  loading = signal(false);
  error = signal<string | null>(null);
  success = signal(false);
  lastTransferAmount = signal(0);

  currentBalance = computed(() => this.walletService.balance()?.available_balance ?? 0);

  // Convert Observable to Signal to avoid memory leak
  private readonly balanceSignal = toSignalOrNull(this.walletService.getBalance());

  currentUserId = computed(() => this.balanceSignal()?.user_id ?? null);

  recentTransfers = this.ledgerService.transfers;

  constructor() {
    // Load initial transfers
    this.ledgerService.loadTransfers(5);
  }

  onSearchInput(): void {
    if (this.selectedRecipient()) {
      this.clearRecipient();
    }
    this.performSearch();
  }

  private async performSearch(): Promise<void> {
    const query = this.searchQuery().trim().toUpperCase();
    this.searchResults.set([]);
    this.searchError.set(null);

    if (query.length < 16) {
      this.searchError.set(`Faltan ${16 - query.length} caracteres`);
      return;
    }

    if (query.length > 16) {
      this.searchError.set('Número demasiado largo (máx. 16 caracteres)');
      return;
    }

    try {
      const result = await this.ledgerService.searchUserByWalletNumber(query);
      if (result) {
        const typedResult = result as unknown as UserSearchResult;
        this.selectedRecipient.set(typedResult);
        this.searchResults.set([typedResult]);
        this.searchError.set(null);
      } else {
        this.searchError.set('Número de cuenta no encontrado');
      }
    } catch {
      this.searchError.set('Error al buscar usuario');
    }
  }

  selectRecipient(user: UserSearchResult): void {
    this.selectedRecipient.set(user);
    this.searchQuery.set(user.full_name);
    this.searchResults.set([]);
  }

  clearRecipient(): void {
    this.selectedRecipient.set(null);
    this.searchQuery.set('');
  }

  canSubmit = computed(() => {
    return (
      this.selectedRecipient() !== null &&
      this.amountInput() >= 1 &&
      this.amountInput() * 100 <= this.currentBalance()
    );
  });

  async onSubmit(): Promise<void> {
    if (!this.canSubmit()) return;

    this.loading.set(true);
    this.error.set(null);
    this.success.set(false);

    try {
      const amountCents = Math.round(this.amountInput() * 100);
      const result: TransferResponse = await this.ledgerService.transferFunds({
        to_user_id: this.selectedRecipient()!.id,
        amount_cents: amountCents,
        description: this.description() || undefined,
      });

      if (result.ok) {
        this.success.set(true);
        this.lastTransferAmount.set(amountCents);
        this.clearRecipient();
        this.amountInput.set(0);
        this.description.set('');

        // Parallel loading for better performance
        await Promise.all([this.walletService.getBalance(), this.ledgerService.loadTransfers(5)]);
      } else {
        this.error.set(result.error || 'Error al transferir fondos');
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      this.loading.set(false);
    }
  }

  formatAmount(cents: number): string {
    return this.ledgerService.formatAmount(cents);
  }

  formatDate(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;

    return date.toLocaleDateString('es-AR', {
      month: 'short',
      day: 'numeric',
    });
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      completed: 'Completada',
      pending: 'Pendiente',
      failed: 'Fallida',
      cancelled: 'Cancelada',
    };
    return labels[status] || status;
  }
}

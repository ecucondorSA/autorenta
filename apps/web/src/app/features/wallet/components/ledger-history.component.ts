import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LedgerKind, WalletLedgerService } from '@app/core/services/wallet-ledger.service';

@Component({
  selector: 'app-ledger-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ledger-history.component.html',
  styleUrls: ['./ledger-history.component.css'],
})
export class LedgerHistoryComponent {
  readonly ledgerService = inject(WalletLedgerService);

  readonly loading = this.ledgerService.loading;
  readonly error = this.ledgerService.error;
  readonly ledgerHistory = this.ledgerService.ledgerHistory;

  selectedKind = signal<LedgerKind | null>(null);

  readonly filteredHistory = computed(() => {
    const history = this.ledgerHistory();
    const kind = this.selectedKind();
    if (!kind) return history;
    return history.filter((entry) => entry.kind === kind);
  });

  refreshHistory(): void {
    this.ledgerService.loadLedgerHistory();
  }

  getRetryAction() {
    return {
      label: 'Reintentar',
      handler: () => this.refreshHistory(),
      variant: 'primary' as const,
    };
  }

  formatDate(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatBalanceChange(cents: number): string {
    const sign = cents >= 0 ? '+' : '';
    return `${sign}${this.ledgerService.formatAmount(cents)}`;
  }
}

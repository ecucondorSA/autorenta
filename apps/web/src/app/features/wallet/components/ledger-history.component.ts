import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  WalletLedgerService,
  LedgerEntry,
  LedgerKind,
} from '@app/core/services/wallet-ledger.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { SkeletonLoaderComponent } from '@app/shared/components/skeleton-loader/skeleton-loader.component';
import { ErrorStateComponent } from '@app/shared/components/error-state/error-state.component';
import { EmptyStateComponent } from '@app/shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-ledger-history',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonLoaderComponent, ErrorStateComponent, EmptyStateComponent],
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
      variant: 'primary' as const
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

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WalletLedgerService, TransferResponse } from '@app/core/services/wallet-ledger.service';
import { WalletService } from '@app/core/services/wallet.service';

interface UserSearchResult {
  id: string;
  full_name: string;
  email?: string;
  wallet_account_number?: string;
}

@Component({
  selector: 'app-transfer-funds',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-2xl mx-auto p-4">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="h2 text-smoke-black dark:text-ivory-luminous mb-2">
          Transferir AutoCréditos
        </h1>
        <p class="text-charcoal-medium dark:text-pearl-light/70">
          Envía AutoCréditos a otros usuarios de la plataforma
        </p>
      </div>

      <!-- Current balance -->
      <div class="bg-gradient-to-r from-accent-petrol to-accent-petrol/80 rounded-2xl shadow-soft p-6 mb-6 text-white">
        <p class="text-sm text-ivory-soft/90 mb-1">Saldo disponible</p>
        <p class="text-3xl font-bold">
          {{ formatAmount(currentBalance()) }}
        </p>
      </div>

      <!-- Transfer Form -->
      <div class="card-premium shadow-soft p-6">
        <form (ngSubmit)="onSubmit()" #transferForm="ngForm">
          <!-- Recipient Search -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-charcoal-medium dark:text-pearl-light mb-2">
              Número de Cuenta Wallet
            </label>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (input)="onSearchInput()"
              name="searchQuery"
              placeholder="Ej: AR12345678901234"
              maxlength="16"
              class="input-premium font-mono"
              [disabled]="loading()"
            />
            <p class="mt-1 text-xs text-charcoal-medium/70 dark:text-pearl-light/60">
              Ingresa el número de 16 caracteres (AR + 14 dígitos)
            </p>

            <!-- Search Error -->
            @if (searchError()) {
              <div class="mt-2 info-card-warm p-3">
                <p class="text-sm text-accent-warm dark:text-amber-200">
                  {{ searchError() }}
                </p>
              </div>
            }

            <!-- Search Results Dropdown -->
            @if (searchResults().length > 0 && searchQuery.length > 0) {
              <div class="mt-2 border border-pearl-gray dark:border-slate-deep rounded-xl
                          bg-white-pure dark:bg-anthracite shadow-soft max-h-60 overflow-y-auto">
                @for (user of searchResults(); track user.id) {
                  <button
                    type="button"
                    (click)="selectRecipient(user)"
                    class="w-full px-4 py-3 text-left hover:bg-sand-light dark:hover:bg-slate-deep/60
                           border-b border-pearl-gray dark:border-slate-deep last:border-0 transition-base"
                  >
                    <p class="font-medium text-smoke-black dark:text-ivory-luminous">
                      {{ user.full_name }}
                    </p>
                    @if (user.email) {
                      <p class="text-sm text-charcoal-medium dark:text-pearl-light/70">
                        {{ user.email }}
                      </p>
                    }
                  </button>
                }
              </div>
            }

            <!-- Selected Recipient -->
            @if (selectedRecipient()) {
              <div class="mt-3 p-4 bg-success-50 dark:bg-success-900/20 border-2 border-success-500 dark:border-success-700 rounded-xl">
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <div class="flex items-center space-x-2 mb-2">
                      <svg class="w-6 h-6 text-success-600 dark:text-success-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                      </svg>
                      <p class="font-bold text-smoke-black dark:text-ivory-luminous">
                        {{ selectedRecipient()!.full_name }}
                      </p>
                    </div>
                    <p class="text-xs text-charcoal-medium dark:text-pearl-light/70 font-mono">
                      Cuenta: {{ selectedRecipient()!.wallet_account_number }}
                    </p>
                    @if (selectedRecipient()!.email) {
                      <p class="text-xs text-charcoal-medium dark:text-pearl-light/70 mt-1">
                        {{ selectedRecipient()!.email }}
                      </p>
                    }
                  </div>
                  <button
                    type="button"
                    (click)="clearRecipient()"
                    class="text-charcoal-medium hover:text-smoke-black dark:text-pearl-light/70 dark:hover:text-ivory-luminous transition-base"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            }
          </div>

          <!-- Amount Input -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-charcoal-medium dark:text-pearl-light mb-2">
              Monto a transferir
            </label>
            <div class="relative">
              <span class="absolute left-3 top-2 text-charcoal-medium dark:text-pearl-light/70">ARS</span>
              <input
                type="number"
                [(ngModel)]="amountInput"
                name="amount"
                min="1"
                step="0.01"
                placeholder="0.00"
                required
                class="input-premium pl-14"
                [disabled]="loading()"
              />
            </div>
            <p class="mt-1 text-xs text-charcoal-medium/70 dark:text-pearl-light/60">
              Mínimo: ARS 1.00
            </p>

            <!-- Amount in cents preview -->
            @if (amountInput > 0) {
              <p class="mt-2 text-sm text-charcoal-medium dark:text-pearl-light/70">
                = {{ amountInput * 100 }} centavos
              </p>
            }
          </div>

          <!-- Description (optional) -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-charcoal-medium dark:text-pearl-light mb-2">
              Descripción (opcional)
            </label>
            <textarea
              [(ngModel)]="description"
              name="description"
              rows="3"
              placeholder="Ej: Pago compartido de alquiler"
              class="input-premium"
              [disabled]="loading()"
            ></textarea>
          </div>

          <!-- Error Message -->
          @if (error()) {
            <div class="mb-4 info-card-warm p-4 border-2 border-accent-warm">
              <div class="flex items-start gap-2">
                <svg class="w-5 h-5 text-accent-warm mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                <p class="text-sm text-accent-warm dark:text-amber-200">{{ error() }}</p>
              </div>
            </div>
          }

          <!-- Success Message -->
          @if (success()) {
            <div class="mb-4 p-4 bg-success-50 dark:bg-success-900/20 border-2 border-success-500 dark:border-success-700 rounded-xl">
              <div class="flex items-start gap-2">
                <svg class="w-5 h-5 text-success-600 dark:text-success-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                <p class="text-sm text-success-700 dark:text-success-200 font-semibold">
                  Transferencia exitosa: {{ formatAmount(lastTransferAmount()) }}
                </p>
              </div>
            </div>
          }

          <!-- Submit Button -->
          <button
            type="submit"
            [disabled]="!canSubmit() || loading()"
            class="btn-primary w-full py-3 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ loading() ? 'Procesando...' : 'Transferir' }}
          </button>

          <!-- Rate Limit Warning -->
          <p class="mt-4 text-xs text-charcoal-medium/70 dark:text-pearl-light/60 text-center">
            Máximo 10 transferencias por hora
          </p>
        </form>
      </div>

      <!-- Recent Transfers -->
      @if (recentTransfers().length > 0) {
        <div class="mt-8">
          <h2 class="h4 text-smoke-black dark:text-ivory-luminous mb-4">
            Transferencias recientes
          </h2>
          <div class="space-y-3">
            @for (transfer of recentTransfers(); track transfer.id) {
              <div class="card-premium shadow-soft p-4 hover:shadow-elevated transition-shadow">
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <div class="flex items-center space-x-3">
                      <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                           [class.bg-accent-warm/10]="transfer.from_user === currentUserId()"
                           [class.bg-accent-petrol/10]="transfer.to_user === currentUserId()">
                        <span class="text-xl">
                          {{ transfer.from_user === currentUserId() ? '📤' : '📥' }}
                        </span>
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="font-medium text-smoke-black dark:text-ivory-luminous truncate">
                          {{ transfer.from_user === currentUserId() ? 'Enviaste a' : 'Recibiste de' }}
                          {{ transfer.from_user === currentUserId() ? transfer.to_user_name : transfer.from_user_name }}
                        </p>
                        <p class="text-xs text-charcoal-medium dark:text-pearl-light/70">
                          {{ formatDate(transfer.created_at) }}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div class="text-right ml-4 flex-shrink-0">
                    <p class="font-bold text-base"
                       [class.text-accent-warm]="transfer.from_user === currentUserId()"
                       [class.text-accent-petrol]="transfer.to_user === currentUserId()">
                      {{ transfer.from_user === currentUserId() ? '-' : '+' }}{{ formatAmount(transfer.amount_cents) }}
                    </p>
                    <span class="badge-status text-xs"
                          [class.badge-success]="transfer.status === 'completed'"
                          [class.badge-warning]="transfer.status === 'pending'"
                          [class.badge-error]="transfer.status === 'failed'">
                      {{ getStatusLabel(transfer.status) }}
                    </span>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [],
})
export class TransferFundsComponent implements OnInit {
  private readonly ledgerService = inject(WalletLedgerService);
  private readonly walletService = inject(WalletService);

  // Form state
  searchQuery = '';
  amountInput = 0;
  description = '';

  // Search
  readonly searchResults = signal<UserSearchResult[]>([]);
  readonly selectedRecipient = signal<UserSearchResult | null>(null);
  readonly searchError = signal<string | null>(null);

  // Transfer state
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal(false);
  readonly lastTransferAmount = signal(0);

  // Wallet balance
  readonly currentBalance = computed(() => this.walletService.balance()?.available_balance ?? 0);
  readonly currentUserId = signal<string | null>(null);

  // Recent transfers
  readonly recentTransfers = this.ledgerService.transfers;

  private searchTimeout?: number;

  async ngOnInit(): Promise<void> {
    // Load current user
    const user = await this.ledgerService['supabase'].auth.getUser();
    if (user.data.user) {
      this.currentUserId.set(user.data.user.id);
    }

    // Load recent transfers
    await this.ledgerService.loadTransfers(5);

    // IMPORTANTE: Forzar refresh del balance para evitar mostrar datos cacheados obsoletos

    try {
      const balance = await this.walletService.getBalance();
        available_ars: balance.available_balance / 100,
        locked_ars: balance.locked_balance / 100,
        total_ars: balance.total_balance / 100,
      });
    } catch (error) {
      // Si falla, el balance quedará en null/0
    }
  }

  onSearchInput(): void {
    // Clear previous timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Reset selected recipient if query changes
    if (this.selectedRecipient()) {
      this.clearRecipient();
    }

    // Debounce search
    this.searchTimeout = window.setTimeout(() => {
      void this.performSearch();
    }, 300);
  }

  private async performSearch(): Promise<void> {
    const query = this.searchQuery.trim().toUpperCase();

    // Reset results and errors
    this.searchResults.set([]);
    this.searchError.set(null);

    // Require at least 'AR' prefix
    if (query.length < 2) {
      return;
    }

    // Validate format while typing
    if (!query.startsWith('AR')) {
      this.searchError.set('El número debe comenzar con AR');
      return;
    }

    // Only search when we have full 16 characters
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
        // Auto-select the user since WAN is unique
        this.selectedRecipient.set(result);
        this.searchResults.set([result]);
        this.searchError.set(null);
      } else {
        this.searchError.set('Número de cuenta no encontrado');
      }
    } catch (err) {
      this.searchError.set('Error al buscar usuario');
    }
  }

  selectRecipient(user: UserSearchResult): void {
    this.selectedRecipient.set(user);
    this.searchQuery = user.full_name;
    this.searchResults.set([]);
  }

  clearRecipient(): void {
    this.selectedRecipient.set(null);
    this.searchQuery = '';
  }

  canSubmit(): boolean {
    const balance = this.currentBalance();
    return (
      this.selectedRecipient() !== null &&
      this.amountInput >= 1 &&
      this.amountInput * 100 <= balance
    );
  }

  async onSubmit(): Promise<void> {
    if (!this.canSubmit()) return;

    this.loading.set(true);
    this.error.set(null);
    this.success.set(false);

    try {
      const amountCents = Math.round(this.amountInput * 100);

        to_user_id: this.selectedRecipient()!.id,
        to_user_name: this.selectedRecipient()!.full_name,
        amount_cents: amountCents,
        amount_ars: this.amountInput,
        description: this.description,
        current_user_id: this.currentUserId(),
      });

      const result: TransferResponse = await this.ledgerService.transferFunds({
        to_user_id: this.selectedRecipient()!.id,
        amount_cents: amountCents,
        description: this.description || undefined,
      });

      if (result.ok) {
        this.success.set(true);
        this.lastTransferAmount.set(amountCents);

        // Reset form
        this.clearRecipient();
        this.amountInput = 0;
        this.description = '';

        // Reload balance and transfers
        await Promise.all([
          this.walletService.getBalance().catch(() => {}),
          this.ledgerService.loadTransfers(5),
        ]);
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

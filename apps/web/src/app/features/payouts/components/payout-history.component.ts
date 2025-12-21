import { CommonModule } from '@angular/common';
import {Component, inject, Input, OnInit, signal,
  ChangeDetectionStrategy} from '@angular/core';
import { take } from 'rxjs/operators';
import { Payout, PayoutService } from '@core/services/payments/payout.service';

/**
 * Payout History Component
 *
 * Displays payout history with status and details
 */
@Component({
  selector: 'app-payout-history',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="payout-history">
      <!-- Loading State -->
      @if (loading()) {
        <div class="loading">
          <div class="spinner-small"></div>
          <span>Cargando historial...</span>
        </div>
      }
    
      <!-- Payouts List -->
      @if (!loading() && payouts().length > 0) {
        <div class="payouts-list">
          @for (payout of payouts(); track payout) {
            <div class="payout-item">
              <div class="payout-icon" [ngClass]="'status-' + payout.status">
                @if (payout.status === 'completed') {
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clip-rule="evenodd"
                      />
                  </svg>
                }
                @if (payout.status === 'pending' || payout.status === 'processing') {
                  <svg
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                      clip-rule="evenodd"
                      />
                  </svg>
                }
                @if (payout.status === 'failed' || payout.status === 'cancelled') {
                  <svg
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clip-rule="evenodd"
                      />
                  </svg>
                }
              </div>
              <div class="payout-content">
                <div class="payout-header">
                  <h4 class="payout-amount">
                    {{ payout.amount | number: '1.0-0' | currency: 'ARS' : 'symbol-narrow' }}
                  </h4>
                  <span class="payout-status" [ngClass]="'badge-' + payout.status">
                    {{ getStatusText(payout.status) }}
                  </span>
                </div>
                <div class="payout-details">
                  <span class="payout-date">
                    {{ payout.createdAt | date: 'dd/MM/yyyy HH:mm' }}
                  </span>
                  @if (payout.completedAt) {
                    <span class="payout-completed">
                      Completado: {{ payout.completedAt | date: 'dd/MM/yyyy HH:mm' }}
                    </span>
                  }
                </div>
                @if (payout.failureReason) {
                  <div class="payout-error">
                    <svg class="error-icon" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fill-rule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clip-rule="evenodd"
                        />
                    </svg>
                    <span>{{ payout.failureReason }}</span>
                  </div>
                }
                @if (payout.providerPayoutId) {
                  <div class="payout-id">
                    <span class="id-label">ID:</span>
                    <span class="id-value">{{ payout.providerPayoutId }}</span>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }
    
      <!-- Empty State -->
      @if (!loading() && payouts().length === 0) {
        <div class="empty-state">
          <img src="/assets/images/empty-states/empty-wallet.svg" alt="No hay retiros" class="w-48 h-48 mx-auto mb-4">
          <p class="empty-text">No tenés retiros registrados</p>
          <p class="empty-hint">Tus retiros aparecerán aquí una vez que los solicites</p>
        </div>
      }
    
      <!-- Error Message -->
      @if (error()) {
        <div class="alert alert-error">
          {{ error() }}
        </div>
      }
    </div>
    `,
  styles: [
    `
      .payout-history {
        width: 100%;
      }

      .loading {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1.5rem;
        justify-content: center;
        color: #6b7280;
      }

      .spinner-small {
        width: 1.25rem;
        height: 1.25rem;
        border: 2px solid #e5e7eb;
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .payouts-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .payout-item {
        display: flex;
        gap: 1rem;
        padding: 1rem;
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        transition: all 0.2s;
      }

      .payout-item:hover {
        border-color: #d1d5db;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      }

      .payout-icon {
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .payout-icon svg {
        width: 1.5rem;
        height: 1.5rem;
      }

      .payout-icon.status-completed {
        background: #d1fae5;
        color: #10b981;
      }

      .payout-icon.status-pending,
      .payout-icon.status-processing {
        background: #fef3c7;
        color: #f59e0b;
      }

      .payout-icon.status-failed,
      .payout-icon.status-cancelled {
        background: #fee2e2;
        color: #ef4444;
      }

      .payout-content {
        flex: 1;
      }

      .payout-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
      }

      .payout-amount {
        font-size: 1.125rem;
        font-weight: 600;
        color: #111827;
      }

      .payout-status {
        font-size: 0.75rem;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-weight: 500;
      }

      .badge-completed {
        background: #d1fae5;
        color: #065f46;
      }

      .badge-pending,
      .badge-processing {
        background: #fef3c7;
        color: #92400e;
      }

      .badge-failed,
      .badge-cancelled {
        background: #fee2e2;
        color: #991b1b;
      }

      .payout-details {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        font-size: 0.875rem;
        color: #6b7280;
      }

      .payout-error {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        margin-top: 0.5rem;
        padding: 0.5rem;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        color: #991b1b;
      }

      .error-icon {
        width: 1rem;
        height: 1rem;
        flex-shrink: 0;
        margin-top: 0.125rem;
      }

      .payout-id {
        margin-top: 0.5rem;
        font-size: 0.75rem;
        color: #9ca3af;
        font-family: var(--font-mono);
      }

      .id-label {
        font-weight: 500;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 3rem 1.5rem;
        text-align: center;
      }

      .empty-icon {
        width: 3rem;
        height: 3rem;
        color: #9ca3af;
        margin-bottom: 1rem;
      }

      .empty-text {
        font-size: 1rem;
        font-weight: 500;
        color: #374151;
        margin-bottom: 0.25rem;
      }

      .empty-hint {
        font-size: 0.875rem;
        color: #6b7280;
      }

      .alert {
        padding: 0.75rem;
        border-radius: 0.375rem;
        font-size: 0.875rem;
      }

      .alert-error {
        background: #fee2e2;
        color: #991b1b;
      }

      @media (max-width: 640px) {
        .payout-item {
          flex-direction: column;
        }

        .payout-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 0.5rem;
        }
      }
    `,
  ],
})
export class PayoutHistoryComponent implements OnInit {
  @Input() userId!: string;

  private readonly payoutService = inject(PayoutService);

  readonly payouts = signal<Payout[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    void this.loadPayouts();
  }

  async loadPayouts(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const payouts = await this.payoutService
        .getUserPayouts(this.userId)
        .pipe(take(1))
        .toPromise();

      this.payouts.set(payouts || []);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al cargar historial');
    } finally {
      this.loading.set(false);
    }
  }

  getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      pending: 'Pendiente',
      processing: 'Procesando',
      completed: 'Completado',
      failed: 'Fallido',
      cancelled: 'Cancelado',
    };
    return statusMap[status] || status;
  }
}

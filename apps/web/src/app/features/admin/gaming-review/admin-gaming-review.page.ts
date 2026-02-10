import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RewardPoolService } from '@core/services/payments/reward-pool.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';

@Component({
  selector: 'autorenta-admin-gaming-review',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Header -->
    <div class="p-4 md:p-6 max-w-7xl mx-auto">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-text-primary">Revisión Anti-Fraude</h1>
        <p class="text-text-secondary mt-1">
          Cola de owners con señales de gaming que requieren revisión manual
        </p>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-surface-raised rounded-xl p-4 text-center">
          <p class="text-2xl font-bold text-text-primary">{{ stats().total }}</p>
          <p class="text-text-muted text-sm">Total en cola</p>
        </div>
        <div class="bg-surface-raised rounded-xl p-4 text-center">
          <p class="text-2xl font-bold text-amber-400">{{ stats().pending }}</p>
          <p class="text-text-muted text-sm">Pendientes</p>
        </div>
        <div class="bg-surface-raised rounded-xl p-4 text-center">
          <p class="text-2xl font-bold text-blue-400">{{ stats().inReview }}</p>
          <p class="text-text-muted text-sm">En revisión</p>
        </div>
        <div class="bg-surface-raised rounded-xl p-4 text-center">
          <p class="text-2xl font-bold text-red-400">{{ stats().highRisk }}</p>
          <p class="text-text-muted text-sm">Alto riesgo</p>
        </div>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="flex justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent"></div>
        </div>
      }

      <!-- Empty State -->
      @if (!loading() && items().length === 0) {
        <div class="text-center py-12 bg-surface-raised rounded-xl">
          <div class="text-4xl mb-3">&#x2705;</div>
          <h3 class="text-lg font-semibold text-text-primary">Sin items pendientes</h3>
          <p class="text-text-secondary mt-1">No hay owners flaggeados por gaming</p>
        </div>
      }

      <!-- Review Queue List -->
      @if (!loading() && items().length > 0) {
        <div class="space-y-4">
          @for (item of items(); track item.id) {
            <div
              class="bg-surface-raised rounded-xl border border-slate-700 overflow-hidden"
              [class.border-red-500/50]="item.riskScore >= 60"
              [class.border-amber-500/50]="item.riskScore >= 40 && item.riskScore < 60"
            >
              <!-- Item Header -->
              <div class="p-4 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <!-- Risk Score Badge -->
                  <div
                    class="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg"
                    [ngClass]="rewardPoolService.getRiskLevel(item.riskScore).color"
                  >
                    {{ item.riskScore }}
                  </div>
                  <div>
                    <h3 class="font-semibold text-text-primary">{{ item.ownerName }}</h3>
                    <p class="text-text-muted text-sm">{{ item.ownerEmail }}</p>
                  </div>
                </div>
                <div class="text-right">
                  @if (item.frozenAmount) {
                    <p class="text-lg font-bold text-amber-400">
                      $ {{ item.frozenAmount | number : '1.2-2' }}
                    </p>
                    <p class="text-text-muted text-xs">Monto congelado</p>
                  }
                  <span
                    class="inline-block px-2 py-0.5 rounded text-xs font-medium mt-1"
                    [ngClass]="rewardPoolService.getRiskLevel(item.riskScore).color"
                  >
                    Riesgo {{ rewardPoolService.getRiskLevel(item.riskScore).label }}
                  </span>
                </div>
              </div>

              <!-- Signals -->
              @if (item.signals && item.signals.length > 0) {
                <div class="px-4 pb-3">
                  <p class="text-text-muted text-xs uppercase tracking-wide mb-2">Señales detectadas</p>
                  <div class="flex flex-wrap gap-2">
                    @for (sig of item.signals; track sig.type) {
                      <span
                        class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-slate-700/50 text-text-secondary"
                      >
                        <span class="font-medium">{{ rewardPoolService.getGamingSignalLabel(sig.type) }}</span>
                        <span class="text-text-muted">(+{{ sig.score }})</span>
                      </span>
                    }
                  </div>
                </div>
              }

              <!-- Owner Info Row -->
              <div class="px-4 pb-3 flex gap-4 text-xs text-text-muted">
                <span>KYC: {{ item.ownerVerified ? 'Verificado' : 'No verificado' }}</span>
                <span>Rating: {{ item.ownerRating | number : '1.1-1' }}</span>
                <span>Mes: {{ item.month }}</span>
                <span>Creado: {{ item.createdAt | date : 'short' }}</span>
              </div>

              <!-- Expanded Detail (selected) -->
              @if (selectedId() === item.id) {
                <div class="border-t border-slate-700 p-4 bg-slate-800/50">
                  <!-- Notes Input -->
                  <div class="mb-4">
                    <label class="block text-text-muted text-sm mb-1">Notas de resolución</label>
                    <textarea
                      class="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-text-primary text-sm resize-none"
                      rows="2"
                      [ngModel]="resolutionNotes()"
                      (ngModelChange)="resolutionNotes.set($event)"
                      placeholder="Motivo de la decisión..."
                    ></textarea>
                  </div>

                  <!-- Action Buttons -->
                  <div class="flex flex-wrap gap-2">
                    <button
                      class="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                      (click)="resolve(item.id, 'clear')"
                      [disabled]="resolving()"
                    >
                      Limpiar (Sin fraude)
                    </button>
                    <button
                      class="px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-600 text-white hover:bg-amber-500 transition-colors"
                      (click)="resolve(item.id, 'warn')"
                      [disabled]="resolving()"
                    >
                      Advertir
                    </button>
                    <button
                      class="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-500 transition-colors"
                      (click)="resolve(item.id, 'suspend')"
                      [disabled]="resolving()"
                    >
                      Suspender (30 días)
                    </button>
                    @if (item.frozenAmount) {
                      <button
                        class="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                        (click)="resolve(item.id, 'release_payout')"
                        [disabled]="resolving()"
                      >
                        Liberar pago
                      </button>
                      <button
                        class="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-600 text-white hover:bg-slate-500 transition-colors"
                        (click)="resolve(item.id, 'cancel_payout')"
                        [disabled]="resolving()"
                      >
                        Cancelar pago
                      </button>
                    }
                  </div>
                </div>
              } @else {
                <!-- Expand Button -->
                <div class="border-t border-slate-700 p-2">
                  <button
                    class="w-full text-center text-sm text-primary-400 hover:text-primary-300 py-1"
                    (click)="selectedId.set(item.id)"
                  >
                    Revisar y tomar acción
                  </button>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class AdminGamingReviewPage implements OnInit {
  readonly rewardPoolService = inject(RewardPoolService);
  private readonly toastService = inject(NotificationManagerService);

  readonly loading = this.rewardPoolService.reviewQueueLoading;
  readonly items = this.rewardPoolService.reviewQueue;
  readonly stats = this.rewardPoolService.reviewQueueStats;

  readonly selectedId = signal<string | null>(null);
  readonly resolutionNotes = signal('');
  readonly resolving = signal(false);

  async ngOnInit(): Promise<void> {
    await this.rewardPoolService.loadAdminReviewQueue();
  }

  async resolve(
    reviewId: string,
    action: 'clear' | 'warn' | 'suspend' | 'release_payout' | 'cancel_payout',
  ): Promise<void> {
    this.resolving.set(true);

    try {
      const success = await this.rewardPoolService.resolveReview(
        reviewId,
        action,
        this.resolutionNotes() || undefined,
      );

      if (success) {
        const actionLabels: Record<string, string> = {
          clear: 'Owner limpiado',
          warn: 'Advertencia enviada',
          suspend: 'Owner suspendido (30 días)',
          release_payout: 'Pago liberado',
          cancel_payout: 'Pago cancelado',
        };
        this.toastService.success('Resuelto', actionLabels[action] || 'Acción completada');
        this.selectedId.set(null);
        this.resolutionNotes.set('');
        await this.rewardPoolService.loadAdminReviewQueue();
      } else {
        this.toastService.error('Error', 'No se pudo resolver la revisión');
      }
    } catch {
      this.toastService.error('Error', 'Error inesperado');
    } finally {
      this.resolving.set(false);
    }
  }
}

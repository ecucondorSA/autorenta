import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, OnInit, inject, signal } from '@angular/core';
import { WithdrawalService } from '@core/services/withdrawal.service';
import { NotificationManagerService } from '@core/services/notification-manager.service';
import type { WithdrawalRequest } from '@core/models/wallet.model';

@Component({
  selector: 'app-withdrawals-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-text-primary">Gestión de Retiros</h1>
        <p class="mt-2 text-sm text-text-secondary">
          Aprueba o rechaza solicitudes de retiro de fondos.
        </p>
      </div>

      <div class="mb-4 flex gap-2">
        <button
          (click)="loadWithdrawals('pending')"
          class="rounded-lg px-4 py-2 text-sm font-medium"
          [class.bg-cta-default]="filterStatus() === 'pending'"
          [class.text-text-inverse]="filterStatus() === 'pending'"
          [class.bg-surface-hover]="filterStatus() !== 'pending'"
        >
          Pendientes
        </button>
        <button
          (click)="loadWithdrawals('completed')"
          class="rounded-lg px-4 py-2 text-sm font-medium"
          [class.bg-cta-default]="filterStatus() === 'completed'"
          [class.text-text-inverse]="filterStatus() === 'completed'"
          [class.bg-surface-hover]="filterStatus() !== 'completed'"
        >
          Completados
        </button>
        <button
          (click)="loadWithdrawals('rejected')"
          class="rounded-lg px-4 py-2 text-sm font-medium"
          [class.bg-cta-default]="filterStatus() === 'rejected'"
          [class.text-text-inverse]="filterStatus() === 'rejected'"
          [class.bg-surface-hover]="filterStatus() !== 'rejected'"
        >
          Rechazados
        </button>
      </div>

      @if (loading()) {
        <div class="flex items-center justify-center py-12">
          <div
            class="h-8 w-8 animate-spin rounded-full border-4 border-cta-default border-t-transparent"
          ></div>
        </div>
      } @else if (withdrawals().length === 0) {
        <div class="rounded-lg border border-border-default bg-surface-base p-8 text-center">
          <p class="text-text-secondary">No hay solicitudes de retiro.</p>
        </div>
      } @else {
        <div class="space-y-4">
          @for (withdrawal of withdrawals(); track withdrawal.id) {
            <div class="rounded-lg border border-border-default bg-surface-raised p-6 shadow-sm">
              <div class="mb-4 flex items-start justify-between">
                <div>
                  <h3 class="font-semibold text-text-primary">
                    Solicitud #{{ withdrawal.id.slice(0, 8) }}
                  </h3>
                  <p class="text-sm text-text-secondary">
                    Usuario: {{ withdrawal.user_id.slice(0, 8) }}... | Monto: \${{
                      withdrawal.amount | number: '1.2-2'
                    }}
                  </p>
                  <p class="text-xs text-text-secondary">
                    {{ withdrawal.created_at | date: 'short' }}
                  </p>
                </div>
                <span
                  class="rounded-full px-3 py-1 text-xs font-medium"
                  [class.bg-warning-bg-hover]="withdrawal.status === 'pending'"
                  [class.text-warning-strong]="withdrawal.status === 'pending'"
                  [class.bg-success-light/20]="withdrawal.status === 'completed'"
                  [class.text-success-light]="withdrawal.status === 'completed'"
                  [class.bg-error-bg-hover]="withdrawal.status === 'rejected'"
                  [class.text-error-strong]="withdrawal.status === 'rejected'"
                >
                  {{ withdrawal.status }}
                </span>
              </div>

              @if (withdrawal.user_notes) {
                <div class="mb-4 rounded-lg bg-surface-base p-3">
                  <p class="text-xs font-medium text-text-secondary">Notas del usuario:</p>
                  <p class="text-sm text-text-primary">{{ withdrawal.user_notes }}</p>
                </div>
              }

              @if (withdrawal.status === 'pending') {
                <div class="space-y-3">
                  <div>
                    <label class="block text-sm font-medium text-text-primary"
                      >Notas de administración</label
                    >
                    <textarea
                      [(ngModel)]="adminNotes[withdrawal.id]"
                      rows="3"
                      class="mt-1 block w-full rounded-md border border-border-muted px-3 py-2 text-sm"
                      placeholder="Opcional: Agrega notas sobre esta decisión"
                    ></textarea>
                  </div>
                  <div class="flex gap-2">
                    <button
                      (click)="approveWithdrawal(withdrawal.id)"
                      [disabled]="processing()"
                      class="flex-1 rounded-lg bg-success-light text-text-primary hover:bg-success-light disabled:opacity-50"
                    >
                      Aprobar
                    </button>
                    <button
                      (click)="showRejectModal(withdrawal.id)"
                      [disabled]="processing()"
                      class="flex-1 rounded-lg bg-error-600 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-error-700 disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              }

              @if (withdrawal.rejection_reason) {
                <div class="mt-3 rounded-lg bg-error-bg p-3">
                  <p class="text-xs font-medium text-error-strong">Razón de rechazo:</p>
                  <p class="text-sm text-error-strong">{{ withdrawal.rejection_reason }}</p>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- Modal de rechazo -->
      @if (rejectingId()) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay/50 p-4"
          (click)="cancelReject()"
        >
          <div
            class="w-full max-w-md rounded-lg bg-surface-raised p-6 shadow-xl"
            (click)="$event.stopPropagation()"
          >
            <h3 class="mb-4 text-lg font-semibold">Rechazar Retiro</h3>
            <div class="mb-4">
              <label class="block text-sm font-medium text-text-primary">
                Razón del rechazo (requerido)
              </label>
              <textarea
                [(ngModel)]="rejectionReason"
                rows="4"
                class="mt-1 block w-full rounded-md border border-border-muted px-3 py-2 text-sm"
                placeholder="Explica por qué se rechaza esta solicitud"
              ></textarea>
            </div>
            <div class="flex gap-2">
              <button
                (click)="cancelReject()"
                class="flex-1 rounded-lg border border-border-muted px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-base"
              >
                Cancelar
              </button>
              <button
                (click)="confirmReject()"
                [disabled]="!rejectionReason || processing()"
                class="flex-1 rounded-lg bg-error-600 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-error-700 disabled:opacity-50"
              >
                Rechazar
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class WithdrawalsAdminPage implements OnInit {
  private readonly withdrawalService = inject(WithdrawalService);
  private readonly toastService = inject(NotificationManagerService);

  readonly withdrawals = signal<WithdrawalRequest[]>([]);
  readonly loading = signal(false);
  readonly processing = signal(false);
  readonly filterStatus = signal<'pending' | 'completed' | 'rejected' | null>(null);
  readonly rejectingId = signal<string | null>(null);

  adminNotes: Record<string, string> = {};
  rejectionReason = '';

  async ngOnInit(): Promise<void> {
    await this.loadWithdrawals('pending');
  }

  async loadWithdrawals(status?: 'pending' | 'completed' | 'rejected'): Promise<void> {
    this.loading.set(true);
    this.filterStatus.set(status || null);

    try {
      // Usar el método administrativo para obtener retiros
      const requests = await this.withdrawalService.getAllWithdrawals({
        status: status ? [status] : undefined,
      });
      this.withdrawals.set(requests);
    } catch (err) {
      this.toastService.error(
        'Retiros',
        err instanceof Error ? err.message : 'Error al cargar retiros',
      );
    } finally {
      this.loading.set(false);
    }
  }

  async approveWithdrawal(requestId: string): Promise<void> {
    this.processing.set(true);

    try {
      await this.withdrawalService.approveWithdrawal({
        request_id: requestId,
        admin_notes: this.adminNotes[requestId] || undefined,
      });
      this.toastService.success('Retiros', 'Retiro aprobado correctamente');
      await this.loadWithdrawals(this.filterStatus() || undefined);
    } catch (err) {
      this.toastService.error(
        'Retiros',
        err instanceof Error ? err.message : 'Error al aprobar retiro',
      );
    } finally {
      this.processing.set(false);
    }
  }

  showRejectModal(requestId: string): void {
    this.rejectingId.set(requestId);
    this.rejectionReason = '';
  }

  cancelReject(): void {
    this.rejectingId.set(null);
    this.rejectionReason = '';
  }

  async confirmReject(): Promise<void> {
    const requestId = this.rejectingId();
    if (!requestId || !this.rejectionReason) return;

    this.processing.set(true);

    try {
      await this.withdrawalService.rejectWithdrawal({
        request_id: requestId,
        rejection_reason: this.rejectionReason,
      });
      this.toastService.success('Retiros', 'Retiro rechazado');
      this.cancelReject();
      await this.loadWithdrawals(this.filterStatus() || undefined);
    } catch (err) {
      this.toastService.error(
        'Retiros',
        err instanceof Error ? err.message : 'Error al rechazar retiro',
      );
    } finally {
      this.processing.set(false);
    }
  }
}

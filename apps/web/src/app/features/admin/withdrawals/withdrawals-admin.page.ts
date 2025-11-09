import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, OnInit, inject, signal } from '@angular/core';
import { WithdrawalService } from '@core/services/withdrawal.service';
import { ToastService } from '@core/services/toast.service';
import type { WithdrawalRequest } from '@core/models';

@Component({
  selector: 'app-withdrawals-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './withdrawals-admin.page.html',
})
export class WithdrawalsAdminPage implements OnInit {
  private readonly withdrawalService = inject(WithdrawalService);
  private readonly toastService = inject(ToastService);

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
      // Note: WithdrawalService no tiene método getAllWithdrawals para admin
      // Esto requeriría una implementación adicional en el servicio
      // Por ahora, usamos el método del usuario como placeholder
      const requests = await this.withdrawalService.getWithdrawalRequests({
        status: status ? [status] : undefined,
      });
      this.withdrawals.set(requests);
    } catch (err) {
      this.toastService.error(
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
        admin_notes: this.adminNotes[requestId] || null,
      });
      this.toastService.success('Retiro aprobado', 'El retiro fue aprobado correctamente');
      await this.loadWithdrawals(this.filterStatus() || undefined);
    } catch (err) {
      this.toastService.error(
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
      this.toastService.success('Retiro rechazado', 'El retiro fue rechazado correctamente');
      this.cancelReject();
      await this.loadWithdrawals(this.filterStatus() || undefined);
    } catch (err) {
      this.toastService.error(
        err instanceof Error ? err.message : 'Error al rechazar retiro',
      );
    } finally {
      this.processing.set(false);
    }
  }
}


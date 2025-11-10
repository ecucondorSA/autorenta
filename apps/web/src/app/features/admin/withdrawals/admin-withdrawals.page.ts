import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AdminService } from '@core/services/admin.service';
import { WithdrawalRequest, WithdrawalStatus } from '@core/models';
import { MoneyPipe } from '@shared/pipes/money.pipe';
import { TranslateModule } from '@ngx-translate/core';

interface WithdrawalExportRow {
  fecha: string;
  usuario: string;
  email: string;
  cuenta: string;
  titular: string;
  documento: string;
  monto: number;
  comision: number;
  neto: number;
  estado: string;
}

@Component({
  selector: 'autorenta-admin-withdrawals-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MoneyPipe, TranslateModule],
  templateUrl: './admin-withdrawals.page.html',
  styleUrl: './admin-withdrawals.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminWithdrawalsPage implements OnInit {
  private readonly adminService = inject(AdminService);

  private readonly withdrawalsSignal = signal<WithdrawalRequest[]>([]);
  private readonly loadingSignal = signal<boolean>(true);
  private readonly filterStatusSignal = signal<WithdrawalStatus | ''>('');
  private readonly selectedWithdrawalSignal = signal<WithdrawalRequest | null>(null);
  private readonly actionNotesSignal = signal<string>('');

  readonly withdrawals = computed(() => this.withdrawalsSignal());
  readonly loading = computed(() => this.loadingSignal());
  readonly filterStatus = computed(() => this.filterStatusSignal());
  readonly selectedWithdrawal = computed(() => this.selectedWithdrawalSignal());
  readonly actionNotes = computed(() => this.actionNotesSignal());

  readonly pendingCount = computed(
    () => this.withdrawalsSignal().filter((w) => w.status === 'pending').length,
  );

  readonly totalPendingAmount = computed(() =>
    this.withdrawalsSignal()
      .filter((w) => w.status === 'pending')
      .reduce((sum, w) => sum + w.net_amount, 0),
  );

  async ngOnInit(): Promise<void> {
    await this.loadWithdrawals();
  }

  async loadWithdrawals(): Promise<void> {
    this.loadingSignal.set(true);
    try {
      const status = this.filterStatusSignal();
      const withdrawals = await this.adminService.listWithdrawalRequests(status || undefined);
      this.withdrawalsSignal.set(withdrawals);
    } catch {
      this.withdrawalsSignal.set([]);
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async filterByStatus(status: WithdrawalStatus | ''): Promise<void> {
    this.filterStatusSignal.set(status);
    await this.loadWithdrawals();
  }

  selectWithdrawal(withdrawal: WithdrawalRequest): void {
    this.selectedWithdrawalSignal.set(withdrawal);
    this.actionNotesSignal.set('');
  }

  closeModal(): void {
    this.selectedWithdrawalSignal.set(null);
    this.actionNotesSignal.set('');
  }

  updateActionNotes(notes: string): void {
    this.actionNotesSignal.set(notes);
  }

  async approveWithdrawal(withdrawal: WithdrawalRequest): Promise<void> {
    if (!confirm(`¿Aprobar retiro de ${withdrawal.user_name} por $${withdrawal.net_amount}?`)) {
      return;
    }

    try {
      await this.adminService.approveWithdrawal(
        withdrawal.id,
        this.actionNotesSignal() || undefined,
      );
      alert('Retiro aprobado exitosamente');
      this.closeModal();
      await this.loadWithdrawals();
    } catch (error) {
      alert('Error al aprobar retiro: ' + (error as Error).message);
    }
  }

  async completeWithdrawal(withdrawal: WithdrawalRequest): Promise<void> {
    const transactionId = prompt('Ingrese el ID de transacción bancaria/MercadoPago:', '');
    if (!transactionId) return;

    try {
      await this.adminService.completeWithdrawal(withdrawal.id, transactionId, {
        completed_by: 'admin',
        notes: this.actionNotesSignal() || undefined,
        completed_at: new Date().toISOString(),
      });
      alert('Retiro completado exitosamente');
      this.closeModal();
      await this.loadWithdrawals();
    } catch (error) {
      alert('Error al completar retiro: ' + (error as Error).message);
    }
  }

  async rejectWithdrawal(withdrawal: WithdrawalRequest): Promise<void> {
    const reason = this.actionNotesSignal() || prompt('Motivo del rechazo:', '');
    if (!reason) {
      alert('Debe ingresar un motivo de rechazo');
      return;
    }

    if (!confirm(`¿Rechazar retiro de ${withdrawal.user_name}?`)) {
      return;
    }

    try {
      await this.adminService.rejectWithdrawal(withdrawal.id, reason);
      alert('Retiro rechazado');
      this.closeModal();
      await this.loadWithdrawals();
    } catch (error) {
      alert('Error al rechazar retiro: ' + (error as Error).message);
    }
  }

  exportToCSV(): void {
    const rows: WithdrawalExportRow[] = this.withdrawalsSignal().map((w) => ({
      fecha: new Date(w.created_at).toLocaleDateString('es-AR'),
      usuario: w.user_name || 'N/A',
      email: w.user_email || 'N/A',
      cuenta: w.bank_account?.account_number || 'N/A',
      titular: w.bank_account?.account_holder_name || 'N/A',
      documento: w.bank_account?.account_holder_document || 'N/A',
      monto: w.amount,
      comision: w.fee_amount,
      neto: w.net_amount,
      estado: w.status,
    }));

    const headers = Object.keys(rows[0] || {}).join(',');
    const csvContent = [
      headers,
      ...rows.map((row) =>
        Object.values(row)
          .map((v) => (typeof v === 'string' && v.includes(',') ? `"${v}"` : v))
          .join(','),
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `retiros-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getStatusBadgeClass(status: WithdrawalStatus): string {
    const classes: Record<WithdrawalStatus, string> = {
      pending: 'bg-warning-100 text-warning-800',
      approved: 'bg-cta-default/20 text-cta-default',
      processing: 'bg-cta-default/20 text-cta-default',
      completed: 'bg-success-light/20 text-success-light',
      failed: 'bg-error-100 text-error-800',
      rejected: 'bg-surface-raised text-text-primary',
      cancelled: 'bg-surface-raised text-text-primary',
    };
    return classes[status] || 'bg-surface-raised text-text-primary';
  }

  getStatusText(status: WithdrawalStatus): string {
    const texts: Record<WithdrawalStatus, string> = {
      pending: 'Pendiente',
      approved: 'Aprobado',
      processing: 'Procesando',
      completed: 'Completado',
      failed: 'Fallido',
      rejected: 'Rechazado',
      cancelled: 'Cancelado',
    };
    return texts[status] || status;
  }

  formatAccountType(type: string): string {
    const types: Record<string, string> = {
      cbu: 'CBU',
      cvu: 'CVU',
      alias: 'Alias',
    };
    return types[type] || type.toUpperCase();
  }
}

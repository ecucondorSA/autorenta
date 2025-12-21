import {Component, EventEmitter, Input, Output,
  ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import type { WithdrawalRequest, WithdrawalStatus } from '@core/models/wallet.model';
import { IconComponent } from '../icon/icon.component';

/**
 * Componente para mostrar historial de retiros
 */
@Component({
  selector: 'app-withdrawal-history',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslateModule, IconComponent],
  templateUrl: './withdrawal-history.component.html',
  styleUrl: './withdrawal-history.component.css',
})
export class WithdrawalHistoryComponent {
  @Input({ required: true }) requests: WithdrawalRequest[] = [];
  @Input() loading = false;

  @Output() cancelRequest = new EventEmitter<string>();
  @Output() refresh = new EventEmitter<void>();

  getStatusLabel(status: WithdrawalStatus): string {
    const labels: Record<WithdrawalStatus, string> = {
      pending: 'Pendiente',
      approved: 'Aprobado',
      processing: 'Procesando',
      completed: 'Completado',
      failed: 'Fallido',
      rejected: 'Rechazado',
      cancelled: 'Cancelado',
    };
    return labels[status] || status;
  }

  getStatusClass(status: WithdrawalStatus): string {
    const classes: Record<WithdrawalStatus, string> = {
      pending: 'bg-warning-bg-hover text-warning-strong',
      approved: 'bg-cta-default/20 text-cta-default',
      processing: 'bg-cta-default/20 text-cta-default',
      completed: 'bg-success-bg-hover text-success-strong',
      failed: 'bg-error-bg-hover text-error-strong',
      rejected: 'bg-error-bg-hover text-error-strong',
      cancelled: 'bg-neutral-100 text-neutral-900',
    };
    return classes[status] || 'bg-neutral-100 text-neutral-900';
  }

  getStatusIcon(status: WithdrawalStatus): string {
    const icons: Record<WithdrawalStatus, string> = {
      pending: '⏳',
      approved: '✓',
      processing: '⚙️',
      completed: '✅',
      failed: '❌',
      rejected: '🚫',
      cancelled: '⊗',
    };
    return icons[status] || '•';
  }

  canCancel(request: WithdrawalRequest): boolean {
    return request.status === 'pending';
  }

  onCancel(requestId: string): void {
    if (confirm('¿Estás seguro de que querés cancelar esta solicitud de retiro?')) {
      this.cancelRequest.emit(requestId);
    }
  }

  onRefresh(): void {
    this.refresh.emit();
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

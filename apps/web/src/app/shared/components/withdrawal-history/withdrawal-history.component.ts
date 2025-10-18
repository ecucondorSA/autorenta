import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { WithdrawalRequest, WithdrawalStatus } from '../../../core/models/wallet.model';

/**
 * Componente para mostrar historial de retiros
 */
@Component({
  selector: 'app-withdrawal-history',
  standalone: true,
  imports: [CommonModule],
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
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      processing: 'bg-indigo-100 text-indigo-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
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

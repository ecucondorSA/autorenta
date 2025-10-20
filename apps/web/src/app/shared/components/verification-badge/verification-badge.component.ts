import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { VerificationService } from '../../../core/services/verification.service';
import type { VerificationStatus } from '../../../core/models';

@Component({
  standalone: true,
  selector: 'app-verification-badge',
  imports: [CommonModule],
  template: `
    <ng-container *ngIf="hasData()">
      <div
        class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
        [class]="getBadgeClass(overallStatus())"
        title="Documento validado por Autorentar IA"
      >
        <span>{{ getStatusIcon(overallStatus()) }}</span>
        <span>{{ getStatusLabel(overallStatus()) }}</span>
      </div>
    </ng-container>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerificationBadgeComponent implements OnInit {
  private readonly verificationService = inject(VerificationService);

  readonly statuses = this.verificationService.statuses;

  readonly overallStatus = computed<VerificationStatus>(() => {
    const current = this.statuses();
    if (!current.length) {
      return 'PENDIENTE';
    }
    if (current.some((status) => status.status === 'RECHAZADO')) {
      return 'RECHAZADO';
    }
    if (current.every((status) => status.status === 'VERIFICADO')) {
      return 'VERIFICADO';
    }
    return 'PENDIENTE';
  });

  hasData = computed(() => this.statuses().length > 0);

  async ngOnInit(): Promise<void> {
    if (!this.statuses().length) {
      try {
        await this.verificationService.loadStatuses();
      } catch (error) {
        console.warn('[VerificationBadgeComponent] No se pudo cargar el estado de verificación:', error);
      }
    }
  }

  getStatusLabel(status: VerificationStatus): string {
    switch (status) {
      case 'VERIFICADO':
        return 'Verificado para alquiler';
      case 'RECHAZADO':
        return 'Verificación rechazada';
      default:
        return 'Verificación pendiente';
    }
  }

  getStatusIcon(status: VerificationStatus): string {
    switch (status) {
      case 'VERIFICADO':
        return '🟢';
      case 'RECHAZADO':
        return '🔴';
      default:
        return '🔶';
    }
  }

  getBadgeClass(status: VerificationStatus): string {
    switch (status) {
      case 'VERIFICADO':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'RECHAZADO':
        return 'bg-red-100 text-red-800 border border-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    }
  }
}

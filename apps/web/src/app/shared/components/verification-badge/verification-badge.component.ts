import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { VerificationService } from '../../../core/services/verification.service';
import type { VerificationStatus } from '../../../core/models';

@Component({
  standalone: true,
  selector: 'app-verification-badge',
  imports: [CommonModule, TranslateModule],
  template: `
    <ng-container *ngIf="hasData()">
      <button
        type="button"
        (click)="goToVerification()"
        class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200 hover:shadow-md hover:scale-105 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2"
        [class]="getBadgeClass(overallStatus())"
        [title]="getButtonTitle(overallStatus())"
      >
        <span>{{ getStatusIcon(overallStatus()) }}</span>
        <span>{{ getStatusLabel(overallStatus()) }}</span>
        <svg
          *ngIf="overallStatus() !== 'VERIFICADO'"
          class="w-3 h-3 ml-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </ng-container>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerificationBadgeComponent implements OnInit {
  private readonly verificationService = inject(VerificationService);
  private readonly router = inject(Router);

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
        // Silent fail - verification status is optional
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

  goToVerification(): void {
    // Navigate to profile page with verification tab
    this.router.navigate(['/profile'], {
      queryParams: { tab: 'verification' },
    });
  }

  getButtonTitle(status: VerificationStatus): string {
    switch (status) {
      case 'VERIFICADO':
        return 'Documento validado por Autorentar IA';
      case 'RECHAZADO':
        return 'Click para revisar y reintentar verificación';
      default:
        return 'Click para completar verificación de identidad';
    }
  }
}

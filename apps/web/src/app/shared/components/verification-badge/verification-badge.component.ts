import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { VerificationService } from '@core/services/verification/verification.service';
import { TrustService } from '@core/services/verification/trust.service';
import type { VerificationStatus } from '../../../core/models';

@Component({
  standalone: true,
  selector: 'app-verification-badge',
  imports: [TranslateModule],
  template: `
    @if (hasData()) {
      <button
        type="button"
        (click)="goToVerification()"
        class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200 hover:shadow-md hover:scale-105 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2"
        [class]="getBadgeClass(overallStatus())"
        [title]="getButtonTitle(overallStatus())"
      >
        <span>{{ getStatusIcon(overallStatus()) }}</span>
        <span>{{ getStatusLabel(overallStatus()) }}</span>
        @if (overallStatus() !== 'VERIFICADO') {
          <svg class="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        }
      </button>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerificationBadgeComponent implements OnInit {
  private readonly verificationService = inject(VerificationService);
  private readonly trustService = inject(TrustService);
  private readonly router = inject(Router);

  readonly statuses = this.verificationService.statuses;
  readonly risk = this.trustService.currentTrust;

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
    const promises = [];
    if (!this.statuses().length) {
      promises.push(this.verificationService.loadStatuses().catch(() => {}));
    }
    promises.push(this.trustService.fetchTrustStatus().catch(() => {}));
    
    await Promise.all(promises);
  }

  getStatusLabel(status: VerificationStatus): string {
    const risk = this.risk();
    if (status === 'VERIFICADO' && risk) {
      if (risk.risk_level === 'low') return 'Verificado • High Trust';
      if (risk.risk_level === 'medium') return 'Verificado';
      if (risk.risk_level === 'high') return 'Verificado • Revisión';
    }

    switch (status) {
      case 'VERIFICADO':
        return 'Verificado';
      case 'RECHAZADO':
        return 'Verificación rechazada';
      default:
        return 'Verificación pendiente';
    }
  }

  getStatusIcon(status: VerificationStatus): string {
    const risk = this.risk();
    if (status === 'VERIFICADO' && risk) {
      if (risk.risk_level === 'low') return '🛡️'; // Shield for High Trust
      if (risk.risk_level === 'high' || risk.risk_level === 'critical') return '⚠️';
    }

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
    const risk = this.risk();
    if (status === 'VERIFICADO' && risk) {
      if (risk.risk_level === 'low') {
        // Gold/Premium style for High Trust
        return 'bg-amber-100 text-amber-800 border border-amber-300 shadow-sm';
      }
      if (risk.risk_level === 'high' || risk.risk_level === 'critical') {
        // Warning style even if verified
        return 'bg-orange-100 text-orange-800 border border-orange-300';
      }
    }

    switch (status) {
      case 'VERIFICADO':
        return 'bg-success-bg text-success-strong border border-success-border';
      case 'RECHAZADO':
        return 'bg-error-bg text-error-strong border border-error-border';
      default:
        return 'bg-warning-bg text-warning-strong border border-warning-border';
    }
  }

  goToVerification(): void {
    // Navigate to profile page with verification tab
    this.router.navigate(['/profile'], {
      queryParams: { tab: 'verification' },
    });
  }

  getButtonTitle(status: VerificationStatus): string {
    const risk = this.risk();
    if (status === 'VERIFICADO' && risk) {
       return `Nivel de confianza: ${risk.score}/100 (${risk.risk_level.toUpperCase()})`;
    }

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

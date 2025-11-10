import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AutorentarCreditService } from '../../../core/services/autorentar-credit.service';

@Component({
  selector: 'app-autorentar-credit-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './autorentar-credit-card.component.html',
  styleUrls: ['./autorentar-credit-card.component.css'],
})
export class AutorentarCreditCardComponent {
  private readonly creditService = inject(AutorentarCreditService);

  @Input() showRenewalInfo: boolean = true;
  @Input() compact: boolean = false;
  @Output() checkRenewal = new EventEmitter<void>();

  readonly creditInfo = this.creditService.creditInfo;
  readonly loading = this.creditService.loading;
  readonly error = this.creditService.error;

  readonly balance = this.creditService.balance;
  readonly balanceCents = this.creditService.balanceCents;
  readonly expiresAt = this.creditService.expiresAt;
  readonly daysUntilExpiration = this.creditService.daysUntilExpiration;
  readonly isExpired = this.creditService.isExpired;
  readonly isRenewable = this.creditService.isRenewable;

  getExpirationColor(): string {
    const days = this.daysUntilExpiration();
    if (days === null) return 'text-text-secondary dark:text-text-secondary';
    if (this.isExpired()) return 'text-error-600';
    if (days <= 30) return 'text-warning-light';
    if (days <= 90) return 'text-warning-600';
    return 'text-success-light';
  }

  getExpirationLabel(): string {
    const days = this.daysUntilExpiration();
    if (days === null) return 'Sin crédito activo';
    if (this.isExpired()) return 'Expirado';
    if (days === 0) return 'Expira hoy';
    if (days === 1) return 'Expira mañana';
    if (days <= 7) return `Expira en ${days} días`;
    if (days <= 30) return `Expira en ${Math.ceil(days / 7)} semanas`;
    const months = Math.ceil(days / 30);
    return `Expira en ${months} ${months === 1 ? 'mes' : 'meses'}`;
  }

  getBalanceColor(): string {
    const balance = this.balance();
    if (balance <= 0) return 'text-error-600';
    if (balance < 100) return 'text-warning-light';
    if (balance < 200) return 'text-warning-600';
    return 'text-success-light';
  }

  formatBalance(): string {
    return this.creditService.formatBalance();
  }

  formatExpirationDate(): string | null {
    return this.creditService.formatExpirationDate();
  }

  onCheckRenewal(): void {
    this.checkRenewal.emit();
  }

  refresh(): void {
    this.creditService.refresh();
  }

  hasCredit(): boolean {
    return this.balance() > 0 && !this.isExpired();
  }
}

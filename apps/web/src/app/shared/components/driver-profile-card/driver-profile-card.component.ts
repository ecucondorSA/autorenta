import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DriverProfileService } from '../../../core/services/driver-profile.service';

@Component({
  selector: 'app-driver-profile-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './driver-profile-card.component.html',
  styleUrls: ['./driver-profile-card.component.css'],
})
export class DriverProfileCardComponent {
  private readonly driverProfileService = inject(DriverProfileService);

  @Input() showDetails: boolean = true;
  @Input() compact: boolean = false;
  @Output() viewBenefits = new EventEmitter<void>();

  readonly profile = this.driverProfileService.profile;
  readonly loading = this.driverProfileService.loading;
  readonly error = this.driverProfileService.error;

  readonly driverClass = this.driverProfileService.driverClass;
  readonly driverScore = this.driverProfileService.driverScore;
  readonly cleanPercentage = this.driverProfileService.cleanPercentage;
  readonly feeMultiplier = this.driverProfileService.feeMultiplier;
  readonly guaranteeMultiplier = this.driverProfileService.guaranteeMultiplier;
  readonly classDescription = this.driverProfileService.classDescription;

  getClassColor(driverClass: number): string {
    if (driverClass <= 2) return 'text-green-600 bg-green-50';
    if (driverClass <= 4) return 'text-blue-600 bg-blue-50';
    if (driverClass <= 6) return 'text-yellow-600 bg-yellow-50';
    if (driverClass <= 8) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  }

  getClassBadgeColor(driverClass: number): string {
    if (driverClass <= 2) return 'bg-green-500';
    if (driverClass <= 4) return 'bg-blue-500';
    if (driverClass <= 6) return 'bg-yellow-500';
    if (driverClass <= 8) return 'bg-orange-500';
    return 'bg-red-500';
  }

  getScoreColor(score: number): string {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  }

  getScoreLabel(score: number): string {
    if (score >= 90) return 'Excelente';
    if (score >= 75) return 'Bueno';
    if (score >= 60) return 'Regular';
    if (score >= 40) return 'Bajo';
    return 'Muy Bajo';
  }

  getFeeMultiplierLabel(multiplier: number): string {
    if (multiplier < 1) {
      const discount = Math.round((1 - multiplier) * 100);
      return `${discount}% descuento`;
    } else if (multiplier > 1) {
      const increase = Math.round((multiplier - 1) * 100);
      return `+${increase}% recargo`;
    }
    return 'Sin ajuste';
  }

  getGuaranteeMultiplierLabel(multiplier: number): string {
    if (multiplier < 1) {
      const discount = Math.round((1 - multiplier) * 100);
      return `${discount}% menos`;
    } else if (multiplier > 1) {
      const increase = Math.round((multiplier - 1) * 100);
      return `+${increase}% más`;
    }
    return 'Sin ajuste';
  }

  getProgressBarWidth(): string {
    const profile = this.profile();
    if (!profile) return '0%';

    // Progress from current class to class 0 (best)
    // Class 10 (worst) = 0%, Class 0 (best) = 100%
    const progress = ((10 - profile.class) / 10) * 100;
    return `${progress}%`;
  }

  onViewBenefits(): void {
    this.viewBenefits.emit();
  }

  refresh(): void {
    this.driverProfileService.refresh();
  }
}

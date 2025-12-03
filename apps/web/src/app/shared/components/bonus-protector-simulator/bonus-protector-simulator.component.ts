import { Component, input, signal, inject, computed, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BonusProtectorService } from '../../../core/services/bonus-protector.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-bonus-protector-simulator',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './bonus-protector-simulator.component.html',
  styleUrls: ['./bonus-protector-simulator.component.scss'],
})
export class BonusProtectorSimulatorComponent {
  readonly currentClass = input<number>(5);
  readonly baseFeeUsd = input<number>(50);
  readonly baseGuaranteeUsd = input<number>(200);

  private readonly bonusProtectorService = inject(BonusProtectorService);

  readonly claimSeverity = signal<number>(1);
  readonly protectionLevel = signal<number>(1);
  readonly simulationResult = signal<{
    withoutProtector: { oldClass: number; newClass: number; increase: number };
    withProtector: { oldClass: number; newClass: number; increase: number; protected: boolean };
    savings: { classIncrease: number; feeImpact: string; guaranteeImpact: string };
  } | null>(null);

  readonly potentialSavings = signal<{
    feeIncrease: number;
    guaranteeIncrease: number;
    totalSavings: number;
    isWorthIt: boolean;
  } | null>(null);

  readonly recommendedLevel = computed(() =>
    this.bonusProtectorService.getRecommendedLevel(this.currentClass()),
  );

  readonly protectionCapacity = computed(() =>
    this.bonusProtectorService.getProtectionCapacity(this.protectionLevel()),
  );

  simulateImpact(): void {
    const result = this.bonusProtectorService.simulateClaimImpact(
      this.currentClass(),
      this.claimSeverity(),
    );
    this.simulationResult.set(result);
  }

  calculateSavings(): void {
    const savings = this.bonusProtectorService.calculatePotentialSavings(
      this.protectionLevel(),
      this.currentClass(),
      this.baseFeeUsd(),
      this.baseGuaranteeUsd(),
    );
    this.potentialSavings.set(savings);
  }

  getSeverityLabel(severity: number): string {
    if (severity === 1) return 'Leve';
    if (severity === 2) return 'Moderado';
    return 'Grave';
  }

  getClassColor(classNum: number): string {
    if (classNum <= 3) return 'success';
    if (classNum <= 6) return 'warning';
    return 'danger';
  }
}

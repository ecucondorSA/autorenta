
import {Component, Input, inject, signal,
  ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EligibilityResult, WaterfallBreakdown } from '../../../core/models/fgo-v1-1.model';
import { NotificationManagerService } from '../../../core/services/notification-manager.service';
import { SettlementService } from '../../../core/services/settlement.service';

@Component({
  selector: 'app-settlement-simulator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './settlement-simulator.component.html',
})
export class SettlementSimulatorComponent {
  @Input({ required: true }) bookingId!: string;

  private readonly settlementService = inject(SettlementService);
  private readonly toastService = inject(NotificationManagerService);

  claimAmountUsd = 100;
  readonly simulating = signal(false);
  readonly simulationResult = signal<{
    eligibility: EligibilityResult | null;
    estimatedBreakdown: Partial<WaterfallBreakdown> | null;
  } | null>(null);
  readonly error = signal<string | null>(null);

  formatCurrency(amount: number): string {
    return amount.toFixed(2);
  }

  async simulate(): Promise<void> {
    this.simulating.set(true);
    this['error'].set(null);

    try {
      const result = await this.settlementService.simulateWaterfall(
        this['bookingId'],
        this.claimAmountUsd,
      );
      this.simulationResult.set(result);
    } catch (err) {
      const errorMsg = err instanceof Error ? err['message'] : 'Error al simular';
      this['error'].set(errorMsg);
      this.toastService['error']('Error', errorMsg);
    } finally {
      this.simulating.set(false);
    }
  }
}

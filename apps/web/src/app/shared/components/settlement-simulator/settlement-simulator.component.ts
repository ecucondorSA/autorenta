import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { SettlementService } from '../../../core/services/settlement.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-settlement-simulator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settlement-simulator.component.html',
})
export class SettlementSimulatorComponent implements OnInit {
  @Input({ required: true }) bookingId!: string;

  private readonly settlementService = inject(SettlementService);
  private readonly toastService = inject(ToastService);

  claimAmountUsd = 100;
  readonly simulating = signal(false);
  readonly simulationResult = signal<{
    eligibility: any;
    estimatedBreakdown: any;
  } | null>(null);
  readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    // Cargar monto inicial si existe
  }

  async simulate(): Promise<void> {
    this.simulating.set(true);
    this.error.set(null);

    try {
      const result = await this.settlementService.simulateWaterfall(
        this.bookingId,
        this.claimAmountUsd,
      );
      this.simulationResult.set(result);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al simular';
      this.error.set(errorMsg);
      this.toastService.error('Error de simulación', errorMsg);
    } finally {
      this.simulating.set(false);
    }
  }
}


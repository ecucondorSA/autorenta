import {Component, OnInit, signal, inject,
  ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AccountingService, FinancialHealth } from '../../../../core/services/accounting.service';

@Component({
  selector: 'app-financial-health',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonicModule],
  templateUrl: './financial-health.page.html',
  styleUrls: ['./financial-health.page.scss'],
})
export class FinancialHealthPage implements OnInit {
  private readonly accountingService = inject(AccountingService);

  readonly loading = signal(false);
  readonly health = signal<FinancialHealth | null>(null);
  readonly lastChecked = signal<Date | null>(null);

  constructor() {}

  async ngOnInit(): Promise<void> {
    await this.checkHealth();
  }

  async checkHealth(): Promise<void> {
    this.loading.set(true);
    try {
      const healthResult = await this.accountingService.checkFinancialHealth();
      this.health.set(healthResult);
      this.lastChecked.set(new Date());
    } catch (error) {
      console.error('Error checking financial health:', error);
    } finally {
      this.loading.set(false);
    }
  }

  getProfitabilityColor(): string {
    const profitability = this.health()?.profitability;
    switch (profitability) {
      case 'GOOD':
        return 'success';
      case 'WARNING':
        return 'warning';
      case 'CRITICAL':
        return 'danger';
      default:
        return 'medium';
    }
  }

  getProfitabilityIcon(): string {
    const profitability = this.health()?.profitability;
    switch (profitability) {
      case 'GOOD':
        return 'checkmark-circle';
      case 'WARNING':
        return 'warning';
      case 'CRITICAL':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  }

  getProfitabilityLabel(): string {
    const profitability = this.health()?.profitability;
    switch (profitability) {
      case 'GOOD':
        return 'Buena';
      case 'WARNING':
        return 'Advertencia';
      case 'CRITICAL':
        return 'Crítica';
      default:
        return 'Desconocido';
    }
  }
}

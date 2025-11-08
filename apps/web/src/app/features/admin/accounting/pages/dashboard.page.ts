import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import {
  AccountingService,
  AccountingDashboard,
  FinancialHealth,
} from '../../../../core/services/accounting.service';
import { KpiCardComponent } from '../components/kpi-card.component';

@Component({
  selector: 'app-accounting-dashboard',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, KpiCardComponent],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class AccountingDashboardPage implements OnInit {
  private readonly accountingService = inject(AccountingService);

  // Signals
  readonly dashboard = signal<AccountingDashboard | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly healthCheck = signal<FinancialHealth | null>(null);

  // Computed values
  readonly profitMargin = computed(() => {
    const dash = this.dashboard();
    if (!dash || dash.monthly_income === 0) return 0;
    return (dash.monthly_profit / dash.monthly_income) * 100;
  });

  readonly accountingEquationVerified = computed(() => {
    const dash = this.dashboard();
    if (!dash) return false;
    const leftSide = dash.total_assets;
    const rightSide = dash.total_liabilities + dash.total_equity;
    return Math.abs(leftSide - rightSide) < 0.01;
  });

  ngOnInit(): void {
    this.loadDashboard();
    this.checkHealth();
  }

  async loadDashboard(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await this.accountingService.getDashboard();
      this.dashboard.set(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar dashboard';
      this.error.set(message);
      console.error('Error loading dashboard:', err);
    } finally {
      this.loading.set(false);
    }
  }

  async checkHealth(): Promise<void> {
    try {
      const health = await this.accountingService.checkFinancialHealth();
      this.healthCheck.set(health);
    } catch (err) {
      console.error('Error checking health:', err);
    }
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    try {
      await this.accountingService.refreshBalances();
      await this.loadDashboard();
      await this.checkHealth();
    } catch (err) {
      console.error('Error refreshing balances:', err);
    } finally {
      this.loading.set(false);
    }
  }

  getHealthColor(profitability?: string): string {
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

  getHealthIcon(profitability?: string): string {
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
}

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
  readonly dashboard = this.accountingService.dashboard;
  readonly loading = this.accountingService.loading;
  readonly error = this.accountingService.error;
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

  loadDashboard(): void {
    this.accountingService.getDashboard().subscribe({
      error: (err) => console.error('Error loading dashboard:', err),
    });
  }

  checkHealth(): void {
    this.accountingService.checkFinancialHealth().subscribe({
      next: (health) => this.healthCheck.set(health),
      error: (err) => console.error('Error checking health:', err),
    });
  }

  refresh(): void {
    this.accountingService.refreshBalances().subscribe({
      next: () => {
        this.loadDashboard();
        this.checkHealth();
      },
      error: (err) => console.error('Error refreshing balances:', err),
    });
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

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import {
  AccountingService,
  AccountingDashboard,
  FinancialHealth,
} from '../../../core/services/accounting.service';

@Component({
  selector: 'app-accounting-dashboard',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  templateUrl: './accounting-dashboard.component.html',
  styleUrls: ['./accounting-dashboard.component.scss'],
})
export class AccountingDashboardComponent implements OnInit {
  dashboard = signal<AccountingDashboard | null>(null);
  loading = signal(true);
  healthCheck = signal<FinancialHealth | null>(null);

  constructor(private accountingService: AccountingService) {}

  async ngOnInit() {
    await this.loadDashboard();
    await this.checkHealth();
  }

  async loadDashboard() {
    this.loading.set(true);
    const data = await this.accountingService.getDashboard();
    this.dashboard.set(data);
    this.loading.set(false);
  }

  async checkHealth() {
    const health = await this.accountingService.checkFinancialHealth();
    this.healthCheck.set(health);
  }

  async refresh() {
    await this.accountingService.refreshBalances();
    await this.loadDashboard();
    await this.checkHealth();
  }

  formatCurrency(amount: number | undefined): string {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  getHealthColor(profitability: string): string {
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
}

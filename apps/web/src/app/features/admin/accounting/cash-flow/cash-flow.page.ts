import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { AccountingService } from '../../../../core/services/accounting.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-cash-flow',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cash-flow.page.html',
})
export class CashFlowPage implements OnInit {
  private accountingService!: AccountingService;

  readonly cashFlow = signal<any[]>([]);
  readonly loading = signal(false);

  async ngOnInit(): Promise<void> {
    this.accountingService = new AccountingService(environment.supabaseUrl, environment.supabaseAnonKey);
    await this.loadCashFlow();
  }

  async loadCashFlow(): Promise<void> {
    this.loading.set(true);

    try {
      const flow = await this.accountingService.getCashFlow(100);
      this.cashFlow.set(flow);
    } catch (err) {
      console.error('Error loading cash flow:', err);
    } finally {
      this.loading.set(false);
    }
  }
}


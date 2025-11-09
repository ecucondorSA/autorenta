import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { AccountingService } from '../../../../core/services/accounting.service';
import { SupabaseClientService } from '../../../../core/services/supabase-client.service';

@Component({
  selector: 'app-cash-flow',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cash-flow.page.html',
})
export class CashFlowPage implements OnInit {
  private readonly supabaseService = inject(SupabaseClientService);
  private accountingService!: AccountingService;

  readonly cashFlow = signal<any[]>([]);
  readonly loading = signal(false);

  async ngOnInit(): Promise<void> {
    const supabase = this.supabaseService.getClient();
    const url = supabase.supabaseUrl;
    const key = (supabase as any).supabaseKey || '';
    this.accountingService = new AccountingService(url, key);
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


import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { AccountingService } from '../../../../core/services/accounting.service';
import { SupabaseClientService } from '../../../../core/services/supabase-client.service';

@Component({
  selector: 'app-cash-flow',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Flujo de Caja</h1>
        <p class="mt-2 text-sm text-gray-600">
          Visualiza el flujo de efectivo de la plataforma.
        </p>
      </div>

      @if (loading()) {
        <div class="flex items-center justify-center py-12">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent"></div>
        </div>
      } @else if (cashFlow().length === 0) {
        <div class="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
          <p class="text-gray-600">No hay datos de flujo de caja disponibles.</p>
        </div>
      } @else {
        <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Fecha
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Tipo
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Descripción
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Entrada
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Salida
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 bg-white">
              @for (entry of cashFlow(); track entry.id || $index) {
                <tr>
                  <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {{ entry.date || entry.created_at | date: 'short' }}
                  </td>
                  <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                    {{ entry.type || entry.transaction_type || 'N/A' }}
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-600">
                    {{ entry.description || 'Sin descripción' }}
                  </td>
                  <td class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-green-600">
                    @if (entry.inflow || entry.debit) {
                      ${{ (entry.inflow || entry.debit) | number: '1.2-2' }}
                    } @else {
                      -
                    }
                  </td>
                  <td class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-red-600">
                    @if (entry.outflow || entry.credit) {
                      ${{ (entry.outflow || entry.credit) | number: '1.2-2' }}
                    } @else {
                      -
                    }
                  </td>
                  <td class="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-gray-900">
                    ${{ (entry.balance || 0) | number: '1.2-2' }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
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


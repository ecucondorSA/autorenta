import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, inject } from '@angular/core';
import { AccountingService, CashFlowEntry } from '../../../../core/services/accounting.service';

@Component({
  selector: 'app-cash-flow',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-text-primary">Flujo de Caja</h1>
        <p class="mt-2 text-sm text-text-secondary">
          Visualiza el flujo de efectivo de la plataforma.
        </p>
      </div>

      @if (loading()) {
        <div class="flex items-center justify-center py-12">
          <div
            class="h-8 w-8 animate-spin rounded-full border-4 border-cta-default border-t-transparent"
          ></div>
        </div>
      } @else if (cashFlow().length === 0) {
        <div class="rounded-lg border border-border-default bg-surface-base p-8 text-center">
          <p class="text-text-secondary">No hay datos de flujo de caja disponibles.</p>
        </div>
      } @else {
        <div
          class="overflow-x-auto rounded-lg border border-border-default bg-surface-raised shadow-sm"
        >
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-surface-base">
              <tr>
                <th
                  class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary"
                >
                  Fecha
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary"
                >
                  Tipo
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary"
                >
                  Descripción
                </th>
                <th
                  class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-secondary"
                >
                  Entrada
                </th>
                <th
                  class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-secondary"
                >
                  Salida
                </th>
                <th
                  class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-secondary"
                >
                  Balance
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 bg-surface-raised">
              @for (entry of cashFlow(); track entry.id ?? $index) {
                <tr>
                  <td class="whitespace-nowrap px-6 py-4 text-sm text-text-primary">
                    {{ entry.date || entry.created_at | date: 'short' }}
                  </td>
                  <td class="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                    {{ entry.type || entry.transaction_type || 'N/A' }}
                  </td>
                  <td class="px-6 py-4 text-sm text-text-secondary">
                    {{ entry.description || 'Sin descripción' }}
                  </td>
                  <td
                    class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-success-strong"
                  >
                    @if (entry.inflow || entry.debit) {
                      \${{ entry.inflow || entry.debit | number: '1.2-2' }}
                    } @else {
                      -
                    }
                  </td>
                  <td
                    class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-error-text"
                  >
                    @if (entry.outflow || entry.credit) {
                      \${{ entry.outflow || entry.credit | number: '1.2-2' }}
                    } @else {
                      -
                    }
                  </td>
                  <td
                    class="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-text-primary"
                  >
                    \${{ entry.balance || 0 | number: '1.2-2' }}
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
  private readonly accountingService = inject(AccountingService);

  readonly cashFlow = signal<CashFlowEntry[]>([]);
  readonly loading = signal(false);

  constructor() {}

  async ngOnInit(): Promise<void> {
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

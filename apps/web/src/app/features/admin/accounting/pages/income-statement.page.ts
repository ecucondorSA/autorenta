import {Component, OnInit, inject, signal, computed,
  ChangeDetectionStrategy} from '@angular/core';

import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { AccountingService, IncomeStatement } from '@core/services/payments/accounting.service';

@Component({
  selector: 'app-income-statement',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, FormsModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/admin/accounting"></ion-back-button>
        </ion-buttons>
        <ion-title>Estado de Resultados (P&L)</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="loadData()" [disabled]="loading()">
            <ion-icon name="refresh" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-item lines="none">
          <ion-label>Período:</ion-label>
          <ion-select [(ngModel)]="selectedPeriod" (ionChange)="loadData()" interface="popover">
            <ion-select-option [value]="null">Todos los períodos</ion-select-option>
            @for (p of availablePeriods(); track p) {
              <ion-select-option [value]="p">{{
                p
              }}</ion-select-option>
            }
          </ion-select>
        </ion-item>
      </ion-toolbar>
    </ion-header>
    
    <ion-content class="ion-padding">
      @if (loading()) {
        <div class="flex justify-center py-8">
          <ion-spinner></ion-spinner>
        </div>
      }
    
      @if (!loading()) {
        <div>
          <!-- Summary Card -->
          <ion-card color="primary" class="mb-4">
            <ion-card-content class="text-center">
              <h3 class="text-lg font-bold mb-2">Resumen del Período</h3>
              <div class="grid grid-cols-3 gap-4">
                <div>
                  <p class="text-sm opacity-70">Ingresos</p>
                  <p class="text-xl font-bold">{{ formatCurrency(totalIncome()) }}</p>
                </div>
                <div>
                  <p class="text-sm opacity-70">Gastos</p>
                  <p class="text-xl font-bold">{{ formatCurrency(totalExpenses()) }}</p>
                </div>
                <div>
                  <p class="text-sm opacity-70">Utilidad Neta</p>
                  <p class="text-xl font-bold" [class.text-error-500]="netProfit() < 0">
                    {{ formatCurrency(netProfit()) }}
                  </p>
                </div>
              </div>
              <p class="mt-2">Margen: {{ profitMargin().toFixed(1) }}%</p>
            </ion-card-content>
          </ion-card>
          <!-- INGRESOS -->
          <h3 class="text-lg font-bold mt-4 mb-2 flex items-center">
            <ion-icon name="arrow-down-circle" color="success" class="mr-2"></ion-icon>
            INGRESOS
          </h3>
          <ion-card>
            <ion-list>
              @for (item of incomeItems(); track item) {
                <ion-item lines="full">
                  <ion-label>
                    <h4>{{ item.code }} - {{ item.name }}</h4>
                    <p class="text-sm text-text-secondary">{{ item.period }}</p>
                  </ion-label>
                  <ion-note slot="end" class="text-lg font-semibold" color="success">
                    {{ formatCurrency(item.amount) }}
                  </ion-note>
                </ion-item>
              }
              <ion-item class="bg-surface-raised">
                <ion-label><strong>Total Ingresos</strong></ion-label>
                <ion-note slot="end" class="text-xl font-bold" color="success">
                  {{ formatCurrency(totalIncome()) }}
                </ion-note>
              </ion-item>
            </ion-list>
          </ion-card>
          <!-- GASTOS -->
          <h3 class="text-lg font-bold mt-6 mb-2 flex items-center">
            <ion-icon name="arrow-up-circle" color="danger" class="mr-2"></ion-icon>
            GASTOS
          </h3>
          <ion-card>
            <ion-list>
              @for (item of expenseItems(); track item) {
                <ion-item lines="full">
                  <ion-label>
                    <h4>{{ item.code }} - {{ item.name }}</h4>
                    <p class="text-sm text-text-secondary">{{ item.period }}</p>
                  </ion-label>
                  <ion-note slot="end" class="text-lg font-semibold" color="danger">
                    {{ formatCurrency(item.amount) }}
                  </ion-note>
                </ion-item>
              }
              <ion-item class="bg-surface-raised">
                <ion-label><strong>Total Gastos</strong></ion-label>
                <ion-note slot="end" class="text-xl font-bold" color="danger">
                  {{ formatCurrency(totalExpenses()) }}
                </ion-note>
              </ion-item>
            </ion-list>
          </ion-card>
          <!-- UTILIDAD NETA -->
          <ion-card [color]="netProfit() >= 0 ? 'success' : 'danger'" class="mt-4">
            <ion-card-content class="text-center">
              <h3 class="text-lg font-bold">UTILIDAD NETA</h3>
              <p class="text-3xl font-bold mt-2">{{ formatCurrency(netProfit()) }}</p>
              <p class="mt-1">Margen de Utilidad: {{ profitMargin().toFixed(2) }}%</p>
            </ion-card-content>
          </ion-card>
        </div>
      }
    </ion-content>
    `,
  styles: [
    `
      .flex {
        display: flex;
      }
      .items-center {
        align-items: center;
      }
      .justify-center {
        justify-content: center;
      }
      .text-center {
        text-align: center;
      }
      .grid {
        display: grid;
      }
      .grid-cols-3 {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      .gap-4 {
        gap: 1rem;
      }
      .font-bold {
        font-weight: 700;
      }
      .font-semibold {
        font-weight: 600;
      }
      .text-lg {
        font-size: 1.125rem;
      }
      .text-xl {
        font-size: 1.25rem;
      }
      .text-3xl {
        font-size: 1.875rem;
      }
      .text-sm {
        font-size: 0.875rem;
      }
      .opacity-70 {
        opacity: 0.7;
      }
      .text-text-secondary {
        color: #6b7280;
      }
      .text-error-500 {
        color: #ef4444;
      }
      .bg-surface-raised {
        background-color: #f3f4f6;
      }
      .mb-2 {
        margin-bottom: 0.5rem;
      }
      .mb-4 {
        margin-bottom: 1rem;
      }
      .mr-2 {
        margin-right: 0.5rem;
      }
      .mt-1 {
        margin-top: 0.25rem;
      }
      .mt-2 {
        margin-top: 0.5rem;
      }
      .mt-4 {
        margin-top: 1rem;
      }
      .mt-6 {
        margin-top: 1.5rem;
      }
      .py-8 {
        padding-top: 2rem;
        padding-bottom: 2rem;
      }
    `,
  ],
})
export class IncomeStatementPage implements OnInit {
  private readonly accountingService = inject(AccountingService);

  readonly incomeStatement = signal<IncomeStatement[]>([]);
  readonly loading = signal(false);

  selectedPeriod: string | null = null;

  readonly incomeItems = computed(() =>
    this.incomeStatement().filter((item) => item.account_type === 'INCOME'),
  );

  readonly expenseItems = computed(() =>
    this.incomeStatement().filter((item) => item.account_type === 'EXPENSE'),
  );

  readonly totalIncome = computed(() =>
    this.incomeItems().reduce((sum, item) => sum + item.amount, 0),
  );

  readonly totalExpenses = computed(() =>
    this.expenseItems().reduce((sum, item) => sum + item.amount, 0),
  );

  readonly netProfit = computed(() => this.totalIncome() - this.totalExpenses());

  readonly profitMargin = computed(() => {
    const income = this.totalIncome();
    return income > 0 ? (this.netProfit() / income) * 100 : 0;
  });

  readonly availablePeriods = computed(() => {
    const periods = new Set(this.incomeStatement().map((item) => item.period));
    return Array.from(periods).sort().reverse();
  });

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.accountingService.getIncomeStatement(
        this.selectedPeriod || undefined,
      );
      this.incomeStatement.set(data);
    } catch (err) {
      console.error('Error loading income statement:', err);
    } finally {
      this.loading.set(false);
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  }
}

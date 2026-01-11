import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';

import { IonicModule } from '@ionic/angular';
import { AccountingService, BalanceSheet } from '@core/services/payments/accounting.service';

@Component({
  selector: 'app-balance-sheet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/admin/accounting"></ion-back-button>
        </ion-buttons>
        <ion-title>Balance General</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="refresh()" [disabled]="loading()">
            <ion-icon name="refresh" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      @if (loading()) {
        <div class="flex justify-center py-8">
          <ion-spinner></ion-spinner>
        </div>
      }

      @if (!loading() && balanceSheet().length > 0) {
        <div>
          <!-- Accounting Equation Summary -->
          <ion-card color="primary" class="mb-4">
            <ion-card-content>
              <div class="text-center">
                <h2 class="text-xl font-bold mb-2">Ecuación Contable</h2>
                <p class="text-lg">
                  {{ formatCurrency(totalAssets()) }} = {{ formatCurrency(totalLiabilities()) }} +
                  {{ formatCurrency(totalEquity()) }}
                </p>
                <ion-badge [color]="isBalanced() ? 'success' : 'danger'" class="mt-2">
                  {{ isBalanced() ? '✓ Balanceado' : '✗ Descuadrado' }}
                </ion-badge>
              </div>
            </ion-card-content>
          </ion-card>
          <!-- ACTIVOS -->
          <h3 class="text-lg font-bold mt-4 mb-2 flex items-center">
            <ion-icon name="cash" class="mr-2"></ion-icon>
            ACTIVOS
          </h3>
          <ion-card>
            <ion-list>
              @for (item of assets(); track item) {
                <ion-item lines="full">
                  <ion-label>
                    <h4>{{ item.code }} - {{ item.name }}</h4>
                    <p class="text-sm text-text-secondary">{{ item.sub_type }}</p>
                  </ion-label>
                  <ion-note slot="end" class="text-lg font-semibold" color="success">
                    {{ formatCurrency(item.balance) }}
                  </ion-note>
                </ion-item>
              }
              <ion-item class="bg-surface-raised">
                <ion-label><strong>Total Activos</strong></ion-label>
                <ion-note slot="end" class="text-xl font-bold" color="success">
                  {{ formatCurrency(totalAssets()) }}
                </ion-note>
              </ion-item>
            </ion-list>
          </ion-card>
          <!-- PASIVOS -->
          <h3 class="text-lg font-bold mt-6 mb-2 flex items-center">
            <ion-icon name="document-text" class="mr-2"></ion-icon>
            PASIVOS
          </h3>
          <ion-card>
            <ion-list>
              @for (item of liabilities(); track item) {
                <ion-item lines="full">
                  <ion-label>
                    <h4>{{ item.code }} - {{ item.name }}</h4>
                    <p class="text-sm text-text-secondary">{{ item.sub_type }}</p>
                  </ion-label>
                  <ion-note slot="end" class="text-lg font-semibold" color="danger">
                    {{ formatCurrency(item.balance) }}
                  </ion-note>
                </ion-item>
              }
              <ion-item class="bg-surface-raised">
                <ion-label><strong>Total Pasivos</strong></ion-label>
                <ion-note slot="end" class="text-xl font-bold" color="danger">
                  {{ formatCurrency(totalLiabilities()) }}
                </ion-note>
              </ion-item>
            </ion-list>
          </ion-card>
          <!-- PATRIMONIO -->
          <h3 class="text-lg font-bold mt-6 mb-2 flex items-center">
            <ion-icon name="business" class="mr-2"></ion-icon>
            PATRIMONIO
          </h3>
          <ion-card>
            <ion-list>
              @for (item of equity(); track item) {
                <ion-item lines="full">
                  <ion-label>
                    <h4>{{ item.code }} - {{ item.name }}</h4>
                    <p class="text-sm text-text-secondary">{{ item.sub_type }}</p>
                  </ion-label>
                  <ion-note slot="end" class="text-lg font-semibold" color="primary">
                    {{ formatCurrency(item.balance) }}
                  </ion-note>
                </ion-item>
              }
              <ion-item class="bg-surface-raised">
                <ion-label><strong>Total Patrimonio</strong></ion-label>
                <ion-note slot="end" class="text-xl font-bold" color="primary">
                  {{ formatCurrency(totalEquity()) }}
                </ion-note>
              </ion-item>
            </ion-list>
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
      .text-sm {
        font-size: 0.875rem;
      }
      .text-text-secondary {
        color: #6b7280;
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
export class BalanceSheetPage implements OnInit {
  private readonly accountingService = inject(AccountingService);

  readonly balanceSheet = signal<BalanceSheet[]>([]);
  readonly loading = signal(false);

  readonly assets = computed(() =>
    this.balanceSheet().filter((item) => item.account_type === 'ASSET'),
  );

  readonly liabilities = computed(() =>
    this.balanceSheet().filter((item) => item.account_type === 'LIABILITY'),
  );

  readonly equity = computed(() =>
    this.balanceSheet().filter((item) => item.account_type === 'EQUITY'),
  );

  readonly totalAssets = computed(() => this.assets().reduce((sum, item) => sum + item.balance, 0));

  readonly totalLiabilities = computed(() =>
    this.liabilities().reduce((sum, item) => sum + item.balance, 0),
  );

  readonly totalEquity = computed(() => this.equity().reduce((sum, item) => sum + item.balance, 0));

  readonly isBalanced = computed(
    () => Math.abs(this.totalAssets() - (this.totalLiabilities() + this.totalEquity())) < 0.01,
  );

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.accountingService.getBalanceSheet();
      this.balanceSheet.set(data);
    } catch (err) {
      console.error('Error loading balance sheet:', err);
    } finally {
      this.loading.set(false);
    }
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    try {
      await this.accountingService.refreshBalances();
      await this.loadData();
    } catch (err) {
      console.error('Error refreshing:', err);
    } finally {
      this.loading.set(false);
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  }
}

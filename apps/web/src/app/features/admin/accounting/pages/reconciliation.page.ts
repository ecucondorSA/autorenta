import {Component, OnInit, signal, inject,
  ChangeDetectionStrategy} from '@angular/core';

import { IonicModule } from '@ionic/angular';
import {
  AccountingService,
  WalletReconciliation,
} from '../../../../core/services/accounting.service';

@Component({
  selector: 'app-reconciliation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/admin/accounting"></ion-back-button>
        </ion-buttons>
        <ion-title>Conciliación Wallet</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content class="ion-padding">
      @if (reconciliation().length > 0) {
        <ion-card>
          <ion-card-header>
            <ion-card-title>Wallet vs Contabilidad</ion-card-title>
          </ion-card-header>
          <ion-list>
            @for (item of reconciliation(); track item) {
              <ion-item>
                <ion-label>{{ item.source }}</ion-label>
                <ion-note slot="end" [color]="getColor(item)">
                  {{ formatCurrency(item.amount) }}
                </ion-note>
              </ion-item>
            }
          </ion-list>
        </ion-card>
      }
    </ion-content>
    `,
})
export class ReconciliationPage implements OnInit {
  private readonly accountingService = inject(AccountingService);
  reconciliation = signal<WalletReconciliation[]>([]);

  async ngOnInit(): Promise<void> {
    try {
      const data = await this.accountingService.getWalletReconciliation();
      this.reconciliation.set(data);
    } catch (error) {
      console.error('Error loading reconciliation:', error);
    }
  }

  getColor(item: WalletReconciliation) {
    return item.source.includes('Diferencia') ? 'danger' : 'primary';
  }

  formatCurrency(amount: number) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
  }
}

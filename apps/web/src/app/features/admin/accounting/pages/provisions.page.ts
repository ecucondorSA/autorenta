import {Component, OnInit, inject, signal,
  ChangeDetectionStrategy} from '@angular/core';

import { IonicModule } from '@ionic/angular';
import { AccountingService, ProvisionDetail } from '../../../../core/services/accounting.service';

@Component({
  selector: 'app-provisions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/admin/accounting"></ion-back-button>
        </ion-buttons>
        <ion-title>Provisiones NIIF 37</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content class="ion-padding">
      @if (provisions().length > 0) {
        <ion-list>
          @for (provision of provisions(); track provision) {
            <ion-item>
              <ion-label>
                <h3>{{ provision.provision_type }}</h3>
                <p>Saldo: {{ formatCurrency(getProvisionBalance(provision)) }}</p>
              </ion-label>
              <ion-badge slot="end" [color]="provision.status === 'ACTIVE' ? 'success' : 'medium'">
                {{ provision.status }}
              </ion-badge>
            </ion-item>
          }
        </ion-list>
      }
    </ion-content>
    `,
})
export class ProvisionsPage implements OnInit {
  private readonly accountingService = inject(AccountingService);
  readonly provisions = signal<ProvisionDetail[]>([]);
  readonly loading = signal(false);

  async ngOnInit() {
    await this.loadProvisions();
  }

  async loadProvisions() {
    this.loading.set(true);
    try {
      const data = await this.accountingService.getProvisions({});
      this.provisions.set(data);
    } catch (err) {
      console.error('Error loading provisions:', err);
    } finally {
      this.loading.set(false);
    }
  }

  getProvisionBalance(provision: ProvisionDetail): number {
    // Return the amount as the balance
    return provision.amount || 0;
  }

  formatCurrency(amount: number) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
  }
}

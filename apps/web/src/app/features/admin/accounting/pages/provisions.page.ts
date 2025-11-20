import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AccountingService } from '../../../../core/services/accounting.service';

@Component({
  selector: 'app-provisions',
  standalone: true,
  imports: [CommonModule, IonicModule],
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
      <ion-list *ngIf="provisions().length > 0">
        <ion-item *ngFor="let provision of provisions()">
          <ion-label>
            <h3>{{ provision.provision_type }}</h3>
            <p>Saldo: {{ formatCurrency(provision.current_balance) }}</p>
          </ion-label>
          <ion-badge slot="end" [color]="provision.status === 'ACTIVE' ? 'success' : 'medium'">
            {{ provision.status }}
          </ion-badge>
        </ion-item>
      </ion-list>
    </ion-content>
  `,
})
export class ProvisionsPage implements OnInit {
  private readonly accountingService = inject(AccountingService);
  readonly provisions = signal<unknown[]>([]);
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

  formatCurrency(amount: number) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
  }
}

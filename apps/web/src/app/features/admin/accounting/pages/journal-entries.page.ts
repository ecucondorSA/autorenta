import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AccountingService } from '../../../../core/services/accounting.service';

@Component({
  selector: 'app-journal-entries',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/admin/accounting"></ion-back-button>
        </ion-buttons>
        <ion-title>Libro Diario</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-list *ngIf="entries().length > 0">
        <ion-item *ngFor="let entry of entries()">
          <ion-label>
            <h3>{{ entry.entry_number }} - {{ entry.description }}</h3>
            <p>{{ entry.entry_date | date: 'short' }} | {{ entry.transaction_type }}</p>
          </ion-label>
          <ion-note slot="end">
            <ion-badge [color]="entry.status === 'POSTED' ? 'success' : 'warning'">
              {{ entry.status }}
            </ion-badge>
          </ion-note>
        </ion-item>
      </ion-list>
    </ion-content>
  `,
})
export class JournalEntriesPage implements OnInit {
  private readonly accountingService = inject(AccountingService);
  readonly entries = signal<unknown[]>([]);
  readonly loading = signal(false);

  async ngOnInit() {
    await this.loadEntries();
  }

  async loadEntries() {
    this.loading.set(true);
    try {
      // Use getLedgerEntries if available, or implement a method to get journal entries
      // For now, using empty array as placeholder
      this.entries.set([]);
    } catch (err) {
      console.error('Error loading journal entries:', err);
    } finally {
      this.loading.set(false);
    }
  }
}

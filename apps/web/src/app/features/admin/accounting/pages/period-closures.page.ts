import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AccountingService, PeriodClosure } from '../../../../core/services/accounting.service';

@Component({
  selector: 'app-period-closures',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './period-closures.page.html',
  styleUrls: ['./period-closures.page.scss'],
})
export class PeriodClosuresPage implements OnInit {
  private readonly accountingService = inject(AccountingService);

  readonly loading = signal(false);
  readonly closures = signal<PeriodClosure[]>([]);
  readonly showCreateModal = signal(false);
  readonly filters = signal({
    periodType: '',
    status: '',
    startDate: '',
    endDate: '',
  });
  readonly newClosure = signal({
    periodType: 'daily' as 'daily' | 'monthly' | 'yearly',
    periodCode: '',
  });

  async ngOnInit(): Promise<void> {
    await this.loadClosures();
  }

  async loadClosures(): Promise<void> {
    this.loading.set(true);
    try {
      const cleanFilters = {
        periodType: this.filters().periodType || undefined,
        status: this.filters().status || undefined,
        startDate: this.filters().startDate || undefined,
        endDate: this.filters().endDate || undefined,
      };
      const result = await this.accountingService.getPeriodClosures(cleanFilters);
      this.closures.set(result);
    } catch (error) {
      console.error('Error loading closures:', error);
    } finally {
      this.loading.set(false);
    }
  }

  openCreateModal(): void {
    this.showCreateModal.set(true);
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    const type = this.newClosure().periodType;
    if (type === 'daily') {
      this.newClosure.update((c) => ({ ...c, periodCode: `${year}-${month}-${day}` }));
    } else if (type === 'monthly') {
      this.newClosure.update((c) => ({ ...c, periodCode: `${year}-${month}` }));
    } else {
      this.newClosure.update((c) => ({ ...c, periodCode: `${year}` }));
    }
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.newClosure.set({ periodType: 'daily', periodCode: '' });
  }

  async executeClosure(): Promise<void> {
    if (!this.newClosure().periodCode) {
      return;
    }

    this.loading.set(true);
    try {
      const result = await this.accountingService.executePeriodClosure(
        this.newClosure().periodType,
        this.newClosure().periodCode,
      );
      if (result.success) {
        this.closeCreateModal();
        await this.loadClosures();
      }
    } catch (error) {
      console.error('Error executing closure:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async applyFilters(): Promise<void> {
    await this.loadClosures();
  }

  async clearFilters(): Promise<void> {
    this.filters.set({
      periodType: '',
      status: '',
      startDate: '',
      endDate: '',
    });
    await this.loadClosures();
  }
}

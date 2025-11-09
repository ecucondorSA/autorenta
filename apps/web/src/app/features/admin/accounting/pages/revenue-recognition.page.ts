import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import {
  AccountingService,
  RevenueRecognition,
} from '../../../../core/services/accounting.service';
import { SupabaseService } from '../../../../core/services/supabase.service';

@Component({
  selector: 'app-revenue-recognition',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './revenue-recognition.page.html',
  styleUrls: ['./revenue-recognition.page.scss'],
})
export class RevenueRecognitionPage implements OnInit {
  private readonly supabaseService = inject(SupabaseService);
  private readonly accountingService: AccountingService;

  readonly loading = signal(false);
  readonly revenueRecognition = signal<RevenueRecognition[]>([]);
  readonly filters = signal({
    bookingId: '',
    isRecognized: '',
    startDate: '',
    endDate: '',
  });

  constructor() {
    const supabase = this.supabaseService.getClient();
    this.accountingService = new AccountingService(supabase.supabaseUrl, supabase.supabaseKey);
  }

  async ngOnInit(): Promise<void> {
    await this.loadRevenueRecognition();
  }

  async loadRevenueRecognition(): Promise<void> {
    this.loading.set(true);
    try {
      const cleanFilters = {
        bookingId: this.filters().bookingId || undefined,
        isRecognized: this.filters().isRecognized
          ? this.filters().isRecognized === 'true'
          : undefined,
        startDate: this.filters().startDate || undefined,
        endDate: this.filters().endDate || undefined,
      };
      const result = await this.accountingService.getRevenueRecognition(cleanFilters);
      this.revenueRecognition.set(result);
    } catch (error) {
      console.error('Error loading revenue recognition:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async applyFilters(): Promise<void> {
    await this.loadRevenueRecognition();
  }

  async clearFilters(): Promise<void> {
    this.filters.set({
      bookingId: '',
      isRecognized: '',
      startDate: '',
      endDate: '',
    });
    await this.loadRevenueRecognition();
  }

  getTotalRevenue(): number {
    return this.revenueRecognition()
      .filter((r) => r.is_recognized)
      .reduce((sum, r) => sum + r.gross_amount, 0);
  }

  getTotalCommission(): number {
    return this.revenueRecognition()
      .filter((r) => r.is_recognized)
      .reduce((sum, r) => sum + r.commission_amount, 0);
  }

  getTotalOwnerAmount(): number {
    return this.revenueRecognition()
      .filter((r) => r.is_recognized)
      .reduce((sum, r) => sum + r.owner_amount, 0);
  }
}

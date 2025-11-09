import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { PayoutService } from '../../../core/services/payout.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-payout-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payout-stats.component.html',
})
export class PayoutStatsComponent implements OnInit {
  private readonly payoutService = inject(PayoutService);
  private readonly authService = inject(AuthService);

  readonly stats = signal<{
    totalPayouts: number;
    totalAmount: number;
    pendingPayouts: number;
    pendingAmount: number;
    completedPayouts: number;
    completedAmount: number;
    averagePayoutAmount: number;
  } | null>(null);
  readonly loading = signal(false);

  async ngOnInit(): Promise<void> {
    await this.loadStats();
  }

  async loadStats(): Promise<void> {
    this.loading.set(true);

    try {
      const user = await this.authService.getCurrentUser();
      if (!user) return;

      this.payoutService.getPayoutStats(user.id).subscribe({
        next: (stats) => {
          this.stats.set(stats);
        },
        error: (err) => {
          console.error('Error loading payout stats:', err);
        },
        complete: () => {
          this.loading.set(false);
        },
      });
    } catch (err) {
      console.error('Error loading payout stats:', err);
      this.loading.set(false);
    }
  }
}


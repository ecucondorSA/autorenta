import {Component, OnInit, inject, signal, computed,
  ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { BonusMalusService } from '../../../core/services/bonus-malus.service';
import type { UserBonusMalus, BonusMalusDisplay } from '../../../core/models';
import { BonusProtectorService } from '../../../core/services/bonus-protector.service';

@Component({
  selector: 'app-bonus-malus-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonicModule, RouterLink],
  templateUrl: './bonus-malus-card.component.html',
})
export class BonusMalusCardComponent implements OnInit {
  private readonly bonusMalusService = inject(BonusMalusService);
  private readonly bonusProtectorService = inject(BonusProtectorService); // NEW

  readonly loading = signal(true);
  readonly bonusMalus = signal<UserBonusMalus | null>(null);
  readonly tips = signal<string[]>([]);
  readonly showDetails = signal(false);

  readonly display = computed<BonusMalusDisplay | null>(() => {
    const bm = this.bonusMalus();
    if (!bm) return null;
    return this.bonusMalusService.getBonusMalusDisplay(bm.total_factor);
  });

  readonly scorePercentage = computed(() => {
    const bm = this.bonusMalus();
    if (!bm) return 50;
    // Convert factor to 0-100 scale where 0 is best (bonus) and 100 is worst (malus)
    // Factor range: -0.30 (max bonus) to +0.50 (max malus)
    // Map to: 100 (best) to 0 (worst)
    const factor = bm.total_factor;
    const normalizedScore = ((factor + 0.30) / 0.80) * 100;
    return Math.max(0, Math.min(100, 100 - normalizedScore));
  });

  // NEW: Bonus Protector Signals
  readonly activeProtector = this.bonusProtectorService.activeProtector;
  readonly hasActiveProtector = this.bonusProtectorService.hasActiveProtector;
  readonly isProtectorNearExpiry = this.bonusProtectorService.isNearExpiry;
  readonly protectorInfoMessage = computed(() => this.bonusProtectorService.getInfoMessage());

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadBonusMalus(), this.bonusProtectorService.loadActiveProtector()]);
  }

  async loadBonusMalus(): Promise<void> {
    this.loading.set(true);
    try {
      const bm = await this.bonusMalusService.getUserBonusMalus();
      this.bonusMalus.set(bm);

      if (bm) {
        const tips = await this.bonusMalusService.getImprovementTips();
        this.tips.set(tips);
      }
    } finally {
      this.loading.set(false);
    }
  }

  async recalculate(): Promise<void> {
    this.loading.set(true);
    try {
      await this.bonusMalusService.calculateBonusMalus();
      await this.loadBonusMalus();
    } finally {
      this.loading.set(false);
    }
  }

  toggleDetails(): void {
    this.showDetails.update(v => !v);
  }

  getScoreColor(): string {
    const score = this.scorePercentage();
    if (score >= 75) return 'text-success-strong';
    if (score >= 50) return 'text-warning-strong';
    return 'text-error-strong';
  }

  getProgressBarColor(): string {
    const score = this.scorePercentage();
    if (score >= 75) return 'bg-success-500';
    if (score >= 50) return 'bg-warning-500';
    return 'bg-error-500';
  }
}

import {Component, OnInit, inject, signal, computed,
  ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { BonusMalusService, TierDisplay } from '@core/services/payments/bonus-malus.service';
import { BonusProtectorService } from '@core/services/payments/bonus-protector.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import type { UserBonusMalus, BonusMalusDisplay } from '../../../core/models';

@Component({
  selector: 'app-bonus-malus-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonicModule],
  templateUrl: './bonus-malus-card.component.html',
  styles: [`
    :host { display: block; }
    .tier-badge {
      @apply px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider;
    }
  `]
})
export class BonusMalusCardComponent implements OnInit {
  private readonly bonusMalusService = inject(BonusMalusService);
  private readonly bonusProtectorService = inject(BonusProtectorService);
  private readonly notificationService = inject(NotificationManagerService);
  private readonly logger = inject(LoggerService);

  readonly loading = signal(true);
  readonly bonusMalus = signal<UserBonusMalus | null>(null);
  readonly tips = signal<string[]>([]);
  readonly showDetails = signal(false);
  readonly loadError = signal(false);

  readonly display = computed<BonusMalusDisplay | null>(() => {
    const bm = this.bonusMalus();
    if (!bm) return null;
    return this.bonusMalusService.getBonusMalusDisplay(bm.total_factor);
  });

  readonly tierDisplay = computed<TierDisplay | null>(() => {
    const bm = this.bonusMalus();
    if (!bm || !bm.tier) return null;
    return this.bonusMalusService.getTierDisplay(bm.tier);
  });

  readonly depositBenefit = computed(() => {
    const bm = this.bonusMalus();
    if (!bm || !bm.tier) return 'Depósito estándar';
    
    switch(bm.tier) {
      case 'elite': return '✨ Sin Depósito';
      case 'trusted': return '50% OFF en Depósito';
      default: return 'Depósito estándar';
    }
  });

  readonly scorePercentage = computed(() => {
    const bm = this.bonusMalus();
    if (!bm) return 50;
    // Map factor (-0.15 to +0.20) to 0-100 score
    // -0.15 => 100 (Perfect)
    // 0.00 => 70 (Good)
    // +0.20 => 40 (Poor)
    const factor = bm.total_factor;
    // Formula aproximada
    let score = 70 - (factor * 100); 
    return Math.max(0, Math.min(100, score));
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
    this.loadError.set(false);
    try {
      const bm = await this.bonusMalusService.getUserBonusMalus();
      this.bonusMalus.set(bm);

      if (bm) {
        const tips = await this.bonusMalusService.getImprovementTips();
        this.tips.set(tips);
      } else {
        // FIX 2025-12-28: Notify user if bonus-malus data couldn't be loaded
        this.loadError.set(true);
        this.logger.warn('BonusMalusCard: Could not load bonus-malus data');
      }
    } catch (error) {
      this.loadError.set(true);
      this.logger.error('BonusMalusCard: Error loading bonus-malus', error);
      this.notificationService.warning(
        'Aviso',
        'No pudimos cargar tu información de reputación. Intenta más tarde.'
      );
    } finally {
      this.loading.set(false);
    }
  }

  async recalculate(): Promise<void> {
    this.loading.set(true);
    try {
      const result = await this.bonusMalusService.calculateBonusMalus();
      if (result) {
        await this.loadBonusMalus();
        this.notificationService.success('Actualizado', 'Tu reputación ha sido recalculada');
      } else {
        // FIX 2025-12-28: Notify user if recalculation failed
        this.notificationService.warning(
          'Aviso',
          'No pudimos recalcular tu reputación. Intenta más tarde.'
        );
      }
    } catch (error) {
      this.logger.error('BonusMalusCard: Error recalculating bonus-malus', error);
      this.notificationService.error(
        'Error',
        'Hubo un error al recalcular tu reputación.'
      );
    } finally {
      this.loading.set(false);
    }
  }

  toggleDetails(): void {
    this.showDetails.update(v => !v);
  }
}

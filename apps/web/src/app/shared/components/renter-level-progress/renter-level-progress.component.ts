import {Component, OnInit, inject, signal, computed,
  ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { BonusMalusService } from '@core/services/payments/bonus-malus.service';
import type { UserBonusMalus, AutorentaTier } from '../../../core/models';

interface LevelRequirement {
  label: string;
  current: number | boolean;
  target: number | boolean;
  met: boolean;
  type: 'rating' | 'count' | 'boolean';
}

@Component({
  selector: 'app-renter-level-progress',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonicModule],
  templateUrl: './renter-level-progress.component.html',
})
export class RenterLevelProgressComponent implements OnInit {
  private readonly bonusMalusService = inject(BonusMalusService);

  readonly loading = signal(true);
  readonly bonusMalus = signal<UserBonusMalus | null>(null);
  readonly currentTier = signal<AutorentaTier>('standard');
  readonly showDetails = signal(false);

  readonly nextLevelInfo = computed(() => {
    const tier = this.currentTier();
    const bm = this.bonusMalus();
    if (!bm) return null;

    if (tier === 'elite') {
      return {
        label: '¡Nivel Máximo!',
        progress: 100,
        requirements: []
      };
    }

    const isStandard = tier === 'standard';
    const targetLabel = isStandard ? 'Trusted' : 'Elite';
    
    // Requirements
    const reqs: LevelRequirement[] = [];

    if (isStandard) {
      // Standard -> Trusted Requirements
      // 1. Identity Verified
      reqs.push({
        label: 'Identidad Verificada',
        current: bm.metrics.is_verified,
        target: true,
        met: bm.metrics.is_verified,
        type: 'boolean'
      });
      // 2. Rating > 4.0 (if has ratings)
      if (bm.metrics.average_rating > 0) {
        reqs.push({
          label: 'Rating Promedio',
          current: bm.metrics.average_rating,
          target: 4.0,
          met: bm.metrics.average_rating >= 4.0,
          type: 'rating'
        });
      }
    } else {
      // Trusted -> Elite Requirements
      // 1. Rating > 4.8
      reqs.push({
        label: 'Rating Excelencia',
        current: bm.metrics.average_rating,
        target: 4.8,
        met: bm.metrics.average_rating >= 4.8,
        type: 'rating'
      });
      // 2. 20+ Rentals
      reqs.push({
        label: 'Viajes Completados',
        current: bm.metrics.completed_rentals,
        target: 20,
        met: bm.metrics.completed_rentals >= 20,
        type: 'count'
      });
      // 3. Low Cancellation (< 5%)
      reqs.push({
        label: 'Tasa Cancelación',
        current: bm.metrics.cancellation_rate * 100, // display as %
        target: 5, // < 5%
        met: bm.metrics.cancellation_rate <= 0.05,
        type: 'count' // inverted logic handled in template
      });
    }

    // Calculate progress based on met requirements count vs total
    const metCount = reqs.filter(r => r.met).length;
    const progress = reqs.length > 0 ? (metCount / reqs.length) * 100 : 0;

    return {
      label: targetLabel,
      progress,
      requirements: reqs
    };
  });

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    try {
      const bm = await this.bonusMalusService.getUserBonusMalus();
      this.bonusMalus.set(bm);
      
      if (bm) {
        this.currentTier.set(await this.bonusMalusService.getUserTier());
      }
    } finally {
      this.loading.set(false);
    }
  }

  toggleDetails(): void {
    this.showDetails.update(v => !v);
  }
}
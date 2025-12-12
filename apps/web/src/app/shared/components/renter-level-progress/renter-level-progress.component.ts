import {Component, OnInit, inject, signal, computed,
  ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseClientService } from '../../../core/services/supabase-client.service';

export interface RenterLevelData {
  success: boolean;
  user_id: string;
  level: 'basic' | 'verified' | 'premium';
  level_label: string;
  benefits: string[];
  requirements_met: Array<{ requirement: string; met: boolean; current?: number }>;
  requirements_missing: Array<{ requirement: string; met: boolean; current?: number }>;
  stats: {
    total_rentals: number;
    average_rating: number;
    disputes_lost: number;
  };
}

@Component({
  selector: 'app-renter-level-progress',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './renter-level-progress.component.html',
})
export class RenterLevelProgressComponent implements OnInit {
  private readonly supabase = inject(SupabaseClientService).getClient();

  readonly loading = signal(true);
  readonly levelData = signal<RenterLevelData | null>(null);
  readonly showDetails = signal(false);

  readonly progressPercentage = computed(() => {
    const data = this.levelData();
    if (!data) return 0;
    const met = data.requirements_met.length;
    const total = met + data.requirements_missing.length;
    return total > 0 ? (met / total) * 100 : 0;
  });

  readonly nextLevel = computed(() => {
    const data = this.levelData();
    if (!data) return null;
    if (data.level === 'basic') return 'Verificado';
    if (data.level === 'verified') return 'Premium';
    return null;
  });

  async ngOnInit(): Promise<void> {
    await this.loadRenterLevel();
  }

  async loadRenterLevel(): Promise<void> {
    this.loading.set(true);
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await this.supabase.rpc('get_renter_level', {
        p_user_id: user.id
      });

      if (error) throw error;
      this.levelData.set(data as RenterLevelData);
    } catch (err) {
      console.error('Error loading renter level:', err);
    } finally {
      this.loading.set(false);
    }
  }

  toggleDetails(): void {
    this.showDetails.update(v => !v);
  }

  getLevelIcon(level: string): string {
    switch (level) {
      case 'basic': return '🔰';
      case 'verified': return '✅';
      case 'premium': return '⭐';
      default: return '👤';
    }
  }

  getLevelColor(level: string): string {
    switch (level) {
      case 'basic': return 'text-text-secondary';
      case 'verified': return 'text-cta-default';
      case 'premium': return 'text-warning-strong';
      default: return 'text-text-muted';
    }
  }

  getLevelBgColor(level: string): string {
    switch (level) {
      case 'basic': return 'bg-surface-secondary';
      case 'verified': return 'bg-cta-default/10';
      case 'premium': return 'bg-warning-bg';
      default: return 'bg-surface-secondary';
    }
  }
}

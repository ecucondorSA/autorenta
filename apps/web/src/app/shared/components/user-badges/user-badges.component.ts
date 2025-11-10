import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import type { UserStats } from '../../../core/models';

interface BadgeDisplay {
  type: string;
  label: string;
  icon: string;
  color: string;
  description: string;
}

@Component({
  selector: 'app-user-badges',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './user-badges.component.html',
  styleUrls: ['./user-badges.component.css'],
})
export class UserBadgesComponent {
  @Input() userStats!: UserStats;
  @Input() showLabels: boolean = true;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';

  get activeBadges(): BadgeDisplay[] {
    if (!this.userStats) return [];

    const badges: BadgeDisplay[] = [];

    if (this.userStats.is_super_host) {
      badges.push({
        type: 'super_host',
        label: 'Super Host',
        icon: '⭐',
        color: 'from-purple-500 to-pink-500',
        description: '≥50 reviews, promedio ≥4.9⭐, 0 cancelaciones',
      });
    }

    if (this.userStats.is_top_host) {
      badges.push({
        type: 'top_host',
        label: 'Top Host',
        icon: '🏆',
        color: 'from-yellow-400 to-warning-light',
        description: '≥10 reviews, promedio ≥4.8⭐',
      });
    }

    if (this.userStats.is_verified_renter) {
      badges.push({
        type: 'verified_renter',
        label: 'Verified Renter',
        icon: '✓',
        color: 'from-cta-default to-cta-default',
        description: 'Identidad verificada',
      });
    }

    // Trusted Driver badge (based on renter stats)
    if (this.userStats.renter_reviews_count >= 10 && this.userStats.renter_rating_avg >= 4.8) {
      badges.push({
        type: 'trusted_driver',
        label: 'Trusted Driver',
        icon: '🚗',
        color: 'from-success-light to-success-600',
        description: '≥10 reservas, promedio ≥4.8⭐',
      });
    }

    return badges;
  }

  get sizeClasses(): Record<string, string> {
    const sizes = {
      small: 'w-6 h-6 text-xs',
      medium: 'w-10 h-10 text-base',
      large: 'w-16 h-16 text-2xl',
    };

    return sizes;
  }

  getBadgeSizeClass(): string {
    return this.sizeClasses[this.size];
  }
}

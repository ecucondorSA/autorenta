import {Component, Input, OnInit, inject, signal,
  ChangeDetectionStrategy} from '@angular/core';

import { SupabaseClientService } from '../../../core/services/supabase-client.service';

export interface RenterProfileBadge {
  renter_id: string;
  renter_name: string;
  badge_level: 'excelente' | 'bueno' | 'regular' | 'atencion';
  has_protection: boolean;
  total_rentals: number;
  years_without_claims: number;
}

@Component({
  selector: 'app-renter-profile-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    @if (profile(); as p) {
      <div class="renter-badge" [class]="'badge-' + p.badge_level">
        <div class="badge-header">
          <span class="badge-icon">{{ getBadgeIcon(p.badge_level) }}</span>
          <span class="badge-label">{{ getBadgeLabel(p.badge_level) }}</span>
        </div>
        <div class="badge-details">
          <span class="renter-name">{{ p.renter_name }}</span>
          <div class="badge-stats">
            @if (p.total_rentals > 0) {
              <span class="stat" title="Alquileres completados">
                🚗 {{ p.total_rentals }}
              </span>
            }
            @if (p.years_without_claims > 0) {
              <span class="stat" title="Años sin siniestros">
                ✨ {{ p.years_without_claims }} año{{ p.years_without_claims > 1 ? 's' : '' }}
              </span>
            }
          </div>
        </div>
        @if (p.has_protection) {
          <div class="protection-badge" title="Tiene Protector de Bonus activo">
            🛡️
          </div>
        }
      </div>
    }
    
    @if (loading()) {
      <div class="renter-badge loading">
        <div class="skeleton"></div>
      </div>
    }
    `,
  styles: [`
    .renter-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 0.85rem;
      position: relative;
    }

    .badge-excelente {
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
      border: 1px solid #10b981;
    }

    .badge-bueno {
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      border: 1px solid #3b82f6;
    }

    .badge-regular {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border: 1px solid #f59e0b;
    }

    .badge-atencion {
      background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
      border: 1px solid #ef4444;
    }

    .badge-header {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .badge-icon {
      font-size: 1.2rem;
    }

    .badge-label {
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.7rem;
      letter-spacing: 0.5px;
    }

    .badge-excelente .badge-label { color: #047857; }
    .badge-bueno .badge-label { color: #1d4ed8; }
    .badge-regular .badge-label { color: #b45309; }
    .badge-atencion .badge-label { color: #dc2626; }

    .badge-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .renter-name {
      font-weight: 500;
      color: #374151;
    }

    .badge-stats {
      display: flex;
      gap: 8px;
      font-size: 0.75rem;
      color: #6b7280;
    }

    .protection-badge {
      font-size: 1.2rem;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    .loading {
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
    }

    .skeleton {
      width: 120px;
      height: 20px;
      background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 4px;
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `]
})
export class RenterProfileBadgeComponent implements OnInit {
  @Input({ required: true }) renterId!: string;

  private readonly supabase = inject(SupabaseClientService).getClient();

  readonly profile = signal<RenterProfileBadge | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  async ngOnInit() {
    await this.loadProfile();
  }

  private async loadProfile() {
    try {
      this.loading.set(true);

      const { data, error } = await this.supabase.rpc('get_renter_profile_badge', {
        p_renter_id: this.renterId
      });

      if (error) throw error;

      this.profile.set(data as RenterProfileBadge);
    } catch (err) {
      console.error('Error loading renter profile badge:', err);
      this.error.set('Error al cargar perfil');
    } finally {
      this.loading.set(false);
    }
  }

  getBadgeIcon(level: string): string {
    switch (level) {
      case 'excelente': return '⭐';
      case 'bueno': return '👍';
      case 'regular': return '👋';
      case 'atencion': return '⚠️';
      default: return '👤';
    }
  }

  getBadgeLabel(level: string): string {
    switch (level) {
      case 'excelente': return 'Excelente';
      case 'bueno': return 'Bueno';
      case 'regular': return 'Regular';
      case 'atencion': return 'Atención';
      default: return 'Nuevo';
    }
  }
}

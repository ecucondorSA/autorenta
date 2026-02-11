import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FeatureDataFacadeService } from '@core/services/facades/feature-data-facade.service';
import { IconComponent } from '../icon/icon.component';

interface RenterAnalysis {
  renter_id: string;
  profile: {
    full_name: string;
    avatar_url: string | null;
    member_since: string;
    years_as_member: number;
    phone: string | null;
  };
  verification: {
    id_verified: boolean;
    phone_verified: boolean;
    email_verified: boolean;
    license_verified: boolean;
    verification_score: number;
  };
  stats: {
    completed_rentals: number;
    total_bookings: number;
    cancellations_by_renter: number;
    cancellation_rate: number;
    avg_booking_value: number;
    last_rental_date: string | null;
  };
  risk_profile: {
    risk_level: 'excellent' | 'good' | 'regular' | 'attention' | 'unknown';
    years_without_claims: number;
    has_bonus_protection: boolean;
  };
  reviews: Array<{
    rating: number;
    comment: string;
    created_at: string;
    reviewer_name: string;
    car_name: string;
  }>;
  reviews_summary: {
    count: number;
    avg_rating: number;
  };
  recent_bookings: Array<{
    id: string;
    car_name: string;
    start_at: string;
    end_at: string;
    status: string;
    total_amount: number;
  }>;
  warnings: Array<{
    type: string;
    severity: 'info' | 'warning' | 'alert';
    message: string;
  }>;
  trust_score: number;
  trust_level: 'excellent' | 'good' | 'regular' | 'new_or_risky';
}

@Component({
  selector: 'app-renter-analysis-panel',
  standalone: true,
  imports: [CommonModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="renter-analysis-panel">
      <!-- Header con score -->
      @if (loading()) {
        <div class="loading-state">
          <div class="animate-pulse flex flex-col gap-4 p-6">
            <div class="h-20 bg-surface-secondary rounded-xl"></div>
            <div class="h-32 bg-surface-secondary rounded-xl"></div>
            <div class="h-24 bg-surface-secondary rounded-xl"></div>
          </div>
        </div>
      } @else if (error()) {
        <div class="error-state p-6 text-center">
          <app-icon name="alert-circle" [size]="48" cssClass="text-red-500 mx-auto mb-3" />
          <p class="text-secondary">{{ error() }}</p>
          <button (click)="loadAnalysis()" class="btn-secondary mt-4">Reintentar</button>
        </div>
      } @else if (analysis()) {
        <!-- Trust Score Header -->
        <div class="trust-score-header" [class]="'trust-' + analysis()!.trust_level">
          <div class="score-circle">
            <span class="score-value">{{ analysis()!.trust_score }}</span>
            <span class="score-label">/ 100</span>
          </div>
          <div class="score-info">
            <h3 class="score-title">{{ getTrustLevelLabel(analysis()!.trust_level) }}</h3>
            <p class="score-subtitle">Nivel de Confianza</p>
          </div>
        </div>

        <!-- Warnings -->
        @if (analysis()!.warnings.length > 0) {
          <div class="warnings-section">
            @for (warning of analysis()!.warnings; track warning.type) {
              <div class="warning-item" [class]="'severity-' + warning.severity">
                <app-icon
                  [name]="
                    warning.severity === 'alert'
                      ? 'alert-triangle'
                      : warning.severity === 'warning'
                        ? 'alert-circle'
                        : 'info'
                  "
                  [size]="18"
                />
                <span>{{ warning.message }}</span>
              </div>
            }
          </div>
        }

        <!-- Profile Section -->
        <div class="section profile-section">
          <div class="profile-header">
            <div class="avatar">
              @if (analysis()!.profile.avatar_url) {
                <img [src]="analysis()!.profile.avatar_url" [alt]="analysis()!.profile.full_name" />
              } @else {
                <app-icon name="user" [size]="32" cssClass="text-secondary" />
              }
            </div>
            <div class="profile-info">
              <h4 class="profile-name">{{ analysis()!.profile.full_name }}</h4>
              <p class="profile-member">
                Miembro desde {{ formatDate(analysis()!.profile.member_since) }}
              </p>
              @if (analysis()!.profile.years_as_member > 0) {
                <span class="member-badge"
                  >{{ analysis()!.profile.years_as_member }}
                  {{ analysis()!.profile.years_as_member === 1 ? 'ano' : 'anos' }}</span
                >
              }
            </div>
          </div>
          @if (analysis()!.profile.phone) {
            <div class="contact-info">
              <app-icon name="phone" [size]="16" />
              <a [href]="'tel:' + analysis()!.profile.phone">{{ analysis()!.profile.phone }}</a>
            </div>
          }
        </div>

        <!-- Verification Section -->
        <div class="section verification-section">
          <h5 class="section-title">
            <app-icon name="shield-check" [size]="18" />
            Verificaciones ({{ analysis()!.verification.verification_score }}/4)
          </h5>
          <div class="verification-grid">
            <div class="verification-item" [class.verified]="analysis()!.verification.id_verified">
              <app-icon
                [name]="analysis()!.verification.id_verified ? 'check-circle' : 'circle'"
                [size]="20"
              />
              <span>Identidad</span>
            </div>
            <div
              class="verification-item"
              [class.verified]="analysis()!.verification.phone_verified"
            >
              <app-icon
                [name]="analysis()!.verification.phone_verified ? 'check-circle' : 'circle'"
                [size]="20"
              />
              <span>Teléfono</span>
            </div>
            <div
              class="verification-item"
              [class.verified]="analysis()!.verification.email_verified"
            >
              <app-icon
                [name]="analysis()!.verification.email_verified ? 'check-circle' : 'circle'"
                [size]="20"
              />
              <span>Email</span>
            </div>
            <div
              class="verification-item"
              [class.verified]="analysis()!.verification.license_verified"
            >
              <app-icon
                [name]="analysis()!.verification.license_verified ? 'check-circle' : 'circle'"
                [size]="20"
              />
              <span>Licencia</span>
            </div>
          </div>
        </div>

        <!-- Stats Section -->
        <div class="section stats-section">
          <h5 class="section-title">
            <app-icon name="bar-chart" [size]="18" />
            Estadisticas
          </h5>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-value">{{ analysis()!.stats.completed_rentals }}</span>
              <span class="stat-label">Alquileres</span>
            </div>
            <div class="stat-item" [class.warning]="analysis()!.stats.cancellation_rate > 20">
              <span class="stat-value">{{ analysis()!.stats.cancellation_rate }}%</span>
              <span class="stat-label">Cancelaciones</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ analysis()!.risk_profile.years_without_claims }}</span>
              <span class="stat-label">Anos sin siniestros</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{
                getRiskLevelEmoji(analysis()!.risk_profile.risk_level)
              }}</span>
              <span class="stat-label">Perfil</span>
            </div>
          </div>
        </div>

        <!-- Reviews Section -->
        @if (analysis()!.reviews_summary.count > 0) {
          <div class="section reviews-section">
            <h5 class="section-title">
              <app-icon name="star" [size]="18" />
              Reviews ({{ analysis()!.reviews_summary.avg_rating }}/5)
            </h5>
            <div class="reviews-summary">
              <div class="rating-stars">
                @for (star of [1, 2, 3, 4, 5]; track star) {
                  <app-icon
                    name="star"
                    [size]="20"
                    [cssClass]="
                      star <= Math.round(analysis()!.reviews_summary.avg_rating)
                        ? 'text-yellow-500 fill-yellow-500'
                        : 'text-gray-300'
                    "
                  />
                }
              </div>
              <span class="review-count"
                >{{ analysis()!.reviews_summary.count }}
                {{ analysis()!.reviews_summary.count === 1 ? 'review' : 'reviews' }}</span
              >
            </div>
            @if (showReviews() && analysis()!.reviews.length > 0) {
              <div class="reviews-list">
                @for (review of analysis()!.reviews; track review.created_at) {
                  <div class="review-item">
                    <div class="review-header">
                      <span class="reviewer">{{ review.reviewer_name }}</span>
                      <span class="review-rating">{{ review.rating }}/5</span>
                    </div>
                    @if (review.comment) {
                      <p class="review-comment">"{{ review.comment }}"</p>
                    }
                    <span class="review-car">{{ review.car_name }}</span>
                  </div>
                }
              </div>
            }
            @if (analysis()!.reviews.length > 0) {
              <button (click)="showReviews.set(!showReviews())" class="toggle-reviews">
                {{ showReviews() ? 'Ocultar reviews' : 'Ver reviews' }}
              </button>
            }
          </div>
        }

        <!-- Recent Bookings -->
        @if (analysis()!.recent_bookings.length > 0) {
          <div class="section bookings-section">
            <h5 class="section-title">
              <app-icon name="calendar" [size]="18" />
              Últimos Alquileres
            </h5>
            <div class="bookings-list">
              @for (booking of analysis()!.recent_bookings.slice(0, 3); track booking.id) {
                <div class="booking-item">
                  <span class="booking-car">{{ booking.car_name }}</span>
                  <span class="booking-status" [class]="'status-' + booking.status">
                    {{ getStatusLabel(booking.status) }}
                  </span>
                </div>
              }
            </div>
          </div>
        }

        <!-- Bonus Protection Badge -->
        @if (analysis()!.risk_profile.has_bonus_protection) {
          <div class="bonus-protection-badge">
            <app-icon name="shield" [size]="20" />
            <span>Protector de Bonus Activo</span>
          </div>
        }

        <!-- Actions -->
        <div class="actions-section">
          <button (click)="onApprove()" class="btn-approve" [disabled]="approving()">
            @if (approving()) {
              <span class="animate-spin">...</span>
            } @else {
              <app-icon name="check" [size]="20" />
            }
            Aprobar Solicitud
          </button>
          <button (click)="onReject()" class="btn-reject" [disabled]="approving()">
            <app-icon name="x" [size]="20" />
            Rechazar
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .renter-analysis-panel {
        background: var(--surface-raised);
        border-radius: 1rem;
        overflow: hidden;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      }

      .trust-score-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1.5rem;
        background: linear-gradient(135deg, var(--cta-default) 0%, #3b82f6 100%);
        color: white;
      }

      .trust-score-header.trust-excellent {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      }

      .trust-score-header.trust-good {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      }

      .trust-score-header.trust-regular {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      }

      .trust-score-header.trust-new_or_risky {
        background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
      }

      .score-circle {
        width: 70px;
        height: 70px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .score-value {
        font-size: 1.75rem;
        font-weight: 700;
        line-height: 1;
      }

      .score-label {
        font-size: 0.75rem;
        opacity: 0.8;
      }

      .score-info {
        flex: 1;
      }

      .score-title {
        font-size: 1.25rem;
        font-weight: 600;
        margin: 0;
      }

      .score-subtitle {
        font-size: 0.875rem;
        opacity: 0.9;
        margin: 0;
      }

      .warnings-section {
        padding: 0.75rem 1rem;
        background: #fef3c7;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .warning-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        padding: 0.5rem;
        border-radius: 0.5rem;
      }

      .warning-item.severity-info {
        background: #dbeafe;
        color: #1e40af;
      }

      .warning-item.severity-warning {
        background: #fef3c7;
        color: #92400e;
      }

      .warning-item.severity-alert {
        background: #fee2e2;
        color: #991b1b;
      }

      .section {
        padding: 1rem 1.25rem;
        border-bottom: 1px solid var(--border-subtle);
      }

      .section:last-of-type {
        border-bottom: none;
      }

      .section-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text-secondary);
        margin: 0 0 0.75rem 0;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .profile-section .profile-header {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .avatar {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        overflow: hidden;
        background: var(--surface-secondary);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .profile-name {
        font-size: 1.125rem;
        font-weight: 600;
        margin: 0 0 0.25rem 0;
        color: var(--text-primary);
      }

      .profile-member {
        font-size: 0.875rem;
        color: var(--text-secondary);
        margin: 0;
      }

      .member-badge {
        display: inline-block;
        background: var(--cta-default);
        color: white;
        font-size: 0.75rem;
        padding: 0.125rem 0.5rem;
        border-radius: 1rem;
        margin-top: 0.25rem;
      }

      .contact-info {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.75rem;
        padding-top: 0.75rem;
        border-top: 1px solid var(--border-subtle);
      }

      .contact-info a {
        color: var(--cta-default);
        text-decoration: none;
      }

      .verification-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.5rem;
      }

      .verification-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem;
        border-radius: 0.5rem;
        background: var(--surface-secondary);
        color: var(--text-tertiary);
        font-size: 0.875rem;
      }

      .verification-item.verified {
        background: #d1fae5;
        color: #065f46;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 0.5rem;
      }

      .stat-item {
        text-align: center;
        padding: 0.75rem 0.5rem;
        background: var(--surface-secondary);
        border-radius: 0.5rem;
      }

      .stat-item.warning {
        background: #fef3c7;
      }

      .stat-value {
        display: block;
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--text-primary);
      }

      .stat-label {
        display: block;
        font-size: 0.7rem;
        color: var(--text-secondary);
        text-transform: uppercase;
        margin-top: 0.25rem;
      }

      .reviews-summary {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .rating-stars {
        display: flex;
        gap: 0.125rem;
      }

      .review-count {
        font-size: 0.875rem;
        color: var(--text-secondary);
      }

      .reviews-list {
        margin-top: 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .review-item {
        padding: 0.75rem;
        background: var(--surface-secondary);
        border-radius: 0.5rem;
      }

      .review-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.25rem;
      }

      .reviewer {
        font-weight: 500;
        font-size: 0.875rem;
      }

      .review-rating {
        font-size: 0.75rem;
        color: var(--text-secondary);
      }

      .review-comment {
        font-size: 0.875rem;
        color: var(--text-secondary);
        font-style: italic;
        margin: 0.25rem 0;
      }

      .review-car {
        font-size: 0.75rem;
        color: var(--text-tertiary);
      }

      .toggle-reviews {
        margin-top: 0.5rem;
        font-size: 0.875rem;
        color: var(--cta-default);
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
      }

      .bookings-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .booking-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0.75rem;
        background: var(--surface-secondary);
        border-radius: 0.5rem;
      }

      .booking-car {
        font-size: 0.875rem;
        font-weight: 500;
      }

      .booking-status {
        font-size: 0.75rem;
        padding: 0.125rem 0.5rem;
        border-radius: 1rem;
      }

      .booking-status.status-completed {
        background: #d1fae5;
        color: #065f46;
      }

      .booking-status.status-cancelled {
        background: #fee2e2;
        color: #991b1b;
      }

      .booking-status.status-confirmed {
        background: #dbeafe;
        color: #1e40af;
      }

      .bonus-protection-badge {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.75rem;
        background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
        color: white;
        font-size: 0.875rem;
        font-weight: 500;
      }

      .actions-section {
        display: flex;
        gap: 0.75rem;
        padding: 1.25rem;
        background: var(--surface-secondary);
      }

      .btn-approve {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.875rem 1rem;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        border: none;
        border-radius: 0.75rem;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-approve:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
      }

      .btn-approve:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .btn-reject {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.875rem 1.25rem;
        background: white;
        color: #dc2626;
        border: 2px solid #dc2626;
        border-radius: 0.75rem;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-reject:hover:not(:disabled) {
        background: #fee2e2;
      }

      .btn-reject:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .loading-state,
      .error-state {
        min-height: 300px;
      }

      @media (max-width: 480px) {
        .stats-grid {
          grid-template-columns: repeat(2, 1fr);
        }

        .verification-grid {
          grid-template-columns: 1fr;
        }

        .actions-section {
          flex-direction: column;
        }

        .btn-reject {
          width: 100%;
        }
      }
    `,
  ],
})
export class RenterAnalysisPanelComponent {
  private readonly featureDataFacade = inject(FeatureDataFacadeService);

  // Inputs
  readonly renterId = input.required<string>();
  readonly bookingId = input<string>();

  // Outputs
  readonly approve = output<void>();
  readonly reject = output<void>();

  // State
  readonly analysis = signal<RenterAnalysis | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showReviews = signal(false);
  readonly approving = signal(false);

  // For template
  readonly Math = Math;

  constructor() {
    effect(() => {
      const renterId = this.renterId();
      if (renterId) {
        this.loadAnalysis();
      }
    });
  }

  async loadAnalysis(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const data = await this.featureDataFacade.getRenterAnalysis({
        renterId: this.renterId(),
        bookingId: this.bookingId() || null,
      });
      const analysisData = data as (RenterAnalysis & { error?: string }) | null;

      if (analysisData?.error) {
        this.error.set(String(analysisData.error));
      } else {
        this.analysis.set((analysisData as unknown as RenterAnalysis | null) ?? null);
      }
    } catch (err) {
      this.error.set('Error al cargar el analisis del locatario');
      console.error('Error loading renter analysis:', err);
    } finally {
      this.loading.set(false);
    }
  }

  getTrustLevelLabel(level: string): string {
    const labels: Record<string, string> = {
      excellent: 'Excelente',
      good: 'Bueno',
      regular: 'Regular',
      new_or_risky: 'Nuevo/Revisar',
    };
    return labels[level] || level;
  }

  getRiskLevelEmoji(level: string): string {
    const emojis: Record<string, string> = {
      excellent: '⭐',
      good: '👍',
      regular: '👋',
      attention: '⚠️',
      unknown: '❓',
    };
    return emojis[level] || '❓';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      completed: 'Completado',
      cancelled: 'Cancelado',
      confirmed: 'Confirmado',
      pending: 'Pendiente',
    };
    return labels[status] || status;
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-AR', { month: 'short', year: 'numeric' });
  }

  onApprove(): void {
    this.approving.set(true);
    this.approve.emit();
  }

  onReject(): void {
    this.reject.emit();
  }

  resetApproving(): void {
    this.approving.set(false);
  }
}

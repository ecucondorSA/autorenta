import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  signal,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { interval, Subscription } from 'rxjs';
import { Car } from '../../../core/models';
import { SupabaseClientService } from '../../../core/services/supabase-client.service';
import { AnalyticsService } from '../../../core/services/analytics.service';

export interface SocialProofData {
  currentViewers: number;
  totalBookings: number;
  availableDays: number;
  popularityScore: number;
}

@Component({
  selector: 'app-social-proof-indicators',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './social-proof-indicators.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialProofIndicatorsComponent implements OnInit, OnDestroy {
  @Input() car: Car | null = null;
  @Input() refreshInterval = 45000; // 45 segundos por defecto
  @Input() showViewers = true;
  @Input() showBookings = true;
  @Input() showAvailability = true;

  private readonly supabase = inject(SupabaseClientService).getClient();
  private readonly analytics = inject(AnalyticsService);
  private refreshSubscription?: Subscription;

  readonly socialProof = signal<SocialProofData>({
    currentViewers: 0,
    totalBookings: 0,
    availableDays: 0,
    popularityScore: 0,
  });

  ngOnInit(): void {
    if (this.car) {
      void this.loadSocialProofData();

      // Actualizar datos periódicamente
      this.refreshSubscription = interval(this.refreshInterval).subscribe(() => {
        void this.loadSocialProofData();
      });
    }
  }

  ngOnDestroy(): void {
    this.refreshSubscription?.unsubscribe();
  }

  /**
   * Carga datos de prueba social
   * Combina datos reales (bookings) con simulados (viewers)
   */
  private async loadSocialProofData(): Promise<void> {
    if (!this.car) return;

    try {
      // 1. Calcular popularidad basada en métricas reales
      const popularityScore = this.calculatePopularityScore(this.car);

      // 2. Simular viewers inteligentemente basado en popularidad
      const currentViewers = this.generateIntelligentViewers(popularityScore);

      // 3. Obtener bookings reales de los últimos 30 días
      const totalBookings = await this.getRecentBookingsCount(this.car.id);

      // 4. Calcular días disponibles este mes
      const availableDays = await this.getAvailableDaysThisMonth(this.car.id);

      const data = {
        currentViewers,
        totalBookings,
        availableDays,
        popularityScore,
      };

      this.socialProof.set(data);

      // Track: Social proof viewed
      this.trackSocialProofViewed(data);
    } catch (_error) {
      console.error('Error loading social proof data:', _error);
    }
  }

  /**
   * Track analytics events for social proof indicators
   */
  private trackSocialProofViewed(data: SocialProofData): void {
    if (!this.car) return;

    // Track viewers indicator
    if (this.showViewers && data.currentViewers > 0) {
      this.analytics.trackEvent('social_proof_viewed', {
        car_id: this.car.id,
        indicator_type: 'viewers',
        viewers_count: data.currentViewers,
      });
    }

    // Track bookings indicator
    if (this.showBookings && data.totalBookings > 0) {
      this.analytics.trackEvent('social_proof_viewed', {
        car_id: this.car.id,
        indicator_type: 'bookings',
        bookings_count: data.totalBookings,
      });
    }

    // Track availability urgency
    if (this.showAvailability && this.showLimitedAvailability) {
      this.analytics.trackEvent('urgency_indicator_viewed', {
        car_id: this.car.id,
        indicator_type: 'availability',
        available_days: data.availableDays,
      });
    }

    // Track high demand badge
    if (this.isHighDemand) {
      this.analytics.trackEvent('social_proof_viewed', {
        car_id: this.car.id,
        indicator_type: 'badge',
        badge_type: 'high_demand',
        popularity_score: data.popularityScore,
      });
    }

    // Track popular rental badge
    if (this.isPopularRental) {
      this.analytics.trackEvent('social_proof_viewed', {
        car_id: this.car.id,
        indicator_type: 'badge',
        badge_type: 'popular',
        popularity_score: data.popularityScore,
      });
    }
  }

  /**
   * Calcula score de popularidad (0-100) basado en métricas reales del auto
   */
  private calculatePopularityScore(car: Car): number {
    let score = 50; // Base score

    // Factor 1: Rating promedio (0-25 puntos)
    const rating = car.rating_count && car.rating_count > 0
      ? (car.rating_avg ?? 0)
      : 0;
    score += (rating / 5) * 25;

    // Factor 2: Cantidad de reviews (0-15 puntos)
    const reviewCount = car.rating_count ?? 0;
    score += Math.min(reviewCount / 10, 1) * 15;

    // Factor 3: Precio competitivo (0-10 puntos)
    // Autos más baratos = más populares
    const pricePerDay = typeof car.price_per_day === 'string'
      ? parseFloat(car.price_per_day)
      : car.price_per_day;
    if (pricePerDay < 20) score += 10;
    else if (pricePerDay < 30) score += 5;

    return Math.min(Math.round(score), 100);
  }

  /**
   * Genera número de viewers simulado basado en popularidad
   * Usa randomización para parecer dinámico
   */
  private generateIntelligentViewers(popularityScore: number): number {
    // Base viewers: 0-5 para autos poco populares, 5-20 para muy populares
    const baseViewers = Math.floor((popularityScore / 100) * 15);

    // Añadir variación aleatoria (-30% a +50%)
    const randomFactor = 0.7 + Math.random() * 0.8; // 0.7 - 1.5
    const viewers = Math.max(0, Math.round(baseViewers * randomFactor));

    return viewers;
  }

  /**
   * Obtiene cantidad de bookings confirmadas en los últimos 30 días
   * DATOS REALES de Supabase
   */
  private async getRecentBookingsCount(carId: string): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count, error } = await this.supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('car_id', carId)
        .in('status', ['confirmed', 'completed', 'in_progress'])
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (error) {
        console.error('Error fetching bookings count:', error);
        return 0;
      }

      return count ?? 0;
    } catch (_error) {
      console.error('Error in getRecentBookingsCount:', _error);
      return 0;
    }
  }

  /**
   * Calcula cuántos días del mes actual están disponibles
   * DATOS REALES basados en bookings
   */
  private async getAvailableDaysThisMonth(carId: string): Promise<number> {
    try {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const totalDaysInMonth = lastDayOfMonth.getDate();

      // Obtener bookings confirmadas para este mes
      const { data: bookings, error } = await this.supabase
        .from('bookings')
        .select('start_at, end_at')
        .eq('car_id', carId)
        .in('status', ['confirmed', 'in_progress'])
        .gte('start_at', firstDayOfMonth.toISOString())
        .lte('end_at', lastDayOfMonth.toISOString());

      if (error || !bookings) {
        // Si hay error, asumir que la mayoría de días están disponibles
        return Math.floor(totalDaysInMonth * 0.8);
      }

      // Calcular días bloqueados
      const blockedDays = new Set<string>();
      bookings.forEach((booking) => {
        const start = new Date(booking.start_at);
        const end = new Date(booking.end_at);

        // Marcar todos los días entre start y end como bloqueados
        const currentDate = new Date(start);
        while (currentDate <= end) {
          const dateKey = currentDate.toISOString().split('T')[0];
          blockedDays.add(dateKey);
          currentDate.setDate(currentDate.getDate() + 1);
        }
      });

      const availableDays = totalDaysInMonth - blockedDays.size;
      return Math.max(0, availableDays);
    } catch (_error) {
      console.error('Error in getAvailableDaysThisMonth:', _error);
      // Fallback optimista
      return 20;
    }
  }

  /**
   * Determina si el auto es de "alta demanda"
   * Criterio: popularityScore > 70 O más de 5 bookings en 30 días
   */
  get isHighDemand(): boolean {
    const data = this.socialProof();
    return data.popularityScore > 70 || data.totalBookings > 5;
  }

  /**
   * Determina si el auto es "reserva popular"
   * Criterio: Más del 75% del mes está ocupado
   */
  get isPopularRental(): boolean {
    const data = this.socialProof();
    const now = new Date();
    const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const occupancyRate = 1 - data.availableDays / totalDaysInMonth;

    return occupancyRate > 0.75;
  }

  /**
   * Determina si mostrar urgencia por disponibilidad limitada
   */
  get showLimitedAvailability(): boolean {
    const data = this.socialProof();
    return data.availableDays > 0 && data.availableDays < 10;
  }
}

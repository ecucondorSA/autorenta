import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
  AnalyticsService,
  ConversionEventType,
} from '@core/services/infrastructure/analytics.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

interface EventStats {
  event_type: ConversionEventType;
  count: number;
  last_occurrence: string;
}

interface AnalyticsOverview {
  total_events: number;
  unique_users: number;
  total_bookings: number;
  conversion_rate: number;
  top_events: EventStats[];
}

/**
 * Tipo específico para eventos de analytics
 */
interface AnalyticsEvent {
  id?: string;
  event_type: string;
  user_id?: string | null;
  created_at: string;
  event_data?: {
    car_id?: string;
    [key: string]: unknown;
  } | null;
}

@Component({
  standalone: true,
  selector: 'app-admin-analytics-page',
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './admin-analytics.page.html',
  styleUrl: './admin-analytics.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminAnalyticsPage implements OnInit {
  private readonly supabase = injectSupabase();
  private readonly analyticsService = inject(AnalyticsService);

  protected readonly overview = signal<AnalyticsOverview | null>(null);
  protected readonly topCars = signal<Array<{ car_id: string; count: number }>>([]);
  protected readonly recentEvents = signal<AnalyticsEvent[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadAnalytics();
  }

  private async loadAnalytics(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      // Load overview stats
      const { data: events, error: eventsError } = await this.supabase
        .from('conversion_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (eventsError) throw eventsError;

      // Calculate overview
      const totalEvents = events?.length || 0;
      const uniqueUsers = new Set(events?.map((e) => e.user_id).filter(Boolean)).size;
      const totalBookings = events?.filter((e) => e.event_type === 'booking_completed').length || 0;
      const bookingInitiated =
        events?.filter((e) => e.event_type === 'booking_initiated').length || 0;
      const conversionRate = bookingInitiated > 0 ? (totalBookings / bookingInitiated) * 100 : 0;

      // Top events
      const eventCounts = new Map<ConversionEventType, number>();
      const eventLastOccurrence = new Map<ConversionEventType, string>();

      events?.forEach((event) => {
        const type = event.event_type as ConversionEventType;
        eventCounts.set(type, (eventCounts.get(type) || 0) + 1);
        if (!eventLastOccurrence.has(type) || event.created_at > eventLastOccurrence.get(type)!) {
          eventLastOccurrence.set(type, event.created_at);
        }
      });

      const topEvents: EventStats[] = Array.from(eventCounts.entries())
        .map(([event_type, count]) => ({
          event_type,
          count,
          last_occurrence: eventLastOccurrence.get(event_type) || '',
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      this.overview.set({
        total_events: totalEvents,
        unique_users: uniqueUsers,
        total_bookings: totalBookings,
        conversion_rate: conversionRate,
        top_events: topEvents,
      });

      // Top cars
      const carCounts = new Map<string, number>();
      events
        ?.filter((e) => e.event_data?.car_id)
        .forEach((event) => {
          const carId = event.event_data.car_id;
          carCounts.set(carId, (carCounts.get(carId) || 0) + 1);
        });

      const topCarsArray = Array.from(carCounts.entries())
        .map(([car_id, count]) => ({ car_id, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      this.topCars.set(topCarsArray);

      // Recent events
      this.recentEvents.set(events?.slice(0, 50) || []);
    } catch (err) {
      console.error('Error loading analytics:', err);
      this.error.set(err instanceof Error ? err.message : 'Error al cargar analytics');
    } finally {
      this.isLoading.set(false);
    }
  }

  protected async refreshAnalytics(): Promise<void> {
    await this.loadAnalytics();
  }

  protected formatEventType(eventType: string): string {
    return eventType
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  protected formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleCalendarService } from '../../../core/services/google-calendar.service';

interface CalendarEvent {
  date: string;
  title: string;
  description?: string;
}

@Component({
  selector: 'app-calendar-events-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="calendar-events-container">
      <!-- Loading -->
      @if (loading()) {
        <div class="flex justify-center py-8">
          <div
            class="animate-spin h-8 w-8 border-4 border-cta-default border-t-transparent rounded-full"
          ></div>
        </div>
      }

      <!-- Error -->
      @if (error()) {
        <div
          class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
        >
          <p class="text-sm text-red-800 dark:text-red-400">{{ error() }}</p>
        </div>
      }

      <!-- Events List -->
      @if (!loading() && !error() && events().length > 0) {
        <div class="space-y-3">
          <h3 class="text-sm font-semibold text-text-primary mb-3">
            📅 Fechas Bloqueadas ({{ events().length }})
          </h3>

          @for (event of events(); track event.date) {
            <div
              class="flex items-start space-x-3 p-3 bg-surface-secondary rounded-lg border border-border-default"
            >
              <div
                class="flex-shrink-0 w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center"
              >
                <svg
                  class="w-6 h-6 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-text-primary">
                  {{ formatDate(event.date) }}
                </p>
                <p class="text-xs text-text-secondary mt-1">
                  {{ event.title }}
                </p>
                @if (event.description) {
                  <p class="text-xs text-text-muted mt-1">{{ event.description }}</p>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Empty State -->
      @if (!loading() && !error() && events().length === 0) {
        <div class="text-center py-8">
          <svg
            class="w-12 h-12 text-text-muted mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p class="text-sm text-text-secondary">
            No hay fechas bloqueadas en el rango seleccionado
          </p>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .calendar-events-container {
        @apply bg-surface-raised rounded-lg border border-border-default p-4;
      }
    `,
  ],
})
export class CalendarEventsListComponent implements OnInit, OnChanges {
  private readonly googleCalendarService = inject(GoogleCalendarService);

  @Input({ required: true }) carId!: string;
  @Input() fromDate: string = new Date().toISOString().split('T')[0];
  @Input() toDate: string = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly events = signal<CalendarEvent[]>([]);

  ngOnInit(): void {
    void this.loadEvents();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['carId'] || changes['fromDate'] || changes['toDate']) {
      void this.loadEvents();
    }
  }

  private async loadEvents(): Promise<void> {
    if (!this.carId) return;

    this.loading.set(true);
    this.error.set(null);

    try {
      const availability = await this.googleCalendarService
        .getCarCalendarAvailability(this.carId, this.fromDate, this.toDate)
        .toPromise();

      if (availability) {
        this.events.set(availability.events);
      }
    } catch (err) {
      console.error('Error loading calendar events:', err);
      this.error.set('No se pudieron cargar los eventos del calendario');
    } finally {
      this.loading.set(false);
    }
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('es-AR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }
}

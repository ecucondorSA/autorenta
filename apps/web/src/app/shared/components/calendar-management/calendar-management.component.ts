import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleCalendarService } from '../../../core/services/google-calendar.service';

interface CarCalendar {
  car_id: string;
  google_calendar_id: string;
  calendar_name: string;
  sync_enabled: boolean;
  last_synced_at: string | null;
  car?: {
    marca: string;
    modelo: string;
    year: number;
  };
}

@Component({
  selector: 'app-calendar-management',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="calendar-management-container">
      <!-- Header -->
      <div class="header">
        <h2 class="title">📅 Calendarios Sincronizados</h2>
        <p class="subtitle">Gestiona los calendarios de Google asociados a tus autos</p>
      </div>

      <!-- Loading State -->
      @if (isLoading()) {
        <div class="loading-container">
          <div class="spinner"></div>
          <p>Cargando calendarios...</p>
        </div>
      }

      <!-- Empty State -->
      @else if (calendars().length === 0) {
        <div class="empty-state">
          <div class="empty-icon">📆</div>
          <h3>No hay calendarios sincronizados</h3>
          <p>
            Cuando conectes Google Calendar, se creará automáticamente un calendario por cada auto
            que publiques.
          </p>
        </div>
      }

      <!-- Calendars List -->
      @else {
        <div class="calendars-grid">
          @for (calendar of calendars(); track calendar.car_id) {
            <div class="calendar-card">
              <!-- Car Info -->
              <div class="car-info">
                <div class="car-icon">🚗</div>
                <div class="car-details">
                  <h3 class="car-name">{{ calendar.calendar_name }}</h3>
                  @if (calendar.car) {
                    <p class="car-model">
                      {{ calendar.car.marca }} {{ calendar.car.modelo }} ({{ calendar.car.year }})
                    </p>
                  }
                </div>
              </div>

              <!-- Sync Status -->
              <div class="sync-status">
                <div class="status-row">
                  <span class="label">Estado:</span>
                  @if (calendar.sync_enabled) {
                    <span class="badge badge-success">✓ Activo</span>
                  } @else {
                    <span class="badge badge-inactive">⏸ Pausado</span>
                  }
                </div>

                @if (calendar.last_synced_at) {
                  <div class="status-row">
                    <span class="label">Última sincronización:</span>
                    <span class="timestamp">{{ formatDate(calendar.last_synced_at) }}</span>
                  </div>
                }
              </div>

              <!-- Calendar ID -->
              <div class="calendar-id">
                <span class="label">ID de Calendar:</span>
                <code class="calendar-id-text">{{ calendar.google_calendar_id }}</code>
                <button
                  (click)="copyCalendarId(calendar.google_calendar_id)"
                  class="copy-btn"
                  title="Copiar ID"
                >
                  📋
                </button>
              </div>

              <!-- Actions -->
              <div class="actions">
                <a
                  [href]="getCalendarUrl(calendar.google_calendar_id)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn btn-secondary"
                >
                  Ver en Google Calendar →
                </a>
              </div>
            </div>
          }
        </div>

        <!-- Stats -->
        <div class="stats">
          <div class="stat-item">
            <div class="stat-value">{{ calendars().length }}</div>
            <div class="stat-label">Calendarios totales</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ activeCalendars() }}</div>
            <div class="stat-label">Sincronizando</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ recentlySynced() }}</div>
            <div class="stat-label">Sincronizados hoy</div>
          </div>
        </div>
      }

      <!-- Error State -->
      @if (error()) {
        <div class="error-message">
          ⚠️ {{ error() }}
        </div>
      }
    </div>
  `,
  styles: [
    `
      .calendar-management-container {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      .header {
        text-align: center;
      }

      .title {
        font-size: 24px;
        font-weight: 700;
        margin: 0 0 8px;
        color: #111827;
      }

      .subtitle {
        font-size: 14px;
        color: #6b7280;
        margin: 0;
      }

      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px;
        gap: 16px;
      }

      .spinner {
        width: 48px;
        height: 48px;
        border: 4px solid #e5e7eb;
        border-top-color: #6366f1;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .empty-state {
        text-align: center;
        padding: 48px 24px;
        background: #f9fafb;
        border-radius: 12px;
      }

      .empty-icon {
        font-size: 64px;
        margin-bottom: 16px;
      }

      .empty-state h3 {
        font-size: 18px;
        font-weight: 600;
        margin: 0 0 8px;
        color: #111827;
      }

      .empty-state p {
        font-size: 14px;
        color: #6b7280;
        margin: 0;
        max-width: 400px;
        margin: 0 auto;
      }

      .calendars-grid {
        display: grid;
        gap: 20px;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      }

      .calendar-card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        transition: all 0.2s;
      }

      .calendar-card:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        border-color: #6366f1;
      }

      .car-info {
        display: flex;
        gap: 12px;
        align-items: flex-start;
      }

      .car-icon {
        font-size: 32px;
      }

      .car-details {
        flex: 1;
      }

      .car-name {
        font-size: 16px;
        font-weight: 600;
        margin: 0 0 4px;
        color: #111827;
      }

      .car-model {
        font-size: 13px;
        color: #6b7280;
        margin: 0;
      }

      .sync-status {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .status-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 13px;
      }

      .label {
        color: #6b7280;
        font-weight: 500;
      }

      .badge {
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
      }

      .badge-success {
        background: #d1fae5;
        color: #065f46;
      }

      .badge-inactive {
        background: #fee2e2;
        color: #991b1b;
      }

      .timestamp {
        font-size: 12px;
        color: #9ca3af;
      }

      .calendar-id {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
      }

      .calendar-id-text {
        flex: 1;
        padding: 8px;
        background: #f3f4f6;
        border-radius: 6px;
        font-size: 11px;
        font-family: 'Courier New', monospace;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .copy-btn {
        padding: 6px 10px;
        background: #f3f4f6;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.2s;
      }

      .copy-btn:hover {
        background: #e5e7eb;
      }

      .actions {
        display: flex;
        gap: 8px;
      }

      .btn {
        flex: 1;
        padding: 10px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        text-decoration: none;
        text-align: center;
        transition: all 0.2s;
        border: none;
        cursor: pointer;
      }

      .btn-secondary {
        background: #f3f4f6;
        color: #374151;
      }

      .btn-secondary:hover {
        background: #e5e7eb;
      }

      .stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 16px;
        padding: 24px;
        background: #f9fafb;
        border-radius: 12px;
      }

      .stat-item {
        text-align: center;
      }

      .stat-value {
        font-size: 32px;
        font-weight: 700;
        color: #6366f1;
        margin-bottom: 4px;
      }

      .stat-label {
        font-size: 13px;
        color: #6b7280;
        font-weight: 500;
      }

      .error-message {
        padding: 12px 16px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 8px;
        color: #dc2626;
        font-size: 14px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarManagementComponent implements OnInit {
  private readonly googleCalendarService = inject(GoogleCalendarService);

  readonly calendars = signal<CarCalendar[]>([]);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);

  readonly activeCalendars = computed(
    () => this.calendars().filter((c) => c.sync_enabled).length,
  );

  readonly recentlySynced = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.calendars().filter((c) => {
      if (!c.last_synced_at) return false;
      const syncDate = new Date(c.last_synced_at);
      syncDate.setHours(0, 0, 0, 0);
      return syncDate.getTime() === today.getTime();
    }).length;
  });

  ngOnInit(): void {
    this.loadCalendars();
  }

  private loadCalendars(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.googleCalendarService.getUserCarCalendars().subscribe({
      next: (calendars) => {
        this.calendars.set(calendars);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading calendars:', err);
        this.error.set('No se pudieron cargar los calendarios');
        this.isLoading.set(false);
      },
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} h`;
    if (diffDays < 7) return `Hace ${diffDays} días`;

    return date.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  getCalendarUrl(calendarId: string): string {
    return `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(calendarId)}`;
  }

  async copyCalendarId(calendarId: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(calendarId);
      // TODO: Show toast notification
      console.log('Calendar ID copied to clipboard');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }
}

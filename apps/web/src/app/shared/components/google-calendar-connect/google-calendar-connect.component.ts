import { Component, signal, inject, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleCalendarService } from '../../../core/services/google-calendar.service';

@Component({
  selector: 'app-google-calendar-connect',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="google-calendar-card">
      <!-- Connection Status -->
      @if (isConnected()) {
        <div class="status-connected">
          <svg class="icon-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3>✅ Google Calendar Conectado</h3>
            <p>Tus reservas se sincronizan automáticamente</p>
            @if (calendarEmail()) {
              <p class="calendar-email">{{ calendarEmail() }}</p>
            }
          </div>
        </div>

        <button (click)="disconnect()" class="btn-disconnect" [disabled]="isLoading()">
          {{ isLoading() ? 'Desconectando...' : 'Desconectar' }}
        </button>
      } @else {
        <div class="status-disconnected">
          <svg class="icon-calendar" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div>
            <h3>Conectar Google Calendar</h3>
            <p>Sincroniza tus reservas automáticamente con tu calendario de Google</p>
            <ul class="benefits-list">
              <li>📅 Sincronización bidireccional</li>
              <li>🔔 Notificaciones en tu calendario</li>
              <li>🚗 Un calendario por cada auto</li>
              <li>⚡ Actualizaciones en tiempo real</li>
            </ul>
          </div>
        </div>

        <button (click)="connect()" class="btn-connect" [disabled]="isLoading()">
          @if (isLoading()) {
            <svg class="spinner" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Conectando...
          } @else {
            🔗 Conectar Google Calendar
          }
        </button>
      }

      <!-- Error Message -->
      @if (errorMessage()) {
        <div class="error-message">
          ⚠️ {{ errorMessage() }}
        </div>
      }
    </div>
  `,
  styles: [`
    .google-calendar-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .status-connected,
    .status-disconnected {
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }

    .icon-success {
      width: 48px;
      height: 48px;
      color: #10b981;
      flex-shrink: 0;
    }

    .icon-calendar {
      width: 48px;
      height: 48px;
      color: #6366f1;
      flex-shrink: 0;
    }

    h3 {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 8px;
      color: #111827;
    }

    p {
      font-size: 14px;
      color: #6b7280;
      margin: 0 0 12px;
    }

    .calendar-email {
      font-size: 12px;
      color: #9ca3af;
      font-family: monospace;
    }

    .benefits-list {
      list-style: none;
      padding: 0;
      margin: 12px 0 0;
      display: grid;
      gap: 8px;
    }

    .benefits-list li {
      font-size: 14px;
      color: #374151;
    }

    .btn-connect,
    .btn-disconnect {
      padding: 12px 24px;
      border-radius: 8px;
      border: none;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .btn-connect {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-connect:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-connect:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-disconnect {
      background: #ef4444;
      color: white;
    }

    .btn-disconnect:hover:not(:disabled) {
      background: #dc2626;
    }

    .spinner {
      width: 20px;
      height: 20px;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .error-message {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 12px;
      border-radius: 8px;
      font-size: 14px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoogleCalendarConnectComponent implements OnInit {
  private readonly googleCalendar = inject(GoogleCalendarService);

  readonly isConnected = signal(false);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly calendarEmail = signal<string | null>(null);

  ngOnInit(): void {
    this.checkConnectionStatus();
  }

  private checkConnectionStatus(): void {
    this.googleCalendar.getConnectionStatus().subscribe({
      next: (status) => {
        this.isConnected.set(status.connected);
        this.calendarEmail.set(status.primary_calendar_id);
      },
      error: () => {
        this.isConnected.set(false);
      }
    });
  }

  connect(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.googleCalendar.connectGoogleCalendar().subscribe({
      next: () => {
        this.isLoading.set(false);
        // Refresh connection status
        this.checkConnectionStatus();
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.message || 'Error al conectar con Google Calendar');
      }
    });
  }

  disconnect(): void {
    if (!confirm('¿Estás seguro de que deseas desconectar Google Calendar?')) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.googleCalendar.disconnectCalendar().subscribe({
      next: () => {
        this.isLoading.set(false);
        this.isConnected.set(false);
        this.calendarEmail.set(null);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.message || 'Error al desconectar');
      }
    });
  }
}

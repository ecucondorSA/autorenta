import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { GoogleCalendarService } from '../../../core/services/google-calendar.service';
import { CarsService } from '../../../core/services/cars.service';
import { NotificationManagerService } from '../../../core/services/notification-manager.service';

interface CarCalendarInfo {
  carId: string;
  carName: string;
  googleCalendarId: string | null;
  calendarName: string | null;
  syncEnabled: boolean;
  lastSynced: string | null;
}

@Component({
  standalone: true,
  selector: 'app-calendar-settings-page',
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <div class="min-h-screen bg-surface-primary dark:bg-surface-primary py-8">
      <div class="max-w-4xl mx-auto px-4">
        <!-- Header -->
        <div class="mb-8">
          <a
            routerLink="/profile"
            class="inline-flex items-center text-sm text-text-secondary hover:text-text-primary mb-4"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Volver al perfil
          </a>
          <h1 class="text-3xl font-bold text-text-primary dark:text-text-primary">
            Configuración de Calendario
          </h1>
          <p class="text-text-secondary dark:text-text-secondary mt-2">
            Conecta tu Google Calendar para sincronizar automáticamente tus reservas y mostrar tu
            disponibilidad en tiempo real.
          </p>
        </div>

        <!-- Connection Status Card -->
        <div
          class="bg-surface-raised dark:bg-surface-raised rounded-xl border border-border-default shadow-soft p-6 mb-6"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <div
                class="w-12 h-12 rounded-full flex items-center justify-center"
                [class.bg-green-100]="isConnected()"
                [class.bg-gray-100]="!isConnected()"
              >
                <svg
                  class="w-6 h-6"
                  [class.text-green-600]="isConnected()"
                  [class.text-gray-400]="!isConnected()"
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
              </div>
              <div>
                <h3 class="text-lg font-semibold text-text-primary">
                  {{ isConnected() ? 'Conectado' : 'Desconectado' }}
                </h3>
                <p class="text-sm text-text-secondary">
                  {{
                    isConnected()
                      ? 'Google Calendar está sincronizado'
                      : 'Conecta tu cuenta de Google'
                  }}
                </p>
              </div>
            </div>

            @if (isConnected()) {
              <button
                (click)="disconnect()"
                [disabled]="loading()"
                class="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                Desconectar
              </button>
            } @else {
              <button
                (click)="connect()"
                [disabled]="loading()"
                class="px-6 py-2 bg-cta-default hover:bg-cta-hover text-white rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                @if (loading()) {
                  <svg
                    class="animate-spin h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                }
                <span>{{ loading() ? 'Conectando...' : 'Conectar Google Calendar' }}</span>
              </button>
            }
          </div>

          @if (connectionStatus() && connectionStatus()!.expires_at) {
            <div class="mt-4 pt-4 border-t border-border-default">
              <p class="text-xs text-text-muted">
                Token expira: {{ formatDate(connectionStatus()!.expires_at!) }}
              </p>
            </div>
          }
        </div>

        <!-- Loading State -->
        @if (loadingCars()) {
          <div class="flex justify-center py-12">
            <svg
              class="animate-spin h-8 w-8 text-cta-default"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>
        }

        <!-- Cars List -->
        @if (!loadingCars() && carCalendars().length > 0) {
          <div class="space-y-4">
            <h2 class="text-xl font-semibold text-text-primary mb-4">
              Calendarios de tus vehículos ({{ carCalendars().length }})
            </h2>

            @for (car of carCalendars(); track car.carId) {
              <div
                class="bg-surface-raised dark:bg-surface-raised rounded-xl border border-border-default shadow-soft p-6"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <h3 class="text-lg font-semibold text-text-primary mb-1">
                      {{ car.carName }}
                    </h3>

                    @if (car.googleCalendarId) {
                      <div class="space-y-2">
                        <div class="flex items-center space-x-2">
                          <svg
                            class="w-4 h-4 text-green-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          <span class="text-sm text-green-600 font-medium">
                            Calendario configurado
                          </span>
                        </div>

                        <div class="text-xs text-text-muted space-y-1">
                          <p><strong>Nombre:</strong> {{ car.calendarName }}</p>
                          <p>
                            <strong>ID:</strong>
                            <code
                              class="bg-surface-secondary px-2 py-1 rounded text-xs font-mono"
                              >{{ car.googleCalendarId }}</code
                            >
                          </p>
                          @if (car.lastSynced) {
                            <p>
                              <strong>Última sincronización:</strong>
                              {{ formatDate(car.lastSynced) }}
                            </p>
                          }
                        </div>
                      </div>
                    } @else {
                      <div class="flex items-center space-x-2 mt-2">
                        <svg
                          class="w-4 h-4 text-amber-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                        <span class="text-sm text-amber-600"> Calendario no configurado aún </span>
                      </div>
                    }
                  </div>

                  <a
                    [routerLink]="['/cars', car.carId]"
                    class="text-sm text-cta-default hover:text-cta-hover"
                  >
                    Ver auto →
                  </a>
                </div>
              </div>
            }
          </div>
        }

        @if (!loadingCars() && carCalendars().length === 0 && isConnected()) {
          <div class="text-center py-12">
            <svg
              class="w-16 h-16 text-text-muted mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              />
            </svg>
            <h3 class="text-lg font-semibold text-text-primary mb-2">No tienes vehículos</h3>
            <p class="text-sm text-text-secondary mb-4">
              Publica tu primer auto para comenzar a usar Google Calendar
            </p>
            <a
              routerLink="/cars/publish"
              class="inline-block px-6 py-2 bg-cta-default hover:bg-cta-hover text-white rounded-lg transition-colors"
            >
              Publicar auto
            </a>
          </div>
        }

        <!-- Info Section -->
        <div class="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
          <h3 class="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-3">
            ℹ️ ¿Cómo funciona?
          </h3>
          <ul class="space-y-2 text-sm text-blue-800 dark:text-blue-400">
            <li class="flex items-start">
              <svg
                class="w-5 h-5 mr-2 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd"
                />
              </svg>
              <span>
                Se crea un calendario separado en Google Calendar para cada uno de tus vehículos
              </span>
            </li>
            <li class="flex items-start">
              <svg
                class="w-5 h-5 mr-2 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd"
                />
              </svg>
              <span>Las reservas se sincronizan automáticamente cuando son confirmadas</span>
            </li>
            <li class="flex items-start">
              <svg
                class="w-5 h-5 mr-2 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd"
                />
              </svg>
              <span>Los calendarios son públicos para que los usuarios vean tu disponibilidad</span>
            </li>
            <li class="flex items-start">
              <svg
                class="w-5 h-5 mr-2 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd"
                />
              </svg>
              <span>Puedes gestionar tus calendarios desde Google Calendar o desde aquí</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  `,
})
export class CalendarSettingsPage implements OnInit {
  private readonly googleCalendarService = inject(GoogleCalendarService);
  private readonly carsService = inject(CarsService);
  private readonly notificationService = inject(NotificationManagerService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly loadingCars = signal(false);
  readonly isConnected = signal(false);
  readonly connectionStatus = signal<{
    connected: boolean;
    expires_at: string | null;
    primary_calendar_id: string | null;
  } | null>(null);
  readonly carCalendars = signal<CarCalendarInfo[]>([]);

  ngOnInit(): void {
    void this.loadConnectionStatus();
    void this.loadCarCalendars();
  }

  private async loadConnectionStatus(): Promise<void> {
    this.loading.set(true);
    try {
      const status = await this.googleCalendarService.getConnectionStatus().toPromise();
      if (status) {
        this.connectionStatus.set(status);
        this.isConnected.set(status.connected);
      }
    } catch (error) {
      console.error('Error loading connection status:', error);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadCarCalendars(): Promise<void> {
    this.loadingCars.set(true);
    try {
      // Get user's cars
      const cars = await this.carsService.getMyCars();

      // Get calendar info for each car
      const calendarInfoPromises = cars.map(async (car) => {
        const calendarId = await this.googleCalendarService.getCarCalendarId(car.id).toPromise();

        // Get additional info from car_google_calendars table if exists
        let calendarName = null;
        let lastSynced = null;

        if (calendarId) {
          // This info would need to be fetched from the service
          calendarName = `Autorenta - ${car.brand} ${car.model}`;
        }

        return {
          carId: car.id,
          carName: car.title || `${car.brand} ${car.model} ${car.year}`,
          googleCalendarId: calendarId,
          calendarName,
          syncEnabled: !!calendarId,
          lastSynced,
        } as CarCalendarInfo;
      });

      const calendars = await Promise.all(calendarInfoPromises);
      this.carCalendars.set(calendars);
    } catch (error) {
      console.error('Error loading car calendars:', error);
    } finally {
      this.loadingCars.set(false);
    }
  }

  async connect(): Promise<void> {
    this.loading.set(true);
    try {
      await this.googleCalendarService.connectGoogleCalendar().toPromise();

      this.notificationService.success(
        'Calendario conectado',
        'Google Calendar se ha conectado exitosamente. Cargando calendarios...',
      );

      // Wait a bit for backend to create calendars
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Reload status and calendars after connection
      await this.loadConnectionStatus();
      await this.loadCarCalendars();

      this.notificationService.success(
        'Calendarios creados',
        'Los calendarios de tus autos están listos y visibles en las páginas de detalle.',
      );
    } catch (error) {
      console.error('Error connecting calendar:', error);
      this.notificationService.error(
        'Error al conectar',
        'No se pudo conectar Google Calendar. Intenta nuevamente.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  async disconnect(): Promise<void> {
    if (!confirm('¿Estás seguro que deseas desconectar Google Calendar?')) {
      return;
    }

    this.loading.set(true);
    try {
      await this.googleCalendarService.disconnectCalendar().toPromise();

      this.isConnected.set(false);
      this.connectionStatus.set(null);
      this.carCalendars.set([]);

      this.notificationService.success(
        'Calendario desconectado',
        'Google Calendar ha sido desconectado exitosamente',
      );
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      this.notificationService.error(
        'Error al desconectar',
        'No se pudo desconectar Google Calendar. Intenta nuevamente.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from as rxFrom, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { SupabaseClientService } from './supabase-client.service';

interface CalendarConnectionStatus {
  connected: boolean;
  expires_at: string | null;
  primary_calendar_id: string | null;
}

interface SyncBookingResponse {
  success: boolean;
  event_id: string | null;
  synced_to_locador: boolean;
  synced_to_locatario: boolean;
}

interface CarCalendarEvent {
  date: string;
  event_id: string;
  title: string;
  description?: string;
}

interface CarCalendarAvailability {
  available: boolean;
  blocked_dates: string[];
  events: CarCalendarEvent[];
  google_calendar_checked: boolean;
}

/**
 * GoogleCalendarService
 *
 * Servicio completo para integración con Google Calendar API v3:
 * - OAuth 2.0 flow para conectar calendarios de usuarios
 * - Sincronización bidireccional de bookings
 * - Gestión de calendarios secundarios por auto
 * - Verificación de disponibilidad
 *
 * Arquitectura:
 * - Frontend (Angular): UI y OAuth popup
 * - Backend (Supabase Edge Functions): OAuth flow y sync logic
 * - Database: google_calendar_tokens, car_google_calendars
 */
@Injectable({
  providedIn: 'root',
})
export class GoogleCalendarService {
  private readonly http = inject(HttpClient);
  private readonly supabase = inject(SupabaseClientService).getClient();

  private readonly OAUTH_FUNCTION_URL = `${environment.supabaseUrl}/functions/v1/google-calendar-oauth`;
  private readonly SYNC_FUNCTION_URL = `${environment.supabaseUrl}/functions/v1/sync-booking-to-calendar`;

  /**
   * Get authorization headers with Supabase token
   * Includes both Authorization (JWT) and apikey (anon key) headers
   * required by Supabase Edge Functions
   */
  private async getAuthHeaders(): Promise<HttpHeaders> {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('No active session. Please log in to continue.');
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };

    // Add apikey header if available (required by Supabase Edge Functions)
    if (environment.supabaseAnonKey) {
      headers['apikey'] = environment.supabaseAnonKey;
    }

    return new HttpHeaders(headers);
  }

  /**
   * Get Google OAuth authorization URL
   */
  getAuthorizationUrl(): Observable<string> {
    return rxFrom(this.getAuthHeaders()).pipe(
      switchMap((headers) =>
        this.http.get<{ authUrl: string }>(`${this.OAUTH_FUNCTION_URL}?action=get-auth-url`, {
          headers,
        }),
      ),
      map((response) => response.authUrl),
      catchError((error) => {
        console.error('Error getting auth URL:', error);
        return throwError(() => new Error('Failed to get authorization URL'));
      }),
    );
  }

  /**
   * Open Google OAuth popup and handle authorization
   */
  connectGoogleCalendar(): Observable<void> {
    return this.getAuthorizationUrl().pipe(
      switchMap((authUrl) => {
        // Open OAuth popup
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const popup = window.open(
          authUrl,
          'Google Calendar Authorization',
          `width=${width},height=${height},left=${left},top=${top}`,
        );

        if (!popup) {
          throw new Error('Failed to open popup. Please allow popups for this site.');
        }

        // Listen for postMessage from OAuth callback
        return new Observable<void>((observer) => {
          let completed = false;

          const messageHandler = (event: MessageEvent) => {
            // Verify origin for security
            if (!event.origin.includes('supabase.co') && event.origin !== window.location.origin) {
              return;
            }

            // Check if this is our calendar connection message
            if (event.data?.type === 'GOOGLE_CALENDAR_CONNECTED') {
              console.log('✅ Received calendar connection confirmation via postMessage');
              completed = true;
              window.removeEventListener('message', messageHandler);
              clearInterval(pollInterval);
              observer.next();
              observer.complete();
            }
          };

          // Add message listener
          window.addEventListener('message', messageHandler);

          // Fallback: Poll for popup closure (in case postMessage fails)
          const pollInterval = setInterval(() => {
            if (popup.closed && !completed) {
              console.log('📭 Popup closed without postMessage, assuming success');
              clearInterval(pollInterval);
              window.removeEventListener('message', messageHandler);
              observer.next();
              observer.complete();
            }
          }, 500);

          // Timeout after 5 minutes
          setTimeout(
            () => {
              if (!completed) {
                clearInterval(pollInterval);
                window.removeEventListener('message', messageHandler);
                if (!popup.closed) {
                  popup.close();
                }
                observer.error(new Error('Authorization timeout'));
              }
            },
            5 * 60 * 1000,
          );
        });
      }),
    );
  }

  /**
   * Get calendar connection status
   */
  getConnectionStatus(): Observable<CalendarConnectionStatus> {
    return rxFrom(this.getAuthHeaders()).pipe(
      switchMap((headers) =>
        this.http.get<CalendarConnectionStatus>(`${this.OAUTH_FUNCTION_URL}?action=status`, {
          headers,
        }),
      ),
      catchError((error) => {
        console.error('Error getting connection status:', error);
        return throwError(() => new Error('Failed to get connection status'));
      }),
    );
  }

  /**
   * Disconnect Google Calendar
   */
  disconnectCalendar(): Observable<void> {
    return rxFrom(this.getAuthHeaders()).pipe(
      switchMap((headers) =>
        this.http.get<{ success: boolean }>(`${this.OAUTH_FUNCTION_URL}?action=disconnect`, {
          headers,
        }),
      ),
      map(() => undefined),
      catchError((error) => {
        console.error('Error disconnecting calendar:', error);
        return throwError(() => new Error('Failed to disconnect calendar'));
      }),
    );
  }

  /**
   * Refresh access token if expired
   */
  refreshToken(): Observable<void> {
    return rxFrom(this.getAuthHeaders()).pipe(
      switchMap((headers) =>
        this.http.get<{ success: boolean }>(`${this.OAUTH_FUNCTION_URL}?action=refresh-token`, {
          headers,
        }),
      ),
      map(() => undefined),
      catchError((error) => {
        console.error('Error refreshing token:', error);
        return throwError(() => new Error('Failed to refresh token'));
      }),
    );
  }

  /**
   * Sync a booking to Google Calendar
   */
  syncBookingToCalendar(
    bookingId: string,
    operation: 'create' | 'update' | 'delete' = 'create',
  ): Observable<SyncBookingResponse> {
    return rxFrom(this.getAuthHeaders()).pipe(
      switchMap((headers) =>
        this.http.post<SyncBookingResponse>(
          this.SYNC_FUNCTION_URL,
          {
            booking_id: bookingId,
            operation,
          },
          { headers },
        ),
      ),
      catchError((error) => {
        console.error('Error syncing booking to calendar:', error);
        return throwError(() => new Error('Failed to sync booking to calendar'));
      }),
    );
  }

  /**
   * ✅ NEW: Sync booking with user notification
   * Wraps syncBookingToCalendar with automatic success/error notifications
   */
  syncBookingWithNotification(
    bookingId: string,
    operation: 'create' | 'update' | 'delete' = 'create',
    notificationService?: {
      success: (title: string, message: string) => void;
      error: (title: string, message: string) => void;
    },
  ): Observable<SyncBookingResponse> {
    const operationLabels = {
      create: { action: 'creada', title: 'Reserva sincronizada' },
      update: { action: 'actualizada', title: 'Reserva actualizada' },
      delete: { action: 'eliminada', title: 'Reserva eliminada' },
    };

    const label = operationLabels[operation];

    return this.syncBookingToCalendar(bookingId, operation).pipe(
      map((response) => {
        // Show success notification if service provided
        if (notificationService && response.success) {
          const syncDetails = [];
          if (response.synced_to_locador) syncDetails.push('calendario del propietario');
          if (response.synced_to_locatario) syncDetails.push('tu calendario');

          const message =
            syncDetails.length > 0
              ? `Tu reserva fue ${label.action} en ${syncDetails.join(' y ')}`
              : `Tu reserva fue ${label.action} correctamente`;

          notificationService.success(`📅 ${label.title}`, message);
        }
        return response;
      }),
      catchError((error) => {
        // Show error notification if service provided
        if (notificationService) {
          notificationService.error(
            '⚠️ Error de sincronización',
            `No se pudo sincronizar tu reserva con Google Calendar. La reserva sigue activa.`,
          );
        }
        return throwError(() => error);
      }),
    );
  }

  /**
   * Check if user has Google Calendar connected
   */
  isCalendarConnected(): Observable<boolean> {
    return this.getConnectionStatus().pipe(map((status) => status.connected));
  }

  /**
   * ✅ NEW: Get car calendar availability
   * Queries Google Calendar for blocked dates in a specific date range
   */
  getCarCalendarAvailability(
    carId: string,
    from: string,
    to: string,
  ): Observable<CarCalendarAvailability> {
    const url = `${environment.supabaseUrl}/functions/v1/get-car-calendar-availability?car_id=${carId}&from=${from}&to=${to}`;

    return rxFrom(this.getAuthHeaders()).pipe(
      switchMap((headers) => this.http.get<CarCalendarAvailability>(url, { headers })),
      catchError((error) => {
        console.error('Error getting car calendar availability:', error);
        // Return fallback response on error
        return throwError(() => ({
          available: true,
          blocked_dates: [],
          events: [],
          google_calendar_checked: false,
        }));
      }),
    );
  }

  /**
   * ✅ NEW: Get calendar ID for a specific car
   * Returns the Google Calendar ID associated with this car
   */
  getCarCalendarId(carId: string): Observable<string | null> {
    return rxFrom(
      this.supabase
        .from('car_google_calendars')
        .select('google_calendar_id')
        .eq('car_id', carId)
        .single(),
    ).pipe(
      map((result) => result.data?.google_calendar_id || null),
      catchError(() => {
        return rxFrom(Promise.resolve(null));
      }),
    );
  }

  /**
   * ✅ NEW: Get all car calendars for current user
   * Returns list of cars with their associated Google Calendars
   */
  getUserCarCalendars(): Observable<
    Array<{
      car_id: string;
      google_calendar_id: string;
      calendar_name: string;
      sync_enabled: boolean;
      last_synced_at: string | null;
    }>
  > {
    return rxFrom(this.getAuthHeaders()).pipe(
      switchMap(() =>
        rxFrom(
          this.supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (!user) throw new Error('Not authenticated');

            // Get user's cars
            const { data: cars } = await this.supabase
              .from('cars')
              .select('id')
              .eq('owner_id', user.id);

            if (!cars || cars.length === 0) return [];

            // Get calendar info for each car
            const carIds = cars.map((c) => c.id);
            const { data: calendars } = await this.supabase
              .from('car_google_calendars')
              .select('*')
              .in('car_id', carIds);

            return calendars || [];
          }),
        ),
      ),
      catchError((error) => {
        console.error('Error getting user car calendars:', error);
        return rxFrom(Promise.resolve([]));
      }),
    );
  }
}

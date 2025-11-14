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

        // Poll for popup closure
        return new Observable<void>((observer) => {
          const pollInterval = setInterval(() => {
            if (popup.closed) {
              clearInterval(pollInterval);
              observer.next();
              observer.complete();
            }
          }, 500);

          // Timeout after 5 minutes
          setTimeout(
            () => {
              clearInterval(pollInterval);
              if (!popup.closed) {
                popup.close();
              }
              observer.error(new Error('Authorization timeout'));
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
  ): Observable<{
    available: boolean;
    blocked_dates: string[];
    events: Array<{
      date: string;
      event_id: string;
      title: string;
      description?: string;
    }>;
    google_calendar_checked: boolean;
  }> {
    const url = `${environment.supabaseUrl}/functions/v1/get-car-calendar-availability?car_id=${carId}&from=${from}&to=${to}`;

    return rxFrom(this.getAuthHeaders()).pipe(
      switchMap((headers) => this.http.get<any>(url, { headers })),
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
}

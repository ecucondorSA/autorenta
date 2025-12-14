
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {Component, inject, Input, signal,
  ChangeDetectionStrategy} from '@angular/core';
import { environment } from '../../../../environments/environment';
import { NotificationManagerService } from '../../../core/services/notification-manager.service';
import { SupabaseClientService } from '../../../core/services/supabase-client.service';

@Component({
  selector: 'app-make-calendar-public-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <button
      (click)="makePublic()"
      [disabled]="loading()"
      class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      @if (loading()) {
        <svg
          class="animate-spin -ml-1 mr-2 h-4 w-4"
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
        <span>Haciendo público...</span>
      } @else {
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
          />
        </svg>
        <span>{{ success() ? '✅ Ya es público' : 'Hacer calendario público' }}</span>
      }
    </button>

    @if (error()) {
      <p class="mt-2 text-sm text-red-600">{{ error() }}</p>
    }
  `,
})
export class MakeCalendarPublicButtonComponent {
  private readonly http = inject(HttpClient);
  private readonly supabase = inject(SupabaseClientService).getClient();
  private readonly notifications = inject(NotificationManagerService);

  @Input({ required: true }) carId!: string;

  readonly loading = signal(false);
  readonly success = signal(false);
  readonly error = signal<string | null>(null);

  async makePublic(): Promise<void> {
    if (!this.carId) {
      this.error.set('Car ID is required');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      // Get session token
      const {
        data: { session },
      } = await this.supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No active session');
      }

      // Call edge function
      const headers = new HttpHeaders({
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      });

      if (environment.supabaseAnonKey) {
        headers.set('apikey', environment.supabaseAnonKey);
      }

      const response = await this.http
        .post<{
          success: boolean;
          message: string;
          calendar_id: string;
        }>(
          `${environment.supabaseUrl}/functions/v1/make-calendar-public`,
          { car_id: this.carId },
          { headers },
        )
        .toPromise();

      if (response?.success) {
        this.success.set(true);
        this.notifications.success(
          'Calendario público',
          'El calendario ahora es público y puede mostrarse en la página del auto. Recarga la página para ver los cambios.',
        );

        // Reload page after 2 seconds
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (err: unknown) {
      console.error('Error making calendar public:', err);

      const errorMessage =
        (err as { error?: { error?: string } })?.error?.error ||
        (err as Error)?.message ||
        'Error desconocido';
      this.error.set(errorMessage);

      this.notifications.error('Error', `No se pudo hacer público el calendario: ${errorMessage}`);
    } finally {
      this.loading.set(false);
    }
  }
}

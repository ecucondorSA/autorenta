import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  PushNotificationSchema,
  ActionPerformed,
  Token,
} from '@capacitor/push-notifications';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { ToastService } from '@core/services/ui/toast.service';

@Injectable({
  providedIn: 'root',
})
export class MobileNotificationService {
  private readonly supabase = inject(SupabaseClientService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly logger = inject(LoggerService);

  private readonly isNative = Capacitor.isNativePlatform();
  readonly hasPermission = signal<boolean>(false);

  constructor() {
    if (this.isNative) {
      this.initListeners();
    }
  }

  /**
   * Initializes listeners for push notifications events
   */
  private initListeners() {
    // On registration success, sync token with backend
    PushNotifications.addListener('registration', (token: Token) => {
      this.logger.debug('[Push] Registration token received');
      this.syncToken(token.value);
    });

    // On registration error
    PushNotifications.addListener('registrationError', (error: unknown) => {
      this.logger.error('[Push] Registration error', error);
    });

    // Handle received notification while app is in foreground
    PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        this.logger.debug('[Push] Notification received in foreground', notification);

        // In foreground, we show a discrete internal toast instead of system alert
        this.toast.info(notification.title || 'Nueva notificación', notification.body || '');
        // Auto-navigate if there's a route in the notification data
        if (notification.data?.['route'] || notification.data?.['path']) {
          this.handleNavigation(notification.data);
        }
      },
    );

    // Handle tap on notification (from background/closed)
    PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (notification: ActionPerformed) => {
        this.logger.debug('[Push] Notification action performed', notification);
        this.handleNavigation(notification.notification.data);
      },
    );
  }

  /**
   * Request permissions and register for push notifications
   * Call this during onboarding or when relevant (e.g. after booking)
   */
  async requestPermissions() {
    if (!this.isNative) return;

    const result = await PushNotifications.requestPermissions();
    if (result.receive === 'granted') {
      this.hasPermission.set(true);
      await PushNotifications.register();
    } else {
      this.hasPermission.set(false);
    }
  }

  /**
   * Sync FCM token with Supabase Profile
   */
  private async syncToken(token: string) {
    try {
      const { error } = await this.supabase.rpc('sync_fcm_token', { p_token: token });
      if (error) throw error;
      this.logger.info('[Push] Token synced successfully');
    } catch (err) {
      this.logger.error('[Push] Failed to sync token', err);
    }
  }

  /**
   * Remote token from backend (on logout)
   */
  async removeToken(token: string) {
    if (!this.isNative) return;
    await this.supabase.rpc('remove_fcm_token', { p_token: token });
  }

  /**
   * Handle navigation based on notification payload
   * Payload format example: { route: '/bookings/ID', params: { id: '...' } }
   */
  private handleNavigation(data: Record<string, unknown>) {
    if (!data) return;

    const route = (data['route'] as string) || (data['path'] as string);
    if (route) {
      void this.router.navigateByUrl(route);
    }
  }
}

import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import {
  ActionPerformed,
  PushNotifications,
  PushNotificationSchema,
  Token,
} from '@capacitor/push-notifications';
import { Observable, Subject } from 'rxjs';
import { AuthService } from '@core/services/auth/auth.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

/**
 * Push notification message interface
 */
export interface PushMessage {
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}

@Injectable({
  providedIn: 'root',
})
export class PushNotificationService {
  private readonly logger = inject(LoggerService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly isNative = this.isBrowser && Capacitor.isNativePlatform();
  private readonly supabase = injectSupabase();
  private readonly authService = inject(AuthService);
  private readonly swPush = inject(SwPush);

  // Native push notification subjects
  private readonly nativeNotificationClicks$ = new Subject<ActionPerformed>();
  private readonly nativeMessages$ = new Subject<PushNotificationSchema>();

  // VAPID public key - should be stored in environment variables
  // Generar en: https://web-push-codelab.glitch.me/
  private readonly VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib37J8-gSpN1fPQ';

  /**
   * Verifica si push notifications están disponibles
   */
  get isEnabled(): boolean {
    if (this.isNative) {
      return true; // Always available on native
    }
    return this.swPush.isEnabled;
  }

  /**
   * Observable de clicks en notificaciones
   */
  get notificationClicks$(): Observable<ActionPerformed | { action: string; notification?: NotificationOptions }> {
    if (this.isNative) {
      return this.nativeNotificationClicks$.asObservable();
    }
    return this.swPush.notificationClicks;
  }

  /**
   * Observable de mensajes recibidos
   */
  get messages$(): Observable<PushNotificationSchema | object> {
    if (this.isNative) {
      return this.nativeMessages$.asObservable();
    }
    return this.swPush.messages;
  }

  /**
   * Initializes the push notification subscription process.
   * This should be called once when the application bootstraps.
   */
  public async initializePushNotifications(): Promise<void> {
    if (!this.isBrowser) {
      return;
    }

    // Wait for the user to be logged in
    const user = await this.authService.getCurrentUser();
    if (!user) {
      return;
    }

    // Use native push on mobile platforms
    if (this.isNative) {
      await this.initializeNativePush();
      return;
    }

    // Web push fallback
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    try {
      const subscription = await this.subscribeUserToPush();
      if (subscription) {
        await this.saveTokenToDatabase(subscription.endpoint, 'web');
      }
    } catch {
      /* Silenced */
    }
  }

  /**
   * Initialize native push notifications using Capacitor
   */
  private async initializeNativePush(): Promise<void> {
    try {
      // Check permissions
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('Push notification permission not granted');
        return;
      }

      // Register for push notifications
      await PushNotifications.register();

      // Listen for registration success
      PushNotifications.addListener('registration', async (token: Token) => {
        this.logger.debug('Push registration success, token:', token.value);
        // Detect platform: iOS uses APNS, Android uses FCM
        const platform = Capacitor.getPlatform() === 'ios' ? 'apns' : 'fcm';
        await this.saveTokenToDatabase(token.value, platform);
      });

      // Listen for registration errors
      PushNotifications.addListener('registrationError', (error: { error: string }) => {
        console.error('Push registration error:', error.error);
      });

      // Listen for push notifications received
      PushNotifications.addListener(
        'pushNotificationReceived',
        (notification: PushNotificationSchema) => {
          this.logger.debug('Push notification received:', notification);
          this.nativeMessages$.next(notification);
        },
      );

      // Listen for notification action performed (user tapped notification)
      PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (action: ActionPerformed) => {
          this.logger.debug('Push notification action performed:', action);
          this.nativeNotificationClicks$.next(action);
        },
      );
    } catch (error) {
      console.error('Error initializing native push:', error);
    }
  }

  /**
   * Subscribes the user to push notifications (web only).
   * @returns The PushSubscription object or null if permission is denied.
   */
  private async subscribeUserToPush(): Promise<PushSubscription | null> {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return null;
    }

    const serviceWorkerRegistration = await navigator.serviceWorker.ready;
    const existingSubscription = await serviceWorkerRegistration.pushManager.getSubscription();

    if (existingSubscription) {
      return existingSubscription;
    }

    const subscription = await serviceWorkerRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: this.urlBase64ToUint8Array(this.VAPID_PUBLIC_KEY),
    });

    return subscription;
  }

  /**
   * Saves the push subscription token to the database.
   * @param token The token string (endpoint for web, FCM token for native)
   * @param platform The platform type ('web' | 'fcm' | 'apns')
   */
  private async saveTokenToDatabase(
    token: string,
    platform: 'web' | 'fcm' | 'apns',
  ): Promise<void> {
    // Ensure we have a user
    const user = await this.authService.getCurrentUser();
    if (!user) return;

    // Get device info for native platforms
    let deviceInfo: Record<string, unknown> = {};
    if (this.isNative) {
      try {
        const info = await Device.getInfo();
        deviceInfo = {
          model: info.model,
          platform: info.platform,
          os_version: info.osVersion,
          manufacturer: info.manufacturer,
          is_virtual: info.isVirtual,
        };
      } catch {
        // Silently fail if device info not available
      }
    } else {
      // Web browser info
      deviceInfo = {
        platform: 'web',
        user_agent: navigator.userAgent,
      };
    }

    const { error } = await this.supabase.from('push_tokens').upsert(
      {
        user_id: user.id,
        token: token,
        platform: platform,
        is_active: true,
        device_info: deviceInfo,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'token' },
    );

    if (error) {
      this.logger.error('Error saving push token:', error);
      throw error;
    }

    this.logger.info(`Push token saved successfully (${platform})`);
  }

  /**
   * Deactivate push tokens on logout (mark as inactive instead of deleting)
   */
  public async removeToken(): Promise<void> {
    const user = await this.authService.getCurrentUser();
    if (!user) return;

    // Mark all tokens for this user as inactive (don't delete for tracking)
    const { error } = await this.supabase
      .from('push_tokens')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);

    if (error) {
      this.logger.error('Error deactivating push tokens:', error);
    } else {
      this.logger.info('Push tokens deactivated on logout');
    }

    // Unregister from native push if on mobile
    if (this.isNative) {
      try {
        await PushNotifications.removeAllListeners();
      } catch {
        // Silently fail
      }
    }
  }

  /**
   * Helper function to convert VAPID key.
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray as Uint8Array<ArrayBuffer>;
  }
}

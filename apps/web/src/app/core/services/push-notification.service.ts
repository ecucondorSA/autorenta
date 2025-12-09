import { isPlatformBrowser } from '@angular/common';
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { Subject } from 'rxjs';
import { SupabaseClientService } from './supabase-client.service';
import { AuthService } from './auth.service';

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
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly isNative = this.isBrowser && Capacitor.isNativePlatform();
  private readonly supabase = inject(SupabaseClientService).getClient();
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
  get notificationClicks$() {
    if (this.isNative) {
      return this.nativeNotificationClicks$.asObservable();
    }
    return this.swPush.notificationClicks;
  }

  /**
   * Observable de mensajes recibidos
   */
  get messages$() {
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
        console.log('Push registration success, token:', token.value);
        await this.saveTokenToDatabase(token.value, 'fcm');
      });

      // Listen for registration errors
      PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error:', error.error);
      });

      // Listen for push notifications received
      PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log('Push notification received:', notification);
        this.nativeMessages$.next(notification);
      });

      // Listen for notification action performed (user tapped notification)
      PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        console.log('Push notification action performed:', action);
        this.nativeNotificationClicks$.next(action);
      });
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
   * @param platform The platform type ('web' | 'fcm')
   */
  private async saveTokenToDatabase(token: string, platform: 'web' | 'fcm'): Promise<void> {
    // Ensure we have a user
    const user = await this.authService.getCurrentUser();
    if (!user) return;

    const { error } = await this.supabase.from('push_tokens').upsert(
      {
        user_id: user.id,
        token: token,
        platform: platform,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'token' },
    );

    if (error) {
      console.error('Error saving push token:', error);
      throw error;
    }
  }

  /**
   * Remove push token from database (call on logout)
   */
  public async removeToken(): Promise<void> {
    const user = await this.authService.getCurrentUser();
    if (!user) return;

    // Get current token
    if (this.isNative) {
      // For native, we need to get the token from storage or registration
      // This is handled by removing all tokens for the user on logout
      await this.supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', user.id);
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

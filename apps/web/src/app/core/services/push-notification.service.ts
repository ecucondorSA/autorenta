import { Injectable, inject } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { SupabaseClientService } from './supabase-client.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class PushNotificationService {
  private readonly supabase = inject(SupabaseClientService).getClient();
  private readonly authService = inject(AuthService);
  private readonly swPush = inject(SwPush);

  // VAPID public key - should be stored in environment variables
  // Generar en: https://web-push-codelab.glitch.me/
  private readonly VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib37J8-gSpN1fPQ';

  /**
   * Verifica si push notifications están disponibles
   */
  get isEnabled(): boolean {
    return this.swPush.isEnabled;
  }

  /**
   * Observable de clicks en notificaciones
   */
  get notificationClicks$() {
    return this.swPush.notificationClicks;
  }

  /**
   * Observable de mensajes recibidos
   */
  get messages$() {
    return this.swPush.messages;
  }

  /**
   * Initializes the push notification subscription process.
   * This should be called once when the application bootstraps.
   */
  public async initializePushNotifications(): Promise<void> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    // Wait for the user to be logged in
    const user = await this.authService.getCurrentUser();
    if (!user) {
      return;
    }

    try {
      const subscription = await this.subscribeUserToPush();
      if (subscription) {
        await this.saveTokenToDatabase(subscription);
      }
    } catch {
      /* Silenced */
    }
  }

  /**
   * Subscribes the user to push notifications.
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
   * @param subscription The PushSubscription object.
   */
  private async saveTokenToDatabase(subscription: PushSubscription): Promise<void> {
    const token = subscription.toJSON();

    // Ensure we have a user
    const user = await this.authService.getCurrentUser();
    if (!user) return;

    const { error } = await this.supabase.from('push_tokens').upsert(
      {
        user_id: user.id,
        token: token.endpoint, // The endpoint is a unique identifier for the device
      },
      { onConflict: 'token' }, // If the token already exists, do nothing
    );

    if (error) {
      throw error;
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

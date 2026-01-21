import { LoggerService } from '@core/services/infrastructure/logger.service';
import { Injectable, signal, inject, OnDestroy, effect } from '@angular/core';
import type { RealtimeChannel, RealtimePostgresInsertPayload } from '@supabase/supabase-js';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { AuthService } from '@core/services/auth/auth.service';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
  actionText?: string;
  metadata?: Record<string, unknown>;
}

interface NotificationRow {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
  cta_link?: string | null;
  metadata?: Record<string, unknown> | null;
}

type NotificationListItem = NotificationItem & { dbType: string };

export type UserNotificationSettings = {
  browserPushEnabled: boolean;
  browserPushPermission: NotificationPermission;
  bookingUpdates: boolean;
  paymentNotifications: boolean;
  messageNotifications: boolean;
  promotionsAndOffers: boolean;
  systemUpdates: boolean;
  inAppNotifications: boolean;
  emailNotifications: boolean;
  soundEnabled: boolean;
};

@Injectable({
  providedIn: 'root',
})
export class NotificationsService implements OnDestroy {
  private readonly logger = inject(LoggerService);
  private readonly supabase = injectSupabase();
  private readonly authService = inject(AuthService);

  // Estado reactivo
  readonly notifications = signal<NotificationItem[]>([]);
  readonly unreadCount = signal(0);
  readonly connectionStatus = signal<'disconnected' | 'connecting' | 'connected' | 'error'>(
    'disconnected',
  );

  // Referencia al channel de Realtime para poder hacer cleanup
  private realtimeChannel: RealtimeChannel | null = null;
  private isSubscribed = false;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // Callbacks para notificar cambios a los componentes suscritos
  private onChangeCallbacks: Set<() => void> = new Set();

  constructor() {
    // Efecto reactivo: suscribirse cuando el usuario se autentica
    effect(() => {
      const isAuthenticated = this.authService.isAuthenticated();

      if (isAuthenticated) {
        // Usuario autenticado: cargar notificaciones y suscribirse
        void this.initializeNotifications();
      } else {
        // Usuario no autenticado: limpiar suscripción
        this.unsubscribe();
        this.notifications.set([]);
        this.unreadCount.set(0);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.reconnectTimeoutId !== null) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    this.unsubscribe();
  }

  /**
   * Inicializa notificaciones cuando el usuario está autenticado
   */
  private async initializeNotifications(): Promise<void> {
    // Cargar notificaciones existentes
    await this.loadNotificationsInternal();

    // Suscribirse a cambios en tiempo real
    await this.subscribeToRealtime();
  }

  /**
   * Método público para refrescar notificaciones manualmente
   */
  async refresh(): Promise<void> {
    await this.loadNotifications();
  }

  /**
   * Método público para cargar notificaciones
   */
  async loadNotifications(): Promise<void> {
    await this.loadNotificationsInternal();
  }

  async getSettings(): Promise<UserNotificationSettings | null> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await this.supabase
        .from('notification_settings')
        .select('preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return (data?.preferences as UserNotificationSettings) || null;
    } catch (error) {
      this.logger.warn('Failed to load notification settings', 'NotificationsService', error);
      return null;
    }
  }

  async saveSettings(preferences: UserNotificationSettings): Promise<void> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) return;

    const { error } = await this.supabase.from('notification_settings').upsert({
      user_id: user.id,
      preferences,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      this.logger.error('Failed to save notification settings', 'NotificationsService', error);
      throw error;
    }
  }

  private async loadNotificationsInternal() {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await this.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
        .returns<NotificationRow[]>();

      if (error) throw error as Error;

      const notifications: NotificationItem[] = (data || []).map((notification) =>
        this.mapNotification(notification),
      );

      this.notifications.set(notifications);
      this.updateUnreadCount();
    } catch (_error) {
      console.error('Error loading notifications:', _error);
    }
  }

  /**
   * Suscribirse a cambios en tiempo real de notificaciones
   * Maneja reconexión automática y estado de conexión
   */
  private async subscribeToRealtime(): Promise<void> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        console.warn('[NotificationsService] No user found, skipping Realtime subscription');
        this.connectionStatus.set('disconnected');
        return;
      }

      // Limpiar suscripción anterior si existe
      if (this.realtimeChannel) {
        this.unsubscribe();
      }

      this.connectionStatus.set('connecting');
      this.logger.debug(
        '[NotificationsService] Subscribing to Realtime notifications for user:',
        user.id,
      );

      // Crear nuevo channel - suscribirse a todos los eventos (INSERT, UPDATE, DELETE)
      this.realtimeChannel = this.supabase
        .channel(`notifications:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload: RealtimePostgresInsertPayload<NotificationRow>) => {
            this.logger.debug(
              '[NotificationsService] New notification received via Realtime:',
              payload,
            );
            this.addNotification(payload.new);
            this.onChangeCallbacks.forEach((cb) => cb());
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            this.logger.debug('[NotificationsService] Notification updated via Realtime:', payload);
            this.handleNotificationUpdate(payload.new as NotificationRow);
            this.onChangeCallbacks.forEach((cb) => cb());
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            this.logger.debug('[NotificationsService] Notification deleted via Realtime:', payload);
            this.handleNotificationDelete((payload.old as { id: string }).id);
            this.onChangeCallbacks.forEach((cb) => cb());
          },
        )
        .subscribe((status) => {
          this.logger.debug('[NotificationsService] Realtime subscription status:', status);

          if (status === 'SUBSCRIBED') {
            this.connectionStatus.set('connected');
            this.isSubscribed = true;
            this.logger.debug(
              '[NotificationsService] ✅ Successfully subscribed to Realtime notifications',
            );
          } else if (status === 'CHANNEL_ERROR') {
            this.connectionStatus.set('error');
            this.isSubscribed = false;
            console.error('[NotificationsService] ❌ Realtime channel error');

            // Intentar reconectar después de 5 segundos
            if (this.reconnectTimeoutId !== null) {
              clearTimeout(this.reconnectTimeoutId);
            }
            this.reconnectTimeoutId = setTimeout(() => {
              this.logger.debug('[NotificationsService] Attempting to reconnect...');
              void this.subscribeToRealtime();
            }, 5000);
          } else if (status === 'TIMED_OUT') {
            this.connectionStatus.set('error');
            this.isSubscribed = false;
            console.warn('[NotificationsService] ⚠️ Realtime subscription timed out');

            // Intentar reconectar después de 5 segundos
            if (this.reconnectTimeoutId !== null) {
              clearTimeout(this.reconnectTimeoutId);
            }
            this.reconnectTimeoutId = setTimeout(() => {
              this.logger.debug('[NotificationsService] Attempting to reconnect after timeout...');
              void this.subscribeToRealtime();
            }, 5000);
          } else if (status === 'CLOSED') {
            this.connectionStatus.set('disconnected');
            this.isSubscribed = false;
            this.logger.debug('[NotificationsService] Realtime channel closed');
          }
        });
    } catch (error) {
      console.error('[NotificationsService] Error subscribing to Realtime:', error);
      this.connectionStatus.set('error');
      this.isSubscribed = false;

      // Intentar reconectar después de 5 segundos
      if (this.reconnectTimeoutId !== null) {
        clearTimeout(this.reconnectTimeoutId);
      }
      this.reconnectTimeoutId = setTimeout(() => {
        this.logger.debug('[NotificationsService] Attempting to reconnect after error...');
        void this.subscribeToRealtime();
      }, 5000);
    }
  }

  /**
   * Desuscribirse del channel de Realtime
   */
  private unsubscribe(): void {
    if (this.realtimeChannel) {
      this.logger.debug('[NotificationsService] Unsubscribing from Realtime notifications');
      this.supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
      this.isSubscribed = false;
      this.connectionStatus.set('disconnected');
    }
  }

  /**
   * Reconectar manualmente a Realtime
   */
  async reconnect(): Promise<void> {
    this.logger.debug('[NotificationsService] Manual reconnect requested');
    this.unsubscribe();
    await this.subscribeToRealtime();
  }

  /**
   * Suscribirse a cambios de notificaciones (para componentes que necesitan recargar)
   * @returns función para desuscribirse
   */
  onChange(callback: () => void): () => void {
    this.onChangeCallbacks.add(callback);
    return () => this.onChangeCallbacks.delete(callback);
  }

  /**
   * Manejar actualizaciones de notificaciones (ej: marcada como leída)
   */
  private handleNotificationUpdate(updated: NotificationRow): void {
    const current = this.notifications();
    const updatedList = current.map((n) =>
      n.id === updated.id ? this.mapNotification(updated) : n,
    );
    this.notifications.set(updatedList);
    this.updateUnreadCount();
  }

  /**
   * Manejar eliminaciones de notificaciones
   */
  private handleNotificationDelete(notificationId: string): void {
    const current = this.notifications();
    const updatedList = current.filter((n) => n.id !== notificationId);
    this.notifications.set(updatedList);
    this.updateUnreadCount();
  }

  private addNotification(notificationData: NotificationRow) {
    const notification = this.mapNotification(notificationData, false);

    const current = this.notifications();
    this.notifications.set([notification, ...current]);
    this.updateUnreadCount();

    // Mostrar notificación push si está disponible
    this.showBrowserNotification(notification);
  }

  private mapNotification(
    notification: NotificationRow,
    preserveReadState: boolean = true,
  ): NotificationItem {
    const dbType = notification.type;
    const metadata = notification.metadata ?? undefined;
    let actionUrl = notification.cta_link ?? undefined;

    if (dbType === 'new_booking_for_owner') {
      const bookingId =
        (metadata && (metadata['booking_id'] as string)) ||
        (metadata && (metadata['bookingId'] as string));
      actionUrl = bookingId
        ? `/bookings/pending-approval?bookingId=${bookingId}`
        : '/bookings/pending-approval';
    } else if (dbType === 'pending_requests_reminder') {
      actionUrl = '/bookings/pending-approval';
    } else if (dbType === 'booking_cancelled_for_owner') {
      actionUrl = '/bookings/owner';
    }

    return {
      id: notification.id,
      title: notification.title,
      message: notification.body,
      type: this.mapNotificationType(notification.type),
      read: preserveReadState ? (notification.is_read ?? false) : false,
      createdAt: new Date(notification.created_at),
      actionUrl,
      actionText: 'Ver detalles',
      metadata,
    };
  }

  private mapNotificationWithDbType(notification: NotificationRow): NotificationListItem {
    return {
      ...this.mapNotification(notification),
      dbType: notification.type,
    };
  }

  // Map database notification types to UI types
  private mapNotificationType(dbType: string): 'info' | 'success' | 'warning' | 'error' {
    switch (dbType) {
      // Success types
      case 'new_booking_for_owner':
      case 'payment_successful':
      case 'payout_successful':
      case 'booking_ended_review':
      case 'welcome':
      case 'verification_approved':
      case 'car_views_milestone':
        return 'success';

      // Warning types
      case 'booking_cancelled_for_owner':
      case 'booking_cancelled_for_renter':
      case 'inspection_reminder':
      case 'document_expiry_license':
      case 'owner_inactive_reminder':
      case 'verification_rejected':
      case 'pending_requests_reminder':
        return 'warning';

      // Info types
      case 'new_chat_message':
      case 'generic_announcement':
      case 'booking_reminder_24h':
      case 'booking_reminder_2h':
      case 'optimization_tip':
      case 'monthly_report':
      case 'mp_onboarding_required':
      case 'nearby_cars':
      case 'car_recommendation':
      case 'renter_tip':
      case 'price_drop_alert':
      case 'favorite_car_available':
      default:
        return 'info';
    }
  }

  private updateUnreadCount() {
    const unread = this.notifications().filter((n) => !n.read).length;
    this.unreadCount.set(unread);
  }

  async markAsRead(notificationId: string) {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error as Error;

      // Actualizar estado local
      const current = this.notifications();
      const updated = current.map((n) => (n.id === notificationId ? { ...n, read: true } : n));
      this.notifications.set(updated);
      this.updateUnreadCount();
    } catch (_error) {
      console.error('Error marking notification as read:', _error);
    }
  }

  async markAllAsRead() {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) return;

      const { error } = await this.supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error as Error;

      // Actualizar estado local
      const current = this.notifications();
      const updated = current.map((n) => ({ ...n, read: true }));
      this.notifications.set(updated);
      this.unreadCount.set(0);
    } catch (_error) {
      console.error('Error marking all notifications as read:', _error);
    }
  }

  // Notificaciones push del navegador
  private async showBrowserNotification(notification: NotificationItem) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/icon-192x192.png',
        tag: notification.id,
      });

      browserNotification.onclick = () => {
        if (notification.actionUrl) {
          window.location.href = notification.actionUrl;
        }
        browserNotification.close();
      };

      // Auto-close después de 5 segundos
      setTimeout(() => browserNotification.close(), 5000);
    }
  }

  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  // Métodos para crear notificaciones (desde backend)
  async createNotification(
    userId: string,
    notification: Omit<NotificationItem, 'id' | 'read' | 'createdAt'>,
    dbType: string,
  ) {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: notification.title,
          body: notification.message,
          type: dbType,
          is_read: false,
          cta_link: notification.actionUrl || null,
          metadata: notification.metadata || {},
        })
        .select('*')
        .single();

      if (error) throw error as Error;
      if (data) {
        this.addNotification(data as NotificationRow);
      }
      return data as NotificationRow;
    } catch (_error) {
      console.error('Error creating notification:', _error);
      throw _error as Error;
    }
  }

  // Notificaciones predefinidas
  async notifyNewBookingForOwner(bookingId: string, carTitle: string, renterName: string) {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) return;

    return this.createNotification(
      user.id,
      {
        title: 'Nueva reserva recibida',
        message: `${renterName} solicitó reservar tu ${carTitle}`,
        type: 'success',
        actionUrl: `/bookings/pending-approval?bookingId=${bookingId}`,
        metadata: { bookingId, renterName, carTitle },
      },
      'new_booking_for_owner',
    );
  }

  async notifyBookingCreated(bookingId: string, carTitle: string) {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) return;

    return this.createNotification(
      user.id,
      {
        title: 'Reserva creada',
        message: `Tu solicitud de reserva para ${carTitle} ha sido enviada`,
        type: 'success',
        actionUrl: `/bookings/${bookingId}`,
        metadata: { bookingId, carTitle },
      },
      'booking_created',
    );
  }

  async notifyBookingCancelledForOwner(bookingId: string, carTitle: string, renterName: string) {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) return;

    return this.createNotification(
      user.id,
      {
        title: 'Reserva cancelada',
        message: `${renterName} canceló la reserva de tu ${carTitle}`,
        type: 'warning',
        actionUrl: `/bookings/${bookingId}`,
        metadata: { bookingId, renterName, carTitle },
      },
      'booking_cancelled_for_owner',
    );
  }

  async notifyBookingCancelledForRenter(bookingId: string, carTitle: string, ownerName: string) {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) return;

    return this.createNotification(
      user.id,
      {
        title: 'Reserva cancelada',
        message: `El anfitrión ${ownerName} canceló tu reserva para ${carTitle}`,
        type: 'warning',
        actionUrl: `/bookings/${bookingId}`,
        metadata: { bookingId, ownerName, carTitle },
      },
      'booking_cancelled_for_renter',
    );
  }

  async notifyPaymentSuccessful(amount: number, currency: string = 'USD', bookingId?: string) {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) return;

    return this.createNotification(
      user.id,
      {
        title: 'Pago exitoso',
        message: `Tu pago de ${amount.toLocaleString()} ${currency} fue procesado correctamente`,
        type: 'success',
        actionUrl: bookingId ? `/bookings/${bookingId}` : '/wallet',
        metadata: { amount, currency, bookingId },
      },
      'payment_successful',
    );
  }

  async notifyPayoutSuccessful(amount: number, currency: string = 'USD') {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) return;

    return this.createNotification(
      user.id,
      {
        title: 'Pago recibido',
        message: `Se acreditaron ${amount.toLocaleString()} ${currency} en tu wallet`,
        type: 'success',
        actionUrl: '/wallet',
        metadata: { amount, currency },
      },
      'payout_successful',
    );
  }

  async notifyInspectionReminder(
    bookingId: string,
    carTitle: string,
    inspectionType: 'pickup' | 'return',
  ) {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) return;

    const message =
      inspectionType === 'pickup'
        ? `Recuerda realizar la inspección de recogida para ${carTitle}`
        : `Recuerda realizar la inspección de devolución para ${carTitle}`;

    return this.createNotification(
      user.id,
      {
        title: 'Recordatorio de inspección',
        message,
        type: 'warning',
        actionUrl: `/bookings/${bookingId}`,
        metadata: { bookingId, carTitle, inspectionType },
      },
      'inspection_reminder',
    );
  }

  async notifyGenericAnnouncement(title: string, message: string, actionUrl?: string) {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) return;

    return this.createNotification(
      user.id,
      {
        title,
        message,
        type: 'info',
        actionUrl,
        metadata: {},
      },
      'generic_announcement',
    );
  }

  // Additional methods for notifications page
  async loadAllNotifications(limit?: number, offset?: number) {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) return [];

      let query = this.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (limit) query = query.limit(limit);
      if (offset) query = query.range(offset, offset + (limit || 50) - 1);

      const { data, error } = await query.returns<NotificationRow[]>();

      if (error) throw error as Error;

      return (data || []).map((notification) => this.mapNotificationWithDbType(notification));
    } catch (_error) {
      console.error('Error loading all notifications:', _error);
      return [];
    }
  }

  async filterNotificationsByType(dbType?: string) {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) return [];

      let query = this.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (dbType && dbType !== 'all') {
        query = query.eq('type', dbType);
      }

      const { data, error } = await query.returns<NotificationRow[]>();

      if (error) throw error as Error;

      return (data || []).map((notification) => this.mapNotificationWithDbType(notification));
    } catch (_error) {
      console.error('Error filtering notifications:', _error);
      return [];
    }
  }

  async deleteNotification(notificationId: string) {
    try {
      const { error } = await this.supabase.from('notifications').delete().eq('id', notificationId);

      if (error) throw error as Error;

      // Update local state
      const current = this.notifications();
      const updated = current.filter((n) => n.id !== notificationId);
      this.notifications.set(updated);
      this.updateUnreadCount();
    } catch (_error) {
      console.error('Error deleting notification:', _error);
      throw _error as Error;
    }
  }

  async deleteAllRead() {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) return;

      const { error } = await this.supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('is_read', true);

      if (error) throw error as Error;

      // Update local state
      const current = this.notifications();
      const updated = current.filter((n) => !n.read);
      this.notifications.set(updated);
    } catch (_error) {
      console.error('Error deleting read notifications:', _error);
      throw _error as Error;
    }
  }
}

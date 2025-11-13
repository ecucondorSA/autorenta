import { Injectable, signal, inject } from '@angular/core';
import { injectSupabase } from './supabase-client.service';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
  actionText?: string;
  metadata?: Record<string, any>;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationsService {
  private readonly supabase = injectSupabase();

  // Estado reactivo
  readonly notifications = signal<NotificationItem[]>([]);
  readonly unreadCount = signal(0);

  constructor() {
    this.loadNotificationsInternal();
    void this.subscribeToRealtime();
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
        .limit(50);

      if (error) throw error as Error;

      const notifications: NotificationItem[] = (data || []).map((notification: unknown) => ({
        id: (notification as any).id,
        title: (notification as any).title,
        message: (notification as any).body, // DB column is 'body'
        type: this.mapNotificationType((notification as any).type),
        read: (notification as any).is_read || false, // DB column is 'is_read'
        createdAt: new Date((notification as any).created_at),
        actionUrl: (notification as any).cta_link, // DB column is 'cta_link'
        actionText: 'Ver detalles', // Default action text
        metadata: (notification as any).metadata,
      }));

      this.notifications.set(notifications);
      this.updateUnreadCount();
    } catch (_error) {
      console.error('Error loading notifications:', _error);
    }
  }

  private async subscribeToRealtime() {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) return;

    const channel = this.supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: unknown) => {
          this.addNotification((payload as any).new as any);
        },
      )
      .subscribe();
  }

  private addNotification(notificationData: unknown) {
    const notification: NotificationItem = {
      id: (notificationData as any).id,
      title: (notificationData as any).title,
      message: (notificationData as any).body, // DB column is 'body'
      type: this.mapNotificationType((notificationData as any).type),
      read: false,
      createdAt: new Date((notificationData as any).created_at),
      actionUrl: (notificationData as any).cta_link, // DB column is 'cta_link'
      actionText: 'Ver detalles', // Default action text
      metadata: (notificationData as any).metadata,
    };

    const current = this.notifications();
    this.notifications.set([notification, ...current]);
    this.updateUnreadCount();

    // Mostrar notificación push si está disponible
    this.showBrowserNotification(notification);
  }

  // Map database notification types to UI types
  private mapNotificationType(dbType: string): 'info' | 'success' | 'warning' | 'error' {
    switch (dbType) {
      case 'new_booking_for_owner':
      case 'payment_successful':
      case 'payout_successful':
        return 'success';
      case 'booking_cancelled_for_owner':
      case 'booking_cancelled_for_renter':
      case 'inspection_reminder':
        return 'warning';
      case 'new_chat_message':
      case 'generic_announcement':
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
      const browserNotification = new Notification((notification as any).title, {
        body: (notification as any).message,
        icon: '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/icon-192x192.png',
        tag: (notification as any).id, // Evita duplicados
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
          title: (notification as any).title,
          body: (notification as any).message, // DB column is 'body'
          type: dbType, // Use the database notification type enum
          cta_link: notification.actionUrl, // DB column is 'cta_link'
          metadata: (notification as any).metadata,
        })
        .select()
        .single();

      if (error) throw error as Error;
      return data;
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
        actionUrl: `/bookings/${bookingId}`,
        metadata: { bookingId, renterName, carTitle },
      },
      'new_booking_for_owner',
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

  async notifyPaymentSuccessful(amount: number, currency: string = 'ARS', bookingId?: string) {
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

  async notifyPayoutSuccessful(amount: number, currency: string = 'ARS') {
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

      const { data, error } = await query;

      if (error) throw error as Error;

      return (data || []).map((notification: unknown) => ({
        id: (notification as any).id,
        title: (notification as any).title,
        message: (notification as any).body,
        type: this.mapNotificationType((notification as any).type),
        read: (notification as any).is_read || false,
        createdAt: new Date((notification as any).created_at),
        actionUrl: (notification as any).cta_link,
        actionText: 'Ver detalles',
        metadata: (notification as any).metadata,
        dbType: (notification as any).type, // Keep original DB type for filtering
      }));
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

      const { data, error } = await query;

      if (error) throw error as Error;

      return (data || []).map((notification: unknown) => ({
        id: (notification as any).id,
        title: (notification as any).title,
        message: (notification as any).body,
        type: this.mapNotificationType((notification as any).type),
        read: (notification as any).is_read || false,
        createdAt: new Date((notification as any).created_at),
        actionUrl: (notification as any).cta_link,
        actionText: 'Ver detalles',
        metadata: (notification as any).metadata,
        dbType: (notification as any).type,
      }));
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

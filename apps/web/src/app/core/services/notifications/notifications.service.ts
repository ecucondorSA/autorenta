import { Injectable, signal, inject } from '@angular/core';
import { injectSupabase } from '../supabase-client.service';

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
    this.loadNotifications();
    void this.subscribeToRealtime();
  }

  private async loadNotifications() {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await this.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const notifications: NotificationItem[] = (data || []).map(notification => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type || 'info',
        read: notification.read || false,
        createdAt: new Date(notification.created_at),
        actionUrl: notification.action_url,
        actionText: notification.action_text,
        metadata: notification.metadata,
      }));

      this.notifications.set(notifications);
      this.updateUnreadCount();
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  private async subscribeToRealtime() {
    const { data: { user } } = await this.supabase.auth.getUser();
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
        (payload) => {
          this.addNotification(payload.new as any);
        }
      )
      .subscribe();
  }

  private addNotification(notificationData: any) {
    const notification: NotificationItem = {
      id: notificationData.id,
      title: notificationData.title,
      message: notificationData.message,
      type: notificationData.type || 'info',
      read: false,
      createdAt: new Date(notificationData.created_at),
      actionUrl: notificationData.action_url,
      actionText: notificationData.action_text,
      metadata: notificationData.metadata,
    };

    const current = this.notifications();
    this.notifications.set([notification, ...current]);
    this.updateUnreadCount();

    // Mostrar notificación push si está disponible
    this.showBrowserNotification(notification);
  }

  private updateUnreadCount() {
    const unread = this.notifications().filter(n => !n.read).length;
    this.unreadCount.set(unread);
  }

  async markAsRead(notificationId: string) {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      // Actualizar estado local
      const current = this.notifications();
      const updated = current.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      );
      this.notifications.set(updated);
      this.updateUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async markAllAsRead() {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return;

      const { error } = await this.supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      // Actualizar estado local
      const current = this.notifications();
      const updated = current.map(n => ({ ...n, read: true }));
      this.notifications.set(updated);
      this.unreadCount.set(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  // Notificaciones push del navegador
  private async showBrowserNotification(notification: NotificationItem) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/icon-192x192.png',
        tag: notification.id, // Evita duplicados
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
  async createNotification(userId: string, notification: Omit<NotificationItem, 'id' | 'read' | 'createdAt'>) {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          action_url: notification.actionUrl,
          action_text: notification.actionText,
          metadata: notification.metadata,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Notificaciones predefinidas
  async notifyBookingCreated(bookingId: string, carTitle: string) {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return;

    return this.createNotification(user.id, {
      title: '¡Reserva creada!',
      message: `Tu reserva para ${carTitle} ha sido solicitada exitosamente.`,
      type: 'success',
      actionUrl: `/bookings/${bookingId}`,
      actionText: 'Ver reserva',
      metadata: { bookingId, type: 'booking_created' },
    });
  }

  async notifyBookingApproved(bookingId: string, carTitle: string) {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return;

    return this.createNotification(user.id, {
      title: 'Reserva aprobada',
      message: `El anfitrión aprobó tu reserva para ${carTitle}.`,
      type: 'success',
      actionUrl: `/bookings/${bookingId}`,
      actionText: 'Ver reserva',
      metadata: { bookingId, type: 'booking_approved' },
    });
  }

  async notifyBookingRejected(bookingId: string, carTitle: string) {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return;

    return this.createNotification(user.id, {
      title: 'Reserva rechazada',
      message: `Lo sentimos, tu reserva para ${carTitle} no pudo ser aprobada.`,
      type: 'warning',
      actionUrl: `/bookings/${bookingId}`,
      actionText: 'Ver detalles',
      metadata: { bookingId, type: 'booking_rejected' },
    });
  }

  async notifyPaymentReceived(amount: number, currency: string = 'ARS') {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return;

    return this.createNotification(user.id, {
      title: 'Pago recibido',
      message: `Se acreditaron ${amount.toLocaleString()} ${currency} en tu wallet.`,
      type: 'success',
      actionUrl: '/wallet',
      actionText: 'Ver wallet',
      metadata: { amount, currency, type: 'payment_received' },
    });
  }
}

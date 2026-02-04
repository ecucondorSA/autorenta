import { inject, Injectable, signal, computed } from '@angular/core';
import { AuthService } from '@core/services/auth/auth.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { PushNotificationService } from '@core/services/infrastructure/push-notification.service';

/**
 * Notification category enum
 */
export type NotificationCategory =
  | 'booking'
  | 'payment'
  | 'message'
  | 'review'
  | 'promotion'
  | 'system'
  | 'reminder';

/**
 * Notification channel enum
 */
export type NotificationChannel = 'push' | 'email' | 'sms' | 'in_app';

/**
 * User notification preferences
 */
export interface NotificationPreferences {
  user_id: string;
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  in_app_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  timezone: string;
  digest_mode: 'instant' | 'hourly' | 'daily';
  categories: Record<NotificationCategory, boolean>;
  updated_at: string;
}

/**
 * Notification template
 */
export interface NotificationTemplate {
  id: string;
  code: string;
  category: NotificationCategory;
  title_template: string;
  body_template: string;
  cta_link_template: string | null;
  priority: 'critical' | 'high' | 'normal' | 'low';
  channels: NotificationChannel[];
  is_active: boolean;
}

/**
 * Queued notification
 */
export interface QueuedNotification {
  id: string;
  template_code: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  cta_link: string | null;
  priority: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  scheduled_for: string;
  created_at: string;
}

/**
 * Notification history entry
 */
export interface NotificationHistoryEntry {
  id: string;
  template_code: string;
  title: string;
  body: string;
  channel: NotificationChannel;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  sent_at: string;
  read_at: string | null;
}

/**
 * Smart Notification Service
 *
 * Manages notification preferences, templates, and history.
 * Works with the notification queue system in the database.
 */
@Injectable({
  providedIn: 'root',
})
export class SmartNotificationService {
  private readonly logger = inject(LoggerService);
  private readonly supabase = injectSupabase();
  private readonly authService = inject(AuthService);
  private readonly pushService = inject(PushNotificationService);

  // State signals
  private readonly _preferences = signal<NotificationPreferences | null>(null);
  private readonly _unreadCount = signal<number>(0);
  private readonly _recentNotifications = signal<NotificationHistoryEntry[]>([]);
  private readonly _isLoading = signal<boolean>(false);

  // Public computed values
  readonly preferences = this._preferences.asReadonly();
  readonly unreadCount = this._unreadCount.asReadonly();
  readonly recentNotifications = this._recentNotifications.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  readonly hasUnread = computed(() => this._unreadCount() > 0);
  readonly pushEnabled = computed(() => this._preferences()?.push_enabled ?? false);

  /**
   * Initialize the service
   * Call this after user login
   */
  async initialize(): Promise<void> {
    const user = await this.authService.getCurrentUser();
    if (!user) return;

    this._isLoading.set(true);

    try {
      // Load preferences
      await this.loadPreferences();

      // Load unread count
      await this.loadUnreadCount();

      // Load recent notifications
      await this.loadRecentNotifications();

      // Initialize push notifications if enabled
      if (this._preferences()?.push_enabled) {
        await this.pushService.initializePushNotifications();
      }

      // Subscribe to realtime updates
      this.subscribeToNotifications();

      this.logger.debug('[SmartNotification] Initialized successfully');
    } catch (error) {
      this.logger.error('[SmartNotification] Initialization failed:', error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load user notification preferences
   */
  async loadPreferences(): Promise<NotificationPreferences | null> {
    const user = await this.authService.getCurrentUser();
    if (!user) return null;

    const { data, error } = await this.supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // If no preferences exist, create default ones
      if (error.code === 'PGRST116') {
        const defaultPrefs = await this.createDefaultPreferences(user.id);
        this._preferences.set(defaultPrefs);
        return defaultPrefs;
      }
      this.logger.error('[SmartNotification] Failed to load preferences:', error);
      return null;
    }

    this._preferences.set(data);
    return data;
  }

  /**
   * Create default notification preferences for a new user
   */
  private async createDefaultPreferences(userId: string): Promise<NotificationPreferences> {
    const defaultPrefs: Partial<NotificationPreferences> = {
      user_id: userId,
      push_enabled: true,
      email_enabled: true,
      sms_enabled: false,
      in_app_enabled: true,
      quiet_hours_start: '22:00',
      quiet_hours_end: '08:00',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      digest_mode: 'instant',
      categories: {
        booking: true,
        payment: true,
        message: true,
        review: true,
        promotion: false,
        system: true,
        reminder: true,
      },
    };

    const { data, error } = await this.supabase
      .from('notification_preferences')
      .insert(defaultPrefs)
      .select()
      .single();

    if (error) {
      this.logger.error('[SmartNotification] Failed to create default preferences:', error);
      return defaultPrefs as NotificationPreferences;
    }

    return data;
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(updates: Partial<NotificationPreferences>): Promise<boolean> {
    const user = await this.authService.getCurrentUser();
    if (!user) return false;

    const { data, error } = await this.supabase
      .from('notification_preferences')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      this.logger.error('[SmartNotification] Failed to update preferences:', error);
      return false;
    }

    this._preferences.set(data);

    // Reinitialize push if it was toggled
    if ('push_enabled' in updates) {
      if (updates.push_enabled) {
        await this.pushService.initializePushNotifications();
      }
    }

    return true;
  }

  /**
   * Toggle a notification category
   */
  async toggleCategory(category: NotificationCategory, enabled: boolean): Promise<boolean> {
    const prefs = this._preferences();
    if (!prefs) return false;

    const updatedCategories = {
      ...prefs.categories,
      [category]: enabled,
    };

    return this.updatePreferences({ categories: updatedCategories });
  }

  /**
   * Set quiet hours
   */
  async setQuietHours(start: string | null, end: string | null): Promise<boolean> {
    return this.updatePreferences({
      quiet_hours_start: start,
      quiet_hours_end: end,
    });
  }

  /**
   * Set digest mode
   */
  async setDigestMode(mode: 'instant' | 'hourly' | 'daily'): Promise<boolean> {
    return this.updatePreferences({ digest_mode: mode });
  }

  /**
   * Load unread notification count
   */
  async loadUnreadCount(): Promise<number> {
    const user = await this.authService.getCurrentUser();
    if (!user) return 0;

    const { count, error } = await this.supabase
      .from('notification_history')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'sent');

    if (error) {
      this.logger.error('[SmartNotification] Failed to load unread count:', error);
      return 0;
    }

    this._unreadCount.set(count ?? 0);
    return count ?? 0;
  }

  /**
   * Load recent notifications
   */
  async loadRecentNotifications(limit = 20): Promise<NotificationHistoryEntry[]> {
    const user = await this.authService.getCurrentUser();
    if (!user) return [];

    const { data, error } = await this.supabase
      .from('notification_history')
      .select('id, title, body, channel, status, sent_at, read_at, cta_link, template_code')
      .eq('user_id', user.id)
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (error) {
      this.logger.error('[SmartNotification] Failed to load recent notifications:', error);
      return [];
    }

    this._recentNotifications.set(data || []);
    return data || [];
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('notification_history')
      .update({
        status: 'read',
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId);

    if (error) {
      this.logger.error('[SmartNotification] Failed to mark as read:', error);
      return false;
    }

    // Update local state
    await this.loadUnreadCount();
    await this.loadRecentNotifications();

    return true;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<boolean> {
    const user = await this.authService.getCurrentUser();
    if (!user) return false;

    const { error } = await this.supabase
      .from('notification_history')
      .update({
        status: 'read',
        read_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('status', 'sent');

    if (error) {
      this.logger.error('[SmartNotification] Failed to mark all as read:', error);
      return false;
    }

    // Update local state
    this._unreadCount.set(0);
    await this.loadRecentNotifications();

    return true;
  }

  /**
   * Send a test notification
   */
  async sendTestNotification(): Promise<boolean> {
    const user = await this.authService.getCurrentUser();
    if (!user) return false;

    const { error } = await this.supabase.rpc('queue_notification', {
      p_user_id: user.id,
      p_template_code: 'test_notification',
      p_data: { user_name: user.email?.split('@')[0] || 'Usuario' },
      p_scheduled_for: new Date().toISOString(),
      p_channels: ['push'],
    });

    if (error) {
      this.logger.error('[SmartNotification] Failed to send test notification:', error);
      return false;
    }

    return true;
  }

  /**
   * Queue a custom notification
   */
  async queueNotification(
    templateCode: string,
    data: Record<string, unknown> = {},
    options: {
      scheduledFor?: Date;
      channels?: NotificationChannel[];
      idempotencyKey?: string;
    } = {},
  ): Promise<string | null> {
    const user = await this.authService.getCurrentUser();
    if (!user) return null;

    const { data: result, error } = await this.supabase.rpc('queue_notification', {
      p_user_id: user.id,
      p_template_code: templateCode,
      p_data: data,
      p_scheduled_for: (options.scheduledFor ?? new Date()).toISOString(),
      p_channels: options.channels ?? ['push'],
      p_idempotency_key: options.idempotencyKey,
    });

    if (error) {
      this.logger.error('[SmartNotification] Failed to queue notification:', error);
      return null;
    }

    return result;
  }

  /**
   * Get pending notifications in queue
   */
  async getPendingNotifications(): Promise<QueuedNotification[]> {
    const user = await this.authService.getCurrentUser();
    if (!user) return [];

    const { data, error } = await this.supabase
      .from('notification_queue')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('scheduled_for', { ascending: true });

    if (error) {
      this.logger.error('[SmartNotification] Failed to get pending notifications:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Cancel a pending notification
   */
  async cancelNotification(notificationId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('notification_queue')
      .update({ status: 'cancelled' })
      .eq('id', notificationId)
      .eq('status', 'pending');

    if (error) {
      this.logger.error('[SmartNotification] Failed to cancel notification:', error);
      return false;
    }

    return true;
  }

  /**
   * Subscribe to realtime notification updates
   */
  private subscribeToNotifications(): void {
    this.authService.getCurrentUser().then((user) => {
      if (!user) return;

      // Subscribe to new notifications in history
      this.supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notification_history',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            this.logger.debug('[SmartNotification] New notification received:', payload.new);

            // Update unread count
            this._unreadCount.update((count) => count + 1);

            // Add to recent notifications
            this._recentNotifications.update((notifications) => [
              payload.new as NotificationHistoryEntry,
              ...notifications.slice(0, 19),
            ]);
          },
        )
        .subscribe();
    });
  }

  /**
   * Clean up on logout
   */
  async cleanup(): Promise<void> {
    this._preferences.set(null);
    this._unreadCount.set(0);
    this._recentNotifications.set([]);
  }
}

import { Injectable, inject, signal } from '@angular/core';
import { ToastController } from '@ionic/angular/standalone';
import { NotificationSoundService } from '@core/services/infrastructure/notification-sound.service';

/**
 * Priority levels for notifications
 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Action button configuration for notifications
 */
export interface NotificationAction {
  label: string;
  icon?: string;
  styleClass?: string;
  command: () => void;
}

/**
 * Extended notification options
 */
export interface NotificationOptions {
  title: string;
  message: string;
  priority?: NotificationPriority;
  duration?: number;
  sticky?: boolean;
  actions?: NotificationAction[];
  sound?: boolean;
  groupKey?: string;
  data?: Record<string, unknown>;
  skipGrouping?: boolean;
}

/**
 * Internal notification tracking
 */
interface TrackedNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  priority: NotificationPriority;
  groupKey?: string;
  timestamp: number;
  toast?: HTMLIonToastElement;
}

/**
 * NotificationManagerService
 *
 * Notification system using Ionic ToastController with advanced features:
 * - Priority-based queue management
 * - Maximum 5 simultaneous toasts
 * - Automatic sound integration
 * - Contextual actions support
 * - Intelligent grouping
 */
@Injectable({
  providedIn: 'root',
})
export class NotificationManagerService {
  private readonly toastController = inject(ToastController);
  private readonly soundService = inject(NotificationSoundService);

  private readonly activeNotifications = signal<TrackedNotification[]>([]);
  private readonly notificationQueue = signal<
    (NotificationOptions & { type: 'success' | 'error' | 'warning' | 'info' })[]
  >([]);
  private readonly MAX_SIMULTANEOUS_TOASTS = 5;
  private readonly groupedNotifications = new Map<string, number>();
  private readonly groupedPayloads = new Map<
    string,
    NotificationOptions & { type: 'success' | 'error' | 'warning' | 'info' }
  >();
  private readonly updatingGroups = new Set<string>();

  /**
   * Show a success notification
   */
  success(title: string, message: string, duration = 5000): void {
    this.show({
      title,
      message,
      type: 'success',
      duration,
      priority: 'normal',
      sound: true,
    });
  }

  /**
   * Show an error notification
   */
  error(title: string, message: string, duration = 7000): void {
    this.show({
      title,
      message,
      type: 'error',
      duration,
      priority: 'high',
      sound: true,
    });
  }

  /**
   * Show a warning notification
   */
  warning(title: string, message: string, duration = 6000): void {
    this.show({
      title,
      message,
      type: 'warning',
      duration,
      priority: 'normal',
      sound: true,
    });
  }

  /**
   * Show an info notification
   */
  info(title: string, message: string, duration = 5000): void {
    this.show({
      title,
      message,
      type: 'info',
      duration,
      priority: 'low',
      sound: false,
    });
  }

  /**
   * Show a notification with full control
   */
  async show(
    options: NotificationOptions & { type: 'success' | 'error' | 'warning' | 'info' },
  ): Promise<void> {
    const {
      title,
      message,
      type,
      priority = 'normal',
      duration,
      sticky,
      actions,
      sound = false,
      groupKey,
    } = options;
    const kind = typeof options.data?.['kind'] === 'string' ? options.data['kind'] : null;
    const isChatToast = kind === 'chat';
    const skipGrouping = options.skipGrouping === true;

    // Handle grouping
    if (groupKey) {
      this.groupedPayloads.set(groupKey, options);
    }

    if (groupKey && !skipGrouping) {
      const existingCount = this.groupedNotifications.get(groupKey) || 0;
      this.groupedNotifications.set(groupKey, existingCount + 1);

      if (existingCount > 0) {
        await this.updateGroupedNotification(groupKey, existingCount + 1);
        return;
      }
    }

    // Check if we've reached the limit
    if (this.activeNotifications().length >= this.MAX_SIMULTANEOUS_TOASTS) {
      this.queueNotification(options);
      return;
    }

    // Play sound if enabled
    if (sound) {
      this.playNotificationSound(type, priority);
    }

    // Calculate duration
    const finalDuration = this.calculateDuration(type, priority, duration, sticky);
    const finalSticky = sticky !== undefined ? sticky : priority === 'critical';

    const id = this.generateId();

    // Create toast buttons from actions
    const buttons = actions?.map((action) => ({
      text: action.label,
      handler: () => {
        action.command();
        return true;
      },
    }));

    const toastClasses = [
      'toast-modern',
      `toast-${type}`,
      `toast-priority-${priority}`,
      kind ? `toast-${kind}` : '',
    ]
      .filter(Boolean)
      .join(' ');

    // Create Ionic Toast
    const toast = await this.toastController.create({
      header: title,
      message,
      duration: finalSticky ? undefined : finalDuration,
      position: 'top',
      color: this.mapTypeToColor(type),
      // Apply base + type + priority classes for styling
      cssClass: toastClasses,
      buttons: buttons || [
        {
          icon: 'close',
          role: 'cancel',
        },
      ],
    });

    if (isChatToast) {
      const senderName =
        typeof options.data?.['senderName'] === 'string' ? options.data['senderName'] : title;
      const initials = this.getInitials(senderName);
      toast.style.setProperty('--toast-initials', `"${initials}"`);
      toast.style.setProperty('--toast-time', `"${this.getTimeLabel()}"`);
      const count = options.data?.['count'];
      if (typeof count === 'number' && count > 1) {
        toast.style.setProperty('--toast-count', `"${count}"`);
        toast.style.setProperty('--toast-count-visible', '1');
      } else {
        toast.style.setProperty('--toast-count', '""');
        toast.style.setProperty('--toast-count-visible', '0');
      }
    }

    if (kind === 'draft') {
      toast.style.setProperty('--toast-icon', '"📝"');
    }

    // Track notification
    this.trackNotification(id, type, priority, groupKey, toast);

    await toast.present();

    // Handle toast dismiss
    toast.onDidDismiss().then(() => {
      this.removeNotification(id, groupKey);
    });
  }

  /**
   * Clear all notifications
   */
  async clear(): Promise<void> {
    const active = this.activeNotifications();
    for (const notification of active) {
      if (notification.toast) {
        await notification.toast.dismiss();
      }
    }
    this.activeNotifications.set([]);
    this.notificationQueue.set([]);
    this.groupedNotifications.clear();
  }

  /**
   * Remove a specific notification by ID
   */
  async remove(id: string): Promise<void> {
    const notification = this.activeNotifications().find((n) => n.id === id);
    if (notification?.toast) {
      await notification.toast.dismiss();
    }
    this.removeNotification(id);
  }

  /**
   * Get count of active notifications
   */
  getActiveCount(): number {
    return this.activeNotifications().length;
  }

  /**
   * Get count of queued notifications
   */
  getQueuedCount(): number {
    return this.notificationQueue().length;
  }

  private mapTypeToColor(type: 'success' | 'error' | 'warning' | 'info'): string {
    const colorMap: Record<string, string> = {
      success: 'success',
      error: 'danger',
      warning: 'warning',
      info: 'primary',
    };
    return colorMap[type] || 'primary';
  }

  private queueNotification(
    options: NotificationOptions & { type: 'success' | 'error' | 'warning' | 'info' },
  ): void {
    const queue = this.notificationQueue();
    const priority = options.priority || 'normal';

    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    const insertIndex = queue.findIndex(
      (n) => priorityOrder[n.priority || 'normal'] > priorityOrder[priority],
    );

    if (insertIndex === -1) {
      this.notificationQueue.set([...queue, options]);
    } else {
      const newQueue = [...queue];
      newQueue.splice(insertIndex, 0, options);
      this.notificationQueue.set(newQueue);
    }

    setTimeout(() => this.processQueue(), 500);
  }

  private processQueue(): void {
    const queue = this.notificationQueue();
    if (queue.length === 0) {
      return;
    }

    while (this.activeNotifications().length < this.MAX_SIMULTANEOUS_TOASTS && queue.length > 0) {
      const next = queue[0];
      this.notificationQueue.set(queue.slice(1));
      void this.show(next);
    }
  }

  private trackNotification(
    id: string,
    type: 'success' | 'error' | 'warning' | 'info',
    priority: NotificationPriority,
    groupKey?: string,
    toast?: HTMLIonToastElement,
  ): void {
    const tracked: TrackedNotification = {
      id,
      type,
      priority,
      groupKey,
      timestamp: Date.now(),
      toast,
    };

    this.activeNotifications.set([...this.activeNotifications(), tracked]);
  }

  private removeNotification(id: string, groupKey?: string): void {
    this.activeNotifications.set(this.activeNotifications().filter((n) => n.id !== id));

    if (groupKey && !this.updatingGroups.has(groupKey)) {
      this.groupedNotifications.delete(groupKey);
      this.groupedPayloads.delete(groupKey);
    }

    this.processQueue();
  }

  private async updateGroupedNotification(groupKey: string, count: number): Promise<void> {
    const existing = this.activeNotifications().find((n) => n.groupKey === groupKey);
    const payload = this.groupedPayloads.get(groupKey);

    if (!payload || !existing) return;

    this.updatingGroups.add(groupKey);

    try {
      if (existing.toast) {
        await existing.toast.dismiss();
      }

      const isChatToast = payload.data?.['kind'] === 'chat';
      const updatedOptions: NotificationOptions & {
        type: 'success' | 'error' | 'warning' | 'info';
      } = {
        ...payload,
        message: payload.message,
        priority: existing.priority,
        groupKey,
        sound: false,
        skipGrouping: true,
        data: {
          ...payload.data,
          count,
        },
      };

      if (!isChatToast) {
        updatedOptions.message = `${payload.message} (${count} similares)`;
      }

      await this.show(updatedOptions);
    } finally {
      this.updatingGroups.delete(groupKey);
    }
  }

  private calculateDuration(
    type: 'success' | 'error' | 'warning' | 'info',
    priority: NotificationPriority,
    explicitDuration?: number,
    sticky?: boolean,
  ): number | undefined {
    if (sticky) {
      return undefined;
    }

    if (explicitDuration !== undefined) {
      return explicitDuration;
    }

    const baseDurations = {
      success: 5000,
      error: 7000,
      warning: 6000,
      info: 5000,
    };

    const priorityMultipliers = {
      low: 0.8,
      normal: 1,
      high: 1.5,
      critical: 2,
    };

    return baseDurations[type] * priorityMultipliers[priority];
  }

  private playNotificationSound(
    type: 'success' | 'error' | 'warning' | 'info',
    priority: NotificationPriority,
  ): void {
    if (type === 'error' || priority === 'critical') {
      this.soundService.playNotificationSound();
    } else if (type === 'success') {
      this.soundService.playMessageSentSound();
    } else {
      this.soundService.playNotificationSound();
    }
  }

  private generateId(): string {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getInitials(name: string): string {
    const cleaned = name.trim();
    if (!cleaned) return 'AR';
    const parts = cleaned.split(/\s+/);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  private getTimeLabel(): string {
    return new Date().toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

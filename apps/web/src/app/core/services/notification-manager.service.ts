import { Injectable, inject, signal } from '@angular/core';
import { ToastController } from '@ionic/angular/standalone';
import { NotificationSoundService } from './notification-sound.service';

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

    // Handle grouping
    if (groupKey) {
      const existingCount = this.groupedNotifications.get(groupKey) || 0;
      this.groupedNotifications.set(groupKey, existingCount + 1);

      if (existingCount > 0) {
        await this.updateGroupedNotification(groupKey, existingCount + 1, title, message, type);
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

    // Create Ionic Toast
    const toast = await this.toastController.create({
      header: title,
      message,
      duration: finalSticky ? undefined : finalDuration,
      position: 'top',
      color: this.mapTypeToColor(type),
      cssClass: `toast-${type} toast-priority-${priority}`,
      buttons: buttons || [
        {
          icon: 'close',
          role: 'cancel',
        },
      ],
    });

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

    if (groupKey) {
      this.groupedNotifications.delete(groupKey);
    }

    this.processQueue();
  }

  private async updateGroupedNotification(
    groupKey: string,
    count: number,
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning' | 'info',
  ): Promise<void> {
    const existing = this.activeNotifications().find((n) => n.groupKey === groupKey);

    if (existing) {
      if (existing.toast) {
        await existing.toast.dismiss();
      }

      const updatedMessage = `${message} (${count} similar)`;
      await this.show({
        title,
        message: updatedMessage,
        type,
        priority: existing.priority,
        groupKey,
        sound: false,
      });
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
}

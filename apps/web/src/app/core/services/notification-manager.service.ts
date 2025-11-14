import { Injectable, inject, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { NotificationSoundService } from './notification-sound.service';

/**
 * Priority levels for notifications
 * - low: Informational, dismissable
 * - normal: Standard notifications
 * - high: Important notifications, longer duration
 * - critical: Critical alerts, sticky (must be manually dismissed)
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
}

/**
 * NotificationManagerService
 *
 * Professional notification system built on PrimeNG Toast with advanced features:
 * - Priority-based queue management
 * - Maximum 5 simultaneous toasts
 * - Automatic sound integration
 * - Contextual actions support
 * - Intelligent grouping
 * - Full backward compatibility with ToastService API
 *
 * @example
 * ```typescript
 * // Basic usage (backward compatible)
 * notificationManager.success('Success', 'Operation completed');
 * notificationManager.error('Error', 'Something went wrong');
 *
 * // Advanced usage with priority
 * notificationManager.show({
 *   title: 'Critical Alert',
 *   message: 'Immediate action required',
 *   type: 'error',
 *   priority: 'critical',
 *   sticky: true,
 *   actions: [
 *     { label: 'Fix Now', command: () => this.fixIssue() },
 *     { label: 'Dismiss', command: () => {} }
 *   ]
 * });
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class NotificationManagerService {
  private readonly messageService = inject(MessageService);
  private readonly soundService = inject(NotificationSoundService);

  // Track active notifications for queue management
  private readonly activeNotifications = signal<TrackedNotification[]>([]);
  private readonly notificationQueue = signal<
    (NotificationOptions & { type: 'success' | 'error' | 'warning' | 'info' })[]
  >([]);
  private readonly MAX_SIMULTANEOUS_TOASTS = 5;

  // Grouping tracking
  private readonly groupedNotifications = new Map<string, number>();

  /**
   * Show a success notification
   *
   * @param title - Notification title
   * @param message - Notification message
   * @param duration - Duration in milliseconds (default: 5000)
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
   *
   * @param title - Notification title
   * @param message - Notification message
   * @param duration - Duration in milliseconds (default: 7000)
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
   *
   * @param title - Notification title
   * @param message - Notification message
   * @param duration - Duration in milliseconds (default: 6000)
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
   *
   * @param title - Notification title
   * @param message - Notification message
   * @param duration - Duration in milliseconds (default: 5000)
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
   *
   * @param options - Notification options
   */
  show(options: NotificationOptions & { type: 'success' | 'error' | 'warning' | 'info' }): void {
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
      data,
    } = options;

    // Handle grouping
    if (groupKey) {
      const existingCount = this.groupedNotifications.get(groupKey) || 0;
      this.groupedNotifications.set(groupKey, existingCount + 1);

      // If we already have notifications for this group, update the existing one
      if (existingCount > 0) {
        this.updateGroupedNotification(groupKey, existingCount + 1, title, message, type);
        return;
      }
    }

    // Check if we've reached the limit
    if (this.activeNotifications().length >= this.MAX_SIMULTANEOUS_TOASTS) {
      // Queue the notification based on priority
      this.queueNotification(options);
      return;
    }

    // Play sound if enabled
    if (sound) {
      this.playNotificationSound(type, priority);
    }

    // Calculate duration based on priority if not explicitly set
    const finalDuration = this.calculateDuration(type, priority, duration, sticky);
    const finalSticky = sticky !== undefined ? sticky : priority === 'critical';

    // Generate unique ID
    const id = this.generateId();

    // Track notification
    this.trackNotification(id, type, priority, groupKey);

    // Show via PrimeNG MessageService
    this.messageService.add({
      key: 'main',
      severity: type,
      summary: title,
      detail: message,
      life: finalSticky ? undefined : finalDuration,
      sticky: finalSticky,
      data: {
        ...data,
        id,
        priority,
        actions,
      },
    });

    // Auto-remove from tracking after duration (if not sticky)
    if (!finalSticky && finalDuration) {
      setTimeout(() => {
        this.removeNotification(id, groupKey);
      }, finalDuration);
    }
  }

  /**
   * Clear all notifications
   */
  clear(): void {
    this.messageService.clear();
    this.activeNotifications.set([]);
    this.notificationQueue.set([]);
    this.groupedNotifications.clear();
  }

  /**
   * Remove a specific notification by ID
   *
   * @param id - Notification ID
   */
  remove(id: string): void {
    this.messageService.clear(id);
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

  // ===== Private Helper Methods =====

  private queueNotification(
    options: NotificationOptions & { type: 'success' | 'error' | 'warning' | 'info' },
  ): void {
    const queue = this.notificationQueue();
    const priority = options.priority || 'normal';

    // Insert based on priority
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

    // Process queue after a short delay
    setTimeout(() => this.processQueue(), 500);
  }

  private processQueue(): void {
    const queue = this.notificationQueue();
    if (queue.length === 0) {
      return;
    }

    // Check if we have room for more notifications
    while (this.activeNotifications().length < this.MAX_SIMULTANEOUS_TOASTS && queue.length > 0) {
      const next = queue[0];
      this.notificationQueue.set(queue.slice(1));
      this.show(next);
    }
  }

  private trackNotification(
    id: string,
    type: 'success' | 'error' | 'warning' | 'info',
    priority: NotificationPriority,
    groupKey?: string,
  ): void {
    const tracked: TrackedNotification = {
      id,
      type,
      priority,
      groupKey,
      timestamp: Date.now(),
    };

    this.activeNotifications.set([...this.activeNotifications(), tracked]);
  }

  private removeNotification(id: string, groupKey?: string): void {
    this.activeNotifications.set(this.activeNotifications().filter((n) => n.id !== id));

    // Clear from grouping if applicable
    if (groupKey) {
      this.groupedNotifications.delete(groupKey);
    }

    // Process queue to show next notification
    this.processQueue();
  }

  private updateGroupedNotification(
    groupKey: string,
    count: number,
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning' | 'info',
  ): void {
    // Find and update existing notification
    const existing = this.activeNotifications().find((n) => n.groupKey === groupKey);

    if (existing) {
      // Clear old notification
      this.messageService.clear(existing.id);

      // Show updated notification with count
      const updatedMessage = `${message} (${count} similar)`;
      this.show({
        title,
        message: updatedMessage,
        type,
        priority: existing.priority,
        groupKey,
        sound: false, // Don't play sound for grouped updates
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

    // Calculate based on priority and type
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
    // Play different sounds based on type and priority
    if (type === 'error' || priority === 'critical') {
      this.soundService.playNotificationSound();
    } else if (type === 'success') {
      this.soundService.playMessageSentSound();
    } else {
      // For warnings and info, play a softer sound
      this.soundService.playNotificationSound();
    }
  }

  private generateId(): string {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

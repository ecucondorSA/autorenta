import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  icon?: string;
}

/**
 * Toast service for temporary UI notifications
 */
@Injectable({
  providedIn: 'root',
})
export class ToastService {
  readonly notifications = signal<Toast[]>([]);

  /**
   * Show success notification
   */
  success(title: string, message: string, duration = 5000): void {
    this.show({
      id: this.generateId(),
      type: 'success',
      title,
      message,
      duration,
      icon: '✓',
    });
  }

  /**
   * Show error notification
   */
  error(title: string, message: string, duration = 7000): void {
    this.show({
      id: this.generateId(),
      type: 'error',
      title,
      message,
      duration,
      icon: '✕',
    });
  }

  /**
   * Show warning notification
   */
  warning(title: string, message: string, duration = 6000): void {
    this.show({
      id: this.generateId(),
      type: 'warning',
      title,
      message,
      duration,
      icon: '⚠',
    });
  }

  /**
   * Show info notification
   */
  info(title: string, message: string, duration = 5000): void {
    this.show({
      id: this.generateId(),
      type: 'info',
      title,
      message,
      duration,
      icon: 'ℹ',
    });
  }

  /**
   * Show custom toast
   */
  show(notification: Toast): void {
    const notifications = this.notifications();
    this.notifications.set([...notifications, notification]);

    // Auto-remove after duration
    if (notification.duration && notification.duration > 0) {
      setTimeout(() => {
        this.remove(notification.id);
      }, notification.duration);
    }
  }

  /**
   * Remove notification by ID
   */
  remove(id: string): void {
    const notifications = this.notifications();
    this.notifications.set(notifications.filter((n) => n.id !== id));
  }

  /**
   * Remove all notifications
   */
  clear(): void {
    this.notifications.set([]);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `notification-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

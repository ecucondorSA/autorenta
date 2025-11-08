import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  NotificationsService,
  NotificationItem,
} from '../../../core/services/user-notifications.service';

@Component({
  standalone: true,
  selector: 'app-notifications',
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css'],
})
export class NotificationsComponent {
  private readonly router = inject(Router);
  private readonly notificationsService = inject(NotificationsService);

  readonly notifications = this.notificationsService.notifications;
  readonly unreadCount = this.notificationsService.unreadCount;
  readonly showDropdown = signal(false);

  readonly recentNotifications = computed(() => this.notifications().slice(0, 5));

  readonly hasUnread = computed(() => this.unreadCount() > 0);

  toggleDropdown() {
    this.showDropdown.update((show) => !show);
  }

  closeDropdown() {
    this.showDropdown.set(false);
  }

  async markAsRead(notification: NotificationItem) {
    await this.notificationsService.markAsRead(notification.id);
  }

  async markAllAsRead() {
    await this.notificationsService.markAllAsRead();
  }

  async handleNotificationClick(notification: NotificationItem) {
    await this.markAsRead(notification);

    if (notification.actionUrl) {
      this.router.navigate([notification.actionUrl]);
      this.closeDropdown();
    }
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Ahora mismo';
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} h`;
    return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
  }

  getNotificationIcon(type: NotificationItem['type']): string {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  }
}

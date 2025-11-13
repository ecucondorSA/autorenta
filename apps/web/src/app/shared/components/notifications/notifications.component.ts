import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  NotificationsService,
  NotificationItem,
} from '../../../core/services/user-notifications.service';
import { CarOwnerNotificationsService } from '../../../core/services/car-owner-notifications.service';

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
  private readonly carOwnerNotifications = inject(CarOwnerNotificationsService);

  readonly notifications = this.notificationsService.notifications;
  readonly unreadCount = this.notificationsService.unreadCount;
  readonly showDropdown = signal(false);

  readonly recentNotifications = computed(() => this.notifications().slice(0, 5));

  readonly hasUnread = computed(() => this.unreadCount() > 0);

  /**
   * Refrescar notificaciones manualmente
   */
  async refreshNotifications(): Promise<void> {
    await this.notificationsService.refresh();
  }

  /**
   * Generar notificaciones de documentos faltantes para autos ya publicados
   * Útil cuando el usuario ya tiene autos publicados pero no tiene notificaciones
   */
  async generateMissingDocumentNotifications(): Promise<void> {
    try {
      await this.carOwnerNotifications.checkAndNotifyMissingDocumentsForAllCars();
      // Refrescar notificaciones después de generar
      await this.notificationsService.refresh();
    } catch (error) {
      console.error('Error generating notifications:', error);
    }
  }

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

  async deleteNotification(notification: NotificationItem) {
    if (!confirm('¿Eliminar esta notificación?')) {
      return;
    }

    try {
      await this.notificationsService.deleteNotification(notification.id);
    } catch (error) {
      console.error('Error deleting notification:', error);
      alert('Error al eliminar la notificación');
    }
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

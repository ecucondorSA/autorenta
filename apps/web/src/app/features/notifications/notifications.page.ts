import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationsService, NotificationItem } from '../../core/services/user-notifications.service';

/**
 * NotificationsPage
 *
 * Página completa de centro de notificaciones.
 *
 * Características:
 * - Lista completa de notificaciones (no solo 5 recientes)
 * - Filtros por tipo (todas, info, success, warning, error)
 * - Filtros por estado (todas, no leídas)
 * - Acciones en grupo (marcar todas como leídas, borrar leídas)
 * - Navegación a actions
 * - Realtime updates
 *
 * Ruta: /notifications
 */
@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.css'],
})
export class NotificationsPage {
  private readonly router = inject(Router);
  private readonly notificationsService = inject(NotificationsService);

  readonly notifications = this.notificationsService.notifications;
  readonly unreadCount = this.notificationsService.unreadCount;

  // Filtros
  readonly filterType = signal<'all' | NotificationItem['type']>('all');
  readonly filterStatus = signal<'all' | 'unread' | 'read'>('all');

  // Computed: Notificaciones filtradas
  readonly filteredNotifications = computed(() => {
    let filtered = this.notifications();

    // Filtrar por tipo
    if (this.filterType() !== 'all') {
      filtered = filtered.filter((n) => n.type === this.filterType());
    }

    // Filtrar por estado
    if (this.filterStatus() === 'unread') {
      filtered = filtered.filter((n) => !n.read);
    } else if (this.filterStatus() === 'read') {
      filtered = filtered.filter((n) => n.read);
    }

    return filtered;
  });

  readonly hasNotifications = computed(() => this.filteredNotifications().length > 0);
  readonly hasUnread = computed(() => this.unreadCount() > 0);

  // Tipos de notificación para filtro
  readonly notificationTypes = [
    { value: 'all' as const, label: 'Todas', icon: '📋' },
    { value: 'info' as const, label: 'Info', icon: 'ℹ️' },
    { value: 'success' as const, label: 'Éxito', icon: '✅' },
    { value: 'warning' as const, label: 'Advertencia', icon: '⚠️' },
    { value: 'error' as const, label: 'Error', icon: '❌' },
  ];

  // Estados para filtro
  readonly statusFilters = [
    { value: 'all' as const, label: 'Todas' },
    { value: 'unread' as const, label: 'No leídas' },
    { value: 'read' as const, label: 'Leídas' },
  ];

  async handleNotificationClick(notification: NotificationItem) {
    await this.notificationsService.markAsRead(notification.id);

    if (notification.actionUrl) {
      this.router.navigate([notification.actionUrl]);
    }
  }

  async markAsRead(notificationId: string) {
    await this.notificationsService.markAsRead(notificationId);
  }

  async markAllAsRead() {
    await this.notificationsService.markAllAsRead();
  }

  setFilterType(type: typeof this.filterType extends () => infer T ? T : never) {
    this.filterType.set(type);
  }

  setFilterStatus(status: typeof this.filterStatus extends () => infer T ? T : never) {
    this.filterStatus.set(status);
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Ahora mismo';
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} h`;
    if (diffInSeconds < 2592000)
      return `Hace ${Math.floor(diffInSeconds / 86400)} día${Math.floor(diffInSeconds / 86400) > 1 ? 's' : ''}`;
    return new Date(date).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
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

  getNotificationColor(type: NotificationItem['type']): string {
    switch (type) {
      case 'success':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  }

  goToSettings() {
    this.router.navigate(['/profile/notifications-settings']);
  }
}

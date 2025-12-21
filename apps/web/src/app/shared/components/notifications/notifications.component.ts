import {Component, signal, inject, computed, ViewChild, ElementRef,
  ChangeDetectionStrategy} from '@angular/core';

import { Router } from '@angular/router';
import {
  NotificationsService,
  NotificationItem,
} from '@core/services/infrastructure/user-notifications.service';
import { CarOwnerNotificationsService } from '@core/services/cars/car-owner-notifications.service';
import { ClickOutsideDirective } from '../../directives/click-outside.directive';
import { HeaderIconComponent } from '../header-icon/header-icon.component';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-notifications',
  imports: [ClickOutsideDirective, HeaderIconComponent],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css'],
})
export class NotificationsComponent {
  private readonly router = inject(Router);
  private readonly notificationsService = inject(NotificationsService);
  private readonly carOwnerNotifications = inject(CarOwnerNotificationsService);

  readonly notifications = this.notificationsService.notifications;
  readonly unreadCount = this.notificationsService.unreadCount;
  readonly connectionStatus = this.notificationsService.connectionStatus;
  readonly showDropdown = signal(false);

  // Referencia al botón de la campana para excluirlo del clickOutside
  @ViewChild('bellButton') bellButton?: ElementRef<HTMLButtonElement>;

  readonly recentNotifications = computed(() => this.notifications().slice(0, 5));

  readonly hasUnread = computed(() => this.unreadCount() > 0);

  readonly isConnected = computed(() => this.connectionStatus() === 'connected');
  readonly isConnecting = computed(() => this.connectionStatus() === 'connecting');
  readonly hasConnectionError = computed(() => this.connectionStatus() === 'error');

  /**
   * Elementos a excluir del click outside (botón de la campana)
   */
  get excludedElements(): HTMLElement[] {
    return this.bellButton?.nativeElement ? [this.bellButton.nativeElement] : [];
  }

  /**
   * Refrescar notificaciones manualmente
   */
  async refreshNotifications(): Promise<void> {
    await this.notificationsService.refresh();
  }

  /**
   * Reconectar manualmente a Realtime
   */
  async reconnect(): Promise<void> {
    await this.notificationsService.reconnect();
  }

  /**
   * Obtener mensaje de estado de conexión
   */
  getConnectionStatusMessage(): string {
    const status = this.connectionStatus();
    switch (status) {
      case 'connected':
        return 'Conectado';
      case 'connecting':
        return 'Conectando...';
      case 'error':
        return 'Error de conexión';
      case 'disconnected':
        return 'Desconectado';
      default:
        return 'Desconocido';
    }
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

  onBellButtonClick(event: Event) {
    // Prevenir que el clickOutside se active cuando se hace clic en el botón
    event.stopPropagation();
    this.toggleDropdown();
  }

  async markAsRead(notification: NotificationItem) {
    await this.notificationsService.markAsRead(notification.id);
  }

  async markAllAsRead() {
    await this.notificationsService.markAllAsRead();
  }

  async deleteNotification(notification: NotificationItem) {
    try {
      await this.notificationsService.deleteNotification(notification.id);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }

  async handleNotificationClick(notification: NotificationItem) {
    await this.markAsRead(notification);

    if (notification.actionUrl) {
      this.router.navigateByUrl(notification.actionUrl);
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

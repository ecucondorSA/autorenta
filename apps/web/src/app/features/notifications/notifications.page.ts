import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NotificationsService, NotificationItem } from '../../core/services/user-notifications.service';

type ExtendedNotificationItem = NotificationItem & { dbType?: string };

/**
 * 🔔 Página de notificaciones
 * Lista completa de notificaciones con filtros y acciones
 */
@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styles: [`
    @keyframes slideInRight {
      from {
        opacity: 0;
        transform: translateX(20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .notification-card {
      animation: slideInRight 0.3s ease-out;
    }
  `],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <!-- Header -->
      <div class="sticky top-0 z-10 bg-white shadow dark:bg-gray-800">
        <div class="mx-auto max-w-6xl px-4 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <button
                (click)="goBack()"
                class="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                type="button"
              >
                <svg class="h-6 w-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                  Notificaciones
                  @if (unreadCount() > 0) {
                    <span class="ml-2 text-lg text-blue-600 dark:text-blue-400">({{ unreadCount() }})</span>
                  }
                </h1>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Todas tus notificaciones en un solo lugar
                </p>
              </div>
            </div>
            <a
              routerLink="/notifications/preferences"
              class="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Preferencias
            </a>
          </div>

          <!-- Filters -->
          <div class="mt-4 flex flex-wrap items-center gap-3">
            <!-- Type filter -->
            <div class="flex items-center gap-2">
              <label for="typeFilter" class="text-sm font-medium text-gray-700 dark:text-gray-300">
                Tipo:
              </label>
              <select
                id="typeFilter"
                [(ngModel)]="selectedType"
                (ngModelChange)="onFilterChange()"
                class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">Todas</option>
                <option value="new_booking_for_owner">Nuevas reservas</option>
                <option value="booking_cancelled_for_owner">Cancelaciones (propietario)</option>
                <option value="booking_cancelled_for_renter">Cancelaciones (inquilino)</option>
                <option value="new_chat_message">Mensajes</option>
                <option value="payment_successful">Pagos exitosos</option>
                <option value="payout_successful">Pagos recibidos</option>
                <option value="inspection_reminder">Recordatorios</option>
                <option value="generic_announcement">Anuncios</option>
              </select>
            </div>

            <!-- Unread filter -->
            <label class="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                [(ngModel)]="showOnlyUnread"
                (ngModelChange)="toggleUnreadFilter()"
                class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
              />
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                Solo no leídas
              </span>
            </label>

            <!-- Action buttons -->
            <div class="ml-auto flex gap-2">
              @if (unreadCount() > 0) {
                <button
                  (click)="markAllAsRead()"
                  class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  type="button"
                >
                  Marcar todas como leídas
                </button>
              }
              @if (hasReadNotifications()) {
                <button
                  (click)="deleteAllRead()"
                  class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  type="button"
                >
                  Eliminar leídas
                </button>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="mx-auto max-w-6xl p-4">
        @if (loading()) {
          <!-- Loading state -->
          <div class="flex h-96 items-center justify-center">
            <div class="text-center">
              <div
                class="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-500"
              ></div>
              <p class="text-gray-600 dark:text-gray-400">Cargando notificaciones...</p>
            </div>
          </div>
        } @else if (filteredNotifications().length === 0) {
          <!-- Empty state -->
          <div class="flex h-96 flex-col items-center justify-center">
            <div class="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <svg class="h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
              No hay notificaciones
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              @if (showOnlyUnread()) {
                No tienes notificaciones sin leer
              } @else {
                Cuando recibas notificaciones, aparecerán aquí
              }
            </p>
          </div>
        } @else {
          <!-- Notifications list -->
          <div class="space-y-6">
            @if (!showOnlyUnread()) {
              <!-- Unread notifications section -->
              @if (unreadNotifications().length > 0) {
                <div>
                  <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    No leídas ({{ unreadNotifications().length }})
                  </h2>
                  <div class="space-y-3">
                    @for (notification of unreadNotifications(); track notification.id) {
                      <div class="notification-card group relative rounded-lg border-l-4 border-blue-500 bg-blue-50 p-4 shadow transition-all hover:shadow-md dark:bg-blue-900/20">
                        <div class="flex gap-4">
                          <!-- Icon -->
                          <div class="flex-shrink-0">
                            <div class="flex h-10 w-10 items-center justify-center rounded-full text-2xl"
                              [ngClass]="{
                                'bg-green-100 dark:bg-green-900/30': notification.type === 'success',
                                'bg-yellow-100 dark:bg-yellow-900/30': notification.type === 'warning',
                                'bg-red-100 dark:bg-red-900/30': notification.type === 'error',
                                'bg-blue-100 dark:bg-blue-900/30': notification.type === 'info'
                              }"
                            >
                              {{ getNotificationIcon(notification.type) }}
                            </div>
                          </div>

                          <!-- Content -->
                          <div class="flex-1 min-w-0">
                            <div class="flex items-start justify-between gap-2">
                              <div class="flex-1">
                                <h3 class="font-semibold text-gray-900 dark:text-white">
                                  {{ notification.title }}
                                </h3>
                                <p class="mt-1 text-sm text-gray-700 dark:text-gray-300">
                                  {{ notification.message }}
                                </p>

                                <!-- Metadata -->
                                @if (notification.metadata) {
                                  <div class="mt-2 text-xs text-gray-600 dark:text-gray-400">
                                    {{ renderMetadata(notification) }}
                                  </div>
                                }

                                <!-- Timestamp -->
                                <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                  {{ getTimeAgo(notification.createdAt) }}
                                </p>
                              </div>
                            </div>

                            <!-- Actions -->
                            <div class="mt-3 flex flex-wrap gap-2">
                              @if (notification.actionUrl) {
                                <button
                                  (click)="handleNotificationClick(notification)"
                                  class="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                                  type="button"
                                >
                                  Ver detalles
                                </button>
                              }
                              <button
                                (click)="markAsRead(notification.id)"
                                class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                                type="button"
                              >
                                Marcar como leída
                              </button>
                            </div>
                          </div>

                          <!-- Delete button (hidden, shows on hover) -->
                          <button
                            (click)="deleteNotification(notification.id)"
                            class="absolute right-2 top-2 rounded-lg p-1.5 text-gray-400 opacity-0 transition-opacity hover:bg-gray-200 hover:text-gray-600 group-hover:opacity-100 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                            type="button"
                            title="Eliminar"
                          >
                            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Read notifications section -->
              @if (readNotifications().length > 0) {
                <div>
                  <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Leídas ({{ readNotifications().length }})
                  </h2>
                  <div class="space-y-3">
                    @for (notification of readNotifications(); track notification.id) {
                      <div class="notification-card group relative rounded-lg border border-gray-200 bg-white p-4 shadow transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
                        <div class="flex gap-4">
                          <!-- Icon -->
                          <div class="flex-shrink-0">
                            <div class="flex h-10 w-10 items-center justify-center rounded-full text-2xl opacity-60"
                              [ngClass]="{
                                'bg-green-100 dark:bg-green-900/30': notification.type === 'success',
                                'bg-yellow-100 dark:bg-yellow-900/30': notification.type === 'warning',
                                'bg-red-100 dark:bg-red-900/30': notification.type === 'error',
                                'bg-blue-100 dark:bg-blue-900/30': notification.type === 'info'
                              }"
                            >
                              {{ getNotificationIcon(notification.type) }}
                            </div>
                          </div>

                          <!-- Content -->
                          <div class="flex-1 min-w-0">
                            <div class="flex items-start justify-between gap-2">
                              <div class="flex-1">
                                <h3 class="font-semibold text-gray-900 dark:text-white">
                                  {{ notification.title }}
                                </h3>
                                <p class="mt-1 text-sm text-gray-700 dark:text-gray-300">
                                  {{ notification.message }}
                                </p>

                                <!-- Metadata -->
                                @if (notification.metadata) {
                                  <div class="mt-2 text-xs text-gray-600 dark:text-gray-400">
                                    {{ renderMetadata(notification) }}
                                  </div>
                                }

                                <!-- Timestamp -->
                                <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                  {{ getTimeAgo(notification.createdAt) }}
                                </p>
                              </div>
                            </div>

                            <!-- Actions -->
                            @if (notification.actionUrl) {
                              <div class="mt-3 flex flex-wrap gap-2">
                                <button
                                  (click)="handleNotificationClick(notification)"
                                  class="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                                  type="button"
                                >
                                  Ver detalles
                                </button>
                              </div>
                            }
                          </div>

                          <!-- Delete button (hidden, shows on hover) -->
                          <button
                            (click)="deleteNotification(notification.id)"
                            class="absolute right-2 top-2 rounded-lg p-1.5 text-gray-400 opacity-0 transition-opacity hover:bg-gray-200 hover:text-gray-600 group-hover:opacity-100 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                            type="button"
                            title="Eliminar"
                          >
                            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            } @else {
              <!-- Only unread notifications (when filter is active) -->
              <div class="space-y-3">
                @for (notification of unreadNotifications(); track notification.id) {
                  <div class="notification-card group relative rounded-lg border-l-4 border-blue-500 bg-blue-50 p-4 shadow transition-all hover:shadow-md dark:bg-blue-900/20">
                    <div class="flex gap-4">
                      <!-- Icon -->
                      <div class="flex-shrink-0">
                        <div class="flex h-10 w-10 items-center justify-center rounded-full text-2xl"
                          [ngClass]="{
                            'bg-green-100 dark:bg-green-900/30': notification.type === 'success',
                            'bg-yellow-100 dark:bg-yellow-900/30': notification.type === 'warning',
                            'bg-red-100 dark:bg-red-900/30': notification.type === 'error',
                            'bg-blue-100 dark:bg-blue-900/30': notification.type === 'info'
                          }"
                        >
                          {{ getNotificationIcon(notification.type) }}
                        </div>
                      </div>

                      <!-- Content -->
                      <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between gap-2">
                          <div class="flex-1">
                            <h3 class="font-semibold text-gray-900 dark:text-white">
                              {{ notification.title }}
                            </h3>
                            <p class="mt-1 text-sm text-gray-700 dark:text-gray-300">
                              {{ notification.message }}
                            </p>

                            <!-- Metadata -->
                            @if (notification.metadata) {
                              <div class="mt-2 text-xs text-gray-600 dark:text-gray-400">
                                {{ renderMetadata(notification) }}
                              </div>
                            }

                            <!-- Timestamp -->
                            <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                              {{ getTimeAgo(notification.createdAt) }}
                            </p>
                          </div>
                        </div>

                        <!-- Actions -->
                        <div class="mt-3 flex flex-wrap gap-2">
                          @if (notification.actionUrl) {
                            <button
                              (click)="handleNotificationClick(notification)"
                              class="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                              type="button"
                            >
                              Ver detalles
                            </button>
                          }
                          <button
                            (click)="markAsRead(notification.id)"
                            class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                            type="button"
                          >
                            Marcar como leída
                          </button>
                        </div>
                      </div>

                      <!-- Delete button (hidden, shows on hover) -->
                      <button
                        (click)="deleteNotification(notification.id)"
                        class="absolute right-2 top-2 rounded-lg p-1.5 text-gray-400 opacity-0 transition-opacity hover:bg-gray-200 hover:text-gray-600 group-hover:opacity-100 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                        type="button"
                        title="Eliminar"
                      >
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class NotificationsPage implements OnInit {
  private readonly router = inject(Router);
  private readonly notificationsService = inject(NotificationsService);

  // Signals
  loading = signal(false);
  allNotifications = signal<ExtendedNotificationItem[]>([]);
  selectedType = signal<string>('all');
  showOnlyUnread = signal(false);

  // Computed signals
  filteredNotifications = computed(() => {
    let notifications = this.allNotifications();

    // Filter by type
    if (this.selectedType() !== 'all') {
      notifications = notifications.filter(n => n.dbType === this.selectedType());
    }

    // Filter by read status
    if (this.showOnlyUnread()) {
      notifications = notifications.filter(n => !n.read);
    }

    return notifications;
  });

  unreadNotifications = computed(() => {
    return this.filteredNotifications().filter(n => !n.read);
  });

  readNotifications = computed(() => {
    return this.filteredNotifications().filter(n => n.read);
  });

  unreadCount = computed(() => {
    return this.unreadNotifications().length;
  });

  hasReadNotifications = computed(() => {
    return this.allNotifications().some(n => n.read);
  });

  async ngOnInit() {
    await this.loadNotifications();
  }

  async loadNotifications() {
    this.loading.set(true);
    try {
      const notifications = await this.notificationsService.loadAllNotifications();
      this.allNotifications.set(notifications as ExtendedNotificationItem[]);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async onFilterChange() {
    this.loading.set(true);
    try {
      const dbType = this.selectedType();
      const notifications = await this.notificationsService.filterNotificationsByType(dbType);
      this.allNotifications.set(notifications as ExtendedNotificationItem[]);
    } catch (error) {
      console.error('Error filtering notifications:', error);
    } finally {
      this.loading.set(false);
    }
  }

  toggleUnreadFilter() {
    // Just toggle the signal, filtering happens in computed
  }

  async markAsRead(notificationId: string) {
    try {
      await this.notificationsService.markAsRead(notificationId);
      // Update local state
      this.allNotifications.update(notifications =>
        notifications.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async markAllAsRead() {
    try {
      await this.notificationsService.markAllAsRead();
      // Update local state
      this.allNotifications.update(notifications =>
        notifications.map(n => ({ ...n, read: true }))
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }

  async deleteNotification(notificationId: string) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta notificación?')) {
      return;
    }

    try {
      await this.notificationsService.deleteNotification(notificationId);
      // Update local state
      this.allNotifications.update(notifications =>
        notifications.filter(n => n.id !== notificationId)
      );
    } catch (error) {
      console.error('Error deleting notification:', error);
      alert('Error al eliminar la notificación');
    }
  }

  async deleteAllRead() {
    if (!confirm('¿Estás seguro de que quieres eliminar todas las notificaciones leídas?')) {
      return;
    }

    try {
      await this.notificationsService.deleteAllRead();
      // Update local state
      this.allNotifications.update(notifications =>
        notifications.filter(n => !n.read)
      );
    } catch (error) {
      console.error('Error deleting read notifications:', error);
      alert('Error al eliminar las notificaciones');
    }
  }

  async handleNotificationClick(notification: NotificationItem) {
    if (!notification.read) {
      await this.markAsRead(notification.id);
    }

    if (notification.actionUrl) {
      await this.router.navigate([notification.actionUrl]);
    }
  }

  getNotificationIcon(type: NotificationItem['type']): string {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'info':
      default:
        return 'ℹ️';
    }
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Ahora mismo';
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} h`;
    if (diffInSeconds < 604800) return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
    if (diffInSeconds < 2592000) return `Hace ${Math.floor(diffInSeconds / 604800)} semanas`;
    return `Hace ${Math.floor(diffInSeconds / 2592000)} meses`;
  }

  renderMetadata(notification: ExtendedNotificationItem): string {
    const metadata = notification.metadata;
    if (!metadata || !notification.dbType) return '';

    switch (notification.dbType) {
      case 'new_booking_for_owner':
        return `Inquilino: ${metadata['renterName'] || 'N/A'} • Auto: ${metadata['carTitle'] || 'N/A'}`;

      case 'booking_cancelled_for_owner':
        return `Inquilino: ${metadata['renterName'] || 'N/A'} • Auto: ${metadata['carTitle'] || 'N/A'}`;

      case 'booking_cancelled_for_renter':
        return `Propietario: ${metadata['ownerName'] || 'N/A'} • Auto: ${metadata['carTitle'] || 'N/A'}`;

      case 'new_chat_message':
        if (metadata['sender_name'] && metadata['preview']) {
          return `${metadata['sender_name']}: "${metadata['preview']}"`;
        }
        return metadata['sender_name'] ? `De: ${metadata['sender_name']}` : '';

      case 'payment_successful':
      case 'payout_successful':
        if (metadata['amount'] && metadata['currency']) {
          const amount = Number(metadata['amount']).toLocaleString('es-AR');
          return `Monto: ${metadata['currency']} ${amount}`;
        }
        return '';

      case 'inspection_reminder':
        const inspectionType = metadata['inspectionType'] === 'pickup' ? 'Recogida' : 'Devolución';
        return `Tipo: ${inspectionType} • Auto: ${metadata['carTitle'] || 'N/A'}`;

      case 'generic_announcement':
      default:
        return '';
    }
  }

  goBack() {
    void this.router.navigate(['/dashboard']);
  }
}

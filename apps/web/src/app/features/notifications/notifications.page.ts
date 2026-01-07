import {Component, OnInit, OnDestroy, inject, signal, computed,
  ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  NotificationsService,
  NotificationItem,
} from '@core/services/infrastructure/user-notifications.service';

type ExtendedNotificationItem = NotificationItem & { dbType?: string };

/**
 * 🔔 Página de notificaciones
 * Lista completa de notificaciones con filtros y acciones
 */
@Component({
  selector: 'app-notifications-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink],
  styles: [
    `
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
    `,
  ],
  template: `
    <div class="min-h-screen bg-surface-base">
      <!-- Header -->
      <div class="sticky top-0 z-10 bg-surface-raised shadow">
        <div class="mx-auto max-w-6xl px-3 py-3 sm:px-4 sm:py-4">
          <!-- Top row: back + title + preferences -->
          <div class="flex items-center justify-between gap-2">
            <div class="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <button
                (click)="goBack()"
                class="flex-shrink-0 rounded-lg p-1.5 hover:bg-surface-raised sm:p-2"
                type="button"
                aria-label="Volver"
              >
                <svg
                  class="h-5 w-5 sm:h-6 sm:w-6 text-text-secondary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <div class="min-w-0 flex-1">
                <h1 class="truncate text-lg font-bold text-text-primary sm:text-2xl">
                  Notificaciones
                  @if (unreadCount() > 0) {
                    <span class="ml-1 text-base text-cta-default sm:ml-2 sm:text-lg"
                      >({{ unreadCount() }})</span
                    >
                  }
                </h1>
                <p class="hidden text-sm text-text-secondary sm:block">
                  Todas tus notificaciones en un solo lugar
                </p>
              </div>
            </div>
            <a
              routerLink="/notifications/preferences"
              class="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-surface-raised px-2.5 py-1.5 text-xs font-medium text-text-primary hover:bg-surface-hover sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
              aria-label="Preferencias de notificaciones"
            >
              <svg class="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span class="hidden sm:inline">Preferencias</span>
            </a>
          </div>

          <!-- Filters row -->
          <div class="mt-3 flex flex-col gap-3 sm:mt-4 sm:flex-row sm:flex-wrap sm:items-center">
            <!-- Filters group -->
            <div class="flex flex-wrap items-center gap-2 sm:gap-3">
              <!-- Type filter -->
              <div class="flex min-w-0 flex-1 items-center gap-1.5 sm:flex-initial sm:gap-2">
                <label
                  for="typeFilter"
                  class="flex-shrink-0 text-xs font-medium text-text-primary sm:text-sm"
                >
                  Tipo:
                </label>
                <select
                  id="typeFilter"
                  [(ngModel)]="selectedType"
                  (ngModelChange)="onFilterChange()"
                  class="min-w-0 flex-1 truncate rounded-lg border border-border-muted bg-surface-raised px-2 py-1.5 text-xs focus:border-cta-default focus:outline-none focus:ring-2 focus:ring-cta-default sm:flex-initial sm:px-3 sm:py-2 sm:text-sm"
                >
                  <option value="all">Todas</option>
                  <option value="new_booking_for_owner">Reservas</option>
                  <option value="booking_cancelled_for_owner">Cancel. (prop.)</option>
                  <option value="booking_cancelled_for_renter">Cancel. (inq.)</option>
                  <option value="new_chat_message">Mensajes</option>
                  <option value="payment_successful">Pagos</option>
                  <option value="payout_successful">Cobros</option>
                  <option value="inspection_reminder">Recordatorios</option>
                  <option value="generic_announcement">Anuncios</option>
                </select>
              </div>

              <!-- Unread filter -->
              <label class="flex flex-shrink-0 cursor-pointer items-center gap-1.5 sm:gap-2">
                <input
                  type="checkbox"
                  [(ngModel)]="showOnlyUnread"
                  (ngModelChange)="toggleUnreadFilter()"
                  class="h-4 w-4 rounded border-border-muted text-cta-default focus:ring-2 focus:ring-cta-default"
                />
                <span class="whitespace-nowrap text-xs font-medium text-text-primary sm:text-sm">
                  Solo no leídas
                </span>
              </label>
            </div>

            <!-- Action buttons -->
            <div class="flex flex-wrap gap-2 sm:ml-auto">
              @if (unreadCount() > 0) {
                <button
                  (click)="markAllAsRead()"
                  class="flex-1 whitespace-nowrap rounded-lg bg-cta-default px-3 py-1.5 text-xs font-medium text-cta-text hover:bg-cta-default sm:flex-initial sm:px-4 sm:py-2 sm:text-sm"
                  type="button"
                >
                  <span class="sm:hidden">Marcar leídas</span>
                  <span class="hidden sm:inline">Marcar todas como leídas</span>
                </button>
              }
              @if (hasReadNotifications()) {
                <button
                  (click)="deleteAllRead()"
                  class="flex-1 whitespace-nowrap rounded-lg border border-border-muted px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-surface-base sm:flex-initial sm:px-4 sm:py-2 sm:text-sm"
                  type="button"
                >
                  <span class="sm:hidden">Eliminar</span>
                  <span class="hidden sm:inline">Eliminar leídas</span>
                </button>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="mx-auto max-w-6xl p-3 sm:p-4">
        @if (loading()) {
          <!-- Loading state -->
          <div class="flex h-64 items-center justify-center sm:h-96">
            <div class="text-center">
              <div
                class="mb-4 inline-block h-10 w-10 animate-spin rounded-full border-4 border-border-muted border-t-blue-500 sm:h-12 sm:w-12"
              ></div>
              <p class="text-sm text-text-secondary sm:text-base">Cargando notificaciones...</p>
            </div>
          </div>
        } @else if (filteredNotifications().length === 0) {
          <!-- Empty state -->
          <div class="flex h-64 flex-col items-center justify-center px-4 sm:h-96">
            <div
              class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-raised sm:h-20 sm:w-20"
            >
              <svg
                class="h-8 w-8 text-text-muted sm:h-10 sm:w-10"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </div>
            <h3 class="mb-2 text-base font-semibold text-text-primary sm:text-lg">
              No hay notificaciones
            </h3>
            <p class="text-center text-xs text-text-secondary sm:text-sm">
              @if (showOnlyUnread()) {
                No tienes notificaciones sin leer
              } @else {
                Cuando recibas notificaciones, aparecerán aquí
              }
            </p>
          </div>
        } @else {
          <!-- Notifications list -->
          <div class="space-y-4 sm:space-y-6">
            @if (!showOnlyUnread()) {
              <!-- Unread notifications section -->
              @if (unreadNotifications().length > 0) {
                <div>
                  <h2
                    class="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary sm:mb-3 sm:text-sm"
                  >
                    No leídas ({{ unreadNotifications().length }})
                  </h2>
                  <div class="space-y-2 sm:space-y-3">
                    @for (notification of unreadNotifications(); track notification.id) {
                      <div
                        class="notification-card group relative rounded-lg border-l-4 border-cta-default bg-cta-default/10 p-3 shadow transition-all hover:shadow-md sm:p-4"
                      >
                        <div class="flex gap-2.5 sm:gap-4">
                          <!-- Icon -->
                          <div class="flex-shrink-0">
                            <div
                              class="flex h-8 w-8 items-center justify-center rounded-full text-lg sm:h-10 sm:w-10 sm:text-2xl"
                              [ngClass]="{
                                'bg-success-light/20':
                                  notification.type === 'success',
                                'bg-warning-bg-hover':
                                  notification.type === 'warning',
                                'bg-error-bg-hover':
                                  notification.type === 'error',
                                'bg-cta-default/20':
                                  notification.type === 'info',
                              }"
                            >
                              {{ getNotificationIcon(notification.type) }}
                            </div>
                          </div>

                          <!-- Content -->
                          <div class="min-w-0 flex-1">
                            <div class="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                              <div class="min-w-0 flex-1">
                                <h3 class="text-sm font-semibold text-text-primary sm:text-base">
                                  {{ notification.title }}
                                </h3>
                                <p class="mt-0.5 text-xs text-text-primary sm:mt-1 sm:text-sm">
                                  {{ notification.message }}
                                </p>

                                <!-- Metadata -->
                                @if (notification.metadata) {
                                  <div
                                    class="mt-1 truncate text-xs text-text-secondary sm:mt-2 sm:text-xs"
                                  >
                                    {{ renderMetadata(notification) }}
                                  </div>
                                }

                                <!-- Timestamp -->
                                <p class="mt-1 text-xs text-text-secondary sm:mt-2 sm:text-xs">
                                  {{ getTimeAgo(notification.createdAt) }}
                                </p>
                              </div>
                            </div>

                            <!-- Actions -->
                            <div class="mt-2 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
                              @if (notification.actionUrl) {
                                <button
                                  (click)="handleNotificationClick(notification)"
                                  class="rounded-lg bg-cta-default px-2.5 py-1 text-xs font-medium text-cta-text hover:bg-cta-default sm:px-3 sm:py-1.5 sm:text-xs"
                                  type="button"
                                >
                                  Ver detalles
                                </button>
                              }
                              <button
                                (click)="markAsRead(notification.id)"
                                class="rounded-lg border border-border-muted bg-surface-raised px-2.5 py-1 text-xs font-medium text-text-primary hover:bg-surface-base sm:px-3 sm:py-1.5 sm:text-xs"
                                type="button"
                              >
                                <span class="sm:hidden">Leida</span>
                                <span class="hidden sm:inline">Marcar como leida</span>
                              </button>
                            </div>
                          </div>

                          <!-- Delete button (always visible on mobile, hover on desktop) -->
                          <button
                            (click)="deleteNotification(notification.id)"
                            class="absolute right-1.5 top-1.5 rounded-lg p-1 text-text-muted opacity-60 transition-opacity hover:bg-surface-hover hover:text-text-secondary sm:right-2 sm:top-2 sm:p-1.5 sm:opacity-0 sm:group-hover:opacity-100"
                            type="button"
                            title="Eliminar"
                          >
                            <svg
                              class="h-4 w-4 sm:h-5 sm:w-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
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
                  <h2
                    class="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary sm:mb-3 sm:text-sm"
                  >
                    Leídas ({{ readNotifications().length }})
                  </h2>
                  <div class="space-y-2 sm:space-y-3">
                    @for (notification of readNotifications(); track notification.id) {
                      <div
                        class="notification-card group relative rounded-lg border border-border-default bg-surface-raised p-3 shadow transition-all hover:shadow-md sm:p-4"
                      >
                        <div class="flex gap-2.5 sm:gap-4">
                          <!-- Icon -->
                          <div class="flex-shrink-0">
                            <div
                              class="flex h-8 w-8 items-center justify-center rounded-full text-lg opacity-60 sm:h-10 sm:w-10 sm:text-2xl"
                              [ngClass]="{
                                'bg-success-light/20': notification.type === 'success',
                                'bg-warning-bg-hover': notification.type === 'warning',
                                'bg-error-bg-hover': notification.type === 'error',
                                'bg-cta-default/20': notification.type === 'info',
                              }"
                            >
                              {{ getNotificationIcon(notification.type) }}
                            </div>
                          </div>

                          <!-- Content -->
                          <div class="min-w-0 flex-1">
                            <div class="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                              <div class="min-w-0 flex-1">
                                <h3 class="text-sm font-semibold text-text-primary sm:text-base">
                                  {{ notification.title }}
                                </h3>
                                <p class="mt-0.5 text-xs text-text-primary sm:mt-1 sm:text-sm">
                                  {{ notification.message }}
                                </p>

                                <!-- Metadata -->
                                @if (notification.metadata) {
                                  <div
                                    class="mt-1 truncate text-xs text-text-secondary sm:mt-2 sm:text-xs"
                                  >
                                    {{ renderMetadata(notification) }}
                                  </div>
                                }

                                <!-- Timestamp -->
                                <p class="mt-1 text-xs text-text-secondary sm:mt-2 sm:text-xs">
                                  {{ getTimeAgo(notification.createdAt) }}
                                </p>
                              </div>
                            </div>

                            <!-- Actions -->
                            @if (notification.actionUrl) {
                              <div class="mt-2 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
                                <button
                                  (click)="handleNotificationClick(notification)"
                                  class="rounded-lg bg-surface-raised px-2.5 py-1 text-xs font-medium text-text-primary hover:bg-surface-hover sm:px-3 sm:py-1.5 sm:text-xs"
                                  type="button"
                                >
                                  Ver detalles
                                </button>
                              </div>
                            }
                          </div>

                          <!-- Delete button (always visible on mobile, hover on desktop) -->
                          <button
                            (click)="deleteNotification(notification.id)"
                            class="absolute right-1.5 top-1.5 rounded-lg p-1 text-text-muted opacity-60 transition-opacity hover:bg-surface-hover hover:text-text-secondary sm:right-2 sm:top-2 sm:p-1.5 sm:opacity-0 sm:group-hover:opacity-100"
                            type="button"
                            title="Eliminar"
                          >
                            <svg
                              class="h-4 w-4 sm:h-5 sm:w-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
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
              <div class="space-y-2 sm:space-y-3">
                @for (notification of unreadNotifications(); track notification.id) {
                  <div
                    class="notification-card group relative rounded-lg border-l-4 border-cta-default bg-cta-default/10 p-3 shadow transition-all hover:shadow-md sm:p-4"
                  >
                    <div class="flex gap-2.5 sm:gap-4">
                      <!-- Icon -->
                      <div class="flex-shrink-0">
                        <div
                          class="flex h-8 w-8 items-center justify-center rounded-full text-lg sm:h-10 sm:w-10 sm:text-2xl"
                          [ngClass]="{
                            'bg-success-light/20': notification.type === 'success',
                            'bg-warning-bg-hover': notification.type === 'warning',
                            'bg-error-bg-hover': notification.type === 'error',
                            'bg-cta-default/20': notification.type === 'info',
                          }"
                        >
                          {{ getNotificationIcon(notification.type) }}
                        </div>
                      </div>

                      <!-- Content -->
                      <div class="min-w-0 flex-1">
                        <div class="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                          <div class="min-w-0 flex-1">
                            <h3 class="text-sm font-semibold text-text-primary sm:text-base">
                              {{ notification.title }}
                            </h3>
                            <p class="mt-0.5 text-xs text-text-primary sm:mt-1 sm:text-sm">
                              {{ notification.message }}
                            </p>

                            <!-- Metadata -->
                            @if (notification.metadata) {
                              <div class="mt-1 truncate text-xs text-text-secondary sm:mt-2 sm:text-xs">
                                {{ renderMetadata(notification) }}
                              </div>
                            }

                            <!-- Timestamp -->
                            <p class="mt-1 text-xs text-text-secondary sm:mt-2 sm:text-xs">
                              {{ getTimeAgo(notification.createdAt) }}
                            </p>
                          </div>
                        </div>

                        <!-- Actions -->
                        <div class="mt-2 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
                          @if (notification.actionUrl) {
                            <button
                              (click)="handleNotificationClick(notification)"
                              class="rounded-lg bg-cta-default px-2.5 py-1 text-xs font-medium text-cta-text hover:bg-cta-default sm:px-3 sm:py-1.5 sm:text-xs"
                              type="button"
                            >
                              Ver detalles
                            </button>
                          }
                          <button
                            (click)="markAsRead(notification.id)"
                            class="rounded-lg border border-border-muted bg-surface-raised px-2.5 py-1 text-xs font-medium text-text-primary hover:bg-surface-base sm:px-3 sm:py-1.5 sm:text-xs"
                            type="button"
                          >
                            <span class="sm:hidden">Leida</span>
                            <span class="hidden sm:inline">Marcar como leida</span>
                          </button>
                        </div>
                      </div>

                      <!-- Delete button (always visible on mobile, hover on desktop) -->
                      <button
                        (click)="deleteNotification(notification.id)"
                        class="absolute right-1.5 top-1.5 rounded-lg p-1 text-text-muted opacity-60 transition-opacity hover:bg-surface-hover hover:text-text-secondary sm:right-2 sm:top-2 sm:p-1.5 sm:opacity-0 sm:group-hover:opacity-100"
                        type="button"
                        title="Eliminar"
                      >
                        <svg class="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
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
export class NotificationsPage implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly notificationsService = inject(NotificationsService);

  // Realtime subscription cleanup
  private unsubscribeRealtime?: () => void;

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
      notifications = notifications.filter((n) => n.dbType === this.selectedType());
    }

    // Filter by read status
    if (this.showOnlyUnread()) {
      notifications = notifications.filter((n) => !n.read);
    }

    return notifications;
  });

  unreadNotifications = computed(() => {
    return this.filteredNotifications().filter((n) => !n.read);
  });

  readNotifications = computed(() => {
    return this.filteredNotifications().filter((n) => n.read);
  });

  unreadCount = computed(() => {
    return this.unreadNotifications().length;
  });

  hasReadNotifications = computed(() => {
    return this.allNotifications().some((n) => n.read);
  });

  async ngOnInit() {
    await this.loadNotifications();

    // Suscribirse a cambios en tiempo real
    this.unsubscribeRealtime = this.notificationsService.onChange(() => {
      void this.loadNotifications();
    });
  }

  ngOnDestroy(): void {
    this.unsubscribeRealtime?.();
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
      this.allNotifications.update((notifications) =>
        notifications.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async markAllAsRead() {
    try {
      await this.notificationsService.markAllAsRead();
      // Update local state
      this.allNotifications.update((notifications) =>
        notifications.map((n) => ({ ...n, read: true })),
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }

  async deleteNotification(notificationId: string) {
    try {
      await this.notificationsService.deleteNotification(notificationId);
      // Update local state
      this.allNotifications.update((notifications) =>
        notifications.filter((n) => n.id !== notificationId),
      );
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }

  async deleteAllRead() {
    if (!confirm('¿Estás seguro de que quieres eliminar todas las notificaciones leídas?')) {
      return;
    }

    try {
      await this.notificationsService.deleteAllRead();
      // Update local state
      this.allNotifications.update((notifications) => notifications.filter((n) => !n.read));
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
      await this.router.navigateByUrl(notification.actionUrl);
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
      case 'payout_successful': {
        if (metadata['amount'] && metadata['currency']) {
          const amount = Number(metadata['amount']).toLocaleString('es-AR');
          return `Monto: ${metadata['currency']} ${amount}`;
        }
        return '';
      }

      case 'inspection_reminder': {
        const inspectionType = metadata['inspectionType'] === 'pickup' ? 'Recogida' : 'Devolución';
        return `Tipo: ${inspectionType} • Auto: ${metadata['carTitle'] || 'N/A'}`;
      }

      case 'generic_announcement':
      default:
        return '';
    }
  }

  goBack() {
    void this.router.navigate(['/dashboard']);
  }
}

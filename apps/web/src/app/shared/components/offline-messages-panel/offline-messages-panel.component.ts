import { Component, inject, signal, output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  OfflineMessagesService,
  OfflineMessage,
} from '../../../core/services/offline-messages.service';
import { MessagesService } from '../../../core/services/messages.service';
import { injectSupabase } from '../../../core/services/supabase-client.service';

/**
 * 📬 Panel de administración de mensajes offline
 * Permite ver, reintentar y eliminar mensajes pendientes/fallidos
 */
@Component({
  selector: 'app-offline-messages-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Backdrop -->
    <div (click)="close.emit()" class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"></div>

    <!-- Panel -->
    <div
      class="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto bg-surface-raised shadow-xl dark:bg-gray-800"
    >
      <!-- Header -->
      <div
        class="sticky top-0 z-10 border-b border-gray-200 bg-surface-raised px-4 py-4 dark:border-gray-700 dark:bg-gray-800"
      >
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-text-inverse">Mensajes pendientes</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ pendingMessages().length }} pendiente{{
                pendingMessages().length !== 1 ? 's' : ''
              }}, {{ failedMessages().length }} fallido{{
                failedMessages().length !== 1 ? 's' : ''
              }}
            </p>
          </div>
          <button
            (click)="close.emit()"
            class="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
            type="button"
          >
            <svg
              class="h-6 w-6 text-gray-500 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="p-4">
        @if (loading()) {
          <div class="flex items-center justify-center py-8">
            <div
              class="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-500"
            ></div>
          </div>
        } @else if (pendingMessages().length === 0 && failedMessages().length === 0) {
          <!-- Empty state -->
          <div class="py-12 text-center">
            <svg
              class="mx-auto h-16 w-16 text-gray-400 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-text-inverse">
              No hay mensajes pendientes
            </h3>
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Todos tus mensajes se han enviado correctamente
            </p>
          </div>
        } @else {
          <!-- Pending messages -->
          @if (pendingMessages().length > 0) {
            <div class="mb-6">
              <h3 class="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Pendientes ({{ pendingMessages().length }})
              </h3>
              <div class="space-y-3">
                @for (msg of pendingMessages(); track msg.id) {
                  <div
                    class="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20"
                  >
                    <div class="mb-2 flex items-start justify-between">
                      <div class="flex-1">
                        <p class="text-sm font-medium text-gray-900 dark:text-text-inverse">
                          {{ truncateMessage(msg.body, 50) }}
                        </p>
                        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {{ formatTimestamp(msg.timestamp) }}
                        </p>
                        @if (msg.retries > 0) {
                          <p class="mt-1 text-xs text-yellow-700 dark:text-yellow-300">
                            Reintentos: {{ msg.retries }}/5
                          </p>
                        }
                      </div>
                      <button
                        (click)="retryMessage(msg)"
                        [disabled]="retrying().has(msg.id)"
                        class="ml-2 rounded-lg bg-yellow-600 px-3 py-1 text-xs font-medium text-text-inverse hover:bg-yellow-700 disabled:cursor-not-allowed disabled:opacity-50"
                        type="button"
                      >
                        @if (retrying().has(msg.id)) {
                          Reintentando...
                        } @else {
                          Reintentar
                        }
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Failed messages -->
          @if (failedMessages().length > 0) {
            <div>
              <div class="mb-3 flex items-center justify-between">
                <h3 class="text-sm font-semibold text-red-700 dark:text-red-400">
                  Fallidos ({{ failedMessages().length }})
                </h3>
                <button
                  (click)="clearFailed()"
                  class="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  type="button"
                >
                  Limpiar
                </button>
              </div>
              <div class="space-y-3">
                @for (msg of failedMessages(); track msg.id) {
                  <div
                    class="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
                  >
                    <div class="mb-2">
                      <p class="text-sm font-medium text-gray-900 dark:text-text-inverse">
                        {{ truncateMessage(msg.body, 50) }}
                      </p>
                      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {{ formatTimestamp(msg.timestamp) }}
                      </p>
                      <p class="mt-1 text-xs text-red-700 dark:text-red-300">
                        Falló después de {{ msg.retries }} intentos
                      </p>
                    </div>
                    <div class="flex gap-2">
                      <button
                        (click)="retryMessage(msg)"
                        [disabled]="retrying().has(msg.id)"
                        class="flex-1 rounded-lg bg-red-600 px-3 py-1 text-xs font-medium text-text-inverse hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        type="button"
                      >
                        @if (retrying().has(msg.id)) {
                          Reintentando...
                        } @else {
                          Reintentar
                        }
                      </button>
                      <button
                        (click)="removeMessage(msg.id)"
                        class="rounded-lg border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
                        type="button"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        }
      </div>
    </div>
  `,
})
export class OfflineMessagesPanelComponent implements OnInit, OnDestroy {
  private readonly offlineMessages = inject(OfflineMessagesService);
  private readonly messagesService = inject(MessagesService);
  private readonly supabase = injectSupabase();

  readonly close = output<void>();

  readonly loading = signal(true);
  readonly pendingMessages = signal<OfflineMessage[]>([]);
  readonly failedMessages = signal<OfflineMessage[]>([]);
  readonly retrying = signal<Set<string>>(new Set());
  private refreshInterval?: ReturnType<typeof setInterval>;

  async ngOnInit() {
    await this.loadMessages();

    // Refresh every 3 seconds
    this.refreshInterval = setInterval(() => {
      this.loadMessages().catch(() => {
        // Silently fail
      });
    }, 3000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  async loadMessages() {
    try {
      this.loading.set(true);
      const [pending, failed] = await Promise.all([
        this.offlineMessages.getPendingMessages(),
        this.offlineMessages.getFailedMessages(),
      ]);

      // Separate pending from failed
      const pendingList = pending.filter((msg) => msg.retries < 5);
      const failedList = failed;

      this.pendingMessages.set(pendingList);
      this.failedMessages.set(failedList);
    } catch (error) {
      console.error('Error loading offline messages:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async retryMessage(message: OfflineMessage) {
    this.retrying.update((set) => new Set(set).add(message.id));

    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      // Attempt to send
      const { error } = await this.supabase.from('messages').insert({
        booking_id: message.bookingId ?? null,
        car_id: message.carId ?? null,
        sender_id: user.id,
        recipient_id: message.recipientId,
        body: message.body,
      });

      if (error) throw error;

      // Success: remove from queue
      await this.offlineMessages.removeMessage(message.id);
      await this.loadMessages();
    } catch (error) {
      // Increment retry counter
      await this.offlineMessages.incrementRetry(message.id);
      await this.loadMessages();
    } finally {
      this.retrying.update((set) => {
        const newSet = new Set(set);
        newSet.delete(message.id);
        return newSet;
      });
    }
  }

  async removeMessage(messageId: string) {
    await this.offlineMessages.removeMessage(messageId);
    await this.loadMessages();
  }

  async clearFailed() {
    const count = await this.offlineMessages.removeFailedMessages();
    await this.loadMessages();
    console.log(`Removed ${count} failed messages`);
  }

  truncateMessage(body: string, maxLength: number): string {
    if (body.length <= maxLength) return body;
    return body.substring(0, maxLength) + '...';
  }

  formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Hace un momento';
    if (minutes < 60) return `Hace ${minutes}m`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days < 7) return `Hace ${days}d`;

    return date.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

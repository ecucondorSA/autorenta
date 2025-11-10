import { Component, OnInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MessagesService, Message } from '../../core/services/messages.service';
import { AuthService } from '../../core/services/auth.service';
import { UnreadMessagesService } from '../../core/services/unread-messages.service';
import { OfflineMessagesIndicatorComponent } from '../../shared/components/offline-messages-indicator/offline-messages-indicator.component';
import {
  RealtimeConnectionService,
  ConnectionStatus,
} from '../../core/services/realtime-connection.service';
import type { ConversationDTO } from '../../core/repositories/messages.repository';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * 📬 Bandeja de entrada de mensajes
 * Muestra todas las conversaciones del usuario
 */
@Component({
  selector: 'app-inbox',
  standalone: true,
  imports: [CommonModule, OfflineMessagesIndicatorComponent],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <!-- Header -->
      <div class="sticky top-0 z-10 bg-surface-raised shadow dark:bg-gray-800">
        <div class="mx-auto max-w-4xl px-4 py-4">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-gray-900 dark:text-text-inverse">Mensajes</h1>
              <p class="text-sm text-gray-500 dark:text-gray-300 dark:text-gray-300">
                {{ conversations().length }} conversaciones
              </p>
            </div>
            <app-offline-messages-indicator />
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="mx-auto max-w-4xl p-4">
        @if (loading()) {
          <div class="flex h-96 items-center justify-center">
            <div class="text-center">
              <div
                class="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-500"
              ></div>
              <p class="text-gray-600 dark:text-gray-300 dark:text-gray-300">
                Cargando conversaciones...
              </p>
            </div>
          </div>
        } @else if (error()) {
          <div class="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
            <p class="text-sm text-red-800 dark:text-red-200">{{ error() }}</p>
          </div>
        } @else if (conversations().length === 0) {
          <!-- Empty state -->
          <div class="py-16 text-center">
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
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-text-inverse">
              No hay mensajes
            </h3>
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-300 dark:text-gray-300">
              Cuando alguien te escriba, aparecerá aquí
            </p>
          </div>
        } @else {
          <!-- Conversations list -->
          <div class="space-y-2">
            @for (conv of conversations(); track conv.id) {
              <button
                (click)="openConversation(conv)"
                class="group w-full rounded-lg border border-gray-200 bg-surface-raised p-4 text-left transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                type="button"
              >
                <div class="flex items-start gap-4">
                  <!-- Avatar -->
                  <div class="flex-shrink-0">
                    @if (conv.otherUserAvatar) {
                      <img
                        [src]="conv.otherUserAvatar"
                        [alt]="conv.otherUserName"
                        class="h-12 w-12 rounded-full object-cover"
                      />
                    } @else {
                      <div
                        class="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-cta-default to-purple-600 text-text-inverse font-semibold"
                      >
                        {{ conv.otherUserName.charAt(0).toUpperCase() }}
                      </div>
                    }
                  </div>

                  <!-- Content -->
                  <div class="min-w-0 flex-1">
                    <div class="mb-1 flex items-start justify-between gap-2">
                      <div>
                        <p class="font-semibold text-gray-900 dark:text-text-inverse">
                          {{ conv.otherUserName }}
                        </p>
                        @if (conv.carBrand) {
                          <p class="text-sm text-gray-500 dark:text-gray-300 dark:text-gray-300">
                            {{ conv.carBrand }} {{ conv.carModel }} {{ conv.carYear }}
                          </p>
                        }
                      </div>
                      @if (conv.unreadCount > 0) {
                        <span
                          class="flex h-6 w-6 items-center justify-center rounded-full bg-cta-default text-cta-text"
                        >
                          {{ conv.unreadCount }}
                        </span>
                      }
                    </div>
                    <p
                      class="truncate text-sm"
                      [class.font-semibold]="conv.unreadCount > 0"
                      [class.text-gray-900]="conv.unreadCount > 0"
                      [class.dark:text-text-inverse]="conv.unreadCount > 0"
                      [class.text-gray-600
                      dark:text-gray-300]="conv.unreadCount === 0"
                      [class.dark:text-gray-400
                      dark:text-gray-300]="conv.unreadCount === 0"
                    >
                      {{ conv.lastMessage }}
                    </p>
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-300 dark:text-gray-300">
                      {{ formatDate(conv.lastMessageAt) }}
                    </p>
                  </div>
                </div>
              </button>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class InboxPage implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly messagesService = inject(MessagesService);
  private readonly authService = inject(AuthService);
  private readonly unreadMessagesService = inject(UnreadMessagesService);
  private readonly realtimeConnection = inject(RealtimeConnectionService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly conversations = signal<ConversationDTO[]>([]);
  readonly connectionStatus = signal<ConnectionStatus>('disconnected');

  private realtimeChannel?: RealtimeChannel;

  async ngOnInit(): Promise<void> {
    const session = this.authService.session$();
    if (!session) {
      this.router.navigate(['/auth/login']);
      return;
    }

    await this.loadConversations();
    this.subscribeToConversations(session.user.id);
  }

  ngOnDestroy(): void {
    // Limpiar ambos canales
    this.realtimeConnection.unsubscribe('inbox-conversations-sender');
    this.realtimeConnection.unsubscribe('inbox-conversations-recipient');
  }

  /**
   * Suscribe a cambios en tiempo real de mensajes
   * Actualiza solo la conversación afectada en lugar de refetch completo
   * Usa dos canales separados para sender y recipient porque Supabase Realtime
   * no soporta OR en filtros directamente
   */
  private subscribeToConversations(userId: string): void {
    // Canal para mensajes donde el usuario es el remitente
    const senderChannel = this.realtimeConnection.subscribeWithRetry<Message>(
      'inbox-conversations-sender',
      {
        event: '*', // INSERT, UPDATE
        schema: 'public',
        table: 'messages',
        filter: `sender_id=eq.${userId}`,
      },
      async (payload) => {
        await this.handleMessageChange(payload.new as Message, userId);
      },
      (status) => {
        this.connectionStatus.set(status);
      },
    );

    // Canal para mensajes donde el usuario es el destinatario
    const recipientChannel = this.realtimeConnection.subscribeWithRetry<Message>(
      'inbox-conversations-recipient',
      {
        event: '*', // INSERT, UPDATE
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${userId}`,
      },
      async (payload) => {
        await this.handleMessageChange(payload.new as Message, userId);
      },
      (status) => {
        this.connectionStatus.set(status);
      },
    );

    // Guardar referencia al primer canal para cleanup (ambos se limpian igual)
    this.realtimeChannel = senderChannel;
  }

  /**
   * Maneja cambios en mensajes recibidos via realtime
   * Actualiza solo la conversación afectada sin refetch completo (optimizado ~60% menos queries)
   */
  private async handleMessageChange(message: Message, userId: string): Promise<void> {
    const conversationId = message.car_id || message.booking_id;
    if (!conversationId) return;

    const otherUserId = message.sender_id === userId ? message.recipient_id : message.sender_id;
    const conversationKey = `${conversationId}_${otherUserId}`;

    // Update conversation in-place without full refetch
    this.conversations.update((convs) => {
      const index = convs.findIndex((c) => c.id === conversationKey);

      if (index >= 0) {
        // Update existing conversation with new message data
        const updated = [...convs];
        const existingConv = updated[index];

        // Update conversation fields with new message info
        updated[index] = {
          ...existingConv,
          lastMessage: message.body,
          lastMessageAt: new Date(message.created_at),
          // Increment unread count if message is from other user and not read
          unreadCount:
            message.sender_id !== userId && !message.read_at
              ? existingConv.unreadCount + 1
              : existingConv.unreadCount,
        };

        // Reorder by last message time
        return updated.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
      } else {
        // New conversation - need to fetch full conversation details
        // This is rare (first message in a new conversation)
        this.fetchAndAddNewConversation(userId, conversationKey, message);
        return convs;
      }
    });
  }

  /**
   * Fetches and adds a new conversation (only called for first message in new conversation)
   */
  private async fetchAndAddNewConversation(
    userId: string,
    conversationKey: string,
    message: Message,
  ): Promise<void> {
    try {
      const result = await this.messagesService.listConversations(userId, {
        limit: 1,
        offset: 0,
        carId: message.car_id || undefined,
        bookingId: message.booking_id || undefined,
      });

      const conv = result.conversations.find((c) => c.id === conversationKey);
      if (!conv) return;

      this.conversations.update((convs) => [conv, ...convs]);
    } catch (err) {
      console.error('Error fetching new conversation:', err);
    }
  }

  private async loadConversations(): Promise<void> {
    try {
      this.loading.set(true);
      const userId = this.authService.session$()?.user.id;
      if (!userId) return;

      // Usar MessagesService que ahora usa MessagesRepository
      const result = await this.messagesService.listConversations(userId, {
        limit: 50,
        offset: 0,
        archived: false,
      });

      this.conversations.set(result.conversations);
    } catch (err) {
      console.error('Error loading conversations:', err);
      this.error.set('Error inesperado');
    } finally {
      this.loading.set(false);
    }
  }

  openConversation(conv: ConversationDTO): void {
    const params: any = {
      userId: conv.otherUserId,
      userName: conv.otherUserName,
    };

    if (conv.carId) {
      params.carId = conv.carId;
      params.carName = `${conv.carBrand} ${conv.carModel}`;

      // Mark car conversation as read
      this.unreadMessagesService.markConversationAsRead(conv.carId, 'car');
    } else if (conv.bookingId) {
      params.bookingId = conv.bookingId;

      // Mark booking conversation as read
      this.unreadMessagesService.markConversationAsRead(conv.bookingId, 'booking');
    }

    this.router.navigate(['/messages/chat'], { queryParams: params });
  }

  formatDate(date: Date): string {
    // Usar método del servicio para formateo consistente
    return this.messagesService.formatRelativeDate(date);
  }
}

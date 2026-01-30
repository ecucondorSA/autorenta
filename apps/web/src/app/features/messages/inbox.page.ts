import { LoggerService } from '@core/services/infrastructure/logger.service';

import {
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { ConversationDTO } from '@core/repositories/messages.repository';
import { AuthService } from '@core/services/auth/auth.service';
import { Message, MessagesService } from '@core/services/bookings/messages.service';
import {
  ConnectionStatus,
  RealtimeConnectionService,
} from '@core/services/infrastructure/realtime-connection.service';
import { UnreadMessagesService } from '@core/services/bookings/unread-messages.service';
import { BreakpointService } from '@core/services/ui/breakpoint.service';
import { ChatThreadComponent } from './components/chat-thread.component';

/**
 * 📬 Bandeja de entrada de mensajes
 * Muestra todas las conversaciones del usuario
 */
@Component({
  selector: 'app-inbox',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChatThreadComponent],
  styleUrls: ['./inbox-pro.styles.css'],
  template: `
    <!-- WhatsApp-style Messages Inbox -->
    <div class="whatsapp-container">
      <!-- Header estilo WhatsApp -->
      <div class="whatsapp-header">
        <div class="header-content">
          <h1 class="header-title">Mensajes</h1>
          <div class="header-actions">
            <button class="icon-btn" type="button">
              <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
            <button class="icon-btn" type="button">
              <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Conversations List -->
      <div class="conversations-container">
        @if (loading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p class="loading-text">Cargando conversaciones...</p>
          </div>
        } @else if (error()) {
          <div class="error-state">
            <p class="error-text">{{ error() }}</p>
          </div>
        } @else if (conversations().length === 0) {
          <div class="empty-state">
            <img
              src="/assets/images/empty-states/empty-messages.svg"
              alt="No hay mensajes"
              class="w-48 h-48 mx-auto mb-4"
            />
            <h3 class="empty-title">No hay mensajes</h3>
            <p class="empty-subtitle">Cuando recibas mensajes aparecerán aquí</p>
          </div>
        } @else {
          <div class="messages-split">
            <div class="conversation-list-panel">
              <div class="conversation-list">
                @for (conv of conversations(); track conv['id']) {
                  <button
                    (click)="openConversation(conv)"
                    class="conversation-item"
                    [class.unread]="conv.unreadCount > 0"
                    [class.conversation-item--active]="isActiveConversation(conv)"
                    type="button"
                  >
                    <!-- Avatar -->
                    <div class="conversation-avatar">
                      @if (conv.otherUserAvatar) {
                        <img
                          [src]="conv.otherUserAvatar"
                          [alt]="conv.otherUserName"
                          class="avatar-img"
                        />
                      } @else {
                        <div class="avatar-placeholder">
                          {{ conv.otherUserName.charAt(0).toUpperCase() }}
                        </div>
                      }
                    </div>

                    <!-- Content -->
                    <div class="conversation-content">
                      <div class="conversation-header">
                        <span class="conversation-name">{{ conv.otherUserName }}</span>
                        <span class="conversation-time">{{ formatDate(conv.lastMessageAt) }}</span>
                      </div>

                      @if (conv.carBrand) {
                        <div class="conversation-car">
                          🚗 {{ conv.carBrand }} {{ conv.carModel }} {{ conv.carYear }}
                        </div>
                      }

                      <div class="conversation-footer">
                        <p class="conversation-message">
                          {{ conv.lastMessage }}
                        </p>
                        @if (conv.unreadCount > 0) {
                          <span class="unread-badge">
                            {{ conv.unreadCount > 99 ? '99+' : conv.unreadCount }}
                          </span>
                        }
                      </div>
                    </div>
                  </button>
                }
              </div>
            </div>

            <div class="chat-panel">
              <app-chat-thread
                [bookingId]="activeBookingId()"
                [carId]="activeCarId()"
                [recipientId]="activeRecipientId()"
                [recipientName]="activeRecipientName()"
                [showEmptyState]="true"
              />
            </div>
          </div>
        }
      </div>

    </div>
  `,
})
export class InboxPage implements OnInit, OnDestroy {
  private readonly logger = inject(LoggerService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly messagesService = inject(MessagesService);
  private readonly authService = inject(AuthService);
  private readonly unreadMessagesService = inject(UnreadMessagesService);
  private readonly realtimeConnection = inject(RealtimeConnectionService);
  private readonly breakpoint = inject(BreakpointService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly conversations = signal<ConversationDTO[]>([]);
  readonly connectionStatus = signal<ConnectionStatus>('disconnected');
  readonly activeBookingId = signal<string | null>(null);
  readonly activeCarId = signal<string | null>(null);
  readonly activeRecipientId = signal<string | null>(null);
  readonly activeRecipientName = signal<string | null>(null);

  private realtimeChannel?: RealtimeChannel;

  async ngOnInit(): Promise<void> {
    const session = this.authService.session$();
    if (!session) {
      this.router.navigate(['/auth/login']);
      return;
    }

    await this.loadConversations();
    this.subscribeToConversations(session['user']['id']);

    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.syncActiveChatFromParams(params);
    });
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
    // Canal para mensajes donde el usuario es el remitente (solo INSERT para actualizar preview)
    const senderChannel = this.realtimeConnection.subscribeWithRetry<Message>(
      'inbox-conversations-sender',
      {
        event: 'INSERT', // Solo INSERT - no incrementa unread
        schema: 'public',
        table: 'messages',
        filter: `sender_id=eq.${userId}`,
      },
      (payload) => {
        this.handleMessageChange(payload.new as Message, userId, false);
      },
      (status) => {
        this.connectionStatus.set(status);
      },
    );

    // Canal para mensajes donde el usuario es el destinatario (solo INSERT = mensaje nuevo)
    this.realtimeConnection.subscribeWithRetry<Message>(
      'inbox-conversations-recipient',
      {
        event: 'INSERT', // Solo INSERT - evita inflar contador con UPDATE (read_at)
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${userId}`,
      },
      (payload) => {
        this.handleMessageChange(payload.new as Message, userId, true);
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
   * Optimizado: actualiza solo los campos necesarios sin refetch completo
   * @param incrementUnread - true solo para mensajes recibidos (recipient channel)
   */
  private handleMessageChange(message: Message, userId: string, incrementUnread: boolean): void {
    const conversationId = message['car_id'] || message.booking_id;
    if (!conversationId) return;

    const otherUserId = message.sender_id === userId ? message.recipient_id : message.sender_id;
    const conversationKey = `${conversationId}_${otherUserId}`;

    // Actualizar solo los campos necesarios sin hacer refetch
    this.conversations.update((convs) => {
      const index = convs.findIndex((c) => c['id'] === conversationKey);

      if (index >= 0) {
        // Actualizar conversación existente
        const updated = [...convs];
        const existingConv = updated[index];

        // Update only changed fields
        // Solo incrementar unread si es mensaje de otro usuario Y viene del canal recipient
        const shouldIncrementUnread = incrementUnread && message.sender_id !== userId;

        updated[index] = {
          ...existingConv,
          lastMessage: message.body,
          lastMessageAt: new Date(message['created_at']),
          unreadCount: shouldIncrementUnread
            ? existingConv.unreadCount + 1
            : existingConv.unreadCount,
        };

        // Reordenar por fecha de último mensaje
        return updated.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
      } else {
        // Nueva conversación - en este caso sí necesitamos hacer fetch
        // pero lo hacemos en background sin bloquear
        void this.fetchAndAddNewConversation(conversationKey, message, userId);
        return convs;
      }
    });
  }

  /**
   * Fetches and adds a new conversation (called only when a new conversation starts)
   */
  private async fetchAndAddNewConversation(
    conversationKey: string,
    message: Message,
    userId: string,
  ): Promise<void> {
    try {
      const updatedConversation = await this.messagesService.listConversations(userId, {
        limit: 1,
        offset: 0,
        carId: message['car_id'] || undefined,
        bookingId: message.booking_id || undefined,
      });

      const conv = updatedConversation.conversations.find((c) => c['id'] === conversationKey);
      if (!conv) return;

      // Add new conversation to the list
      this.conversations.update((convs) => {
        // Check if it was already added (race condition)
        if (convs.some((c) => c['id'] === conversationKey)) return convs;
        return [conv, ...convs].sort(
          (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime(),
        );
      });
    } catch (error) {
      this.logger.error('Error fetching new conversation', { error });
    }
  }

  private async loadConversations(): Promise<void> {
    try {
      this.loading.set(true);
      const userId = this.authService.session$()?.['user']['id'];
      if (!userId) return;

      // Usar MessagesService que ahora usa MessagesRepository
      const result = await this.messagesService.listConversations(userId, {
        limit: 50,
        offset: 0,
        archived: false,
      });

      this.conversations.set(result.conversations);
    } catch (err) {
      this.logger.error('Error loading conversations', { error: err });
      this.error.set('Error inesperado');
    } finally {
      this.loading.set(false);
    }
  }

  openConversation(conv: ConversationDTO): void {
    const params: Record<string, string> = {
      userId: conv.otherUserId,
      userName: conv.otherUserName,
    };

    // Resetear unread count inmediatamente en la UI
    this.resetUnreadCount(conv['id']);

    if (conv['carId']) {
      params['carId'] = conv['carId'];
      params['carName'] = `${conv.carBrand} ${conv.carModel}`;

      // Mark car conversation as read
      this.unreadMessagesService.markConversationAsRead(conv['carId'], 'car');
    } else if (conv['bookingId']) {
      params['bookingId'] = conv['bookingId'];

      // Mark booking conversation as read
      this.unreadMessagesService.markConversationAsRead(conv['bookingId'], 'booking');
    }

    if (this.breakpoint.isDesktop()) {
      this.syncActiveChatFromParams(params);
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: params,
        replaceUrl: true,
      });
      return;
    }

    this.router.navigate(['/messages/chat'], { queryParams: params });
  }

  private syncActiveChatFromParams(params: Record<string, string | undefined>): void {
    const bookingId = params['bookingId'] ?? null;
    const carId = params['carId'] ?? null;

    if (!bookingId && !carId) {
      this.activeBookingId.set(null);
      this.activeCarId.set(null);
      this.activeRecipientId.set(null);
      this.activeRecipientName.set(null);
      return;
    }

    this.activeBookingId.set(bookingId);
    this.activeCarId.set(carId);
    this.activeRecipientId.set(params['userId'] ?? null);
    this.activeRecipientName.set(params['userName'] ?? params['carName'] ?? 'Usuario');
  }

  isActiveConversation(conv: ConversationDTO): boolean {
    const activeBookingId = this.activeBookingId();
    const activeCarId = this.activeCarId();

    if (activeBookingId && conv['bookingId'] === activeBookingId) return true;
    if (activeCarId && conv['carId'] === activeCarId) return true;
    return false;
  }

  /**
   * Resetea el contador de mensajes no leídos para una conversación
   * Se llama al abrir una conversación para actualizar la UI inmediatamente
   */
  private resetUnreadCount(conversationId: string): void {
    this.conversations.update((convs) => {
      const index = convs.findIndex((c) => c['id'] === conversationId);
      if (index === -1) return convs;

      const updated = [...convs];
      updated[index] = {
        ...updated[index],
        unreadCount: 0,
      };
      return updated;
    });
  }

  formatDate(date: Date): string {
    // Usar método del servicio para formateo consistente
    return this.messagesService.formatRelativeDate(date);
  }
}

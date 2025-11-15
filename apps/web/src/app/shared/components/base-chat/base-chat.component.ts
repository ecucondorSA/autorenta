import {
  Component,
  OnInit,
  OnDestroy,
  input,
  output,
  signal,
  inject,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { MessagesService, Message } from '../../../core/services/messages.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationSoundService } from '../../../core/services/notification-sound.service';

/**
 * Contexto del chat (booking o car)
 */
export interface ChatContext {
  type: 'booking' | 'car';
  contextId: string; // bookingId o carId
  recipientId: string;
  recipientName: string;
  headerSubtitle?: string; // Texto adicional para el header
}

/**
 * Componente base para chats (booking y car)
 * Unifica la UI y lógica compartida entre ambos tipos de chat
 */
@Component({
  selector: 'app-base-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- WhatsApp-style Chat Container -->
    <div
      class="whatsapp-chat-container flex h-[600px] flex-col overflow-hidden rounded-lg border border-border-default bg-surface-raised shadow-lg dark:border-border-muted dark:bg-surface-raised"
    >
      <!-- Header estilo WhatsApp -->
      <div
        class="whatsapp-header flex items-center gap-3 bg-[#075E54] px-4 py-3 text-text-inverse dark:bg-[#1F2C33]"
      >
        <!-- Avatar -->
        <div
          class="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-raised/20"
        >
          <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
            <path
              d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
            />
          </svg>
        </div>

        <!-- Info contacto -->
        <div class="flex-1">
          <h3 class="text-sm font-semibold">{{ context().recipientName }}</h3>
          <p class="text-xs opacity-80">
            {{ loading() ? 'cargando...' : context().headerSubtitle || getDefaultSubtitle() }}
          </p>
        </div>

        <!-- Icono menú -->
        <button
          class="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-raised/10"
          type="button"
          (click)="onMenuClick()"
        >
          <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path
              d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"
            />
          </svg>
        </button>
      </div>

      <!-- Notificación flotante -->
      <div
        *ngIf="notification()"
        class="absolute left-1/2 top-16 z-10 mx-auto w-[90%] max-w-md -translate-x-1/2 transform animate-slide-down rounded-lg bg-[#128C7E] px-4 py-2 text-center text-sm text-text-inverse shadow-lg"
      >
        {{ notification() }}
      </div>

      <!-- Fondo estilo WhatsApp -->
      <div
        class="whatsapp-bg relative flex-1 overflow-y-auto bg-[#ECE5DD] dark:bg-[#0B141A]"
        style="
          background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiPjxwYXRoIGQ9Ik0wIDBoMTAwdjEwMEgweiIgZmlsbD0iI2VjZTVkZCIvPjxwYXRoIGQ9Ik0wIDBoNTB2NTBIMHptNTAgNTBoNTB2NTBINTB6IiBmaWxsPSIjZjdmM2YwIiBmaWxsLW9wYWNpdHk9Ii4xIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2EpIi8+PC9zdmc+');
          background-size: 400px 400px;
        "
      >
        <!-- Loading -->
        <div *ngIf="loading()" class="flex h-full items-center justify-center">
          <div class="text-center">
            <div
              class="mb-2 inline-block h-8 w-8 animate-spin rounded-full border-4 border-border-muted border-t-[#075E54]"
            ></div>
            <p
              class="text-sm text-text-secondary dark:text-text-secondary dark:text-text-secondary"
            >
              Cargando mensajes...
            </p>
          </div>
        </div>

        <!-- Error -->
        <div
          *ngIf="error()"
          class="mx-4 mt-4 rounded-lg bg-error-bg-hover p-3 text-sm text-error-strong dark:bg-error-900/30 dark:text-error-200"
        >
          ⚠️ {{ error() }}
        </div>

        <!-- Empty state -->
        <div
          *ngIf="!loading() && messages().length === 0"
          class="flex h-full flex-col items-center justify-center px-4 text-center"
        >
          <div
            class="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-surface-raised/70 dark:bg-surface-base/70"
          >
            <svg
              class="h-10 w-10 text-[#075E54] dark:text-text-muted dark:text-text-secondary"
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
          </div>
          <p class="mb-2 text-base font-medium text-text-primary dark:text-text-secondary">
            {{ getEmptyStateTitle() }}
          </p>
          <p class="text-sm text-text-secondary dark:text-text-secondary dark:text-text-secondary">
            {{ getEmptyStateSubtitle() }}
          </p>
        </div>

        <!-- Messages -->
        <div *ngIf="!loading() && messages().length > 0" class="space-y-2 px-4 py-4">
          <div
            *ngFor="let message of messages()"
            [class.justify-end]="isOwnMessage(message)"
            [class.justify-start]="!isOwnMessage(message)"
            class="flex"
          >
            <!-- Mensaje recibido (izquierda) -->
            <div
              *ngIf="!isOwnMessage(message)"
              class="message-received relative max-w-[75%] rounded-lg rounded-tl-none bg-surface-raised px-3 py-2 shadow-sm dark:bg-[#202C33]"
            >
              <p class="break-words text-sm text-text-primary dark:text-text-primary">
                {{ message.body }}
              </p>
              <div class="mt-1 flex items-center justify-end gap-1">
                <span
                  class="text-[10px] text-text-secondary dark:text-text-secondary dark:text-text-secondary"
                  >{{ formatTime(message.created_at) }}</span
                >
              </div>
              <!-- Tail izquierdo -->
              <div
                class="absolute -left-2 top-0 h-0 w-0 border-r-8 border-t-8 border-r-transparent border-t-white dark:border-t-[#202C33]"
              ></div>
            </div>

            <!-- Mensaje enviado (derecha) -->
            <div
              *ngIf="isOwnMessage(message)"
              class="message-sent relative max-w-[75%] rounded-lg rounded-tr-none bg-[#D9FDD3] px-3 py-2 shadow-sm dark:bg-[#005C4B]"
            >
              <p class="break-words text-sm text-text-primary dark:text-text-primary">
                {{ message.body }}
              </p>
              <div class="mt-1 flex items-center justify-end gap-1">
                <span class="text-[10px] text-text-secondary dark:text-text-secondary">{{
                  formatTime(message.created_at)
                }}</span>

                <!-- Check marks - Single check (sent) -->
                <svg
                  *ngIf="getMessageStatus(message) === 'sent'"
                  class="h-4 w-4 text-text-secondary dark:text-text-secondary dark:text-text-secondary"
                  fill="currentColor"
                  viewBox="0 0 16 15"
                >
                  <path
                    d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512z"
                  />
                </svg>

                <!-- Double check (delivered) -->
                <svg
                  *ngIf="getMessageStatus(message) === 'delivered'"
                  class="h-4 w-4 text-text-secondary dark:text-text-secondary dark:text-text-secondary"
                  fill="currentColor"
                  viewBox="0 0 16 15"
                >
                  <path
                    d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"
                  />
                </svg>

                <!-- Double check blue (read) -->
                <svg
                  *ngIf="getMessageStatus(message) === 'read'"
                  class="h-4 w-4 text-cta-default"
                  fill="currentColor"
                  viewBox="0 0 16 15"
                >
                  <path
                    d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"
                  />
                </svg>
              </div>
              <!-- Tail derecho -->
              <div
                class="absolute -right-2 top-0 h-0 w-0 border-l-8 border-t-8 border-l-transparent border-t-[#D9FDD3] dark:border-t-[#005C4B]"
              ></div>
            </div>
          </div>

          <!-- Typing indicator -->
          <div *ngIf="recipientTyping()" class="flex justify-start px-4 py-2">
            <div
              class="rounded-lg rounded-tl-none bg-surface-raised px-4 py-3 shadow-sm dark:bg-[#202C33]"
            >
              <div class="flex items-center gap-1">
                <div
                  class="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                  style="animation-delay: 0ms"
                ></div>
                <div
                  class="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                  style="animation-delay: 150ms"
                ></div>
                <div
                  class="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                  style="animation-delay: 300ms"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Input estilo WhatsApp -->
      <div class="whatsapp-input flex items-center gap-2 bg-[#F0F2F5] px-3 py-2 dark:bg-[#1F2C33]">
        <!-- Emoji button -->
        <button
          type="button"
          class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-text-secondary dark:text-text-secondary hover:bg-surface-hover dark:text-text-muted dark:hover:bg-gray-700"
        >
          <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
            <path
              d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"
            />
          </svg>
        </button>

        <!-- Input -->
        <form (ngSubmit)="sendMessage()" class="flex flex-1 items-center gap-2">
          <input
            type="text"
            [ngModel]="draftMessage"
            (ngModelChange)="onMessageDraftChange($event)"
            name="message"
            [disabled]="sending()"
            placeholder="Escribe un mensaje"
            class="flex-1 rounded-full bg-surface-raised px-4 py-2 text-sm text-text-primary placeholder-gray-500 focus:outline-none dark:bg-[#2A3942] dark:text-text-primary dark:placeholder-gray-400"
          />

          <!-- Send button -->
          <button
            type="submit"
            [disabled]="!draftMessage.trim() || sending()"
            class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#128C7E] text-text-inverse transition-all hover:bg-[#075E54] disabled:opacity-50 dark:bg-[#00A884] dark:hover:bg-[#008069]"
          >
            <svg *ngIf="!sending()" class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
            <svg *ngIf="sending()" class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </button>
        </form>

        <!-- Mic button -->
        <button
          type="button"
          class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-text-secondary dark:text-text-secondary hover:bg-surface-hover dark:text-text-muted dark:hover:bg-gray-700"
        >
          <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
            <path
              d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"
            />
          </svg>
        </button>
      </div>
    </div>
  `,
})
export class BaseChatComponent implements OnInit, OnDestroy {
  // Inputs
  readonly context = input.required<ChatContext>();

  // Outputs para analytics y eventos
  readonly messageSent = output<{ messageId: string; context: ChatContext }>();
  readonly messageReceived = output<{ message: Message; context: ChatContext }>();
  readonly menuClicked = output<void>();

  // Services
  protected readonly messagesService = inject(MessagesService);
  protected readonly authService = inject(AuthService);
  protected readonly notificationSound = inject(NotificationSoundService);

  // State
  readonly messages = signal<Message[]>([]);
  readonly loading = signal(false);
  readonly sending = signal(false);
  readonly error = signal<string | null>(null);
  readonly newMessage = signal('');
  readonly notification = signal<string | null>(null);
  readonly recipientTyping = signal(false);

  // Computed
  readonly currentUserId = signal<string | null>(null);

  protected notificationTimeout: ReturnType<typeof setTimeout> | null = null;
  protected typingTimeout: ReturnType<typeof setTimeout> | null = null;
  protected typingChannel?: RealtimeChannel;

  constructor() {
    // Update current user ID when session changes
    effect(() => {
      const session = this.authService.session$();
      this.currentUserId.set(session?.user?.id ?? null);
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadMessages();
    this.subscribeToMessages();
    this.subscribeToTyping();
  }

  ngOnDestroy(): void {
    this.messagesService.unsubscribe();
    if (this.typingChannel) {
      this.typingChannel.unsubscribe();
    }
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    // Stop typing on unmount
    if (this.currentUserId()) {
      this.stopTyping();
    }
  }

  /**
   * Carga los mensajes iniciales
   */
  protected async loadMessages(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const ctx = this.context();
      const messages =
        ctx.type === 'booking'
          ? await this.messagesService.listByBooking(ctx.contextId)
          : await this.messagesService.listByCar(ctx.contextId);
      this.messages.set(messages);
    } catch {
      this.error.set('No pudimos cargar los mensajes');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Suscribe a mensajes en tiempo real
   * Con deduplicación para optimistic updates
   */
  protected subscribeToMessages(): void {
    const ctx = this.context();
    const handler = async (message: Message) => {
      this.messages.update((prev) => {
        // Check if message already exists by ID
        const existing = prev.find((m) => m.id === message.id);
        if (existing) {
          return prev.map((m) => (m.id === message.id ? message : m));
        }

        // Deduplicación: reemplazar mensaje optimistic si coincide
        // Buscar mensaje temporal con mismo contenido y timestamp cercano
        const optimisticIndex = prev.findIndex(
          (m) =>
            m.id.startsWith('temp-') &&
            m.body === message.body &&
            m.sender_id === message.sender_id &&
            Math.abs(new Date(m.created_at).getTime() - new Date(message.created_at).getTime()) <
              5000,
        );

        if (optimisticIndex >= 0) {
          // Reemplazar mensaje optimistic con el real
          const updated = [...prev];
          updated[optimisticIndex] = message;
          return updated;
        }

        // Nuevo mensaje, agregarlo
        return [...prev, message];
      });

      // Mark as delivered if it's for us
      if (message.recipient_id === this.currentUserId() && !message.delivered_at) {
        await this.messagesService.markAsDelivered(message.id);
      }

      // Mark as read if we're viewing and it's for us
      if (message.recipient_id === this.currentUserId() && !message.read_at) {
        setTimeout(async () => {
          await this.messagesService.markAsRead(message.id);
        }, 1000);
      }

      if (message.sender_id !== this.currentUserId()) {
        this.showNotification(`Nuevo mensaje de ${ctx.recipientName}`);
        this.notificationSound.playNotificationSound().catch(() => {});
        this.messageReceived.emit({ message, context: ctx });
      }
    };

    if (ctx.type === 'booking') {
      this.messagesService.subscribeToBooking(ctx.contextId, handler);
    } else {
      this.messagesService.subscribeToCar(ctx.contextId, handler);
    }
  }

  /**
   * Suscribe a indicador de typing
   */
  protected subscribeToTyping(): void {
    const ctx = this.context();
    this.typingChannel = this.messagesService.subscribeToTyping(
      ctx.contextId,
      (typingUsers) => {
        this.recipientTyping.set(typingUsers.includes(ctx.recipientId));
      },
      ctx.type,
    );
  }

  /**
   * Envía un mensaje con optimistic update
   * El mensaje aparece inmediatamente mientras se envía al servidor
   */
  async sendMessage(): Promise<void> {
    const text = this.newMessage().trim();
    if (!text) return;

    this.sending.set(true);
    this.error.set(null);

    // Stop typing
    this.stopTyping();

    // Optimistic update: agregar mensaje inmediatamente con ID temporal
    const optimisticId = `temp-${Date.now()}`;
    const ctx = this.context();
    const optimisticMessage: Message = {
      id: optimisticId,
      sender_id: this.currentUserId() || '',
      recipient_id: ctx.recipientId,
      body: text,
      created_at: new Date().toISOString(),
      delivered_at: null,
      read_at: null,
      booking_id: ctx.type === 'booking' ? ctx.contextId : null,
      car_id: ctx.type === 'car' ? ctx.contextId : null,
    };

    this.messages.update((prev) => [...prev, optimisticMessage]);
    this.newMessage.set('');

    try {
      await this.messagesService.sendMessage({
        recipientId: ctx.recipientId,
        body: text,
        bookingId: ctx.type === 'booking' ? ctx.contextId : undefined,
        carId: ctx.type === 'car' ? ctx.contextId : undefined,
      });

      // El mensaje real llegará via realtime subscription y reemplazará al optimistic
      // Ver subscribeToMessages() para la lógica de deduplicación
      this.messageSent.emit({ messageId: optimisticId, context: ctx });
    } catch {
      // Remover mensaje optimistic en caso de error
      this.messages.update((prev) => prev.filter((m) => m.id !== optimisticId));
      this.error.set('No pudimos enviar el mensaje. Intentá de nuevo.');
    } finally {
      this.sending.set(false);
    }
  }

  /**
   * Maneja cambios en el draft del mensaje
   */
  onMessageDraftChange(value: string): void {
    this.newMessage.set(value);
    this.onInputChange();
  }

  /**
   * Maneja cambios en el input (para typing indicator)
   */
  protected onInputChange(): void {
    if (!this.currentUserId()) return;

    // Set typing status
    const ctx = this.context();
    this.messagesService
      .setTyping(ctx.contextId, this.currentUserId()!, true, ctx.type)
      .catch(() => {
        // Typing is not critical
      });

    // Clear previous timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    // Stop typing after 3 seconds of inactivity
    this.typingTimeout = setTimeout(() => {
      this.stopTyping();
    }, 3000);
  }

  /**
   * Detiene el indicador de typing
   */
  protected stopTyping(): void {
    if (this.currentUserId()) {
      const ctx = this.context();
      this.messagesService
        .setTyping(ctx.contextId, this.currentUserId()!, false, ctx.type)
        .catch(() => {
          // Ignore errors
        });
    }
  }

  /**
   * Verifica si un mensaje es propio
   */
  isOwnMessage(message: Message): boolean {
    return message.sender_id === this.currentUserId();
  }

  /**
   * Obtiene el estado de un mensaje
   */
  getMessageStatus(message: Message): 'sent' | 'delivered' | 'read' {
    if (message.read_at) return 'read';
    if (message.delivered_at) return 'delivered';
    return 'sent';
  }

  /**
   * Formatea la hora de un mensaje
   */
  formatTime(dateStr: string): string {
    return this.messagesService.formatTime(dateStr);
  }

  /**
   * Muestra una notificación temporal
   */
  protected showNotification(message: string): void {
    this.notification.set(message);
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
    this.notificationTimeout = setTimeout(() => {
      this.notification.set(null);
    }, 4000);
  }

  /**
   * Obtiene el draft del mensaje
   */
  get draftMessage(): string {
    return this.newMessage();
  }

  /**
   * Obtiene el subtítulo por defecto según el tipo de chat
   */
  protected getDefaultSubtitle(): string {
    const ctx = this.context();
    return ctx.type === 'booking' ? 'Conversación sobre reserva' : 'Consulta sobre auto';
  }

  /**
   * Obtiene el título del empty state
   */
  protected getEmptyStateTitle(): string {
    const ctx = this.context();
    return ctx.type === 'booking' ? 'No hay mensajes todavía' : 'Inicia la conversación';
  }

  /**
   * Obtiene el subtítulo del empty state
   */
  protected getEmptyStateSubtitle(): string {
    const ctx = this.context();
    return ctx.type === 'booking'
      ? 'Envía un mensaje para empezar la conversación'
      : 'Pregunta sobre disponibilidad, precios o lo que necesites';
  }

  /**
   * Maneja el click en el menú
   */
  protected onMenuClick(): void {
    this.menuClicked.emit();
  }
}

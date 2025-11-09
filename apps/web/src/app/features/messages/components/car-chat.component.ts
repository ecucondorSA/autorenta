import { Component, OnInit, OnDestroy, input, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { MessagesService, Message } from '../../../core/services/messages.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationSoundService } from '../../../core/services/notification-sound.service';

/**
 * Componente de chat para consultas sobre un auto (sin reserva todavía)
 * Muy similar a BookingChatComponent pero usa car_id en lugar de booking_id
 */
@Component({
  selector: 'app-car-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <!-- WhatsApp-style Chat Container -->
    <div
      class="whatsapp-chat-container flex h-[600px] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
    >
      <!-- Header estilo WhatsApp -->
      <div
        class="whatsapp-header flex items-center gap-3 bg-[#075E54] px-4 py-3 text-white dark:bg-[#1F2C33]"
      >
        <!-- Avatar -->
        <div
          class="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20"
        >
          <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
            <path
              d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
            />
          </svg>
        </div>

        <!-- Info contacto -->
        <div class="flex-1">
          <h3 class="text-sm font-semibold">{{ recipientName() }}</h3>
          <p class="text-xs opacity-80">
            {{ loading() ? 'cargando...' : 'Consulta sobre auto' }}
          </p>
        </div>

        <!-- Icono menú -->
        <button
          class="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10"
          type="button"
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
        class="absolute left-1/2 top-16 z-10 mx-auto w-[90%] max-w-md -translate-x-1/2 transform animate-slide-down rounded-lg bg-[#128C7E] px-4 py-2 text-center text-sm text-white shadow-lg"
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
              class="mb-2 inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-[#075E54]"
            ></div>
            <p class="text-sm text-gray-600 dark:text-gray-300 dark:text-gray-300">
              Cargando mensajes...
            </p>
          </div>
        </div>

        <!-- Error -->
        <div
          *ngIf="error()"
          class="mx-4 mt-4 rounded-lg bg-red-100 p-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200"
        >
          ⚠️ {{ error() }}
        </div>

        <!-- Empty state -->
        <div
          *ngIf="!loading() && messages().length === 0"
          class="flex h-full flex-col items-center justify-center px-4 text-center"
        >
          <div
            class="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/70 dark:bg-gray-800/70"
          >
            <svg
              class="h-10 w-10 text-[#075E54] dark:text-gray-400 dark:text-gray-300"
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
          <p class="mb-2 text-base font-medium text-gray-700 dark:text-gray-300">
            Inicia la conversación
          </p>
          <p class="text-sm text-gray-500 dark:text-gray-300 dark:text-gray-300">
            Pregunta sobre disponibilidad, precios o lo que necesites
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
              class="message-received relative max-w-[75%] rounded-lg rounded-tl-none bg-white px-3 py-2 shadow-sm dark:bg-[#202C33]"
            >
              <p class="break-words text-sm text-gray-800 dark:text-gray-200">
                {{ message.body }}
              </p>
              <div class="mt-1 flex items-center justify-end gap-1">
                <span class="text-[10px] text-gray-500 dark:text-gray-300 dark:text-gray-300">{{
                  formatTime(message.created_at)
                }}</span>
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
              <p class="break-words text-sm text-gray-800 dark:text-gray-100">
                {{ message.body }}
              </p>
              <div class="mt-1 flex items-center justify-end gap-1">
                <span class="text-[10px] text-gray-600 dark:text-gray-300">{{
                  formatTime(message.created_at)
                }}</span>

                <!-- Check marks - Single check (sent) -->
                <svg
                  *ngIf="getMessageStatus(message) === 'sent'"
                  class="h-4 w-4 text-gray-500 dark:text-gray-300 dark:text-gray-300"
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
                  class="h-4 w-4 text-gray-500 dark:text-gray-300 dark:text-gray-300"
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
                  class="h-4 w-4 text-sky-500"
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
            <div class="rounded-lg rounded-tl-none bg-white px-4 py-3 shadow-sm dark:bg-[#202C33]">
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
          class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
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
            class="flex-1 rounded-full bg-white px-4 py-2 text-sm text-gray-800 placeholder-gray-500 focus:outline-none dark:bg-[#2A3942] dark:text-gray-100 dark:placeholder-gray-400"
          />

          <!-- Send button -->
          <button
            type="submit"
            [disabled]="!draftMessage.trim() || sending()"
            class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#128C7E] text-white transition-all hover:bg-[#075E54] disabled:opacity-50 dark:bg-[#00A884] dark:hover:bg-[#008069]"
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
          class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
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
export class CarChatComponent implements OnInit, OnDestroy {
  // Inputs
  readonly carId = input.required<string>();
  readonly recipientId = input.required<string>();
  readonly recipientName = input.required<string>();

  // Services
  private readonly messagesService = inject(MessagesService);
  readonly authService = inject(AuthService);
  private readonly notificationSound = inject(NotificationSoundService);

  // State
  readonly messages = signal<Message[]>([]);
  readonly loading = signal(false);
  readonly sending = signal(false);
  readonly error = signal<string | null>(null);
  readonly newMessage = signal('');
  readonly notification = signal<string | null>(null);
  readonly isTyping = signal(false);
  readonly recipientTyping = signal(false);

  // Computed
  readonly currentUserId = signal<string | null>(null);

  private notificationTimeout: ReturnType<typeof setTimeout> | null = null;
  private typingTimeout: ReturnType<typeof setTimeout> | null = null;
  private typingChannel?: RealtimeChannel;

  constructor() {
    // Update current user ID when session changes
    effect(() => {
      const session = this.authService.session$();
      this.currentUserId.set(session?.user?.id ?? null);
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadMessages();

    // Subscribe to messages (using car_id)
    this.messagesService.subscribeToCar(this.carId(), async (message) => {
      this.messages.update((prev) => {
        const existing = prev.find((m) => m.id === message.id);
        if (existing) {
          // Update existing message (for read/delivered status)
          return prev.map((m) => (m.id === message.id ? message : m));
        }
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
        this.showNotification(`Nuevo mensaje de ${this.recipientName()}`);
        // Play notification sound
        this.notificationSound.playNotificationSound().catch(() => {});
      }
    });

    // Subscribe to typing indicator (using car context)
    this.typingChannel = this.messagesService.subscribeToTyping(
      `car-${this.carId()}`,
      (typingUsers) => {
        this.recipientTyping.set(typingUsers.includes(this.recipientId()));
      },
    );
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
    // Stop typing on unmount (non-blocking)
    if (this.currentUserId()) {
      this.messagesService
        .setTyping(`car-${this.carId()}`, this.currentUserId()!, false)
        .catch(() => {
          // Ignore errors during cleanup
        });
    }
  }

  async loadMessages(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const messages = await this.messagesService.listByCar(this.carId());
      this.messages.set(messages);
    } catch (_err) {
      this.error.set('No pudimos cargar los mensajes');
    } finally {
      this.loading.set(false);
    }
  }

  get draftMessage(): string {
    return this.newMessage();
  }

  async sendMessage(): Promise<void> {
    const text = this.newMessage().trim();
    if (!text) return;

    this.sending.set(true);
    this.error.set(null);

    // Stop typing (no await - don't block send)
    if (this.currentUserId()) {
      this.messagesService
        .setTyping(`car-${this.carId()}`, this.currentUserId()!, false)
        .catch(() => {
          // Ignore typing errors
        });
    }

    try {
      await this.messagesService.sendMessage({
        recipientId: this.recipientId(),
        body: text,
        carId: this.carId(), // ⬅️ Usa carId en lugar de bookingId
      });

      // Clear input
      this.newMessage.set('');

      // Don't reload - realtime will update
    } catch (_err) {
      this.error.set('No pudimos enviar el mensaje. Intentá de nuevo.');
    } finally {
      this.sending.set(false);
    }
  }

  onMessageDraftChange(value: string): void {
    this.newMessage.set(value);
    this.onInputChange();
  }

  private onInputChange(): void {
    if (!this.currentUserId()) return;

    // Set typing status (non-blocking)
    this.messagesService.setTyping(`car-${this.carId()}`, this.currentUserId()!, true).catch(() => {
      // Typing is not critical, ignore errors
    });

    // Clear previous timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    // Stop typing after 3 seconds of inactivity
    this.typingTimeout = setTimeout(() => {
      if (this.currentUserId()) {
        this.messagesService
          .setTyping(`car-${this.carId()}`, this.currentUserId()!, false)
          .catch(() => {
            // Ignore errors
          });
      }
    }, 3000);
  }

  isOwnMessage(message: Message): boolean {
    return message.sender_id === this.currentUserId();
  }

  getMessageStatus(message: Message): 'sent' | 'delivered' | 'read' {
    if (message.read_at) return 'read';
    if (message.delivered_at) return 'delivered';
    return 'sent';
  }

  formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private showNotification(message: string): void {
    this.notification.set(message);
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
    this.notificationTimeout = setTimeout(() => {
      this.notification.set(null);
    }, 4000);
  }
}

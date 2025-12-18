
import {Component, OnDestroy, OnInit, effect, inject, input, output, signal,
  ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { AiBookingContext, ChatSuggestion } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { GeminiService } from '../../../core/services/gemini.service';
import { Message, MessagesService } from '../../../core/services/messages.service';
import { NotificationSoundService } from '../../../core/services/notification-sound.service';
import { ToastService } from '../../../core/services/toast.service';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <!-- WhatsApp-style Chat Container -->
    <div
      class="whatsapp-chat-container flex h-[600px] flex-col overflow-hidden rounded-lg border border-border-default bg-surface-raised shadow-lg dark:border-border-muted dark:bg-surface-raised"
      >
      <!-- Header estilo WhatsApp -->
      <div
        class="whatsapp-header flex items-center gap-3 bg-cta-default px-4 py-3 text-text-primary dark:bg-surface-secondary"
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
    
        <!-- Bloquear / Desbloquear -->
        <button
          type="button"
          class="flex items-center gap-1 rounded-full bg-surface-raised/20 px-3 py-1 text-[11px] font-medium text-text-primary transition hover:bg-surface-raised/40 dark:bg-surface-base/40 dark:hover:bg-surface-base/60"
          (click)="toggleBlockUser()"
          >
          <svg
            class="h-4 w-4"
            [attr.fill]="blocked() ? 'currentColor' : 'none'"
            stroke="currentColor"
            viewBox="0 0 24 24"
            >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M18.364 5.636a9 9 0 11-12.728 12.728 9 9 0 0112.728-12.728z"
              />
            @if (blocked()) {
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6.343 6.343l11.314 11.314"
                />
            }
          </svg>
          {{ blocked() ? 'Desbloquear' : 'Bloquear' }}
        </button>
    
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
    
      <!-- Banner de usuario bloqueado -->
      @if (blocked()) {
        <div
          class="bg-error-bg text-error-strong dark:bg-error-900/40 dark:text-error-200 px-4 py-2 text-sm text-center"
          >
          Has bloqueado a {{ context().recipientName }}. Desbloquéalo para volver a chatear.
        </div>
      }
    
      <!-- Notificación flotante -->
      @if (notification()) {
        <div
          class="absolute left-1/2 top-16 z-10 mx-auto w-[90%] max-w-md -translate-x-1/2 transform animate-slide-down rounded-lg bg-cta-hover px-4 py-2 text-center text-sm text-text-primary shadow-lg"
          >
          {{ notification() }}
        </div>
      }
    
      <!-- Fondo estilo WhatsApp -->
      <div
        class="whatsapp-bg relative flex-1 overflow-y-auto bg-surface-base dark:bg-surface-secondary"
        >
        <!-- Loading -->
        @if (loading()) {
          <div class="flex h-full items-center justify-center">
            <div class="text-center">
              <div
                class="mb-2 inline-block h-8 w-8 animate-spin rounded-full border-4 border-border-muted border-t-cta-default"
              ></div>
              <p
                class="text-sm text-text-secondary dark:text-text-secondary dark:text-text-secondary"
                >
                Cargando mensajes...
              </p>
            </div>
          </div>
        }
    
        <!-- Error -->
        @if (error()) {
          <div
            class="mx-4 mt-4 rounded-lg bg-error-bg-hover p-3 text-sm text-error-strong dark:bg-error-900/30 dark:text-error-200"
            >
            ⚠️ {{ error() }}
          </div>
        }
    
        <!-- Empty state -->
        @if (!loading() && messages().length === 0) {
          <div
            class="flex h-full flex-col items-center justify-center px-4 text-center"
            >
            <div
              class="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-surface-raised/70 dark:bg-surface-base/70"
              >
              <svg
                class="h-10 w-10 text-cta-default dark:text-text-secondary"
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
        }
    
        <!-- Messages -->
        @if (!loading() && messages().length > 0) {
          <div class="space-y-2 px-4 py-4">
            @for (message of messages(); track message) {
              <div
                [class.justify-end]="isOwnMessage(message)"
                [class.justify-start]="!isOwnMessage(message)"
                class="flex"
                >
                <!-- Mensaje recibido (izquierda) -->
                @if (!isOwnMessage(message)) {
                  <div
                    class="message-received relative max-w-[75%] rounded-lg rounded-tl-none bg-surface-raised px-3 py-2 shadow-sm dark:bg-surface-secondary"
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
                        class="absolute -left-2 top-0 h-0 w-0 border-r-8 border-t-8 border-r-transparent"
                        [style.borderTopColor]="'var(--surface-raised)'"
                      ></div>
                    </div>
                  }
                  <!-- Mensaje enviado (derecha) -->
                  @if (isOwnMessage(message)) {
                    <div
                      class="message-sent relative max-w-[75%] rounded-lg rounded-tr-none bg-cta-default px-3 py-2 shadow-sm dark:bg-cta-hover"
                      >
                      <p class="break-words text-sm text-text-primary dark:text-text-primary">
                        {{ message.body }}
                      </p>
                      <div class="mt-1 flex items-center justify-end gap-1">
                        <span class="text-[10px] text-text-secondary dark:text-text-secondary">{{
                          formatTime(message.created_at)
                        }}</span>
                        <!-- Check marks - Single check (sent) -->
                        @if (getMessageStatus(message) === 'sent') {
                          <svg
                            class="h-4 w-4 text-text-secondary dark:text-text-secondary dark:text-text-secondary"
                            fill="currentColor"
                            viewBox="0 0 16 15"
                            >
                            <path
                              d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512z"
                              />
                          </svg>
                        }
                        <!-- Double check (delivered) -->
                        @if (getMessageStatus(message) === 'delivered') {
                          <svg
                            class="h-4 w-4 text-text-secondary dark:text-text-secondary dark:text-text-secondary"
                            fill="currentColor"
                            viewBox="0 0 16 15"
                            >
                            <path
                              d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"
                              />
                          </svg>
                        }
                        <!-- Double check blue (read) -->
                        @if (getMessageStatus(message) === 'read') {
                          <svg
                            class="h-4 w-4 text-cta-default"
                            fill="currentColor"
                            viewBox="0 0 16 15"
                            >
                            <path
                              d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"
                              />
                          </svg>
                        }
                      </div>
                      <!-- Tail derecho -->
                      <div
                        class="absolute -right-2 top-0 h-0 w-0 border-l-8 border-t-8 border-l-transparent"
                        [style.borderTopColor]="'var(--cta-default)'"
                      ></div>
                    </div>
                  }
                </div>
              }
              <!-- Typing indicator -->
              @if (recipientTyping()) {
                <div class="flex justify-start px-4 py-2">
                  <div
                    class="rounded-lg rounded-tl-none bg-surface-raised px-4 py-3 shadow-sm dark:bg-surface-secondary"
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
              }
            </div>
          }
        </div>
    
        <!-- AI Suggestions Bar -->
        @if (bookingContextForAI() && showSuggestions()) {
          <div class="border-t border-border-muted bg-surface-elevated px-3 py-2 dark:bg-surface-secondary">
            @if (loadingSuggestions()) {
              <div class="flex items-center gap-2 text-text-secondary">
                <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span class="text-xs">Generando sugerencias...</span>
              </div>
            } @else if (aiSuggestions().length > 0) {
              <div class="flex flex-wrap gap-2">
                @for (suggestion of aiSuggestions(); track suggestion.id) {
                  <button
                    type="button"
                    class="rounded-full border border-cta-default/30 bg-cta-default/10 px-3 py-1.5 text-xs text-cta-default transition-colors hover:bg-cta-default/20"
                    (click)="useSuggestion(suggestion)"
                  >
                    {{ suggestion.text }}
                  </button>
                }
              </div>
            } @else {
              <p class="text-xs text-text-muted">No hay sugerencias disponibles</p>
            }
          </div>
        }

        <!-- Input estilo WhatsApp -->
        <div
          class="whatsapp-input flex items-center gap-2 bg-surface-elevated px-3 py-2 dark:bg-surface-secondary"
          >
          <!-- AI Sparkles button (only if booking context available) -->
          @if (bookingContextForAI()) {
            <button
              type="button"
              class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors"
              [class.text-cta-default]="showSuggestions()"
              [class.bg-cta-default/10]="showSuggestions()"
              [class.text-text-secondary]="!showSuggestions()"
              [class.hover:bg-surface-hover]="!showSuggestions()"
              [disabled]="loadingSuggestions()"
              (click)="toggleSuggestions()"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </button>
          }

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
              [disabled]="sending() || blocked()"
              [placeholder]="blocked() ? 'Has bloqueado a este usuario' : 'Escribe un mensaje'"
              class="flex-1 rounded-full bg-surface-raised px-4 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none dark:bg-surface-raised dark:text-text-primary dark:placeholder-text-muted"
              />
    
            <!-- Send button -->
            <button
              type="submit"
              [disabled]="!draftMessage.trim() || sending() || blocked()"
              class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-cta-default text-cta-text transition-all hover:bg-cta-hover disabled:opacity-50 dark:bg-cta-hover dark:hover:bg-cta-default"
              >
              @if (!sending()) {
                <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              }
              @if (sending()) {
                <svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
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
              }
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
  /** Contexto de booking para sugerencias IA (opcional) */
  readonly bookingContextForAI = input<AiBookingContext | null>(null);

  // Outputs para analytics y eventos
  readonly messageSent = output<{ messageId: string; context: ChatContext }>();
  readonly messageReceived = output<{ message: Message; context: ChatContext }>();
  readonly menuClicked = output<void>();

  // Services
  protected readonly messagesService = inject(MessagesService);
  protected readonly authService = inject(AuthService);
  protected readonly notificationSound = inject(NotificationSoundService);
  protected readonly toastService = inject(ToastService);
  protected readonly geminiService = inject(GeminiService);

  // State
  readonly messages = signal<Message[]>([]);
  readonly loading = signal(false);
  readonly sending = signal(false);
  readonly error = signal<string | null>(null);
  readonly newMessage = signal('');
  readonly blocked = signal(false);
  readonly notification = signal<string | null>(null);
  readonly recipientTyping = signal(false);

  // AI Suggestions State
  readonly aiSuggestions = signal<ChatSuggestion[]>([]);
  readonly loadingSuggestions = signal(false);
  readonly showSuggestions = signal(false);

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

    // Check initial blocked status from server
    const ctx = this.context();
    if (ctx.recipientId) {
      this.messagesService.isUserBlocked(ctx.recipientId).then((isBlocked) => {
        this.blocked.set(isBlocked);
      });
    }
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
   * Bloquea / desbloquea al usuario actual del chat
   */
  async toggleBlockUser(): Promise<void> {
    const ctx = this.context();
    const target = ctx.recipientId;
    if (!target) return;

    const wasBlocked = this.blocked();
    
    // Optimistic update
    this.blocked.set(!wasBlocked);

    try {
      if (wasBlocked) {
        await this.messagesService.unblockUser(target);
        this.toastService.info('Usuario desbloqueado', `${ctx.recipientName} puede volver a escribirte.`);
      } else {
        await this.messagesService.blockUser(target);
        this.recipientTyping.set(false);
        this.toastService.success('Usuario bloqueado', `No recibirás mensajes de ${ctx.recipientName}.`);
      }
    } catch {
      // Revertir optimistic update en caso de error
      this.blocked.set(wasBlocked);
      this.toastService.error('Error', 'No se pudo actualizar el bloqueo.');
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
    if (this.blocked()) {
      this.toastService.warning(
        'Usuario bloqueado',
        'Debes desbloquear a este usuario para enviar mensajes.'
      );
      return;
    }

    // Guardar el texto actual por si falla
    const draft = text;

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

    // Agregar optimistic y limpiar input visualmente
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
      // Error: Remover mensaje optimistic
      this.messages.update((prev) => prev.filter((m) => m.id !== optimisticId));
      
      // Restaurar el texto en el input
      this.newMessage.set(draft);
      
      // Mostrar toast
      this.toastService.error(
        'Error al enviar', 
        'No pudimos enviar el mensaje. Inténtalo de nuevo.'
      );
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

  // ============================================
  // AI SUGGESTIONS
  // ============================================

  /**
   * Toggle para mostrar/ocultar sugerencias
   */
  toggleSuggestions(): void {
    const newState = !this.showSuggestions();
    this.showSuggestions.set(newState);

    if (newState && this.aiSuggestions().length === 0) {
      this.loadAiSuggestions();
    }
  }

  /**
   * Carga sugerencias de respuesta usando IA
   */
  async loadAiSuggestions(): Promise<void> {
    const aiContext = this.bookingContextForAI();
    if (!aiContext) {
      return;
    }

    this.loadingSuggestions.set(true);
    this.aiSuggestions.set([]);

    try {
      // Convertir mensajes al formato esperado
      const history = this.messages().slice(-10).map(m => ({
        role: m.sender_id === this.currentUserId() ? 'user' as const : 'recipient' as const,
        text: m.body,
      }));

      const suggestions = await this.geminiService.generateChatSuggestions({
        conversationHistory: history,
        userRole: aiContext.userRole,
        bookingContext: aiContext,
      });

      this.aiSuggestions.set(suggestions);
    } catch {
      this.toastService.error('Error', 'No pudimos generar sugerencias');
    } finally {
      this.loadingSuggestions.set(false);
    }
  }

  /**
   * Usa una sugerencia de IA
   */
  useSuggestion(suggestion: ChatSuggestion): void {
    this.newMessage.set(suggestion.text);
    this.showSuggestions.set(false);
    this.aiSuggestions.set([]);
  }
}

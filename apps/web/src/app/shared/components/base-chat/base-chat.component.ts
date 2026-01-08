import {
  Component,
  OnDestroy,
  OnInit,
  effect,
  inject,
  input,
  output,
  signal,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ElementRef,
  viewChild,
  AfterViewChecked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { AuthService } from '@core/services/auth/auth.service';
import { GeminiService } from '@core/services/ai/gemini.service';
import { Message, MessagesService } from '@core/services/bookings/messages.service';
import { NotificationSoundService } from '@core/services/infrastructure/notification-sound.service';
import { ToastService } from '@core/services/ui/toast.service';
import type { AiBookingContext, ChatSuggestion } from '../../../core/models';

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
    <!-- Professional Chat Container -->
    <div
      class="chat-container flex h-[550px] flex-col overflow-hidden rounded-2xl border border-border-default bg-surface-raised shadow-sm"
    >
      <!-- Professional Header -->
      <div
        class="flex items-center gap-3 border-b border-border-default bg-surface-raised px-4 py-3"
      >
        <!-- Avatar with Initials -->
        <div class="relative flex-shrink-0">
          <div
            class="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-lg"
          >
            {{ getInitials() }}
          </div>
          <!-- Online indicator - real presence -->
          @if (recipientOnline()) {
            <div
              class="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-surface-raised bg-emerald-500"
            ></div>
          } @else {
            <div
              class="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-surface-raised bg-gray-400"
            ></div>
          }
        </div>

        <!-- Contact Info -->
        <div class="flex-1 min-w-0">
          <h3 class="text-base font-semibold text-text-primary truncate">
            {{ context().recipientName }}
          </h3>
          <div class="flex items-center gap-1.5">
            @if (recipientOnline()) {
              <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span class="text-xs text-emerald-600 font-medium">En línea</span>
            } @else {
              <span class="h-2 w-2 rounded-full bg-gray-400"></span>
              <span class="text-xs text-text-secondary font-medium">Desconectado</span>
            }
          </div>
        </div>

        <!-- Action buttons -->
        <div class="flex items-center gap-1">
          <!-- Block/Unblock button -->
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary hover:bg-surface-hover transition-colors"
            [class.text-error-strong]="blocked()"
            (click)="toggleBlockUser()"
            [title]="blocked() ? 'Desbloquear' : 'Bloquear'"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </button>
          <!-- Menu button -->
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary hover:bg-surface-hover transition-colors"
            (click)="onMenuClick()"
          >
            <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path
                d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- Blocked user banner -->
      @if (blocked()) {
        <div
          class="bg-error-bg/50 border-b border-error-border px-4 py-2.5 text-sm text-center text-error-strong"
        >
          <span class="font-medium">Usuario bloqueado</span> · Desbloquéalo para volver a chatear
        </div>
      }
      @if (blockedBy() && !blocked()) {
        <div
          class="bg-warning-bg/50 border-b border-warning-border px-4 py-2.5 text-sm text-center text-warning-strong"
        >
          <span class="font-medium">Este usuario te ha bloqueado</span> · No puedes enviarle
          mensajes
        </div>
      }

      <!-- Chat Messages Area -->
      <div #messagesContainer class="relative flex-1 overflow-y-auto bg-surface-base flex flex-col">
        <!-- Loading state -->
        @if (loading()) {
          <div class="flex h-full items-center justify-center">
            <div class="text-center">
              <div
                class="mb-3 inline-block h-10 w-10 animate-spin rounded-full border-4 border-border-muted border-t-indigo-500"
              ></div>
              <p class="text-sm text-text-secondary">Cargando mensajes...</p>
            </div>
          </div>
        }

        <!-- Error state -->
        @if (error()) {
          <div
            class="mx-4 mt-4 flex items-center gap-2 rounded-xl bg-error-bg/50 border border-error-border/50 p-4 text-sm text-error-strong"
          >
            <svg
              class="h-5 w-5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>{{ error() }}</span>
          </div>
        }

        <!-- Empty state -->
        @if (!loading() && messages().length === 0) {
          <div class="flex h-full flex-col items-center justify-center px-6 text-center">
            <div class="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-50">
              <svg
                class="h-10 w-10 text-indigo-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h4 class="mb-1 text-base font-semibold text-text-primary">
              {{ getEmptyStateTitle() }}
            </h4>
            <p class="text-sm text-text-secondary max-w-xs">{{ getEmptyStateSubtitle() }}</p>
          </div>
        }

        <!-- Messages list -->
        @if (!loading() && messages().length > 0) {
          <div class="px-4 py-4 space-y-3 mt-auto">
            <!-- Date separator (first message) -->
            <div class="flex items-center justify-center mb-2">
              <span
                class="px-3 py-1 text-xs text-text-secondary bg-surface-raised rounded-full border border-border-default shadow-sm"
              >
                {{ getConversationDateLabel() }}
              </span>
            </div>

            @for (message of messages(); track message.id) {
              <div [class]="isOwnMessage(message) ? 'flex justify-end' : 'flex justify-start'">
                <!-- Received message (left) -->
                @if (!isOwnMessage(message)) {
                  <div class="flex items-end gap-2 max-w-[80%]">
                    <!-- Small avatar -->
                    <div
                      class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold mb-1"
                    >
                      {{ getInitials() }}
                    </div>
                    <div class="relative">
                      <div
                        class="rounded-2xl rounded-bl-md bg-white border border-border-default px-4 py-2.5 shadow-sm"
                      >
                        <p
                          class="text-sm text-text-primary leading-relaxed whitespace-pre-wrap break-words"
                        >
                          {{ message.body }}
                        </p>
                        <div class="mt-1 flex items-center justify-end">
                          <span class="text-xs text-text-muted">{{
                            formatTime(message.created_at)
                          }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                }

                <!-- Sent message (right) -->
                @if (isOwnMessage(message)) {
                  <div class="max-w-[80%]">
                    <div class="relative">
                      <div
                        class="rounded-2xl rounded-br-md bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 shadow-sm"
                      >
                        <p
                          class="text-sm text-white leading-relaxed whitespace-pre-wrap break-words"
                        >
                          {{ message.body }}
                        </p>
                        <div class="mt-1 flex items-center justify-end gap-1">
                          <span class="text-xs text-white/70">{{
                            formatTime(message.created_at)
                          }}</span>
                          <!-- Status indicators -->
                          @if (getMessageStatus(message) === 'pending') {
                            <!-- Clock icon - pending/queued -->
                            <svg
                              class="h-3.5 w-3.5 text-white/50 animate-pulse"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          }
                          @if (getMessageStatus(message) === 'sent') {
                            <svg
                              class="h-3.5 w-3.5 text-white/70"
                              fill="currentColor"
                              viewBox="0 0 16 15"
                            >
                              <path
                                d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512z"
                              />
                            </svg>
                          }
                          @if (getMessageStatus(message) === 'delivered') {
                            <svg
                              class="h-3.5 w-3.5 text-white/70"
                              fill="currentColor"
                              viewBox="0 0 16 15"
                            >
                              <path
                                d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"
                              />
                            </svg>
                          }
                          @if (getMessageStatus(message) === 'read') {
                            <svg
                              class="h-3.5 w-3.5 text-cyan-300"
                              fill="currentColor"
                              viewBox="0 0 16 15"
                            >
                              <path
                                d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"
                              />
                            </svg>
                          }
                        </div>
                      </div>
                      <!-- "Tú" label -->
                      <span class="absolute -bottom-4 right-2 text-xs text-text-muted font-medium"
                        >Tú</span
                      >
                    </div>
                  </div>
                }
              </div>
            }

            <!-- Typing indicator -->
            @if (recipientTyping()) {
              <div class="flex justify-start">
                <div class="flex items-end gap-2">
                  <div
                    class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold"
                  >
                    {{ getInitials() }}
                  </div>
                  <div
                    class="rounded-2xl rounded-bl-md bg-white border border-border-default px-4 py-3 shadow-sm"
                  >
                    <div class="flex items-center gap-1">
                      <div
                        class="h-2 w-2 animate-bounce rounded-full bg-indigo-400"
                        style="animation-delay: 0ms"
                      ></div>
                      <div
                        class="h-2 w-2 animate-bounce rounded-full bg-indigo-400"
                        style="animation-delay: 150ms"
                      ></div>
                      <div
                        class="h-2 w-2 animate-bounce rounded-full bg-indigo-400"
                        style="animation-delay: 300ms"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>
        }

        <!-- Floating notification -->
        @if (notification()) {
          <div class="absolute left-1/2 top-4 z-10 -translate-x-1/2 transform animate-slide-down">
            <div class="rounded-full bg-indigo-500 px-4 py-2 text-sm text-white shadow-lg">
              {{ notification() }}
            </div>
          </div>
        }
      </div>

      <!-- AI Suggestions Bar -->
      @if (bookingContextForAI() && showSuggestions()) {
        <div class="border-t border-border-default bg-indigo-50/50 px-4 py-2.5">
          @if (loadingSuggestions()) {
            <div class="flex items-center gap-2 text-indigo-600">
              <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span class="text-xs font-medium">Generando sugerencias...</span>
            </div>
          } @else if (aiSuggestions().length > 0) {
            <div class="flex flex-wrap gap-2">
              @for (suggestion of aiSuggestions(); track suggestion.id) {
                <button
                  type="button"
                  class="rounded-full bg-white border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-600 transition-all hover:bg-indigo-50 hover:border-indigo-300 shadow-sm"
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

      <!-- Input Area -->
      <div class="border-t border-border-default bg-surface-raised px-4 py-3">
        <form (ngSubmit)="sendMessage()" class="flex items-center gap-3">
          <!-- AI Sparkles button -->
          @if (bookingContextForAI()) {
            <button
              type="button"
              class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-all"
              [class.bg-indigo-100]="showSuggestions()"
              [class.text-indigo-600]="showSuggestions()"
              [class."showSuggestions()"
              [class.text-text-secondary]="!showSuggestions()"
              [class.hover:bg-surface-hover]="!showSuggestions()"
              [disabled]="loadingSuggestions()"
              (click)="toggleSuggestions()"
              title="Sugerencias IA"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                />
              </svg>
            </button>
          }

          <!-- Text input -->
          <div class="flex-1 relative">
            <input
              type="text"
              [ngModel]="draftMessage"
              (ngModelChange)="onMessageDraftChange($event)"
              name="message"
              [disabled]="sending() || blocked() || blockedBy()"
              [placeholder]="
                blocked()
                  ? 'Usuario bloqueado'
                  : blockedBy()
                    ? 'Te han bloqueado'
                    : 'Escribe un mensaje...'
              "
              class="w-full rounded-full bg-surface-base border border-border-default px-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
            />
          </div>

          <!-- Send button -->
          <button
            type="submit"
            [disabled]="!draftMessage.trim() || sending() || blocked() || blockedBy()"
            class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm transition-all hover:shadow-md hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-sm"
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
      </div>
    </div>
  `,
})
export class BaseChatComponent implements OnInit, OnDestroy, AfterViewChecked {
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
  private readonly cdr = inject(ChangeDetectorRef);

  // ViewChild for auto-scroll
  private readonly messagesContainer = viewChild<ElementRef<HTMLDivElement>>('messagesContainer');
  private shouldScrollToBottom = true;

  // State
  readonly messages = signal<Message[]>([]);
  readonly loading = signal(false);
  readonly sending = signal(false);
  readonly error = signal<string | null>(null);
  readonly newMessage = signal('');
  readonly blocked = signal(false); // I blocked them
  readonly blockedBy = signal(false); // They blocked me
  readonly notification = signal<string | null>(null);
  readonly recipientTyping = signal(false);
  readonly recipientOnline = signal(false); // Real presence status

  // AI Suggestions State
  readonly aiSuggestions = signal<ChatSuggestion[]>([]);
  readonly loadingSuggestions = signal(false);
  readonly showSuggestions = signal(false);

  // Computed
  readonly currentUserId = signal<string | null>(null);

  protected notificationTimeout: ReturnType<typeof setTimeout> | null = null;
  protected typingTimeout: ReturnType<typeof setTimeout> | null = null;
  protected typingChannel?: RealtimeChannel;
  protected presenceChannel?: RealtimeChannel;

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
    this.subscribeToPresence();

    // Check initial bidirectional block status from server
    const ctx = this.context();
    if (ctx.recipientId) {
      this.messagesService.isBlocked(ctx.recipientId).then((status) => {
        this.blocked.set(status.blocked);
        this.blockedBy.set(status.blockedBy);
      });
    }
  }

  ngOnDestroy(): void {
    this.messagesService.unsubscribe();
    if (this.typingChannel) {
      this.typingChannel.unsubscribe();
    }
    if (this.presenceChannel) {
      this.presenceChannel.unsubscribe();
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

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  /**
   * Hace scroll al final de los mensajes
   */
  private scrollToBottom(): void {
    const container = this.messagesContainer()?.nativeElement;
    if (container) {
      // Usar requestAnimationFrame para asegurar que el DOM está actualizado
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
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
        this.toastService.info(
          'Usuario desbloqueado',
          `${ctx.recipientName} puede volver a escribirte.`,
        );
      } else {
        await this.messagesService.blockUser(target);
        this.recipientTyping.set(false);
        this.toastService.success(
          'Usuario bloqueado',
          `No recibirás mensajes de ${ctx.recipientName}.`,
        );
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
      // Scroll al fondo después de cargar mensajes
      this.shouldScrollToBottom = true;
      this.cdr.markForCheck();
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

      // Forzar detección de cambios (OnPush + callback fuera de zona Angular)
      this.shouldScrollToBottom = true;
      this.cdr.markForCheck();

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
   * Suscribe a presencia real del destinatario (online/offline)
   */
  protected subscribeToPresence(): void {
    const ctx = this.context();
    const channelName = `presence-online-${ctx.contextId}`;

    this.presenceChannel = this.messagesService['supabase']
      .channel(channelName, {
        config: {
          presence: {
            key: this.currentUserId() || 'anonymous',
          },
        },
      })
      .on('presence', { event: 'sync' }, () => {
        const state = this.presenceChannel?.presenceState() || {};
        // Check if recipient is in the presence state
        const onlineUsers = Object.keys(state);
        this.recipientOnline.set(onlineUsers.includes(ctx.recipientId));
      })
      .on('presence', { event: 'join' }, ({ key }: { key: string }) => {
        if (key === ctx.recipientId) {
          this.recipientOnline.set(true);
        }
      })
      .on('presence', { event: 'leave' }, ({ key }: { key: string }) => {
        if (key === ctx.recipientId) {
          this.recipientOnline.set(false);
        }
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED' && this.currentUserId()) {
          // Track our own presence
          await this.presenceChannel?.track({ user_id: this.currentUserId() });
        }
      });
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
        'Debes desbloquear a este usuario para enviar mensajes.',
      );
      return;
    }
    if (this.blockedBy()) {
      this.toastService.error('No puedes enviar mensajes', 'Este usuario te ha bloqueado.');
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
    // Scroll al fondo después de enviar
    this.shouldScrollToBottom = true;
    this.cdr.markForCheck();

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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';

      // Check if it's a validation error (blocked, rate limit) vs network error
      const isValidationError =
        errorMessage.includes('bloqueado') ||
        errorMessage.includes('bloqueó') ||
        errorMessage.includes('límite');

      if (isValidationError) {
        // Validation error: remove optimistic message and restore draft
        this.messages.update((prev) => prev.filter((m) => m.id !== optimisticId));
        this.newMessage.set(draft);
        this.toastService.error('Error al enviar', errorMessage);
        this.error.set(errorMessage);
      } else {
        // Network error: message was queued for retry, mark as pending
        // Keep optimistic message but mark it visually as pending
        this.messages.update((prev) =>
          prev.map((m) => (m.id === optimisticId ? { ...m, id: `pending-${optimisticId}` } : m)),
        );
        this.toastService.info(
          'Mensaje pendiente',
          'Se enviará automáticamente cuando vuelva la conexión.',
        );
        // Don't set error - message is queued and will be retried
      }
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
  getMessageStatus(message: Message): 'pending' | 'sent' | 'delivered' | 'read' {
    // Check if message is pending (queued for retry)
    if (message.id.startsWith('pending-') || message.id.startsWith('temp-')) {
      return 'pending';
    }
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
   * Obtiene las iniciales del nombre del destinatario
   */
  getInitials(): string {
    const name = this.context().recipientName || '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return '?';
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  /**
   * Obtiene la etiqueta de fecha para el separador de conversación
   */
  getConversationDateLabel(): string {
    const msgs = this.messages();
    if (msgs.length === 0) return 'Hoy';

    const firstMsgDate = new Date(msgs[0].created_at);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDay = new Date(
      firstMsgDate.getFullYear(),
      firstMsgDate.getMonth(),
      firstMsgDate.getDate(),
    );

    const diffDays = Math.floor((today.getTime() - msgDay.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Hoy ${firstMsgDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return 'Ayer';
    } else if (diffDays < 7) {
      return firstMsgDate.toLocaleDateString('es-AR', { weekday: 'long' });
    } else {
      return firstMsgDate.toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
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
      const history = this.messages()
        .slice(-10)
        .map((m) => ({
          role: m.sender_id === this.currentUserId() ? ('user' as const) : ('recipient' as const),
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

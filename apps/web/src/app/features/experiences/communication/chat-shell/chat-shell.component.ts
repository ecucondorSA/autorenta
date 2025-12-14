
import {Component, OnDestroy, OnInit, effect, inject, input, output, signal,
  ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { AuthService } from '../../../../core/services/auth.service';
import { Message, MessagesService } from '../../../../core/services/messages.service';
import { NotificationSoundService } from '../../../../core/services/notification-sound.service';
import type { ChatContext } from '../types/chat-context';

/**
 * Componente base para chats (booking y car)
 * Unifica la UI y lógica compartida entre ambos tipos de chat
 * Extraído de shared/components/base-chat según blueprint
 */
@Component({
  selector: 'app-chat-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './chat-shell.component.html',
  // Mantener selector legacy para compatibilidad temporal
  // selector: 'app-base-chat' también disponible si es necesario
})
export class ChatShellComponent implements OnInit, OnDestroy {
  // Inputs
  readonly context = input.required<ChatContext>();

  // Outputs para analytics y eventos
  readonly messageSent = output<{ messageId: string; context: ChatContext }>();
  readonly messageReceived = output<{ message: Message; context: ChatContext }>();
  readonly menuClicked = output<void>();
  readonly typing = output<boolean>();

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
   */
  protected subscribeToMessages(): void {
    const ctx = this.context();
    const handler = async (message: Message) => {
      this.messages.update((prev) => {
        const existing = prev.find((m) => m.id === message.id);
        if (existing) {
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
        const isTyping = typingUsers.includes(ctx.recipientId);
        this.recipientTyping.set(isTyping);
        this.typing.emit(isTyping);
      },
      ctx.type,
    );
  }

  /**
   * Envía un mensaje
   */
  async sendMessage(): Promise<void> {
    const text = this.newMessage().trim();
    if (!text) return;

    this.sending.set(true);
    this.error.set(null);

    // Stop typing
    this.stopTyping();

    try {
      const ctx = this.context();
      await this.messagesService.sendMessage({
        recipientId: ctx.recipientId,
        body: text,
        bookingId: ctx.type === 'booking' ? ctx.contextId : undefined,
        carId: ctx.type === 'car' ? ctx.contextId : undefined,
      });

      this.newMessage.set('');
      this.messageSent.emit({ messageId: '', context: ctx }); // TODO: obtener ID real
    } catch {
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

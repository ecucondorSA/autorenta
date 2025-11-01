import { Component, OnInit, OnDestroy, input, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { MessagesService, Message } from '../../../core/services/messages.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationSoundService } from '../../../core/services/notification-sound.service';

@Component({
  selector: 'app-booking-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './booking-chat.component.html',
})
export class BookingChatComponent implements OnInit, OnDestroy {
  // Inputs
  readonly bookingId = input.required<string>();
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

    // Subscribe to messages
    this.messagesService.subscribeToBooking(this.bookingId(), async (message) => {
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

    // Subscribe to typing indicator
    this.typingChannel = this.messagesService.subscribeToTyping(this.bookingId(), (typingUsers) => {
      this.recipientTyping.set(typingUsers.includes(this.recipientId()));
    });
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
      this.messagesService.setTyping(this.bookingId(), this.currentUserId()!, false).catch(() => {
        // Ignore errors during cleanup
      });
    }
  }

  async loadMessages(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const messages = await this.messagesService.listByBooking(this.bookingId());
      this.messages.set(messages);
    } catch (err) {
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
      this.messagesService.setTyping(this.bookingId(), this.currentUserId()!, false).catch(() => {
        // Ignore typing errors
      });
    }

    try {
      await this.messagesService.sendMessage({
        recipientId: this.recipientId(),
        body: text,
        bookingId: this.bookingId(),
      });

      // Clear input
      this.newMessage.set('');

      // Don't reload - realtime will update
    } catch (err) {
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
    this.messagesService.setTyping(this.bookingId(), this.currentUserId()!, true).catch(() => {
      // Typing is not critical, ignore errors
    });

    // Clear previous timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    // Stop typing after 3 seconds of inactivity
    this.typingTimeout = setTimeout(() => {
      if (this.currentUserId()) {
        this.messagesService.setTyping(this.bookingId(), this.currentUserId()!, false).catch(() => {
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

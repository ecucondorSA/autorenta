import { Component, OnInit, input, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessagesService, Message } from '../../../core/services/messages.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-booking-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './booking-chat.component.html',
})
export class BookingChatComponent implements OnInit {
  // Inputs
  readonly bookingId = input.required<string>();
  readonly recipientId = input.required<string>();
  readonly recipientName = input.required<string>();

  // Services
  private readonly messagesService = inject(MessagesService);
  readonly authService = inject(AuthService);

  // State
  readonly messages = signal<Message[]>([]);
  readonly loading = signal(false);
  readonly sending = signal(false);
  readonly error = signal<string | null>(null);
  readonly newMessage = signal('');

  // Computed
  readonly currentUserId = signal<string | null>(null);

  constructor() {
    // Update current user ID when session changes
    effect(() => {
      const session = this.authService.session$();
      this.currentUserId.set(session?.user?.id ?? null);
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadMessages();
  }

  async loadMessages(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const messages = await this.messagesService.listByBooking(this.bookingId());
      this.messages.set(messages);
    } catch (err) {
      console.error('Error loading messages:', err);
      this.error.set('No pudimos cargar los mensajes');
    } finally {
      this.loading.set(false);
    }
  }

  async sendMessage(): Promise<void> {
    const text = this.newMessage().trim();
    if (!text) return;

    this.sending.set(true);
    this.error.set(null);

    try {
      await this.messagesService.sendMessage({
        recipientId: this.recipientId(),
        body: text,
        bookingId: this.bookingId(),
      });

      // Clear input
      this.newMessage.set('');

      // Reload messages
      await this.loadMessages();
    } catch (err) {
      console.error('Error sending message:', err);
      this.error.set('No pudimos enviar el mensaje. Intentá de nuevo.');
    } finally {
      this.sending.set(false);
    }
  }

  isOwnMessage(message: Message): boolean {
    return message.sender_id === this.currentUserId();
  }

  formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

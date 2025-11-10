import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatShellComponent } from '../chat-shell/chat-shell.component';
import type { ChatContext } from '../types/chat-context';

/**
 * Componente de chat para reservas
 * Wrapper alrededor de ChatShellComponent con contexto de booking
 * Mantiene compatibilidad hacia atrás con inputs individuales
 * Convertido a función pura que construye ChatContext según blueprint
 */
@Component({
  selector: 'app-booking-chat',
  standalone: true,
  imports: [CommonModule, ChatShellComponent],
  template: `
    <app-chat-shell
      [context]="chatContext()"
      (messageSent)="onMessageSent($event)"
      (messageReceived)="onMessageReceived($event)"
      (menuClicked)="onMenuClicked()"
      (typing)="onTyping($event)"
    />
  `,
})
export class BookingChatWrapperComponent {
  // Inputs (compatibilidad hacia atrás)
  readonly bookingId = input.required<string>();
  readonly recipientId = input.required<string>();
  readonly recipientName = input.required<string>();
  readonly headerSubtitle = input<string>();

  // Computed context para ChatShellComponent
  readonly chatContext = computed<ChatContext>(() => ({
    type: 'booking',
    contextId: this.bookingId(),
    recipientId: this.recipientId(),
    recipientName: this.recipientName(),
    headerSubtitle: this.headerSubtitle() || 'Conversación sobre reserva',
  }));

  /**
   * Maneja eventos de mensaje enviado (para analytics)
   */
  onMessageSent(event: { messageId: string; context: ChatContext }): void {
    // TODO: Implementar analytics
    console.log('Message sent:', event);
  }

  /**
   * Maneja eventos de mensaje recibido (para analytics)
   */
  onMessageReceived(event: { message: unknown; context: ChatContext }): void {
    // TODO: Implementar analytics
    console.log('Message received:', event);
  }

  /**
   * Maneja click en menú
   */
  onMenuClicked(): void {
    // TODO: Implementar menú de opciones
    console.log('Menu clicked');
  }

  /**
   * Maneja eventos de typing
   */
  onTyping(isTyping: boolean): void {
    // TODO: Implementar analytics o UI feedback
    if (isTyping) {
      console.log('Recipient is typing...');
    }
  }
}

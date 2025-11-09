import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChatComponent, ChatContext } from '../../../shared/components/base-chat/base-chat.component';

/**
 * Componente de chat para consultas sobre un auto (sin reserva todavía)
 * Wrapper alrededor de BaseChatComponent con contexto de car
 */
@Component({
  selector: 'app-car-chat',
  standalone: true,
  imports: [CommonModule, BaseChatComponent],
  template: `
    <app-base-chat
      [context]="chatContext()"
      (messageSent)="onMessageSent($event)"
      (messageReceived)="onMessageReceived($event)"
      (menuClicked)="onMenuClicked()"
    />
  `,
})
export class CarChatComponent {
  // Inputs
  readonly carId = input.required<string>();
  readonly recipientId = input.required<string>();
  readonly recipientName = input.required<string>();

  // Computed context para BaseChatComponent
  readonly chatContext = computed<ChatContext>(() => ({
    type: 'car',
    contextId: this.carId(),
    recipientId: this.recipientId(),
    recipientName: this.recipientName(),
    headerSubtitle: 'Consulta sobre auto',
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
}

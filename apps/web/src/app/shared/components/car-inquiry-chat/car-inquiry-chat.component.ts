import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { BaseChatComponent, ChatContext } from '../base-chat/base-chat.component';

/**
 * Componente de chat para consultas sobre un auto (antes de reservar)
 * Wrapper alrededor de BaseChatComponent con contexto de car
 */
@Component({
  selector: 'app-car-inquiry-chat',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BaseChatComponent],
  template: `
    <app-base-chat
      [context]="chatContext()"
      (messageSent)="onMessageSent($event)"
      (messageReceived)="onMessageReceived($event)"
    />
  `,
})
export class CarInquiryChatComponent {
  // Inputs
  readonly carId = input.required<string>();
  readonly ownerId = input.required<string>();
  readonly ownerName = input.required<string>();
  readonly carTitle = input<string>('');

  // Computed context para BaseChatComponent
  readonly chatContext = computed<ChatContext>(() => ({
    type: 'car',
    contextId: this.carId(),
    recipientId: this.ownerId(),
    recipientName: this.ownerName(),
    headerSubtitle: this.carTitle() ? `Consulta sobre ${this.carTitle()}` : 'Consulta previa a reserva',
  }));

  onMessageSent(_event: { messageId: string; context: ChatContext }): void {
    // Analytics si es necesario
  }

  onMessageReceived(_event: { message: unknown; context: ChatContext }): void {
    // Analytics si es necesario
  }
}

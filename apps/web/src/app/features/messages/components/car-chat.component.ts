import { LoggerService } from '@core/services/infrastructure/logger.service';
import { Component, computed, input, ChangeDetectionStrategy, inject } from '@angular/core';

import {
  BaseChatComponent,
  ChatContext,
} from '../../../shared/components/base-chat/base-chat.component';

/**
 * Componente de chat para consultas sobre un auto (sin reserva todavía)
 * Wrapper alrededor de BaseChatComponent con contexto de car
 */
@Component({
  selector: 'app-car-chat',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BaseChatComponent],
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
  private readonly logger = inject(LoggerService);
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
    this.logger.debug('Message sent:', event);
  }

  /**
   * Maneja eventos de mensaje recibido (para analytics)
   */
  onMessageReceived(event: { message: unknown; context: ChatContext }): void {
    this.logger.debug('Message received:', event);
  }

  /**
   * Maneja click en menú
   */
  onMenuClicked(): void {
    this.logger.debug('Menu clicked');
  }
}

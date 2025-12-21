import { LoggerService } from '../../../core/services/logger.service';
import {Component, computed, inject, input,
  ChangeDetectionStrategy} from '@angular/core';

import type { AiBookingContext, Booking } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { BaseChatComponent, ChatContext } from '../base-chat/base-chat.component';

/**
 * Componente de chat para reservas
 * Wrapper alrededor de BaseChatComponent con contexto de booking
 * Mantiene compatibilidad hacia atrás con inputs individuales
 */
@Component({
  selector: 'app-booking-chat',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BaseChatComponent],
  template: `
    <app-base-chat
      [context]="chatContext()"
      [bookingContextForAI]="aiContext()"
      (messageSent)="onMessageSent($event)"
      (messageReceived)="onMessageReceived($event)"
      (menuClicked)="onMenuClicked()"
    />
  `,
})
export class BookingChatComponent {
  private readonly logger = inject(LoggerService);
  private readonly authService = inject(AuthService);

  // Inputs (compatibilidad hacia atrás)
  readonly bookingId = input.required<string>();
  readonly recipientId = input.required<string>();
  readonly recipientName = input.required<string>();
  /** Booking completo para contexto de IA (opcional) */
  readonly booking = input<Booking | null>(null);

  // Computed context para BaseChatComponent
  readonly chatContext = computed<ChatContext>(() => ({
    type: 'booking',
    contextId: this.bookingId(),
    recipientId: this.recipientId(),
    recipientName: this.recipientName(),
    headerSubtitle: 'Conversación sobre reserva',
  }));

  /**
   * Computed: Contexto de booking para sugerencias de IA
   * Retorna null si no hay booking disponible
   */
  readonly aiContext = computed<AiBookingContext | null>(() => {
    const b = this.booking();
    if (!b) return null;

    const currentUserId = this.authService.session$()?.user?.id;
    const isOwner = currentUserId === b.owner_id;

    return {
      bookingId: b.id,
      status: b.status,
      startDate: b.start_at || '',
      endDate: b.end_at || '',
      carBrand: b.car_brand || b.car?.brand || '',
      carModel: b.car_model || b.car?.model || '',
      ownerName: b.owner_name || 'Propietario',
      renterName: b.renter_name || 'Locatario',
      userRole: isOwner ? 'owner' : 'renter',
    };
  });

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

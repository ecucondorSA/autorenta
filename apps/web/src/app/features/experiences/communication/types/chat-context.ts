/**
 * Contexto del chat (booking o car)
 * Centralizado para uso compartido entre componentes
 */
export interface ChatContext {
  type: 'booking' | 'car';
  contextId: string; // bookingId o carId
  recipientId: string;
  recipientName: string;
  headerSubtitle?: string; // Texto adicional para el header
}

/**
 * Barrel export para experiences/communication
 * Centraliza todas las exportaciones del módulo de comunicación
 */

// Chat Shell
export { ChatShellComponent } from './chat-shell/chat-shell.component';

// Chat Context Wrappers
export { BookingChatWrapperComponent } from './chat-context-wrappers/booking-chat-wrapper.component';

// Types
export type { ChatContext } from './types/chat-context';

// Re-export para compatibilidad hacia atrás
export { BookingChatWrapperComponent as BookingChatComponent } from './chat-context-wrappers/booking-chat-wrapper.component';
export { ChatShellComponent as BaseChatComponent } from './chat-shell/chat-shell.component';

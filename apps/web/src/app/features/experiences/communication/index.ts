/**
 * Barrel export para experiences/communication
 * Centraliza todas las exportaciones del módulo de comunicación
 */

// Chat Shell
export { ChatShellComponent } from './chat-shell/chat-shell.component';

// Types
export type { ChatContext } from './types/chat-context';

// Re-export para compatibilidad hacia atrás
export { ChatShellComponent as BaseChatComponent } from './chat-shell/chat-shell.component';

// Note: BookingChatWrapperComponent was removed - use BookingChatComponent from shared/components instead

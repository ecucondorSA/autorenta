/**
 * Support Ticket Models
 * Types and constants for the support ticket system
 */

// Ticket enums - match database enums
export type TicketCategory =
  | 'booking_issue'
  | 'payment_issue'
  | 'vehicle_issue'
  | 'account_issue'
  | 'verification_issue'
  | 'technical_issue'
  | 'suggestion'
  | 'other';

export type TicketUrgency = 'low' | 'medium' | 'high' | 'critical';

export type TicketStatus = 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';

export interface SupportTicket {
  id: string;
  user_id: string;
  category: TicketCategory;
  urgency: TicketUrgency;
  status: TicketStatus;
  subject: string;
  description: string;
  booking_id?: string | null;
  car_id?: string | null;
  attachment_urls: string[];
  assigned_to?: string | null;
  resolution_notes?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTicketData {
  category: TicketCategory;
  urgency: TicketUrgency;
  subject: string;
  description: string;
  booking_id?: string;
  car_id?: string;
  attachment_urls?: string[];
}

export interface TicketCategoryOption {
  value: TicketCategory;
  label: string;
  icon: string;
}

export interface TicketUrgencyOption {
  value: TicketUrgency;
  label: string;
  color: string;
}

export interface TicketStatusDisplay {
  label: string;
  color: string;
}

export const TICKET_CATEGORIES: TicketCategoryOption[] = [
  { value: 'booking_issue', label: 'Problema con reserva', icon: 'calendar' },
  { value: 'payment_issue', label: 'Problema de pago', icon: 'credit-card' },
  { value: 'vehicle_issue', label: 'Problema con vehículo', icon: 'car' },
  { value: 'account_issue', label: 'Problema de cuenta', icon: 'user' },
  { value: 'verification_issue', label: 'Verificación de identidad', icon: 'shield' },
  { value: 'technical_issue', label: 'Problema técnico', icon: 'wrench' },
  { value: 'suggestion', label: 'Sugerencia', icon: 'lightbulb' },
  { value: 'other', label: 'Otro', icon: 'help' },
];

export const TICKET_URGENCY_LEVELS: TicketUrgencyOption[] = [
  { value: 'low', label: 'Baja', color: 'text-gray-600 bg-gray-100' },
  { value: 'medium', label: 'Media', color: 'text-yellow-600 bg-yellow-100' },
  { value: 'high', label: 'Alta', color: 'text-orange-600 bg-orange-100' },
  { value: 'critical', label: 'Crítica', color: 'text-red-600 bg-red-100' },
];

export const TICKET_STATUS_MAP: Record<TicketStatus, TicketStatusDisplay> = {
  open: { label: 'Abierto', color: 'text-blue-600 bg-blue-100' },
  in_progress: { label: 'En progreso', color: 'text-yellow-600 bg-yellow-100' },
  waiting_user: { label: 'Esperando respuesta', color: 'text-purple-600 bg-purple-100' },
  resolved: { label: 'Resuelto', color: 'text-green-600 bg-green-100' },
  closed: { label: 'Cerrado', color: 'text-gray-500 bg-gray-100' },
};

/**
 * Helper to get category display info
 */
export function getCategoryInfo(category: TicketCategory): TicketCategoryOption | undefined {
  return TICKET_CATEGORIES.find((c) => c.value === category);
}

/**
 * Helper to get urgency display info
 */
export function getUrgencyInfo(urgency: TicketUrgency): TicketUrgencyOption | undefined {
  return TICKET_URGENCY_LEVELS.find((u) => u.value === urgency);
}

/**
 * Helper to get status display info
 */
export function getStatusInfo(status: TicketStatus): TicketStatusDisplay {
  return TICKET_STATUS_MAP[status];
}

import { Injectable } from '@angular/core';

/**
 * P0-032: Notification Templates Service
 * PROBLEMA: Notifications construidas con string concat pueden ser XSS
 * FIX: Usar templates hardcodeados con placeholders sanitizados
 */

export type NotificationTemplateType =
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'payment_received'
  | 'payout_processed'
  | 'new_review'
  | 'review_response'
  | 'message_received'
  | 'car_approved'
  | 'car_rejected'
  | 'verification_approved'
  | 'verification_rejected'
  | 'wallet_deposit_confirmed'
  | 'wallet_withdrawal_completed';

export interface NotificationTemplateConfig {
  title: string;
  body: string;
  action_url?: string;
  icon?: string;
}

/**
 * Sanitize user input to prevent XSS attacks
 * Removes HTML tags and special characters
 */
function sanitizeInput(input: string): string {
  if (!input) return '';

  // Remove HTML tags
  const withoutTags = input.replace(/<[^>]*>/g, '');

  // Escape special characters
  const escaped = withoutTags
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  // Limit length to prevent abuse
  return escaped.substring(0, 200);
}

/**
 * P0-032 FIX: Notification Templates with sanitized placeholders
 * NO string concatenation - only template replacement
 */
@Injectable({
  providedIn: 'root',
})
export class NotificationTemplatesService {
  /**
   * Get notification template by type with sanitized variables
   */
  getTemplate(
    type: NotificationTemplateType,
    variables: Record<string, string> = {},
  ): NotificationTemplateConfig {
    // Sanitize all variables before using them
    const sanitizedVars: Record<string, string> = {};
    for (const key in variables) {
      sanitizedVars[key] = sanitizeInput(variables[key]);
    }

    // Return hardcoded template with sanitized placeholders
    switch (type) {
      case 'booking_confirmed':
        return {
          title: 'Reserva Confirmada',
          body: `Tu reserva para ${sanitizedVars['carName']} ha sido confirmada. Fecha: ${sanitizedVars['startDate']}`,
          action_url: `/bookings/${sanitizedVars['bookingId']}`,
          icon: 'checkmark-circle',
        };

      case 'booking_cancelled':
        return {
          title: 'Reserva Cancelada',
          body: `Tu reserva para ${sanitizedVars['carName']} ha sido cancelada.`,
          action_url: `/bookings/${sanitizedVars['bookingId']}`,
          icon: 'close-circle',
        };

      case 'payment_received':
        return {
          title: 'Pago Recibido',
          body: `Hemos recibido tu pago de $${sanitizedVars['amount']} para ${sanitizedVars['carName']}`,
          action_url: `/bookings/${sanitizedVars['bookingId']}/payment`,
          icon: 'cash',
        };

      case 'payout_processed':
        return {
          title: 'Pago Procesado',
          body: `Tu pago de $${sanitizedVars['amount']} ha sido procesado exitosamente.`,
          action_url: `/payouts`,
          icon: 'cash',
        };

      case 'new_review':
        return {
          title: 'Nueva Reseña',
          body: `${sanitizedVars['reviewerName']} te dejó una reseña de ${sanitizedVars['rating']} estrellas en ${sanitizedVars['carName']}`,
          action_url: sanitizedVars['reviewUrl'],
          icon: 'star',
        };

      case 'review_response':
        return {
          title: 'Respuesta a tu Reseña',
          body: `${sanitizedVars['ownerName']} respondió a tu reseña.`,
          action_url: sanitizedVars['reviewUrl'],
          icon: 'chatbubble',
        };

      case 'message_received':
        return {
          title: 'Nuevo Mensaje',
          body: `${sanitizedVars['senderName']} te envió un mensaje.`,
          action_url: `/messages/${sanitizedVars['conversationId']}`,
          icon: 'mail',
        };

      case 'car_approved':
        return {
          title: 'Auto Aprobado',
          body: `Tu auto ${sanitizedVars['carName']} ha sido aprobado y está disponible para rentar.`,
          action_url: `/cars/${sanitizedVars['carId']}`,
          icon: 'checkmark-circle',
        };

      case 'car_rejected':
        return {
          title: 'Auto Rechazado',
          body: `Tu auto ${sanitizedVars['carName']} no fue aprobado. Revisa los comentarios del equipo.`,
          action_url: `/cars/${sanitizedVars['carId']}/edit`,
          icon: 'close-circle',
        };

      case 'verification_approved':
        return {
          title: 'Verificación Aprobada',
          body: `Tu verificación de ${sanitizedVars['verificationType']} ha sido aprobada.`,
          action_url: `/profile/verification`,
          icon: 'shield-checkmark',
        };

      case 'verification_rejected':
        return {
          title: 'Verificación Rechazada',
          body: `Tu verificación de ${sanitizedVars['verificationType']} fue rechazada. Por favor intenta de nuevo.`,
          action_url: `/profile/verification`,
          icon: 'shield',
        };

      case 'wallet_deposit_confirmed':
        return {
          title: 'Depósito Confirmado',
          body: `Tu depósito de $${sanitizedVars['amount']} ha sido confirmado.`,
          action_url: `/wallet`,
          icon: 'wallet',
        };

      case 'wallet_withdrawal_completed':
        return {
          title: 'Retiro Completado',
          body: `Tu retiro de $${sanitizedVars['amount']} ha sido procesado.`,
          action_url: `/wallet`,
          icon: 'cash',
        };

      default:
        return {
          title: 'Notificación',
          body: 'Tienes una nueva notificación.',
          icon: 'notifications',
        };
    }
  }

  /**
   * Validate that all required variables are present
   */
  validateVariables(
    type: NotificationTemplateType,
    variables: Record<string, string>,
  ): { valid: boolean; missing: string[] } {
    const requiredVars = this.getRequiredVariables(type);
    const missing: string[] = [];

    for (const varName of requiredVars) {
      if (!variables[varName]) {
        missing.push(varName);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Get required variables for a template type
   */
  private getRequiredVariables(type: NotificationTemplateType): string[] {
    switch (type) {
      case 'booking_confirmed':
      case 'booking_cancelled':
        return ['carName', 'startDate', 'bookingId'];
      case 'payment_received':
        return ['amount', 'carName', 'bookingId'];
      case 'payout_processed':
        return ['amount'];
      case 'new_review':
        return ['reviewerName', 'rating', 'carName', 'reviewUrl'];
      case 'review_response':
        return ['ownerName', 'reviewUrl'];
      case 'message_received':
        return ['senderName', 'conversationId'];
      case 'car_approved':
      case 'car_rejected':
        return ['carName', 'carId'];
      case 'verification_approved':
      case 'verification_rejected':
        return ['verificationType'];
      case 'wallet_deposit_confirmed':
      case 'wallet_withdrawal_completed':
        return ['amount'];
      default:
        return [];
    }
  }
}

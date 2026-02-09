import { LoggerService } from '@core/services/infrastructure/logger.service';
import { Injectable, inject } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

export interface BookingConfirmationEmailData {
  bookingId: string;
  recipientEmail: string;
  recipientName: string;
  carBrand: string;
  carModel: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  currency: string;
  paymentProvider: string;
  paymentReferenceId: string;
}

/**
 * Email Service
 *
 * Servicio para envío de emails transaccionales usando Supabase Edge Functions.
 *
 * Emails soportados:
 * - Confirmación de reserva
 * - Cancelación de reserva
 * - Recordatorios
 * - Notificaciones de pago
 */
@Injectable({
  providedIn: 'root',
})
export class EmailService {
  private readonly logger = inject(LoggerService);
  private readonly supabase: SupabaseClient = injectSupabase();

  /**
   * Envía email de confirmación de reserva
   */
  async sendBookingConfirmation(
    data: BookingConfirmationEmailData,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: result, error } = await this.supabase.functions.invoke('email-service', {
        body: {
          template: 'booking-confirmation',
          to: data.recipientEmail,
          recipientName: data.recipientName,
          data: {
            bookingId: data.bookingId,
            carBrand: data.carBrand,
            carModel: data.carModel,
            startDate: data.startDate,
            endDate: data.endDate,
            totalPrice: data.totalPrice,
            currency: data.currency,
          },
        },
      });

      if (error) {
        console.error('Error sending booking confirmation email:', error);
        return { success: false, error: error.message };
      }

      this.logger.debug('Booking confirmation email sent:', result);
      return { success: true };
    } catch (error) {
      console.error('Unexpected error sending email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Envía email de cancelación de reserva
   */
  async sendBookingCancellation(
    bookingId: string,
    recipientEmail: string,
    recipientName: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.functions.invoke('email-service', {
        body: {
          template: 'booking-cancellation',
          to: recipientEmail,
          recipientName,
          data: { bookingId },
        },
      });

      if (error) {
        console.error('Error sending cancellation email:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Unexpected error sending email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Envía email de recordatorio de reserva próxima
   */
  async sendBookingReminder(
    bookingId: string,
    recipientEmail: string,
    recipientName: string,
    startDate: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.functions.invoke('email-service', {
        body: {
          template: 'booking-reminder',
          to: recipientEmail,
          recipientName,
          data: { bookingId, startDate },
        },
      });

      if (error) {
        console.error('Error sending reminder email:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Unexpected error sending email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

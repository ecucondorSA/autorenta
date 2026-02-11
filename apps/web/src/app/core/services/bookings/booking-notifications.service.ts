import { LoggerService } from '@core/services/infrastructure/logger.service';
import { Injectable, inject } from '@angular/core';
import type { Booking } from '@core/models';
import { getErrorMessage } from '@core/utils/type-guards';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

/**
 * BookingNotificationsService
 *
 * Servicio especializado para crear notificaciones automáticas
 * cuando cambia el estado de un booking o se realizan acciones importantes.
 *
 * Integrado con el flujo completo de contratación.
 */
@Injectable({
  providedIn: 'root',
})
export class BookingNotificationsService {
  private readonly logger = inject(LoggerService);
  private readonly supabase = injectSupabase();

  /**
   * Notifica cuando un booking cambia de estado
   */
  async notifyStatusChange(booking: Booking, oldStatus: string, newStatus: string): Promise<void> {
    try {
      // Obtener información del auto y usuarios
      const { data: bookingData, error: bookingError } = await this.supabase
        .from('bookings')
        .select(
          '*, cars(title, brand, model), renter:profiles!bookings_renter_id_fkey(full_name), owner:profiles!bookings_owner_id_fkey(full_name)',
        )
        .eq('id', booking.id)
        .single();

      if (bookingError || !bookingData) {
        console.error('Error fetching booking data for notification:', bookingError);
        return;
      }

      const carTitle =
        bookingData.cars?.title || `${bookingData.cars?.brand} ${bookingData.cars?.model}`;
      const renterName = bookingData.renter?.full_name || 'el locatario';

      // Notificar según el cambio de estado
      switch (newStatus) {
        case 'confirmed':
          // Notificar al locatario que su reserva fue confirmada
          await this.createNotification({
            user_id: booking.renter_id,
            type: 'payment_successful',
            title: '¡Reserva Confirmada!',
            body: `Tu reserva de ${carTitle} ha sido confirmada. Preparate para el check-in.`,
            cta_link: `/bookings/${booking.id}`,
            metadata: {
              booking_id: booking.id,
              car_id: booking.car_id,
              status: newStatus,
            },
          });

          // Notificar al locador que el pago fue completado
          await this.createNotification({
            user_id: booking.owner_id,
            type: 'payment_successful',
            title: 'Pago Recibido',
            body: `${renterName} completó el pago de la reserva de ${carTitle}.`,
            cta_link: `/bookings/owner/${booking.id}`,
            metadata: {
              booking_id: booking.id,
              car_id: booking.car_id,
              status: newStatus,
            },
          });
          break;

        case 'in_progress':
          // Notificar al locatario que el alquiler comenzó
          await this.createNotification({
            user_id: booking.renter_id,
            type: 'generic_announcement',
            title: '¡Alquiler Iniciado!',
            body: `El check-in de ${carTitle} ha sido completado. ¡Disfrutá tu viaje!`,
            cta_link: `/bookings/${booking.id}`,
            metadata: {
              booking_id: booking.id,
              car_id: booking.car_id,
              status: newStatus,
            },
          });

          // Notificar al locador
          await this.createNotification({
            user_id: booking.owner_id,
            type: 'generic_announcement',
            title: 'Alquiler en Curso',
            body: `El alquiler de ${carTitle} con ${renterName} ha comenzado.`,
            cta_link: `/bookings/owner/${booking.id}`,
            metadata: {
              booking_id: booking.id,
              car_id: booking.car_id,
              status: newStatus,
            },
          });
          break;

        case 'completed':
          // Notificar al locatario que puede dejar reseña
          await this.createNotification({
            user_id: booking.renter_id,
            type: 'generic_announcement',
            title: 'Reserva Completada',
            body: `Tu reserva de ${carTitle} ha finalizado. Dejá tu reseña para ayudar a otros usuarios.`,
            cta_link: `/bookings/${booking.id}`,
            metadata: {
              booking_id: booking.id,
              car_id: booking.car_id,
              status: newStatus,
              can_review: true,
            },
          });

          // Notificar al locador sobre ganancias
          await this.createNotification({
            user_id: booking.owner_id,
            type: 'payout_successful',
            title: 'Reserva Completada - Ganancias Disponibles',
            body: `La reserva de ${carTitle} con ${renterName} ha finalizado. Tus ganancias están disponibles en tu wallet.`,
            cta_link: `/bookings/owner/${booking.id}`,
            metadata: {
              booking_id: booking.id,
              car_id: booking.car_id,
              status: newStatus,
              can_review: true,
              earnings_available: true,
            },
          });
          break;

        case 'cancelled':
          // Notificar a ambas partes
          if (oldStatus === 'pending') {
            // Cancelación de solicitud pendiente
            await this.createNotification({
              user_id: booking.renter_id,
              type: 'booking_cancelled_for_renter',
              title: 'Reserva Cancelada',
              body: `Tu solicitud de reserva para ${carTitle} ha sido cancelada.`,
              cta_link: `/bookings`,
              metadata: {
                booking_id: booking.id,
                car_id: booking.car_id,
                status: newStatus,
              },
            });

            await this.createNotification({
              user_id: booking.owner_id,
              type: 'booking_cancelled_for_owner',
              title: 'Solicitud Cancelada',
              body: `La solicitud de reserva para ${carTitle} ha sido cancelada.`,
              cta_link: `/bookings/owner`,
              metadata: {
                booking_id: booking.id,
                car_id: booking.car_id,
                status: newStatus,
              },
            });
          }
          break;

        default:
          // No notification for other status changes
          this.logger.debug(
            `[BookingNotifications] No notification configured for status: ${newStatus}`,
          );
          break;
      }
    } catch (error) {
      console.error('Error creating status change notification:', error);
      // No lanzar error para no bloquear el flujo principal
    }
  }

  /**
   * Notifica cuando se requiere acción del usuario (check-in, check-out, etc.)
   */
  async notifyActionRequired(
    booking: Booking,
    action: 'check_in' | 'check_out' | 'review' | 'approve' | 'payment',
    targetUserId: string,
  ): Promise<void> {
    try {
      const { data: bookingData, error } = await this.supabase
        .from('bookings')
        .select('*, cars(title, brand, model)')
        .eq('id', booking.id)
        .single();

      if (error || !bookingData) {
        console.error('Error fetching booking data:', error);
        return;
      }

      const carTitle =
        bookingData.cars?.title || `${bookingData.cars?.brand} ${bookingData.cars?.model}`;

      const notifications: Record<string, { title: string; body: string; cta_link: string }> = {
        check_in: {
          title: 'Check-In Requerido',
          body: `Es hora de realizar el check-in para ${carTitle}. Inspeccioná el vehículo antes de entregarlo.`,
          cta_link: `/bookings/${booking.id}/owner-check-in`,
        },
        check_out: {
          title: 'Check-Out Requerido',
          body: `Completá el check-out de ${carTitle} para finalizar la reserva.`,
          cta_link: `/bookings/${booking.id}/check-out`,
        },
        review: {
          title: 'Dejá tu Reseña',
          body: `Tu reserva de ${carTitle} ha finalizado. Compartí tu experiencia.`,
          cta_link: `/bookings/${booking.id}`,
        },
        approve: {
          title: 'Nueva Solicitud de Reserva',
          body: `Tenés una nueva solicitud de reserva para ${carTitle}. Revisala y aprobala.`,
          cta_link: `/bookings/owner/${booking.id}`,
        },
        payment: {
          title: 'Pago Pendiente',
          body: `Completá el pago para confirmar tu reserva de ${carTitle}.`,
          cta_link: `/bookings/${booking.id}/detail-payment`,
        },
      };

      const notification = notifications[action];
      if (!notification) return;

      await this.createNotification({
        user_id: targetUserId,
        type: 'generic_announcement',
        title: notification.title,
        body: notification.body,
        cta_link: notification.cta_link,
        metadata: {
          booking_id: booking.id,
          car_id: booking.car_id,
          action_required: action,
        },
      });
    } catch (error) {
      console.error('Error creating action required notification:', error);
    }
  }

  /**
   * Notifica al propietario cuando el locatario solicita una extensión.
   */
  async notifyExtensionRequested(
    booking: Booking,
    newEndAt: string,
    renterMessage?: string,
  ): Promise<void> {
    try {
      const { data: car, error: carError } = await this.supabase
        .from('cars')
        .select('id, title, brand, model, owner_id')
        .eq('id', booking.car_id)
        .single();

      if (carError || !car?.owner_id) return;

      const { data: renter } = await this.supabase
        .from('profiles')
        .select('full_name')
        .eq('id', booking.renter_id)
        .single();

      const carTitle = car.title || `${car.brand} ${car.model}`;
      const renterName = renter?.full_name || 'El locatario';
      const formattedDate = new Date(newEndAt).toLocaleDateString('es-AR');

      await this.createNotification({
        user_id: car.owner_id,
        type: 'generic_announcement',
        title: 'Solicitud de extensión',
        body: `${renterName} solicita extender la reserva de ${carTitle} hasta ${formattedDate}.`,
        cta_link: `/bookings/owner/${booking.id}`,
        metadata: {
          booking_id: booking.id,
          car_id: booking.car_id,
          new_end_at: newEndAt,
          renter_message: renterMessage || null,
        },
      });
    } catch (error) {
      this.logger.warn(
        'Error creating extension request notification',
        'BookingNotifications',
        error,
      );
    }
  }

  /**
   * Notifica al locatario cuando el propietario rechaza la extensión.
   */
  async notifyExtensionRejected(booking: Booking, reason: string): Promise<void> {
    try {
      const { data: car } = await this.supabase
        .from('cars')
        .select('title, brand, model')
        .eq('id', booking.car_id)
        .single();

      const carTitle = car?.title || `${car?.brand ?? ''} ${car?.model ?? ''}`.trim() || 'tu auto';

      await this.createNotification({
        user_id: booking.renter_id,
        type: 'generic_announcement',
        title: 'Extensión rechazada',
        body: `Tu solicitud de extensión para ${carTitle} fue rechazada. Motivo: ${reason}`,
        cta_link: `/bookings/${booking.id}`,
        metadata: {
          booking_id: booking.id,
          car_id: booking.car_id,
          reason,
        },
      });
    } catch (error) {
      this.logger.warn(
        'Error creating extension rejection notification',
        'BookingNotifications',
        error,
      );
    }
  }

  /**
   * Notifica cuando se completa un check-in o check-out
   */
  async notifyInspectionCompleted(
    booking: Booking,
    inspectionType: 'check_in' | 'check_out',
    completedByUserId: string,
  ): Promise<void> {
    try {
      const { data: bookingData, error } = await this.supabase
        .from('bookings')
        .select(
          '*, cars(title, brand, model), renter:profiles!bookings_renter_id_fkey(full_name), owner:profiles!bookings_owner_id_fkey(full_name)',
        )
        .eq('id', booking.id)
        .single();

      if (error || !bookingData) return;

      const carTitle =
        bookingData.cars?.title || `${bookingData.cars?.brand} ${bookingData.cars?.model}`;
      const isOwner = completedByUserId === booking.owner_id;
      const otherUserName = isOwner ? bookingData.renter?.full_name : bookingData.owner?.full_name;

      if (inspectionType === 'check_in') {
        // Notificar al locatario que puede hacer su check-in
        await this.createNotification({
          user_id: booking.renter_id,
          type: 'inspection_reminder',
          title: 'Check-In del Locador Completado',
          body: `El locador completó el check-in de ${carTitle}. Ahora es tu turno de confirmar la recepción.`,
          cta_link: `/bookings/${booking.id}/check-in`,
          metadata: {
            booking_id: booking.id,
            car_id: booking.car_id,
            inspection_type: 'check_in',
          },
        });
      } else if (inspectionType === 'check_out') {
        // Notificar al locador que el locatario completó el check-out
        await this.createNotification({
          user_id: booking.owner_id,
          type: 'inspection_reminder',
          title: 'Check-Out del Locatario Completado',
          body: `${otherUserName} completó el check-out de ${carTitle}. Revisá el estado del vehículo.`,
          cta_link: `/bookings/${booking.id}/owner-check-out`,
          metadata: {
            booking_id: booking.id,
            car_id: booking.car_id,
            inspection_type: 'check_out',
          },
        });
      }
    } catch (error) {
      console.error('Error creating inspection notification:', error);
    }
  }

  /**
   * Notifica cuando se puede dejar una reseña (14 días después de completed)
   */
  async notifyReviewAvailable(booking: Booking, userId: string): Promise<void> {
    try {
      const { data: bookingData, error } = await this.supabase
        .from('bookings')
        .select('*, cars(title, brand, model)')
        .eq('id', booking.id)
        .single();

      if (error || !bookingData) return;

      const carTitle =
        bookingData.cars?.title || `${bookingData.cars?.brand} ${bookingData.cars?.model}`;

      await this.createNotification({
        user_id: userId,
        type: 'generic_announcement',
        title: 'Dejá tu Reseña',
        body: `Tu reserva de ${carTitle} ha finalizado. Compartí tu experiencia para ayudar a otros usuarios.`,
        cta_link: `/bookings/${booking.id}`,
        metadata: {
          booking_id: booking.id,
          car_id: booking.car_id,
          review_available: true,
        },
      });
    } catch (error) {
      console.error('Error creating review notification:', error);
    }
  }

  /**
   * Helper para crear notificaciones en la base de datos
   */
  private async createNotification(data: {
    user_id?: string;
    type: string;
    title: string;
    body: string;
    cta_link?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    // If no user_id is provided, bail out early. This prevents passing
    // `undefined` into the DB and satisfies callers that may have
    // optional user ids on the booking model.
    if (!data.user_id) {
      this.logger.warn('Skipping notification creation: missing user_id', 'BookingNotificationsService', data);
      return;
    }

    const { error } = await this.supabase.from('notifications').insert({
      user_id: data.user_id,
      type: data.type,
      title: data.title,
      body: data.body,
      cta_link: data.cta_link,
      metadata: data.metadata || {},
    });

    if (error) {
      console.error('Error creating notification:', error);
      throw new Error(`Failed to create notification: ${getErrorMessage(error)}`);
    }
  }
}

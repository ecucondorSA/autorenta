import { Injectable, inject } from '@angular/core';
import type { TrafficInfraction } from '@core/models/traffic-infraction.model';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service'; // For toasts

@Injectable({
  providedIn: 'root',
})
export class TrafficInfractionsService {
  private readonly supabase = injectSupabase();
  private readonly toastService = inject(NotificationManagerService);

  /**
   * Crea una nueva multa de tránsito reportada por un propietario.
   * @param infractionData Datos de la multa a crear.
   * @returns La multa creada.
   */
  async createInfraction(infractionData: Partial<TrafficInfraction>): Promise<TrafficInfraction> {
    const { data: newInfraction, error } = await this.supabase
      .from('traffic_infractions')
      .insert({
        booking_id: infractionData.booking_id,
        owner_id: infractionData.owner_id, // Ensure owner_id is passed or retrieved
        renter_id: infractionData.renter_id, // Ensure renter_id is passed or retrieved
        infraction_date: infractionData.infraction_date,
        amount_cents: infractionData.amount_cents,
        currency: infractionData.currency || 'ARS', // Default currency
        description: infractionData.description,
        evidence_urls: infractionData.evidence_urls || [],
        status: 'pending', // Initial status
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating traffic infraction:', error);
      throw new Error('No se pudo reportar la multa de tránsito.');
    }
    this.toastService.success('Multa reportada', 'La multa de tránsito ha sido reportada con éxito.');
    return newInfraction as TrafficInfraction;
  }

  /**
   * Obtiene todas las multas de tránsito para una reserva específica.
   * @param bookingId ID de la reserva.
   * @returns Lista de multas de tránsito.
   */
  async getInfractionsByBooking(bookingId: string): Promise<TrafficInfraction[]> {
    const { data, error } = await this.supabase
      .from('traffic_infractions')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching traffic infractions:', error);
      throw new Error('No se pudieron cargar las multas de tránsito.');
    }
    return (data || []) as TrafficInfraction[];
  }

  /**
   * Actualiza el estado de una multa.
   * Usado principalmente para que el renter dispute o el admin resuelva.
   * @param infractionId ID de la multa.
   * @param newStatus Nuevo estado.
   * @param disputeReason Razón de disputa (si aplica).
   */
  async updateInfractionStatus(
    infractionId: string,
    newStatus: TrafficInfraction['status'],
    disputeReason?: string,
  ): Promise<TrafficInfraction> {
    const updateData: Partial<TrafficInfraction> = { status: newStatus };
    if (disputeReason) {
      updateData.dispute_reason = disputeReason;
    }

    const { data, error } = await this.supabase
      .from('traffic_infractions')
      .update(updateData)
      .eq('id', infractionId)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating traffic infraction status:', error);
      throw new Error('No se pudo actualizar el estado de la multa.');
    }
    this.toastService.success('Multa actualizada', 'El estado de la multa ha sido actualizado.');
    return data as TrafficInfraction;
  }
}

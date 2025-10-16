import { Injectable } from '@angular/core';
import { injectSupabase } from './supabase-client.service';

export interface Message {
  id: string;
  booking_id: string | null;
  car_id: string | null;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class MessagesService {
  private readonly supabase = injectSupabase();

  async listByBooking(bookingId: string): Promise<Message[]> {
    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Message[];
  }

  async listByCar(carId: string): Promise<Message[]> {
    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('car_id', carId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Message[];
  }

  async sendMessage(params: {
    recipientId: string;
    body: string;
    bookingId?: string;
    carId?: string;
  }): Promise<void> {
    if (!params.bookingId && !params.carId) {
      throw new Error('Debes indicar bookingId o carId');
    }

    const {
      data: { user },
      error: authError,
    } = await this.supabase.auth.getUser();
    if (authError) throw authError;
    if (!user?.id) throw new Error('Usuario no autenticado');

    const { error } = await this.supabase.from('messages').insert({
      booking_id: params.bookingId ?? null,
      car_id: params.carId ?? null,
      sender_id: user.id,
      recipient_id: params.recipientId,
      body: params.body,
    });
    if (error) throw error;
  }
}

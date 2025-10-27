import { Injectable } from '@angular/core';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { injectSupabase } from './supabase-client.service';

export interface Message {
  id: string;
  booking_id: string | null;
  car_id: string | null;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  delivered_at: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class MessagesService {
  private readonly supabase = injectSupabase();
  private realtimeChannel?: RealtimeChannel;

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

  subscribeToBooking(bookingId: string, handler: (message: Message) => void): void {
    this.unsubscribe();

    this.realtimeChannel = this.supabase
      .channel(`booking-messages-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload: RealtimePostgresChangesPayload<Message>) => {
          handler(payload.new as Message);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload: RealtimePostgresChangesPayload<Message>) => {
          handler(payload.new as Message);
        },
      )
      .subscribe();
  }

  async markAsRead(messageId: string): Promise<void> {
    const { error } = await this.supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId);
    if (error) throw error;
  }

  async markAsDelivered(messageId: string): Promise<void> {
    const { error } = await this.supabase
      .from('messages')
      .update({ delivered_at: new Date().toISOString() })
      .eq('id', messageId)
      .is('delivered_at', null);
    if (error) throw error;
  }

  // Typing indicator usando presence
  async setTyping(bookingId: string, userId: string, isTyping: boolean): Promise<void> {
    try {
      const channel = this.supabase.channel(`presence-${bookingId}`, {
        config: {
          presence: {
            key: userId,
          },
        },
      });
      
      await channel.subscribe();
      
      if (isTyping) {
        await channel.track({ user_id: userId, typing: true });
      } else {
        await channel.untrack();
      }
    } catch (error) {
      console.warn('Error setting typing status:', error);
      // Don't throw - typing is not critical
    }
  }

  subscribeToTyping(bookingId: string, callback: (typingUsers: string[]) => void): RealtimeChannel {
    const channel = this.supabase
      .channel(`presence-${bookingId}`, {
        config: {
          presence: {
            key: 'typing',
          },
        },
      })
      .on('presence', { event: 'sync' }, () => {
        try {
          const state = channel.presenceState();
          const typingUsers = Object.values(state)
            .flat()
            .filter((presence: any) => presence?.typing)
            .map((presence: any) => presence?.user_id)
            .filter(Boolean);
          callback(typingUsers);
        } catch (error) {
          console.warn('Error getting typing status:', error);
        }
      })
      .subscribe();
    
    return channel;
  }

  unsubscribe(): void {
    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = undefined;
    }
  }
}

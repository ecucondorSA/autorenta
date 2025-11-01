import { Injectable, signal, inject } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { injectSupabase } from './supabase-client.service';
import { RealtimeConnectionService, ConnectionStatus } from './realtime-connection.service';
import { OfflineMessagesService } from './offline-messages.service';

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
  private readonly realtimeConnection = inject(RealtimeConnectionService);
  private readonly offlineMessages = inject(OfflineMessagesService);

  private realtimeChannel?: RealtimeChannel;

  // Online/offline status
  readonly isOnline = signal<boolean>(navigator.onLine);
  readonly isSyncing = signal<boolean>(false);

  constructor() {
    // Monitor network connectivity
    window.addEventListener('online', () => {
      this.isOnline.set(true);
      this.syncOfflineMessages();
    });

    window.addEventListener('offline', () => {
      this.isOnline.set(false);
    });
  }

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

  async listCarLeadsForOwner(ownerId: string): Promise<
    Array<{
      message: Message;
      car: { id: string; title?: string | null };
      otherUserId: string;
    }>
  > {
    const { data, error } = await this.supabase
      .from('messages')
      .select(
        `
        id,
        booking_id,
        car_id,
        sender_id,
        recipient_id,
        body,
        created_at,
        read_at,
        delivered_at,
        car:cars!inner(id,title,owner_id)
      `,
      )
      .is('booking_id', null)
      .not('car_id', 'is', null)
      .eq('car.owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const rows = (data ?? []) as unknown as Array<
      Message & {
        car: { id: string; title?: string | null; owner_id?: string | null };
      }
    >;

    return rows
      .map((row) => {
        const otherId = row.sender_id === ownerId ? row.recipient_id : row.sender_id;
        if (!otherId) {
          return null;
        }
        return {
          message: {
            id: row.id,
            booking_id: row.booking_id,
            car_id: row.car_id,
            sender_id: row.sender_id,
            recipient_id: row.recipient_id,
            body: row.body,
            created_at: row.created_at,
            read_at: row.read_at,
            delivered_at: row.delivered_at,
          } as Message,
          car: { id: row.car?.id, title: row.car?.title ?? null },
          otherUserId: otherId,
        };
      })
      .filter((lead): lead is NonNullable<typeof lead> => lead !== null);
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

    // Try to send immediately
    try {
      const { error } = await this.supabase.from('messages').insert({
        booking_id: params.bookingId ?? null,
        car_id: params.carId ?? null,
        sender_id: user.id,
        recipient_id: params.recipientId,
        body: params.body,
      });

      if (error) throw error;
    } catch (error) {
      // Queue for retry when connection is restored
      await this.offlineMessages.queueMessage({
        bookingId: params.bookingId,
        carId: params.carId,
        recipientId: params.recipientId,
        body: params.body,
      });

      // Re-throw so UI can show "Sending..." state
      throw error;
    }
  }

  subscribeToBooking(
    bookingId: string,
    handler: (message: Message) => void,
    onConnectionChange?: (status: ConnectionStatus) => void,
  ): void {
    this.unsubscribe();

    // Use resilient connection service with auto-reconnect
    this.realtimeChannel = this.realtimeConnection.subscribeWithRetry<Message>(
      `booking-messages-${bookingId}`,
      {
        event: '*', // Listen to all events (INSERT, UPDATE)
        schema: 'public',
        table: 'messages',
        filter: `booking_id=eq.${bookingId}`,
      },
      (payload) => {
        handler(payload.new as Message);
      },
      onConnectionChange,
    );
  }

  /**
   * Subscribe to messages by car ID (for pre-booking chats)
   */
  subscribeToCar(
    carId: string,
    handler: (message: Message) => void,
    onConnectionChange?: (status: ConnectionStatus) => void,
  ): void {
    this.unsubscribe();

    // Use resilient connection service with auto-reconnect
    this.realtimeChannel = this.realtimeConnection.subscribeWithRetry<Message>(
      `car-messages-${carId}`,
      {
        event: '*', // Listen to all events (INSERT, UPDATE)
        schema: 'public',
        table: 'messages',
        filter: `car_id=eq.${carId}`,
      },
      (payload) => {
        handler(payload.new as Message);
      },
      onConnectionChange,
    );
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
          // Presence state is Record<string, unknown[]>
          const typingUsers = Object.values(state)
            .flat()
            .filter(
              (
                presence,
              ): presence is { typing?: boolean; user_id?: string; presence_ref: string } => {
                return typeof presence === 'object' && presence !== null && 'typing' in presence;
              },
            )
            .filter((presence) => presence.typing)
            .map((presence) => presence.user_id)
            .filter((id): id is string => typeof id === 'string');
          callback(typingUsers);
        } catch (error) {}
      })
      .subscribe();

    return channel;
  }

  /**
   * Sync offline messages when connection is restored
   */
  private async syncOfflineMessages(): Promise<void> {
    this.isSyncing.set(true);

    try {
      const pending = await this.offlineMessages.getMessagesForRetry();

      for (const message of pending) {
        // Check if we should retry this message (respects exponential backoff)
        if (!this.offlineMessages.shouldRetry(message)) {
          continue;
        }

        try {
          const {
            data: { user },
          } = await this.supabase.auth.getUser();
          if (!user?.id) {
            continue;
          }

          // Attempt to send
          const { error } = await this.supabase.from('messages').insert({
            booking_id: message.bookingId ?? null,
            car_id: message.carId ?? null,
            sender_id: user.id,
            recipient_id: message.recipientId,
            body: message.body,
          });

          if (error) throw error;

          // Success: remove from queue
          await this.offlineMessages.removeMessage(message.id);
        } catch (error) {
          // Increment retry counter
          await this.offlineMessages.incrementRetry(message.id);

          // If exceeded max retries, remove
          if (message.retries + 1 >= 5) {
            await this.offlineMessages.removeMessage(message.id);
          }
        }
      }
    } catch (error) {
    } finally {
      this.isSyncing.set(false);
    }
  }

  unsubscribe(): void {
    if (this.realtimeChannel) {
      this.realtimeConnection.unsubscribe(this.realtimeChannel.topic);
      this.realtimeChannel = undefined;
    }
  }
}

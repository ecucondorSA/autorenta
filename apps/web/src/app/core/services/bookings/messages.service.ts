import { isPlatformBrowser } from '@angular/common';
import { Injectable, signal, inject, OnDestroy, PLATFORM_ID } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  MessagesRepository,
  ConversationListOptions,
  PaginatedConversations,
} from '@core/repositories/messages.repository';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import {
  RealtimeConnectionService,
  ConnectionStatus,
} from '@core/services/infrastructure/realtime-connection.service';
import { OfflineMessagesService } from '@core/services/infrastructure/offline-messages.service';
import { RateLimiterService } from '@core/services/infrastructure/rate-limiter.service';

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
export class MessagesService implements OnDestroy {
  private readonly supabase = injectSupabase();
  private readonly realtimeConnection = inject(RealtimeConnectionService);
  private readonly offlineMessages = inject(OfflineMessagesService);
  private readonly messagesRepository = inject(MessagesRepository);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  // Bound event handlers for proper cleanup
  private readonly handleOnline = () => {
    this.isOnline.set(true);
    this.syncOfflineMessages();
  };
  private readonly handleOffline = () => {
    this.isOnline.set(false);
  };

  constructor(private readonly rateLimiter: RateLimiterService) {
    // Monitor network connectivity with bound handlers for cleanup (browser only)
    if (this.isBrowser) {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  ngOnDestroy(): void {
    if (this.isBrowser) {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    this.unsubscribe();
    // Clean up all typing channels
    this.typingChannels.forEach((channel) => {
      this.supabase.removeChannel(channel);
    });
    this.typingChannels.clear();
  }

  private realtimeChannel?: RealtimeChannel;

  // Online/offline status
  readonly isOnline = signal<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  readonly isSyncing = signal<boolean>(false);

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
  }): Promise<Message> {
    if (!params.bookingId && !params.carId) {
      throw new Error('Debes indicar bookingId o carId');
    }

    const {
      data: { user },
      error: authError,
    } = await this.supabase.auth.getUser();
    if (authError) throw authError;
    if (!user?.id) throw new Error('Usuario no autenticado');

    // Check bidirectional block status
    const blockStatus = await this.isBlocked(params.recipientId);
    if (blockStatus.blocked) {
      throw new Error('Has bloqueado a este usuario. Desbloquealo para enviar mensajes.');
    }
    if (blockStatus.blockedBy) {
      throw new Error('Este usuario te ha bloqueado. No puedes enviarle mensajes.');
    }

    // P0-015: Check rate limit for messages
    if (!this.rateLimiter.isAllowed('messageSend', user.id)) {
      this.rateLimiter.logViolation('messageSend', user.id);
      throw new Error(this.rateLimiter.getErrorMessage('messageSend', user.id));
    }

    // Try to send immediately
    try {
      this.rateLimiter.recordAttempt('messageSend', user.id);
      const { data, error } = await this.supabase
        .from('messages')
        .insert({
          booking_id: params.bookingId ?? null,
          car_id: params.carId ?? null,
          sender_id: user.id,
          recipient_id: params.recipientId,
          body: params.body,
        })
        .select('*')
        .single<Message>();

      if (error) throw error;
      if (!data) {
        throw new Error('No se pudo obtener el mensaje enviado');
      }

      return data;
    } catch (_error) {
      // Queue for retry when connection is restored
      await this.offlineMessages.queueMessage({
        bookingId: params.bookingId,
        carId: params.carId,
        recipientId: params.recipientId,
        body: params.body,
      });

      // Re-throw so UI can show "Sending..." state
      throw _error;
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

  // 🚀 PERF: Cache typing channels to prevent leaks
  private typingChannels = new Map<string, RealtimeChannel>();

  // Typing indicator usando presence
  /**
   * Establece el estado de typing para un booking
   */
  async setTyping(bookingId: string, userId: string, isTyping: boolean): Promise<void>;
  /**
   * Establece el estado de typing para un car chat
   */
  async setTyping(
    contextId: string,
    userId: string,
    isTyping: boolean,
    type: 'car' | 'booking',
  ): Promise<void>;
  async setTyping(
    contextId: string,
    userId: string,
    isTyping: boolean,
    type?: 'car' | 'booking',
  ): Promise<void> {
    try {
      // Determinar el nombre del canal según el tipo
      const channelName = type === 'car' ? `presence-car-${contextId}` : `presence-${contextId}`;

      // Reuse existing channel or create new one
      let channel = this.typingChannels.get(channelName);

      if (!channel) {
        channel = this.supabase.channel(channelName, {
          config: {
            presence: {
              key: userId,
            },
          },
        });
        await channel.subscribe();
        this.typingChannels.set(channelName, channel);
      }

      if (isTyping) {
        await channel.track({ user_id: userId, typing: true });
      } else {
        await channel.untrack();
        // Clean up channel when user stops typing
        this.typingChannels.delete(channelName);
        await this.supabase.removeChannel(channel);
      }
    } catch {
      // Don't throw - typing is not critical
    }
  }

  /**
   * Suscribe a cambios de typing para un booking
   */
  subscribeToTyping(bookingId: string, callback: (typingUsers: string[]) => void): RealtimeChannel;
  /**
   * Suscribe a cambios de typing para un car chat
   */
  subscribeToTyping(
    contextId: string,
    callback: (typingUsers: string[]) => void,
    type: 'car' | 'booking',
  ): RealtimeChannel;
  subscribeToTyping(
    contextId: string,
    callback: (typingUsers: string[]) => void,
    type?: 'car' | 'booking',
  ): RealtimeChannel {
    // Determinar el nombre del canal según el tipo
    const channelName = type === 'car' ? `presence-car-${contextId}` : `presence-${contextId}`;

    const channel = this.supabase
      .channel(channelName, {
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
        } catch {
          // Silently ignore typing errors
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.debug('[Messages] Typing subscription active');
        }
      });

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
        } catch {
          // Increment retry counter
          await this.offlineMessages.incrementRetry(message.id);

          // If exceeded max retries, remove
          if (message.retries + 1 >= 5) {
            await this.offlineMessages.removeMessage(message.id);
          }
        }
      }
    } catch {
      // Silently ignore sync errors
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

  /**
   * Lista conversaciones con paginación usando MessagesRepository
   */
  async listConversations(
    userId: string,
    options?: ConversationListOptions,
  ): Promise<PaginatedConversations> {
    return this.messagesRepository.listConversations(userId, options);
  }

  /**
   * Marca una conversación completa como leída
   * Actualiza todos los mensajes no leídos de la conversación
   */
  async markConversationRead(
    conversationId: string,
    userId: string,
    type: 'booking' | 'car',
  ): Promise<void> {
    const filter = type === 'booking' ? { booking_id: conversationId } : { car_id: conversationId };

    const { error } = await this.supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('recipient_id', userId)
      .match(filter)
      .is('read_at', null);

    if (error) throw error;
  }

  /**
   * Bloquea a un usuario en el servidor.
   */
  async blockUser(userIdToBlock: string): Promise<void> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { error } = await this.supabase.from('user_blocks').insert({
      blocker_id: user.id,
      blocked_id: userIdToBlock,
    });

    if (error) throw error;
  }

  /**
   * Desbloquea a un usuario en el servidor.
   */
  async unblockUser(userIdToUnblock: string): Promise<void> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { error } = await this.supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', userIdToUnblock);

    if (error) throw error;
  }

  /**
   * Verifica si el usuario actual ha bloqueado a otro usuario.
   */
  async isUserBlocked(userId: string): Promise<boolean> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) return false;

    const { count, error } = await this.supabase
      .from('user_blocks')
      .select('*', { count: 'exact', head: true })
      .eq('blocker_id', user.id)
      .eq('blocked_id', userId);

    if (error) return false;
    return (count ?? 0) > 0;
  }

  /**
   * Verifica si otro usuario ha bloqueado al usuario actual.
   */
  async isBlockedByUser(userId: string): Promise<boolean> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) return false;

    const { count, error } = await this.supabase
      .from('user_blocks')
      .select('*', { count: 'exact', head: true })
      .eq('blocker_id', userId)
      .eq('blocked_id', user.id);

    if (error) return false;
    return (count ?? 0) > 0;
  }

  /**
   * Verifica bloqueo bidireccional: si yo bloqueé al otro O si el otro me bloqueó.
   */
  async isBlocked(userId: string): Promise<{ blocked: boolean; blockedBy: boolean }> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) return { blocked: false, blockedBy: false };

    // Query both directions in one call using OR
    const { data, error } = await this.supabase
      .from('user_blocks')
      .select('blocker_id, blocked_id')
      .or(
        `and(blocker_id.eq.${user.id},blocked_id.eq.${userId}),and(blocker_id.eq.${userId},blocked_id.eq.${user.id})`,
      );

    if (error) return { blocked: false, blockedBy: false };

    const rows = data ?? [];
    const blocked = rows.some((r) => r.blocker_id === user.id && r.blocked_id === userId);
    const blockedBy = rows.some((r) => r.blocker_id === userId && r.blocked_id === user.id);

    return { blocked, blockedBy };
  }

  /**
   * Formatea una fecha relativa para mostrar en UI
   * Ejemplos: "Ahora", "Hace 5m", "Hace 2h", "Hace 3d", "15 nov"
   */
  formatRelativeDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diff = now.getTime() - dateObj.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes}m`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days < 7) return `Hace ${days}d`;

    return dateObj.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  }

  /**
   * Formatea hora para mostrar en mensajes
   * Ejemplo: "14:30"
   */
  formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Formatea fecha completa para mostrar en mensajes
   * Ejemplo: "15 nov 2024, 14:30"
   */
  formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

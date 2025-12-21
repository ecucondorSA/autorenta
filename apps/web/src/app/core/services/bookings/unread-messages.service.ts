import { Injectable, signal, inject, computed, effect, Injector } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { AuthService } from '@core/services/auth/auth.service';
import { CarOwnerNotificationsService } from './car-owner-notifications.service';
import { CarsService } from '@core/services/cars/cars.service';
import { ProfileService } from '@core/services/auth/profile.service';

export interface UnreadConversation {
  conversationId: string; // booking_id or car_id
  type: 'booking' | 'car';
  unreadCount: number;
  lastMessage: string;
  lastMessageAt: string;
  otherUserId: string;
  otherUserName?: string;
}

interface MessageRow {
  id: string;
  booking_id: string | null;
  car_id: string | null;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

interface AudioContextWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

/**
 * Service to track unread messages count across all conversations
 * Supports both booking-based and car-based conversations
 */
@Injectable({
  providedIn: 'root',
})
export class UnreadMessagesService {
  private readonly supabase = injectSupabase();
  private readonly authService = inject(AuthService);
  private readonly carOwnerNotifications = inject(CarOwnerNotificationsService);
  private readonly carsService = inject(CarsService);
  private readonly profileService = inject(ProfileService);

  private realtimeChannel?: RealtimeChannel;

  // Signals for reactivity
  readonly unreadConversations = signal<UnreadConversation[]>([]);
  readonly totalUnreadCount = computed(() =>
    this.unreadConversations().reduce((sum, conv) => sum + conv.unreadCount, 0),
  );
  readonly isLoading = signal(false);

  constructor() {
    effect(
      () => {
        const session = this.authService.session$();
        if (session?.user) {
          this.initialize();
        } else {
          this.cleanup();
        }
      },
      { injector: this.injector },
    );
  }

  private readonly injector = inject(Injector);

  /**
   * Initialize the service: fetch unread counts and subscribe to real-time updates
   */
  async initialize(): Promise<void> {
    const user = this.authService.session$()?.user;
    if (!user) return;

    this.isLoading.set(true);

    try {
      await this.fetchUnreadConversations(user.id);
      this.subscribeToNewMessages(user.id);
    } catch {
      // Silent fail
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Fetch all conversations with unread messages
   */
  private async fetchUnreadConversations(userId: string): Promise<void> {
    try {
      // Fetch unread messages grouped by conversation
      const { data, error } = await this.supabase
        .from('messages')
        .select('id, booking_id, car_id, sender_id, recipient_id, body, created_at')
        .eq('recipient_id', userId)
        .is('read_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        this.unreadConversations.set([]);
        return;
      }

      // Group by conversation (booking_id or car_id)
      const conversationsMap = new Map<string, UnreadConversation>();

      const messages = (data as MessageRow[]) ?? [];

      for (const message of messages) {
        const conversationId = message.booking_id ?? message.car_id;
        if (!conversationId) continue;

        const type = message.booking_id ? 'booking' : 'car';
        const key = `${type}-${conversationId}`;

        if (!conversationsMap.has(key)) {
          conversationsMap.set(key, {
            conversationId,
            type: type as 'booking' | 'car',
            unreadCount: 0,
            lastMessage: message.body,
            lastMessageAt: message.created_at,
            otherUserId: message.sender_id,
          });
        }

        const conv = conversationsMap.get(key)!;
        conv.unreadCount++;

        // Keep the most recent message
        if (new Date(message.created_at) > new Date(conv.lastMessageAt)) {
          conv.lastMessage = message.body;
          conv.lastMessageAt = message.created_at;
        }
      }

      this.unreadConversations.set(Array.from(conversationsMap.values()));
    } catch {
      // Silent fail
    }
  }

  /**
   * Subscribe to real-time new messages
   */
  private subscribeToNewMessages(userId: string): void {
    // Unsubscribe from any existing channel
    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel);
    }

    // Subscribe to messages table for new messages where user is recipient
    this.realtimeChannel = this.supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          this.handleNewMessage(payload.new as MessageRow);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          this.handleMessageUpdate(payload.new as MessageRow);
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.debug('[UnreadMessages] Realtime subscription active');
        }
      });
  }

  /**
   * Handle new message received via real-time
   */
  private async handleNewMessage(message: MessageRow): Promise<void> {
    const conversationId = message.booking_id ?? message.car_id;
    if (!conversationId) return;

    const type = message.booking_id ? 'booking' : 'car';
    const conversations = [...this.unreadConversations()];
    const existingIndex = conversations.findIndex(
      (c) => c.conversationId === conversationId && c.type === type,
    );

    if (existingIndex >= 0) {
      // Update existing conversation
      conversations[existingIndex] = {
        ...conversations[existingIndex],
        unreadCount: conversations[existingIndex].unreadCount + 1,
        lastMessage: message.body,
        lastMessageAt: message.created_at,
      };
    } else {
      // Add new conversation
      conversations.push({
        conversationId,
        type: type as 'booking' | 'car',
        unreadCount: 1,
        lastMessage: message.body,
        lastMessageAt: message.created_at,
        otherUserId: message.sender_id,
      });
    }

    this.unreadConversations.set(conversations);

    // Play notification sound
    this.playNotificationSound();

    // ✅ NUEVO: Mostrar notificación profesional si es un mensaje sobre un auto
    // Solo si el usuario actual es el dueño del auto (recipient)
    const currentUser = this.authService.session$()?.user;
    if (currentUser && message.recipient_id === currentUser.id) {
      const carId = message.car_id;
      if (carId && type === 'car') {
        // Mostrar notificación de forma asíncrona sin bloquear
        this.showCarMessageNotification(carId, message.sender_id, message.body).catch(() => {
          // Silently fail - notification is optional enhancement
        });
      }
    }
  }

  /**
   * Muestra notificación profesional cuando llega un mensaje sobre un auto
   */
  private async showCarMessageNotification(
    carId: string,
    senderId: string,
    messageBody: string,
  ): Promise<void> {
    try {
      // Obtener información del auto y del remitente en paralelo
      const [car, sender] = await Promise.all([
        this.carsService.getCarById(carId),
        this.profileService.getProfileById(senderId),
      ]);

      if (car && sender) {
        const carName = car.title || `${car.brand || ''} ${car.model || ''}`.trim() || 'tu auto';
        const senderName = sender.full_name || 'Un usuario';
        const chatUrl = `/messages?carId=${carId}&userId=${senderId}`;

        this.carOwnerNotifications.notifyNewChatMessage(senderName, carName, messageBody, chatUrl);
      }
    } catch {
      // Silently fail - notification is optional enhancement
    }
  }

  /**
   * Handle message update (e.g., marked as read)
   */
  private handleMessageUpdate(message: MessageRow): void {
    if (message.read_at) {
      // Message was marked as read, decrement count
      const conversationId = message.booking_id ?? message.car_id;
      if (!conversationId) return;

      const type = message.booking_id ? 'booking' : 'car';
      const conversations = [...this.unreadConversations()];
      const existingIndex = conversations.findIndex(
        (c) => c.conversationId === conversationId && c.type === type,
      );

      if (existingIndex >= 0) {
        conversations[existingIndex] = {
          ...conversations[existingIndex],
          unreadCount: Math.max(0, conversations[existingIndex].unreadCount - 1),
        };

        // Remove conversation if no unread messages
        if (conversations[existingIndex].unreadCount === 0) {
          conversations.splice(existingIndex, 1);
        }

        this.unreadConversations.set(conversations);
      }
    }
  }

  /**
   * Mark all messages in a conversation as read
   */
  async markConversationAsRead(conversationId: string, type: 'booking' | 'car'): Promise<void> {
    const user = this.authService.session$()?.user;
    if (!user) return;

    try {
      const filter =
        type === 'booking' ? { booking_id: conversationId } : { car_id: conversationId };

      const { error } = await this.supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('recipient_id', user.id)
        .match(filter)
        .is('read_at', null);

      if (error) throw error;

      // Update local state
      const conversations = this.unreadConversations().filter(
        (c) => !(c.conversationId === conversationId && c.type === type),
      );
      this.unreadConversations.set(conversations);
    } catch {
      // Silent fail
    }
  }

  /**
   * Play a notification sound
   */
  private playNotificationSound(): void {
    try {
      // Create a simple notification sound using Web Audio API
      const audioContextClass =
        window.AudioContext || (window as AudioContextWindow).webkitAudioContext;
      if (!audioContextClass) {
        return;
      }

      const audioContext = new audioContextClass();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch {
      // Silently fail if audio context not supported
    }
  }

  /**
   * Clean up subscriptions
   */
  private cleanup(): void {
    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = undefined;
    }
    this.unreadConversations.set([]);
  }

  /**
   * Manual refresh
   */
  async refresh(): Promise<void> {
    const user = this.authService.session$()?.user;
    if (user) {
      await this.fetchUnreadConversations(user.id);
    }
  }
}

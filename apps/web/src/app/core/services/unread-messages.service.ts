import { Injectable, signal, inject, computed, effect, Injector, DestroyRef } from '@angular/core';
import { injectSupabase } from './supabase-client.service';
import { AuthService } from './auth.service';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface UnreadConversation {
  conversationId: string; // booking_id or car_id
  type: 'booking' | 'car';
  unreadCount: number;
  lastMessage: string;
  lastMessageAt: string;
  otherUserId: string;
  otherUserName?: string;
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
  
  private realtimeChannel?: RealtimeChannel;
  
  // Signals for reactivity
  readonly unreadConversations = signal<UnreadConversation[]>([]);
  readonly totalUnreadCount = computed(() => 
    this.unreadConversations().reduce((sum, conv) => sum + conv.unreadCount, 0)
  );
  readonly isLoading = signal(false);

  constructor() {
    const destroyRef = inject(DestroyRef);

    effect(() => {
      const session = this.authService.session$();
      if (session?.user) {
        this.initialize();
      } else {
        this.cleanup();
      }
    }, { injector: this.injector, allowSignalWrites: true });
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
    } catch (error) {
      console.error('Error initializing unread messages:', error);
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

      for (const message of data) {
        const conversationId = message.booking_id || message.car_id;
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
    } catch (error) {
      console.error('Error fetching unread conversations:', error);
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
          this.handleNewMessage(payload.new);
        }
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
          this.handleMessageUpdate(payload.new);
        }
      )
      .subscribe();
  }

  /**
   * Handle new message received via real-time
   */
  private handleNewMessage(message: any): void {
    const conversationId = message.booking_id || message.car_id;
    if (!conversationId) return;

    const type = message.booking_id ? 'booking' : 'car';
    const conversations = [...this.unreadConversations()];
    const existingIndex = conversations.findIndex(
      (c) => c.conversationId === conversationId && c.type === type
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
  }

  /**
   * Handle message update (e.g., marked as read)
   */
  private handleMessageUpdate(message: any): void {
    if (message.read_at) {
      // Message was marked as read, decrement count
      const conversationId = message.booking_id || message.car_id;
      if (!conversationId) return;

      const type = message.booking_id ? 'booking' : 'car';
      const conversations = [...this.unreadConversations()];
      const existingIndex = conversations.findIndex(
        (c) => c.conversationId === conversationId && c.type === type
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
      const filter = type === 'booking' 
        ? { booking_id: conversationId }
        : { car_id: conversationId };

      const { error } = await this.supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('recipient_id', user.id)
        .match(filter)
        .is('read_at', null);

      if (error) throw error;

      // Update local state
      const conversations = this.unreadConversations().filter(
        (c) => !(c.conversationId === conversationId && c.type === type)
      );
      this.unreadConversations.set(conversations);
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  }

  /**
   * Play a notification sound
   */
  private playNotificationSound(): void {
    try {
      // Create a simple notification sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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
    } catch (error) {
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

import { Injectable, computed, signal, inject } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { ToastService } from '@core/services/ui/toast.service';

export interface ChatMessage {
  id: string;
  booking_id: string | null;
  car_id: string | null;
  sender_id: string;
  recipient_id: string;
  body: string;
  is_flagged: boolean;
  is_system_message: boolean;
  read_at: string | null;
  created_at: string;
  is_mine?: boolean; // Helper frontend
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private supabase = injectSupabase();
  private toast = inject(ToastService);

  // State
  private messagesSignal = signal<ChatMessage[]>([]);
  readonly messages = computed(() => this.messagesSignal());

  private activeChannel: RealtimeChannel | null = null;

  /**
   * Load messages for a context (Booking or Car)
   */
  async loadMessages(context: { bookingId?: string; carId?: string }) {
    let query = this.supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true }); // Oldest first for chat

    if (context.bookingId) {
      query = query.eq('booking_id', context.bookingId);
    } else if (context.carId) {
      query = query.eq('car_id', context.carId);
    } else {
      throw new Error('Chat context required (bookingId or carId)');
    }

    const { data, error } = await query;
    if (error) throw error;

    const user = (await this.supabase.auth.getUser()).data.user;
    const enriched = (data || []).map(m => ({
      ...m,
      is_mine: m.sender_id === user?.id
    }));

    this.messagesSignal.set(enriched);

    // Subscribe to new messages
    this.subscribeToRealtime(context);
  }

  /**
   * Send a message with Optimistic UI and Leakage Warning
   */
  async sendMessage(params: {
    bookingId?: string;
    carId?: string;
    recipientId: string;
    body: string;
  }): Promise<void> {
    const { body } = params;

    // 1. Trust & Safety Check (Client Side)
    if (this.detectLeakage(body)) {
      const confirm = window.confirm(
        '⚠️ Aviso de Seguridad:\n\n' +
        'Detectamos que intentas compartir información de contacto (teléfono/email).\n' +
        'Por tu seguridad, te recomendamos mantener la comunicación dentro de AutoRenta hasta confirmar la reserva.\n\n' +
        '¿Deseas enviar el mensaje de todos modos?'
      );
      if (!confirm) return;
    }

    const user = (await this.supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');

    // 2. Optimistic Update
    const tempId = crypto.randomUUID();
    const tempMsg: ChatMessage = {
      id: tempId,
      booking_id: params.bookingId || null,
      car_id: params.carId || null,
      sender_id: user.id,
      recipient_id: params.recipientId,
      body: params.body,
      is_flagged: false,
      is_system_message: false,
      read_at: null,
      created_at: new Date().toISOString(),
      is_mine: true
    };

    this.messagesSignal.update(msgs => [...msgs, tempMsg]);

    // 3. Send to Backend
    const { error } = await this.supabase.from('messages').insert({
      booking_id: params.bookingId,
      car_id: params.carId,
      recipient_id: params.recipientId,
      sender_id: user.id,
      body: params.body
    });

    if (error) {
      // Revert optimistic update on failure
      this.messagesSignal.update(msgs => msgs.filter(m => m.id !== tempId));
      this.toast.error('Error', 'Error al enviar mensaje');
      throw error;
    }
  }

  /**
   * Realtime Subscription
   */
  private subscribeToRealtime(context: { bookingId?: string; carId?: string }) {
    if (this.activeChannel) {
      this.supabase.removeChannel(this.activeChannel);
    }

    const filter = context.bookingId
      ? `booking_id=eq.${context.bookingId}`
      : `car_id=eq.${context.carId}`;

    this.activeChannel = this.supabase.channel('chat-room')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;
          const user = (await this.supabase.auth.getUser()).data.user;

          // Avoid duplicating my own message (already added optimistically)
          // But replace optimistic one with real one if needed.
          // For simplicity in V1: we just add if not mine, assuming send() handles mine.
          // Actually, better to reload or merge.

          if (newMsg.sender_id !== user?.id) {
            this.messagesSignal.update(msgs => [...msgs, { ...newMsg, is_mine: false }]);
            // Play sound?
          }
        }
      )
      .subscribe();
  }

  /**
   * Leakage Detection Logic
   */
  private detectLeakage(text: string): boolean {
    // Phone patterns (very basic)
    const phoneRegex = /\b(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})\b/;
    // Email patterns
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    // Keywords
    const keywords = ['whatsapp', 'telegram', 'celular', 'llamame'];

    if (phoneRegex.test(text) || emailRegex.test(text)) return true;
    if (keywords.some(k => text.toLowerCase().includes(k))) return true;

    return false;
  }

  cleanup() {
    if (this.activeChannel) {
      this.supabase.removeChannel(this.activeChannel);
      this.activeChannel = null;
    }
  }
}

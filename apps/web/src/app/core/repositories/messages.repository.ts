import { Injectable } from '@angular/core';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

/**
 * DTO para una conversación con datos enriquecidos
 */
export interface ConversationDTO {
  id: string; // Clave compuesta: `${carId || bookingId}_${otherUserId}`
  carId?: string;
  bookingId?: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar?: string;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
  carBrand?: string;
  carModel?: string;
  carYear?: number;
  archivedAt?: Date | null;
}

/**
 * Opciones de paginación para listar conversaciones
 */
export interface ConversationListOptions {
  limit?: number;
  offset?: number;
  archived?: boolean;
  carId?: string;
  bookingId?: string;
}

/**
 * Resultado paginado de conversaciones
 */
export interface PaginatedConversations {
  conversations: ConversationDTO[];
  total: number;
  hasMore: boolean;
}

/**
 * Repository para operaciones de datos de mensajes y conversaciones
 * Encapsula la lógica de joins y queries complejas
 */
@Injectable({
  providedIn: 'root',
})
export class MessagesRepository {
  private readonly supabase = injectSupabase();

  /**
   * Lista todas las conversaciones del usuario con paginación
   * Realiza joins con profiles y cars para datos enriquecidos
   */
  async listConversations(
    userId: string,
    options: ConversationListOptions = {},
  ): Promise<PaginatedConversations> {
    const { limit = 50, offset = 0, archived = false, carId, bookingId } = options;

    // Construir query base
    let query = this.supabase
      .from('messages')
      .select(
        `
        id,
        car_id,
        booking_id,
        sender_id,
        recipient_id,
        body,
        read_at,
        created_at,
        cars!car_id (id, brand, model, year)
      `,
      )
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    // Aplicar filtros
    if (carId) {
      query = query.eq('car_id', carId);
    }
    if (bookingId) {
      query = query.eq('booking_id', bookingId);
    }

    // Obtener mensajes
    const { data: messages, error } = await query;

    if (error) {
      throw new Error(`Error loading conversations: ${error.message}`);
    }

    if (!messages || messages.length === 0) {
      return {
        conversations: [],
        total: 0,
        hasMore: false,
      };
    }

    // Agrupar por conversación y recopilar IDs de usuarios únicos
    const conversationsMap = new Map<string, ConversationDTO>();
    const userIds = new Set<string>();

    for (const msg of messages) {
      const otherUserId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
      userIds.add(otherUserId);
      const carData = Array.isArray(msg.cars) ? msg.cars[0] : msg.cars;
      const key = `${msg.car_id || msg.booking_id}_${otherUserId}`;

      if (!conversationsMap.has(key)) {
        conversationsMap.set(key, {
          id: key,
          carId: msg.car_id,
          bookingId: msg.booking_id,
          otherUserId,
          otherUserName: 'Usuario',
          otherUserAvatar: undefined,
          lastMessage: msg.body,
          lastMessageAt: new Date(msg.created_at),
          unreadCount: 0,
          carBrand: carData?.brand,
          carModel: carData?.model,
          carYear: carData?.year,
        });
      }

      // Contar no leídos
      if (msg.recipient_id === userId && !msg.read_at) {
        const conv = conversationsMap.get(key)!;
        conv.unreadCount++;
      }

      // Actualizar último mensaje si es más reciente
      const conv = conversationsMap.get(key)!;
      const msgDate = new Date(msg.created_at);
      if (msgDate > conv.lastMessageAt) {
        conv.lastMessage = msg.body;
        conv.lastMessageAt = msgDate;
      }
    }

    // Fetch user profiles para todos los participantes
    if (userIds.size > 0) {
      const { data: profiles } = await this.supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', Array.from(userIds));

      if (profiles) {
        const profilesMap = new Map(profiles.map((p) => [p.id, p]));

        // Actualizar conversaciones con datos de usuario
        conversationsMap.forEach((conv) => {
          const profile = profilesMap.get(conv.otherUserId);
          if (profile) {
            conv.otherUserName = profile.full_name || 'Usuario';
            conv.otherUserAvatar = profile.avatar_url || undefined;
          }
        });
      }
    }

    // Convertir map a array y ordenar por último mensaje
    let conversations = Array.from(conversationsMap.values()).sort(
      (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime(),
    );

    // Filtrar archivadas si es necesario
    if (!archived) {
      conversations = conversations.filter((c) => !c.archivedAt);
    }

    // Aplicar paginación
    const total = conversations.length;
    const paginatedConversations = conversations.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return {
      conversations: paginatedConversations,
      total,
      hasMore,
    };
  }

  /**
   * Obtiene una conversación específica por ID
   */
  async getConversationById(
    conversationId: string,
    userId: string,
  ): Promise<ConversationDTO | null> {
    const [contextId, otherUserId] = conversationId.split('_');
    if (!contextId || !otherUserId) {
      return null;
    }

    const options: ConversationListOptions = {
      limit: 1,
      offset: 0,
    };

    // Determinar si es car o booking
    if (contextId.startsWith('car-')) {
      options.carId = contextId.replace('car-', '');
    } else if (contextId.startsWith('booking-')) {
      options.bookingId = contextId.replace('booking-', '');
    } else {
      // Intentar ambos
      options.carId = contextId;
    }

    const result = await this.listConversations(userId, options);
    return result.conversations.find((c) => c.otherUserId === otherUserId) || null;
  }
}

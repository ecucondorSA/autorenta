import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MessagesService } from '../../core/services/messages.service';
import { AuthService } from '../../core/services/auth.service';
import { injectSupabase } from '../../core/services/supabase-client.service';
import { UnreadMessagesService } from '../../core/services/unread-messages.service';
import { OfflineMessagesIndicatorComponent } from '../../shared/components/offline-messages-indicator/offline-messages-indicator.component';

interface Conversation {
  id: string;
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
}

/**
 * 📬 Bandeja de entrada de mensajes
 * Muestra todas las conversaciones del usuario
 */
@Component({
  selector: 'app-inbox',
  standalone: true,
  imports: [CommonModule, OfflineMessagesIndicatorComponent],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <!-- Header -->
      <div class="sticky top-0 z-10 bg-white shadow dark:bg-gray-800">
        <div class="mx-auto max-w-4xl px-4 py-4">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Mensajes</h1>
              <p class="text-sm text-gray-500 dark:text-gray-300 dark:text-gray-300">
                {{ conversations().length }} conversaciones
              </p>
            </div>
            <app-offline-messages-indicator />
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="mx-auto max-w-4xl p-4">
        @if (loading()) {
          <div class="flex h-96 items-center justify-center">
            <div class="text-center">
              <div
                class="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-500"
              ></div>
              <p class="text-gray-600 dark:text-gray-300 dark:text-gray-300">Cargando conversaciones...</p>
            </div>
          </div>
        } @else if (error()) {
          <div class="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
            <p class="text-sm text-red-800 dark:text-red-200">{{ error() }}</p>
          </div>
        } @else if (conversations().length === 0) {
          <!-- Empty state -->
          <div class="py-16 text-center">
            <svg
              class="mx-auto h-16 w-16 text-gray-400 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              No hay mensajes
            </h3>
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-300 dark:text-gray-300">
              Cuando alguien te escriba, aparecerá aquí
            </p>
          </div>
        } @else {
          <!-- Conversations list -->
          <div class="space-y-2">
            @for (conv of conversations(); track conv.id) {
              <button
                (click)="openConversation(conv)"
                class="group w-full rounded-lg border border-gray-200 bg-white p-4 text-left transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                type="button"
              >
                <div class="flex items-start gap-4">
                  <!-- Avatar -->
                  <div class="flex-shrink-0">
                    @if (conv.otherUserAvatar) {
                      <img
                        [src]="conv.otherUserAvatar"
                        [alt]="conv.otherUserName"
                        class="h-12 w-12 rounded-full object-cover"
                      />
                    } @else {
                      <div
                        class="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold"
                      >
                        {{ conv.otherUserName.charAt(0).toUpperCase() }}
                      </div>
                    }
                  </div>

                  <!-- Content -->
                  <div class="min-w-0 flex-1">
                    <div class="mb-1 flex items-start justify-between gap-2">
                      <div>
                        <p class="font-semibold text-gray-900 dark:text-white">
                          {{ conv.otherUserName }}
                        </p>
                        @if (conv.carBrand) {
                          <p class="text-sm text-gray-500 dark:text-gray-300 dark:text-gray-300">
                            {{ conv.carBrand }} {{ conv.carModel }} {{ conv.carYear }}
                          </p>
                        }
                      </div>
                      @if (conv.unreadCount > 0) {
                        <span
                          class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white"
                        >
                          {{ conv.unreadCount }}
                        </span>
                      }
                    </div>
                    <p
                      class="truncate text-sm"
                      [class.font-semibold]="conv.unreadCount > 0"
                      [class.text-gray-900]="conv.unreadCount > 0"
                      [class.dark:text-white]="conv.unreadCount > 0"
                      [class.text-gray-600 dark:text-gray-300]="conv.unreadCount === 0"
                      [class.dark:text-gray-400 dark:text-gray-300]="conv.unreadCount === 0"
                    >
                      {{ conv.lastMessage }}
                    </p>
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-300 dark:text-gray-300">
                      {{ formatDate(conv.lastMessageAt) }}
                    </p>
                  </div>
                </div>
              </button>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class InboxPage implements OnInit {
  private readonly router = inject(Router);
  private readonly messagesService = inject(MessagesService);
  private readonly authService = inject(AuthService);
  private readonly supabase = injectSupabase();
  private readonly unreadMessagesService = inject(UnreadMessagesService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly conversations = signal<Conversation[]>([]);

  async ngOnInit(): Promise<void> {
    const session = this.authService.session$();
    if (!session) {
      this.router.navigate(['/auth/login']);
      return;
    }

    await this.loadConversations();
  }

  private async loadConversations(): Promise<void> {
    try {
      this.loading.set(true);
      const userId = this.authService.session$()?.user.id;
      if (!userId) return;

      // Obtener mensajes agrupados por conversación
      const { data: messages, error } = await this.supabase
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

      if (error) {
        console.error('Error loading conversations:', error);
        this.error.set('Error al cargar conversaciones');
        return;
      }

      // Agrupar por conversación y recopilar IDs de usuarios únicos
      const conversationsMap = new Map<string, Conversation>();
      const userIds = new Set<string>();

      for (const msg of messages || []) {
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
      }

      // Fetch user profiles for all participants
      if (userIds.size > 0) {
        const { data: profiles } = await this.supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', Array.from(userIds));

        if (profiles) {
          const profilesMap = new Map(profiles.map((p) => [p.id, p]));
          
          // Update conversations with user data
          conversationsMap.forEach((conv) => {
            const profile = profilesMap.get(conv.otherUserId);
            if (profile) {
              conv.otherUserName = profile.full_name || 'Usuario';
              conv.otherUserAvatar = profile.avatar_url || undefined;
            }
          });
        }
      }

      this.conversations.set(Array.from(conversationsMap.values()));
    } catch (err) {
      console.error('Error loading conversations:', err);
      this.error.set('Error inesperado');
    } finally {
      this.loading.set(false);
    }
  }

  openConversation(conv: Conversation): void {
    const params: any = {
      userId: conv.otherUserId,
      userName: conv.otherUserName,
    };

    if (conv.carId) {
      params.carId = conv.carId;
      params.carName = `${conv.carBrand} ${conv.carModel}`;
      
      // Mark car conversation as read
      this.unreadMessagesService.markConversationAsRead(conv.carId, 'car');
    } else if (conv.bookingId) {
      params.bookingId = conv.bookingId;
      
      // Mark booking conversation as read
      this.unreadMessagesService.markConversationAsRead(conv.bookingId, 'booking');
    }

    this.router.navigate(['/messages/chat'], { queryParams: params });
  }

  formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes}m`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days < 7) return `Hace ${days}d`;

    return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  }
}

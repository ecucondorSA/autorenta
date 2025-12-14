
import {Component, OnDestroy, OnInit, inject, signal,
  ChangeDetectionStrategy} from '@angular/core';
import { Router } from '@angular/router';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { ConversationDTO } from '../../core/repositories/messages.repository';
import { AuthService } from '../../core/services/auth.service';
import { Message, MessagesService } from '../../core/services/messages.service';
import { NotificationManagerService } from '../../core/services/notification-manager.service';
import {
  ConnectionStatus,
  RealtimeConnectionService,
} from '../../core/services/realtime-connection.service';
import { SupabaseClientService } from '../../core/services/supabase-client.service';
import { UnreadMessagesService } from '../../core/services/unread-messages.service';

/**
 * 📬 Bandeja de entrada de mensajes
 * Muestra todas las conversaciones del usuario
 */
@Component({
  selector: 'app-inbox',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  styleUrls: ['./inbox-pro.styles.css'],
  template: `
    <!-- WhatsApp-style Messages Inbox -->
    <div class="whatsapp-container">
      <!-- Header estilo WhatsApp -->
      <div class="whatsapp-header">
        <div class="header-content">
          <h1 class="header-title">Mensajes</h1>
          <div class="header-actions">
            <button class="icon-btn" type="button">
              <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
            <button class="icon-btn" type="button">
              <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Conversations List -->
      <div class="conversations-container">
        @if (loading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p class="loading-text">Cargando conversaciones...</p>
          </div>
        } @else if (error()) {
          <div class="error-state">
            <p class="error-text">{{ error() }}</p>
          </div>
        } @else if (conversations().length === 0) {
          <div class="empty-state">
            <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <h3 class="empty-title">No hay mensajes</h3>
            <p class="empty-subtitle">Cuando recibas mensajes aparecerán aquí</p>
          </div>
        } @else {
          <div class="conversation-list">
            @for (conv of conversations(); track conv.id) {
              <button
                (click)="openConversation(conv)"
                class="conversation-item"
                [class.unread]="conv.unreadCount > 0"
                type="button"
              >
                <!-- Avatar -->
                <div class="conversation-avatar">
                  @if (conv.otherUserAvatar) {
                    <img
                      [src]="conv.otherUserAvatar"
                      [alt]="conv.otherUserName"
                      class="avatar-img"
                    />
                  } @else {
                    <div class="avatar-placeholder">
                      {{ conv.otherUserName.charAt(0).toUpperCase() }}
                    </div>
                  }
                </div>

                <!-- Content -->
                <div class="conversation-content">
                  <div class="conversation-header">
                    <span class="conversation-name">{{ conv.otherUserName }}</span>
                    <span class="conversation-time">{{ formatDate(conv.lastMessageAt) }}</span>
                  </div>

                  @if (conv.carBrand) {
                    <div class="conversation-car">
                      🚗 {{ conv.carBrand }} {{ conv.carModel }} {{ conv.carYear }}
                    </div>
                  }

                  <div class="conversation-footer">
                    <p class="conversation-message">
                      {{ conv.lastMessage }}
                    </p>
                    @if (conv.unreadCount > 0) {
                      <span class="unread-badge">
                        {{ conv.unreadCount > 99 ? '99+' : conv.unreadCount }}
                      </span>
                    }
                  </div>
                </div>
              </button>
            }
          </div>
        }
      </div>

      <!-- Floating Action Button (estilo WhatsApp) -->
      <div class="fab-container">
        @if (showAttachMenu()) {
          <div class="attach-menu" (click)="closeAttachMenu($event)">
            <button class="attach-option" (click)="triggerFileInput('document')" type="button">
              <div class="attach-icon document">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <span>Documento</span>
            </button>
            <button class="attach-option" (click)="triggerFileInput('image')" type="button">
              <div class="attach-icon photo">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <span>Foto/Video</span>
            </button>
            <button class="attach-option" (click)="triggerFileInput('camera')" type="button">
              <div class="attach-icon camera">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <span>Cámara</span>
            </button>
          </div>
        }

        <button
          class="fab-button"
          [class.rotated]="showAttachMenu()"
          (click)="toggleAttachMenu()"
          type="button"
        >
          <svg class="fab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
            />
          </svg>
        </button>
      </div>

      <!-- Hidden file inputs -->
      <input
        id="documentInput"
        type="file"
        accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
        (change)="handleFileSelect($event, 'document')"
        style="display: none"
      />
      <input
        id="imageInput"
        type="file"
        accept="image/*,video/*"
        (change)="handleFileSelect($event, 'media')"
        style="display: none"
      />
      <input
        id="cameraInput"
        type="file"
        accept="image/*"
        capture="environment"
        (change)="handleFileSelect($event, 'camera')"
        style="display: none"
      />
    </div>
  `,
})
export class InboxPage implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly messagesService = inject(MessagesService);
  private readonly authService = inject(AuthService);
  private readonly unreadMessagesService = inject(UnreadMessagesService);
  private readonly realtimeConnection = inject(RealtimeConnectionService);
  private readonly supabase: SupabaseClient = inject(SupabaseClientService).getClient();
  private readonly notifications = inject(NotificationManagerService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly conversations = signal<ConversationDTO[]>([]);
  readonly connectionStatus = signal<ConnectionStatus>('disconnected');
  readonly showAttachMenu = signal(false);

  private realtimeChannel?: RealtimeChannel;

  async ngOnInit(): Promise<void> {
    const session = this.authService.session$();
    if (!session) {
      this.router.navigate(['/auth/login']);
      return;
    }

    await this.loadConversations();
    this.subscribeToConversations(session.user.id);
  }

  ngOnDestroy(): void {
    // Limpiar ambos canales
    this.realtimeConnection.unsubscribe('inbox-conversations-sender');
    this.realtimeConnection.unsubscribe('inbox-conversations-recipient');
  }

  /**
   * Suscribe a cambios en tiempo real de mensajes
   * Actualiza solo la conversación afectada en lugar de refetch completo
   * Usa dos canales separados para sender y recipient porque Supabase Realtime
   * no soporta OR en filtros directamente
   */
  private subscribeToConversations(userId: string): void {
    // Canal para mensajes donde el usuario es el remitente
    const senderChannel = this.realtimeConnection.subscribeWithRetry<Message>(
      'inbox-conversations-sender',
      {
        event: '*', // INSERT, UPDATE
        schema: 'public',
        table: 'messages',
        filter: `sender_id=eq.${userId}`,
      },
      (payload) => {
        this.handleMessageChange(payload.new as Message, userId);
      },
      (status) => {
        this.connectionStatus.set(status);
      },
    );

    // Canal para mensajes donde el usuario es el destinatario
    this.realtimeConnection.subscribeWithRetry<Message>(
      'inbox-conversations-recipient',
      {
        event: '*', // INSERT, UPDATE
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${userId}`,
      },
      (payload) => {
        this.handleMessageChange(payload.new as Message, userId);
      },
      (status) => {
        this.connectionStatus.set(status);
      },
    );

    // Guardar referencia al primer canal para cleanup (ambos se limpian igual)
    this.realtimeChannel = senderChannel;
  }

  /**
   * Maneja cambios en mensajes recibidos via realtime
   * Optimizado: actualiza solo los campos necesarios sin refetch completo
   */
  private handleMessageChange(message: Message, userId: string): void {
    const conversationId = message.car_id || message.booking_id;
    if (!conversationId) return;

    const otherUserId = message.sender_id === userId ? message.recipient_id : message.sender_id;
    const conversationKey = `${conversationId}_${otherUserId}`;

    // Actualizar solo los campos necesarios sin hacer refetch
    this.conversations.update((convs) => {
      const index = convs.findIndex((c) => c.id === conversationKey);

      if (index >= 0) {
        // Actualizar conversación existente
        const updated = [...convs];
        const existingConv = updated[index];

        // Update only changed fields
        updated[index] = {
          ...existingConv,
          lastMessage: message.body,
          lastMessageAt: new Date(message.created_at),
          // Increment unread count if message is from other user and not read
          unreadCount:
            message.sender_id !== userId ? existingConv.unreadCount + 1 : existingConv.unreadCount,
        };

        // Reordenar por fecha de último mensaje
        return updated.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
      } else {
        // Nueva conversación - en este caso sí necesitamos hacer fetch
        // pero lo hacemos en background sin bloquear
        void this.fetchAndAddNewConversation(conversationKey, message, userId);
        return convs;
      }
    });
  }

  /**
   * Fetches and adds a new conversation (called only when a new conversation starts)
   */
  private async fetchAndAddNewConversation(
    conversationKey: string,
    message: Message,
    userId: string,
  ): Promise<void> {
    try {
      const updatedConversation = await this.messagesService.listConversations(userId, {
        limit: 1,
        offset: 0,
        carId: message.car_id || undefined,
        bookingId: message.booking_id || undefined,
      });

      const conv = updatedConversation.conversations.find((c) => c.id === conversationKey);
      if (!conv) return;

      // Add new conversation to the list
      this.conversations.update((convs) => {
        // Check if it was already added (race condition)
        if (convs.some((c) => c.id === conversationKey)) return convs;
        return [conv, ...convs].sort(
          (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime(),
        );
      });
    } catch (error) {
      console.error('Error fetching new conversation:', error);
    }
  }

  private async loadConversations(): Promise<void> {
    try {
      this.loading.set(true);
      const userId = this.authService.session$()?.user.id;
      if (!userId) return;

      // Usar MessagesService que ahora usa MessagesRepository
      const result = await this.messagesService.listConversations(userId, {
        limit: 50,
        offset: 0,
        archived: false,
      });

      this.conversations.set(result.conversations);
    } catch (err) {
      console.error('Error loading conversations:', err);
      this.error.set('Error inesperado');
    } finally {
      this.loading.set(false);
    }
  }

  openConversation(conv: ConversationDTO): void {
    const params: Record<string, string> = {
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
    // Usar método del servicio para formateo consistente
    return this.messagesService.formatRelativeDate(date);
  }

  toggleAttachMenu(): void {
    this.showAttachMenu.update((show) => !show);

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }

  closeAttachMenu(event: Event): void {
    event.stopPropagation();
    this.showAttachMenu.set(false);
  }

  triggerFileInput(type: 'document' | 'image' | 'camera'): void {
    this.showAttachMenu.set(false);

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 20, 5]);
    }

    // Trigger the appropriate file input
    setTimeout(() => {
      const inputId =
        type === 'document' ? 'documentInput' : type === 'image' ? 'imageInput' : 'cameraInput';
      const input = document.querySelector(`input[type="file"]#${inputId}`) as HTMLInputElement;
      if (input) {
        input.click();
      } else {
        // Fallback: try by accept attribute
        const inputs = document.querySelectorAll('input[type="file"]');
        if (type === 'document' && inputs[0]) (inputs[0] as HTMLInputElement).click();
        if (type === 'image' && inputs[1]) (inputs[1] as HTMLInputElement).click();
        if (type === 'camera' && inputs[2]) (inputs[2] as HTMLInputElement).click();
      }
    }, 100);
  }

  async handleFileSelect(event: Event, fileType: 'document' | 'media' | 'camera'): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    // Validar tamaño (máx 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      this.notifications.warning(
        'Archivo muy grande',
        'El archivo supera el límite de 10MB. Por favor selecciona uno más pequeño.',
        4000,
      );
      input.value = '';
      return;
    }

    try {
      // Mostrar loading
      this.loading.set(true);

      const session = this.authService.session$();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      // Subir a Supabase Storage
      const userId = session.user.id;
      const timestamp = Date.now();

      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${timestamp}_${sanitizedName}`;
      const filePath = `${userId}/messages/${fileName}`;

      // Determinar el bucket según el tipo
      const bucket = fileType === 'document' ? 'documents' : 'avatars';
      const fileSize = (file.size / 1024).toFixed(2);

      console.log(`📤 Subiendo archivo: ${fileName} (${fileSize}KB) al bucket ${bucket}`);

      // Mostrar notificación de progreso
      this.notifications.info('Subiendo archivo', `${file.name} (${fileSize}KB)`, 2000);

      // Subir a Supabase Storage
      const { data, error } = await this.supabase.storage.from(bucket).upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

      if (error) {
        console.error('❌ Error de Supabase Storage:', error);
        throw new Error(error.message || 'Error al subir archivo');
      }

      console.log(`✅ Archivo subido exitosamente:`, data);

      // Obtener URL pública del archivo
      const { data: urlData } = this.supabase.storage.from(bucket).getPublicUrl(filePath);

      console.log(`🔗 URL pública: ${urlData.publicUrl}`);

      // Notificación de éxito profesional
      this.notifications.success(
        'Archivo subido',
        `${file.name} se subió correctamente (${fileSize}KB)`,
        5000,
      );

      // Limpiar input
      input.value = '';
    } catch (error) {
      console.error('Error subiendo archivo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

      this.notifications.error('Error al subir archivo', errorMessage, 5000);
    } finally {
      this.loading.set(false);
    }
  }
}

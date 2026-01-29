import { Injectable, inject, signal, computed } from '@angular/core';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { AuthService } from '@core/services/auth/auth.service';
import { DEFAULT_IMAGE_MIME_TYPES, validateFile } from '@core/utils/file-validation.util';
import { SupportTicket, CreateTicketData } from '../models/support.models';

interface SupportState {
  tickets: SupportTicket[];
  loading: boolean;
  error: string | null;
}

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2MB
const SUPPORT_MIME_TYPES = [
  ...DEFAULT_IMAGE_MIME_TYPES,
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

@Injectable({
  providedIn: 'root',
})
export class SupportService {
  private readonly supabase = injectSupabase();
  private readonly logger = inject(LoggerService);
  private readonly authService = inject(AuthService);

  // State
  private readonly state = signal<SupportState>({
    tickets: [],
    loading: false,
    error: null,
  });

  // Public selectors
  readonly tickets = computed(() => this.state().tickets);
  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);

  /**
   * Get count of open tickets (for badges)
   */
  readonly openTicketsCount = computed(
    () =>
      this.state().tickets.filter(
        (t) => t.status === 'open' || t.status === 'in_progress' || t.status === 'waiting_user',
      ).length,
  );

  /**
   * Load user's tickets
   */
  async loadTickets(): Promise<SupportTicket[]> {
    const userId = this.authService.getCachedUserIdSync();
    if (!userId) {
      this.logger.warn('Cannot load tickets: user not authenticated');
      return [];
    }

    this.state.update((s) => ({ ...s, loading: true, error: null }));

    try {
      const { data, error } = await this.supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const tickets = (data ?? []) as SupportTicket[];
      this.state.update((s) => ({ ...s, tickets, loading: false }));
      this.logger.debug('Tickets loaded', 'SupportService', { count: tickets.length });
      return tickets;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar tickets';
      this.state.update((s) => ({ ...s, error: message, loading: false }));
      this.logger.error('Error loading tickets', err);
      throw err;
    }
  }

  /**
   * Create new support ticket
   */
  async createTicket(ticketData: CreateTicketData): Promise<SupportTicket> {
    const userId = this.authService.getCachedUserIdSync();
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }

    this.state.update((s) => ({ ...s, loading: true, error: null }));

    try {
      const { data, error } = await this.supabase
        .from('support_tickets')
        .insert({
          user_id: userId,
          category: ticketData.category,
          urgency: ticketData.urgency,
          subject: ticketData.subject,
          description: ticketData.description,
          booking_id: ticketData.booking_id || null,
          car_id: ticketData.car_id || null,
          attachment_urls: ticketData.attachment_urls || [],
        })
        .select()
        .single();

      if (error) throw error;

      const ticket = data as SupportTicket;

      // Update local state
      this.state.update((s) => ({
        ...s,
        tickets: [ticket, ...s.tickets],
        loading: false,
      }));

      this.logger.info('Ticket created', { ticketId: ticket.id, category: ticket.category });
      return ticket;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear ticket';
      this.state.update((s) => ({ ...s, error: message, loading: false }));
      this.logger.error('Error creating ticket', err);
      throw err;
    }
  }

  /**
   * Upload attachment to Supabase Storage
   */
  async uploadAttachment(file: File): Promise<string> {
    const validation = validateFile(file, {
      maxSizeBytes: MAX_UPLOAD_BYTES,
      allowedMimeTypes: SUPPORT_MIME_TYPES,
    });

    if (!validation.valid) {
      throw new Error(validation.error || 'Archivo no válido');
    }

    const userId = this.authService.getCachedUserIdSync();
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }

    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `support/${userId}/${timestamp}_${safeFileName}`;

    this.logger.debug('Uploading attachment', 'SupportService', {
      fileName: file.name,
      size: file.size,
    });

    const { error: uploadError } = await this.supabase.storage
      .from('support-attachments')
      .upload(filePath, file);

    if (uploadError) {
      this.logger.error('Error uploading attachment', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data } = this.supabase.storage.from('support-attachments').getPublicUrl(filePath);

    this.logger.info('Attachment uploaded', { url: data.publicUrl });
    return data.publicUrl;
  }

  /**
   * Upload multiple attachments
   */
  async uploadAttachments(files: File[]): Promise<string[]> {
    const uploadPromises = files.map((file) => this.uploadAttachment(file));
    return Promise.all(uploadPromises);
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.state.update((s) => ({ ...s, error: null }));
  }
}

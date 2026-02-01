import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { BookingDisputeService } from '@core/services/bookings/booking-dispute.service';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';

// Define Interface locally or import if available
interface BookingDispute {
  id: string;
  booking_id: string;
  status: 'open' | 'resolved' | 'rejected' | 'in_review';
  reason: string;
  description?: string;
  kind?: string;
  created_at: string;
  evidence: { path: string; url?: string }[] | string[]; 
  resolution?: string;
  resolution_notes?: string;
  final_charges_cents?: number;
  // Legacy / Template compatibility
  dispute_resolution?: string;
  resolution_amount?: number;
  resolution_currency?: string;
  resolved_at?: string;
}

@Component({
  selector: 'app-admin-disputes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './admin-disputes.page.html',
  styleUrls: ['./admin-disputes.page.scss'],
})
export class AdminDisputesPage implements OnInit {
  private readonly disputeService = inject(BookingDisputeService);
  private readonly supabaseService = inject(SupabaseClientService);
  private readonly toastService = inject(NotificationManagerService);

  readonly loading = signal(false);
  readonly disputes = signal<BookingDispute[]>([]);
  readonly selectedDispute = signal<BookingDispute | null>(null);
  
  // Resolution UI State
  readonly showDetailModal = signal(false);
  readonly resolutionNotes = signal('');
  readonly finalChargeAmount = signal<number>(0); // In dollars for UI

  // Legacy/Template Compat Signals
  readonly resolutionReason = signal(''); 
  readonly resolutionAmount = signal<number | null>(null);
  readonly evidence = signal<{ path: string; url?: string; note?: string; created_at?: string }[]>([]); 
  readonly filters = signal({
    status: '',
    kind: '',
    searchTerm: '',
  });

  async ngOnInit(): Promise<void> {
    await this.loadAllDisputes();
  }

  async loadAllDisputes(): Promise<void> {
    this.loading.set(true);
    try {
      const supabase = this.supabaseService.getClient();
      
      // Query 'booking_disputes' table
      let query = supabase
        .from('booking_disputes')
        .select('*')
        .order('created_at', { ascending: false });

      const filter = this.filters();
      if (filter.status) {
        query = query.eq('status', filter.status);
      }
      if (filter.searchTerm) {
        query = query.or(`booking_id.ilike.%${filter.searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      this.disputes.set((data || []) as BookingDispute[]);
    } catch (err) {
      console.error('Error loading disputes:', err);
      this.toastService.error('Error', 'No se pudieron cargar las disputas');
    } finally {
      this.loading.set(false);
    }
  }

  openDetailModal(dispute: BookingDispute): void {
    this.selectedDispute.set(dispute);
    this.resolutionNotes.set(dispute.resolution_notes || '');
    this.finalChargeAmount.set(dispute.final_charges_cents ? dispute.final_charges_cents / 100 : 0);
    
    // Normalize evidence for template
    if (Array.isArray(dispute.evidence)) {
        this.evidence.set(dispute.evidence.map(e => typeof e === 'string' ? { path: e, url: e } : e));
    } else {
        this.evidence.set([]);
    }

    this.showDetailModal.set(true);
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedDispute.set(null);
    this.evidence.set([]);
  }

  /**
   * Resolve Dispute Action
   * @param resolutionType 'approved' (Charge renter), 'rejected' (Refund renter), 'partial' (Split)
   */
  async resolve(resolutionType: 'approved' | 'rejected' | 'partial'): Promise<void> {
    const dispute = this.selectedDispute();
    if (!dispute) return;

    this.loading.set(true);
    try {
      const chargeCents = this.finalChargeAmount() > 0 ? Math.round(this.finalChargeAmount() * 100) : undefined;

      const result = await this.disputeService.resolveDispute(
        dispute.booking_id,
        resolutionType,
        chargeCents,
        this.resolutionNotes()
      );

      if (!result.success) {
        throw new Error(result.error || 'Error al resolver disputa');
      }

      this.toastService.success('Disputa Resuelta', `Resolución: ${resolutionType}`);
      this.closeDetailModal();
      await this.loadAllDisputes();
    } catch (err) {
      console.error('Error resolving dispute:', err);
      this.toastService.error('Error', err instanceof Error ? err.message : 'Falló la resolución');
    } finally {
      this.loading.set(false);
    }
  }

  // --- Template Helpers (Restored) ---

  async applyFilters(): Promise<void> {
    await this.loadAllDisputes();
  }

  async clearFilters(): Promise<void> {
    this.filters.set({ status: '', kind: '', searchTerm: '' });
    await this.loadAllDisputes();
  }

  // Alias for template compatibility
  updateStatus(_disputeId: string, _status: string) {
     // In new flow, status update happens via resolve()
     console.warn('updateStatus is deprecated, use resolve()');
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      open: 'Abierta',
      in_review: 'En Revisión',
      resolved: 'Aprobada/Cobrada',
      rejected: 'Rechazada/Devuelta',
    };
    return labels[status] || status;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'open': return 'warning';
      case 'in_review': return 'primary';
      case 'resolved': return 'success'; 
      case 'rejected': return 'medium';
      default: return 'medium';
    }
  }

  formatDate(dateStr?: string | null): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  }

  getKindLabel(kind?: string): string {
      if (!kind) return 'General';
      const map: Record<string, string> = {
          'damage': 'Daños',
          'cleanliness': 'Limpieza',
          'late_return': 'Devolución tardía',
          'other': 'Otro'
      };
      return map[kind] || kind;
  }

  getStatusCount(status: string): number {
      return this.disputes().filter(d => d.status === status).length;
  }

  isImage(path: string): boolean {
      if (!path) return false;
      return /\.(jpg|jpeg|png|webp|gif)$/i.test(path);
  }
}

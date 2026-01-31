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
  status: 'open' | 'resolved' | 'rejected';
  reason: string;
  created_at: string;
  evidence: string[]; // URLs
  resolution?: string;
  resolution_notes?: string;
  final_charges_cents?: number;
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

  async ngOnInit(): Promise<void> {
    await this.loadAllDisputes();
  }

  async loadAllDisputes(): Promise<void> {
    this.loading.set(true);
    try {
      const supabase = this.supabaseService.getClient();
      
      // Query 'booking_disputes' table (the new standard)
      const { data, error } = await supabase
        .from('booking_disputes')
        .select('*')
        .order('created_at', { ascending: false });

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
    this.resolutionNotes.set('');
    this.finalChargeAmount.set(0);
    this.showDetailModal.set(true);
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedDispute.set(null);
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
      // Convert UI amount (USD) to cents for DB if needed, logic handled in service
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

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      open: 'Abierta',
      resolved: 'Aprobada/Cobrada',
      rejected: 'Rechazada/Devuelta',
    };
    return labels[status] || status;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'open': return 'warning';
      case 'resolved': return 'success'; // Owner won (money moved)
      case 'rejected': return 'medium';  // Renter won (money returned)
      default: return 'medium';
    }
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  }
}

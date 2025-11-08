import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { DisputesService, Dispute, DisputeEvidence, DisputeStatus } from '../../../core/services/disputes.service';
import { SupabaseClientService } from '../../../core/services/supabase-client.service';

@Component({
  selector: 'app-admin-disputes',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './admin-disputes.page.html',
  styleUrls: ['./admin-disputes.page.scss'],
})
export class AdminDisputesPage implements OnInit {
  private readonly disputesService = inject(DisputesService);
  private readonly supabaseService = inject(SupabaseClientService);

  readonly loading = signal(false);
  readonly disputes = signal<Dispute[]>([]);
  readonly selectedDispute = signal<Dispute | null>(null);
  readonly evidence = signal<DisputeEvidence[]>([]);
  readonly showDetailModal = signal(false);

  readonly filters = signal({
    status: '' as DisputeStatus | '',
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
      let query = supabase.from('disputes').select('*').order('created_at', { ascending: false });

      const filter = this.filters();
      if (filter.status) {
        query = query.eq('status', filter.status);
      }
      if (filter.kind) {
        query = query.eq('kind', filter.kind);
      }
      if (filter.searchTerm) {
        query = query.or(`description.ilike.%${filter.searchTerm}%,booking_id.ilike.%${filter.searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      this.disputes.set((data || []) as Dispute[]);
    } catch (err) {
      console.error('Error loading disputes:', err);
    } finally {
      this.loading.set(false);
    }
  }

  async openDetailModal(dispute: Dispute): Promise<void> {
    this.selectedDispute.set(dispute);
    this.loading.set(true);
    try {
      const evidenceList = await this.disputesService.listEvidence(dispute.id);
      this.evidence.set(evidenceList);
      this.showDetailModal.set(true);
    } catch (err) {
      console.error('Error loading evidence:', err);
    } finally {
      this.loading.set(false);
    }
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedDispute.set(null);
    this.evidence.set([]);
  }

  async updateStatus(disputeId: string, newStatus: DisputeStatus): Promise<void> {
    this.loading.set(true);
    try {
      const supabase = this.supabaseService.getClient();
      const { error } = await supabase
        .from('disputes')
        .update({
          status: newStatus,
          resolved_at: newStatus === 'resolved' || newStatus === 'rejected' ? new Date().toISOString() : null,
        })
        .eq('id', disputeId);

      if (error) throw error;
      await this.loadAllDisputes();
      this.closeDetailModal();
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      this.loading.set(false);
    }
  }

  async applyFilters(): Promise<void> {
    await this.loadAllDisputes();
  }

  async clearFilters(): Promise<void> {
    this.filters.set({ status: '', kind: '', searchTerm: '' });
    await this.loadAllDisputes();
  }

  getStatusLabel(status: Dispute['status']): string {
    const labels: Record<Dispute['status'], string> = {
      open: 'Abierta',
      in_review: 'En revisión',
      resolved: 'Resuelta',
      rejected: 'Rechazada',
    };
    return labels[status] || status;
  }

  getStatusColor(status: Dispute['status']): string {
    switch (status) {
      case 'open':
        return 'warning';
      case 'in_review':
        return 'primary';
      case 'resolved':
        return 'success';
      case 'rejected':
        return 'danger';
      default:
        return 'medium';
    }
  }

  getKindLabel(kind: Dispute['kind']): string {
    const labels: Record<Dispute['kind'], string> = {
      damage: 'Daños',
      no_show: 'No se presentó',
      late_return: 'Devolución tardía',
      other: 'Otro',
    };
    return labels[kind] || kind;
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  isImage(path: string): boolean {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(path);
  }

  getStatusCount(status: DisputeStatus): number {
    return this.disputes().filter((d) => d.status === status).length;
  }
}

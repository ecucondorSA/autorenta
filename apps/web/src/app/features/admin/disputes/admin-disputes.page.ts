import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import {
  DisputesService,
  Dispute,
  DisputeEvidence,
  DisputeStatus,
} from '@core/services/admin/disputes.service';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service'; // NEW: Import toast service

@Component({
  selector: 'app-admin-disputes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './admin-disputes.page.html',
  styleUrls: ['./admin-disputes.page.scss'],
})
export class AdminDisputesPage implements OnInit {
  private readonly disputesService = inject(DisputesService);
  private readonly supabaseService = inject(SupabaseClientService);
  private readonly toastService = inject(NotificationManagerService); // NEW: Inject toast service

  readonly loading = signal(false);
  readonly disputes = signal<Dispute[]>([]);
  readonly selectedDispute = signal<Dispute | null>(null);
  readonly evidence = signal<DisputeEvidence[]>([]);
  readonly showDetailModal = signal(false);

  // NEW: Resolution fields
  readonly resolutionReason = signal('');
  readonly resolutionAmount = signal<number | null>(null);
  readonly resolutionCurrency = signal<string | null>('ARS');

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
        query = query.or(
          `description.ilike.%${filter.searchTerm}%,booking_id.ilike.%${filter.searchTerm}%`,
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      this.disputes.set((data || []) as Dispute[]);
    } catch (err) {
      console.error('Error loading disputes:', err);
      this.toastService.error('Error', 'No se pudieron cargar las disputas');
    } finally {
      this.loading.set(false);
    }
  }

  async openDetailModal(dispute: Dispute): Promise<void> {
    this.selectedDispute.set(dispute);
    this.loading.set(true);
    // Pre-populate resolution fields
    this.resolutionReason.set(dispute.dispute_resolution || ''); // Use dispute_resolution
    this.resolutionAmount.set(dispute.resolution_amount || null);
    this.resolutionCurrency.set(dispute.resolution_currency || 'ARS'); // Default or pre-populate

    try {
      const evidenceList = await this.disputesService.listEvidence(dispute.id);
      this.evidence.set(evidenceList);
      this.showDetailModal.set(true);
    } catch (err) {
      console.error('Error loading evidence:', err);
      this.toastService.error('Error', 'No se pudieron cargar las evidencias'); // Add toast
    } finally {
      this.loading.set(false);
    }
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedDispute.set(null);
    this.evidence.set([]);
    this.resolutionReason.set(''); // Clear
    this.resolutionAmount.set(null); // Clear
    this.resolutionCurrency.set('ARS'); // Reset to default
  }

  async updateStatus(disputeId: string, newStatus: DisputeStatus): Promise<void> {
    this.loading.set(true);
    try {
      // Map status to resolution type for RPC
      const resolutionMap: Record<string, 'favor_renter' | 'favor_owner' | 'split' | 'rejected'> = {
        resolved: 'favor_renter', // Default, can be changed via UI
        rejected: 'rejected',
      };

      if (newStatus === 'resolved' || newStatus === 'rejected') {
        // Use the new RPC method for final resolutions
        const result = await this.disputesService.resolveDisputeRpc({
          disputeId,
          resolution: resolutionMap[newStatus] || 'rejected',
          resolutionAmountCents: this.resolutionAmount()
            ? Math.round(this.resolutionAmount()! * 100)
            : undefined,
          resolutionNotes: this.resolutionReason().trim() || undefined,
        });

        if (!result.success) {
          throw new Error(result.error || 'Error al resolver disputa');
        }
      } else {
        // For intermediate statuses (in_review), use the direct update
        await this.disputesService.updateStatus(disputeId, newStatus);
      }

      await this.loadAllDisputes();
      this.closeDetailModal();
      this.toastService.success('Estado de disputa actualizado', '');
    } catch (err) {
      console.error('Error updating status:', err);
      this.toastService.error(
        'Error',
        err instanceof Error ? err.message : 'Error al actualizar el estado de la disputa',
      );
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

  formatDate(dateStr?: string | null): string {
    if (!dateStr) {
      return 'Sin datos';
    }
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

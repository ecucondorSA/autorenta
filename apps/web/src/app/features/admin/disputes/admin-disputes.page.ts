import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { DisputesService, Dispute, DisputeTimelineEvent } from '@core/services/admin/disputes.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';

@Component({
  selector: 'app-admin-disputes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './admin-disputes.page.html',
  styleUrls: ['./admin-disputes.page.scss'],
})
export class AdminDisputesPage implements OnInit {
  private readonly disputeService = inject(DisputesService);
  private readonly toastService = inject(NotificationManagerService);

  readonly loading = signal(false);
  readonly disputes = signal<Dispute[]>([]);
  readonly selectedDispute = signal<Dispute | null>(null);

  // Resolution UI State
  readonly showDetailModal = signal(false);
  readonly resolutionNotes = signal('');
  readonly finalChargeAmount = signal<number>(0); // In dollars for UI
  readonly resolutionFavor = signal<'owner' | 'renter' | 'split'>('owner');

  // Timeline & Evidence
  readonly timeline = signal<DisputeTimelineEvent[]>([]);
  readonly evidence = signal<{ url: string; note?: string; type: string; created_at?: string }[]>([]);

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
      let data = await this.disputeService.listAllForAdmin();

      const filter = this.filters();
      if (filter.status) {
        data = data.filter(d => d.status === filter.status);
      }
      if (filter.searchTerm) {
        const term = filter.searchTerm.toLowerCase();
        data = data.filter(d =>
          d.booking_id.toLowerCase().includes(term) ||
          d.id.toLowerCase().includes(term)
        );
      }

      this.disputes.set(data);
    } catch (err) {
      console.error('Error loading disputes:', err);
      this.toastService.error('Error', 'No se pudieron cargar las disputas');
    } finally {
      this.loading.set(false);
    }
  }

  async openDetailModal(dispute: Dispute): Promise<void> {
    this.selectedDispute.set(dispute);
    this.resolutionNotes.set(dispute.internal_notes || '');
    this.finalChargeAmount.set(dispute.penalty_amount_cents ? dispute.penalty_amount_cents / 100 : 0);
    this.resolutionFavor.set((dispute.resolution_favor as 'owner' | 'renter') || 'owner');

    // Load full details for timeline and evidence
    this.loading.set(true);
    try {
      const details = await this.disputeService.getDisputeDetails(dispute.id);
      if (details) {
        this.timeline.set(details.timeline as any[]); // Cast to match interface if needed
        this.evidence.set(details.evidence);
      }
    } catch (err) {
      console.error('Error loading dispute details:', err);
    } finally {
      this.loading.set(false);
    }

    this.showDetailModal.set(true);
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedDispute.set(null);
    this.evidence.set([]);
    this.timeline.set([]);
  }

  /**
   * Resolve Dispute Action via RPC
   */
  async resolve(): Promise<void> {
    const dispute = this.selectedDispute();
    if (!dispute) return;

    this.loading.set(true);
    try {
      const penaltyCents = this.finalChargeAmount() > 0 ? Math.round(this.finalChargeAmount() * 100) : 0;
      const favor = this.resolutionFavor(); // 'owner' | 'renter' | 'split'

      // Map UI 'split' to backend understandable resolution if needed, 
      // or ensure backend handles 'split' (which resolveDisputeRpc does)
      // The RPC signature expects: resolution: 'favor_renter' | 'favor_owner' | 'split' | 'rejected';

      let backendResolution: 'favor_owner' | 'favor_renter' | 'split' | 'rejected';

      if (favor === 'owner') backendResolution = 'favor_owner';
      else if (favor === 'renter') backendResolution = 'favor_renter';
      else backendResolution = 'split';

      const result = await this.disputeService.resolveDisputeRpc({
        disputeId: dispute.id,
        resolution: backendResolution,
        resolutionAmountCents: penaltyCents,
        resolutionNotes: this.resolutionNotes()
      });

      if (!result.success) {
        throw new Error(result.error || 'Error al resolver disputa');
      }

      this.toastService.success('Disputa Resuelta', `Resolución aplicada exitosamente`);
      this.closeDetailModal();
      await this.loadAllDisputes();
    } catch (err) {
      console.error('Error resolving dispute:', err);
      this.toastService.error('Error', err instanceof Error ? err.message : 'Falló la resolución');
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

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      open: 'Abierta',
      in_review: 'En Revisión/Investigación',
      resolved: 'Resuelta/Cerrada',
      rejected: 'Rechazada',
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
      'fuel_missing': 'Combustible faltante',
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

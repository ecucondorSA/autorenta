import {Component, Input, OnInit, Output, EventEmitter, signal, inject,
  ChangeDetectionStrategy} from '@angular/core';

import { DisputesService, Dispute, DisputeEvidence } from '../../../core/services/disputes.service';
import { DisputeDetailComponent } from '../../../features/disputes/components/dispute-detail/dispute-detail.component';

@Component({
  selector: 'app-disputes-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DisputeDetailComponent],
  template: `
    <div class="space-y-4">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-text-primary dark:text-text-inverse">
          Disputas ({{ disputes().length }})
        </h3>
        @if (showCreateButton) {
          <button
            (click)="createDispute.emit()"
            class="text-sm px-4 py-2 bg-cta-default text-cta-text rounded-lg hover:bg-cta-default transition-colors"
            >
            + Crear Disputa
          </button>
        }
      </div>
    
      <!-- Loading State -->
      @if (loading()) {
        <div class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-cta-default"></div>
        </div>
      }
    
      <!-- Empty State -->
      @if (!loading() && disputes().length === 0) {
        <div class="bg-surface-base dark:bg-surface-base rounded-lg p-6 text-center">
          <p class="text-text-secondary dark:text-text-secondary">
            No hay disputas para esta reserva.
          </p>
        </div>
      }
    
      <!-- Disputes List -->
      @if (!loading() && disputes().length > 0) {
        <div class="space-y-3">
          @for (dispute of disputes(); track dispute.id) {
            <div
              (click)="openDetail(dispute.id)"
              class="bg-surface-raised dark:bg-surface-base rounded-lg border border-border-default dark:border-border-muted p-4 cursor-pointer hover:border-cta-default transition-colors group"
              >
              <div class="flex items-start justify-between mb-3">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <span
                      class="px-2 py-1 rounded-full text-xs font-medium"
                      [class.bg-warning-bg-hover]="dispute.status === 'open'"
                      [class.text-warning-strong]="dispute.status === 'open'"
                      [class.bg-cta-default/20]="dispute.status === 'in_review'"
                      [class.text-cta-default]="dispute.status === 'in_review'"
                      [class.bg-success-light/20]="dispute.status === 'resolved'"
                      [class.text-success-strong]="dispute.status === 'resolved'"
                      [class.bg-error-bg-hover]="dispute.status === 'rejected'"
                      [class.text-error-strong]="dispute.status === 'rejected'"
                      >
                      {{ getStatusLabel(dispute.status) }}
                    </span>
                    <span class="text-xs text-text-secondary dark:text-text-muted">
                      {{ getKindLabel(dispute.kind) }}
                    </span>
                  </div>
                  <p class="text-sm text-text-primary dark:text-text-secondary group-hover:text-cta-default transition-colors">
                    {{ dispute.description || 'Sin descripción' }}
                  </p>
                </div>
                <div class="flex flex-col items-end gap-1">
                  <span class="text-xs text-text-secondary dark:text-text-muted">
                    {{ formatDate(dispute.created_at) }}
                  </span>
                  <span class="text-xs text-cta-default opacity-0 group-hover:opacity-100 transition-opacity">Ver detalle →</span>
                </div>
              </div>
    
              <!-- Evidence Section -->
              @if (disputeEvidenceMap().has(dispute.id)) {
                <div class="mt-3 pt-3 border-t border-border-default dark:border-border-muted">
                  <p class="text-xs font-medium text-text-secondary dark:text-text-muted mb-2">
                    Evidencia ({{ disputeEvidenceMap().get(dispute.id)!.length }})
                  </p>
                  <div class="space-y-1">
                    @for (evidence of disputeEvidenceMap().get(dispute.id); track evidence.id) {
                      <div class="text-xs text-text-secondary dark:text-text-muted truncate">
                        • {{ evidence.note || 'Archivo adjunto' }}
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }
    
      <!-- Detail Modal -->
      @if (selectedDisputeId()) {
        <app-dispute-detail
          [disputeId]="selectedDisputeId()!"
          (closeDetail)="closeDetail()"
        ></app-dispute-detail>
      }
    </div>
    `,
})
export class DisputesListComponent implements OnInit {
  @Input() bookingId!: string;
  @Input() showCreateButton = false;

  @Output() readonly createDispute = new EventEmitter<void>();

  private readonly disputesService = inject(DisputesService);

  readonly disputes = signal<Dispute[]>([]);
  readonly disputeEvidenceMap = signal<Map<string, DisputeEvidence[]>>(new Map());
  readonly loading = signal(false);
  readonly selectedDisputeId = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadDisputes();
  }

  async loadDisputes(): Promise<void> {
    this.loading.set(true);

    try {
      const disputesList = await this.disputesService.listByBooking(this.bookingId);
      this.disputes.set(disputesList);

      // Load evidence for each dispute
      const evidenceMap = new Map<string, DisputeEvidence[]>();
      for (const dispute of disputesList) {
        try {
          const evidence = await this.disputesService.listEvidence(dispute.id);
          evidenceMap.set(dispute.id, evidence);
        } catch {
          // Ignore errors loading evidence
        }
      }
      this.disputeEvidenceMap.set(evidenceMap);
    } catch (err) {
      console.error('Error loading disputes:', err);
    } finally {
      this.loading.set(false);
    }
  }

  openDetail(disputeId: string): void {
    this.selectedDisputeId.set(disputeId);
  }

  closeDetail(): void {
    this.selectedDisputeId.set(null);
    // Reload to refresh evidence count or status if changed
    this.loadDisputes();
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
    });
  }
}

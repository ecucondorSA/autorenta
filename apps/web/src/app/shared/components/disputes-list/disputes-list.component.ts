import { Component, Input, OnInit, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DisputesService, Dispute, DisputeEvidence } from '../../../core/services/disputes.service';

@Component({
  selector: 'app-disputes-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-4">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          Disputas ({{ disputes().length }})
        </h3>
        <button
          *ngIf="showCreateButton"
          (click)="createDispute.emit()"
          class="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Crear Disputa
        </button>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      }

      <!-- Empty State -->
      @if (!loading() && disputes().length === 0) {
        <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center">
          <p class="text-gray-600 dark:text-gray-300">No hay disputas para esta reserva.</p>
        </div>
      }

      <!-- Disputes List -->
      @if (!loading() && disputes().length > 0) {
        <div class="space-y-3">
          @for (dispute of disputes(); track dispute.id) {
            <div
              class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <div class="flex items-start justify-between mb-3">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <span
                      class="px-2 py-1 rounded-full text-xs font-medium"
                      [class.bg-yellow-100]="dispute.status === 'open'"
                      [class.text-yellow-800]="dispute.status === 'open'"
                      [class.bg-blue-100]="dispute.status === 'in_review'"
                      [class.text-blue-800]="dispute.status === 'in_review'"
                      [class.bg-green-100]="dispute.status === 'resolved'"
                      [class.text-green-800]="dispute.status === 'resolved'"
                      [class.bg-red-100]="dispute.status === 'rejected'"
                      [class.text-red-800]="dispute.status === 'rejected'"
                    >
                      {{ getStatusLabel(dispute.status) }}
                    </span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">
                      {{ getKindLabel(dispute.kind) }}
                    </span>
                  </div>
                  <p class="text-sm text-gray-700 dark:text-gray-300">
                    {{ dispute.description || 'Sin descripción' }}
                  </p>
                </div>
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  {{ formatDate(dispute.created_at) }}
                </span>
              </div>

              <!-- Evidence Section -->
              @if (disputeEvidenceMap().has(dispute.id)) {
                <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Evidencia ({{ disputeEvidenceMap().get(dispute.id)!.length }})
                  </p>
                  <div class="space-y-1">
                    @for (evidence of disputeEvidenceMap().get(dispute.id); track evidence.id) {
                      <div class="text-xs text-gray-500 dark:text-gray-400">
                        • {{ evidence.note || 'Sin nota' }}
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Resolution Info -->
              @if (dispute.resolved_at) {
                <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    Resuelto el {{ formatDate(dispute.resolved_at) }}
                  </p>
                </div>
              }
            </div>
          }
        </div>
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

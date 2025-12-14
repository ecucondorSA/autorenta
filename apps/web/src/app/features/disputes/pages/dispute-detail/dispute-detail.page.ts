import {Component, OnInit, inject, signal,
  ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import {
  DisputesService,
  Dispute,
  DisputeStatus,
} from '../../../../core/services/disputes.service';
import { EvidenceUploaderComponent } from '../../components/evidence-uploader/evidence-uploader.component'; // Importar el uploader

@Component({
  selector: 'app-dispute-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, EvidenceUploaderComponent], // Añadir EvidenceUploaderComponent
  template: `
    <div class="container mx-auto p-6">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold">Detalle de Disputa #{{ disputeId() | slice: 0 : 8 }}</h1>
        <div
          class="badge badge-lg"
          [ngClass]="{
            'badge-warning': dispute()?.status === 'open',
            'badge-info': dispute()?.status === 'in_review',
            'badge-success': dispute()?.status === 'resolved',
            'badge-error': dispute()?.status === 'rejected',
          }"
          >
          {{ dispute()?.status | titlecase }}
        </div>
      </div>
    
      @if (loading()) {
        <div class="loading loading-spinner loading-lg"></div>
      }
    
      @if (dispute()) {
        <div>
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Columna Principal: Info y Evidencia -->
            <div class="lg:col-span-2 space-y-6">
              <div class="card bg-base-100 shadow-xl">
                <div class="card-body">
                  <h2 class="card-title flex justify-between">
                    {{ dispute()?.kind | titlecase }}
                    <span class="text-sm font-normal text-gray-500">{{
                      dispute()?.created_at | date: 'medium'
                    }}</span>
                  </h2>
                  <p class="mt-4 whitespace-pre-wrap">{{ dispute()?.description }}</p>
                  <div class="divider"></div>
                  <div class="flex flex-wrap gap-2 text-sm">
                    <span class="badge badge-ghost"
                      >Abierta por: {{ dispute()?.opened_by | slice: 0 : 8 }}...</span
                      >
                      <span class="badge badge-ghost"
                        >Reserva ID: {{ dispute()?.booking_id | slice: 0 : 8 }}...</span
                        >
                      </div>
                    </div>
                  </div>
                  <app-evidence-uploader [disputeId]="disputeId()"></app-evidence-uploader>
                </div>
                <!-- Columna Lateral: Acciones Admin -->
                <div class="lg:col-span-1">
                  <div class="card bg-base-100 shadow-xl sticky top-6">
                    <div class="card-body">
                      <h3 class="card-title text-lg">Acciones de Admin</h3>
                      <p class="text-sm text-gray-500 mb-4">Cambiar el estado de la disputa.</p>
                      <div class="flex flex-col gap-2">
                        <button
                          class="btn btn-success btn-sm text-white"
                          (click)="updateStatus('resolved')"
                          [disabled]="updating() || dispute()?.status === 'resolved'"
                          >
                          Resolver (Aprobar)
                        </button>
                        <button
                          class="btn btn-error btn-sm text-white"
                          (click)="updateStatus('rejected')"
                          [disabled]="updating() || dispute()?.status === 'rejected'"
                          >
                          Rechazar
                        </button>
                        <button
                          class="btn btn-info btn-sm text-white"
                          (click)="updateStatus('in_review')"
                          [disabled]="updating() || dispute()?.status === 'in_review'"
                          >
                          Marcar en Revisión
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
    
          @if (!loading() && !dispute()) {
            <div class="alert alert-warning">Disputa no encontrada.</div>
          }
        </div>
    `,
})
export class DisputeDetailPage implements OnInit {
  private route = inject(ActivatedRoute);
  private disputesService = inject(DisputesService);

  disputeId = signal<string>('');
  dispute = signal<Dispute | undefined>(undefined);
  loading = signal(true);
  updating = signal(false);

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.disputeId.set(id);
        this.loadDispute(id);
      } else {
        this.loading.set(false);
      }
    });
  }

  async loadDispute(id: string) {
    this.loading.set(true);
    try {
      const fetchedDispute = await this.disputesService.getDisputeById(id);
      this.dispute.set(fetchedDispute);
    } catch (error) {
      console.error('Error loading dispute', error);
      this.dispute.set(undefined);
    } finally {
      this.loading.set(false);
    }
  }

  async updateStatus(status: DisputeStatus) {
    if (!this.disputeId()) return;
    this.updating.set(true);
    try {
      await this.disputesService.updateStatus(this.disputeId(), status);
      await this.loadDispute(this.disputeId()); // Recargar para ver cambios
    } catch (error) {
      console.error('Error updating status', error);
      alert('Error al actualizar estado. Verifica tus permisos de admin.');
    } finally {
      this.updating.set(false);
    }
  }
}

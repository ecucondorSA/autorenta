import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { InsuranceService } from '../../../core/services/insurance.service';
import {
  InsuranceClaim,
  ClaimStatus,
  CLAIM_STATUS_LABELS,
  CLAIM_TYPE_LABELS,
} from '../../../core/models/insurance.model';

/**
 * Admin Claim Detail Page
 * Shows complete claim details with evidence gallery
 * Allows admin to approve/reject claims
 */
@Component({
  selector: 'app-admin-claim-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="max-w-6xl mx-auto py-8 px-4">
      <!-- Loading State -->
      <div *ngIf="loading()" class="text-center py-12">
        <p class="text-gray-600 dark:text-gray-300">Cargando siniestro...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error() && !loading()" class="bg-red-50 border border-red-200 rounded-xl p-6">
        <p class="text-red-800">{{ error() }}</p>
        <button
          routerLink="/admin/claims"
          class="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700"
        >
          Volver a Siniestros
        </button>
      </div>

      <!-- Claim Detail -->
      <div *ngIf="claim() && !loading()" class="space-y-6">
        <!-- Header -->
        <div class="mb-6">
          <button
            routerLink="/admin/claims"
            class="inline-flex items-center gap-2 text-sm font-medium text-accent-petrol hover:text-accent-warm transition-base mb-4"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Volver a Siniestros
          </button>

          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="flex items-center gap-3 mb-2">
                <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
                  Detalle del Siniestro
                </h1>
                <span
                  class="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-semibold rounded-full"
                  [ngClass]="getStatusBadgeClass(claim()!.status)"
                >
                  {{ CLAIM_STATUS_LABELS[claim()!.status] }}
                </span>
              </div>
              <p class="text-gray-600 dark:text-gray-300">
                ID: <span class="font-mono">{{ claim()!.id }}</span>
              </p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Main Content -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Claim Info Card -->
            <div
              class="bg-white dark:bg-slate-deep rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
            >
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Información del Siniestro
              </h2>

              <dl class="space-y-3">
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Tipo</dt>
                  <dd class="mt-1 text-sm text-gray-900 dark:text-white">
                    {{ CLAIM_TYPE_LABELS[claim()!.claim_type] }}
                  </dd>
                </div>

                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Descripción</dt>
                  <dd class="mt-1 text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                    {{ claim()!.description }}
                  </dd>
                </div>

                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Fecha del Incidente
                  </dt>
                  <dd class="mt-1 text-sm text-gray-900 dark:text-white">
                    {{ formatDateTime(claim()!.incident_date) }}
                  </dd>
                </div>

                <div *ngIf="claim()!.location">
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Ubicación</dt>
                  <dd class="mt-1 text-sm text-gray-900 dark:text-white">
                    {{ claim()!.location }}
                  </dd>
                </div>

                <div *ngIf="claim()!.police_report_number">
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">
                    N° Denuncia Policial
                  </dt>
                  <dd class="mt-1 text-sm text-gray-900 dark:text-white">
                    {{ claim()!.police_report_number }}
                  </dd>
                </div>

                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Reportado por
                  </dt>
                  <dd class="mt-1 text-sm text-gray-900 dark:text-white">
                    {{ claim()!.reporter_role === 'driver' ? 'Conductor' : 'Propietario' }}
                  </dd>
                </div>

                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Fecha de reporte
                  </dt>
                  <dd class="mt-1 text-sm text-gray-900 dark:text-white">
                    {{ formatDateTime(claim()!.created_at) }}
                  </dd>
                </div>
              </dl>
            </div>

            <!-- Evidence Gallery -->
            <div
              *ngIf="claim()!.photos && claim()!.photos!.length > 0"
              class="bg-white dark:bg-slate-deep rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
            >
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                📸 Evidencia Fotográfica ({{ claim()!.photos!.length }})
              </h2>

              <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div
                  *ngFor="let photo of claim()!.photos; let i = index"
                  class="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer hover:opacity-90 transition-opacity"
                  (click)="openPhotoModal(i)"
                >
                  <img
                    [src]="getPhotoUrl(photo)"
                    [alt]="'Evidencia ' + (i + 1)"
                    class="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div
                    class="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded"
                  >
                    {{ i + 1 }}/{{ claim()!.photos!.length }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Resolution Notes -->
            <div
              *ngIf="claim()!.resolution_notes"
              class="bg-white dark:bg-slate-deep rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
            >
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Notas de Resolución
              </h2>
              <p class="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                {{ claim()!.resolution_notes }}
              </p>
            </div>
          </div>

          <!-- Sidebar -->
          <div class="space-y-6">
            <!-- Actions Card -->
            <div
              *ngIf="canResolve()"
              class="bg-white dark:bg-slate-deep rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
            >
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Acciones de Admin
              </h2>

              <div class="space-y-4">
                <!-- Resolution Notes -->
                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Notas de resolución
                  </label>
                  <textarea
                    [(ngModel)]="resolutionNotes"
                    rows="4"
                    placeholder="Escribe notas sobre la resolución..."
                    class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  ></textarea>
                </div>

                <!-- Action Buttons -->
                <div class="flex flex-col gap-2">
                  <button
                    *ngIf="claim()!.status === 'reported'"
                    (click)="updateStatus('under_review')"
                    [disabled]="submitting()"
                    class="w-full px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white rounded-lg font-medium transition-colors"
                  >
                    <span *ngIf="!submitting()">Poner en Revisión</span>
                    <span *ngIf="submitting()">Procesando...</span>
                  </button>

                  <button
                    *ngIf="
                      claim()!.status === 'reported' || claim()!.status === 'under_review'
                    "
                    (click)="updateStatus('approved')"
                    [disabled]="submitting()"
                    class="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors"
                  >
                    <span *ngIf="!submitting()">✓ Aprobar Siniestro</span>
                    <span *ngIf="submitting()">Procesando...</span>
                  </button>

                  <button
                    *ngIf="
                      claim()!.status === 'reported' || claim()!.status === 'under_review'
                    "
                    (click)="updateStatus('rejected')"
                    [disabled]="submitting()"
                    class="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors"
                  >
                    <span *ngIf="!submitting()">✗ Rechazar Siniestro</span>
                    <span *ngIf="submitting()">Procesando...</span>
                  </button>

                  <button
                    *ngIf="claim()!.status === 'approved'"
                    (click)="updateStatus('paid')"
                    [disabled]="submitting()"
                    class="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors"
                  >
                    <span *ngIf="!submitting()">Marcar como Pagado</span>
                    <span *ngIf="submitting()">Procesando...</span>
                  </button>

                  <button
                    *ngIf="
                      claim()!.status === 'paid' || claim()!.status === 'rejected'
                    "
                    (click)="updateStatus('closed')"
                    [disabled]="submitting()"
                    class="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                  >
                    <span *ngIf="!submitting()">Cerrar Siniestro</span>
                    <span *ngIf="submitting()">Procesando...</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Status Info -->
            <div
              class="bg-white dark:bg-slate-deep rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
            >
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Estado Actual
              </h2>
              <div class="space-y-3">
                <div>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Estado</p>
                  <span
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full"
                    [ngClass]="getStatusBadgeClass(claim()!.status)"
                  >
                    {{ CLAIM_STATUS_LABELS[claim()!.status] }}
                  </span>
                </div>
                <div *ngIf="claim()!.closed_at">
                  <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Fecha de cierre</p>
                  <p class="text-sm text-gray-900 dark:text-white">
                    {{ formatDateTime(claim()!.closed_at) }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Photo Modal (Simple lightbox) -->
    <div
      *ngIf="selectedPhotoIndex() !== null"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      (click)="closePhotoModal()"
    >
      <div class="relative max-w-6xl max-h-full">
        <button
          class="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          (click)="closePhotoModal()"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <img
          [src]="getPhotoUrl(claim()!.photos![selectedPhotoIndex()!])"
          [alt]="'Evidencia ' + (selectedPhotoIndex()! + 1)"
          class="max-w-full max-h-[90vh] object-contain"
          (click)="$event.stopPropagation()"
        />
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class AdminClaimDetailPage implements OnInit {
  private readonly insuranceService = inject(InsuranceService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  claim = signal<InsuranceClaim | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  submitting = signal(false);

  resolutionNotes = '';
  selectedPhotoIndex = signal<number | null>(null);

  // For template binding
  CLAIM_STATUS_LABELS = CLAIM_STATUS_LABELS;
  CLAIM_TYPE_LABELS = CLAIM_TYPE_LABELS;

  async ngOnInit() {
    const claimId = this.route.snapshot.paramMap.get('id');
    if (!claimId) {
      this.error.set('ID de siniestro inválido');
      this.loading.set(false);
      return;
    }

    await this.loadClaim(claimId);
  }

  private async loadClaim(claimId: string) {
    try {
      this.loading.set(true);
      const claim = await this.insuranceService.getClaimById(claimId).toPromise();
      if (!claim) {
        this.error.set('Siniestro no encontrado');
        return;
      }
      this.claim.set(claim);
      this.resolutionNotes = claim.resolution_notes || '';
    } catch (err) {
      this.error.set('Error al cargar el siniestro');
      console.error('Error loading claim:', err);
    } finally {
      this.loading.set(false);
    }
  }

  canResolve(): boolean {
    const claim = this.claim();
    if (!claim) return false;
    // Can resolve if not closed
    return claim.status !== 'closed';
  }

  async updateStatus(newStatus: ClaimStatus) {
    const claim = this.claim();
    if (!claim) return;

    const confirmMessage = this.getConfirmMessage(newStatus);
    if (!confirm(confirmMessage)) return;

    try {
      this.submitting.set(true);
      await this.insuranceService.updateClaimStatus(
        claim.id,
        newStatus,
        this.resolutionNotes || undefined,
      );

      // Reload claim
      await this.loadClaim(claim.id);

      alert('✅ Estado actualizado exitosamente');
    } catch (error) {
      alert('❌ Error al actualizar el estado del siniestro');
      console.error('Error updating claim status:', error);
    } finally {
      this.submitting.set(false);
    }
  }

  private getConfirmMessage(status: ClaimStatus): string {
    const messages = {
      under_review: '¿Poner este siniestro en revisión?',
      approved: '¿Aprobar este siniestro? Se notificará al usuario.',
      rejected: '¿Rechazar este siniestro? Se notificará al usuario.',
      paid: '¿Marcar como pagado? Confirma que el pago fue procesado.',
      closed: '¿Cerrar este siniestro? No se podrá modificar después.',
      reported: 'Confirmar cambio de estado?',
    };
    return messages[status] || '¿Confirmar cambio de estado?';
  }

  getPhotoUrl(photoPath: string): string {
    return this.insuranceService.getClaimEvidenceUrl(photoPath);
  }

  openPhotoModal(index: number) {
    this.selectedPhotoIndex.set(index);
  }

  closePhotoModal() {
    this.selectedPhotoIndex.set(null);
  }

  formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getStatusBadgeClass(status: ClaimStatus): string {
    const classes = {
      reported: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
      under_review: 'bg-sky-100 text-sky-600 dark:bg-sky-700/40 dark:text-sky-200',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
      paid: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
      closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-200',
    };
    return classes[status] || classes.closed;
  }
}

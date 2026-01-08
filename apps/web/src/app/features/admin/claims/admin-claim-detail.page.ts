import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { InsuranceService } from '@core/services/bookings/insurance.service';
import {
  InsuranceClaim,
  ClaimStatus,
  CLAIM_STATUS_LABELS,
  CLAIM_TYPE_LABELS,
} from '@core/models/insurance.model';

/**
 * Admin Claim Detail Page
 * Shows complete claim details with evidence gallery
 * Allows admin to approve/reject claims
 */
@Component({
  selector: 'app-admin-claim-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="max-w-6xl mx-auto py-8 px-4">
      <!-- Loading State -->
      @if (loading()) {
        <div class="text-center py-12">
          <p class="text-text-secondary">Cargando siniestro...</p>
        </div>
      }

      <!-- Error State -->
      @if (error() && !loading()) {
        <div class="bg-error-bg border border-error-border rounded-xl p-6">
          <p class="text-error-strong">{{ error() }}</p>
          <button
            routerLink="/admin/claims"
            class="mt-4 px-4 py-2 bg-error-600 text-text-inverse rounded-xl hover:bg-error-700"
          >
            Volver a Siniestros
          </button>
        </div>
      }

      <!-- Claim Detail -->
      @if (claim() && !loading()) {
        <div class="space-y-6">
          <!-- Header -->
          <div class="mb-6">
            <button
              routerLink="/admin/claims"
              class="inline-flex items-center gap-2 text-sm font-medium text-cta-default hover:text-warning-strong transition-base mb-4"
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
                  <h1 class="text-3xl font-bold text-text-primary">Detalle del Siniestro</h1>
                  <span
                    class="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-semibold rounded-full"
                    [ngClass]="getStatusBadgeClass(claim()!.status)"
                  >
                    {{ CLAIM_STATUS_LABELS[claim()!.status] }}
                  </span>
                </div>
                <p class="text-text-secondary">
                  ID: <span class="font-mono">{{ claim()!.id }}</span>
                </p>
              </div>
            </div>
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Main Content -->
            <div class="lg:col-span-2 space-y-6">
              <!-- Claim Info Card -->
              <div class="bg-surface-raised rounded-lg border border-border-default p-6 shadow-sm">
                <h2 class="text-lg font-semibold text-text-primary mb-4">
                  Información del Siniestro
                </h2>
                <dl class="space-y-3">
                  <div>
                    <dt class="text-sm font-medium text-text-secondary">Tipo</dt>
                    <dd class="mt-1 text-sm text-text-primary">
                      {{ CLAIM_TYPE_LABELS[claim()!.claim_type] }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-text-secondary">Descripción</dt>
                    <dd class="mt-1 text-sm text-text-primary whitespace-pre-wrap">
                      {{ claim()!.description }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-text-secondary">Fecha del Incidente</dt>
                    <dd class="mt-1 text-sm text-text-primary">
                      {{ formatDateTime(claim()!.incident_date) }}
                    </dd>
                  </div>
                  @if (claim()!.location) {
                    <div>
                      <dt class="text-sm font-medium text-text-secondary">Ubicación</dt>
                      <dd class="mt-1 text-sm text-text-primary">
                        {{ claim()!.location }}
                      </dd>
                    </div>
                  }
                  @if (claim()!.police_report_number) {
                    <div>
                      <dt class="text-sm font-medium text-text-secondary">N° Denuncia Policial</dt>
                      <dd class="mt-1 text-sm text-text-primary">
                        {{ claim()!.police_report_number }}
                      </dd>
                    </div>
                  }
                  <div>
                    <dt class="text-sm font-medium text-text-secondary">Reportado por</dt>
                    <dd class="mt-1 text-sm text-text-primary">
                      {{ claim()!.reporter_role === 'driver' ? 'Conductor' : 'Propietario' }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-text-secondary">Fecha de reporte</dt>
                    <dd class="mt-1 text-sm text-text-primary">
                      {{ formatDateTime(claim()!.created_at) }}
                    </dd>
                  </div>
                </dl>
              </div>
              <!-- Evidence Gallery -->
              @if (claim()!.photos && claim()!.photos!.length > 0) {
                <div
                  class="bg-surface-raised rounded-lg border border-border-default p-6 shadow-sm"
                >
                  <h2 class="text-lg font-semibold text-text-primary mb-4">
                    📸 Evidencia Fotográfica ({{ claim()!.photos!.length }})
                  </h2>
                  <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                    @for (photo of claim()!.photos; track photo; let i = $index) {
                      <div
                        class="relative aspect-square rounded-lg overflow-hidden bg-surface-raised cursor-pointer hover:opacity-90 transition-opacity"
                        (click)="openPhotoModal(i)"
                      >
                        <img
                          [src]="getPhotoUrl(photo)"
                          [alt]="'Evidencia ' + (i + 1)"
                          class="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div
                          class="absolute bottom-2 right-2 bg-surface-overlay/60 text-text-inverse text-xs px-2 py-1 rounded"
                        >
                          {{ i + 1 }}/{{ claim()!.photos!.length }}
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
              <!-- Resolution Notes -->
              @if (claim()!.resolution_notes) {
                <div
                  class="bg-surface-raised rounded-lg border border-border-default p-6 shadow-sm"
                >
                  <h2 class="text-lg font-semibold text-text-primary mb-4">Notas de Resolución</h2>
                  <p class="text-sm text-text-primary whitespace-pre-wrap">
                    {{ claim()!.resolution_notes }}
                  </p>
                </div>
              }
            </div>
            <!-- Sidebar -->
            <div class="space-y-6">
              <!-- Actions Card -->
              @if (canResolve()) {
                <div
                  class="bg-surface-raised rounded-lg border border-border-default p-6 shadow-sm"
                >
                  <h2 class="text-lg font-semibold text-text-primary mb-4">Acciones de Admin</h2>
                  <div class="space-y-4">
                    <!-- Resolution Notes -->
                    <div>
                      <label class="block text-sm font-medium text-text-primary mb-2">
                        Notas de resolución
                      </label>
                      <textarea
                        [(ngModel)]="resolutionNotes"
                        rows="4"
                        placeholder="Escribe notas sobre la resolución..."
                        class="w-full rounded-lg border border-border-muted bg-surface-raised px-3 py-2 text-sm"
                      ></textarea>
                    </div>
                    <!-- Action Buttons -->
                    <div class="flex flex-col gap-2">
                      @if (claim()!.status === 'submitted') {
                        <button
                          (click)="updateStatus('under_review')"
                          [disabled]="submitting()"
                          class="w-full px-4 py-2 bg-cta-default text-cta-text rounded-lg font-medium transition-colors"
                        >
                          @if (!submitting()) {
                            <span>Poner en Revisión</span>
                          }
                          @if (submitting()) {
                            <span>Procesando...</span>
                          }
                        </button>
                      }
                      @if (claim()!.status === 'submitted' || claim()!.status === 'under_review') {
                        <button
                          (click)="updateStatus('approved')"
                          [disabled]="submitting()"
                          class="w-full px-4 py-2 bg-success-light text-text-primary rounded-lg font-medium transition-colors"
                        >
                          @if (!submitting()) {
                            <span>✓ Aprobar Siniestro</span>
                          }
                          @if (submitting()) {
                            <span>Procesando...</span>
                          }
                        </button>
                      }
                      @if (claim()!.status === 'submitted' || claim()!.status === 'under_review') {
                        <button
                          (click)="updateStatus('rejected')"
                          [disabled]="submitting()"
                          class="w-full px-4 py-2 bg-error-600 hover:bg-error-700 disabled:bg-error-400 text-text-inverse rounded-lg font-medium transition-colors"
                        >
                          @if (!submitting()) {
                            <span>✗ Rechazar Siniestro</span>
                          }
                          @if (submitting()) {
                            <span>Procesando...</span>
                          }
                        </button>
                      }
                      @if (claim()!.status === 'approved') {
                        <button
                          (click)="updateStatus('paid')"
                          [disabled]="submitting()"
                          class="w-full px-4 py-2 bg-success-light text-text-primary rounded-lg font-medium transition-colors"
                        >
                          @if (!submitting()) {
                            <span>Marcar como Pagado</span>
                          }
                          @if (submitting()) {
                            <span>Procesando...</span>
                          }
                        </button>
                      }
                    </div>
                  </div>
                </div>
              }
              <!-- Status Info -->
              <div class="bg-surface-raised rounded-lg border border-border-default p-6 shadow-sm">
                <h2 class="text-lg font-semibold text-text-primary mb-4">Estado Actual</h2>
                <div class="space-y-3">
                  <div>
                    <p class="text-xs text-text-secondary mb-1">Estado</p>
                    <span
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full"
                      [ngClass]="getStatusBadgeClass(claim()!.status)"
                    >
                      {{ CLAIM_STATUS_LABELS[claim()!.status] }}
                    </span>
                  </div>
                  @if (claim()!.closed_at) {
                    <div>
                      <p class="text-xs text-text-secondary mb-1">Fecha de cierre</p>
                      <p class="text-sm text-text-primary">
                        {{ formatDateTime(claim()!.closed_at) }}
                      </p>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>

    <!-- Photo Modal (Simple lightbox) -->
    @if (selectedPhotoIndex() !== null) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay/90 p-4"
        (click)="closePhotoModal()"
      >
        <div class="relative max-w-6xl max-h-full">
          <button
            class="absolute top-4 right-4 w-10 h-10 rounded-full bg-surface-raised/10 hover:bg-surface-raised/20 flex items-center justify-center text-text-inverse"
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
    }
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
    // Can resolve if not paid (final status)
    return claim.status !== 'paid';
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
    const messages: Record<ClaimStatus, string> = {
      draft: '¿Guardar como borrador?',
      submitted: '¿Marcar este siniestro como enviado?',
      under_review: '¿Poner este siniestro en revisión?',
      processing: '¿Marcar este siniestro como en proceso?',
      approved: '¿Aprobar este siniestro? Se notificará al usuario.',
      rejected: '¿Rechazar este siniestro? Se notificará al usuario.',
      paid: '¿Marcar como pagado? Confirma que el pago fue procesado.',
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

  formatDateTime(dateStr?: string | null): string {
    if (!dateStr) {
      return 'Sin datos';
    }
    return new Date(dateStr).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getStatusBadgeClass(status: ClaimStatus): string {
    const classes: Record<ClaimStatus, string> = {
      draft: 'bg-surface-raised text-text-primary',
      submitted: 'bg-warning-light/20 text-warning-700',
      under_review: 'bg-cta-default/20 text-cta-default',
      processing: 'bg-purple-100 text-purple-800',
      approved: 'bg-success-light/20 text-success-700',
      rejected: 'bg-error-bg-hover text-error-strong',
      paid: 'bg-success-light/20 text-success-700',
    };
    return classes[status] || 'bg-surface-raised text-text-primary';
  }
}

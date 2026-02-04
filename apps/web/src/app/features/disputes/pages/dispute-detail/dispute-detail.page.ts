import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { 
  DisputesService, 
  DisputeTimelineEvent,
  Dispute,
  DisputeEvidence
} from '@core/services/admin/disputes.service';
import { RealtimeConnectionService } from '@core/services/infrastructure/realtime-connection.service';
import { DisputeResolutionFormComponent } from '../../components/resolution-form/resolution-form.component';
import { DisputeTimelineComponent } from '../../components/timeline/timeline.component';

@Component({
  selector: 'app-dispute-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, 
    RouterLink,
    DisputeResolutionFormComponent, 
    DisputeTimelineComponent
  ],
  template: `
    <div class="min-h-screen bg-surface-base pb-20">
      <!-- Header de Expediente -->
      <header class="bg-surface-raised border-b border-border-default sticky top-0 z-30 px-6 py-4">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
          <div class="flex items-center gap-4">
            <a routerLink="/admin/disputes" class="p-2 hover:bg-surface-secondary rounded-full" aria-label="Volver a disputas">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </a>
            <div>
              <h1 class="text-xl font-bold text-text-primary leading-tight">Expediente #{{ disputeId() | slice:0:8 }}</h1>
              <p class="text-xs text-text-muted uppercase tracking-widest font-semibold">Arbitraje de Movilidad</p>
            </div>
          </div>
          
          <div class="flex items-center gap-3">
            <div class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm"
              [ngClass]="{
                'bg-amber-100 text-amber-700': d()?.status === 'open',
                'bg-blue-100 text-blue-700': d()?.status === 'in_review',
                'bg-emerald-100 text-emerald-700': d()?.status === 'resolved',
                'bg-red-100 text-red-700': d()?.status === 'rejected'
              }">
              {{ d()?.status }}
            </div>
          </div>
        </div>
      </header>

      <main class="max-w-7xl mx-auto p-6">
        @if (loading()) {
          <div class="flex items-center justify-center py-20">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-cta-default"></div>
          </div>
        } @else if (d()) {
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            <!-- LADO IZQUIERDO: Información y Evidencia -->
            <div class="lg:col-span-8 space-y-8">
              
              <!-- Info del Reclamo -->
              <section class="card-premium p-6">
                <div class="flex justify-between items-start mb-4">
                  <h2 class="text-lg font-bold text-text-primary">Detalle del Conflicto</h2>
                  <span class="text-xs text-text-muted">{{ d()?.created_at | date:'medium' }}</span>
                </div>
                <div class="inline-block px-2 py-1 bg-surface-secondary rounded-lg text-xs font-mono text-text-secondary mb-4">
                  Motivo: {{ d()?.kind | uppercase }}
                </div>
                <p class="text-text-secondary leading-relaxed whitespace-pre-wrap italic border-l-4 border-border-default pl-4">
                  "{{ d()?.description }}"
                </p>
              </section>

              <!-- Evidencia Visual -->
              <section class="space-y-4">
                <h2 class="text-lg font-bold text-text-primary flex items-center gap-2">
                  <svg class="w-5 h-5 text-cta-default" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  Acervo Probatorio
                </h2>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                  @for (ev of evidence(); track ev.id) {
                    <div class="group relative aspect-square bg-surface-raised rounded-2xl border border-border-default overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <img [src]="ev.path || ev.url" class="w-full h-full object-cover" alt="Evidencia">
                      <div class="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <p class="text-[10px] text-white truncate">{{ ev.note }}</p>
                      </div>
                    </div>
                  } @empty {
                    <div class="col-span-full py-12 border-2 border-dashed border-border-default rounded-2xl flex flex-col items-center justify-center text-text-muted">
                      <svg class="w-12 h-12 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                      <p>No se han adjuntado pruebas aún</p>
                    </div>
                  }
                </div>
              </section>

              <!-- Línea de Tiempo -->
              <section class="card-premium p-6">
                <app-dispute-timeline [events]="timeline()"></app-dispute-timeline>
              </section>
            </div>

            <!-- LADO DERECHO: Decisiones y Contexto -->
            <div class="lg:col-span-4 space-y-6">
              
              <!-- Info del Contrato (Booking) -->
              <section class="bg-indigo-900 text-white rounded-2xl p-6 shadow-lg overflow-hidden relative">
                <div class="relative z-10">
                  <h3 class="text-xs uppercase tracking-widest font-bold opacity-60 mb-4">Garantía del Contrato</h3>
                  <div class="text-3xl font-black mb-1">{{ (d()?.booking?.deposit_amount_cents || 0) / 100 | currency:'USD' }}</div>
                  <p class="text-xs opacity-80 mb-6">Monto máximo adjudicable en este arbitraje</p>
                  
                  <div class="divider border-white/10 my-4"></div>
                  
                  <div class="flex items-center gap-3">
                    <div class="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm">
                      {{ d()?.opened_by | slice:0:2 | uppercase }}
                    </div>
                    <div>
                      <div class="text-xs opacity-60">Demandante</div>
                      <div class="text-sm font-bold">{{ d()?.opened_by | slice:0:8 }}</div>
                    </div>
                  </div>
                </div>
                <!-- Decoración -->
                <div class="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>
              </section>

              <!-- Panel de Resolución -->
              @if (d()?.status !== 'resolved') {
                <app-dispute-resolution-form 
                  [disputeId]="disputeId()" 
                  [maxDepositCents]="d()?.booking?.deposit_amount_cents || 0"
                  (resolved)="onResolved()">
                </app-dispute-resolution-form>
              } @else {
                <section class="card-premium p-6 border-emerald-500 bg-emerald-50/10">
                  <div class="flex items-center gap-2 text-emerald-600 font-bold mb-4">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    Fallo Emitido
                  </div>
                  <div class="space-y-3">
                    <div class="flex justify-between text-sm">
                      <span class="text-text-muted">A favor de:</span>
                      <span class="font-bold text-text-primary uppercase">{{ d()?.resolution_favor }}</span>
                    </div>
                    <div class="flex justify-between text-sm">
                      <span class="text-text-muted">Penalidad:</span>
                      <span class="font-bold text-red-600">{{ (d()?.penalty_amount_cents || 0) / 100 | currency:'USD' }}</span>
                    </div>
                    <div class="pt-3 border-t border-border-default text-xs text-text-secondary italic">
                      "{{ d()?.internal_notes }}"
                    </div>
                  </div>
                </section>
              }
            </div>
          </div>
        } @else {
          <div class="card-premium p-12 text-center">
            <p class="text-text-secondary">No se encontró el expediente solicitado.</p>
          </div>
        }
      </main>
    </div>
  `,
})
export class DisputeDetailPage implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private disputesService = inject(DisputesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly realtimeConnection = inject(RealtimeConnectionService);

  private realtimeChannel: RealtimeChannel | null = null;

  disputeId = signal<string>('');
  d = signal<Dispute | undefined>(undefined);
  loading = signal(true);
  evidence = signal<DisputeEvidence[]>([]);
  timeline = signal<DisputeTimelineEvent[]>([]);

  async ngOnInit() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.disputeId.set(id);
        void this.loadAll(id);
        this.setupRealtimeSubscription(id);
      } else {
        this.loading.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.realtimeChannel) {
      this.realtimeConnection.unsubscribe(this.realtimeChannel.topic);
    }
  }

  private async loadAll(id: string) {
    this.loading.set(true);
    try {
      const [dispute, evidence, timeline] = await Promise.all([
        this.disputesService.getDisputeById(id),
        this.disputesService.listEvidence(id),
        this.disputesService.getTimeline(id)
      ]);
      this.d.set(dispute);
      this.evidence.set(evidence);
      this.timeline.set(timeline);
    } catch (error) {
      console.error('Error loading dispute dossier', error);
    } finally {
      this.loading.set(false);
    }
  }

  private setupRealtimeSubscription(disputeId: string): void {
    if (this.realtimeChannel) {
      this.realtimeConnection.unsubscribe(this.realtimeChannel.topic);
    }

    this.realtimeChannel = this.realtimeConnection.subscribeWithRetry<DisputeTimelineEvent>(
      `dispute-dossier-${disputeId}`,
      {
        event: '*',
        schema: 'public',
        table: 'dispute_timeline',
        filter: `dispute_id=eq.${disputeId}`,
      },
      () => {
        void this.loadAll(disputeId);
      },
    );
  }

  onResolved() {
    void this.loadAll(this.disputeId());
  }
}

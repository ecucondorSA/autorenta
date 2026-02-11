import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminFeatureFacadeService } from '@core/services/facades/admin-feature-facade.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';
import type { TrafficInfraction } from '@core/models/traffic-infraction.model';

@Component({
  selector: 'app-admin-traffic-infractions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-text-primary">Multas de Tránsito</h1>
        <p class="text-text-secondary mt-1">
          Gestiona las multas de tránsito reportadas por propietarios
        </p>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div class="card-premium p-4">
          <p class="text-sm text-text-muted">Pendientes</p>
          <p class="text-2xl font-bold text-warning-strong">{{ pendingCount() }}</p>
        </div>
        <div class="card-premium p-4">
          <p class="text-sm text-text-muted">Disputadas</p>
          <p class="text-2xl font-bold text-cta-default">{{ disputedCount() }}</p>
        </div>
        <div class="card-premium p-4">
          <p class="text-sm text-text-muted">Aceptadas</p>
          <p class="text-2xl font-bold text-success-strong">{{ acceptedCount() }}</p>
        </div>
        <div class="card-premium p-4">
          <p class="text-sm text-text-muted">Cobradas</p>
          <p class="text-2xl font-bold text-text-primary">{{ chargedCount() }}</p>
        </div>
        <div class="card-premium p-4">
          <p class="text-sm text-text-muted">Monto Total Pendiente</p>
          <p class="text-2xl font-bold text-error-strong">
            {{ totalPendingAmount() | currency: 'USD' : 'symbol' : '1.0-0' }}
          </p>
        </div>
      </div>

      <!-- Filters -->
      <div class="card-premium p-4 mb-6">
        <div class="flex flex-wrap gap-4 items-center">
          <div>
            <label class="text-sm text-text-muted mb-1 block">Filtrar por estado</label>
            <select [(ngModel)]="filterStatus" class="input-field">
              <option value="all">Todos</option>
              <option value="pending">Pendientes</option>
              <option value="disputed">Disputadas</option>
              <option value="accepted">Aceptadas</option>
              <option value="charged">Cobradas</option>
              <option value="resolved">Resueltas</option>
            </select>
          </div>
          <div class="flex-1"></div>
          <button (click)="loadInfractions()" class="btn-secondary" [disabled]="loading()">
            Actualizar
          </button>
        </div>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="text-center py-12">
          <div
            class="inline-block h-10 w-10 animate-spin rounded-full border-4 border-border-muted border-t-cta-default"
          ></div>
          <p class="text-text-secondary mt-4">Cargando multas...</p>
        </div>
      }

      <!-- Infractions Table -->
      @else if (filteredInfractions().length > 0) {
        <div class="card-premium overflow-hidden">
          <table class="w-full">
            <thead class="bg-surface-secondary">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">
                  Fecha
                </th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">
                  Renter
                </th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">
                  Owner
                </th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">
                  Monto
                </th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">
                  Descripción
                </th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">
                  Estado
                </th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border-default">
              @for (infraction of filteredInfractions(); track infraction.id) {
                <tr class="hover:bg-surface-secondary/50">
                  <td class="px-4 py-4">
                    <div>
                      <p class="text-sm text-text-primary">
                        {{ infraction.infraction_date | date: 'dd/MM/yyyy' }}
                      </p>
                      <p class="text-xs text-text-muted">
                        Reportado: {{ infraction.created_at | date: 'dd/MM/yyyy' }}
                      </p>
                    </div>
                  </td>
                  <td class="px-4 py-4 text-sm text-text-primary">
                    {{ infraction.renter_name || 'N/A' }}
                  </td>
                  <td class="px-4 py-4 text-sm text-text-primary">
                    {{ infraction.owner_name || 'N/A' }}
                  </td>
                  <td class="px-4 py-4">
                    <span class="font-semibold text-text-primary">
                      {{
                        infraction.amount_cents / 100
                          | currency: infraction.currency : 'symbol' : '1.2-2'
                      }}
                    </span>
                  </td>
                  <td class="px-4 py-4 max-w-xs">
                    <p class="text-sm text-text-secondary truncate">{{ infraction.description }}</p>
                    @if (infraction.evidence_urls.length) {
                      <p class="text-xs text-cta-default mt-1">
                        {{ infraction.evidence_urls.length }} evidencia(s)
                      </p>
                    }
                  </td>
                  <td class="px-4 py-4">
                    <span
                      class="px-2 py-1 rounded-full text-xs font-medium"
                      [ngClass]="getStatusClass(infraction.status)"
                    >
                      {{ getStatusLabel(infraction.status) }}
                    </span>
                    @if (infraction.dispute_reason) {
                      <p
                        class="text-xs text-error-strong mt-1 truncate max-w-[150px]"
                        [title]="infraction.dispute_reason"
                      >
                        {{ infraction.dispute_reason }}
                      </p>
                    }
                  </td>
                  <td class="px-4 py-4 text-right space-x-2">
                    <button
                      (click)="viewDetails(infraction)"
                      class="text-sm text-cta-default hover:text-cta-hover font-medium"
                    >
                      Ver
                    </button>
                    @if (infraction.status === 'disputed') {
                      <button
                        (click)="resolveDispute(infraction, true)"
                        class="text-sm text-success-strong hover:text-success-700 font-medium"
                      >
                        A favor renter
                      </button>
                      <button
                        (click)="resolveDispute(infraction, false)"
                        class="text-sm text-error-strong hover:text-error-700 font-medium"
                      >
                        A favor owner
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="card-premium p-12 text-center">
          <div
            class="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-secondary flex items-center justify-center"
          >
            <svg
              class="w-8 h-8 text-text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-text-primary mb-2">
            No hay multas {{ filterStatus === 'all' ? '' : 'con el estado seleccionado' }}
          </h3>
        </div>
      }
    </div>
  `,
})
export class AdminTrafficInfractionsPage implements OnInit {
  private readonly adminFacade = inject(AdminFeatureFacadeService);
  private readonly toast = inject(NotificationManagerService);

  readonly loading = signal(true);
  readonly infractions = signal<TrafficInfraction[]>([]);

  filterStatus = 'all';

  readonly filteredInfractions = computed(() => {
    const all = this.infractions();
    if (this.filterStatus === 'all') return all;
    return all.filter((i) => i.status === this.filterStatus);
  });

  readonly pendingCount = computed(
    () => this.infractions().filter((i) => i.status === 'pending').length,
  );
  readonly disputedCount = computed(
    () => this.infractions().filter((i) => i.status === 'disputed').length,
  );
  readonly acceptedCount = computed(
    () => this.infractions().filter((i) => i.status === 'accepted').length,
  );
  readonly chargedCount = computed(
    () => this.infractions().filter((i) => i.status === 'charged').length,
  );

  readonly totalPendingAmount = computed(() => {
    return this.infractions()
      .filter((i) => ['pending', 'accepted', 'disputed'].includes(i.status))
      .reduce((sum, i) => sum + i.amount_cents / 100, 0);
  });

  async ngOnInit(): Promise<void> {
    await this.loadInfractions();
  }

  async loadInfractions(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.adminFacade.listTrafficInfractions();

      const mapped = (data || []).map(
        (
          i: {
            renter?: { full_name: string };
            owner?: { full_name: string };
          } & Partial<TrafficInfraction>,
        ) => ({
          ...i,
          renter_name: i.renter?.full_name,
          owner_name: i.owner?.full_name,
        }),
      ) as unknown as TrafficInfraction[];

      this.infractions.set(mapped);
    } catch (err) {
      console.error('Error loading infractions:', err);
      this.toast.error('Error', 'No se pudieron cargar las multas');
    } finally {
      this.loading.set(false);
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'bg-warning-bg text-warning-strong';
      case 'disputed':
        return 'bg-cta-default/10 text-cta-default';
      case 'accepted':
        return 'bg-success-bg text-success-strong';
      case 'charged':
        return 'bg-surface-secondary text-text-secondary';
      case 'resolved':
        return 'bg-success-bg text-success-strong';
      default:
        return 'bg-surface-secondary text-text-secondary';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'disputed':
        return 'Disputada';
      case 'accepted':
        return 'Aceptada';
      case 'charged':
        return 'Cobrada';
      case 'resolved':
        return 'Resuelta';
      default:
        return status;
    }
  }

  viewDetails(infraction: TrafficInfraction): void {
    // Could open a modal with full details
    const details = `
Multa de Tránsito
================
Fecha: ${new Date(infraction.infraction_date).toLocaleDateString()}
Monto: $${(infraction.amount_cents / 100).toFixed(2)} ${infraction.currency}
Descripción: ${infraction.description}
Estado: ${this.getStatusLabel(infraction.status)}
${infraction.dispute_reason ? `\nRazón de disputa: ${infraction.dispute_reason}` : ''}
${infraction.resolution_notes ? `\nNotas de resolución: ${infraction.resolution_notes}` : ''}
    `;
    alert(details);
  }

  async resolveDispute(infraction: TrafficInfraction, inFavorOfRenter: boolean): Promise<void> {
    const message = inFavorOfRenter
      ? '¿Resolver a favor del RENTER? (No se cobrará la multa)'
      : '¿Resolver a favor del OWNER? (Se cobrará la multa al renter)';

    if (!confirm(message)) return;

    const notes = prompt('Notas de resolución (opcional):') || '';

    try {
      await this.adminFacade.resolveTrafficInfractionDispute({
        infractionId: infraction.id,
        inFavorOfRenter,
        resolutionNotes: notes,
      });

      this.toast.success(
        'Disputa resuelta',
        `La disputa ha sido resuelta a favor del ${inFavorOfRenter ? 'renter' : 'owner'}`,
      );
      await this.loadInfractions();
    } catch (err) {
      console.error('Error resolving dispute:', err);
      this.toast.error('Error', 'No se pudo resolver la disputa');
    }
  }
}

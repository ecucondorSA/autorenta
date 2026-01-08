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
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';

interface Accident {
  id: string;
  booking_id: string;
  reporter_id: string;
  reporter_role: 'owner' | 'renter';
  accident_date: string;
  description: string;
  location: string;
  police_report_number?: string;
  insurance_claim_number?: string;
  evidence_urls: string[];
  status: 'reported' | 'investigating' | 'resolved' | 'insurance_pending' | 'closed';
  estimated_damage_cents?: number;
  resolution_notes?: string;
  created_at: string;
  reporter_name?: string;
  car_info?: string;
}

@Component({
  selector: 'app-admin-accidents',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-text-primary">Gestión de Accidentes</h1>
        <p class="text-text-secondary mt-1">Seguimiento y resolución de accidentes reportados</p>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div class="card-premium p-4">
          <p class="text-sm text-text-muted">Reportados</p>
          <p class="text-2xl font-bold text-warning-strong">{{ reportedCount() }}</p>
        </div>
        <div class="card-premium p-4">
          <p class="text-sm text-text-muted">En Investigación</p>
          <p class="text-2xl font-bold text-cta-default">{{ investigatingCount() }}</p>
        </div>
        <div class="card-premium p-4">
          <p class="text-sm text-text-muted">Seguro Pendiente</p>
          <p class="text-2xl font-bold text-error-strong">{{ insurancePendingCount() }}</p>
        </div>
        <div class="card-premium p-4">
          <p class="text-sm text-text-muted">Resueltos</p>
          <p class="text-2xl font-bold text-success-strong">{{ resolvedCount() }}</p>
        </div>
        <div class="card-premium p-4">
          <p class="text-sm text-text-muted">Daños Estimados Total</p>
          <p class="text-2xl font-bold text-text-primary">
            {{ totalEstimatedDamage() | currency: 'USD' : 'symbol' : '1.0-0' }}
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
              <option value="reported">Reportados</option>
              <option value="investigating">En Investigación</option>
              <option value="insurance_pending">Seguro Pendiente</option>
              <option value="resolved">Resueltos</option>
              <option value="closed">Cerrados</option>
            </select>
          </div>
          <div class="flex-1"></div>
          <button (click)="loadAccidents()" class="btn-secondary" [disabled]="loading()">
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
          <p class="text-text-secondary mt-4">Cargando accidentes...</p>
        </div>
      }

      <!-- Accidents Table -->
      @else if (filteredAccidents().length > 0) {
        <div class="card-premium overflow-hidden">
          <table class="w-full">
            <thead class="bg-surface-secondary">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">
                  Fecha
                </th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">
                  Reportado por
                </th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">
                  Vehículo
                </th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">
                  Ubicación
                </th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">
                  Daño Est.
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
              @for (accident of filteredAccidents(); track accident.id) {
                <tr class="hover:bg-surface-secondary/50">
                  <td class="px-4 py-4">
                    <div>
                      <p class="text-sm text-text-primary">
                        {{ accident.accident_date | date: 'dd/MM/yyyy' }}
                      </p>
                      <p class="text-xs text-text-muted">
                        Reportado: {{ accident.created_at | date: 'dd/MM/yyyy' }}
                      </p>
                    </div>
                  </td>
                  <td class="px-4 py-4">
                    <div>
                      <p class="text-sm text-text-primary">
                        {{ accident.reporter_name || 'N/A' }}
                      </p>
                      <span
                        class="text-xs px-2 py-0.5 rounded-full"
                        [ngClass]="{
                          'bg-cta-default/10 text-cta-default': accident.reporter_role === 'owner',
                          'bg-success-bg text-success-strong': accident.reporter_role === 'renter',
                        }"
                      >
                        {{ accident.reporter_role === 'owner' ? 'Propietario' : 'Locatario' }}
                      </span>
                    </div>
                  </td>
                  <td class="px-4 py-4 text-sm text-text-primary">
                    {{ accident.car_info || 'N/A' }}
                  </td>
                  <td class="px-4 py-4 text-sm text-text-secondary max-w-xs truncate">
                    {{ accident.location || 'No especificada' }}
                  </td>
                  <td class="px-4 py-4">
                    @if (accident.estimated_damage_cents) {
                      <span class="font-semibold text-error-strong">
                        {{
                          accident.estimated_damage_cents / 100
                            | currency: 'USD' : 'symbol' : '1.0-0'
                        }}
                      </span>
                    } @else {
                      <span class="text-text-muted">-</span>
                    }
                  </td>
                  <td class="px-4 py-4">
                    <span
                      class="px-2 py-1 rounded-full text-xs font-medium"
                      [ngClass]="getStatusClass(accident.status)"
                    >
                      {{ getStatusLabel(accident.status) }}
                    </span>
                    @if (accident.police_report_number) {
                      <p class="text-xs text-text-muted mt-1">
                        Policía: {{ accident.police_report_number }}
                      </p>
                    }
                    @if (accident.insurance_claim_number) {
                      <p class="text-xs text-cta-default mt-0.5">
                        Seguro: {{ accident.insurance_claim_number }}
                      </p>
                    }
                  </td>
                  <td class="px-4 py-4 text-right space-x-2">
                    <button
                      (click)="viewDetails(accident)"
                      class="text-sm text-cta-default hover:text-cta-hover font-medium"
                    >
                      Ver
                    </button>
                    @if (accident.status === 'reported') {
                      <button
                        (click)="updateStatus(accident, 'investigating')"
                        class="text-sm text-warning-strong hover:text-warning-700 font-medium"
                      >
                        Investigar
                      </button>
                    }
                    @if (accident.status === 'investigating') {
                      <button
                        (click)="updateStatus(accident, 'insurance_pending')"
                        class="text-sm text-cta-default hover:text-cta-hover font-medium"
                      >
                        → Seguro
                      </button>
                      <button
                        (click)="resolveAccident(accident)"
                        class="text-sm text-success-strong hover:text-success-700 font-medium"
                      >
                        Resolver
                      </button>
                    }
                    @if (accident.status === 'insurance_pending') {
                      <button
                        (click)="resolveAccident(accident)"
                        class="text-sm text-success-strong hover:text-success-700 font-medium"
                      >
                        Resolver
                      </button>
                    }
                    @if (accident.status === 'resolved') {
                      <button
                        (click)="updateStatus(accident, 'closed')"
                        class="text-sm text-text-muted hover:text-text-secondary font-medium"
                      >
                        Cerrar
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
            class="w-16 h-16 mx-auto mb-4 rounded-full bg-success-bg flex items-center justify-center"
          >
            <svg
              class="w-8 h-8 text-success-strong"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-text-primary mb-2">
            No hay accidentes {{ filterStatus === 'all' ? '' : 'con el estado seleccionado' }}
          </h3>
          <p class="text-text-secondary">Todos los vehículos están en buen estado.</p>
        </div>
      }
    </div>
  `,
})
export class AdminAccidentsPage implements OnInit {
  private readonly supabase = inject(SupabaseClientService).getClient();
  private readonly toast = inject(NotificationManagerService);

  readonly loading = signal(true);
  readonly accidents = signal<Accident[]>([]);

  filterStatus = 'all';

  readonly filteredAccidents = computed(() => {
    const all = this.accidents();
    if (this.filterStatus === 'all') return all;
    return all.filter((a) => a.status === this.filterStatus);
  });

  readonly reportedCount = computed(
    () => this.accidents().filter((a) => a.status === 'reported').length,
  );
  readonly investigatingCount = computed(
    () => this.accidents().filter((a) => a.status === 'investigating').length,
  );
  readonly insurancePendingCount = computed(
    () => this.accidents().filter((a) => a.status === 'insurance_pending').length,
  );
  readonly resolvedCount = computed(
    () => this.accidents().filter((a) => a.status === 'resolved').length,
  );

  readonly totalEstimatedDamage = computed(() => {
    return this.accidents()
      .filter(
        (a) =>
          a.estimated_damage_cents &&
          ['reported', 'investigating', 'insurance_pending'].includes(a.status),
      )
      .reduce((sum, a) => sum + (a.estimated_damage_cents || 0) / 100, 0);
  });

  async ngOnInit(): Promise<void> {
    await this.loadAccidents();
  }

  async loadAccidents(): Promise<void> {
    this.loading.set(true);
    try {
      const { data, error } = await this.supabase
        .from('accidents')
        .select(
          `
          *,
          reporter:profiles!accidents_reporter_id_fkey(full_name),
          booking:bookings!accidents_booking_id_fkey(
            car:cars(brand, model, year)
          )
        `,
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map(
        (
          a: {
            reporter?: { full_name: string };
            booking?: { car?: { brand: string; model: string; year: number } };
          } & Partial<Accident>,
        ) => ({
          ...a,
          reporter_name: a.reporter?.full_name,
          car_info: a.booking?.car
            ? `${a.booking.car.brand} ${a.booking.car.model} (${a.booking.car.year})`
            : null,
        }),
      ) as unknown as Accident[];

      this.accidents.set(mapped);
    } catch (err) {
      console.error('Error loading accidents:', err);
      this.toast.error('Error', 'No se pudieron cargar los accidentes');
    } finally {
      this.loading.set(false);
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'reported':
        return 'bg-warning-bg text-warning-strong';
      case 'investigating':
        return 'bg-cta-default/10 text-cta-default';
      case 'insurance_pending':
        return 'bg-error-bg text-error-strong';
      case 'resolved':
        return 'bg-success-bg text-success-strong';
      case 'closed':
        return 'bg-surface-secondary text-text-secondary';
      default:
        return 'bg-surface-secondary text-text-secondary';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'reported':
        return 'Reportado';
      case 'investigating':
        return 'En Investigación';
      case 'insurance_pending':
        return 'Seguro Pendiente';
      case 'resolved':
        return 'Resuelto';
      case 'closed':
        return 'Cerrado';
      default:
        return status;
    }
  }

  viewDetails(accident: Accident): void {
    const details = `
Accidente #${accident.id.slice(0, 8)}
========================
Fecha: ${new Date(accident.accident_date).toLocaleDateString()}
Ubicación: ${accident.location || 'No especificada'}
Descripción: ${accident.description}
Estado: ${this.getStatusLabel(accident.status)}
${accident.police_report_number ? `\nNro. Policía: ${accident.police_report_number}` : ''}
${accident.insurance_claim_number ? `Nro. Seguro: ${accident.insurance_claim_number}` : ''}
${accident.estimated_damage_cents ? `\nDaño Estimado: $${(accident.estimated_damage_cents / 100).toFixed(0)}` : ''}
${accident.resolution_notes ? `\nNotas de resolución: ${accident.resolution_notes}` : ''}
${accident.evidence_urls?.length ? `\nEvidencias: ${accident.evidence_urls.length} archivo(s)` : ''}
    `;
    alert(details);
  }

  async updateStatus(accident: Accident, newStatus: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('accidents')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', accident.id);

      if (error) throw error;

      this.toast.success(
        'Estado actualizado',
        `El accidente ahora está "${this.getStatusLabel(newStatus)}"`,
      );
      await this.loadAccidents();
    } catch (err) {
      console.error('Error updating status:', err);
      this.toast.error('Error', 'No se pudo actualizar el estado');
    }
  }

  async resolveAccident(accident: Accident): Promise<void> {
    const notes = prompt('Notas de resolución:') || '';

    try {
      const { error } = await this.supabase
        .from('accidents')
        .update({
          status: 'resolved',
          resolution_notes: notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', accident.id);

      if (error) throw error;

      this.toast.success('Accidente resuelto', 'El accidente ha sido marcado como resuelto');
      await this.loadAccidents();
    } catch (err) {
      console.error('Error resolving accident:', err);
      this.toast.error('Error', 'No se pudo resolver el accidente');
    }
  }
}

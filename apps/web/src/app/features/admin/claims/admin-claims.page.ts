import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { InsuranceService } from '../../../core/services/insurance.service';
import {
  InsuranceClaim,
  ClaimStatus,
  ClaimType,
  CLAIM_STATUS_LABELS,
  CLAIM_TYPE_LABELS,
} from '../../../core/models/insurance.model';

/**
 * Admin Claims Dashboard
 * Lists all claims with filtering by status and type
 * Allows admin to navigate to claim detail for resolution
 */
@Component({
  selector: 'app-admin-claims',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="max-w-7xl mx-auto py-8 px-4">
      <!-- Header -->
      <div class="mb-6">
        <button
          routerLink="/admin"
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
          Volver al Dashboard
        </button>

        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
              Gestión de Siniestros
            </h1>
            <p class="text-gray-600 dark:text-gray-300 mt-1">
              Administra y resuelve los siniestros reportados
            </p>
          </div>
          <div class="text-right">
            <p class="text-sm text-gray-500 dark:text-gray-400">Total de siniestros</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ filteredClaims().length }}
            </p>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div
        class="bg-white dark:bg-slate-deep rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6 shadow-sm"
      >
        <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Filtros</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Status Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Estado
            </label>
            <select
              [(ngModel)]="filterStatus"
              (ngModelChange)="onFilterChange()"
              class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            >
              <option value="">Todos los estados</option>
              <option *ngFor="let status of claimStatuses" [value]="status.value">
                {{ status.label }}
              </option>
            </select>
          </div>

          <!-- Type Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tipo
            </label>
            <select
              [(ngModel)]="filterType"
              (ngModelChange)="onFilterChange()"
              class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            >
              <option value="">Todos los tipos</option>
              <option *ngFor="let type of claimTypes" [value]="type.value">
                {{ type.label }}
              </option>
            </select>
          </div>

          <!-- Search -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Buscar
            </label>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onFilterChange()"
              placeholder="ID o descripción..."
              class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading()" class="text-center py-12">
        <p class="text-gray-600 dark:text-gray-300">Cargando siniestros...</p>
      </div>

      <!-- Error State -->
      <div
        *ngIf="error() && !loading()"
        class="bg-red-50 border border-red-200 rounded-xl p-6"
      >
        <p class="text-red-800">{{ error() }}</p>
      </div>

      <!-- Claims List -->
      <div *ngIf="!loading() && !error()" class="space-y-4">
        <!-- Empty State -->
        <div
          *ngIf="filteredClaims().length === 0"
          class="bg-gray-50 dark:bg-gray-800 rounded-xl p-12 text-center"
        >
          <svg
            class="w-16 h-16 mx-auto text-gray-400 mb-4"
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
          <p class="text-gray-600 dark:text-gray-300 text-lg font-medium">
            No se encontraron siniestros
          </p>
          <p class="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Intenta cambiar los filtros o buscar otro término
          </p>
        </div>

        <!-- Claims Cards -->
        <div
          *ngFor="let claim of filteredClaims()"
          class="bg-white dark:bg-slate-deep rounded-lg border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          [routerLink]="['/admin/claims', claim.id]"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-3 mb-2">
                <!-- Status Badge -->
                <span
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full"
                  [ngClass]="getStatusBadgeClass(claim.status)"
                >
                  {{ CLAIM_STATUS_LABELS[claim.status] }}
                </span>

                <!-- Type Badge -->
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  {{ CLAIM_TYPE_LABELS[claim.claim_type] }}
                </span>

                <!-- ID -->
                <span class="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  #{{ claim.id | slice: 0 : 8 }}
                </span>
              </div>

              <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">
                {{ claim.description }}
              </h3>

              <div class="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-300 mt-2">
                <span>📅 {{ formatDate(claim.created_at) }}</span>
                <span *ngIf="claim.location">📍 {{ claim.location }}</span>
                <span *ngIf="claim.photos && claim.photos.length > 0">
                  📸 {{ claim.photos.length }} fotos
                </span>
              </div>
            </div>

            <div class="flex-shrink-0">
              <svg
                class="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </div>
        </div>
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
export class AdminClaimsPage implements OnInit {
  private readonly insuranceService = inject(InsuranceService);
  private readonly router = inject(Router);

  claims = signal<InsuranceClaim[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // Filters
  filterStatus = '';
  filterType = '';
  searchQuery = '';

  // For template binding
  CLAIM_STATUS_LABELS = CLAIM_STATUS_LABELS;
  CLAIM_TYPE_LABELS = CLAIM_TYPE_LABELS;

  claimStatuses = Object.entries(CLAIM_STATUS_LABELS).map(([value, label]) => ({
    value: value as ClaimStatus,
    label,
  }));

  claimTypes = Object.entries(CLAIM_TYPE_LABELS).map(([value, label]) => ({
    value: value as ClaimType,
    label,
  }));

  filteredClaims = computed(() => {
    let result = this.claims();

    // Filter by status
    if (this.filterStatus) {
      result = result.filter((c) => c.status === this.filterStatus);
    }

    // Filter by type
    if (this.filterType) {
      result = result.filter((c) => c.claim_type === this.filterType);
    }

    // Search
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.id.toLowerCase().includes(query) ||
          c.description.toLowerCase().includes(query) ||
          c.location?.toLowerCase().includes(query),
      );
    }

    return result;
  });

  async ngOnInit() {
    await this.loadClaims();
  }

  private async loadClaims() {
    try {
      this.loading.set(true);
      // In a real implementation, we'd have an admin endpoint that returns ALL claims
      // For now, we'll use getMyClaims which is limited to the user's claims
      // TODO: Create admin endpoint to get all claims
      const claims = await this.insuranceService.getMyClaims().toPromise();
      this.claims.set(claims || []);
    } catch (err) {
      this.error.set('Error al cargar los siniestros');
      console.error('Error loading claims:', err);
    } finally {
      this.loading.set(false);
    }
  }

  onFilterChange() {
    // Triggers computed signal recalculation
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-AR', {
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
      under_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
      paid: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
      closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-200',
    };
    return classes[status] || classes.closed;
  }
}

import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { InsuranceService } from '../../../core/services/insurance.service';
import { InsuranceClaim } from '../../../core/models/insurance.model';
import { ToastService } from '../../../core/services/toast.service';

/**
 * MyClaimsPage
 *
 * Dashboard de siniestros reportados por el usuario.
 *
 * Características:
 * - Lista de todos los siniestros del usuario
 * - Filtros por estado (todos, pending, investigating, approved, rejected, closed)
 * - Vista rápida del estado y detalles
 * - Navegación a detalle de claim
 * - Indicadores visuales por tipo y estado
 *
 * Ruta: /bookings/claims
 */
@Component({
  selector: 'app-my-claims',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './my-claims.page.html',
  styleUrls: ['./my-claims.page.css'],
})
export class MyClaimsPage {
  private readonly router = inject(Router);
  private readonly insuranceService = inject(InsuranceService);
  private readonly toastService = inject(ToastService);

  readonly claims = signal<InsuranceClaim[]>([]);
  readonly loading = signal(true);
  readonly filterStatus = signal<InsuranceClaim['status'] | 'all'>('all');

  // Computed: Claims filtrados
  readonly filteredClaims = computed(() => {
    const allClaims = this.claims();
    const filter = this.filterStatus();

    if (filter === 'all') {
      return allClaims;
    }

    return allClaims.filter((c) => c.status === filter);
  });

  readonly hasClaims = computed(() => this.filteredClaims().length > 0);

  // Stats
  readonly stats = computed(() => {
    const allClaims = this.claims();
    return {
      total: allClaims.length,
      pending: allClaims.filter((c) => c.status === 'pending').length,
      investigating: allClaims.filter((c) => c.status === 'investigating').length,
      approved: allClaims.filter((c) => c.status === 'approved').length,
      rejected: allClaims.filter((c) => c.status === 'rejected').length,
      closed: allClaims.filter((c) => c.status === 'closed').length,
    };
  });

  // Filter options
  readonly statusFilters = [
    { value: 'all' as const, label: 'Todos', icon: '📋' },
    { value: 'pending' as const, label: 'Pendientes', icon: '⏳' },
    { value: 'investigating' as const, label: 'En Investigación', icon: '🔍' },
    { value: 'approved' as const, label: 'Aprobados', icon: '✅' },
    { value: 'rejected' as const, label: 'Rechazados', icon: '❌' },
    { value: 'closed' as const, label: 'Cerrados', icon: '🔒' },
  ];

  async ngOnInit() {
    await this.loadClaims();
  }

  async loadClaims() {
    this.loading.set(true);
    try {
      this.insuranceService.getMyClaims().subscribe({
        next: (claims) => {
          this.claims.set(claims);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading claims:', error);
          this.toastService.showToast('Error al cargar siniestros', 'error');
          this.loading.set(false);
        },
      });
    } catch (error) {
      console.error('Error loading claims:', error);
      this.toastService.showToast('Error al cargar siniestros', 'error');
      this.loading.set(false);
    }
  }

  setFilter(status: typeof this.filterStatus extends () => infer T ? T : never) {
    this.filterStatus.set(status);
  }

  viewClaim(claimId: string) {
    this.router.navigate(['/bookings/claims', claimId]);
  }

  reportNewClaim() {
    // Navigate to booking selection or ask which booking
    this.router.navigate(['/bookings']);
    this.toastService.showToast('Selecciona una reserva para reportar un siniestro', 'info');
  }

  getStatusColor(status: InsuranceClaim['status']): string {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'investigating':
        return 'status-investigating';
      case 'approved':
        return 'status-approved';
      case 'rejected':
        return 'status-rejected';
      case 'closed':
        return 'status-closed';
      default:
        return '';
    }
  }

  getStatusLabel(status: InsuranceClaim['status']): string {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'investigating':
        return 'En Investigación';
      case 'approved':
        return 'Aprobado';
      case 'rejected':
        return 'Rechazado';
      case 'closed':
        return 'Cerrado';
      default:
        return status;
    }
  }

  getClaimTypeLabel(type: InsuranceClaim['claim_type']): string {
    const labels: Record<InsuranceClaim['claim_type'], string> = {
      collision: 'Colisión',
      theft: 'Robo',
      vandalism: 'Vandalismo',
      natural_disaster: 'Desastre Natural',
      fire: 'Incendio',
      glass_damage: 'Daño de Cristales',
      other: 'Otro',
    };
    return labels[type] || type;
  }

  getClaimTypeIcon(type: InsuranceClaim['claim_type']): string {
    const icons: Record<InsuranceClaim['claim_type'], string> = {
      collision: '🚗💥',
      theft: '🚨',
      vandalism: '🔨',
      natural_disaster: '🌪️',
      fire: '🔥',
      glass_damage: '🪟',
      other: '📋',
    };
    return icons[type] || '📋';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatCurrency(cents: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  }
}

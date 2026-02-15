import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';
import { InsuranceService } from '@core/services/bookings/insurance.service';
import { InsuranceClaim } from '@core/models/insurance.model';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  templateUrl: './my-claims.page.html',
  styleUrls: ['./my-claims.page.css'],
})
export class MyClaimsPage {
  private readonly router = inject(Router);
  private readonly insuranceService = inject(InsuranceService);
  private readonly toastService = inject(NotificationManagerService);

  readonly filterStatus = signal<InsuranceClaim['status'] | 'all'>('all');

  // Reactive Data Source
  private readonly refreshTrigger$ = new BehaviorSubject<void>(void 0);

  private readonly claimsState = toSignal(
    this.refreshTrigger$.pipe(
      switchMap(() =>
        this.insuranceService.getMyClaims().pipe(
          map((data) => ({ data, loading: false, error: null })),
          startWith({ data: [], loading: true, error: null }),
          catchError((error) => {
            console.error('Error loading claims:', error);
            this.toastService.error('Error al cargar siniestros', '');
            return of({ data: [], loading: false, error });
          }),
        ),
      ),
    ),
    { initialValue: { data: [], loading: true, error: null } },
  );

  readonly claims = computed(() => this.claimsState().data || []);
  readonly loading = computed(() => this.claimsState().loading);

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

  // Stats - Using correct ClaimStatus values from database
  readonly stats = computed(() => {
    const allClaims = this.claims();
    return {
      total: allClaims.length,
      // "submitted" = recently submitted, waiting review
      submitted: allClaims.filter((c) => c.status === 'submitted').length,
      // "under_review" = being investigated
      underReview: allClaims.filter((c) => c.status === 'under_review').length,
      approved: allClaims.filter((c) => c.status === 'approved').length,
      rejected: allClaims.filter((c) => c.status === 'rejected').length,
      // "paid" = closed and paid out
      paid: allClaims.filter((c) => c.status === 'paid').length,
    };
  });

  // Filter options - using correct ClaimStatus values
  readonly statusFilters = [
    { value: 'all' as const, label: 'Todos', icon: '📋' },
    { value: 'submitted' as const, label: 'Enviados', icon: '⏳' },
    { value: 'under_review' as const, label: 'En Revisión', icon: '🔍' },
    { value: 'approved' as const, label: 'Aprobados', icon: '✅' },
    { value: 'rejected' as const, label: 'Rechazados', icon: '❌' },
    { value: 'paid' as const, label: 'Pagados', icon: '💰' },
  ];

  refresh() {
    this.refreshTrigger$.next();
  }

  setFilter(status: InsuranceClaim['status'] | 'all') {
    this.filterStatus.set(status);
  }

  viewClaim(claimId: string) {
    this.router.navigate(['/bookings/claims', claimId]);
  }

  reportNewClaim() {
    // Navigate to booking selection or ask which booking
    this.router.navigate(['/bookings']);
    this.toastService.info('Siniestros', 'Selecciona una reserva para reportar un siniestro');
  }

  getStatusColor(status: InsuranceClaim['status']): string {
    switch (status) {
      case 'draft':
        return 'status-draft';
      case 'submitted':
        return 'status-pending';
      case 'under_review':
      case 'processing':
        return 'status-investigating';
      case 'approved':
        return 'status-approved';
      case 'rejected':
        return 'status-rejected';
      case 'paid':
        return 'status-closed';
      default:
        return '';
    }
  }

  getStatusLabel(status: InsuranceClaim['status']): string {
    switch (status) {
      case 'draft':
        return 'Borrador';
      case 'submitted':
        return 'Enviado';
      case 'under_review':
        return 'En Revisión';
      case 'processing':
        return 'Procesando';
      case 'approved':
        return 'Aprobado';
      case 'rejected':
        return 'Rechazado';
      case 'paid':
        return 'Pagado';
      default:
        return status;
    }
  }

  getClaimTypeLabel(type: InsuranceClaim['claim_type']): string {
    const labels: Record<string, string> = {
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
    const icons: Record<string, string> = {
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  }
}

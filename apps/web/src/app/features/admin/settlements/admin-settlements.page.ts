import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Claim, SettlementService } from '@core/services/payments/settlement.service';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';

/**
 * Admin Settlements Page
 *
 * Permite a administradores:
 * - Ver lista de claims pendientes
 * - Revisar daños reportados
 * - Evaluar elegibilidad FGO
 * - Procesar liquidaciones
 */
@Component({
  selector: 'app-admin-settlements-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-settlements.page.html',
  styleUrls: ['./admin-settlements.page.css'],
})
export class AdminSettlementsPage implements OnInit {
  private readonly settlementService = inject(SettlementService);
  private readonly supabase = inject(SupabaseClientService);

  // State
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly claims = signal<Claim[]>([]);
  readonly stats = signal({
    total: 0,
    pending: 0,
    underReview: 0,
    approved: 0,
    rejected: 0,
    totalAmount: 0,
  });

  // Filters
  readonly selectedStatus = signal<Claim['status'] | 'all'>('all');
  readonly searchQuery = signal('');

  // Computed
  get filteredClaims(): Claim[] {
    let filtered = this.claims();

    // Filter by status
    if (this.selectedStatus() !== 'all') {
      filtered = filtered.filter((c) => c.status === this.selectedStatus());
    }

    // Filter by search query
    const query = this.searchQuery().toLowerCase();
    if (query) {
      filtered = filtered.filter(
        (c) =>
          c.bookingId.toLowerCase().includes(query) ||
          c.id.toLowerCase().includes(query) ||
          c.notes?.toLowerCase().includes(query),
      );
    }

    return filtered;
  }

  async ngOnInit(): Promise<void> {
    await this.loadClaims();
  }

  async loadClaims(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      // TODO: En producción, estos claims vendrían de la base de datos
      // Por ahora, generamos datos mock para demostración
      const mockClaims = await this.generateMockClaims();
      this.claims.set(mockClaims);

      // Calculate stats
      this.calculateStats(mockClaims);
    } catch {
      this.error.set('Error al cargar claims');
    } finally {
      this.loading.set(false);
    }
  }

  private async generateMockClaims(): Promise<Claim[]> {
    // Get some recent bookings to attach claims to
    const { data: bookings } = await this.supabase
      .getClient()
      .from('bookings')
      .select('id, car_id, renter_id, owner_id')
      .eq('status', 'completed')
      .limit(10)
      .order('created_at', { ascending: false });

    if (!bookings || bookings.length === 0) {
      return [];
    }

    // Generate mock claims
    const mockClaims: Claim[] = bookings.slice(0, 5).map((booking, index) => {
      const statuses: Claim['status'][] = [
        'submitted',
        'under_review',
        'approved',
        'rejected',
        'draft',
      ];
      const status = statuses[index % statuses.length];

      return {
        id: `claim_${crypto.randomUUID().substring(0, 8)}`,
        bookingId: booking.id,
        reportedBy: booking.owner_id,
        damages: [
          {
            type: 'scratch',
            description: 'Rayón en puerta delantera derecha',
            estimatedCostUsd: 150,
            photos: [],
            severity: 'moderate',
          },
          {
            type: 'dent',
            description: 'Abolladura en capó',
            estimatedCostUsd: 300,
            photos: [],
            severity: 'severe',
          },
        ],
        totalEstimatedCostUsd: 450,
        status,
        notes: `Claim #${index + 1} - Daños reportados por el owner al finalizar la renta`,
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      };
    });

    return mockClaims;
  }

  private calculateStats(claims: Claim[]): void {
    this.stats.set({
      total: claims.length,
      pending: claims.filter((c) => c.status === 'submitted').length,
      underReview: claims.filter((c) => c.status === 'under_review').length,
      approved: claims.filter((c) => c.status === 'approved').length,
      rejected: claims.filter((c) => c.status === 'rejected').length,
      totalAmount: claims.reduce((sum, c) => sum + c.totalEstimatedCostUsd, 0),
    });
  }

  getStatusText(status: Claim['status']): string {
    const statusMap: Record<Claim['status'], string> = {
      draft: 'Borrador',
      submitted: 'Enviado',
      under_review: 'En Revisión',
      approved: 'Aprobado',
      rejected: 'Rechazado',
      paid: 'Pagado',
      processing: 'Procesando',
    };
    return statusMap[status];
  }

  getStatusClass(status: Claim['status']): string {
    const classMap: Record<Claim['status'], string> = {
      draft: 'status-draft',
      submitted: 'status-submitted',
      under_review: 'status-review',
      approved: 'status-approved',
      rejected: 'status-rejected',
      paid: 'status-paid',
      processing: 'status-processing',
    };
    return classMap[status];
  }

  getDamageTypeText(type: string): string {
    const typeMap: Record<string, string> = {
      scratch: 'Rayón',
      dent: 'Abolladura',
      broken_glass: 'Vidrio Roto',
      tire_damage: 'Daño en Neumático',
      mechanical: 'Falla Mecánica',
      interior: 'Daño Interior',
      missing_item: 'Artículo Faltante',
      other: 'Otro',
    };
    return typeMap[type] || type;
  }

  getSeverityText(severity: string): string {
    const severityMap: Record<string, string> = {
      minor: 'Leve',
      moderate: 'Moderado',
      severe: 'Severo',
    };
    return severityMap[severity] || severity;
  }

  getSeverityClass(severity: string): string {
    const classMap: Record<string, string> = {
      minor: 'severity-minor',
      moderate: 'severity-moderate',
      severe: 'severity-severe',
    };
    return classMap[severity] || '';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  async processClaim(claim: Claim): Promise<void> {
    if (!confirm(`¿Procesar claim ${claim.id}? Esto ejecutará el waterfall de cobros.`)) {
      return;
    }

    this.loading.set(true);
    try {
      const result = await this.settlementService.processClaim(claim);

      if (result.ok) {
        alert(
          `Claim procesado exitosamente. Total recuperado: ${this.formatCurrency(
            (result.waterfall?.breakdown.holdCaptured || 0) / 100 +
              (result.waterfall?.breakdown.walletDebited || 0) / 100 +
              (result.waterfall?.breakdown.fgoPaid || 0) / 100,
          )}`,
        );
        await this.loadClaims();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch {
      alert('Error al procesar claim');
    } finally {
      this.loading.set(false);
    }
  }
}

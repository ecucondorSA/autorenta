import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminFeatureFacadeService } from '@core/services/facades/admin-feature-facade.service';
import { type Claim, type DamageItem, SettlementService } from '@core/services/payments/settlement.service';

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
  private readonly adminFacade = inject(AdminFeatureFacadeService);

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
      const rawClaims = await this.adminFacade.listClaims();
      const claims = this.mapDbClaims(rawClaims);
      this.claims.set(claims);
      this.calculateStats(claims);
    } catch {
      this.error.set('Error al cargar claims');
    } finally {
      this.loading.set(false);
    }
  }

  private mapDbClaims(rows: Array<Record<string, unknown>>): Claim[] {
    return rows.map((row) => ({
      id: row['id'] as string,
      bookingId: row['booking_id'] as string,
      reportedBy: row['reported_by'] as string,
      damages: (row['damages'] as DamageItem[]) || [],
      totalEstimatedCostUsd: Number(row['total_estimated_cost_usd']) || 0,
      status: row['status'] as Claim['status'],
      notes: (row['notes'] as string) || undefined,
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
      lockedAt: row['locked_at'] ? new Date(row['locked_at'] as string) : undefined,
      lockedBy: (row['locked_by'] as string) || undefined,
      processedAt: row['processed_at'] ? new Date(row['processed_at'] as string) : undefined,
    }));
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

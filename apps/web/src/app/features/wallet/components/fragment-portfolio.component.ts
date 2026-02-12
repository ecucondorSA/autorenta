import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  FragmentInvestmentService,
  type FragmentPortfolioItem,
} from '@core/services/business/fragment-investment.service';

@Component({
  selector: 'app-fragment-portfolio',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  templateUrl: './fragment-portfolio.component.html',
})
export class FragmentPortfolioComponent implements OnInit {
  private readonly investmentService = inject(FragmentInvestmentService);

  // ── State from service ─────────────────────────────────
  readonly portfolio = this.investmentService.portfolio;
  readonly distributions = this.investmentService.distributions;
  readonly portfolioLoading = this.investmentService.portfolioLoading;
  readonly distributionsLoading = this.investmentService.distributionsLoading;
  readonly totalInvestedCents = this.investmentService.totalInvestedCents;
  readonly totalDistributedCents = this.investmentService.totalDistributedCents;
  readonly totalFragments = this.investmentService.totalFragments;

  // ── Local UI state ─────────────────────────────────────
  readonly activeSection = signal<'holdings' | 'distributions'>('holdings');
  readonly expandedDistId = signal<string | null>(null);

  // ── Computed ───────────────────────────────────────────
  readonly totalInvestedUsd = computed(() => this.totalInvestedCents() / 100);
  readonly totalDistributedUsd = computed(() => this.totalDistributedCents() / 100);

  readonly roiDisplay = computed(() => {
    return this.computeRoiDisplay(this.portfolio());
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.investmentService.fetchMyPortfolio(),
      this.investmentService.fetchMyDistributions(),
    ]);
  }

  setSection(section: 'holdings' | 'distributions'): void {
    this.activeSection.set(section);
  }

  toggleDistDetail(id: string): void {
    this.expandedDistId.set(this.expandedDistId() === id ? null : id);
  }

  formatUsd(cents: number): string {
    return (cents / 100).toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      fundraising: 'Recaudando',
      funded: 'Fondeado',
      operational: 'Operativo',
      retiring: 'Retirando',
      closed: 'Cerrado',
    };
    return map[status] ?? status;
  }

  getStatusColor(status: string): string {
    const map: Record<string, string> = {
      fundraising: 'bg-cta-default/20 text-cta-default',
      funded: 'bg-warning-bg-hover text-warning-strong',
      operational: 'bg-success-bg-hover text-success-strong',
      retiring: 'bg-error-bg-hover text-error-strong',
      closed: 'bg-surface-secondary text-text-tertiary',
    };
    return map[status] ?? 'bg-surface-secondary text-text-secondary';
  }

  navChangePercent(item: FragmentPortfolioItem): number | null {
    if (item.currentNavCents == null || item.purchasePriceCents <= 0) return null;
    return ((item.currentNavCents - item.purchasePriceCents) / item.purchasePriceCents) * 100;
  }

  /**
   * NAV-based ROI: weighted average of (currentNav - purchasePrice) / purchasePrice.
   * Only counts holdings that have NAV data (same currency: USD cents).
   * Distributions are ARS so they can't be mixed into a USD % — shown separately.
   */
  private computeRoiDisplay(portfolio: FragmentPortfolioItem[]): string {
    let weightedCost = 0;
    let weightedValue = 0;

    for (const item of portfolio) {
      if (item.currentNavCents == null || item.purchasePriceCents <= 0) continue;
      const cost = item.purchasePriceCents * item.quantity;
      const value = item.currentNavCents * item.quantity;
      weightedCost += cost;
      weightedValue += value;
    }

    if (weightedCost === 0) return '—';

    const pct = ((weightedValue - weightedCost) / weightedCost) * 100;
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(1)}%`;
  }
}

import {
  Component,
  ChangeDetectionStrategy,
  inject,
  DestroyRef,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, switchMap, interval, merge, tap, catchError, of, firstValueFrom } from 'rxjs';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { RealtimeChannel } from '@supabase/supabase-js';
import { FgoV1_1Service } from '@core/services/verification/fgo-v1-1.service';
import { RealtimeConnectionService } from '@core/services/infrastructure/realtime-connection.service';
import {
  SubfundBalance,
  getStatusIcon,
  getStatusMessage,
  getStatusColor,
  getSubfundName,
  getMovementTypeName,
  formatRatio,
} from '@core/models/fgo.model';

/**
 * Componente de vista general del FGO (Refactorizado con Signals)
 * Muestra el estado del fondo, saldos por subfondo y movimientos recientes
 */
@Component({
  selector: 'app-fgo-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './fgo-overview.page.html',
  styleUrls: ['./fgo-overview.page.css'],
})
export class FgoOverviewPage {
  // Dependencies
  private readonly fgoService = inject(FgoV1_1Service);
  private readonly realtimeConnection = inject(RealtimeConnectionService);
  private readonly destroyRef = inject(DestroyRef);

  // State Triggers
  private readonly refreshTrigger$ = new BehaviorSubject<void>(undefined);
  private readonly POLLING_INTERVAL_MS = 30000;

  // Realtime Channels (tracked for cleanup)
  private realtimeMovementsChannel: RealtimeChannel | null = null;
  private realtimeMetricsChannel: RealtimeChannel | null = null;

  // Helpers for template
  readonly getStatusIcon = getStatusIcon;
  readonly getStatusMessage = getStatusMessage;
  readonly getStatusColor = getStatusColor;
  readonly getSubfundName = getSubfundName;
  readonly getMovementTypeName = getMovementTypeName;
  readonly formatRatio = formatRatio;

  // Loading States (Signals)
  readonly loadingStatus = signal<boolean>(true);
  readonly loadingMovements = signal<boolean>(true);

  // Data Streams (Signals)
  // Combines manual refresh + polling interval
  private readonly dataLoadTrigger$ = merge(
    this.refreshTrigger$,
    interval(this.POLLING_INTERVAL_MS)
  );

  // 1. FGO Status Signal
  readonly fgoStatus = toSignal(
    this.dataLoadTrigger$.pipe(
      tap(() => this.loadingStatus.set(true)),
      switchMap(() =>
        this.fgoService.getStatusV1_1().pipe(
          catchError((err) => {
            console.error('Error loading FGO status:', err);
            return of(null);
          })
        )
      ),
      tap(() => this.loadingStatus.set(false))
    ),
    { initialValue: null }
  );

  // 2. Recent Movements Signal
  readonly recentMovements = toSignal(
    this.dataLoadTrigger$.pipe(
      tap(() => this.loadingMovements.set(true)),
      switchMap(() =>
        this.fgoService.getMovements(10, 0).pipe(
          catchError((err) => {
            console.error('Error loading movements:', err);
            return of([]);
          })
        )
      ),
      tap(() => this.loadingMovements.set(false))
    ),
    { initialValue: [] }
  );

  // 3. Subfunds Computed Signal (derived from fgoStatus)
  readonly subfunds = computed<SubfundBalance[]>(() => {
    const status = this.fgoStatus();
    if (!status) return [];

    const total = status.totalBalance || 1; // Prevent division by zero

    return [
      {
        type: 'liquidity',
        balanceCents: status.liquidityBalance * 100,
        balanceUsd: status.liquidityBalance,
        percentage: (status.liquidityBalance / total) * 100,
        description: 'Liquidez',
        purpose: 'Fondos disponibles para pagos inmediatos',
      },
      {
        type: 'capitalization',
        balanceCents: status.capitalizationBalance * 100,
        balanceUsd: status.capitalizationBalance,
        percentage: (status.capitalizationBalance / total) * 100,
        description: 'Capitalización',
        purpose: 'Fondos acumulados para crecimiento',
      },
      {
        type: 'profitability',
        balanceCents: status.profitabilityBalance * 100,
        balanceUsd: status.profitabilityBalance,
        percentage: (status.profitabilityBalance / total) * 100,
        description: 'Rentabilidad',
        purpose: 'Fondos para generar intereses',
      },
    ];
  });

  // Derived Loading State for Subfunds
  readonly loadingSubfunds = computed(() => this.loadingStatus());

  constructor() {
    this.setupRealtimeSubscription();
  }

  /**
   * Configures realtime subscriptions with automatic cleanup
   */
  private setupRealtimeSubscription(): void {
    // 1. Movements Channel
    this.realtimeMovementsChannel = this.realtimeConnection.subscribeWithRetry<
      Record<string, unknown>
    >(
      'fgo-movements-changes',
      { event: '*', schema: 'public', table: 'fgo_movements' },
      () => this.refreshData()
    );

    // 2. Metrics Channel
    this.realtimeMetricsChannel = this.realtimeConnection.subscribeWithRetry<
      Record<string, unknown>
    >(
      'fgo-metrics-changes',
      { event: '*', schema: 'public', table: 'fgo_metrics' },
      () => this.refreshData()
    );

    // Register cleanup logic
    this.destroyRef.onDestroy(() => {
      if (this.realtimeMovementsChannel) {
        this.realtimeConnection.unsubscribe(this.realtimeMovementsChannel.topic);
      }
      if (this.realtimeMetricsChannel) {
        this.realtimeConnection.unsubscribe(this.realtimeMetricsChannel.topic);
      }
    });
  }

  /**
   * Triggers a data refresh across all signals
   */
  refreshData(): void {
    this.refreshTrigger$.next();
  }

  /**
   * Manually recalculates metrics via service
   */
  recalculateMetrics(): void {
    this.loadingStatus.set(true);
    this.fgoService
      .recalculateMetrics()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (result?.ok) {
            this.refreshData();
          } else {
            console.error('Failed to recalculate metrics');
            this.loadingStatus.set(false);
          }
        },
        error: (error) => {
          console.error('Error recalculating metrics:', error);
          this.loadingStatus.set(false);
        },
      });
  }

  // ============================================================================
  // UI Formatters
  // ============================================================================

  formatUsd(amount: number | null | undefined): string {
    if (amount === null || amount === undefined) return 'USD 0.00';
    return `USD ${amount.toFixed(2)}`;
  }

  formatDate(date: Date | null | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      healthy: 'status-healthy',
      warning: 'status-warning',
      critical: 'status-critical',
    };
    return classes[status] || 'status-unknown';
  }

  getSubfundColor(type: string): string {
    const colors: Record<string, string> = {
      liquidity: '#3b82f6',
      capitalization: '#10b981',
      profitability: '#f59e0b',
    };
    return colors[type] || '#6b7280';
  }

  // ============================================================================
  // ADMIN ACTIONS (Modals & Forms)
  // ============================================================================

  // State Signals for Modals
  readonly showTransferModal = signal(false);
  readonly showSiniestroModal = signal(false);
  readonly processingTransfer = signal(false);
  readonly processingSiniestro = signal(false);

  // Forms (Kept as mutable objects for simple ngModel binding)
  transferForm = {
    fromSubfund: '',
    toSubfund: '',
    amount: 0,
    reason: '',
  };

  siniestroForm = {
    bookingId: '',
    amount: 0,
    description: '',
  };

  openTransferModal(): void {
    this.transferForm = {
      fromSubfund: '',
      toSubfund: '',
      amount: 0,
      reason: '',
    };
    this.showTransferModal.set(true);
  }

  closeTransferModal(): void {
    this.showTransferModal.set(false);
  }

  isTransferFormValid(): boolean {
    return (
      !!this.transferForm.fromSubfund &&
      !!this.transferForm.toSubfund &&
      this.transferForm.fromSubfund !== this.transferForm.toSubfund &&
      this.transferForm.amount > 0 &&
      !!this.transferForm.reason.trim()
    );
  }

  async submitTransfer(): Promise<void> {
    if (!this.isTransferFormValid()) return;

    this.processingTransfer.set(true);

    try {
      const adminId = await this.fgoService.getCurrentUserId();
      if (!adminId) {
        alert('Error: Usuario no autenticado');
        return;
      }

      // Convert Observable to Promise for async/await flow
      const result = await firstValueFrom(
        this.fgoService.transferBetweenSubfunds({
          fromSubfund: this.transferForm.fromSubfund,
          toSubfund: this.transferForm.toSubfund,
          amountCents: Math.round(this.transferForm.amount * 100),
          reason: this.transferForm.reason,
          adminId,
        })
      );

      if (result?.ok) {
        alert(`✅ Transferencia exitosa!\nReferencia: ${result.ref || 'N/A'}`);
        this.closeTransferModal();
        this.refreshData();
      } else {
        alert(`❌ Error: ${result?.error || 'Transferencia fallida'}`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      alert(`❌ Error: ${msg}`);
    } finally {
      this.processingTransfer.set(false);
    }
  }

  openSiniestroModal(): void {
    this.siniestroForm = {
      bookingId: '',
      amount: 0,
      description: '',
    };
    this.showSiniestroModal.set(true);
  }

  closeSiniestroModal(): void {
    this.showSiniestroModal.set(false);
  }

  isSiniestroFormValid(): boolean {
    return (
      !!this.siniestroForm.bookingId.trim() &&
      this.siniestroForm.amount > 0 &&
      !!this.siniestroForm.description.trim()
    );
  }

  async submitSiniestro(): Promise<void> {
    if (!this.isSiniestroFormValid()) return;

    const confirmed = confirm(
      `⚠️ ¿Confirmas el pago de ${this.formatUsd(this.siniestroForm.amount)} para el siniestro?\n\nEsto debitará el subfondo de Liquidez.`
    );

    if (!confirmed) return;

    this.processingSiniestro.set(true);

    try {
      const result = await firstValueFrom(
        this.fgoService.paySiniestro({
          bookingId: this.siniestroForm.bookingId,
          amountCents: Math.round(this.siniestroForm.amount * 100),
          description: this.siniestroForm.description,
        })
      );

      if (result?.ok) {
        alert(`✅ Siniestro pagado exitosamente!\nReferencia: ${result.ref || 'N/A'}`);
        this.closeSiniestroModal();
        this.refreshData();
      } else {
        alert(`❌ Error: ${result?.error || 'Pago fallido'}`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      alert(`❌ Error: ${msg}`);
    } finally {
      this.processingSiniestro.set(false);
    }
  }
}

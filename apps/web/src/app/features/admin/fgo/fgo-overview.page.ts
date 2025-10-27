import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, interval, firstValueFrom } from 'rxjs';
import { RealtimeChannel } from '@supabase/supabase-js';
import { FgoV1_1Service } from '../../../core/services/fgo-v1-1.service';
import { SupabaseClientService } from '../../../core/services/supabase-client.service';
import {
  FgoStatus,
  SubfundBalance,
  FgoMovementView,
  getStatusIcon,
  getStatusMessage,
  getStatusColor,
  getSubfundName,
  getMovementTypeName,
  formatRatio,
} from '../../../core/models/fgo.model';
import { FgoStatusV1_1 } from '../../../core/models/fgo-v1-1.model';

/**
 * Componente de vista general del FGO
 * Muestra el estado del fondo, saldos por subfondo y movimientos recientes
 */
@Component({
  selector: 'app-fgo-overview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fgo-overview.page.html',
  styleUrls: ['./fgo-overview.page.css'],
})
export class FgoOverviewPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private realtimeChannel: RealtimeChannel | null = null;

  // Estado del FGO
  fgoStatus: FgoStatus | null = null;
  subfunds: SubfundBalance[] = [];
  recentMovements: FgoMovementView[] = [];

  // Estados de carga
  loadingStatus = true;
  loadingSubfunds = true;
  loadingMovements = true;

  // Helpers para templates
  getStatusIcon = getStatusIcon;
  getStatusMessage = getStatusMessage;
  getStatusColor = getStatusColor;
  getSubfundName = getSubfundName;
  getMovementTypeName = getMovementTypeName;
  formatRatio = formatRatio;

  constructor(
    private readonly fgoService: FgoV1_1Service,
    private readonly supabaseService: SupabaseClientService,
  ) {}

  ngOnInit(): void {
    this.loadFgoStatus();
    this.loadSubfunds();
    this.loadRecentMovements();
    this.setupRealtimeSubscription();

    // Fallback: Actualizar cada 30 segundos por si falla realtime
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.refreshData();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Cleanup realtime subscription
    if (this.realtimeChannel) {
      this.supabaseService.getClient().removeChannel(this.realtimeChannel);
    }
  }

  /**
   * Configura suscripción a cambios en tiempo real
   */
  private setupRealtimeSubscription(): void {
    const supabase = this.supabaseService.getClient();

    // Suscribirse a cambios en fgo_movements
    this.realtimeChannel = supabase
      .channel('fgo-movements-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'fgo_movements',
        },
        (payload) => {
          console.log('FGO movement change detected:', payload);
          // Recargar todos los datos cuando hay un cambio
          this.refreshData();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fgo_metrics',
        },
        (payload) => {
          console.log('FGO metrics change detected:', payload);
          // Recargar estado cuando cambian las métricas
          this.loadFgoStatus();
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime subscription active for FGO');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Realtime subscription error');
        }
      });
  }

  /**
   * Carga el estado del FGO (métricas, RC, LR)
   */
  private loadFgoStatus(): void {
    this.loadingStatus = true;
    this.fgoService
      .getStatusV1_1()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status: FgoStatusV1_1 | null) => {
          this.fgoStatus = status;
          this.loadingStatus = false;
        },
        error: (error) => {
          console.error('Error loading FGO status:', error);
          this.loadingStatus = false;
        },
      });
  }

  /**
   * Carga los saldos de cada subfondo
   */
  private loadSubfunds(): void {
    this.loadingSubfunds = true;
    if (this.fgoStatus) {
      this.subfunds = [
        {
          type: 'liquidity',
          balanceCents: this.fgoStatus.liquidityBalance * 100,
          balanceUsd: this.fgoStatus.liquidityBalance,
          percentage: (this.fgoStatus.liquidityBalance / this.fgoStatus.totalBalance) * 100,
          description: 'Liquidez',
          purpose: 'Fondos disponibles para pagos inmediatos',
        },
        {
          type: 'capitalization',
          balanceCents: this.fgoStatus.capitalizationBalance * 100,
          balanceUsd: this.fgoStatus.capitalizationBalance,
          percentage: (this.fgoStatus.capitalizationBalance / this.fgoStatus.totalBalance) * 100,
          description: 'Capitalización',
          purpose: 'Fondos acumulados para crecimiento',
        },
        {
          type: 'profitability',
          balanceCents: this.fgoStatus.profitabilityBalance * 100,
          balanceUsd: this.fgoStatus.profitabilityBalance,
          percentage: (this.fgoStatus.profitabilityBalance / this.fgoStatus.totalBalance) * 100,
          description: 'Rentabilidad',
          purpose: 'Fondos para generar intereses',
        },
      ];
      this.loadingSubfunds = false;
    } else {
      this.loadingSubfunds = false;
    }
  }

  /**
   * Carga los movimientos recientes
   */
  private loadRecentMovements(): void {
    this.loadingMovements = true;
    this.fgoService
      .getMovements(10, 0)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (movements: FgoMovementView[]) => {
          this.recentMovements = movements;
          this.loadingMovements = false;
        },
        error: (error: unknown) => {
          console.error('Error loading movements:', error);
          this.loadingMovements = false;
        },
      });
  }

  /**
   * Refresca todos los datos
   */
  refreshData(): void {
    this.loadFgoStatus();
    this.loadSubfunds();
    this.loadRecentMovements();
  }

  /**
   * Recalcula las métricas manualmente
   */
  recalculateMetrics(): void {
    this.fgoService
      .recalculateMetrics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result: { ok: boolean; error?: string } | null) => {
          if (result?.ok) {
            console.log('Metrics recalculated successfully');
            this.refreshData();
          }
        },
        error: (error: unknown) => {
          console.error('Error recalculating metrics:', error);
        },
      });
  }

  /**
   * Formatea un monto en USD
   */
  formatUsd(amount: number | null | undefined): string {
    if (amount === null || amount === undefined) return 'USD 0.00';
    return `USD ${amount.toFixed(2)}`;
  }

  /**
   * Formatea una fecha
   */
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

  /**
   * Obtiene la clase CSS según el estado
   */
  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      healthy: 'status-healthy',
      warning: 'status-warning',
      critical: 'status-critical',
    };
    return classes[status] || 'status-unknown';
  }

  /**
   * Obtiene el color del subfondo
   */
  getSubfundColor(type: string): string {
    const colors: Record<string, string> = {
      liquidity: '#3b82f6',
      capitalization: '#10b981',
      profitability: '#f59e0b',
    };
    return colors[type] || '#6b7280';
  }

  // ============================================================================
  // ACCIONES DE ADMINISTRADOR
  // ============================================================================

  // Estados de modales
  showTransferModal = false;
  showSiniestroModal = false;
  processingTransfer = false;
  processingSiniestro = false;

  // Formularios
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

  /**
   * Abre modal de transferencia
   */
  openTransferModal(): void {
    this.showTransferModal = true;
    // Reset form
    this.transferForm = {
      fromSubfund: '',
      toSubfund: '',
      amount: 0,
      reason: '',
    };
  }

  /**
   * Cierra modal de transferencia
   */
  closeTransferModal(): void {
    this.showTransferModal = false;
  }

  /**
   * Valida formulario de transferencia
   */
  isTransferFormValid(): boolean {
    return (
      !!this.transferForm.fromSubfund &&
      !!this.transferForm.toSubfund &&
      this.transferForm.fromSubfund !== this.transferForm.toSubfund &&
      this.transferForm.amount > 0 &&
      !!this.transferForm.reason.trim()
    );
  }

  /**
   * Envía transferencia entre subfondos
   */
  async submitTransfer(): Promise<void> {
    if (!this.isTransferFormValid()) return;

    this.processingTransfer = true;

    try {
      const adminId = await this.fgoService.getCurrentUserId();
      if (!adminId) {
        alert('Error: Usuario no autenticado');
        return;
      }

      const result = await firstValueFrom(
        this.fgoService.transferBetweenSubfunds({
          fromSubfund: this.transferForm.fromSubfund,
          toSubfund: this.transferForm.toSubfund,
          amountCents: Math.round(this.transferForm.amount * 100),
          reason: this.transferForm.reason,
          adminId,
        }),
      );

      if (result?.ok) {
        alert(`✅ Transferencia exitosa!\nReferencia: ${result.ref || 'N/A'}`);
        this.closeTransferModal();
        this.refreshData();
      } else {
        alert(`❌ Error: ${result?.error || 'Transferencia fallida'}`);
      }
    } catch (error: unknown) {
      console.error('Error transferring:', error);
      alert(`❌ Error: ${error.message || 'Error desconocido'}`);
    } finally {
      this.processingTransfer = false;
    }
  }

  /**
   * Abre modal de pago de siniestro
   */
  openSiniestroModal(): void {
    this.showSiniestroModal = true;
    // Reset form
    this.siniestroForm = {
      bookingId: '',
      amount: 0,
      description: '',
    };
  }

  /**
   * Cierra modal de pago de siniestro
   */
  closeSiniestroModal(): void {
    this.showSiniestroModal = false;
  }

  /**
   * Valida formulario de siniestro
   */
  isSiniestroFormValid(): boolean {
    return (
      !!this.siniestroForm.bookingId.trim() &&
      this.siniestroForm.amount > 0 &&
      !!this.siniestroForm.description.trim()
    );
  }

  /**
   * Envía pago de siniestro
   */
  async submitSiniestro(): Promise<void> {
    if (!this.isSiniestroFormValid()) return;

    const confirmed = confirm(
      `⚠️ ¿Confirmas el pago de ${this.formatUsd(this.siniestroForm.amount)} para el siniestro?\n\nEsto debitará el subfondo de Liquidez.`,
    );

    if (!confirmed) return;

    this.processingSiniestro = true;

    try {
      const result = await firstValueFrom(
        this.fgoService.paySiniestro({
          bookingId: this.siniestroForm.bookingId,
          amountCents: Math.round(this.siniestroForm.amount * 100),
          description: this.siniestroForm.description,
        }),
      );

      if (result?.ok) {
        alert(`✅ Siniestro pagado exitosamente!\nReferencia: ${result.ref || 'N/A'}`);
        this.closeSiniestroModal();
        this.refreshData();
      } else {
        alert(`❌ Error: ${result?.error || 'Pago fallido'}`);
      }
    } catch (error: unknown) {
      console.error('Error paying siniestro:', error);
      alert(`❌ Error: ${error.message || 'Error desconocido'}`);
    } finally {
      this.processingSiniestro = false;
    }
  }
}

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  AdvisoryLockService,
  LOCK_TYPES,
  LockType,
} from '@core/services/infrastructure/advisory-lock.service';
import {
  CircuitBreakerService,
} from '@core/services/infrastructure/circuit-breaker.service';
import {
  PaymentMetricsService,
} from '@core/services/payments/payment-metrics.service';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';

interface DatabaseLock {
  lock_type: string;
  lock_id: number;
  granted: boolean;
  pid: number;
}

@Component({
  selector: 'app-system-monitoring',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="p-4 max-w-7xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Monitoreo del Sistema</h1>
        <div class="flex gap-2">
          <button
            (click)="refresh()"
            [disabled]="loading()"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {{ loading() ? 'Actualizando...' : 'Actualizar' }}
          </button>
          <a
            routerLink="/admin"
            class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Volver
          </a>
        </div>
      </div>

      <!-- Health Summary -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-sm text-gray-500">Estado General</div>
          <div [class]="isHealthy() ? 'text-green-600' : 'text-red-600'" class="text-2xl font-bold">
            {{ isHealthy() ? '✅ Saludable' : '⚠️ Degradado' }}
          </div>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-sm text-gray-500">Locks Activos (Cliente)</div>
          <div class="text-2xl font-bold text-gray-900">{{ clientLocks().length }}</div>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-sm text-gray-500">Locks Activos (DB)</div>
          <div class="text-2xl font-bold text-gray-900">{{ databaseLocks().length }}</div>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-sm text-gray-500">Circuitos Abiertos</div>
          <div
            [class]="openCircuitsCount() > 0 ? 'text-red-600' : 'text-green-600'"
            class="text-2xl font-bold"
          >
            {{ openCircuitsCount() }}
          </div>
        </div>
      </div>

      <!-- Advisory Locks Section -->
      <div class="bg-white rounded-lg shadow mb-6">
        <div class="px-4 py-3 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900">🔒 Advisory Locks</h2>
        </div>
        <div class="p-4">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <!-- Client Locks -->
            <div>
              <h3 class="text-sm font-medium text-gray-700 mb-2">
                Locks del Cliente (esta sesión)
              </h3>
              @if (clientLocks().length === 0) {
                <div class="text-gray-500 text-sm py-4 text-center bg-gray-50 rounded">
                  Sin locks activos
                </div>
              } @else {
                <div class="space-y-2">
                  @for (lock of clientLocks(); track lock.lockId) {
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div class="font-medium text-gray-900">
                          {{ getLockTypeName(lock.type) }}
                        </div>
                        <div class="text-sm text-gray-500">{{ lock.resourceId }}</div>
                      </div>
                      <div class="text-right">
                        <div class="text-xs text-gray-400">
                          {{ lock.acquiredAt | date: 'HH:mm:ss' }}
                        </div>
                        <div class="text-xs text-gray-500">{{ getTimeAgo(lock.acquiredAt) }}</div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Database Locks -->
            <div>
              <h3 class="text-sm font-medium text-gray-700 mb-2">
                Locks en Base de Datos (global)
              </h3>
              @if (databaseLocks().length === 0) {
                <div class="text-gray-500 text-sm py-4 text-center bg-gray-50 rounded">
                  Sin locks activos en la base de datos
                </div>
              } @else {
                <div class="space-y-2">
                  @for (lock of databaseLocks(); track lock.lock_id) {
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div class="font-medium text-gray-900">{{ lock.lock_type }}</div>
                        <div class="text-sm text-gray-500">Lock ID: {{ lock.lock_id }}</div>
                      </div>
                      <div class="text-right">
                        <span
                          [class]="
                            lock.granted
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          "
                          class="px-2 py-1 text-xs rounded"
                        >
                          {{ lock.granted ? 'Granted' : 'Waiting' }}
                        </span>
                        <div class="text-xs text-gray-400 mt-1">PID: {{ lock.pid }}</div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Circuit Breakers Section -->
      <div class="bg-white rounded-lg shadow mb-6">
        <div class="px-4 py-3 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900">⚡ Circuit Breakers</h2>
        </div>
        <div class="p-4">
          @if (circuitStatuses().length === 0) {
            <div class="text-gray-500 text-sm py-4 text-center">
              No hay circuit breakers registrados
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              @for (circuit of circuitStatuses(); track circuit.name) {
                <div class="p-4 rounded-lg border-2" [class]="getCircuitBorderClass(circuit.state)">
                  <div class="flex items-center justify-between mb-2">
                    <div class="font-medium text-gray-900">{{ circuit.name }}</div>
                    <span
                      [class]="getCircuitBadgeClass(circuit.state)"
                      class="px-2 py-1 text-xs rounded font-medium"
                    >
                      {{ circuit.state }}
                    </span>
                  </div>
                  <div class="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span class="text-gray-500">Fallos:</span>
                      <span class="font-medium text-red-600 ml-1">{{ circuit.failures }}</span>
                    </div>
                    <div>
                      <span class="text-gray-500">Éxitos:</span>
                      <span class="font-medium text-green-600 ml-1">{{ circuit.successes }}</span>
                    </div>
                  </div>
                  @if (circuit.lastFailure) {
                    <div class="text-xs text-gray-400 mt-2">
                      Último fallo: {{ circuit.lastFailure | date: 'HH:mm:ss' }}
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>
      </div>

      <!-- Payment Metrics Section -->
      <div class="bg-white rounded-lg shadow mb-6">
        <div class="px-4 py-3 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900">💳 Métricas de Pago</h2>
        </div>
        <div class="p-4">
          @if (paymentStats(); as stats) {
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
              <div class="text-center p-3 bg-gray-50 rounded-lg">
                <div class="text-2xl font-bold text-gray-900">{{ stats.totalPayments }}</div>
                <div class="text-xs text-gray-500">Total Pagos</div>
              </div>
              <div class="text-center p-3 bg-green-50 rounded-lg">
                <div class="text-2xl font-bold text-green-600">{{ stats.successRate }}%</div>
                <div class="text-xs text-gray-500">Tasa de Éxito</div>
              </div>
              <div class="text-center p-3 bg-blue-50 rounded-lg">
                <div class="text-2xl font-bold text-blue-600">{{ stats.averageDurationMs }}ms</div>
                <div class="text-xs text-gray-500">Latencia Avg</div>
              </div>
              <div class="text-center p-3 bg-purple-50 rounded-lg">
                <div class="text-2xl font-bold text-purple-600">{{ stats.p95DurationMs }}ms</div>
                <div class="text-xs text-gray-500">P95 Latencia</div>
              </div>
              <div class="text-center p-3 bg-red-50 rounded-lg">
                <div class="text-2xl font-bold text-red-600">{{ stats.errorCount }}</div>
                <div class="text-xs text-gray-500">Errores</div>
              </div>
              <div class="text-center p-3 bg-yellow-50 rounded-lg">
                <div class="text-2xl font-bold text-yellow-600">{{ stats.rejectedCount }}</div>
                <div class="text-xs text-gray-500">Rechazados</div>
              </div>
            </div>

            <!-- Error breakdown -->
            @if (Object.keys(stats.errorsByCode).length > 0) {
              <div class="mt-4">
                <h4 class="text-sm font-medium text-gray-700 mb-2">Errores por Código</h4>
                <div class="flex flex-wrap gap-2">
                  @for (code of Object.keys(stats.errorsByCode); track code) {
                    <span class="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                      {{ code }}: {{ stats.errorsByCode[code] }}
                    </span>
                  }
                </div>
              </div>
            }
          } @else {
            <div class="text-gray-500 text-sm py-4 text-center">
              Sin métricas de pago disponibles
            </div>
          }
        </div>
      </div>

      <!-- Recent Alerts Section -->
      <div class="bg-white rounded-lg shadow">
        <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">🚨 Alertas Recientes</h2>
          @if (recentAlerts().length > 0) {
            <button (click)="clearAlerts()" class="text-sm text-red-600 hover:text-red-800">
              Limpiar
            </button>
          }
        </div>
        <div class="p-4">
          @if (recentAlerts().length === 0) {
            <div class="text-gray-500 text-sm py-4 text-center">Sin alertas recientes ✅</div>
          } @else {
            <div class="space-y-2">
              @for (alert of recentAlerts(); track alert.timestamp) {
                <div
                  class="flex items-start gap-3 p-3 rounded-lg"
                  [class]="getAlertBgClass(alert.type)"
                >
                  <span class="text-lg">{{ getAlertIcon(alert.type) }}</span>
                  <div class="flex-1">
                    <div class="font-medium text-gray-900">{{ alert.message }}</div>
                    <div class="text-xs text-gray-500">
                      {{ alert.timestamp | date: 'yyyy-MM-dd HH:mm:ss' }}
                    </div>
                  </div>
                  <span class="px-2 py-1 text-xs rounded bg-gray-200 text-gray-700">
                    {{ alert.type }}
                  </span>
                </div>
              }
            </div>
          }
        </div>
      </div>

      <!-- Auto-refresh indicator -->
      <div class="mt-4 text-center text-sm text-gray-400">
        Auto-actualiza cada 30 segundos • Última actualización:
        {{ lastUpdated() | date: 'HH:mm:ss' }}
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemMonitoringPage implements OnInit, OnDestroy {
  private readonly advisoryLockService = inject(AdvisoryLockService);
  private readonly circuitBreakerService = inject(CircuitBreakerService);
  private readonly paymentMetricsService = inject(PaymentMetricsService);
  private readonly supabaseService = inject(SupabaseClientService);
  private readonly logger = inject(LoggerService);

  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  readonly loading = signal(false);
  readonly lastUpdated = signal(new Date());
  readonly databaseLocks = signal<DatabaseLock[]>([]);

  // From services
  readonly clientLocks = computed(() => this.advisoryLockService.getActiveLocks());
  readonly circuitStatuses = computed(() => this.paymentMetricsService.circuitStatuses());
  readonly paymentStats = computed(() => this.paymentMetricsService.stats());
  readonly recentAlerts = computed(() => this.paymentMetricsService.recentAlerts());
  readonly isHealthy = computed(() => this.paymentMetricsService.isHealthy());

  readonly openCircuitsCount = computed(
    () => this.circuitStatuses().filter((c) => c.state === 'OPEN').length,
  );

  // For template access
  readonly Object = Object;

  async ngOnInit(): Promise<void> {
    await this.refresh();
    // Auto-refresh every 30 seconds
    this.refreshInterval = setInterval(() => this.refresh(), 30000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    try {
      await this.loadDatabaseLocks();
      this.lastUpdated.set(new Date());
    } catch (err) {
      this.logger.error('Failed to refresh system monitoring', err);
    } finally {
      this.loading.set(false);
    }
  }

  clearAlerts(): void {
    this.paymentMetricsService.clearAlerts();
  }

  getLockTypeName(type: LockType): string {
    const names: Record<number, string> = {
      [LOCK_TYPES.PAYMENT_PROCESSING]: 'Procesamiento de Pago',
      [LOCK_TYPES.WALLET_OPERATION]: 'Operación de Wallet',
      [LOCK_TYPES.CAR_AVAILABILITY]: 'Disponibilidad de Auto',
      [LOCK_TYPES.BOOKING_CREATE]: 'Creación de Reserva',
      [LOCK_TYPES.PAYOUT_PROCESSING]: 'Procesamiento de Payout',
    };
    return names[type] || `Tipo ${type}`;
  }

  getTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `hace ${seconds}s`;
    if (seconds < 3600) return `hace ${Math.floor(seconds / 60)}m`;
    return `hace ${Math.floor(seconds / 3600)}h`;
  }

  getCircuitBorderClass(state: string): string {
    switch (state) {
      case 'CLOSED':
        return 'border-green-200 bg-green-50';
      case 'OPEN':
        return 'border-red-200 bg-red-50';
      case 'HALF_OPEN':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-gray-200';
    }
  }

  getCircuitBadgeClass(state: string): string {
    switch (state) {
      case 'CLOSED':
        return 'bg-green-100 text-green-800';
      case 'OPEN':
        return 'bg-red-100 text-red-800';
      case 'HALF_OPEN':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getAlertIcon(type: string): string {
    switch (type) {
      case 'low_success_rate':
        return '📉';
      case 'high_latency':
        return '🐌';
      case 'circuit_open':
        return '🔴';
      case 'error_spike':
        return '📈';
      default:
        return '⚠️';
    }
  }

  getAlertBgClass(type: string): string {
    switch (type) {
      case 'circuit_open':
        return 'bg-red-50';
      case 'error_spike':
        return 'bg-orange-50';
      case 'low_success_rate':
        return 'bg-yellow-50';
      case 'high_latency':
        return 'bg-blue-50';
      default:
        return 'bg-gray-50';
    }
  }

  private async loadDatabaseLocks(): Promise<void> {
    try {
      const supabase = this.supabaseService.getClient();

      // Query the advisory locks view
      const { data, error } = await supabase.from('v_advisory_locks_held').select('*');

      if (error) {
        this.logger.warn('Failed to load database locks', { error: error.message });
        this.databaseLocks.set([]);
        return;
      }

      this.databaseLocks.set(data || []);
    } catch (err) {
      this.logger.error('Exception loading database locks', err);
      this.databaseLocks.set([]);
    }
  }
}

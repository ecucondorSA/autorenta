import { LoggerService } from '@core/services/infrastructure/logger.service';
import {Injectable, signal, OnDestroy, inject, computed} from '@angular/core';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export interface ChannelConfig {
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema: string;
  table: string;
  filter?: string;
}

/**
 * Connection metrics for monitoring realtime health
 */
export interface ConnectionMetrics {
  /** Total connection attempts */
  totalAttempts: number;
  /** Successful connections */
  successCount: number;
  /** Failed connections (errors + timeouts) */
  failureCount: number;
  /** Average connection latency in ms */
  averageLatencyMs: number;
  /** Last successful connection timestamp */
  lastConnectedAt: number | null;
  /** Last error timestamp */
  lastErrorAt: number | null;
  /** Current session uptime in ms (0 if disconnected) */
  uptimeMs: number;
}

// Type for database records compatible with Supabase Realtime
// Supabase Realtime requires this exact constraint
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DatabaseRecord = { [key: string]: any };

/**
 * Service for resilient Realtime connections with automatic reconnection
 *
 * Features:
 * - Exponential backoff retry (1s → 2s → 4s → 8s → 16s → 30s max)
 * - Maximum 10 retry attempts
 * - Connection status signals for reactive UI
 * - Automatic cleanup on destroy
 *
 * Related: MESSAGING_CRITICAL_ISSUES.md - Problema 2
 */
@Injectable({
  providedIn: 'root',
})
export class RealtimeConnectionService implements OnDestroy {
  private readonly logger = inject(LoggerService);
  private readonly supabase = injectSupabase();

  // Global connection status
  readonly connectionStatus = signal<ConnectionStatus>('disconnected');

  // Connection metrics for monitoring
  private readonly _metrics = signal<ConnectionMetrics>({
    totalAttempts: 0,
    successCount: 0,
    failureCount: 0,
    averageLatencyMs: 0,
    lastConnectedAt: null,
    lastErrorAt: null,
    uptimeMs: 0,
  });
  readonly connectionMetrics = this._metrics.asReadonly();

  // Health score computed from metrics (0-100)
  readonly healthScore = computed(() => {
    const metrics = this._metrics();
    if (metrics.totalAttempts === 0) return 100; // No data yet, assume healthy

    const successRate = metrics.successCount / metrics.totalAttempts;
    const latencyPenalty = Math.min(metrics.averageLatencyMs / 5000, 0.3); // Max 30% penalty for slow connections
    const recentErrorPenalty = metrics.lastErrorAt && (Date.now() - metrics.lastErrorAt < 60000) ? 0.2 : 0;

    const score = Math.round((successRate - latencyPenalty - recentErrorPenalty) * 100);
    return Math.max(0, Math.min(100, score));
  });

  // Active channels registry
  private readonly activeChannels = new Map<string, RealtimeChannel>();

  // Reconnection configuration
  private readonly maxRetries = 10;
  private readonly baseDelay = 1000; // 1 second
  private readonly maxDelay = 30000; // 30 seconds

  // Retry counters per channel
  private readonly retryCounters = new Map<string, number>();

  // Connection timing for latency tracking
  private readonly connectionStartTimes = new Map<string, number>();
  private latencyHistory: number[] = [];

  ngOnDestroy(): void {
    this.unsubscribeAll();
  }

  /**
   * Subscribe to a Supabase Realtime channel with automatic reconnection
   *
   * 🚀 PERF: Now supports channel reuse (deduplication)
   * - If a channel with the same name already exists and is active, returns it
   * - Prevents multiple WebSocket connections for the same data stream
   * - Use forceNew=true to explicitly create a new channel
   *
   * @param channelName Unique channel identifier
   * @param config Postgres changes configuration
   * @param handler Callback for new data
   * @param onStatusChange Optional callback for connection status changes
   * @param forceNew Force creation of a new channel even if one exists
   * @returns RealtimeChannel instance
   */
  subscribeWithRetry<T extends DatabaseRecord>(
    channelName: string,
    config: ChannelConfig,
    handler: (payload: RealtimePostgresChangesPayload<T>) => void,
    onStatusChange?: (status: ConnectionStatus) => void,
    forceNew = false,
  ): RealtimeChannel {
    // 🚀 PERF: Reuse existing channel if active (deduplication)
    // This prevents multiple components from creating duplicate WebSocket connections
    const existingChannel = this.activeChannels.get(channelName);
    if (!forceNew && existingChannel) {
      this.logger.debug(`♻️ [Realtime] Reusing existing channel: ${channelName}`);
      // Notify status change callback with current status
      if (this.connectionStatus() === 'connected') {
        onStatusChange?.('connected');
      }
      return existingChannel;
    }

    // Remove existing channel if forcing new
    if (forceNew) {
      this.unsubscribe(channelName);
    }

    // Initialize retry counter
    this.retryCounters.set(channelName, 0);

    // Track connection attempt start time
    this.connectionStartTimes.set(channelName, Date.now());
    this.trackConnectionAttempt();

    // Create channel
    const channel = this.createChannel(channelName, config, handler, onStatusChange);

    // Store in registry
    this.activeChannels.set(channelName, channel);

    return channel;
  }

  /**
   * Create a Realtime channel with status monitoring
   */
  private createChannel<T extends DatabaseRecord>(
    channelName: string,
    config: ChannelConfig,
    handler: (payload: RealtimePostgresChangesPayload<T>) => void,
    onStatusChange?: (status: ConnectionStatus) => void,
  ): RealtimeChannel {
    const channel = this.supabase
      .channel(channelName)
      .on<T>(
        'postgres_changes' as never,
        {
          event: config.event,
          schema: config.schema,
          table: config.table,
          filter: config.filter,
        },
        (payload: RealtimePostgresChangesPayload<T>) => {
          handler(payload);
        },
      )
      .subscribe((status) => {
        this.handleChannelStatus(channelName, status, config, handler, onStatusChange);
      });

    return channel;
  }

  /**
   * Handle channel subscription status changes
   */
  private handleChannelStatus<T extends DatabaseRecord>(
    channelName: string,
    status: string,
    config: ChannelConfig,
    handler: (payload: RealtimePostgresChangesPayload<T>) => void,
    onStatusChange?: (status: ConnectionStatus) => void,
  ): void {
    switch (status) {
      case 'SUBSCRIBED':
        this.onConnected(channelName, onStatusChange);
        break;

      case 'CHANNEL_ERROR':
        this.onError(channelName, config, handler, onStatusChange);
        break;

      case 'TIMED_OUT':
        this.onTimeout(channelName, config, handler, onStatusChange);
        break;

      case 'CLOSED':
        this.onClosed(channelName, onStatusChange);
        break;

      default:
    }
  }

  /**
   * Handle successful connection
   */
  private onConnected(
    channelName: string,
    onStatusChange?: (status: ConnectionStatus) => void,
  ): void {
    this.connectionStatus.set('connected');
    onStatusChange?.('connected');

    // Reset retry counter on success
    this.retryCounters.set(channelName, 0);

    // Track success and latency
    const startTime = this.connectionStartTimes.get(channelName);
    if (startTime) {
      const latency = Date.now() - startTime;
      this.trackConnectionSuccess(latency);
      this.connectionStartTimes.delete(channelName);
    } else {
      this.trackConnectionSuccess(0);
    }
  }

  /**
   * Handle connection error
   */
  private onError<T extends DatabaseRecord>(
    channelName: string,
    config: ChannelConfig,
    handler: (payload: RealtimePostgresChangesPayload<T>) => void,
    onStatusChange?: (status: ConnectionStatus) => void,
  ): void {
    this.connectionStatus.set('error');
    onStatusChange?.('error');

    // Track failure
    this.trackConnectionFailure();
    this.connectionStartTimes.delete(channelName);

    this.attemptReconnect(channelName, config, handler, onStatusChange);
  }

  /**
   * Handle connection timeout
   */
  private onTimeout<T extends DatabaseRecord>(
    channelName: string,
    config: ChannelConfig,
    handler: (payload: RealtimePostgresChangesPayload<T>) => void,
    onStatusChange?: (status: ConnectionStatus) => void,
  ): void {
    this.connectionStatus.set('disconnected');
    onStatusChange?.('disconnected');

    // Track failure (timeout counts as failure)
    this.trackConnectionFailure();
    this.connectionStartTimes.delete(channelName);

    this.attemptReconnect(channelName, config, handler, onStatusChange);
  }

  /**
   * Handle intentional connection close
   */
  private onClosed(channelName: string, onStatusChange?: (status: ConnectionStatus) => void): void {
    this.connectionStatus.set('disconnected');
    onStatusChange?.('disconnected');

    // Don't reconnect on intentional close (e.g., user logout)
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect<T extends DatabaseRecord>(
    channelName: string,
    config: ChannelConfig,
    handler: (payload: RealtimePostgresChangesPayload<T>) => void,
    onStatusChange?: (status: ConnectionStatus) => void,
  ): void {
    const retryCount = this.retryCounters.get(channelName) ?? 0;

    if (retryCount >= this.maxRetries) {
      this.logger.debug(`❌ [Realtime] Max retries (${this.maxRetries}) reached for ${channelName}`);
      this.connectionStatus.set('error');
      onStatusChange?.('error');
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(this.baseDelay * Math.pow(2, retryCount), this.maxDelay);

    this.logger.debug(
      `🔄 [Realtime] Reconnecting ${channelName} in ${delay}ms (attempt ${retryCount + 1}/${this.maxRetries})`,
    );

    this.connectionStatus.set('connecting');
    onStatusChange?.('connecting');

    // Increment retry counter
    this.retryCounters.set(channelName, retryCount + 1);

    // Schedule reconnection
    setTimeout(() => {
      // Remove old channel
      this.unsubscribe(channelName);

      // Track new connection attempt
      this.connectionStartTimes.set(channelName, Date.now());
      this.trackConnectionAttempt();

      // Create new channel
      const newChannel = this.createChannel(channelName, config, handler, onStatusChange);

      // Store in registry
      this.activeChannels.set(channelName, newChannel);
    }, delay);
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channelName: string): void {
    const channel = this.activeChannels.get(channelName);

    if (channel) {
      this.supabase.removeChannel(channel);
      this.activeChannels.delete(channelName);
      this.retryCounters.delete(channelName);
    }
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll(): void {
    this.activeChannels.forEach((_, channelName) => {
      this.unsubscribe(channelName);
    });
  }

  /**
   * Get active channels count
   */
  getActiveChannelsCount(): number {
    return this.activeChannels.size;
  }

  /**
   * Check if a channel is active
   */
  isChannelActive(channelName: string): boolean {
    return this.activeChannels.has(channelName);
  }

  // ==================== METRICS TRACKING ====================

  /**
   * Track a new connection attempt
   */
  private trackConnectionAttempt(): void {
    this._metrics.update(m => ({
      ...m,
      totalAttempts: m.totalAttempts + 1,
    }));
  }

  /**
   * Track successful connection with latency
   */
  private trackConnectionSuccess(latencyMs: number): void {
    this.latencyHistory.push(latencyMs);

    // Keep only last 20 latency samples
    if (this.latencyHistory.length > 20) {
      this.latencyHistory.shift();
    }

    const avgLatency = this.latencyHistory.reduce((a, b) => a + b, 0) / this.latencyHistory.length;

    this._metrics.update(m => ({
      ...m,
      successCount: m.successCount + 1,
      averageLatencyMs: Math.round(avgLatency),
      lastConnectedAt: Date.now(),
      uptimeMs: 0, // Will be calculated separately if needed
    }));

    this.logger.debug(`[Realtime] Connection success. Latency: ${latencyMs}ms, Avg: ${Math.round(avgLatency)}ms`);
  }

  /**
   * Track failed connection
   */
  private trackConnectionFailure(): void {
    this._metrics.update(m => ({
      ...m,
      failureCount: m.failureCount + 1,
      lastErrorAt: Date.now(),
      uptimeMs: 0,
    }));

    this.logger.debug(`[Realtime] Connection failure tracked`);
  }

  /**
   * Reset all metrics (useful for testing or fresh start)
   */
  resetMetrics(): void {
    this._metrics.set({
      totalAttempts: 0,
      successCount: 0,
      failureCount: 0,
      averageLatencyMs: 0,
      lastConnectedAt: null,
      lastErrorAt: null,
      uptimeMs: 0,
    });
    this.latencyHistory = [];
    this.logger.debug('[Realtime] Metrics reset');
  }

  /**
   * Get a human-readable summary of connection metrics
   */
  getMetricsSummary(): string {
    const m = this._metrics();
    const successRate = m.totalAttempts > 0
      ? ((m.successCount / m.totalAttempts) * 100).toFixed(1)
      : '100';

    return `Connections: ${m.successCount}/${m.totalAttempts} (${successRate}%), ` +
           `Avg Latency: ${m.averageLatencyMs}ms, ` +
           `Health: ${this.healthScore()}%`;
  }
}

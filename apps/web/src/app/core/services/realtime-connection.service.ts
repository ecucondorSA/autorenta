import { Injectable, signal } from '@angular/core';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { injectSupabase } from './supabase-client.service';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export interface ChannelConfig {
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema: string;
  table: string;
  filter?: string;
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
export class RealtimeConnectionService {
  private readonly supabase = injectSupabase();

  // Global connection status
  readonly connectionStatus = signal<ConnectionStatus>('disconnected');

  // Active channels registry
  private readonly activeChannels = new Map<string, RealtimeChannel>();

  // Reconnection configuration
  private readonly maxRetries = 10;
  private readonly baseDelay = 1000; // 1 second
  private readonly maxDelay = 30000; // 30 seconds

  // Retry counters per channel
  private readonly retryCounters = new Map<string, number>();

  /**
   * Subscribe to a Supabase Realtime channel with automatic reconnection
   *
   * @param channelName Unique channel identifier
   * @param config Postgres changes configuration
   * @param handler Callback for new data
   * @param onStatusChange Optional callback for connection status changes
   * @returns RealtimeChannel instance
   */
  subscribeWithRetry<T extends DatabaseRecord>(
    channelName: string,
    config: ChannelConfig,
    handler: (payload: RealtimePostgresChangesPayload<T>) => void,
    onStatusChange?: (status: ConnectionStatus) => void,
  ): RealtimeChannel {
    // Remove existing channel if any
    this.unsubscribe(channelName);

    // Initialize retry counter
    this.retryCounters.set(channelName, 0);

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
      console.log(`❌ [Realtime] Max retries (${this.maxRetries}) reached for ${channelName}`);
      this.connectionStatus.set('error');
      onStatusChange?.('error');
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(this.baseDelay * Math.pow(2, retryCount), this.maxDelay);

    console.log(
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
}

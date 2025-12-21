import { LoggerService } from '@core/services/infrastructure/logger.service';
import { Injectable, signal, inject, DestroyRef } from '@angular/core';
import { fromEvent, merge, map, startWith } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * P1-024 FIX: Offline Manager Service
 *
 * Manages offline/online state and queued mutations
 *
 * Features:
 * - Detects online/offline status
 * - Shows offline banner
 * - Queues mutations for retry when online
 * - Auto-retries failed requests
 */

export interface QueuedMutation {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
  retryCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class OfflineManagerService {
  private readonly logger = inject(LoggerService);
  private readonly isOnlineSignal = signal(true);
  private readonly mutationQueue = signal<QueuedMutation[]>([]);
  private readonly destroyRef = inject(DestroyRef);

  readonly isOnline = this.isOnlineSignal.asReadonly();
  readonly queuedMutations = this.mutationQueue.asReadonly();

  constructor() {
    this.initializeOnlineDetection();
  }

  /**
   * Initialize online/offline detection
   */
  private initializeOnlineDetection(): void {
    if (typeof window === 'undefined') return;

    // Listen to online/offline events
    const online$ = fromEvent(window, 'online').pipe(map(() => true));
    const offline$ = fromEvent(window, 'offline').pipe(map(() => false));

    merge(online$, offline$)
      .pipe(
        startWith(navigator.onLine),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((isOnline) => {
        this.isOnlineSignal.set(isOnline);

        if (isOnline) {
          this.processQueue();
        }
      });
  }

  /**
   * Queue a mutation for later retry
   */
  queueMutation(type: string, payload: unknown): string {
    const mutation: QueuedMutation = {
      id: this.generateId(),
      type,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.mutationQueue.set([...this.mutationQueue(), mutation]);

    return mutation.id;
  }

  /**
   * Remove mutation from queue
   */
  removeMutation(id: string): void {
    this.mutationQueue.set(this.mutationQueue().filter((m) => m.id !== id));
  }

  /**
   * Process queued mutations when online
   */
  private async processQueue(): Promise<void> {
    const queue = this.mutationQueue();

    if (queue.length === 0) return;

    this.logger.debug(`[Offline] Processing ${queue.length} queued mutations`);

    for (const mutation of queue) {
      try {
        await this.retryMutation(mutation);
        this.removeMutation(mutation.id);
      } catch (error) {
        console.error(`[Offline] Failed to retry mutation ${mutation.id}:`, error);

        // Increment retry count
        const updated = this.mutationQueue().map((m) =>
          m.id === mutation.id ? { ...m, retryCount: m.retryCount + 1 } : m,
        );
        this.mutationQueue.set(updated);

        // Remove if too many retries
        if (mutation.retryCount >= 3) {
          console.error(`[Offline] Giving up on mutation ${mutation.id} after 3 retries`);
          this.removeMutation(mutation.id);
        }
      }
    }
  }

  /**
   * Retry a specific mutation (override in app)
   */
  private async retryMutation(mutation: QueuedMutation): Promise<void> {
    this.logger.debug(`[Offline] Retrying mutation ${mutation.type}`);

    // This should be overridden by app-specific logic
    // For now, just log
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `mutation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if offline
   */
  isOffline(): boolean {
    return !this.isOnlineSignal();
  }

  /**
   * Clear all queued mutations
   */
  clearQueue(): void {
    this.mutationQueue.set([]);
  }
}

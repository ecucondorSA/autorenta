export interface CoalescingRequestBatcherOptions {
  /**
   * Cache TTL per (context + key) in ms.
   * 0 (default) disables caching.
   */
  cacheTtlMs?: number;
  /**
   * Scheduler used to flush queued keys. Defaults to `queueMicrotask`.
   */
  scheduleFlush?: (fn: () => void) => void;
  /**
   * Clock override for tests.
   */
  nowMs?: () => number;
}

export interface CoalescingRequestBatchContext<C> {
  id: string;
  ctx: C;
}

type Resolver<V> = (value: V | null) => void;

interface PendingContextBatch<C, K extends string, V> {
  ctx: C;
  keys: Set<K>;
  resolveByKey: Map<K, Resolver<V>>;
}

/**
 * CoalescingRequestBatcher
 *
 * Coalesces multiple `request(context, key)` calls into a single batch `loader(ctx, keys)`.
 * - Dedupe in-flight requests (same context+key returns the same Promise).
 * - Optional TTL cache per context+key.
 * - Errors are treated as soft failures and resolve to null (callers can fall back).
 *
 * This is intentionally framework-agnostic (no Angular dependency) so it can be unit-tested in Node.
 */
export class CoalescingRequestBatcher<C, K extends string, V> {
  private readonly cacheTtlMs: number;
  private readonly nowMs: () => number;
  private readonly scheduleFlush: (fn: () => void) => void;

  private flushScheduled = false;

  private pendingByContextId = new Map<string, PendingContextBatch<C, K, V>>();
  private readonly inflightByRequestId = new Map<string, Promise<V | null>>();
  private readonly cacheByRequestId = new Map<string, { expiresAt: number; value: V }>();

  constructor(
    private readonly loader: (ctx: C, keys: K[]) => Promise<Map<K, V>>,
    options?: CoalescingRequestBatcherOptions,
  ) {
    this.cacheTtlMs = options?.cacheTtlMs ?? 0;
    this.nowMs = options?.nowMs ?? (() => Date.now());
    this.scheduleFlush = options?.scheduleFlush ?? ((fn) => queueMicrotask(fn));
  }

  clearCache(): void {
    this.cacheByRequestId.clear();
  }

  request(context: CoalescingRequestBatchContext<C>, key: K): Promise<V | null> {
    const requestId = this.toRequestId(context.id, key);

    const now = this.nowMs();
    const cached = this.cacheByRequestId.get(requestId);
    if (cached && cached.expiresAt > now) {
      return Promise.resolve(cached.value);
    }

    const inflight = this.inflightByRequestId.get(requestId);
    if (inflight) {
      return inflight;
    }

    let resolveFn: Resolver<V> | null = null;
    const promise = new Promise<V | null>((resolve) => {
      resolveFn = resolve;
    });
    this.inflightByRequestId.set(requestId, promise);

    const batch =
      this.pendingByContextId.get(context.id) ?? this.createPendingBatch(context.id, context.ctx);

    batch.keys.add(key);
    batch.resolveByKey.set(key, resolveFn!);
    this.pendingByContextId.set(context.id, batch);

    this.enqueueFlush();
    return promise;
  }

  private createPendingBatch(contextId: string, ctx: C): PendingContextBatch<C, K, V> {
    const existing = this.pendingByContextId.get(contextId);
    if (existing) return existing;
    return {
      ctx,
      keys: new Set<K>(),
      resolveByKey: new Map<K, Resolver<V>>(),
    };
  }

  private enqueueFlush(): void {
    if (this.flushScheduled) return;
    this.flushScheduled = true;

    this.scheduleFlush(() => {
      this.flushScheduled = false;
      void this.flush();
    });
  }

  private async flush(): Promise<void> {
    const pending = this.pendingByContextId;
    this.pendingByContextId = new Map();

    // Flush each context independently to keep loader semantics clean.
    for (const [contextId, batch] of pending.entries()) {
      const keys = Array.from(batch.keys).sort();

      let values = new Map<K, V>();
      try {
        values = await this.loader(batch.ctx, keys);
      } catch {
        // Soft-fail. Callers can fall back.
        values = new Map<K, V>();
      }

      const now = this.nowMs();
      for (const key of keys) {
        const requestId = this.toRequestId(contextId, key);
        const value = values.get(key) ?? null;

        if (value !== null && this.cacheTtlMs > 0) {
          this.cacheByRequestId.set(requestId, { expiresAt: now + this.cacheTtlMs, value });
        }

        batch.resolveByKey.get(key)?.(value);
        this.inflightByRequestId.delete(requestId);
      }
    }
  }

  private toRequestId(contextId: string, key: K): string {
    return `${contextId}|${key}`;
  }
}

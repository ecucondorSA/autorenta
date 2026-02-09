import { describe, expect, it, vi } from 'vitest';
import { CoalescingRequestBatcher } from './coalescing-request-batcher';

describe('CoalescingRequestBatcher', () => {
  it('coalesces multiple keys for the same context into one loader call', async () => {
    const loader = vi.fn(async (_ctx: { tag: string }, keys: string[]) => {
      return new Map(keys.map((k) => [k, `v:${k}`]));
    });

    const batcher = new CoalescingRequestBatcher<{ tag: string }, string, string>(loader);
    const ctx = { id: 'u1|t|24', ctx: { tag: 'x' } };

    const p1 = batcher.request(ctx, 'r1');
    const p2 = batcher.request(ctx, 'r2');
    const [v1, v2] = await Promise.all([p1, p2]);

    expect(v1).toBe('v:r1');
    expect(v2).toBe('v:r2');
    expect(loader).toHaveBeenCalledTimes(1);
    expect(loader).toHaveBeenCalledWith({ tag: 'x' }, ['r1', 'r2']);
  });

  it('dedupes in-flight requests for the same context+key', async () => {
    const loader = vi.fn(async (_ctx: { tag: string }, keys: string[]) => {
      return new Map(keys.map((k) => [k, `v:${k}`]));
    });

    const batcher = new CoalescingRequestBatcher<{ tag: string }, string, string>(loader);
    const ctx = { id: 'u1|t|24', ctx: { tag: 'x' } };

    const p1 = batcher.request(ctx, 'r1');
    const p2 = batcher.request(ctx, 'r1');

    expect(p2).toBe(p1);

    const v = await p1;
    expect(v).toBe('v:r1');
    expect(loader).toHaveBeenCalledTimes(1);
    expect(loader).toHaveBeenCalledWith({ tag: 'x' }, ['r1']);
  });

  it('caches results per context+key when TTL is configured', async () => {
    let now = 0;
    const loader = vi.fn(async (_ctx: { tag: string }, keys: string[]) => {
      return new Map(keys.map((k) => [k, `v:${k}:${now}`]));
    });

    const batcher = new CoalescingRequestBatcher<{ tag: string }, string, string>(loader, {
      cacheTtlMs: 1000,
      nowMs: () => now,
    });
    const ctx = { id: 'u1|t|24', ctx: { tag: 'x' } };

    const first = await batcher.request(ctx, 'r1');
    expect(first).toBe('v:r1:0');
    expect(loader).toHaveBeenCalledTimes(1);

    now = 500;
    const cached = await batcher.request(ctx, 'r1');
    expect(cached).toBe('v:r1:0');
    expect(loader).toHaveBeenCalledTimes(1);

    now = 1500;
    const refreshed = await batcher.request(ctx, 'r1');
    expect(refreshed).toBe('v:r1:1500');
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('resolves null when the loader fails', async () => {
    const loader = vi.fn(async (_ctx: { tag: string }, _keys: string[]) => {
      throw new Error('boom');
    });

    const batcher = new CoalescingRequestBatcher<{ tag: string }, string, string>(loader);
    const ctx = { id: 'u1|t|24', ctx: { tag: 'x' } };

    const result = await batcher.request(ctx, 'r1');
    expect(result).toBeNull();
    expect(loader).toHaveBeenCalledTimes(1);
  });
});

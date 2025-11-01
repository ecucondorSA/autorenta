
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { insertMessage } from './messages.repo';
import { createClient } from '@supabase/supabase-js';

vi.mock('@supabase/supabase-js', () => {
  const insert = vi.fn();
  const from = vi.fn(() => ({ insert, select: vi.fn().mockReturnThis() }));
  return { createClient: vi.fn(() => ({ from })), __mocks: { from, insert } };
});

describe('messages repo', () => {
  const insert = vi.fn();
  const from = vi.fn().mockReturnValue({ insert });
  const mockSupabase: any = { from };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('strips full_name before insert', async () => {
    insert.mockResolvedValue({ error: null });
    const payload: any = {
      conversation_id: crypto.randomUUID(),
      sender_id: crypto.randomUUID(),
      text: 'hola',
      full_name: 'Ana', // no debe ir al insert
    };
    await insertMessage(mockSupabase, payload);
    expect(from).toHaveBeenCalledWith('messages');
    const inserted = insert.mock.calls[0][0];
    expect(inserted.full_name).toBeUndefined();
  });

  it('queues offline on 400 ColumnNotFound', async () => {
    insert.mockResolvedValue({ error: { code: '42703', message: 'column "full_name" does not exist' } });

    const res = await insertMessage(mockSupabase, {
      conversation_id: crypto.randomUUID(),
      sender_id: crypto.randomUUID(),
      text: 'hola',
    });

    expect(res.kind).toBe('queued-offline');
  });
});

import { insertMessage } from './messages.repo';
import { randomUuid, VALID_UUID } from '../../../test-helpers/factories';
import { createMockQueryBuilder } from '../../../test-helpers/mock-types';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('messages repo', () => {
  let mockBuilder: ReturnType<typeof createMockQueryBuilder>;
  let from: jasmine.Spy;
  let mockSupabase: any; // Use 'any' for Supabase mock to avoid type conflicts

  beforeEach(() => {
    // Create a proper query builder that supports insert().select().single()
    mockBuilder = createMockQueryBuilder();
    from = jasmine.createSpy('from').and.returnValue(mockBuilder);
    mockSupabase = { from } as any;
  });

  it('strips full_name before insert', async () => {
    // Configure mock to return success
    mockBuilder.single.and.resolveTo({ data: { id: 'msg-1', body: 'hola' }, error: null });

    const payload: any = {
      recipient_id: VALID_UUID,
      sender_id: randomUuid(),
      body: 'hola',
      full_name: 'Ana', // no debe ir al insert
    };

    await insertMessage(mockSupabase as any, payload);

    expect(from).toHaveBeenCalledWith('messages');
    expect(mockBuilder.insert).toHaveBeenCalled();

    // Verify full_name was stripped
    const insertedArgs = mockBuilder.insert.calls.argsFor(0);
    const inserted: any = insertedArgs[0];
    expect(inserted.full_name).toBeUndefined();
    expect(inserted.body).toBe('hola');
  });

  it('queues offline on 400 ColumnNotFound', async () => {
    // Configure mock to return column not found error
    mockBuilder.single.and.resolveTo({
      data: null,
      error: { code: '42703', message: 'column "full_name" does not exist' },
    });

    const res = await insertMessage(mockSupabase as any, {
      recipient_id: VALID_UUID,
      sender_id: randomUuid(),
      body: 'hola',
    });

    expect(res.kind).toBe('queued-offline');
    expect(res.reason).toBe('42703');
  });
});

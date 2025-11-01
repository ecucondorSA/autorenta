
import { test, expect } from 'vitest';
import fc from 'fast-check';
import { ChatMessageInsertSchema } from './chat-message.schemas';

test('random valid messages pass', () => {
  const arb = fc.record({
    conversation_id: fc.uuid(),
    sender_id: fc.uuid(),
    text: fc.string({ minLength: 1, maxLength: 2000 }).map(s => s.trim() || 'x'),
  });
  fc.assert(fc.property(arb, data => {
    expect(() => ChatMessageInsertSchema.parse(data)).not.toThrow();
  }));
});

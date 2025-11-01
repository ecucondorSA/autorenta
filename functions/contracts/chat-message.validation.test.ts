
import { describe, it, expect } from 'vitest';
import { ChatMessageInsertSchema } from './chat-message.schemas';

describe('ChatMessage contracts', () => {
  it('valid insert', () => {
    const ok = { conversation_id: crypto.randomUUID(), sender_id: crypto.randomUUID(), text: 'hola' };
    expect(() => ChatMessageInsertSchema.parse(ok)).not.toThrow();
  });
  it('rejects empty text', () => {
    const bad = { conversation_id: crypto.randomUUID(), sender_id: crypto.randomUUID(), text: '' };
    expect(() => ChatMessageInsertSchema.parse(bad)).toThrow();
  });
  it('rejects unknown keys (full_name)', () => {
    const bad = { conversation_id: crypto.randomUUID(), sender_id: crypto.randomUUID(), text: 'hi', full_name: 'Ana' };
    expect(() => ChatMessageInsertSchema.parse(bad)).toThrow(); // .strict()
  });
});
